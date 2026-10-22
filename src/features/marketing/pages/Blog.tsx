import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import { CMS_POSTS_ENDPOINT, isPlaceholderPost, postDate, textFromHtml, type WordPressPost } from "../lib/wordpress";
import "../styles/blog.css";

export const metadata = {
  title: "Insights — Kostaraa",
  description: "Practical costing, pricing, and small-business insights from Kostaraa.",
};

const POSTS_PER_PAGE = 6;

function pageFromUrl() {
  const page = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function Blog() {
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [page, setPage] = useState(pageFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onPopState = () => setPage(pageFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ per_page: String(POSTS_PER_PAGE), page: String(page), _embed: "1" });

    setLoading(true);

    fetch(`${CMS_POSTS_ENDPOINT}?${query}`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`CMS request failed: ${response.status}`);
        const pages = Math.max(1, Number(response.headers.get("X-WP-TotalPages")) || 1);
        setTotalPages(pages);
        return response.json() as Promise<WordPressPost[]>;
      })
      .then(items => {
        setPosts(items.filter(post => !isPlaceholderPost(post)));
        setFailed(false);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page]);

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const url = new URL(window.location.href);
    if (safePage === 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(safePage));
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setPage(safePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <main className="blog-page insights-page">
    <MarketingHeader active="insights"/>
    <section className="insights-content" aria-labelledby="insights-title" aria-live="polite">
      <header className="insights-heading"><h1 id="insights-title">Insights</h1><p>Practical guides for costing, pricing, and growing a product business.</p></header>

      {loading && <div className="insights-loading" aria-label="Loading insights">{[1,2,3,4,5,6].map(item => <span key={item}/>)}</div>}

      {!loading && posts.length > 0 && <div className="insights-grid">{posts.map(post => {
        const media = post._embedded?.["wp:featuredmedia"]?.[0];
        const category = post._embedded?.["wp:term"]?.[0]?.[0]?.name;
        const articlePath = `/blog/${post.slug}`;
        return <article className="insight-card" key={post.id}>
          <a className="insight-card-image" href={articlePath} aria-label={`Read ${textFromHtml(post.title.rendered)}`}>
            {media?.source_url ? <img src={media.source_url} alt={media.alt_text || ""} loading="lazy"/> : <span><img src="/brand/kostaraa-white-logo.png" alt=""/></span>}
          </a>
          <div className="insight-card-copy">
            <div className="insight-card-meta">{category && category !== "Uncategorized" && <span>{category}</span>}<time dateTime={post.date_gmt}>{postDate(post.date_gmt)}</time></div>
            <h2><a href={articlePath}>{textFromHtml(post.title.rendered)}</a></h2>
            <p>{textFromHtml(post.excerpt.rendered)}</p>
            <a className="insight-card-link" href={articlePath}>Read insight <ArrowRight aria-hidden="true"/></a>
          </div>
        </article>;
      })}</div>}

      {!loading && posts.length > 0 && totalPages > 1 && <nav className="insights-pagination" aria-label="Insights pages">
        <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1}><ArrowLeft aria-hidden="true"/> Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>Next <ArrowRight aria-hidden="true"/></button>
      </nav>}

      {!loading && posts.length === 0 && <div className="insights-empty"><h2>{failed ? "Insights are temporarily unavailable." : "New insights are on the way."}</h2><p>{failed ? "Please check again in a little while." : "We’re preparing practical guides to publish here soon."}</p></div>}
    </section>
    <MarketingFooter/>
  </main>;
}
