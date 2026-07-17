import { AccessibilityPanel } from "./components/AccessibilityPanel";
import { AraaChat } from "./components/AraaChat";
import Home from "./pages/Home";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Signup from "./pages/Signup";
import Terms from "./pages/Terms";
import Workspace from "./pages/Workspace";
import Onboarding from "./pages/Onboarding";

const routes={"/":Home,"/about":About,"/blog":Blog,"/contact":Contact,"/login":Login,"/onboarding":Onboarding,"/privacy":Privacy,"/signup":Signup,"/terms":Terms,"/workspace":Workspace};
export default function App(){const path=window.location.pathname.replace(/\/$/,"")||"/";const Page=routes[path]||Home;const insideWorkspace=path==="/workspace";return <><Page/><AccessibilityPanel/><AraaChat workspace={insideWorkspace}/></>}
