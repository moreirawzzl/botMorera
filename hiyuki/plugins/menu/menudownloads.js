module.exports = {
name: 'menudownloads',
description: 'Mostra todos os comandos de download',
category: 'menu',
aliases: ['downmenu', 'dlmenu', 'baixar'],
async execute(ctx) { return ctx.menu('downloads') }
}
