import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPublishedPosts, postDate, textFromHtml, type WordPressPost } from "../lib/wordpress";
import "../styles/latest-news.css";

type LatestNewsProps = {
  className?: string;
};

export function LatestNews({ className = "" }: LatestNewsProps) {
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ per_page: "3", page: "1", _embed: "1" });

    fetchPublishedPosts(query, controller.signal)
      .then(({ posts }) => {
        if (controller.signal.aborted) return;
        setPosts(posts.slice(0, 3));
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return <section className={`latest-news${className ? ` ${className}` : ""}`} aria-labelledby={`latest-news-title${className ? `-${className}` : ""}`}>
    <div className="latest-news-heading">
      <div><h2 id={`latest-news-title${className ? `-${className}` : ""}`}>Latest News</h2><p>Practical updates and guides for costing, pricing, and building a more sustainable product business.</p></div>
      <a href="/blog">View all insights <ArrowRight aria-hidden="true"/></a>
    </div>

    {loading && <div className="latest-news-loading" aria-label="Loading latest news"><span/><span/><span/></div>}

    {!loading && posts.length > 0 && <div className="latest-news-grid">{posts.map(post => {
      const media = post._embedded?.["wp:featuredmedia"]?.[0];
      return <article key={post.id}>
        <a className="latest-news-image" href={`/blog/${post.slug}`} aria-label={`Read ${textFromHtml(post.title.rendered)}`}>
          {media?.source_url ? <img src={media.source_url} alt={media.alt_text || ""} loading="lazy"/> : <span><img src="/brand/kostaraa-white-logo.png" alt=""/></span>}
        </a>
        <div className="latest-news-copy">
          <time dateTime={post.date_gmt}>{postDate(post.date_gmt)}</time>
          <h3><a href={`/blog/${post.slug}`}>{textFromHtml(post.title.rendered)}</a></h3>
          <p>{textFromHtml(post.excerpt.rendered)}</p>
          <a className="latest-news-link" href={`/blog/${post.slug}`}>Read article <ArrowRight aria-hidden="true"/></a>
        </div>
      </article>;
    })}</div>}

    {!loading && posts.length === 0 && <div className="latest-news-empty"><p>{failed ? "Latest news is temporarily unavailable." : "New articles are on the way."}</p><a href="/blog">Visit Insights <ArrowRight aria-hidden="true"/></a></div>}
  </section>;
}
