const {randomUUID}=require('node:crypto')
const recent=new Map(),pending=new Set(),globalTimes=[]
const cooldown=5*60*1000
async function send(c,type){
 const text=String(c.q||'').trim()
 const command=c.prefix+(type==='feedback'?'feedback':'sugestao')
 if(!text||text.length<5||text.length>1000)return c.reply('Use '+command+' sua mensagem (5 a 1000 caracteres). O texto e seu identificador serão enviados ao privado do dono.')
 const owner=String(c.donoJid||'').replace(/:\d+(?=@)/,'')
 if(!/^\d+@s\.whatsapp\.net$/.test(owner))return c.reply('Contato do dono indisponível.')
 const sender=String(c.sender||'').replace(/:\d+(?=@)/,'')
 if(!/^\d+@(s\.whatsapp\.net|lid)$/.test(sender))return c.reply('Não consegui identificar o remetente.')
 const now=Date.now()
 for(const [id,t] of recent)if(now-t>=cooldown)recent.delete(id)
 while(globalTimes.length&&now-globalTimes[0]>=60000)globalTimes.shift()
 if(pending.has(sender)||recent.has(sender))return c.reply('Aguarde 5 minutos entre envios.')
 if(globalTimes.length>=10||pending.size>=10||recent.size>=10000)return c.reply('Muitos envios agora. Tente novamente mais tarde.')
 pending.add(sender);globalTimes.push(now);recent.set(sender,now)
 const id=randomUUID().slice(0,8)
 const name=String(c.info?.pushName||'Não informado').replace(/[\r\n]/g,' ').slice(0,80)
 const clean=text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/g,'')
 try{
 await c.columbina.sendMessage(owner,{text:'📩 *'+(type==='feedback'?'NOVO FEEDBACK':'NOVA SUGESTÃO DE COMANDO')+'*\n\nProtocolo: '+id+'\nNome: '+name+'\nRemetente: '+sender+'\nOrigem: '+(c.isGroup?'Grupo':'Privado')+'\nData: '+new Date(now).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'\n\n—— Mensagem do usuário ——\n'+clean+'\n—— Fim ——'})
 }catch(e){return c.reply('Não consegui enviar ao dono. Tente novamente mais tarde.')}finally{pending.delete(sender)}
 return c.reply('✅ '+(type==='feedback'?'Feedback enviado':'Sugestão enviada')+' ao privado do dono! Obrigado pela contribuição. Protocolo: '+id+'.')
}
module.exports={send}
