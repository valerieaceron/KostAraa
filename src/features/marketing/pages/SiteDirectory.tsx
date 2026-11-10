import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import "../styles/marketing-page-hero.css";
import "../styles/site-directory.css";

type DirectoryCategory = "Product" | "Resources" | "Company" | "Account" | "Legal";

type DirectoryPage = {
  title: string;
  description: string;
  href: string;
  category: DirectoryCategory;
};

const directoryPages: DirectoryPage[] = [
  { title: "Home", description: "Start with an overview of Kostaraa and the decisions it helps you make.", href: "/", category: "Product" },
  { title: "Why Kostaraa", description: "See how clearer costing supports better product planning.", href: "/#why", category: "Product" },
  { title: "How It Works", description: "Follow the workflow from recording costs to reviewing price and profit.", href: "/#how-it-works", category: "Product" },
  { title: "Try Kostaraa", description: "Explore the main tools, workflow, plans, and product experience.", href: "/try-kostaraa", category: "Product" },
  { title: "Pricing", description: "Compare Starter and Business Plus plans and included features.", href: "/pricing", category: "Product" },
  { title: "Workspace", description: "Open the Kostaraa business costing and planning workspace.", href: "/workspace", category: "Product" },
  { title: "Business Setup", description: "Set up the business information used in costing and planning.", href: "/onboarding", category: "Product" },
  { title: "Insights", description: "Read practical guides about costing, pricing, and small-business planning.", href: "/blog", category: "Resources" },
  { title: "About Us", description: "Learn about Kostaraa and the business behind the product.", href: "/about", category: "Company" },
  { title: "Contact Us", description: "Send questions, feedback, or support requests to the Kostaraa team.", href: "/contact", category: "Company" },
  { title: "Affiliate Application", description: "Apply to introduce Kostaraa to more business owners.", href: "/affiliate-application", category: "Company" },
  { title: "Create Account", description: "Create a free Kostaraa account and begin setting up your workspace.", href: "/signup", category: "Account" },
  { title: "Log In", description: "Access an existing Kostaraa account.", href: "/login", category: "Account" },
  { title: "Forgot Password", description: "Request help accessing an account when the password is unavailable.", href: "/forgot-password", category: "Account" },
  { title: "Privacy Policy", description: "Understand how Kostaraa collects, uses, and protects information.", href: "/privacy", category: "Legal" },
  { title: "Terms of Use", description: "Review the terms that apply when using Kostaraa.", href: "/terms", category: "Legal" },
];

const filters = ["All", "Product", "Resources", "Company", "Account", "Legal"] as const;
const pageSize = 10;

export default function SiteDirectory() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return directoryPages.filter(page => {
      const matchesFilter = activeFilter === "All" || page.category === activeFilter;
      const matchesQuery = !normalizedQuery || `${page.title} ${page.description} ${page.category}`.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visiblePages = filteredPages.slice((safePage - 1) * pageSize, safePage * pageSize);

  function chooseFilter(filter: (typeof filters)[number]) {
    setActiveFilter(filter);
    setCurrentPage(1);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setCurrentPage(1);
  }

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    document.querySelector(".directory-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="site-directory-page marketing-gradient-page">
    <MarketingHeader overlay/>
    <section className="directory-hero marketing-page-hero" aria-labelledby="directory-title">
      <div className="marketing-page-hero-inner">
        <h1 id="directory-title">Site Directory</h1>
        <p>Find the Kostaraa page you need without searching through the whole website.</p>
      </div>
    </section>

    <section className="directory-content" aria-labelledby="directory-list-title">
      <div className="directory-heading">
        <h2 id="directory-list-title">Browse Kostaraa</h2>
        <p>Filter by section or search by page name, topic, or purpose.</p>
      </div>

      <div className="directory-controls">
        <div className="directory-filters" aria-label="Filter site directory">
          {filters.map(filter => <button
            className={activeFilter === filter ? "active" : undefined}
            type="button"
            aria-pressed={activeFilter === filter}
            onClick={() => chooseFilter(filter)}
            key={filter}
          >{filter}</button>)}
        </div>

        <label className="directory-search">
          <Search aria-hidden="true"/>
          <span className="sr-only">Search pages</span>
          <input value={query} onChange={event => updateQuery(event.target.value)} type="search" placeholder="Search pages"/>
        </label>
      </div>

      <div className="directory-result-summary" aria-live="polite">
        <span>{filteredPages.length} {filteredPages.length === 1 ? "page" : "pages"}</span>
        {(activeFilter !== "All" || query) && <button type="button" onClick={() => { setActiveFilter("All"); updateQuery(""); }}>Clear filters</button>}
      </div>

      {visiblePages.length > 0 ? <div className="directory-list">
        {visiblePages.map(page => {
          const pageIndex = directoryPages.indexOf(page) + 1;
          return <a href={page.href} className="directory-row" key={page.href}>
            <span className="directory-index">#{String(pageIndex).padStart(2, "0")}</span>
            <span className="directory-row-copy"><strong>{page.title}</strong><small>{page.description}</small></span>
            <span className="directory-category">{page.category}</span>
            <ArrowUpRight aria-hidden="true"/>
          </a>;
        })}
      </div> : <div className="directory-empty"><h3>No pages found</h3><p>Try another keyword or clear the current filters.</p></div>}

      {filteredPages.length > pageSize && <nav className="directory-pagination" aria-label="Site directory pages">
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}><ArrowLeft aria-hidden="true"/> Previous</button>
        <div>{Array.from({ length: totalPages }, (_, index) => index + 1).map(page => <button
          className={page === safePage ? "active" : undefined}
          type="button"
          aria-current={page === safePage ? "page" : undefined}
          aria-label={`Page ${page}`}
          onClick={() => goToPage(page)}
          key={page}
        >{page}</button>)}</div>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next <ArrowRight aria-hidden="true"/></button>
      </nav>}
    </section>
    <MarketingFooter/>
  </main>;
}
