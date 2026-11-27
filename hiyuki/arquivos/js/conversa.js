const { randomInt } = require('node:crypto')

function responder(texto) {
  const t = texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  if (/\b(oi|ola|salve|opa)\b/.test(t)) return 'Salve. Veio com fofoca ou só testar se eu tô vivo?'
  if (/\b(valeu|obrigad[oa])\b/.test(t)) return 'De nada. A próxima consultoria custa duas coxinhas.'
  if (/k{3,}|hahaha/.test(t)) return 'Ri mesmo. Pelo menos alguém tá aproveitando o espetáculo.'
  if (/que horas|hora agora/.test(t)) return new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})+' em Brasília. Teu relógio pediu demissão?'
  const frases = ['Tu ensaiou isso ou saiu no improviso?', 'Meu parceiro, até o grupo ficou digitando e desistiu.', 'Conta o resto. Agora eu já perdi a paz mesmo.']
  return frases[randomInt(frases.length)]
}
module.exports = { responder }
