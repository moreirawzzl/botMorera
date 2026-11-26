import * as Baileys from '@whiskeysockets/baileys'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'node:path'

const { proto } = Baileys
const execFileP = promisify(execFile)

// ---------- Protobuf cru (o Baileys nao conhece o campo 134) ----------

export function varint(n) {
  const out = []
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  out.push(n)
  return Buffer.from(out)
}

function campo(numero, buf) {
  return Buffer.concat([varint((numero << 3) | 2), varint(buf.length), buf])
}

// Monta o conteudo do campo 134: 134 -> 1 -> 26 (sticker) -> 26 (audio)
export function montarCampo134(stickerMsg, audioMsg) {
  const audioBytes = Buffer.from(proto.Message.AudioMessage.encode(audioMsg).finish())
  const stickerBytes = Buffer.from(proto.Message.StickerMessage.encode(stickerMsg).finish())
  const stickerComAudio = Buffer.concat([stickerBytes, campo(26, audioBytes)])
  const mensagem = campo(26, stickerComAudio) // Message { stickerMessage }
  return campo(1, mensagem) // FutureProofMessage { message }
}

// Faz o Baileys escrever o campo 134 quando a mensagem tem __raw134
let patchAplicado = false
export function aplicarPatchEncode() {
  if (patchAplicado) return
  patchAplicado = true
  const original = proto.Message.encode
  proto.Message.encode = function (m, w) {
    const wr = original.call(this, m, w)
    if (m && m.__raw134) wr.uint32(1074).bytes(m.__raw134)
    return wr
  }
}

// ---------- ffmpeg ----------

let pastaFfmpeg = ''

function diretorios(pasta) {
  try {
    return fs.readdirSync(pasta, { withFileTypes: true }).filter(item => item.isDirectory())
  } catch {
    return []
  }
}

export async function ffmpeg(args) {
  await execFileP(path.join(pastaFfmpeg, 'ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    maxBuffer: 1024 * 1024 * 20
  })
}

async function ffprobe(args) {
  const { stdout } = await execFileP(path.join(pastaFfmpeg, 'ffprobe'), ['-v', 'error', ...args])
  return stdout.trim()
}

export async function verificarFfmpeg() {
  const pastas = ['']
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const winget = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet')
    pastas.push(path.join(winget, 'Links'))
    const pacotes = path.join(winget, 'Packages')
    for (const pacote of diretorios(pacotes).filter(p => p.name.startsWith('Gyan.FFmpeg_'))) {
      const raiz = path.join(pacotes, pacote.name)
      for (const build of diretorios(raiz)) pastas.push(path.join(raiz, build.name, 'bin'))
    }
  }
  for (const pasta of pastas) {
    try {
      await execFileP(path.join(pasta, 'ffmpeg'), ['-version'])
      await execFileP(path.join(pasta, 'ffprobe'), ['-version'])
      pastaFfmpeg = pasta
      return true
    } catch { /* Testa a proxima instalacao. */ }
  }
  return false
}

export async function temAudio(arquivo) {
  const saida = await ffprobe(['-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', arquivo])
  return saida.length > 0
}

export async function duracao(arquivo) {
  const saida = await ffprobe(['-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo])
  const n = parseFloat(saida)
  return Number.isFinite(n) ? n : 0
}

// Audio em opus/ogg, com as opcoes que fazem o som tocar na figurinha
export async function gerarAudio(entrada, saida, segundos) {
  await ffmpeg([
    '-i', entrada,
    '-t', String(segundos),
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '32k',
    '-ar', '48000',
    '-ac', '1',
    '-vbr', 'on',
    '-compression_level', '10',
    '-frame_duration', '20',
    '-avoid_negative_ts', 'make_zero',
    saida
  ])
}

// Figurinha animada 512x512, reduz qualidade ate caber no limite
export async function gerarFigurinha(entrada, saida, segundos, limiteBytes) {
  const tentativas = [
    { fps: 15, q: 60 },
    { fps: 12, q: 45 },
    { fps: 10, q: 35 },
    { fps: 8, q: 25 },
    { fps: 6, q: 15 }
  ]
  for (const t of tentativas) {
    await ffmpeg([
      '-i', entrada,
      '-t', String(segundos),
      '-vf', `fps=${t.fps},scale=512:512:force_original_aspect_ratio=increase,crop=512:512`,
      '-c:v', 'libwebp',
      '-q:v', String(t.q),
      '-compression_level', '6',
      '-loop', '0',
      '-an',
      saida
    ])
    const buf = fs.readFileSync(saida)
    if (buf.length <= limiteBytes) return buf
  }
  throw new Error('Nao consegui deixar a figurinha pequena o bastante. Tente um video mais curto.')
}
