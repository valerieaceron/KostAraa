"use client";

import { useEffect, useState } from "react";
import "./araa-chat.css";
import "./araa-paper.css";
import "./araa-librarian.css";

type GuideMessage = { role: "araa" | "user"; text: string };

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

function WorkspaceGuide() {
  const [messages, setMessages] = useState<GuideMessage[]>([
    { role: "araa", text: "Hi, I’m Araa, your Kostaraa librarian. Ask me about Inventory, Calculator, or any workspace tool—I’m happy to help." },
  ]);
  const [input, setInput] = useState("");
  const ask = (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    setMessages(current => [...current, { role: "user", text: clean }, { role: "araa", text: findAppAnswer(clean) }]);
    setInput("");
  };
  return <section className="araa-app-guide">
    <div className="araa-messages" aria-live="polite">{messages.map((message, index) => <div className={`araa-message ${message.role}`} key={index}><p>{message.text}</p></div>)}</div>
    <div className="araa-suggestions">{["How do I use Inventory?", "How do I cost a product?", "Where can I update my business?"].map(question => <button type="button" key={question} onClick={() => ask(question)}>{question}</button>)}</div>
    <form onSubmit={event => { event.preventDefault(); ask(input); }}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask Araa about a module…" aria-label="Ask Araa how to use Kostaraa"/><button type="submit" aria-label="Send question">→</button></form>
  </section>;
}

export function AraaChat({ workspace = false }: { workspace?: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    if (!open && workspace) window.dispatchEvent(new CustomEvent("kostaraa:feature-opened", { detail: "araa" }));
    setOpen(value => !value);
  };
  useEffect(() => {
    const openAraa = () => setOpen(true);
    const closeAraa = () => setOpen(false);
    window.addEventListener("kostaraa:open-araa", openAraa);
    window.addEventListener("kostaraa:close-araa", closeAraa);
    return () => {
      window.removeEventListener("kostaraa:open-araa", openAraa);
      window.removeEventListener("kostaraa:close-araa", closeAraa);
    };
  }, []);
  return <div className={`araa ${open ? "open" : ""}`}>
    <section className="araa-panel araa-coming-panel" aria-label={workspace ? "Ask Araa how to use Kostaraa" : "Araa coming soon"} aria-hidden={!open}>
      <header><img src="/araa-avatar.png" alt="Araa, the Kostaraa librarian"/><div><b>Araa</b></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Araa">×</button></header>
      {workspace ? <div className="araa-summary araa-librarian-summary"><WorkspaceGuide/></div> : <div className="araa-summary araa-public-coming" aria-live="polite"><div className="araa-summary-intro"><img src="/araa-avatar.png" alt=""/><div><small>COMING SOON</small><h2>Araa is getting her library ready.</h2></div></div><p>Soon, she’ll help you find answers, understand Kostaraa, and guide you through common business questions.</p></div>}
    </section>
    <button type="button" className="araa-launcher" onClick={toggle} aria-label={open ? "Close Araa" : "Ask Araa"}><img src="/araa-avatar.png" alt=""/><span>Ask Araa</span><i/></button>
  </div>;
}
