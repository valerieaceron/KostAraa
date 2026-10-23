import { useEffect, useState } from "react";
import "../styles/marketing-header.css";

type MarketingHeaderProps = {
  active?: "pricing" | "insights" | "about" | "contact";
  overlay?: boolean;
};

const links = [
  { label: "How it works", href: "/#how-it-works", key: "how" },
  { label: "Pricing", href: "/pricing", key: "pricing" },
  { label: "Insights", href: "/blog", key: "insights" },
  { label: "About Us", href: "/about", key: "about" },
  { label: "Contact Us", href: "/contact", key: "contact" },
] as const;

export function MarketingHeader({ active, overlay = false }: MarketingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const updateNavigation = () => setScrolled(window.scrollY > 24);
    updateNavigation();
    window.addEventListener("scroll", updateNavigation, { passive: true });
    return () => window.removeEventListener("scroll", updateNavigation);
  }, [overlay]);

  const headerClass = [
    "nav-wrap",
    "marketing-nav",
    overlay ? "home-nav marketing-nav-overlay" : "marketing-nav-solid",
    scrolled ? "is-scrolled" : "",
  ].filter(Boolean).join(" ");

  return <header className={headerClass}>
    <a href="/" className="brand" aria-label="Kostaraa home">
      <img src={overlay ? "/brand/kostaraa-white-logo.png" : "/brand/kostaraa-blue-logo.png"} alt="Kostaraa"/>
    </a>
    <nav className="desktop-nav" aria-label="Main navigation">
      {links.map(link => <a className={active === link.key ? "active" : undefined} aria-current={active === link.key ? "page" : undefined} href={link.href} key={link.key}>{link.label}</a>)}
    </nav>
    <div className="nav-actions">
      <a className="login" href="/login">Log in</a>
      <a className="button small" href="/signup">Start free</a>
    </div>
    <details className="mobile-menu">
      <summary aria-label="Open menu">☰</summary>
      <div>{links.map(link => <a className={active === link.key ? "active" : undefined} aria-current={active === link.key ? "page" : undefined} href={link.href} key={link.key}>{link.label}</a>)}<a href="/login">Log in</a></div>
    </details>
  </header>;
}
