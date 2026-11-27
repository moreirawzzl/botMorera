import moderacao from './hiyuki/arquivos/js/moderacao.js'
import rankinggrupo from './hiyuki/arquivos/js/rankinggrupo.js'
import { rememberName, rememberContacts, temPermissaoDono } from './extras.mjs'
import agenda from './hiyuki/arquivos/js/agenda.js'
import * as Baileys from '@whiskeysockets/baileys'
import { createHash, randomUUID } from 'node:crypto'
import qrcode from 'qrcode-terminal'
import { boasVindas, comandoBase, nomeBot, podeUsar, prefixo } from './paneleiro.mjs'
import pino from 'pino'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'node:url'
import {
  aplicarPatchEncode, montarCampo134, verificarFfmpeg,
  temAudio, duracao, gerarAudio, gerarFigurinha
} from './lib.mjs'

const makeWASocket = Baileys.default || Baileys.makeWASocket
const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = Baileys

// ================== CONFIGURACAO ==================
const DURACAO_MAXIMA = 10               // segundos de video/audio aproveitados
const LIMITE_FIGURINHA = 900 * 1024     // bytes (o WhatsApp aceita ate ~1 MB)
// ==================================================

const logger = pino({ level: 'silent' })
const pastaAuth = fileURLToPath(new URL('./auth/', import.meta.url))
fs.mkdirSync(pastaAuth, { recursive: true })
const seletorSessao = path.join(pastaAuth, 'sessao-ativa.txt')
const nomeSalvo = fs.existsSync(seletorSessao) ? fs.readFileSync(seletorSessao, 'utf8').trim() : ''
const novoPareamento = process.argv.includes('--parear')
const pastaSessao = novoPareamento
  ? fs.mkdtempSync(path.join(pastaAuth, 'aparelho-'))
  : /^aparelho-[a-z0-9]+$/i.test(nomeSalvo) ? path.join(pastaAuth, nomeSalvo) : pastaAuth
const arquivo = path.join(pastaAuth, 'pedidos-figaudio.json')
const registro = fs.existsSync(arquivo)
  ? JSON.parse(fs.readFileSync(arquivo, 'utf8'))
  : { desde: Math.floor(Date.now() / 1000), pedidos: {} }
const donoPrincipal = JSON.parse(fs.readFileSync(new URL('./hiyuki/database/config.json',import.meta.url),'utf8').replace(/^\uFEFF/, '')).NumeroDoDono + '@s.whatsapp.net'
const controleGrupos = path.join(pastaAuth,'controle-respostas')
let ativo, papel
function arquivoControleGrupo(jid) {
  const id = createHash('sha256').update(jid).digest('hex')
  return path.join(controleGrupos,id+'.json')
}
function sessaoDoGrupo(jid) {
  if (!jid?.endsWith('@g.us')) return 'moreira'
  try {
    const nome = JSON.parse(fs.readFileSync(arquivoControleGrupo(jid),'utf8')).selecionado
    return ['moreira','andrade','ambos'].includes(nome) ? nome : 'moreira'
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Controle de sessão:',e.message)
    return 'moreira'
  }
}
const responde = jid => Boolean(papel) && (!jid?.endsWith('@g.us') || sessaoDoGrupo(jid) === 'ambos' || papel === sessaoDoGrupo(jid))
function selecionar(jid,nome) {
  fs.mkdirSync(controleGrupos,{recursive:true})
  const file = arquivoControleGrupo(jid)
  const tmp = file+'.'+process.pid+'.'+randomUUID()+'.tmp'
  fs.writeFileSync(tmp,JSON.stringify({selecionado:nome}))
  fs.renameSync(tmp,file)
}
setInterval(() => agenda.entregar(ativo).catch(e => console.log("Agenda:",e.message)), 15000).unref()
let fila = Promise.resolve()
let ffmpegDisponivel = await verificarFfmpeg()

function salvar(dados = registro) {
  fs.writeFileSync(arquivo + '.tmp', JSON.stringify(dados))
  fs.renameSync(arquivo + '.tmp', arquivo)
}

function limparPedidos() {
  const quantidade = Object.keys(registro.pedidos).length
  const desde = Math.floor(Date.now() / 1000)
  const novo = { desde, limpoEm: desde, pedidos: {} }
  salvar(novo)
  Object.assign(registro, novo)
  return quantidade
}

