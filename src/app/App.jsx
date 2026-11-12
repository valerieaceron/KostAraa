import ConfirmationModal from "../components/confirmation/ConfirmationModal";
import PasswordReset from "../features/auth/PasswordResetPage";
import Login from "../features/auth/LoginPage";
import Signup from "../features/auth/SignupPage";
import About from "../features/marketing/pages/About";
import Blog from "../features/marketing/pages/Blog";
import BlogPost from "../features/marketing/pages/BlogPost";
import Contact from "../features/marketing/pages/Contact";
import Home from "../features/marketing/pages/Home";
import SignupPayment from "../features/marketing/pages/SignupPaymentPage";
import Pricing from "../features/marketing/pages/Pricing";
import Privacy from "../features/marketing/pages/Privacy";
import SiteDirectory from "../features/marketing/pages/SiteDirectory";
import Terms from "../features/marketing/pages/Terms";
import TryKostaraa from "../features/marketing/pages/TryKostaraa";
import Onboarding from "../features/onboarding/OnboardingPage";
import Workspace from "../features/workspace/WorkspacePage";

import VerifyEmail from "../features/auth/VerifyEmailPage";

import AffiliateApplicationForm from "../features/workspace/components/AffiliateApplicationForm";

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

  return <><ConfirmationModal/><Page /></>;
}
