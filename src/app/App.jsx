import Login from "../features/auth/LoginPage";
import Signup from "../features/auth/SignupPage";
import About from "../features/marketing/pages/About";
import Blog from "../features/marketing/pages/Blog";
import BlogPost from "../features/marketing/pages/BlogPost";
import Contact from "../features/marketing/pages/Contact";
import Home from "../features/marketing/pages/Home";
import Pricing from "../features/marketing/pages/Pricing";
import Privacy from "../features/marketing/pages/Privacy";
import Terms from "../features/marketing/pages/Terms";
import Onboarding from "../features/onboarding/OnboardingPage";
import Workspace from "../features/workspace/WorkspacePage";

import VerifyEmail from "../features/auth/VerifyEmailPage";

const routes = {
  "/verify-email": VerifyEmail,
  "/": Home,
  "/about": About,
  "/blog": Blog,
  "/contact": Contact,
  "/login": Login,
  "/onboarding": Onboarding,
  "/pricing": Pricing,
  "/privacy": Privacy,
  "/signup": Signup,
  "/terms": Terms,
  "/workspace": Workspace,
};

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const Page = path.startsWith("/blog/") ? BlogPost : routes[path] || Home;

  return <Page />;
}
