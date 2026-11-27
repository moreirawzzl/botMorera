const { responder } = require('../../arquivos/js/conversa.js')

module.exports = {
  name: 'ia',
  category: 'inteligencia-ia',
  description: 'Converse com o Moreira zoeiro.',
  async execute({ q, reply }) {
    return reply(q ? await responder(q) : 'Chamou e esqueceu a pergunta? Desembucha.')
  }
}
