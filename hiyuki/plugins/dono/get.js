module.exports = {
name: 'getquoted',
description: 'Mostra as informações da mensagem marcada',
category: 'dono',
aliases: ['getinfo','get'],
async execute(ctx) { const q = ctx.info.message.extendedTextMessage?.contextInfo; return ctx.reply(q?.quotedMessage ? 'Tipo: ' + Object.keys(q.quotedMessage).join(', ') + '\nID: ' + q.stanzaId : 'Responda a uma mensagem.') }
}
