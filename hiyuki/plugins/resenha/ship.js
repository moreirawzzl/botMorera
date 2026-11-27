const {randomInt}=require('node:crypto')
const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
module.exports={name:'ship',description:'Sorteia compatibilidade fictícia. Ex.: .ship eu e @pessoa ou .ship @pessoa @pessoa.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const ids=await quotedMentions(c)
 const self=ids.length===1 && (c.args.length===1 || c.args.some(x=>x.toLowerCase()==='eu'))
 if(self)ids.unshift(c.sender)
 if(ids.length!==2)return c.reply('Use '+c.prefix+'ship eu e @pessoa, '+c.prefix+'ship @pessoa ou '+c.prefix+'ship @pessoa @pessoa.')
 const rows=await members(c),[a,b]=await Promise.all(ids.map(x=>match(c,rows,x)))
 if(!a||!b||a.id===b.id)return c.reply('Marque duas pessoas diferentes do grupo.')
 const n=randomInt(101),fill=Math.round(n/10)
 return c.columbina.sendMessage(c.from,{text:'💞 *SHIP DO GRUPO*\n\n'+tag(a.id)+' + '+tag(b.id)+'\n'+('▰'.repeat(fill)+'▱'.repeat(10-fill))+' *'+n+'%*\n\n_Compatibilidade fictícia, só brincadeira._',mentions:[a.id,b.id]},{quoted:c.info})
}}
