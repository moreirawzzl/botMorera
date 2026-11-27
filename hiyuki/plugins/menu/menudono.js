module.exports = {
name: 'menudono',
description: 'Mostra todos os comandos do dono',
category: 'menu',
aliases: ['dono', 'ownermenu', 'donomenu'],
async execute(ctx) { return ctx.menu('dono') }
}