aplicarPatchEncode()

function souEu(sock, jid) {
  return Boolean(jid) && [sock.user?.id, sock.user?.lid].some(id =>
    id && Baileys.jidNormalizedUser(id) === Baileys.jidNormalizedUser(jid))
}

async function responderTexto(sock, jid, texto, solicitacao) {
  await sock.sendMessage(jid, { text: texto }, solicitacao ? { quoted: solicitacao } : {})
}

async function processarVideo(sock, m, jid, vigente, solicitacao) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'figsom-'))
  try {
    console.log('Baixando video...')
    const buf = await downloadMediaMessage(m, 'buffer', {}, {
      logger,
      reuploadRequest: sock.updateMediaMessage
    })
    const entrada = path.join(pasta, 'entrada.mp4')
    fs.writeFileSync(entrada, buf)

    if (!(await temAudio(entrada))) {
      if (vigente()) await responderTexto(sock, jid, 'Esse video nao tem audio. Mande um video com som para eu fazer a figurinha com som.', solicitacao)
      return
    }

    const total = await duracao(entrada)
    const segundos = Math.max(1, Math.min(DURACAO_MAXIMA, total || DURACAO_MAXIMA))

    console.log(`Convertendo (${segundos.toFixed(1)}s)...`)
    const oggPath = path.join(pasta, 'audio.ogg')
    const webpPath = path.join(pasta, 'figurinha.webp')
    await gerarAudio(entrada, oggPath, segundos)
    const webp = await gerarFigurinha(entrada, webpPath, segundos, LIMITE_FIGURINHA)
    const ogg = fs.readFileSync(oggPath)
    const segundosAudio = Math.max(1, Math.round(await duracao(oggPath)))

    console.log('Enviando arquivos para o WhatsApp...')
    const upload = sock.waUploadToServer
    const fig = await Baileys.prepareWAMessageMedia({ sticker: webp }, { upload, logger })
    const aud = await Baileys.prepareWAMessageMedia(
      { audio: ogg, mimetype: 'audio/ogg; codecs=opus', seconds: segundosAudio },
      { upload, logger }
    )

    const sticker = fig.stickerMessage
    sticker.isAnimated = true
    sticker.width = 512
    sticker.height = 512

    if (solicitacao?.key?.id && solicitacao.message) {
      const citado = Baileys.normalizeMessageContent(solicitacao.message) || solicitacao.message
      const participante = solicitacao.key.fromMe
        ? Baileys.jidNormalizedUser(sock.user.id)
        : solicitacao.key.participant || solicitacao.key.remoteJid
      sticker.contextInfo = {
        ...sticker.contextInfo,
        stanzaId: solicitacao.key.id,
        participant: participante,
        remoteJid: jid,
        quotedMessage: citado
      }
    }
    const raw = montarCampo134(sticker, aud.audioMessage)
    const gerarId = Baileys.generateMessageIDV2 || Baileys.generateMessageID
    if (!vigente()) return
    await sock.relayMessage(jid, { __raw134: raw }, { messageId: gerarId(sock.user.id) })
    console.log('Figurinha com som enviada.')
    return true
  } catch (e) {
    if (!vigente()) return
    if (ativo !== sock) throw e
    console.log('ERRO:', e)
    await responderTexto(sock, jid, 'Nao consegui fazer a figurinha: ' + (e.message || e), solicitacao)
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true })
  }
}

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(pastaSessao)
  const sock = makeWASocket({ auth: state, logger })
  let conectadoEm
  const sendOriginal = sock.sendMessage.bind(sock)
  const relayOriginal = sock.relayMessage.bind(sock)
  // Keep both connections alive, but allow replies only from the session assigned to each group.
  sock.sendMessage = (...args) => responde(args[0]) ? sendOriginal(...args) : Promise.reject(Error('Sessao em silencio neste grupo'))
  sock.relayMessage = (...args) => responde(args[0]) ? relayOriginal(...args) : Promise.reject(Error('Sessao em silencio neste grupo'))
  salvar()

  function enfileirar(chave) {
    fila = fila.then(async () => {
      const pedido = registro.pedidos[chave]
      if (!pedido || ativo !== sock || !responde(pedido.jid)) return
      const vigente = () => responde(pedido.jid) && ativo === sock && registro.pedidos[chave] === pedido
      const solicitacao = pedido.solicitacao ? Baileys.proto.WebMessageInfo.decode(Buffer.from(pedido.solicitacao, 'base64')) : undefined
      if (pedido.video) {
        if (!ffmpegDisponivel) {
          ffmpegDisponivel = await verificarFfmpeg()
          if (!vigente()) return
          if (!ffmpegDisponivel) {
            if (!pedido.avisouFfmpeg) {
              await responderTexto(sock, pedido.jid, 'Recebi seu '+prefixo(pedido.jid)+'figaudio. O conversor de vídeo está indisponível. Guardei seu pedido para quando o bot reiniciar.', solicitacao)
              pedido.avisouFfmpeg = true
              salvar()
            }
            return
          }
        }
        const video = Baileys.proto.WebMessageInfo.decode(Buffer.from(pedido.video, 'base64'))
        const enviada = await processarVideo(sock, video, pedido.jid, vigente, solicitacao)
        if (!vigente()) return
        if (enviada && pedido.offline) {
          delete pedido.video
          pedido.aviso = true
          salvar()
        }
      } else if (!pedido.aviso) {
        await responderTexto(sock, pedido.jid, 'Responda a um vídeo com '+prefixo(pedido.jid)+'figaudio ou use esse comando na legenda.', solicitacao)
      }
      if (pedido.aviso) {
        await responderTexto(sock, pedido.jid, 'Desculpa, estava off, toma sua figurinha!', solicitacao)
      }
      if (!vigente()) return
      registro.pedidos[chave] = null
      salvar()
    }).catch(e => console.log('Pedido pendente:', e.message))
  }

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('contacts.upsert', rememberContacts)
  sock.ev.on('contacts.update', rememberContacts)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true })
    if (connection === 'open') {
      if (novoPareamento) {
        fs.writeFileSync(seletorSessao + '.tmp', path.basename(pastaSessao))
        fs.renameSync(seletorSessao + '.tmp', seletorSessao)
      }
      conectadoEm = Math.floor(Date.now() / 1000)
      ativo = sock
      const id = Baileys.jidNormalizedUser(sock.user.id)
      papel = id === donoPrincipal ? 'moreira' : 'andrade'
      console.log('Sessao:',papel,'| roteamento por grupo ativado')
      for (const [chave, pedido] of Object.entries(registro.pedidos)) {
        if (pedido) enfileirar(chave)
      }
      console.log(nomeBot + ' conectado. Use ' + prefixo('') + 'menu ou '+prefixo('')+'figaudio.')
    }
    if (connection === 'close') {
      if (ativo === sock) ativo = undefined
      const code = lastDisconnect?.error?.output?.statusCode
      console.log('Conexao encerrada. Codigo:', code ?? 'desconhecido')
      if (code === DisconnectReason.connectionReplaced) {
        console.log('Outra conexao assumiu esta sessao. Feche a outra instancia antes de reiniciar.')
      } else if (code === DisconnectReason.loggedOut) {
        console.log('Sessao encerrada no celular. Inicie com --parear para conectar novamente.')
      } else {
        iniciar()
      }
    }
  })

  const recentes = new Set()
  async function receber(messages, historico, aoVivo) {
    for (const m of messages) {
      if (!m.message || !m.key?.id) continue
      rememberName(m)
      const horario = Number(m.messageTimestamp)
      if (historico && !(horario >= registro.desde)) continue

      const conteudo = Baileys.normalizeMessageContent
        ? Baileys.normalizeMessageContent(m.message)
        : m.message
      const texto = conteudo?.videoMessage?.caption ?? conteudo?.imageMessage?.caption ?? conteudo?.extendedTextMessage?.text ?? conteudo?.conversation
      const comando = (texto || '').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/gu, '').trim()
      const jid = m.key.remoteJid
      const troca = /^\.(andrade|moreira|ambos)$/i.exec(comando)
      if(troca){
        if(!aoVivo || historico || recentes.has(jid+'/'+m.key.id))continue
        recentes.add(jid+'/'+m.key.id)
        if(recentes.size>4096)recentes.delete(recentes.values().next().value)
        const ids=m.key.fromMe?[sock.user.id,sock.user.lid]:jid?.endsWith('@g.us')?[m.key.participant,m.key.participantAlt]:[jid,m.key.remoteJidAlt]
        const sender=ids.filter(Boolean).map(Baileys.jidNormalizedUser).find(x=>x.endsWith('@s.whatsapp.net'))||ids.filter(Boolean).map(Baileys.jidNormalizedUser)[0]||''
        if(!m.key.fromMe && !(await temPermissaoDono(sender,donoPrincipal,sock,m.key)))continue
        const nome=troca[1].toLowerCase()
        if(!jid?.endsWith('@g.us')){
          if(papel==='moreira')await sock.sendMessage(jid,{text:'Use .andrade, .moreira ou .ambos dentro do grupo que deseja configurar.'},{quoted:m})
          continue
        }
        selecionar(jid,nome)
        console.log('Sessao selecionada:',nome,'| grupo:',jid,'| local:',papel)
        if(responde(jid)){
          await sock.sendMessage(jid,{text:nome==='ambos'?'✅ Modo ambos ativado. Sessão '+papel.toUpperCase()+' respondendo neste grupo.':'✅ Sessão '+nome.toUpperCase()+' selecionada neste grupo.'},{quoted:m})
          for(const [chave,pedido] of Object.entries(registro.pedidos))if(pedido&&pedido.jid===jid)enfileirar(chave)
        }
        continue
      }
      if(!responde(jid))continue
      if (aoVivo && jid?.endsWith('@g.us')) {
        const removida = await moderacao.inspect(sock,m,comando).catch(e=>{console.error('Moderacao:',e.message);return false})
        if (removida) continue
        rankinggrupo.count(m)
      }
      if (!comando) continue
      const emGrupo = jid?.endsWith('@g.us')
      if (!emGrupo && !jid?.endsWith('@s.whatsapp.net') && !jid?.endsWith('@lid')) continue
      const chave = jid + '/' + m.key.id
      const prefix = prefixo(jid)
      const fig = comando.startsWith(prefix) && /^\s*fig[aá]udio(?:\s|$)/iu.test(comando.slice(prefix.length))
      if (!fig) {
        const ehComando = comando.startsWith(prefix)
        if (aoVivo && ehComando && !recentes.has(chave)) {
          recentes.add(chave)
          if (recentes.size > 4096) recentes.delete(recentes.values().next().value)
          await comandoBase(sock, m, comando, limparPedidos).catch(e => console.log('Falha no comando:', e.message))
        }
        continue
      }
      if (!(await podeUsar(sock, m.key))) continue
      if (registro.limpoEm && !(horario > registro.limpoEm)) continue
      if (Object.hasOwn(registro.pedidos, chave)) continue
      console.log('Comando '+prefix+'figaudio recebido.')

      let video = m
      if (!conteudo.videoMessage) {
        const contexto = conteudo.extendedTextMessage?.contextInfo
        const citado = Baileys.normalizeMessageContent(contexto?.quotedMessage)
        if (!citado?.videoMessage || !contexto.stanzaId) {
          video = undefined
        } else {
          const fromMe = souEu(sock, contexto.participant || jid)
          const key = { remoteJid: jid, fromMe, id: contexto.stanzaId }
          if (emGrupo) key.participant = contexto.participant
          video = { key, message: citado }
        }
      }
      registro.pedidos[chave] = {
        jid,
        offline: !conectadoEm || horario < conectadoEm,
        solicitacao: Buffer.from(Baileys.proto.WebMessageInfo.encode(m).finish()).toString('base64'),
        video: video && Buffer.from(Baileys.proto.WebMessageInfo.encode(video).finish()).toString('base64')
      }
      salvar()
      if (ativo === sock) enfileirar(chave)
    }
  }
  sock.ev.on('messages.upsert', ({ messages, type }) => receber(messages, false, type === 'notify').catch(e => console.log(e.message)))
  sock.ev.on('messaging-history.set', ({ messages, contacts }) => { rememberContacts(contacts); receber(messages, true, false).catch(e => console.log(e.message)) })
  sock.ev.on('group-participants.update', evento => responde(evento.id) && boasVindas(sock, evento).catch(e => console.log(e.message)))
}

if (!ffmpegDisponivel) {
  console.log('FFmpeg ou FFprobe indisponivel. O bot vai receber os pedidos. Para converter, confira a instalacao de Gyan.FFmpeg e reinicie o bot.')
}

console.log('Arquivo do bot:', fileURLToPath(import.meta.url))
if (process.argv.includes('--limpar-pedidos')) {
  console.log('Pedidos removidos:', limparPedidos())
} else {
  iniciar()
}
