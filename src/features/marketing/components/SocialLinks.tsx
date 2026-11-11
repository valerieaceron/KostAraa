import { ArrowUpRight } from "lucide-react";
import "../styles/social-links.css";

const socialProfiles = [
  { name: "Facebook", href: "https://www.facebook.com/kostaraaofficial" },
  { name: "Instagram", href: "https://www.instagram.com/kostaraaofficial" },
  { name: "TikTok", href: "https://www.tiktok.com/@kostaraa" },
] as const;

type SocialLinksProps = {
  className?: string;
  iconsOnly?: boolean;
  label?: string;
};

function SocialIcon({ name }: { name: (typeof socialProfiles)[number]["name"] }) {
  if (name === "Facebook") return <svg className="social-facebook-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a6 6 0 0 0-6 6v2H5v4h3v8h4v-8h4l1-4h-5v-2a2 2 0 0 1 2-2Z"/></svg>;
  if (name === "Instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" className="social-icon-fill"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3v11.5a4.5 4.5 0 1 1-3.4-4.36"/><path d="M15 3c.6 2.25 2.1 3.75 4.5 4.5"/></svg>;
}

export function SocialLinks({ className = "", iconsOnly = false, label = "Kostaraa social media" }: SocialLinksProps) {
  return <nav className={`social-links${className ? ` ${className}` : ""}`} aria-label={label}>
    {socialProfiles.map(profile => <a className={iconsOnly ? "social-icon-link" : undefined} href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={iconsOnly ? `Kostaraa on ${profile.name}` : undefined} key={profile.name}>
      {iconsOnly ? <SocialIcon name={profile.name}/> : <><span>{profile.name}</span><ArrowUpRight aria-hidden="true"/></>}
    </a>)}
  </nav>;
}
