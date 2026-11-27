const { members, match, quotedMentions, tag } = require('../../arquivos/js/resenhaMembros')
const scores = require('../../arquivos/js/rankingCorno')

module.exports = {
  name: 'addpontocorno',
  aliases: ['addcorno'],
  description: 'Adiciona pontos de corno a uma pessoa marcada. Ex.: .addcorno @pessoa 10',
  async execute(c) {
    if (!c.isGroup) return c.reply('O comando .addcorno só pode ser usado em grupos.')
    if (!c.isAdm) return c.reply('Somente administradores do grupo podem usar este comando.')

    const marked = await quotedMentions(c)
    if (marked.length !== 1) return c.reply('Marque exatamente uma pessoa. Ex.: .addcorno @pessoa 10')

    const amounts = c.args.filter(argument => /^\d+$/.test(argument))
    if (amounts.length !== 1) return c.reply('Informe uma quantidade. Ex.: .addcorno @pessoa 10')
    const amount = Number(amounts[0])
    if (!Number.isSafeInteger(amount) || amount < 1) return c.reply('A quantidade precisa ser um número inteiro positivo.')

    const groupMembers = await members(c)
    const person = await match(c, groupMembers, marked[0])
    if (!person) return c.reply('Marque um participante atual deste grupo.')

    const result = scores.add(c.from, [person.id], amount)
    if (!Array.isArray(result)) return c.reply(result.error)
    const updated = result[0]
    const points = updated.score.toLocaleString('pt-BR')
    const added = amount.toLocaleString('pt-BR')
    return c.columbina.sendMessage(c.from, {
      text: '✅ ' + tag(person.id) + ' recebeu *' + added + '* ponto' + (amount === 1 ? '' : 's') +
        ' de corno. Total: *' + points + '*.',
      mentions: [person.id]
    }, { quoted: c.info })
  }
}
