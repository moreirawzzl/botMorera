const {members,tag,match}=require('../../arquivos/js/resenhaMembros')
const game=require('../../arquivos/js/auraJogo')
module.exports={name:'aura',aliases:['rankingaura','rankaura','auradodia'],description:'Ranking permanente de aura do grupo. Use .roubaraura @pessoa para disputar pontos.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const rows=await members(c)
 if(!rows.length)return c.reply('Nenhum participante encontrado.')
 const ranked=game.ranking(c.from,rows.map(p=>p.id)),top=ranked.slice(0,10)
 const me=await match(c,rows,c.sender)
 const pos=ranked.findIndex(p=>p.id===me?.id)
 const lines=top.map((p,i)=>(['🥇','🥈','🥉'][i]||String(i+1)+'.')+' '+tag(p.id)+' — *'+p.score.toLocaleString('pt-BR')+' aura*')
 return c.columbina.sendMessage(c.from,{text:'⚡ *RANKING DE AURA*\n\n'+lines.join('\n')+(pos>=0?'\n\nSua posição: '+(pos+1)+'º • '+ranked[pos].score.toLocaleString('pt-BR')+' aura':'')+'\n\nRoube aura com '+c.prefix+'roubaraura @pessoa.',mentions:top.map(p=>p.id)},{quoted:c.info})
}}
