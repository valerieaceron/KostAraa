import { useEffect, useRef, useState } from "react";
import { currentGuideKey, guideSteps, readGuideProgress, writeGuideProgress } from "../getting-started";

export function GettingStartedGuide({ onClose, onComplete, onGo }: { onClose: () => void; onComplete: () => void; onGo: (page: string) => void }) {
  const [key] = useState(currentGuideKey);
  const [index, setIndex] = useState(() => {
    const saved = readGuideProgress(localStorage, key);
    return saved.finished ? 0 : saved.index;
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const callbacks = useRef({ onClose, onComplete, onGo });
  callbacks.current = { onClose, onComplete, onGo };
  const step = guideSteps[index];

  useEffect(() => {
    writeGuideProgress(localStorage, key, { started: true });
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); callbacks.current.onClose(); }
      if (event.key !== "Tab") return;
      const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new CustomEvent("kostaraa:close-araa"));
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const current = guideSteps[index];
    if (current.page === "araa") window.dispatchEvent(new CustomEvent("kostaraa:open-araa"));
    else { window.dispatchEvent(new CustomEvent("kostaraa:close-araa")); callbacks.current.onGo(current.page); }
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  function showStep(nextIndex: number) {
    writeGuideProgress(localStorage, key, { index: nextIndex });
    setIndex(nextIndex);
  }

  function next() {
    if (index < guideSteps.length - 1) return showStep(index + 1);
    writeGuideProgress(localStorage, key, { index, finished: true, skipped: false, started: false, profilePrompt: true });
    callbacks.current.onComplete();
  }

  return <div className={`getting-started-modal ${step.page === "araa" ? "is-araa" : ""}`} role="dialog" aria-modal="true" aria-labelledby="getting-started-title" aria-describedby="getting-started-copy">
    <button className="getting-started-scrim" type="button" onClick={onClose} tabIndex={-1} aria-label="Close guide"/>
    <article ref={panel}>
      <header><strong>Step {index + 1} of {guideSteps.length}</strong><button type="button" onClick={onClose} aria-label="Close guide">×</button></header>
      <section className="guide-step-card"><h2 id="getting-started-title" tabIndex={-1} ref={heading}>{step.title}</h2><p id="getting-started-copy">{step.copy}</p></section>
      <div className="guide-progress" aria-hidden="true">{guideSteps.map((item, position) => <i key={item.page} className={position <= index ? "is-complete" : ""}/>)}</div>
      <footer><button type="button" onClick={() => showStep(index - 1)} disabled={index === 0}>← Back</button><button className="primary" type="button" onClick={next}>{index === guideSteps.length - 1 ? "Finish" : "Next →"}</button></footer>
    </article>
  </div>;
}

export function ProfileSetupPrompt({ onEdit, onDismiss }: { onEdit: () => void; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    heading.current?.focus({ preventScroll: true });
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} className="guide-profile-prompt" aria-labelledby="guide-profile-title" aria-describedby="guide-profile-copy" onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <button className="guide-profile-close" type="button" onClick={onDismiss} aria-label="Close profile setup prompt">×</button>
    <div><h2 id="guide-profile-title" tabIndex={-1} ref={heading}>Build a plan around your business.</h2><p id="guide-profile-copy">Add your business details, target customers, operating costs, and team expenses to see what your business needs to break even.</p></div>
    <div className="guide-profile-actions"><button type="button" className="primary" onClick={onEdit}>Add my business details →</button><button type="button" onClick={onDismiss}>I’ll do this later</button></div>
  </dialog>;
}
