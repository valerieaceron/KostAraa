import {lazy,Suspense} from "react";
import ConfirmationModal from "../components/confirmation/ConfirmationModal";
import Home from "../features/marketing/pages/Home";



const PasswordReset = lazy(() => import("../features/auth/PasswordResetPage"));
const Login = lazy(() => import("../features/auth/LoginPage"));
const Signup = lazy(() => import("../features/auth/SignupPage"));
const About = lazy(() => import("../features/marketing/pages/About"));
const Blog = lazy(() => import("../features/marketing/pages/Blog"));
const BlogPost = lazy(() => import("../features/marketing/pages/BlogPost"));
const Contact = lazy(() => import("../features/marketing/pages/Contact"));
const SignupPayment = lazy(() => import("../features/marketing/pages/SignupPaymentPage"));
const Pricing = lazy(() => import("../features/marketing/pages/Pricing"));
const Privacy = lazy(() => import("../features/marketing/pages/Privacy"));
const SiteDirectory = lazy(() => import("../features/marketing/pages/SiteDirectory"));
const Terms = lazy(() => import("../features/marketing/pages/Terms"));
const TryKostaraa = lazy(() => import("../features/marketing/pages/TryKostaraa"));
const Onboarding = lazy(() => import("../features/onboarding/OnboardingPage"));
const Workspace = lazy(() => import("../features/workspace/WorkspacePage"));
const VerifyEmail = lazy(() => import("../features/auth/VerifyEmailPage"));
const AffiliateApplicationForm = lazy(() => import("../features/workspace/components/AffiliateApplicationForm"));

const routes = {
  "/affiliate-application": AffiliateApplicationForm,
  "/forgot-password": PasswordReset,
  "/reset-password": PasswordReset,
  "/verify-email": VerifyEmail,
  "/": Home,
  "/about": About,
  "/blog": Blog,
  "/contact": Contact,
  "/login": Login,
  "/onboarding": Onboarding,
  "/pricing": Pricing,
  "/payment": SignupPayment,
  "/privacy": Privacy,
  "/signup": Signup,
  "/sitemap": SiteDirectory,
  "/terms": Terms,
  "/try-kostaraa": TryKostaraa,
  "/workspace": Workspace,
};

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const Page = path.startsWith("/blog/") ? BlogPost : routes[path] || Home;

  return <><ConfirmationModal/><Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-slate-500" role="status">Loading page…</div>}><Page /></Suspense></>;
}
