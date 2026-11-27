module.exports = {
 name: 'provavel',
 aliases: ['provável'],
 description: 'Sorteia uma probabilidade de 1 a 100%',
 async execute(ctx) {
  const { info, columbina, from, q, prefix, reply } = ctx
  if (!q?.trim()) return reply('Use '+prefix+'provavel sua pergunta')
  const context = info.message?.extendedTextMessage?.contextInfo || info.message?.imageMessage?.contextInfo || info.message?.videoMessage?.contextInfo || {}
  const mentions = [...new Set((context.mentionedJid || []).filter(j => typeof j === 'string' && /@(lid|s\.whatsapp\.net)$/.test(j)))]
  const n = Math.floor(Math.random()*100)+1
  const filled = Math.round(n/10)
  const status = n >= 75 ? 'Muito provável!' : n >= 40 ? 'Tem chance!' : n >= 15 ? 'Pouco provável!' : 'Muito improvável!'
  const resposta = '🔮 *CENTRAL DE PROBABILIDADES*\n\n'+q.trim()+'\n\n'+'▰'.repeat(filled)+'▱'.repeat(10-filled)+'  *'+n+'%*\n'+status+'\n\n_Aleatório, só por diversão._'
  return columbina.sendMessage(from,{text:resposta,mentions},{quoted:info})
 }
}
