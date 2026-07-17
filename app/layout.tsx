import type { Metadata } from "next";
import "./globals.css";
import "./nav-polish.css";
import { AraaChat } from "./AraaChat";
import { AccessibilityPanel } from "./AccessibilityPanel";

export const metadata: Metadata = {
  title: "Kostaraa — Know Your True Product Cost",
  description: "Simple product costing and pricing guidance for small businesses in the Philippines.",
  icons: { icon: "/kostaraa-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<AccessibilityPanel /><AraaChat /></body></html>;
}
