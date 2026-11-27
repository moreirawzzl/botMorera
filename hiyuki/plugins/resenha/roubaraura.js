const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
const game=require('../../arquivos/js/auraJogo')
const horarioLiberacao=timestamp=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'medium'}).format(new Date(timestamp)).replace(',',' às')
module.exports={name:'roubar',aliases:['roubaraura','rouboaura','furtaraura'],description:'Tenta roubar aura de um membro marcado. Chance de 65%; intervalo de 5 minutos.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const marked=await quotedMentions(c)
 if(marked.length!==1)return c.reply('Use '+c.prefix+'roubar @pessoa (uma menção).')
 const rows=await members(c),a=await match(c,rows,c.sender),b=await match(c,rows,marked[0])
 if(!a||!b)return c.reply('Não consegui identificar os jogadores.')
 const r=game.steal(c.from,a.id,b.id)
 if(r.error==='cooldown')return c.reply('⏳ Você poderá usar o '+c.prefix+'roubar novamente em '+horarioLiberacao(r.next)+' (horário de Brasília).')
 if(r.error)return c.reply(r.error)
 const text=(r.success?'⚡ *ROUBO DE AURA BEM-SUCEDIDO!*':'💀 *ROUBO DE AURA FRACASSADO!*')+'\n\n'+tag(a.id)+(r.success?' roubou ':' perdeu ')+'*'+r.amount+' aura* '+(r.success?'de ':'para ')+tag(b.id)+'.\n\n'+tag(a.id)+': '+r.attacker.toLocaleString('pt-BR')+' aura\n'+tag(b.id)+': '+r.target.toLocaleString('pt-BR')+' aura\n\nPróxima tentativa liberada em '+horarioLiberacao(r.next)+' (horário de Brasília).'
 return c.columbina.sendMessage(c.from,{text,mentions:[a.id,b.id]},{quoted:c.info})
}}
