module.exports = {
name: 'menuia',
description: 'Mostra todos os comandos de inteligência artificial',
category: 'menu',
aliases: ['aimenu', 'inteligenciamenu'],
async execute(ctx) { return ctx.menu('inteligencia-ia') }
}
