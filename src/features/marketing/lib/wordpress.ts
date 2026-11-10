export const CMS_POSTS_ENDPOINT = "https://cms.kostaraa.com/wp-json/wp/v2/posts";

export type WordPressPost = {
  id: number;
  date_gmt: string;
  modified_gmt: string;
  slug: string;
  status: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  yoast_head_json?: { description?: string; og_description?: string };
  _embedded?: {
    author?: Array<{ name: string }>;
    "wp:featuredmedia"?: Array<{ source_url?: string; alt_text?: string; caption?: { rendered?: string } }>;
    "wp:term"?: Array<Array<{ name: string }>>;
  };
};

export function textFromHtml(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  return document.body.textContent?.trim() ?? "";
}

export function safePostHtml(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script,style,iframe,object,embed,form").forEach(node => node.remove());
  document.body.querySelectorAll("*").forEach(element => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || ((name === "href" || name === "src") && value.startsWith("javascript:"))) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  return document.body.innerHTML;
}

export function postDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}Z`));
}

export function isPlaceholderPost(post: WordPressPost) {
  return post.slug === "hello-world";
}

export function postSlugFromPath(path: string) {
  try {
    const match = /^\/blog\/([^/]+)\/?$/.exec(path);
    const slug = match ? decodeURIComponent(match[1]) : "";
    return /[\s/\\?#\u0000-\u001f]/.test(slug) ? "" : slug;
  } catch {
    return "";
  }
}

export async function fetchPublishedPosts(params: URLSearchParams, signal: AbortSignal) {
  const query = new URLSearchParams(params);
  query.set("status", "publish");
  query.set("context", "view");
  const response = await fetch(`${CMS_POSTS_ENDPOINT}?${query}`, {
    headers: { Accept: "application/json" }, signal, cache: "no-store", credentials: "omit",
  });
  if (!response.ok) throw new Error(`CMS request failed: ${response.status}`);
  const items: unknown = await response.json();
  if (!Array.isArray(items)) throw new Error("Invalid CMS posts response");
  const posts = items.filter((post): post is WordPressPost =>
    post?.status === "publish" && typeof post.slug === "string" && !isPlaceholderPost(post)
  );
  if (posts.some(post => typeof post.title?.rendered !== "string" ||
    typeof post.excerpt?.rendered !== "string" || typeof post.content?.rendered !== "string" ||
    typeof post.date_gmt !== "string" || !Number.isFinite(Date.parse(`${post.date_gmt}Z`)))) {
    throw new Error("Invalid CMS post");
  }
  return { posts, totalPages: Math.max(1, Number(response.headers.get("X-WP-TotalPages")) || 1) };
}
