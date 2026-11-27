const {media}=require('../../arquivos/js/imagemComando')
const {randomUUID}=require('node:crypto')
function metadata(pack,author){
 const json=Buffer.from(JSON.stringify({'sticker-pack-id':'bot-paneleiro-'+randomUUID(),'sticker-pack-name':pack,'sticker-pack-publisher':author,emojis:['']}))
 const exif=Buffer.from([0x49,0x49,0x2a,0,8,0,0,0,1,0,0x41,0x57,7,0,0,0,0,0,22,0,0,0])
 exif.writeUInt32LE(json.length,14)
 return Buffer.concat([exif,json])
}
module.exports={name:'take',aliases:['roubarfig'],description:'Altera pacote e autor da figurinha marcada. .take pacote | autor',async execute(c){
 const parts=(c.q||'').split('|').map(x=>x.trim())
 if(parts.length!==2||parts.some(x=>!x||x.length>80))return c.reply('Marque uma figurinha e use '+c.prefix+'take pacote | autor.')
 const [pack,author]=parts
 try{
  const b=await media(c,'sticker',1024*1024)
  const {Image}=require('node-webpmux')
  const img=new Image()
  await img.load(b)
  img.exif=metadata(pack,author)
  const sticker=await img.save(null)
  if(!Buffer.isBuffer(sticker)||!sticker.length)throw Error('WebP não retornou dados válidos.')
  if(sticker.length>1024*1024)return c.reply('Figurinha acima do limite.')
  return await c.columbina.sendMessage(c.from,{sticker},{quoted:c.info})
 }catch(e){
  console.error('[TAKE]',e)
  return c.reply('Não consegui editar a figurinha: '+String(e?.message||e).replace(/(?:[A-Za-z]:\\|\/)[^\s]+/g,'[caminho]').slice(0,180))
 }
}}
