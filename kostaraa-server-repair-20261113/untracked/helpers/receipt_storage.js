const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_BYTES=5*1024*1024;
const allowedTypes=new Set(['image/png','image/jpeg','image/webp']);
const checksum=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');

async function saveReceipt(connection,proofId,businessId,buffer){
  if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>MAX_BYTES)throw new Error('Invalid receipt image size.');
  await connection.execute(`INSERT INTO sales_channel_payment_proof_files (proof_id,business_profile_id,content,sha256)
    VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content),sha256=VALUES(sha256)`,[proofId,businessId,buffer,checksum(buffer)]);
}
async function readReceipt(connection,proof){
  if(!proof||!allowedTypes.has(proof.mime_type))return null;
  const [[stored]]=await connection.execute('SELECT content,sha256 FROM sales_channel_payment_proof_files WHERE proof_id=? AND business_profile_id=?',[proof.id,proof.business_profile_id]);
  if(stored){
    if(!Buffer.isBuffer(stored.content)||checksum(stored.content)!==stored.sha256)throw new Error('Receipt integrity check failed.');
    return stored.content;
  }
  const filename=proof.file_path?.match(/^private-sales-channel-receipts\/([a-f0-9-]{36})$/i)?.[1];
  if(!filename)return null;
  const root=path.resolve(process.env.STUDIO_HAZE_RECEIPT_DIR||path.join(__dirname,'../private-sales-channel-receipts'));
  let buffer;
  try{buffer=await fs.readFile(path.join(root,filename));}catch(error){if(error.code==='ENOENT')return null;throw error;}
  // Preserve legacy files in durable storage before returning them.
  await saveReceipt(connection,proof.id,proof.business_profile_id,buffer);
  return buffer;
}
module.exports={saveReceipt,readReceipt};
