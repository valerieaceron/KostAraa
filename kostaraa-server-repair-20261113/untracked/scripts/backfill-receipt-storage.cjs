// Copies only the specified owner's existing private receipt files into the DB.
// Missing files are reported, never substituted with another payment's proof.
require('dotenv').config();
const mysql=require('mysql2/promise');const fs=require('node:fs/promises');const path=require('node:path');
const {readReceipt}=require('../helpers/receipt_storage');
(async()=>{const c=await mysql.createConnection(require('../config/database'));try{
 await c.query(await fs.readFile(path.join(__dirname,'../20261116_sales_channel_receipt_storage.mysql.sql'),'utf8'));
 await c.beginTransaction();
 const [proofs]=await c.execute(`SELECT proof.id,proof.business_profile_id,proof.file_path,proof.mime_type
 FROM sales_channel_payment_proofs proof JOIN sales_channel_payments p ON p.id=proof.payment_id AND p.business_profile_id=proof.business_profile_id
 JOIN sales_channels sc ON sc.id=p.sales_channel_id JOIN users u ON u.id=sc.owner_user_id
 WHERE LOWER(TRIM(u.email))=? AND sc.channel_code='studio-haze' AND sc.deleted_at IS NULL`,['hazeldeo1016@gmail.com']);
 for(const proof of proofs){const content=await readReceipt(c,proof);console.log(`Proof ${proof.id}: ${content?'backed up in private database storage':'original image missing; recovery required'}`);}
 await c.commit();
 }catch(error){await c.rollback();throw error;}finally{await c.end();}})().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
