import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, cp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import { fetchPublishedPosts, postSlugFromPath } from '../src/features/marketing/lib/wordpress.ts';

const article = {id: 16, slug: 'new-post', status: 'publish', date_gmt: '2026-11-10T08:21:35',
  title: {rendered: 'New post'}, excerpt: {rendered: 'Description'}, content: {rendered: '<p>Content</p>'}};
const settle = () => new Promise(resolve => setImmediate(resolve));

for (const path of ['/blog/new-post', '/blog/new-post/']) {
  test(`extracts a runtime slug from ${path}`, () => assert.equal(postSlugFromPath(path), 'new-post'));
}
for (const path of ['/blog/%E0%A4%A', '/blog/a/b', '/blog/', '/blog/a%2Fb', '/blog/a%5Cb', '/blog/a%00b']) {
  test(`invalid path is safe: ${path}`, () => assert.equal(postSlugFromPath(path), ''));
}

test('CMS requests are fresh, anonymous, published-only, and preserve pagination', async t => {
  const original = globalThis.fetch;
  t.after(() => {globalThis.fetch = original;});
  globalThis.fetch = async (url, options) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('slug'), 'new-post');
    assert.equal(query.get('status'), 'publish');
    assert.equal(query.get('context'), 'view');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    return new Response(JSON.stringify([article, ...['draft','pending','private','future','trash'].map(status => ({...article, status})),
      {...article, slug:'hello-world'}, {...article, status:undefined}]), {headers:{'X-WP-TotalPages':'3'}});
  };
  const result = await fetchPublishedPosts(new URLSearchParams({slug:'new-post', status:'draft'}), new AbortController().signal);
  assert.deepEqual(result.posts, [article]);
  assert.equal(result.totalPages, 3);
});

test('missing/deleted posts return an empty result; CMS failures and malformed responses reject', async t => {
  const original = globalThis.fetch;
  t.after(() => {globalThis.fetch = original;});
  const request = () => fetchPublishedPosts(new URLSearchParams({slug:'deleted'}), new AbortController().signal);
  globalThis.fetch = async () => new Response('[]');
  assert.deepEqual((await request()).posts, []);
  for (const response of [new Response('{}'), new Response('not json'), new Response('[]', {status:503}),
    new Response(JSON.stringify([{...article, title:null}]))]) {
    globalThis.fetch = async () => response;
    await assert.rejects(request);
  }
  globalThis.fetch = async () => {throw new TypeError('Network unavailable');};
  await assert.rejects(request, /Network unavailable/);
});

async function pageFixture(path, request) {
  const file = '../src/features/marketing/pages/BlogPost.tsx';
  const { code } = await transformWithOxc(await readFile(new URL(file, import.meta.url), 'utf8'), file, {jsx:{runtime:'classic'}});
  const executable = code.replace(/^import .*;\n/gm, '').replace(/^export default /gm, '');
  const states = [], effects = [];
  let index = 0;
  const Page = vm.runInNewContext(`${executable}\nBlogPost`, {
    React:{createElement:(type, props, ...children) => ({type, props, children})},
    ArrowLeft:()=>{}, MarketingHeader:()=>{}, MarketingFooter:()=>{},
    window:{location:{pathname:path}}, URLSearchParams, AbortController, postSlugFromPath,
    fetchPublishedPosts:request, textFromHtml:s=>s, safePostHtml:s=>s, postDate:s=>s, applyBlogMetadata:()=>{},
    useMemo:fn=>fn(), useEffect:fn=>effects.push(fn),
    useState:initial=>{const i=index++; if (!(i in states)) states[i]=initial; return [states[i], value=>{states[i]=value;}];},
  });
  return {effects, states, render:()=>{index=0; return Page();}};
}

test('an unseen slug loads without a build and only an exact matching post is displayed', async () => {
  const f = await pageFixture('/blog/new-post', async params => {
    assert.equal(params.get('slug'), 'new-post');
    return {posts:[{...article, slug:'other'}, article]};
  });
  f.render(); f.effects[0]();
  assert.equal(f.states[1], true);
  await settle();
  assert.equal(f.states[0].slug, 'new-post');
  assert.equal(f.states[1], false);
});

