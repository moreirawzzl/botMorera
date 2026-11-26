const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../../database')
module.exports = {
 name: 'limparmidias', aliases: ['limparfotos','limparfigurinhas'],
 description: 'Limpa mídias guardadas pelo bot (somente dono)',
 async execute(ctx) {
  if (!ctx.isDono) return ctx.reply('Exclusivo do dono.')
  const text = ctx.info.message?.extendedTextMessage?.text || ctx.info.message?.conversation || ''
  const cmd = text.trim().slice(ctx.prefix.length).split(/\s+/)[0].toLowerCase()
  const dirs = cmd === 'limparfotos' ? ['fotos'] : cmd === 'limparfigurinhas' ? ['figurinhas'] : ['fotos','figurinhas']
  let count = 0
  for (const name of dirs) {
   const dir = path.join(root,name)
   if (!fs.existsSync(dir)) continue
   if (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink()) continue
   for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (entry.isFile()) { fs.unlinkSync(path.join(dir,entry.name)); count++ }
   }
  }
  return ctx.reply('Mídias locais removidas: '+count+'. Sessão e ranking preservados.')
 }
}
