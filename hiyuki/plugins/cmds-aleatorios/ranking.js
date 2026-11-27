const { executar } = require('../../arquivos/js/velha.js')

module.exports = {
  name: 'ranking',
  category: 'cmds-aleatorios',
  description: 'Mostra os dez maiores pontuadores do jogo da velha',
  execute: ctx => executar(ctx, 'ranking')
}
