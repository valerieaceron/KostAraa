import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import { fetchPublishedPosts, postSlugFromPath, postDate, safePostHtml, textFromHtml, type WordPressPost } from "../lib/wordpress";
import { applyBlogMetadata } from "../lib/blogMetadata";
import "../styles/blog.css";

export default function BlogPost() {
  const slug = postSlugFromPath(window.location.pathname);
  const [post, setPost] = useState<WordPressPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ slug, _embed: "1" });

    setPost(null);
    setFailed(false);
    setLoading(true);
    if (!slug) {
      setLoading(false);
      return () => controller.abort();
    }

    fetchPublishedPosts(query, controller.signal)
      .then(({ posts }) => {
        if (controller.signal.aborted) return;
        const publishedPost = posts.find(item => postSlugFromPath(`/blog/${item.slug}`) === slug) ?? null;
        setPost(publishedPost);
        setFailed(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPost(null);
        setFailed(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (loading) return;
    return applyBlogMetadata(post, failed);
  }, [post, loading, failed]);

  const content = useMemo(() => post ? safePostHtml(post.content.rendered) : "", [post]);
  const media = post?._embedded?.["wp:featuredmedia"]?.[0];
  const category = post?._embedded?.["wp:term"]?.[0]?.[0]?.name;

  return <main className="blog-page insights-page">
    <MarketingHeader active="insights"/>
    {loading && <section className="insight-article-status" aria-live="polite"><span className="insight-article-loader"/><p>Loading insight…</p></section>}

    {!loading && post && <article className="insight-article">
      <a className="insight-back" href="/blog"><ArrowLeft aria-hidden="true"/> All insights</a>
      <header className="insight-article-header">
        <div className="insight-article-meta">{category && category !== "Uncategorized" && <span>{category}</span>}<time dateTime={post.date_gmt}>{postDate(post.date_gmt)}</time></div>
        <h1>{textFromHtml(post.title.rendered)}</h1>
        {textFromHtml(post.excerpt.rendered) && <p>{textFromHtml(post.excerpt.rendered)}</p>}
      </header>
      {media?.source_url && <figure className="insight-article-hero"><img src={media.source_url} alt={media.alt_text || ""}/>{media.caption?.rendered && <figcaption>{textFromHtml(media.caption.rendered)}</figcaption>}</figure>}
      <div className="insight-article-body" dangerouslySetInnerHTML={{ __html: content }}/>
      <div className="insight-article-end"><a href="/blog"><ArrowLeft aria-hidden="true"/> Back to Insights</a></div>
    </article>}

    {!loading && !post && <section className="insight-article-status"><h1>{failed ? "This insight is temporarily unavailable." : "Insight not found."}</h1><p>{failed ? "Please try again in a little while." : "The article may have been moved or unpublished."}</p><a href="/blog">Return to Insights</a></section>}
    <MarketingFooter/>
  </main>;
}
