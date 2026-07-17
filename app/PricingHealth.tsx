"use client";

import { useState } from "react";

const productCost = 312.5;

export function PricingHealth() {
  const [margin, setMargin] = useState(40);
  const price = Math.round(productCost / (1 - margin / 100));
  const status = margin < 25 ? "At risk" : margin < 35 ? "Fair" : "Healthy";
  const verdict = margin < 25 ? "Price needs work" : margin < 35 ? "Getting there" : "Good price";
  const message = margin < 25
    ? "This target leaves very little room for unexpected costs."
    : margin < 35
      ? "This target covers your costs, with modest room for profit."
      : "This target covers your costs and leaves room for a healthy profit.";

  return <div className={`health-card interactive-health ${status === "At risk" ? "risk" : status === "Fair" ? "fair" : "healthy"}`}>
    <small>PRICING HEALTH</small>
    <div className="health-top"><span>{status}</span><strong>{verdict}</strong></div>
    <label className="slider-wrap">
      <span className="sr-only">Target profit margin</span>
      <input aria-label="Target profit margin" type="range" min="10" max="60" step="1" value={margin} style={{background:`linear-gradient(90deg, #1765e8 0%, #1765e8 ${(margin-10)*2}%, #dce9fb ${(margin-10)*2}%, #dce9fb 100%)`}} onChange={e => setMargin(Number(e.target.value))}/>
    </label>
    <p>{message}</p>
    <div className="health-note"><b>Want a {margin}% margin?</b><span>Try a price of <strong>₱{price.toLocaleString()}</strong></span></div>
    <small className="drag-hint"><b>↔</b> Drag to try another margin</small>
  </div>;
}