test('invalid slugs never query the CMS or accidentally display its first post', async () => {
  const f = await pageFixture('/blog/%E0%A4%A', () => {throw new Error('must not request');});
  f.render(); f.effects[0](); await settle();
  assert.equal(f.states[0], null);
  assert.equal(f.states[1], false);
  assert.equal(f.states[2], false);
});

test('deleted posts, wrong-slug results, and network errors leave no article content', async () => {
  for (const request of [async()=>({posts:[]}), async()=>({posts:[{...article,slug:'other'}]}), async()=>{throw new Error('offline');}]) {
    const f = await pageFixture('/blog/new-post', request);
    f.render(); f.effects[0](); await settle();
    assert.equal(f.states[0], null);
    assert.equal(f.states[1], false);
  }
});

test('aborted requests cannot overwrite current state during StrictMode replay', async () => {
  let finish;
  const f = await pageFixture('/blog/new-post', () => new Promise(resolve => {finish=resolve;}));
  f.render(); const cleanup = f.effects[0](); cleanup();
  finish({posts:[article]}); await settle();
  assert.equal(f.states[0], null);
  assert.equal(f.states[1], true);
});

test('frontend export copies hidden routing configuration without CMS access or article folders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kostaraa-blog-export-'));
  try {
    await mkdir(join(root,'out')); await mkdir(join(root,'public'));
    await writeFile(join(root,'out/index.html'), '<div id="root"></div>');
    await cp(new URL('../public/.htaccess',import.meta.url), join(root,'public/.htaccess'));
    execFileSync(process.execPath, [new URL('../scripts/hostinger-routes.mjs',import.meta.url).pathname], {cwd:root});
    assert.equal(await readFile(join(root,'out/.htaccess'),'utf8'), await readFile(join(root,'public/.htaccess'),'utf8'));
    assert.deepEqual(await readdir(join(root,'out/blog')), ['index.html']);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('article metadata uses the public canonical, CMS description, and restores the original head', async () => {
  const nodes = [];
  function element(tag) {
    return {tag, attributes:{}, textContent:'', getAttribute(name){return this.attributes[name] ?? null;},
      setAttribute(name,value){this.attributes[name]=value;}, removeAttribute(name){delete this.attributes[name];},
      remove(){nodes.splice(nodes.indexOf(this),1);}};
  }
  const description = element('meta'); description.setAttribute('name','description'); description.setAttribute('content','Site description');
  nodes.push(description);
  const document = {title:'Kostaraa', createElement:element, head:{append:node=>nodes.push(node), querySelector(selector){
    const [,tag,attr,value] = /^(\w+)\[([^=]+)="([^"]+)"\]$/.exec(selector);
    return nodes.find(node=>node.tag===tag && node.attributes[attr]===value) ?? null;
  }}};
  const file='../src/features/marketing/lib/blogMetadata.ts';
  const {code}=await transformWithOxc(await readFile(new URL(file,import.meta.url),'utf8'),file);
  const apply=vm.runInNewContext(`${code.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}\napplyBlogMetadata`,
    {document,textFromHtml:s=>s});
  const cleanup=apply({...article,yoast_head_json:{description:'CMS SEO description'}},false);
  assert.equal(document.title,'New post — Kostaraa Insights');
  assert.equal(description.getAttribute('content'),'CMS SEO description');
  assert.equal(document.head.querySelector('link[rel="canonical"]').getAttribute('href'),'https://kostaraa.com/blog/new-post');
  assert.equal(document.head.querySelector('meta[property="og:url"]').getAttribute('content'),'https://kostaraa.com/blog/new-post');
  const schema=JSON.parse(nodes.find(node=>node.tag==='script').textContent);
  assert.equal(schema.mainEntityOfPage,'https://kostaraa.com/blog/new-post');
  cleanup();
  assert.equal(document.title,'Kostaraa');
  assert.deepEqual(nodes,[description]);
  assert.equal(description.getAttribute('content'),'Site description');
  for (const failed of [false,true]) {
    const restore=apply(null,failed);
    assert.equal(document.head.querySelector('meta[name="robots"]').getAttribute('content'),'noindex, follow');
    assert.equal(nodes.some(node=>node.tag==='script'),false);
    restore(); assert.deepEqual(nodes,[description]);
  }
});
