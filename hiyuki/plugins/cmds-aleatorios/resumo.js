module.exports={name:'resumo',aliases:['resumir'],description:'Extrai os trechos principais de um texto marcado, sem IA.',async execute(c){
 const {normalizeMessageContent}=await import('@whiskeysockets/baileys')
 const q=normalizeMessageContent(normalizeMessageContent(c.info.message)?.extendedTextMessage?.contextInfo?.quotedMessage)
 const text=(q?.conversation||q?.extendedTextMessage?.text||q?.imageMessage?.caption||q?.videoMessage?.caption||c.q||'').trim()
 if(!text||text.length>30000)return c.reply('Marque um texto de até 30 mil caracteres.')
 const sentences=text.match(/[^.!?\n]+[.!?]?/g)||[text]
 const words=s=>s.toLowerCase().match(/[\p{L}]{4,}/gu)||[]
 const freq=new Map();for(const w of words(text))freq.set(w,(freq.get(w)||0)+1)
 const ranked=sentences.map((s,i)=>({s:s.trim(),i,score:words(s).reduce((n,w)=>n+(freq.get(w)||0),0)/Math.sqrt(words(s).length||1)})).filter(x=>x.s)
 const count=Math.min(5,Math.max(1,Math.ceil(ranked.length/3)))
 const result=ranked.sort((a,b)=>b.score-a.score).slice(0,count).sort((a,b)=>a.i-b.i).map(x=>x.s).join('\n\n')
 return c.reply('📝 *RESUMO EXTRATIVO*\n\n'+result.slice(0,3500))
}}