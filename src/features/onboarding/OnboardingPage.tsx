import {useEffect} from "react";


function GuideRedirect(){
  useEffect(()=>{location.replace(sessionStorage.getItem("kostaraa.session")==="active"?"/workspace?page=account":"/login")},[]);
  return <div className="ws-loading">Opening Business Settings…</div>;
}

export default function OnboardingPage(){
  return <GuideRedirect/>;
}
