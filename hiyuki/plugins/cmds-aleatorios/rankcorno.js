const { members, tag } = require('../../arquivos/js/resenhaMembros')
const scores = require('../../arquivos/js/rankingCorno')

module.exports = {
  name: 'rankcorno',
  description: 'Mostra o ranking de pontos de corno do grupo, do maior para o menor.',
  async execute(c) {
    if (!c.isGroup) return c.reply('O comando .rankcorno só pode ser usado em grupos.')

    const groupMembers = await members(c)
    if (!groupMembers.length) return c.reply('Não encontrei participantes neste grupo.')

    const ranked = scores.ranking(c.from, groupMembers.map(person => person.id))
    if (!ranked.length) return c.reply('Ainda não há pontos. Use .corno @pessoa para iniciar o ranking.')
    const top = ranked.slice(0, 10)
    const lowest = ranked[ranked.length - 1]
    const medals = ['🥇 OURO', '🥈 PRATA', '🥉 BRONZE']
    const lines = top.map((person, index) =>
      (index < 3 ? medals[index] : (index + 1) + 'º') + ' — ' + tag(person.id) + ' • ' +
      person.score.toLocaleString('pt-BR') + ' ponto' + (person.score === 1 ? '' : 's')
    )
    const mentions = [...new Set([...top.map(person => person.id), lowest.id])]
    const text = '🏆 *RANKING DE CORNOS*\n\n' + lines.join('\n') +
      '\n\n📉 Menos pontos: ' + tag(lowest.id) + ' • ' +
      lowest.score.toLocaleString('pt-BR') + ' ponto' + (lowest.score === 1 ? '' : 's')

    return c.columbina.sendMessage(c.from, { text, mentions }, { quoted: c.info })
  }
}
