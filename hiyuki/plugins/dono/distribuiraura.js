const {wrap}=require('../../arquivos/js/moedaGrupo')
const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
const game=require('../../arquivos/js/auraJogo')
module.exports={name:'distribuiraura',description:'Dono principal: zera aura da pessoa marcada e divide entre os demais membros.',async execute(c){
 c=wrap(c);
 if(c.sender!==c.donoJid)return c.reply('Exclusivo do dono principal.')
 if(!c.isGroup)return c.reply('Só em grupos.')
 const marked=await quotedMentions(c)
 if(marked.length!==1)return c.reply('Use '+c.prefix+'distribuiraura @pessoa.')
 const rows=await members(c),p=await match(c,rows,marked[0])
 if(!p)return c.reply('Pessoa não encontrada no grupo.')
 const r=game.distribute(c.from,p.id,rows.map(x=>x.id))
 if(r.error)return c.reply(r.error)
 return c.columbina.sendMessage(c.from,{text:'⚡ *DISTRIBUIÇÃO DE AURA*\n\n'+tag(p.id)+' teve '+r.total.toLocaleString('pt-BR')+' aura distribuídos entre os demais membros.\nSaldo da pessoa: 0 aura.\nMembros elegíveis: '+r.count+'\nMembros que receberam: '+r.paid+'\nDivisão: '+r.each+' aura por membro'+(r.remainder?' (+1 para '+r.remainder+' membros sorteados).':'.'),mentions:[p.id]},{quoted:c.info})
}}
