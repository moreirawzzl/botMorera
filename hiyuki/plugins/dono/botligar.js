module.exports = {
name: 'boton',
description: 'Liga o bot (reativa comandos para todos)',
category: 'dono',
aliases: ['ligar', 'start'],
async execute({ columbina, from, info, reply, isDono }) {
if (!isDono) return reply('❌ Apenas o dono pode usar este comando!')
global.botLigado = true
await reply('🌕 *BOT Moreira OPERANDO NOVAMENTE* 🌕')
}
}