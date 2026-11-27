const {media}=require('../../arquivos/js/imagemComando')
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{execFile}=require('node:child_process'),{promisify}=require('node:util')
let busy=false
function parse(tsv,min=60){
 const lines=new Map()
 for(const row of tsv.split(/\r?\n/).slice(1)){
  const v=row.split('\t'),word=v.slice(11).join('\t').trim(),conf=Number(v[10])
  if(v[0]!=='5'||!word||!Number.isFinite(conf)||conf<min||!(/[\p{L}\p{N}]/u.test(word)))continue
  const key=v.slice(1,5).join(':')
  if(!lines.has(key))lines.set(key,[])
  lines.get(key).push(word)
 }
 return [...lines.values()].map(words=>words.join(' ')).join('\n').trim()
}
module.exports={name:'ocr',description:'Extrai texto de imagem marcada. Use .ocr bruto para ver o texto sem filtro.',async execute(c){
 if(busy)return c.reply('OCR ocupado.')
 busy=true;let dir
 try{
  const b=await media(c,'image'),sharp=(await import('sharp')).default
  dir=await fs.mkdtemp(path.join(os.tmpdir(),'bot-paneleiro-ocr-'))
  const input=path.join(dir,'imagem.png')
  const meta=await sharp(b,{limitInputPixels:20000000}).metadata()
  const size=Math.min(1800,Math.max(900,Math.max(meta.width||0,meta.height||0)*2))
  await sharp(b,{limitInputPixels:20000000}).rotate().flatten({background:'#ffffff'}).resize({width:size,height:size,fit:'inside'}).grayscale().normalize().sharpen().png().toFile(input)
  const raw=c.q?.trim().toLowerCase()==='bruto'
  const run=async psm=> (await promisify(execFile)(process.env.TESSERACT_PATH||'tesseract',[input,'stdout','-l','por','--psm',String(psm),...(raw?[]:['tsv'])],{timeout:45000,maxBuffer:2*1024*1024,windowsHide:true})).stdout
  let result=await run(11)
  result=raw?result.trim():parse(result)
  if(!result&&!raw)result=parse(await run(6))
  if(!result)return c.reply('Não encontrei texto com confiança suficiente. Tente uma imagem mais nítida ou use '+c.prefix+'ocr bruto.')
  return c.reply('📝 *TEXTO EXTRAÍDO*\n\n'+result.slice(0,10000))
 }catch(e){console.error('[OCR]',e.message);return c.reply('OCR falhou. Confira a imagem e a instalação do Tesseract com idioma por.')}
 finally{busy=false;if(dir)await fs.rm(dir,{recursive:true,force:true})}
}}
