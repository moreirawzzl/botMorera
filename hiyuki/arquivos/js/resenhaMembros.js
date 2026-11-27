function norm(id){return typeof id==='string'?id.replace(/:\d+@/,'@'):''}
function valid(id){return /^\d+@(lid|s\.whatsapp\.net)$/.test(norm(id))}
async function members(c){
 const meta=await c.columbina.groupMetadata(c.from)
 return meta.participants.map(p=>({id:norm(p.id||p.lid||p.phoneNumber),aliases:[p.id,p.lid,p.phoneNumber].map(norm).filter(valid)})).filter(p=>valid(p.id))
}
async function match(c,rows,input){
 const id=norm(input)
 let row=rows.find(p=>p.id===id||p.aliases.includes(id))
 if(row)return row
 try{
  const mapping=c.columbina.signalRepository?.lidMapping
  const mapped=norm(id.endsWith('@lid')?await mapping?.getPNForLID?.(id):await mapping?.getLIDForPN?.(id))
  if(mapped)row=rows.find(p=>p.id===mapped||p.aliases.includes(mapped))
 }catch{}
 return row
}
async function quotedMentions(c){
 const {normalizeMessageContent}=await import('@whiskeysockets/baileys')
 const m=normalizeMessageContent(c.info.message)
 const info=m?.extendedTextMessage?.contextInfo||m?.imageMessage?.contextInfo||m?.videoMessage?.contextInfo||{}
 return [...new Set((info.mentionedJid||[]).map(norm).filter(valid))]
}
const tag=id=>'@'+id.split('@')[0]
module.exports={members,match,quotedMentions,tag}
