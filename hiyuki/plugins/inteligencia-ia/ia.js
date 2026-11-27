const { responder } = require('../../arquivos/js/conversa.js')
module.exports={
 name:'ia',category:'inteligencia-ia',description:'Assistente local zoeiro sem API. Use .ia pergunta ou marque uma mensagem.',
 async execute(ctx){
 const quoted=ctx.info?.message?.extendedTextMessage?.contextInfo?.quotedMessage
 const q=(ctx.q||quoted?.conversation||quoted?.extendedTextMessage?.text||'').trim()
 return ctx.reply(q?await responder(q,ctx.from+'|'+ctx.sender):'Chamou e esqueceu a pergunta? Desembucha.')
 }
}
