const fs=require('node:fs'),path=require('node:path')
const file=path.resolve(__dirname,'../../database/moderacao.json')
let settings={}
try{settings=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code!=='ENOENT')console.error('Moderacao:',e.message)}
const flood=new Map(),seen=new Map()
function configure(c,type){
 if(!c.isGroup||!c.isAdm)return c.reply('Somente administradores do grupo.')
 const action=(c.args[0]||'').toLowerCase(),current=settings[c.from]||{}
 if(!['on','off'].includes(action))return c.reply(type+': '+(current[type]?'ligado':'desligado')+'. Use '+c.prefix+type+' on/off.')
 const next={...settings,[c.from]:{...current,[type]:action==='on'}}
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(next));fs.renameSync(file+'.tmp',file);settings=next
 return c.reply(type+' '+(action==='on'?'ligado. O bot precisa ser admin para apagar mensagens.':'desligado.'))
}
const norm=id=>String(id||'').replace(/:\d+@/,'@')
async function inspect(sock,m,text){
 const jid=m.key.remoteJid,s=settings[jid]
 if(!jid?.endsWith('@g.us')||m.key.fromMe||!s||(!s.antilink&&!s.antiflood))return false
 const id=m.key.participant||m.key.participantAlt;if(!id)return false
 const now=Date.now(),key=jid+'/'+m.key.id
 if(seen.has(key))return false;seen.set(key,now);if(seen.size>4096)seen.delete(seen.keys().next().value)
 const fkey=jid+'/'+norm(id)
 let a=(flood.get(fkey)||[]).filter(t=>now-t<8000)
 if(s.antiflood){a.push(now);flood.set(fkey,a.slice(-8));if(flood.size>4000)flood.delete(flood.keys().next().value)}
 const link=s.antilink&&/(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/)/i.test(text||'')
 if(!link&&!(s.antiflood&&a.length>=7))return false
 const meta=await sock.groupMetadata(jid),ids=[m.key.participant,m.key.participantAlt].filter(Boolean).map(norm),self=[sock.user?.id,sock.user?.lid].filter(Boolean).map(norm)
 const matches=(p,list)=>[p.id,p.lid,p.phoneNumber].filter(Boolean).some(x=>list.includes(norm(x)))
 if(meta.participants.some(p=>p.admin&&matches(p,ids))||!meta.participants.some(p=>p.admin&&matches(p,self)))return false
 await sock.sendMessage(jid,{delete:m.key})
 if(link||a.length===7)await sock.sendMessage(jid,{text:link?'⚠️ Links não são permitidos neste grupo.':'⚠️ Evite enviar muitas mensagens seguidas.'},{quoted:m}).catch(()=>{})
 return true
}
module.exports={configure,inspect}
