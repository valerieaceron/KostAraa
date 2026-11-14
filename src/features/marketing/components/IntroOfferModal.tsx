import {useEffect, useRef, useState} from "react";
import {ArrowRight, Check, X} from "lucide-react";
import {INTRODUCTORY_USER_LIMIT, useIntroOffer} from "../lib/introOffer";
import "../styles/intro-offer-modal.css";

type IntroOfferModalProps = {
  pageKey: "pricing" | "try-kostaraa";
  ctaHref: string;
  ctaLabel: string;
};

export function IntroOfferModal({pageKey, ctaHref, ctaLabel}: IntroOfferModalProps) {
  const {users, full: introductoryOfferFull, progress: introductoryProgress} = useIntroOffer();
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
      <div className="intro-offer-content">
        <div className="intro-offer-heading">
          <div className="intro-offer-title-row">
            <h2 id="intro-offer-title">Business Plus</h2>
            <span className="intro-offer-badge">Introductory</span>
          </div>
          <p id="intro-offer-description">Your next step toward clearer pricing and a more organized business.</p>
        </div>
        <div className="intro-offer-price"><strong>₱899</strong><span> / year</span><p>Annual subscription</p></div>
        <ul className="intro-offer-benefits">
          <li><Check aria-hidden="true"/>100 inventory records</li>
          <li><Check aria-hidden="true"/>100 saved products and services</li>
          <li><Check aria-hidden="true"/>Early access to Competitor Analysis (coming soon)</li>
        </ul>
        {users !== null && <div className="intro-offer-capacity">
          <div className="intro-offer-capacity-track" role="progressbar" aria-label="Registered customers" aria-valuemin={0} aria-valuemax={INTRODUCTORY_USER_LIMIT} aria-valuenow={Math.min(users, INTRODUCTORY_USER_LIMIT)}>
            <span className="intro-offer-capacity-fill" style={{width:`${introductoryProgress}%`}}/>
          </div>
          <p>{introductoryOfferFull ? "The introductory offer is full." : `${users} of ${INTRODUCTORY_USER_LIMIT} users joined`}</p>
        </div>}
        <div className="intro-offer-action-row">
          {introductoryOfferFull
            ? <span className="intro-offer-sold-out" aria-disabled="true">Offer full</span>
            : <a href={ctaHref} onClick={close}>{ctaLabel}<ArrowRight aria-hidden="true"/></a>}
          <button className="intro-offer-later" type="button" onClick={close}>Maybe later</button>
        </div>
      </div>
    </section>
  </div>;
}
