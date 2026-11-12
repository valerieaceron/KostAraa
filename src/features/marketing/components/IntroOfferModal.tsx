import {useEffect, useRef, useState} from "react";
import {ArrowRight, Check, X} from "lucide-react";
import {
  INTRODUCTORY_USERS,
  INTRODUCTORY_USER_LIMIT,
  introductoryOfferFull,
  introductoryProgress,
  introductorySpotsRemaining,
} from "../lib/introOffer";
import "../styles/intro-offer-modal.css";

type IntroOfferModalProps = {
  pageKey: "pricing" | "try-kostaraa";
  ctaHref: string;
  ctaLabel: string;
};

export function IntroOfferModal({pageKey, ctaHref, ctaLabel}: IntroOfferModalProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const storageKey = `kostaraa.intro-offer.seen.${pageKey}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(storageKey, "true");
      setOpen(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, storageKey]);

  const close = () => {
    setOpen(false);
  };

  if (!open) return null;

  return <div className="intro-offer-overlay" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) close();
  }}>
    <section className="intro-offer-modal" role="dialog" aria-modal="true" aria-labelledby="intro-offer-title" aria-describedby="intro-offer-description">
      <button ref={closeButtonRef} className="intro-offer-close" type="button" onClick={close} aria-label="Close introductory offer"><X aria-hidden="true"/></button>
      <div className="intro-offer-art">
        <div className="intro-offer-art-copy">
          <strong>Build with more room to grow.</strong>
          <ul>
            <li><Check aria-hidden="true"/>100 inventory records</li>
            <li><Check aria-hidden="true"/>Deeper pricing insights</li>
            <li><Check aria-hidden="true"/>Ad-free workspace</li>
          </ul>
        </div>
        <i className="intro-offer-shape"/><i className="intro-offer-shape"/><i className="intro-offer-shape"/>
      </div>
      <div className="intro-offer-content">
        <div className="intro-offer-heading">
          <h2 id="intro-offer-title">{introductoryOfferFull?"The introductory offer is full.":`${introductorySpotsRemaining} spots left at ₱899/year.`}</h2>
          <p id="intro-offer-description">Join the first {INTRODUCTORY_USER_LIMIT} Kostaraa users and unlock more room to cost, plan, and grow.</p>
        </div>

        <div className="intro-offer-capacity" tabIndex={0} aria-label={`${INTRODUCTORY_USERS} users joined. ${introductorySpotsRemaining} introductory spots left.`}>
          <div className="intro-offer-capacity-summary" aria-hidden="true">
            <span><strong>{introductorySpotsRemaining}</strong> spots left</span>
          </div>
          <div className="intro-offer-capacity-track" role="progressbar" aria-label="Registered Kostaraa users" aria-valuemin={0} aria-valuemax={INTRODUCTORY_USER_LIMIT} aria-valuenow={INTRODUCTORY_USERS}>
            <span className="intro-offer-capacity-fill" style={{width:`${introductoryProgress}%`}}><i><b>{INTRODUCTORY_USERS}</b><small>joined</small></i></span>
          </div>
          <div className="intro-offer-capacity-scale" aria-hidden="true"><span>0</span><span>{INTRODUCTORY_USER_LIMIT} users</span></div>
        </div>

        <div className="intro-offer-action-row">
          {introductoryOfferFull
            ? <span className="intro-offer-sold-out" aria-disabled="true">Offer full</span>
            : <a href={ctaHref} onClick={close}>{ctaLabel}<ArrowRight aria-hidden="true"/></a>}
        </div>
      </div>
    </section>
  </div>;
}
