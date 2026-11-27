const { executar } = require('../../arquivos/js/velha.js')

module.exports = {
  name: 'velha',
  category: 'cmds-aleatorios',
  description: 'Desafia outro jogador para uma partida de jogo da velha',
  execute: ctx => executar(ctx, 'velha')
}
