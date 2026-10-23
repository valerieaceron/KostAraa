import {useEffect} from "react";
import {Onboarding} from "./Onboarding";

function GuideRedirect(){
  useEffect(()=>{location.replace(sessionStorage.getItem("kostaraa.session")==="active"?"/workspace?start=guide&page=account":"/login")},[]);
  return <div className="ws-loading">Opening your quick-start guide…</div>;
}

export default function OnboardingPage(){
  return new URLSearchParams(location.search).get("edit")==="1"?<Onboarding/>:<GuideRedirect/>;
}
