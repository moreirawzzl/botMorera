const { members, match, quotedMentions, tag } = require('../../arquivos/js/resenhaMembros')
const scores = require('../../arquivos/js/rankingCorno')

module.exports = {
  name: 'corno',
  description: 'Marca uma ou mais pessoas do grupo e soma 1 ponto para cada uma. Ex.: .corno @pessoa',
  async execute(c) {
    if (!c.isGroup) return c.reply('O comando .corno só pode ser usado em grupos.')

    const marked = await quotedMentions(c)
    if (!marked.length) return c.reply('Marque alguém do grupo. Ex.: .corno @pessoa')

    const groupMembers = await members(c)
    const matched = await Promise.all(marked.map(id => match(c, groupMembers, id)))
    if (matched.some(person => !person)) return c.reply('Marque participantes atuais deste grupo.')

    const people = [...new Map(matched.map(person => [person.id, person])).values()]
    const updated = scores.add(c.from, people.map(person => person.id))
    if (!Array.isArray(updated)) return c.reply(updated.error)
    const text = '🐂 *PONTOS DE CORNO*\n\n' + updated
      .map(person => tag(person.id) + ' ganhou 1 ponto • total: *' + person.score.toLocaleString('pt-BR') + '*')
      .join('\n')

    return c.columbina.sendMessage(c.from, {
      text,
      mentions: updated.map(person => person.id)
    }, { quoted: c.info })
  }
}
