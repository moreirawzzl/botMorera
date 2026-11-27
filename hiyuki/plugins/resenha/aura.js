const {createHash}=require('node:crypto')
const {members,tag}=require('../../arquivos/js/resenhaMembros')
module.exports={name:'aura',aliases:['rankingaura','rankaura','auradodia'],description:'Top 10 de aura do dia, sorteio fixo por grupo até meia-noite de Brasília.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const rows=await members(c)
 if(!rows.length)return c.reply('Nenhum participante encontrado.')
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const scored=rows.map(p=>({id:p.id,score:createHash('sha256').update(JSON.stringify([c.from,day,p.id])).digest().readUInt32BE(0)%15001-5000})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,10)
 const fmt=n=>(n>0?'+':'')+n.toLocaleString('pt-BR')
 const lines=scored.map((p,i)=>(['🥇','🥈','🥉'][i]||String(i+1)+'.')+' '+tag(p.id)+' — *'+fmt(p.score)+' aura*')
 return c.columbina.sendMessage(c.from,{text:'⚡ *RANKING DE AURA DO DIA*\n\n'+lines.join('\n')+'\n\n_Ranking fictício, muda à meia-noite de Brasília._',mentions:scored.map(p=>p.id)},{quoted:c.info})
}}
