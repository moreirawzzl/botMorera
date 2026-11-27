const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const arquivo = path.join(__dirname, '../../database/agenda.json')
const ler = () => fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : {}
function salvar(agenda) {
  fs.writeFileSync(arquivo + '.tmp', JSON.stringify(agenda))
  fs.renameSync(arquivo + '.tmp', arquivo)
}
function horario(data, hora) {
  const [dia, mes, ano] = data.split('/')
  const iso = ano + '-' + mes + '-' + dia + 'T' + hora
  const instante = Date.parse(iso + ':00-03:00')
  return Number.isFinite(instante) && new Date(instante - 10800000).toISOString().slice(0,16) === iso ? instante : NaN
}
async function agendar({from, info, args, prefix, reply}) {
  const [data='', hora='', ...texto] = args
  const instante = horario(data,hora)
  if (!texto.length || !(instante > Date.now())) return reply('Use '+prefix+'agendar DD/MM/AAAA HH:MM mensagem, com um horário futuro de Brasília.')
  const id = createHash('sha256').update(from+'/'+info.key.id).digest('hex').slice(0,32).toUpperCase()
  const agenda = ler()
  if (!agenda[id]) {
    agenda[id] = {from, instante, texto:texto.join(' ')}
    salvar(agenda)
  }
  return reply('Agendado nesta conversa para '+data+' às '+hora+' (Brasília).')
}
let ocupado = false
async function entregar(sock) {
  if (!sock || ocupado) return
  ocupado = true
  try {
    for (const [id, item] of Object.entries(ler())) {
      if (item.instante > Date.now()) continue
      try { await sock.sendMessage(item.from,{text:item.texto},{messageId:id}) }
      catch { continue }
      const atual = ler()
      delete atual[id]
      salvar(atual)
    }
  } finally { ocupado = false }
}
module.exports = { agendar, entregar, horario }
