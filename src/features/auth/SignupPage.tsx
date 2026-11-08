import { AuthShell } from "./AuthForm";

export default function SignupPage(){
  const planSelected=new URLSearchParams(window.location.search).has("plan");
  return <AuthShell mode="signup" notice={planSelected?"Create your account to continue straight to Business Plus payment. You can pay now or choose to pay later, then verify your email and log in.":undefined}/>;
}
