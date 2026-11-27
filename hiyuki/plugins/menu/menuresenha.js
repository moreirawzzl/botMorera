module.exports = {
name: 'menuresenha',
description: 'Mostra todos os comandos de resenha/diversão',
category: 'menu',
aliases: ['resenha', 'diversao', 'brincadeiras'],
async execute(ctx) { return ctx.menu('resenha') }
}
