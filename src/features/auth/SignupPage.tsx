import { AuthShell } from "./AuthForm";

export default function SignupPage(){
  const annualSelected=new URLSearchParams(window.location.search).get("plan")==="annual";
  return <AuthShell mode="signup" notice={annualSelected?"Create your Free account and verify your email first. You can upgrade inside your workspace; manual payment review takes up to 12 hours.":undefined}/>;
}
