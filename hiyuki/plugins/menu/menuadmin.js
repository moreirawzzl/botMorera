module.exports = {
name: 'menuadmin',
description: 'Mostra todos os comandos de administração',
category: 'menu',
aliases: ['adm', 'admmenu', 'menuadm', 'admin'],
async execute(ctx) { return ctx.menu('admin') }
}
