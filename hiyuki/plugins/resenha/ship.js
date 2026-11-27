const {randomInt}=require('node:crypto')
const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
module.exports={name:'ship',description:'Sorteia compatibilidade fictícia entre duas pessoas marcadas.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const ids=await quotedMentions(c)
 if(ids.length!==2)return c.reply('Use '+c.prefix+'ship @pessoa @pessoa.')
 const rows=await members(c),[a,b]=await Promise.all(ids.map(x=>match(c,rows,x)))
 if(!a||!b||a.id===b.id)return c.reply('Marque duas pessoas diferentes do grupo.')
 const n=randomInt(101),fill=Math.round(n/10)
 return c.columbina.sendMessage(c.from,{text:'💞 *SHIP DO GRUPO*\n\n'+tag(a.id)+' + '+tag(b.id)+'\n'+('▰'.repeat(fill)+'▱'.repeat(10-fill))+' *'+n+'%*\n\n_Compatibilidade fictícia, só brincadeira._',mentions:[a.id,b.id]},{quoted:c.info})
}}
