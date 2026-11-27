module.exports = {
 name:'apagar',description:'Apaga mensagem marcada: a sua própria ou, se admin, de outro membro. .apagarminha também funciona.',aliases:['del','delete','d','apagarminha'],
 async execute(c){
  const {jidNormalizedUser,normalizeMessageContent}=await import('@whiskeysockets/baileys')
  const norm=id=>id?jidNormalizedUser(id):''
  const m=normalizeMessageContent(c.info.message)
  const q=m?.extendedTextMessage?.contextInfo||m?.imageMessage?.contextInfo||m?.videoMessage?.contextInfo
  if(!q?.stanzaId||!q.quotedMessage)return c.reply('Responda à mensagem que deseja apagar com '+c.prefix+'apagar.')
  if(q.remoteJid&&q.remoteJid!==c.from)return c.reply('Só posso apagar mensagens desta conversa.')
  const sock=c.columbina
  async function ids(input){
   const set=new Set(input.filter(Boolean).map(norm))
   for(const id of [...set]){
    try{const map=sock.signalRepository?.lidMapping
     const other=id.endsWith('@lid')?await map?.getPNForLID?.(id):await map?.getLIDForPN?.(id)
     if(other)set.add(norm(other))
    }catch{}
   }
   return set
  }
  const author=norm(q.participant)
  if(!author)return c.reply('Não consegui confirmar o autor da mensagem marcada.')
  const target=await ids([author])
  const self=await ids([sock.user?.id,sock.user?.lid])
  const requester=await ids([c.sender,c.info.key.participant,c.info.key.participantAlt])
  const intersects=(a,b)=>[...a].some(id=>b.has(id))
  const mine=intersects(target,self),own=intersects(target,requester)
  const token=c.info.message?.extendedTextMessage?.text?.trim().split(/\s+/)[0]?.toLowerCase()
  if(token===c.prefix+'apagarminha'&&!own)return c.reply('Marque uma mensagem sua.')
  if(!own&&!c.isAdm&&!c.isDono)return c.reply('Você só pode solicitar a exclusão da sua própria mensagem.')
  if(!mine&&(!c.isGroup||!c.isBotAdm))return c.reply('Para apagar mensagens de outras contas, o bot precisa ser administrador do grupo.')
  try{
   await sock.sendMessage(c.from,{delete:{remoteJid:c.from,id:q.stanzaId,fromMe:mine,...(c.isGroup?{participant:q.participant}:{})}})
   await c.reagir('🗑️')
  }catch(e){return c.reply('Não consegui apagar. Verifique o prazo e as permissões do WhatsApp.')}
 }
}
