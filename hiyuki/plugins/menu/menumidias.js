module.exports = {
name: 'menumidias',
description: 'Mostra todos os comandos de mídias',
category: 'menu',
aliases: ['midiamenu', 'medias', 'midia'],
async execute(ctx) { return ctx.menu('midias') }
}
