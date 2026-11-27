module.exports = {
  name: 'limparpedidos',
  description: 'Limpa a fila e o registro de pedidos de figurinha com som',
  category: 'dono',
  async execute({ limparPedidos, reply }) {
    const total = limparPedidos()
    await reply('Fila de figurinhas limpa. Pedidos removidos: ' + total + '.')
  }
}
