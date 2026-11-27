const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
async function foto(ctx, guardar) {
  const chave = createHash('sha256').update(ctx.from+'/'+ctx.sender).digest('hex')
  const pasta = path.join(__dirname,'../../database/fotos')
  const arquivo = path.join(pasta,chave)
  if (!guardar) {
    if (!fs.existsSync(arquivo)) return ctx.reply('Você ainda não guardou uma foto nesta conversa.')
    return ctx.columbina.sendMessage(ctx.from,{image:fs.readFileSync(arquivo)},{quoted:ctx.info})
  }
  const imagem = ctx.info.message?.imageMessage
  if (!imagem || imagem.viewOnce) return ctx.reply('Envie sua foto comum com '+ctx.prefix+'guardarfoto na legenda.')
  const {downloadContentFromMessage} = await import('@whiskeysockets/baileys')
  const partes = []
  for await (const parte of await downloadContentFromMessage(imagem,'image')) partes.push(parte)
  fs.mkdirSync(pasta,{recursive:true})
  fs.writeFileSync(arquivo+'.tmp',Buffer.concat(partes))
  fs.renameSync(arquivo+'.tmp',arquivo)
  return ctx.reply('Sua foto foi guardada. Use '+ctx.prefix+'minhafoto nesta conversa para exibi-la.')
}
module.exports = {foto}
