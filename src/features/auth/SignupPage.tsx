import { AuthShell } from "./AuthForm";

export default function SignupPage(){
  const planSelected=new URLSearchParams(window.location.search).has("plan");
  return <AuthShell mode="signup" notice={planSelected?"Create your Free account and verify your email first. You can upgrade inside your workspace; manual payment review takes up to 12 hours.":undefined}/>;
}
