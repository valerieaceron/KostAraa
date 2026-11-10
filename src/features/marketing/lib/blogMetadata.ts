import { textFromHtml, type WordPressPost } from "./wordpress";

// Browser metadata only. Crawlers that do not execute JS need request-time rendering.
export function applyBlogMetadata(post: WordPressPost | null, failed: boolean) {
  const restore: Array<() => void> = [];
  const previousTitle = document.title;
  document.title = post ? `${textFromHtml(post.title.rendered)} — Kostaraa Insights`
    : `${failed ? "Insight temporarily unavailable" : "Insight not found"} — Kostaraa Insights`;
  restore.push(() => { document.title = previousTitle; });

  function attribute(selector: string, tag: string, attributes: Record<string, string>) {
    const existing = document.head.querySelector(selector);
    const element = existing ?? document.createElement(tag);
    const previous: Array<[string, string | null]> = Object.keys(attributes).map(name => [name, element.getAttribute(name)]);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (!existing) document.head.append(element);
    restore.push(() => {
      if (!existing) element.remove();
      else for (const [name, value] of previous) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    });
  }

  if (!post) {
    attribute('meta[name="robots"]', "meta", { name: "robots", content: "noindex, follow" });
  } else {
    const title = textFromHtml(post.title.rendered);
    const description = post.yoast_head_json?.description || textFromHtml(post.excerpt.rendered);
    const url = `https://kostaraa.com/blog/${post.slug}`;
    const image = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
    attribute('meta[name="description"]', "meta", { name: "description", content: description });
    attribute('link[rel="canonical"]', "link", { rel: "canonical", href: url });
    for (const [property, content] of Object.entries({
      "og:type": "article", "og:title": title, "og:description": post.yoast_head_json?.og_description || description,
      "og:url": url, "og:site_name": "Kostaraa", ...(image ? { "og:image": image } : {}),
    })) attribute(`meta[property="${property}"]`, "meta", { property, content });
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting", headline: title,
      description, url, mainEntityOfPage: url, datePublished: `${post.date_gmt}Z`,
      ...(post.modified_gmt ? { dateModified: `${post.modified_gmt}Z` } : {}),
      ...(image ? { image } : {}),
    });
    document.head.append(schema);
    restore.push(() => schema.remove());
  }
  return () => { for (const cleanup of restore.reverse()) cleanup(); };
}
