import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, LogOut, Settings2 } from "lucide-react";
import "../styles/account-menu.css";

export function AccountMenu({ firstName, onSettings, onLogout }: { firstName: string; onSettings: () => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);
  const initialItem = useRef(0);

  useEffect(() => {
    if (!open) return;
    items.current[initialItem.current]?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function menuKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
      trigger.current?.focus();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const current = items.current.findIndex(item => item === document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + 2) % 2;
      items.current[next]?.focus();
    }
  }

  return <div className="kws-account-menu" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button className="kws-welcome" type="button" ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => { initialItem.current = 0; setOpen(value => !value); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          initialItem.current = event.key === "ArrowUp" ? 1 : 0;
          setOpen(true);
        }
      }}>
      <span>Welcome back,</span><strong>{firstName}</strong><ChevronDown aria-hidden="true"/>
    </button>
    {open && <div className="kws-account-dropdown" id={menuId} role="menu" aria-label="Account" onKeyDown={menuKeys}>
      <button type="button" role="menuitem" tabIndex={-1} ref={element => { items.current[0] = element; }} onClick={() => { setOpen(false); onSettings(); }}><Settings2 aria-hidden="true"/>Account settings</button>
      <button type="button" role="menuitem" tabIndex={-1} ref={element => { items.current[1] = element; }} onClick={() => { setOpen(false); onLogout(); }}><LogOut aria-hidden="true"/>Log out</button>
    </div>}
  </div>;
}
