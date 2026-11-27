module.exports = {
name: 'menuefeitos',
description: 'Mostra todos os comandos de efeitos',
category: 'menu',
aliases: ['efeitos', 'fxmenu', 'efmenu'],
async execute(ctx) { return ctx.menu('efeitos') }
}
