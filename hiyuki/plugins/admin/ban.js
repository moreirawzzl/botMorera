const {match}=require('../../arquivos/js/resenhaMembros')
module.exports={name:'ban',description:'Remove um membro do grupo',aliases:['kick','expulsar'],async execute(c){
 if(!c.isGroup||(!c.isAdm&&!c.isDono))return c.reply('Somente administradores em grupos.')
 if(!c.isBotAdm)return c.reply('O bot precisa ser administrador.')
 const q=c.info.message?.extendedTextMessage?.contextInfo||{}
 const id=q.mentionedJid?.[0]||q.participant||(/^\+?\d{10,15}$/.test(c.args[0]||'')?c.args[0].replace(/^\+/,'')+'@s.whatsapp.net':'')
 if(!id)return c.reply('Marque ou responda a um membro.')
 const rows=c.groupMembers.map(m=>({id:m.id,aliases:[m.id,m.lid,m.phoneNumber].filter(Boolean).map(x=>x.replace(/:\d+@/,'@')),admin:m.admin}))
 const target=await match(c,rows,id)
 if(!target)return c.reply('Usuário não encontrado no grupo.')
 for(const protectedId of [c.botNumber,c.columbina.user?.lid,c.donoJid]){
  if(protectedId&&(await match(c,rows,protectedId))?.id===target.id)return c.reply('Não posso remover o bot ou o dono principal.')
 }
 if(!c.isDono&&((await match(c,rows,c.sender))?.id===target.id||target.admin))return c.reply('Não é permitido remover você mesmo ou outro administrador.')
 const name=await c.resolveName(target.id)||'Membro'
 try{
  const result=await c.columbina.groupParticipantsUpdate(c.from,[target.id],'remove')
  if(String(result?.[0]?.status)!=='200')return c.reply('Não consegui remover '+name+'. Verifique as permissões.')
  return c.reply('✅ '+name+' foi removido do grupo.')
 }catch{return c.reply('Não consegui remover '+name+'. Verifique as permissões.')}
}}
