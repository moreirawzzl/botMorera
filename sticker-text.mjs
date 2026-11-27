import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import sharp from 'sharp'
let active=false
export function textBox(tsv,width,height){
 const words=[]
 for(const row of tsv.split(/\r?\n/).slice(1)){
  const v=row.split('\t'),text=v.slice(11).join('\t').trim(),conf=Number(v[10])
  const [x,y,w,h]=v.slice(6,10).map(Number)
  if(v[0]!=='5'||conf<75||!Number.isFinite(conf)||!/\p{L}{2,}/u.test(text)||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)continue
  words.push({x,y,w,h})
 }
 if(!words.length)return null
 const pad=Math.max(6,Math.round(Math.max(...words.map(w=>w.h))*.45))
 const left=Math.max(0,Math.floor(Math.min(...words.map(w=>w.x))-pad))
 const top=Math.max(0,Math.floor(Math.min(...words.map(w=>w.y))-pad))
 const right=Math.min(width,Math.ceil(Math.max(...words.map(w=>w.x+w.w))+pad))
 const bottom=Math.min(height,Math.ceil(Math.max(...words.map(w=>w.y+w.h))+pad))
 if(right<=left||bottom<=top)return null
 if((right-left)*(bottom-top)>width*height*.85)return null
 return {left,top,width:right-left,height:bottom-top}
}
export async function cropStickerText(bytes){
 if(active)return bytes
 active=true
 let dir
 try{
  // OCR and extraction use identical oriented pixel coordinates.
  const source=await sharp(bytes,{limitInputPixels:20000000}).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).png().toBuffer()
  const {width,height}=await sharp(source).metadata()
  dir=await fs.mkdtemp(path.join(os.tmpdir(),'moreira-text-'))
  const input=path.join(dir,'ocr.png')
  await sharp(source).flatten({background:'#ffffff'}).grayscale().normalize().sharpen().png().toFile(input)
  const {stdout}=await promisify(execFile)(process.env.TESSERACT_PATH||'tesseract',[input,'stdout','-l','por','--psm','11','tsv'],{timeout:18000,maxBuffer:2*1024*1024,windowsHide:true})
  const box=textBox(stdout,width,height)
  return box?await sharp(source).extract(box).png().toBuffer():bytes
 }catch(e){console.warn('[FIG OCR]',e.message);return bytes}
 finally{active=false;if(dir)await fs.rm(dir,{recursive:true,force:true}).catch(()=>{})}
}
