module.exports = {
name: 'botoff',
description: 'Desliga o bot (bloqueia comandos para todos exceto o dono)',
category: 'dono',
aliases: ['desligar', 'shutdown'],
async execute({ columbina, from, info, reply, isDono }) {
if (!isDono) return reply('❌ Apenas o dono pode usar este comando!')
global.botLigado = false
await reply('🌑 *BOT Moreira OFF* 🌑\n\nApenas o dono pode usar comandos agora.\nUse `boton` para reativar(se vc for o dono né).')
}
}