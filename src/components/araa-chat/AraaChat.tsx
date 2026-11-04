"use client";

import { useEffect, useRef, useState } from "react";
import "./araa-chat.css";
import "./araa-paper.css";
import "./araa-librarian.css";

type GuideAction = { label: string; page: string; section?: string; field?: string; event?: string };
type GuideMessage = { role: "araa" | "user"; text: string; action?: GuideAction };
type GuideContext = { page?: string; inventoryCount?: number; savedProductCount?: number; productionReady?: boolean };
type GuideMilestone = { id: number; type: "business-settings-complete" | "first-inventory" | "unsaved-grid"; name?: string; count?: number };

function araaNoticeKey() {
  try {
    const user = JSON.parse(sessionStorage.getItem("kostaraa.user") || "{}");
    const id = user.id || user.username || user.email || "workspace";
    return `kostaraa.araa.first-edit-guide-seen.v1.${encodeURIComponent(String(id))}`;
  } catch { return "kostaraa.araa.first-edit-guide-seen.v1.workspace"; }
}
function araaNoticeSeen(key: string) { try { return localStorage.getItem(key) === "1"; } catch { return false; } }
function araaActivityKey(key: string) { return `${key}.first-edit`; }
function araaActivityTriggered(key: string) { try { return localStorage.getItem(araaActivityKey(key)) === "1"; } catch { return false; } }
function markAraaActivityTriggered(key: string) { try { localStorage.setItem(araaActivityKey(key), "1"); } catch { /* The notice still appears for this session. */ } }
function businessSettingsGuideKey(key: string) { return `${key}.business-settings-to-inventory.v1`; }
function businessSettingsGuideSeen(key: string) { try { return localStorage.getItem(businessSettingsGuideKey(key)) === "1"; } catch { return false; } }
function markBusinessSettingsGuideSeen(key: string) { try { localStorage.setItem(businessSettingsGuideKey(key), "1"); } catch { /* The guide still appears for this session. */ } }

const appLibrary = [
  { keywords: ["dashboard", "overview", "home", "attention", "insight"], answer: "Dashboard gives you a quick view of pricing health, setup progress, customer details, saved-product cost insights, and your profit and break-even plan. Use its quick actions to add inventory, open Calculator, or review Product Library." },
  { keywords: ["inventory", "ingredient", "material", "stock"], answer: "Open Inventory, then choose Add material. Enter the purchase amount, quantity, and base unit. Calculator materials are selected from this list, so add an item to Inventory before using it in a product." },
  { keywords: ["packaging", "package", "container", "label"], answer: "Add packaging supplies in Inventory with the Packaging category. In Calculator, open Packaging and select from those packaging-only records, then enter how much one product uses." },
  { keywords: ["calculator", "calculate", "costing", "product"], answer: "Open Calculator, name the product, then add Raw Materials and Packaging. Choose each item from Inventory and enter the amount used for one product. Kostaraa combines those costs with labor and operation costs from your Business Settings." },
  { keywords: ["convert", "conversion", "cup", "kg", "liter", "unit"], answer: "Kostaraa converts compatible units such as kg to g, L to ml, yards to smaller length units, and dozens to pieces. For weight-to-cup costing, add the ingredient’s grams-per-cup value in Inventory because ingredients have different densities." },
  { keywords: ["sales", "target", "monthly", "daily"], answer: "Set Monthly Sales Target in Business Settings. Kostaraa divides monthly labor and operation costs by that target to estimate cost per item. Dashboard also uses it to estimate the number of items you need to sell per working day." },
  { keywords: ["labor", "manpower", "owner", "pay"], answer: "Add workers and owner pay in Business Settings. Direct production labor contributes to product costing, while indirect or administrative labor belongs in monthly operation costs." },
  { keywords: ["overhead", "operation", "bills", "rent", "utilities", "expenses"], answer: "Add regular monthly and annual business expenses in Business Settings. Monthly overhead equals regular monthly bills plus each annual cost divided by 12. Calculator divides that total by your Monthly Sales Target." },
  { keywords: ["save", "library", "edit", "duplicate", "archive"], answer: "After completing a calculation, save it as a Product or Service. It will appear in Product Library, where you can review, edit, duplicate, archive, or remove the saved record." },
  { keywords: ["business", "profile", "customer", "market", "channel", "pricing"], answer: "Open Business Settings to manage your business identity, target customers, sales channels, pricing approach, labor, expenses, and operating details. These values flow into Calculator and Dashboard estimates." },
  { keywords: ["account", "username", "email", "verified", "status"], answer: "Open Account Settings, then choose Account to update your username and review access, email verification, and plan status. Your verified email is displayed as read-only." },
  { keywords: ["privacy", "security", "password", "reset"], answer: "Open Account Settings, then Privacy & Security. Choose Send password reset link and follow the secure instructions sent to your verified email address." },
  { keywords: ["billing", "payment", "plan", "annual", "upgrade", "receipt"], answer: "Open Account Settings, then Billing & Payment. You can review your current plan, choose Annual, submit payment details, and check payment history or review status." },
  { keywords: ["getting", "started", "tour", "guide", "onboarding"], answer: "Choose Getting Started near the bottom of the sidebar to replay the guided tour. It introduces Business Settings, Inventory, Calculator, Product Library, Dashboard, and Araa." },
  { keywords: ["support", "issue", "problem", "bug", "report"], answer: "Choose Support near the bottom of the sidebar to report an issue. Include what you were doing and what happened so the Kostaraa team can investigate." },
  { keywords: ["data", "storage", "cloud", "device"], answer: "Both Free and Annual accounts store data securely online. Annual adds higher record limits, backup and recovery, and access across supported devices." },
];

