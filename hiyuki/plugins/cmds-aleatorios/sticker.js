module.exports = {
name: 'sticker',
description: 'Cria figurinha a partir de imagem ou vídeo',
category: 'cmds-aleatorios',
aliases: ['s','fig','sticker'],
async execute(ctx) { return ctx.media('sticker') }
}
