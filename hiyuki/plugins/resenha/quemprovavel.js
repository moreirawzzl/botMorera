const {randomInt}=require('node:crypto')
const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
module.exports={name:'quemprovavel',aliases:['quemprovável','maisprovavel'],description:'Sorteia entre os marcados ou todo o grupo. Ex.: .quemprovavel chegar atrasado @pessoa @pessoa',async execute(c){
 if(!c.isGroup)return c.reply('Use em grupo: '+c.prefix+'quemprovavel esquecer o aniversário @pessoa @pessoa')
 const rows=await members(c),marked=await quotedMentions(c)
 const found=await Promise.all(marked.map(id=>match(c,rows,id)))
 const candidates=marked.length?[...new Map(found.filter(Boolean).map(p=>[p.id,p])).values()]:rows
 if(marked.length&&found.some(p=>!p))return c.reply('Não consegui identificar todos os participantes marcados. Marque membros atuais do grupo.')
 if(candidates.length<2)return c.reply('Marque pelo menos duas pessoas ou deixe sem menções para sortear o grupo.')
 const winner=candidates[randomInt(candidates.length)]
 // Remove the selection tokens from the question, and display candidates with real mentions.
 const question=(c.q||require('../../arquivos/js/resenhaBanco').draw(c.from,'maisprovavel')).replace(/@\d+(?=\D|$)/g,'').replace(/\s+ou\s*$/i,'').replace(/\s+/g,' ').trim().slice(0,220)
 const chosen=marked.length?'Entre: '+candidates.map(p=>tag(p.id)).join(' ou ')+'\n':''
 const text='🔮 *QUEM É MAIS PROVÁVEL?*\n\n'+(question||'Escolha aleatória')+'?\n'+chosen+'\nResultado: '+tag(winner.id)+''
 return c.columbina.sendMessage(c.from,{text,mentions:[...new Set([winner.id,...(marked.length?candidates.map(p=>p.id):[])])]},{quoted:c.info})
}}