function findAppAnswer(question: string) {
  const words = question.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
  let best: (typeof appLibrary)[number] | null = null;
  let score = 0;
  for (const item of appLibrary) {
    const current = item.keywords.reduce((sum, key) => sum + (words.some(word => word === key || word.includes(key) || key.includes(word)) ? 1 : 0), 0);
    if (current > score) { best = item; score = current; }
  }
  return best?.answer || "I don’t have a verified answer for that yet. I can guide you through Dashboard, Inventory, Calculator, Product Library, Business Settings, Account Settings, billing, security, Getting Started, and Support.";
}

function nextStep(context: GuideContext, firstInventory = false): GuideMessage {
  if (!firstInventory && !context.inventoryCount) return { role: "araa", text: "Start by adding the materials or packaging you buy. I’ll use their purchase cost when you build your first product.", action: { label: "Add first inventory item", page: "inventory" } };
  if (!context.productionReady) return { role: "araa", text: "Before costing a product, add your monthly sales target. This lets Kostaraa calculate the labor and operating cost for each item.", action: { label: "Add monthly sales target", page: "account", section: "operations", field: "monthlySalesUnits" } };
  if (!context.savedProductCount) return { role: "araa", text: "Next, use your saved material in Calculator. I’ll help you include every cost and understand the suggested price.", action: { label: "Cost my first product", page: "calculator" } };
  return { role: "araa", text: "Your setup is taking shape. Review your saved products to see which prices cover their recorded costs.", action: { label: "Review Product Library", page: "products" } };
}

function WorkspaceGuide({context, milestone, onAction}: {context: GuideContext; milestone: GuideMilestone | null; onAction: (action: GuideAction) => void}) {
  const [messages, setMessages] = useState<GuideMessage[]>([
    { role: "araa", text: "Hi, I’m Araa, your pricing guide. I can help you complete your setup, understand your costs, and decide what to do next." },
  ]);
  const [input, setInput] = useState("");
  const handledMilestone = useRef<number | null>(null);
  useEffect(() => {
    if (!milestone || handledMilestone.current === milestone.id) return;
    handledMilestone.current = milestone.id;
    if (milestone.type === "business-settings-complete") {
      setMessages(current => [...current, {
        role: "araa",
        text: "Congratulations—your Business Settings are ready. Next, add the ingredients, materials, or packaging you buy to Inventory so Kostaraa can use their actual purchase costs in your product costing.",
        action: { label: "Add your first inventory item", page: "inventory", event: "kostaraa:inventory-add" },
      }]);
      return;
    }
    if (milestone.type === "unsaved-grid") {
      const count = milestone.count || 1;
      setMessages(current => [...current, {
        role: "araa",
        text: `You have ${count} product${count === 1 ? "" : "s"} in the Grid with changes that are not yet saved to the Product Library. Use Save to Library or Update Library at the end of each row.`,
        action: { label: "Show me where to save", page: "grid", event: "kostaraa:grid-highlight-save" },
      }]);
      return;
    }
    const itemName = milestone.name?.trim();
    setMessages(current => [...current,
      { role: "araa", text: `Nice work—you added your first inventory item${itemName ? `, ${itemName}` : ""}. Kostaraa can now use its purchase cost in your product calculations.` },
      nextStep(context, true),
    ]);
  }, [context, milestone]);
  const ask = (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    setMessages(current => [...current, { role: "user", text: clean }, { role: "araa", text: findAppAnswer(clean) }]);
    setInput("");
  };
  return <section className="araa-app-guide">
    <div className="araa-messages" aria-live="polite">{messages.map((message, index) => <div className={`araa-message ${message.role}`} key={index}><p>{message.text}</p>{message.action && <button className="araa-message-action" type="button" onClick={() => onAction(message.action!)}>{message.action.label}<span aria-hidden="true">→</span></button>}</div>)}</div>
    <div className="araa-suggestions"><button type="button" onClick={() => setMessages(current => [...current, nextStep(context)])}>What should I do next?</button>{["How do I use Inventory?", "How do I cost a product?"].map(question => <button type="button" key={question} onClick={() => ask(question)}>{question}</button>)}</div>
    <form onSubmit={event => { event.preventDefault(); ask(input); }}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask Araa about a module…" aria-label="Ask Araa how to use Kostaraa"/><button type="submit" aria-label="Send question">→</button></form>
  </section>;
}

