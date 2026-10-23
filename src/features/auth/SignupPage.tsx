import { AuthShell } from "./AuthForm";

export default function SignupPage(){
  const annualSelected=new URLSearchParams(window.location.search).get("plan")==="annual";
  return <AuthShell mode="signup" notice={annualSelected?"Start with Free. After you submit your GCash receipt, verification takes up to 12 hours. Annual access begins only after payment is verified.":undefined}/>;
}
