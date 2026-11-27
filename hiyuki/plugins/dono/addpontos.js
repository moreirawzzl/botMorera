const { executar } = require('../../arquivos/js/velha.js')

module.exports = {
  name: 'addpontos',
  category: 'dono',
  description: 'Adiciona pontos ao ranking do jogo da velha',
  execute: ctx => executar(ctx, 'addpontos')
}
