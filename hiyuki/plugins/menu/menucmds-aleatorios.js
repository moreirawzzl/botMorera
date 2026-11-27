module.exports = {
name: 'menucmds',
description: 'Mostra todos os comandos livres/aleatórios',
category: 'menu',
aliases: ['menulivre', 'comandos', 'cmds'],
async execute(ctx) { return ctx.menu('cmds-aleatorios') }
}
