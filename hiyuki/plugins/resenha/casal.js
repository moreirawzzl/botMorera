const {members,tag}=require('../../arquivos/js/resenhaMembros')
const {seed,hash}=require('../../arquivos/js/resenhaDiaria')
async function execute(c,renew=false){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const ids=[...new Set((await members(c)).map(p=>p.id))]
 if(ids.length<2)return c.reply('São necessários dois participantes.')
 const s=seed(c.from,'casal',renew)
 ids.sort((a,b)=>hash(s,a)-hash(s,b)||a.localeCompare(b))
 const [a,b]=ids
 return c.columbina.sendMessage(c.from,{text:'💞 *'+(renew?'NOVO CASAL DO DIA':'CASAL DO DIA')+'*\n\n'+tag(a)+' e '+tag(b)+'',mentions:[a,b]},{quoted:c.info})
}
module.exports={name:'casal',aliases:['casaldodia'],description:'Mostra o casal do dia. Use .novocasal para sortear novamente.',execute:c=>execute(c),renew:c=>execute(c,true)}
