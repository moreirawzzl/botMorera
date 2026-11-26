const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const themes = {
 branco:['ffffff','161616'], preto:['101014','ffffff'],
 neon:['090b18','40ffbb'], gold:['16120c','f3cf76'],
 vidro:['23354b','e6f7ff'], transparente:['000000@0','ffffff'],
 piscar:['101014','ff55aa'], arcoiris:['101014','ff5555'],
 glitch:['101014','39dfff']
}
const segmenter = new Intl.Segmenter('pt-BR',{granularity:'grapheme'})
const chars = s => Array.from(segmenter.segment(s),x=>x.segment)
function wrap(text, limit) {
 const lines = []
 for (const paragraph of text.split('\n')) {
  let line = ''
  for (const word of paragraph.split(/\s+/u)) {
   if (!word) continue
   if (line && chars(line+' '+word).length > limit) { lines.push(line); line='' }
   for (const ch of chars((line?' ':'')+word)) {
    if (chars(line).length >= limit) { lines.push(line); line='' }
    line += ch
   }
  }
  lines.push(line)
 }
 return lines
}
module.exports = {
 name:'figfrase', description:'Figurinha quadrada com texto e estilos animados',
 async execute(ctx) {
  const {normalizeMessageContent} = await import('@whiskeysockets/baileys')
  const msg = normalizeMessageContent(ctx.info.message)
  const quote = normalizeMessageContent(msg?.extendedTextMessage?.contextInfo?.quotedMessage)
  const text = (quote?.conversation || quote?.extendedTextMessage?.text || quote?.imageMessage?.caption || quote?.videoMessage?.caption || '').trim()
  const help = 'Responda a uma mensagem com '+ctx.prefix+'figfrase [estilo]\n\nEstilos: branco, preto, neon, gold, vidro, transparente, piscar, arcoiris, glitch.\nEx.: '+ctx.prefix+'figfrase neon animado'
  if (!text) return ctx.reply(help)
  if (chars(text).length > 220) return ctx.reply('Escolha uma frase de até 220 caracteres.')
  const theme = (ctx.args[0] || 'transparente').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
  if (!Object.hasOwn(themes,theme)) return ctx.reply(help)
  const animated = ['piscar','arcoiris','glitch'].includes(theme) || ctx.args.slice(1).some(a=>a.toLowerCase()==='animado')
  const [bg,fg] = themes[theme]
  const {ffmpeg} = await import('../../../lib.mjs')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'figfrase-'))
  try {
   const fontCandidates = process.platform === 'win32'
    ? [path.join(process.env.WINDIR || 'C:/Windows','Fonts','arialbd.ttf')]
    : ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf','/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']
   const font = fontCandidates.find(p=>fs.existsSync(p))
   if (!font) return ctx.reply('Fonte do sistema indisponível. Instale Arial ou DejaVu Sans.')
   let size=52, lines
   while (size>=22) {
    lines=wrap(text,Math.floor(424/(size*.72)))
    if (lines.length*(size+10)<=420) break
    size-=2
   }
   if (size<22) return ctx.reply('Frase muito longa para caber na figurinha.')
   const file=path.join(dir,'texto.txt'), output=path.join(dir,'fig.webp')
   fs.writeFileSync(file,lines.join('\n'),'utf8')
   // Escaping both FFmpeg filtergraph and filter-option parsing layers.
   const esc = p => p.replace(/\\/g,'/').replace(/:/g,'\\:').replace(/'/g,"'\\''")
   const quoted = p => "'"+esc(p)+"'"
   const base = 'drawtext=fontfile='+quoted(font)+':textfile='+quoted(file)+':expansion=none:fontsize='+size+':fontcolor=0x'+fg+':x=(w-tw)/2:y=(h-th)/2:line_spacing=10'
   const outline = theme==='transparente' ? ':borderw=3:bordercolor=black' : theme==='neon' ? ':borderw=2:bordercolor=0x136c62:shadowcolor=0x40ffbb@0.6:shadowx=2:shadowy=2' : ''
   const filters=['format=rgba',base+outline]
   if(animated && theme!=='transparente') filters.push('hue=h=90*t:s=1')
   if(theme==='glitch') filters.push("crop=504:512:x=4+3*sin(6*t):y=0","pad=512:512:4:0:color=0x101014")
   const frames = animated ? 24 : 1
   await ffmpeg(['-f','lavfi','-i','color=c=0x'+bg+':s=512x512:r=8,format=rgba','-vf',filters.join(','),'-frames:v',String(frames),'-an','-c:v',animated?'libwebp_anim':'libwebp','-q:v','70','-compression_level','6','-loop','0',output])
   const sticker=fs.readFileSync(output)
   if(sticker.length>500*1024) return ctx.reply('Figurinha muito pesada. Tente uma frase menor.')
   return await ctx.columbina.sendMessage(ctx.from,{sticker},{quoted:ctx.info})
  } catch(e) {
   console.error('figfrase:',e.message)
   return ctx.reply('Não consegui gerar a figurinha. Confira o FFmpeg e as fontes instaladas.')
  } finally { fs.rmSync(dir,{recursive:true,force:true}) }
 }
}
