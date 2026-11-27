module.exports = {
name: 'menupremium',
description: 'Mostra todos os comandos premium',
category: 'menu',
aliases: ['premium', 'vipmenu', 'vip'],
async execute(ctx) { return ctx.menu('premium') }
}
