import { registerExtras, muted, temPermissaoDono, quotedAuthor } from './extras.mjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { downloadContentFromMessage, jidNormalizedUser } from '@whiskeysockets/baileys'
import Manager from './hiyuki/comandos.js'
import MenuSystem from './hiyuki/arquivos/js/menuSystem.js'
import { ffmpeg, gerarFigurinha } from './lib.mjs'
import { cropStickerText } from './sticker-text.mjs'

const configFile = new URL('./hiyuki/database/config.json', import.meta.url)
const jsonDir = new URL('./hiyuki/arquivos/json/', import.meta.url)
fs.mkdirSync(jsonDir, { recursive: true })
const config = () => JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/^\uFEFF/, ''))
const { NumeroDoDono, NomeDoBot } = config()
export const nomeBot = NomeDoBot
const donoJid = NumeroDoDono + '@s.whatsapp.net'
const manager = new Manager()
manager.carregarPlugins()
registerExtras(manager)
manager.commands.set('figaudio', { name: 'figaudio', description: 'Cria figurinha com som', category: 'cmds-aleatorios' })

export function prefixo(jid) {
  return manager.ObterPrefixoGrupo(jid) || config().prefix
}
async function remetente(sock, key) {
  const grupo = key.remoteJid.endsWith('@g.us')
  const ids = key.fromMe ? [sock.user.id, sock.user.lid] : grupo
    ? [key.participant, key.participantAlt] : [key.remoteJid, key.remoteJidAlt]
  const jids = ids.filter(Boolean).map(jidNormalizedUser)
  const phone = jids.find(id => id.endsWith('@s.whatsapp.net'))
  if (phone) return phone
  if (jids[0]?.endsWith('@lid')) return await sock.signalRepository?.lidMapping?.getPNForLID(jids[0]) || jids[0]
  return jids[0] || ''
}
export async function podeUsar(sock, key) {
  const sender = await remetente(sock, key)
  return temPermissaoDono(sender, donoJid) || (global.botLigado !== false && !(await muted(sock,key,sender)))
}
async function media(cmd, ctx) {
  const { info, reply, columbina, from } = ctx
  const msg = info.message.extendedTextMessage?.contextInfo?.quotedMessage || info.message
  const tipo = cmd === 'togif' || cmd === 'toimg' ? 'sticker' : msg.imageMessage ? 'image' : 'video'
  const item = msg[tipo + 'Message']
  if (!item || item.viewOnce) return reply(tipo === 'sticker' ? 'Responda a uma figurinha.' : 'Envie ou marque uma foto ou vídeo comum.')
  if (cmd === 'sticker' && Number(item.seconds) > 13) return reply('Use um vídeo de até 13 segundos.')
  const partes = []
  for await (const parte of await downloadContentFromMessage(item, tipo)) partes.push(parte)
  const bytes = Buffer.concat(partes)
  // Static images: crop detected text unless the user requests the full image.
  if (cmd === 'sticker' && tipo === 'image') {
    const sharp = (await import('sharp')).default
    const source = /^(inteira|original)$/i.test(ctx.q?.trim()||'') ? bytes : await cropStickerText(bytes)
    const image = await sharp(source,{limitInputPixels:20000000}).rotate().resize(512,512,{
      fit:'contain',background:{r:0,g:0,b:0,alpha:0}
    }).png().toBuffer()
    for (const quality of [85,70,55,40,25]) {
      const sticker=await sharp(image).webp({quality}).toBuffer()
      if(sticker.length<=500*1024)return columbina.sendMessage(from,{sticker},{quoted:info})
    }
    return reply('Não consegui reduzir a imagem para figurinha.')
  }
  if (cmd === 'gerarlink') {
    const form = new FormData()
    form.set('reqtype', 'fileupload')
    form.set('fileToUpload', new Blob([bytes], { type: item.mimetype }), tipo === 'video' ? 'video.mp4' : 'foto.jpg')
    const resp = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form })
    const link = (await resp.text()).trim()
    if (!resp.ok || !link.startsWith('https://files.catbox.moe/')) throw Error('Upload indisponível.')
    return reply(link)
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moreira-'))
  try {
    const input = path.join(dir, 'entrada')
    fs.writeFileSync(input, bytes)
    let payload
    if (cmd === 'sticker') {
      payload = { sticker: await gerarFigurinha(input, path.join(dir, 'fig.webp'), 13, 900 * 1024) }
    } else {
      const gif = cmd === 'togif'
      const output = path.join(dir, gif ? 'saida.mp4' : 'saida.png')
      await ffmpeg(['-i', input, ...(gif ? ['-pix_fmt','yuv420p','-an'] : ['-frames:v','1']), output])
      payload = gif ? { video: fs.readFileSync(output), gifPlayback: true } : { image: fs.readFileSync(output) }
    }
    await columbina.sendMessage(from, payload, { quoted: info })
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

export async function comandoBase(sock, info, texto, limparPedidos) {
  const from = info.key.remoteJid
  const prefix = prefixo(from)
  if (!texto.startsWith(prefix)) return
  const [token, ...args] = texto.slice(prefix.length).trim().split(/\s+/)
  const plugin = manager.ObterComando(token.toLowerCase())
  if (!plugin || plugin.name === 'figaudio') return
  const reply = text => sock.sendMessage(from, { text }, { quoted: info })
  const sender = await remetente(sock, info.key)
  const isDono = temPermissaoDono(sender, donoJid)
  if (!isDono && !(await podeUsar(sock,info.key))) return
  if (plugin.category === 'dono' && !isDono) return reply('Comando exclusivo do dono do BOT Moreira.')
  if (plugin.category === 'premium' && !manager.isPremium(sender, donoJid)) return reply('Comando premium.')
  if (plugin.category === 'resenha' && !manager.isResenhaAtiva(from)) return reply('O modo resenha está desligado.')
  const isGroup = from.endsWith('@g.us')
  const groupMembers = isGroup && (['admin','dono','menu'].includes(plugin.category) || ['menu','quote','frase','figfrase'].includes(plugin.name)) ? (await sock.groupMetadata(from)).participants : []
  const admins = groupMembers.filter(m => m.admin).flatMap(m => [m.id,m.phoneNumber,m.lid]).filter(Boolean).map(jidNormalizedUser)
  const isAdm = isDono || [sender,info.key.participant,info.key.participantAlt].filter(Boolean).some(j => admins.includes(jidNormalizedUser(j)))
  const isBotAdm = [sock.user.id,sock.user.lid].filter(Boolean).some(j => admins.includes(jidNormalizedUser(j)))
  const menu = categoria => {
    if (categoria === 'dono' && !isDono) return reply('Menu exclusivo do dono.')
    if (categoria === 'admin' && !isAdm) return reply('Menu exclusivo dos administradores.')
    const menus = new MenuSystem(manager)
    const categorias = categoria ? [categoria] : manager.categories.filter(c => c !== 'menu' && (c !== 'admin' || isAdm) && (c !== 'dono' || isDono))
    const titulos = {'cmds-aleatorios':'🎮 ENTRETENIMENTO & MÍDIA',admin:'🛡️ ADMINISTRAÇÃO',dono:'👑 PROPRIETÁRIO',resenha:'😂 RESENHA',premium:'💎 PREMIUM',downloads:'📥 DOWNLOADS',efeitos:'✨ EFEITOS',midias:'🎨 MÍDIAS','inteligencia-ia':'🤖 IA',rpg:'🎲 RPG'}
    const secoes = categorias.map(cat => {
      const cmds = menus.getCommandsByFolder(cat).sort((a,b)=>a.name.localeCompare(b.name))
      if (!cmds.length) return ''
      return '╭─ *'+(titulos[cat]||cat.toUpperCase())+'*\n'+cmds.map(c=>'│ '+prefix+c.name+' — '+(c.description||'Comando')).join('\n')+'\n╰─────────────'
    }).filter(Boolean)
    return reply(['╔═══ ♛ *MOREIRA BOT* ═══╗\n🟢 Online • Prefixo: '+prefix+'\n╚══════════════════╝', ...secoes, '👑 github.com/moreirawzzl\n_Base Hiyuki por MisheruModz_'].join('\n\n'))
  }
  const ctx = { columbina:sock, from, info, prefix, reply, sender, groupMembers, isGroup, isDono, isAdm, isBotAdm,
    botNumber:jidNormalizedUser(sock.user.id), donoJid, args, q:args.join(' '), commandManager:manager, menu,
    reagir:text => sock.sendMessage(from,{react:{text,key:info.key}}) }
  ctx.quotedAuthor = () => quotedAuthor(ctx)
  ctx.limparPedidos = limparPedidos
  ctx.media = cmd => media(cmd,ctx)
  await plugin.execute(ctx)
}

export async function boasVindas(sock, { id, action, participants }) {
  const read = (name, fallback) => {
    const file = new URL(name,jsonDir)
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback
  }
  if (!['add','remove'].includes(action) || !read('welkon.json',[]).includes(id)) return
  const saudacao = action === 'add' ? read('legendas.json',{})[id] || 'Bem-vindo(a) ao grupo!' : 'Saiu do grupo.'
  for (const p of participants) {
    const jid = typeof p === 'string' ? p : p.id
    await sock.sendMessage(id,{ text:'@'+jid.split('@')[0]+' '+saudacao, mentions:[jid] })
  }
}
