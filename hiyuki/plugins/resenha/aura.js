const {members,tag}=require('../../arquivos/js/resenhaMembros')
const {seed,hash}=require('../../arquivos/js/resenhaDiaria')
async function execute(c,renew=false){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const rows=await members(c)
 if(!rows.length)return c.reply('Nenhum participante encontrado.')
 const s=seed(c.from,'aura',renew)
 const scored=rows.map(p=>({id:p.id,score:hash(s,p.id)%15001-5000})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,10)
 const fmt=n=>(n>0?'+':'')+n.toLocaleString('pt-BR')
 const lines=scored.map((p,i)=>(['🥇','🥈','🥉'][i]||String(i+1)+'.')+' '+tag(p.id)+' — *'+fmt(p.score)+' aura*')
 return c.columbina.sendMessage(c.from,{text:'⚡ *'+(renew?'NOVO RANKING DE AURA':'RANKING DE AURA DO DIA')+'*\n\n'+lines.join('\n')+'\n\n_Ranking fictício, muda à meia-noite ou com novo sorteio._',mentions:scored.map(p=>p.id)},{quoted:c.info})
}
module.exports={name:'aura',aliases:['rankingaura','rankaura','auradodia'],description:'Ranking de aura do dia. Use .novaaura para sortear novamente.',execute:c=>execute(c),renew:c=>execute(c,true)}