export function AraaChat({ workspace = false, context = {}, onNavigate }: { workspace?: boolean; context?: GuideContext; onNavigate?: (page: string, section?: string, field?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [milestone, setMilestone] = useState<GuideMilestone | null>(null);
  const [noticeCopy, setNoticeCopy] = useState({ title: "Need help with your first update?", body: "I can guide you as you build your workspace." });
  const [noticeKey] = useState(araaNoticeKey);
  const [unread, setUnread] = useState(() => workspace && araaActivityTriggered(araaNoticeKey()) && !araaNoticeSeen(araaNoticeKey()));
  const markSeen = () => { if (!workspace) return; setUnread(false); try { localStorage.setItem(noticeKey, "1"); } catch { /* The notification still clears for this session. */ } };
  const toggle = () => {
    if (!open && workspace) { markSeen(); window.dispatchEvent(new CustomEvent("kostaraa:feature-opened", { detail: "araa" })); }
    setOpen(value => !value);
  };
  useEffect(() => {
    if (!workspace || araaNoticeSeen(noticeKey) || araaActivityTriggered(noticeKey)) return;
    const firstEdit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (!target.closest(".kws-content")) return;
      markAraaActivityTriggered(noticeKey);
      setUnread(true);
      document.removeEventListener("input", firstEdit, true);
      document.removeEventListener("change", firstEdit, true);
    };
    document.addEventListener("input", firstEdit, true);
    document.addEventListener("change", firstEdit, true);
    return () => {
      document.removeEventListener("input", firstEdit, true);
      document.removeEventListener("change", firstEdit, true);
    };
  }, [noticeKey, workspace]);
  useEffect(() => {
    const openAraa = () => { markSeen(); setOpen(true); };
    const closeAraa = () => setOpen(false);
    const guide = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.type === "business-settings-complete") {
        if (context.inventoryCount || businessSettingsGuideSeen(noticeKey)) return;
        markBusinessSettingsGuideSeen(noticeKey);
        markAraaActivityTriggered(noticeKey);
        setMilestone({ id: Date.now(), type: "business-settings-complete" });
        setNoticeCopy({ title: "Business Settings complete", body: "Your next step is to add your Inventory." });
        setUnread(false);
        setOpen(true);
        return;
      }
      if (detail.type === "unsaved-grid") {
        const count = Math.max(1, Number(detail.count) || 1);
        setMilestone({ id: Date.now(), type: "unsaved-grid", count });
        setNoticeCopy({ title: `${count} unsaved Grid product${count === 1 ? "" : "s"}`, body: "I’ll show you where to save your changes." });
        setUnread(true);
        return;
      }
      if (detail.type === "first-inventory") {
        setMilestone({ id: Date.now(), type: "first-inventory", name: detail.name });
        if (!araaNoticeSeen(noticeKey)) {
          markAraaActivityTriggered(noticeKey);
          setUnread(true);
        }
      }
    };
    window.addEventListener("kostaraa:open-araa", openAraa);
    window.addEventListener("kostaraa:close-araa", closeAraa);
    window.addEventListener("kostaraa:araa-guide", guide);
    return () => {
      window.removeEventListener("kostaraa:open-araa", openAraa);
      window.removeEventListener("kostaraa:close-araa", closeAraa);
      window.removeEventListener("kostaraa:araa-guide", guide);
    };
  }, [context.inventoryCount, noticeKey, workspace]);
  const followAction = (action: GuideAction) => {
    onNavigate?.(action.page, action.section, action.field);
    if (action.event) window.setTimeout(() => window.dispatchEvent(new CustomEvent(action.event!)), 120);
    setOpen(false);
  };
  return <div className={`araa ${open ? "open" : ""}`}>
    <section className="araa-panel araa-coming-panel" aria-label={workspace ? "Ask Araa how to use Kostaraa" : "Araa coming soon"} aria-hidden={!open}>
      <header><img src="/araa-avatar.webp" alt="Araa, the Kostaraa pricing guide"/><div><b>Araa</b></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Araa">×</button></header>
      {workspace ? <div className="araa-summary araa-librarian-summary"><WorkspaceGuide context={context} milestone={milestone} onAction={followAction}/></div> : <div className="araa-summary araa-public-coming" aria-live="polite"><div className="araa-summary-intro"><img src="/araa-avatar.webp" alt=""/><div><small>COMING SOON</small><h2>Araa is getting her library ready.</h2></div></div><p>Soon, she’ll help you find answers, understand Kostaraa, and guide you through common business questions.</p></div>}
    </section>
    {workspace && unread && !open && <button type="button" className="araa-intro-notice" onClick={() => { markSeen(); setOpen(true); }}><strong>{noticeCopy.title}</strong><span>{noticeCopy.body}</span></button>}
    <button type="button" className="araa-launcher" onClick={toggle} aria-label={open ? "Close Araa" : unread ? "Ask Araa, one new guide message" : "Ask Araa"}><img src="/araa-avatar.webp" alt=""/><span>Ask Araa</span><i/>{workspace && unread && !open && <b className="araa-unread" aria-hidden="true">1</b>}</button>
  </div>;
}
