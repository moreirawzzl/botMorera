module.exports = {
name: 'menurpg',
description: 'Mostra todos os comandos de RPG',
category: 'menu',
aliases: ['rpg', 'rpgmenu', 'aventura'],
async execute(ctx) { return ctx.menu('rpg') }
}
