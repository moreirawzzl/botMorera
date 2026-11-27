module.exports={name:'admin',aliases:['admins'],description:'Lista e marca os administradores do grupo.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const admins=c.groupMembers.filter(x=>x.admin)
 if(!admins.length)return c.reply('Nenhum administrador encontrado.')
 const names=await Promise.all(admins.map(async x=>(await c.resolveName(x.id))||'@'+x.id.split('@')[0]))
 return c.columbina.sendMessage(c.from,{text:'🛡️ *ADMINISTRADORES*\n\n'+names.map((n,i)=>(i+1)+'. '+n+' (@'+admins[i].id.split('@')[0]+')').join('\n'),mentions:admins.map(x=>x.id)},{quoted:c.info})
}}