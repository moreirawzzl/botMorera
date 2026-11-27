const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
const game=require('../../arquivos/js/auraJogo')
module.exports={name:'tiraraura',description:'Dono principal: retira aura. Ex.: .tiraraura 500 ou .tiraraura @pessoa 500',async execute(c){
 if(c.sender!==c.donoJid)return c.reply('Exclusivo do dono principal.')
 if(!c.isGroup)return c.reply('Só em grupos.')
 const args=c.args.filter(Boolean)
 const last=args[args.length-1]||''
 if(!/^\d+$/.test(last)||args.length>2)return c.reply('Use '+c.prefix+'tiraraura 500 (você) ou '+c.prefix+'tiraraura @pessoa 500.')
 const marked=await quotedMentions(c)
 let target
 if(args.length===1||(args.length===2&&args[0].toLowerCase()==='eu'))target=c.sender
 else if(marked.length===1)target=marked[0]
 else if(/^@\d{8,15}$/.test(args[0]))target=args[0].slice(1)+'@s.whatsapp.net'
 else return c.reply('Marque uma pessoa ou use '+c.prefix+'tiraraura 500 para retirar de você.')
 const rows=await members(c),p=await match(c,rows,target)
 if(!p)return c.reply('Pessoa não encontrada no grupo.')
 const r=game.removeAura(c.from,p.id,Number(last))
 if(r.error)return c.reply(r.error)
 return c.columbina.sendMessage(c.from,{text:'⚡ '+tag(p.id)+' perdeu *'+r.amount.toLocaleString('pt-BR')+' aura*.\nSaldo atual: '+r.score.toLocaleString('pt-BR')+' aura.',mentions:[p.id]},{quoted:c.info})
}}
