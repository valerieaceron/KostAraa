import {useState} from "react";
import {API_BASE_URL} from "../costing/utils/api";
export default function ProductDisplayFields({product,onLoading}){
  const [orderImage,setOrderImage]=useState(product.displayImage?new URL(product.displayImage,API_BASE_URL).href:"");
  const [imageError,setImageError]=useState("");
  const [imageLoading,setLoading]=useState(false);
  const setImageLoading=value=>{setLoading(value);onLoading(value)};
  const uploadImage=event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    setImageError("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setImageError("Choose a JPG, PNG, or WebP image up to 5 MB.");event.target.value="";return}
    setImageLoading(true);
    const reader=new FileReader();
    reader.onload=()=>{setOrderImage(String(reader.result));setImageLoading(false)};
    reader.onerror=()=>{setImageError("Unable to read this image. Please try again.");setImageLoading(false)};
    reader.readAsDataURL(file);
  };
  return <section className="product-display-fields">
    <h3>Website display details</h3>
    <label>Collection / category<input name="category" defaultValue={product.category||"Other"} maxLength={120} required/></label>
    <label>Description<textarea name="description" defaultValue={product.description||""} placeholder="Describe this product for your website" maxLength={2000}/></label>
    <label>Display image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={imageLoading}/><small>JPG, PNG, or WebP · Maximum 5 MB</small></label>
    <input type="hidden" name="displayImage" value={orderImage}/>
    {imageLoading&&<p role="status">Loading image…</p>}
    {imageError&&<p className="product-image-error" role="alert">{imageError}</p>}
    {orderImage&&<div className="product-image-preview"><img src={orderImage} alt={`${product.name} display preview`}/><button type="button" className="button secondary small" disabled={imageLoading} onClick={()=>setOrderImage("")}>Remove image</button></div>}
  </section>;
}
