module.exports = {
name: 'gerarlink',
description: 'Gera link de imagem ou vídeo usando Catbox',
category: 'cmds-aleatorios',
aliases: ['catbox', 'upload'],
async execute(ctx) { return ctx.media('gerarlink') }
}
