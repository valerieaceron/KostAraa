import {useMemo,useState} from "react";
import Inventory from "../../costing/pages/Inventory";
import "../styles/adaptive-inventory.css";

const allUnits=["mg","g","kg","oz","lb","ml","l","tsp","tbsp","cup","fl oz","mm","cm","m","inch","ft","yard","pcs","dozen","pack","box"];
const categoryUnits:Record<string,string[]>={
  "Food and Beverage":["mg","g","kg","ml","l","tsp","tbsp","cup","fl oz","pcs","dozen","pack","box"],
  "Fashion and Sewing":["mm","cm","m","inch","ft","yard","pcs","dozen","pack","box"],
  "Handmade and Crafts":["mg","g","kg","ml","l","mm","cm","m","inch","ft","yard","pcs","pack","box"],
  "Beauty and Personal Care":["mg","g","kg","ml","l","tsp","tbsp","pcs","pack","box"],
  "Retail and E-Commerce":["pcs","dozen","pack","box","g","kg","ml","l"],
  "Small-Scale Manufacturing":["mg","g","kg","ml","l","mm","cm","m","inch","ft","yard","pcs","dozen","pack","box"],
  "Customized Products":["mm","cm","m","inch","ft","yard","pcs","pack","box","g","kg","ml","l"],
  "Other Product-Based Business":["g","kg","ml","l","cm","m","inch","ft","pcs","pack","box"],
};
const categoryAliases:Record<string,string>={"Food & Beverage":"Food and Beverage","Handmade & Crafts":"Handmade and Crafts","Retail and Reselling":"Retail and E-Commerce","Small Manufacturing":"Small-Scale Manufacturing","Printing and Customized Products":"Customized Products"};
function readCategory(){
  try{
    const profile=JSON.parse(localStorage.getItem("kostaraa.businessProfile")||"{}");
    const raw=profile?.identity?.category||"Other Product-Based Business";
    return categoryAliases[raw]||raw;
  }catch{return "Other Product-Based Business"}
}

export default function AdaptiveInventory(props:any){
  const[startCategory]=useState(readCategory);
  const[category,setCategory]=useState(categoryUnits[startCategory]?startCategory:"Other Product-Based Business");
  const[showAll,setShowAll]=useState(false);
  const recommended=useMemo(()=>categoryUnits[category]||categoryUnits["Other Product-Based Business"],[category]);
  const unitOptions=showAll?allUnits:recommended;

  const guide=<section className="measurement-guide">
      <div><h2>Choose your measurement units <span className="inventory-help" tabIndex={0} aria-label="About recommended measurements">?<span>Kostaraa recommends units based on your business category. Compatible measurements are converted automatically; cups and packs may need an item-specific rule in the material dialog.</span></span></h2></div>
      <div className="measurement-controls"><label>Business category<select value={category} onChange={event=>setCategory(event.target.value)}>{Object.keys(categoryUnits).map(name=><option key={name}>{name}</option>)}</select></label><button type="button" className={showAll?"active":""} onClick={()=>setShowAll(value=>!value)}>{showAll?"Show recommended only":"Show all measurements"}</button></div>
    </section>;
  return <div className="adaptive-inventory"><Inventory {...props} unitOptions={unitOptions} measurementGuide={guide}/></div>;
}
