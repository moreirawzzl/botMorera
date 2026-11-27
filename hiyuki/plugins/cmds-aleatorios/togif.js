module.exports = {
name: 'togif',
description: 'Converte figurinha animada em GIF',
category: 'cmds-aleatorios',
aliases: ['tovideo', 'gif'],

async execute(ctx) { return ctx.media('togif') }
}
