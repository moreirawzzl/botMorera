const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
const game=require('../../arquivos/js/auraJogo')
module.exports={name:'tiraraura',description:'Dono principal: retira aura. Ex.: .tiraraura @pessoa 500',async execute(c){
 if(c.sender!==c.donoJid)return c.reply('Exclusivo do dono principal.')
 if(!c.isGroup)return c.reply('Só em grupos.')
 const marked=await quotedMentions(c),amounts=c.args.filter(x=>/^\d+$/.test(x))
 if(marked.length!==1||amounts.length!==1)return c.reply('Use '+c.prefix+'tiraraura @pessoa 500.')
 const rows=await members(c),p=await match(c,rows,marked[0])
 if(!p)return c.reply('Pessoa não encontrada no grupo.')
 const r=game.removeAura(c.from,p.id,Number(amounts[0]))
 if(r.error)return c.reply(r.error)
 return c.columbina.sendMessage(c.from,{text:'⚡ '+tag(p.id)+' perdeu *'+r.amount.toLocaleString('pt-BR')+' aura*.\nSaldo atual: '+r.score.toLocaleString('pt-BR')+' aura.',mentions:[p.id]},{quoted:c.info})
}}
