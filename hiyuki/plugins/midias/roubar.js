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
  const B=await import('@whiskeysockets/baileys')
  const {audioDaFigurinha,montarCampo134}=await import('../../../lib.mjs')
  const m=B.normalizeMessageContent(c.info.message)
  const quoted=m?.extendedTextMessage?.contextInfo
  const sound=audioDaFigurinha(quoted?.quotedMessage)||audioDaFigurinha(B.normalizeMessageContent(quoted?.quotedMessage))||c.soundSticker?.(quoted?.stanzaId)
  let b
  if(sound){
   const parts=[];let size=0
   for await(const chunk of await B.downloadContentFromMessage(sound.sticker,'sticker')){
    size+=chunk.length;if(size>1024*1024)throw Error('Figurinha acima do limite.')
    parts.push(chunk)
   }
   b=Buffer.concat(parts)
  }else b=await media(c,'sticker',1024*1024)
  const {Image}=require('node-webpmux')
  const img=new Image()
  await img.load(b)
  img.exif=metadata(pack,author)
  const sticker=await img.save(null)
  if(!Buffer.isBuffer(sticker)||!sticker.length)throw Error('WebP não retornou dados válidos.')
  if(sticker.length>1024*1024)return c.reply('Figurinha acima do limite.')
  if(sound){
   const prepared=await B.prepareWAMessageMedia({sticker},{upload:c.columbina.waUploadToServer})
   const msg=prepared.stickerMessage
   msg.isAnimated=Boolean(sound.sticker.isAnimated)
   msg.width=sound.sticker.width||512;msg.height=sound.sticker.height||512
   msg.contextInfo={stanzaId:c.info.key.id,participant:c.info.key.fromMe?B.jidNormalizedUser(c.columbina.user.id):c.info.key.participant||c.from,remoteJid:c.from,quotedMessage:m}
   const raw=montarCampo134(msg,sound.audio)
   return await c.columbina.relayMessage(c.from,{__raw134:raw},{messageId:(B.generateMessageIDV2||B.generateMessageID)(c.columbina.user.id)})
  }
  return await c.columbina.sendMessage(c.from,{sticker},{quoted:c.info})
 }catch(e){
  console.error('[TAKE]',e)
  return c.reply('Não consegui editar a figurinha: '+String(e?.message||e).replace(/(?:[A-Za-z]:\\|\/)[^\s]+/g,'[caminho]').slice(0,180))
 }
}}
