const fs = require('node:fs')
const path = require('node:path')
const arquivo = path.join(__dirname, '../../database/jogo-da-velha.json')
const linhas = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const nomes = id => '@' + id.split('@')[0]
const normalizar = id => id?.replace(/:\d+(?=@)/, '')

async function identidades(ctx) {
  const { key } = ctx.info
  const sock = ctx.columbina
  const origem = key.fromMe ? [sock.user.id, sock.user.lid] : [key.participant, key.participantAlt]
  const ids = new Set([ctx.sender, ...origem].filter(Boolean).map(normalizar))
  if (ctx.isGroup && ![...ids].some(id => id.endsWith('@lid'))) {
    const pn = [...ids].find(id => id.endsWith('@s.whatsapp.net'))
    if (pn) {
      const lid = await sock.signalRepository?.lidMapping?.getLIDForPN(pn)
      if (lid) ids.add(normalizar(lid))
    }
  }
  return ids
}
function tabuleiro(jogo) {
  const casas = jogo.casas.map((v,i) => v === 'X' ? String.fromCodePoint(10060) : v === 'O' ? String.fromCodePoint(11093) : String.fromCodePoint(11036))
  return [0,3,6].map(i => casas.slice(i,i+3).join(' ')).join('\n')
}
async function executar(ctx, acao, destino = arquivo) {
  const {from, prefix, args, info, columbina, reply} = ctx
  let sender = normalizar(ctx.sender)
  const op = (args[0] || '').toLowerCase()
  let alvo = normalizar(info.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0])
  if (!alvo && ['addpontos','tirarpontos','pontos'].includes(acao)) alvo = normalizar(info.message?.extendedTextMessage?.contextInfo?.participant)
  if (acao === 'velha' && (op === 'aceitar' || op === 'cancelar' || /^[1-9]$/.test(op))) alvo = undefined
  if (alvo?.endsWith('@lid')) alvo = await columbina.signalRepository?.lidMapping?.getPNForLID(alvo) || alvo
  alvo = normalizar(alvo)
  const ids = acao === 'velha' ? await identidades(ctx) : new Set([sender])
  const ler = () => fs.existsSync(destino) ? JSON.parse(fs.readFileSync(destino,'utf8')) : { jogos:{}, pontos:{}, feitos:{} }
  const anterior = acao === 'velha' && !alvo && ler().jogos[from]
  if (anterior && !anterior.jogadores.some(id => ids.has(normalizar(id))) && columbina.groupMetadata) {
    const grupo = await columbina.groupMetadata(from)
    for (const membro of grupo.participants) {
      const enderecos = [membro.id,membro.lid,membro.phoneNumber].filter(Boolean).map(normalizar)
      if (enderecos.some(id => ids.has(id))) enderecos.forEach(id => ids.add(id))
    }
    // O WhatsApp também pode ter atualizado o número de um contato antigo.
    for (const id of anterior.jogadores) {
      if ([...ids].some(alias => normalizar(id) === alias)) break
      if (!id.endsWith('@s.whatsapp.net') || !columbina.onWhatsApp) continue
      const [contato] = await columbina.onWhatsApp(id)
      if (contato?.exists && ids.has(normalizar(contato.jid))) { ids.add(normalizar(id)); break }
    }
  }
  const estado = ler()
  const jogo = estado.jogos[from]
  if (jogo) sender = jogo.jogadores.find(id => ids.has(normalizar(id))) || sender
  const chave = from + '/' + info.key.id
  const enviar = (text, mentions = []) => columbina.sendMessage(from,{text,mentions},{quoted:info})
  function salvar() {
    estado.feitos[chave] = true
    fs.writeFileSync(destino+'.tmp',JSON.stringify(estado))
    fs.renameSync(destino+'.tmp',destino)
  }
  if (acao === 'ranking') {
    const lista = Object.entries(estado.pontos).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,10)
    if (!lista.length) return reply('O ranking ainda está vazio.')
    return enviar('🏆 Jogo da velha · Top 10\n'+lista.map(([id,p],i)=>(i+1)+'. '+nomes(id)+' — '+p+' pts').join('\n'), lista.map(([id])=>id))
  }
  if (acao === 'pontos') {
    alvo = alvo || sender
    return enviar(nomes(alvo)+' tem '+(estado.pontos[alvo] || 0)+' pontos.',[alvo])
  }
  if (estado.feitos[chave]) return
  if (acao === 'addpontos' || acao === 'tirarpontos') {
    if (!ctx.isDono) return reply('Só o dono pode alterar pontos.')
    const valor = args.filter(a=>!a.startsWith('@'))
    if (!alvo && args.length === 1) alvo = sender
    const n = Number(valor[0])
    if (!alvo || valor.length !== 1 || !/^\d+$/.test(valor[0]) || n < 1 || !Number.isSafeInteger(n) || (acao === 'addpontos' && !Number.isSafeInteger((estado.pontos[alvo] || 0)+n))) return reply('Use '+prefix+acao+' 10 para você ou '+prefix+acao+' @jogador 10 para outro jogador.')
    const antes = estado.pontos[alvo] || 0
    estado.pontos[alvo] = acao === 'tirarpontos' ? Math.max(0,antes-n) : antes+n
    salvar()
    return enviar(nomes(alvo)+(acao === 'tirarpontos' ? ' perdeu '+(antes-estado.pontos[alvo]) : ' recebeu '+n)+' pontos. Total: '+estado.pontos[alvo]+'.',[alvo])
  }
  if (!op && !alvo) {
    if (jogo) return enviar(tabuleiro(jogo)+'\n'+(jogo.aceito?'Vez de '+nomes(jogo.jogadores[jogo.turno]):nomes(jogo.jogadores[1])+', envie '+prefix+'velha aceitar.'),jogo.jogadores)
    return reply('Desafie alguém com '+prefix+'velha @jogador. Vitória vale 3 pontos e empate vale 1 para cada.')
  }
  if (alvo) {
    if (!ctx.isGroup) return reply('Faça o desafio em um grupo.')
    if (ids.has(alvo) || [columbina.user.id,columbina.user.lid].map(normalizar).includes(alvo)) return reply('Escolha outro jogador.')
    if (jogo) return reply('Já existe uma partida ou convite aqui. Use '+prefix+'velha para consultar.')
    estado.jogos[from] = {jogadores:[sender,alvo],casas:Array(9).fill(null),turno:0,aceito:false}
    salvar()
    return enviar(nomes(alvo)+', '+nomes(sender)+' te desafiou! Use '+prefix+'velha aceitar ou '+prefix+'velha cancelar.',[alvo,sender])
  }
  if (!jogo) return reply('Comece com '+prefix+'velha @jogador.')
  const jogadores = jogo.jogadores
  if (!jogadores.includes(sender) && !(op === 'cancelar' && ctx.isDono)) return reply('Essa partida é de outros jogadores.')
  if (op === 'cancelar') {
    delete estado.jogos[from]
    salvar()
    return reply('Partida cancelada sem pontos.')
  }
  if (!jogo.aceito) {
    if (op !== 'aceitar' || sender !== jogadores[1]) return reply('Aguardando o jogador desafiado enviar '+prefix+'velha aceitar.')
    jogo.aceito = true
    salvar()
    return enviar(tabuleiro(jogo)+'\n'+nomes(jogadores[0])+' joga com X. Escolha uma casa, por exemplo '+prefix+'velha 5.',jogadores)
  }
  if (!/^[1-9]$/.test(op)) return reply('Escolha uma casa de 1 a 9. Exemplo: '+prefix+'velha 5.')
  if (sender !== jogadores[jogo.turno]) return reply('Aguarde sua vez.')
  const casa = Number(op)-1
  if (jogo.casas[casa]) return reply('Essa casa já está ocupada.')
  const simbolo = ['X','O'][jogo.turno]
  jogo.casas[casa] = simbolo
  const venceu = linhas.some(l=>l.every(i=>jogo.casas[i]===simbolo))
  let resultado
  if (venceu || jogo.casas.every(Boolean)) {
    for (const id of jogadores) estado.pontos[id] = (estado.pontos[id] || 0)+(venceu ? (id===sender ? 3 : 0) : 1)
    resultado = venceu ? nomes(sender)+' venceu! +3 pontos.' : 'Empate! +1 ponto para cada.'
    delete estado.jogos[from]
  } else {
    jogo.turno = 1-jogo.turno
    resultado = 'Vez de '+nomes(jogadores[jogo.turno])+'.'
  }
  salvar()
  return enviar(tabuleiro(jogo)+'\n'+resultado,jogadores)
}
module.exports = { executar }
