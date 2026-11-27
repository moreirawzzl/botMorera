const {members,match}=require('../../arquivos/js/resenhaMembros')
const {daily}=require('../../arquivos/js/auraJogo')
module.exports={name:'daily',description:'Resgata aura diária; aumenta 100 por dia consecutivo.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const p=await match(c,await members(c),c.sender)
 if(!p)return c.reply('Não consegui identificar seu jogador.')
 const r=daily(c.from,p.id)
 if(r.error)return c.reply(r.error)
 return c.reply('🎁 *RECOMPENSA DIÁRIA*\n\nDia '+r.streak+' consecutivo\n+'+r.amount.toLocaleString('pt-BR')+' aura\nSaldo: '+r.score.toLocaleString('pt-BR')+' aura\n\nAmanhã: '+r.next.toLocaleString('pt-BR')+' aura.\nSe perder um dia, volta para 500.')
}}
