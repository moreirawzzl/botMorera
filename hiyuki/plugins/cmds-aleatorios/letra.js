function searchLink(domain, query) {
  const url = new URL('https://www.google.com/search')
  url.searchParams.set('q', 'site:' + domain + ' ' + query)
  return url.href
}

module.exports = {
  name: 'letra',
  description: 'Encontra a página da letra no Letras.mus.br ou no Vagalume. Ex.: .letra nome da música',
  execute(c) {
    const query = (c.q || '').trim()
    if (!query) return c.reply('Use ' + c.prefix + 'letra nome da música.')
    if (query.length > 180) return c.reply('Informe um nome de música com até 180 caracteres.')

    const letras = searchLink('letras.mus.br', query)
    const vagalume = searchLink('vagalume.com.br', query)
    return c.reply(
      '🔎 *BUSCA DE LETRA*\n\n' +
      '🎵 Letras.mus.br:\n' + letras + '\n\n' +
      '✨ Vagalume:\n' + vagalume + '\n\n' +
      '_Abra o resultado correspondente à música; a letra fica na página original._'
    )
  }
}
