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


// Capture unknown sound-sticker fields during protobuf decoding.
// Keep bytes on the decoded message without changing ordinary sticker behavior.
function camposWire(bytes) {
  const out=[];let p=0
  function readVar(){let n=0,k=0;while(p<bytes.length&&k<49){const b=bytes[p++];n+=(b&127)*2**k;if(!(b&128))return n;k+=7}throw Error('Varint inválido')}
  while(p<bytes.length){
    const tag=readVar(),num=Math.floor(tag/8),wire=tag%8
    if(!num)throw Error('Campo inválido')
    if(wire===2){const n=readVar();if(n>bytes.length-p)throw Error('Campo truncado');out.push({num,data:bytes.subarray(p,p+n)});p+=n}
    else if(wire===0)readVar()
    else if(wire===1)p+=8
    else if(wire===5)p+=4
    else throw Error('Wire inválido')
    if(p>bytes.length)throw Error('Campo truncado')
  }
  return out
}
const wireField=(bytes,num)=>camposWire(bytes).find(x=>x.num===num)?.data
function captureDecode(type,extract){
 const original=type.decode
 type.decode=function(reader,length,...rest){
  const start=reader?.pos??0
  const buf=reader?.buf||reader
  const value=original.call(this,reader,length,...rest)
  try{
   const end=reader?.pos??(length==null?buf.length:start+length)
   extract(value,Buffer.from(buf.subarray(start,end)))
  }catch{}
  return value
 }
}
export function audioDaFigurinha(message){
 if(!message)return null
 if(message.__soundSticker)return message.__soundSticker
 if(message.stickerMessage?.__soundAudio)return {sticker:message.stickerMessage,audio:message.stickerMessage.__soundAudio}
 for(const key of ['futureProofMessage','associatedChildMessage','deviceSentMessage','ephemeralMessage','viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension','stickerWithAudioMessage']){
  const nested=message[key]?.message
  if(nested){const result=audioDaFigurinha(nested);if(result)return result}
 }
 return null
}
function captureSound(){
 captureDecode(proto.Message.StickerMessage,(m,bytes)=>{
  const audio=wireField(bytes,26)
  if(audio){const a=proto.Message.AudioMessage.decode(audio);if(a.mediaKey&&(a.url||a.directPath))m.__soundAudio=a}
 })
 captureDecode(proto.Message,(m,bytes)=>{
  const raw=wireField(bytes,134)
  if(raw){
   const inner=wireField(raw,1),sticker=inner&&wireField(inner,26),audio=sticker&&wireField(sticker,26)
   if(sticker&&audio){
    const a=proto.Message.AudioMessage.decode(audio)
    if(a.mediaKey&&(a.url||a.directPath))m.__soundSticker={sticker:proto.Message.StickerMessage.decode(sticker),audio:a}
   }
  }
 })
}

// Faz o Baileys escrever o campo 134 quando a mensagem tem __raw134
let patchAplicado = false
export function aplicarPatchEncode() {
  if (patchAplicado) return
  patchAplicado = true
  captureSound()
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
