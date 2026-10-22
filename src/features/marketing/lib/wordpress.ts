export const CMS_POSTS_ENDPOINT = "https://cms.kostaraa.com/wp-json/wp/v2/posts";

export type WordPressPost = {
  id: number;
  date_gmt: string;
  modified_gmt: string;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
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
