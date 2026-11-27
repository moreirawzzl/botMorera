const {json}=require('../../arquivos/js/utilweb')
module.exports={name:'dicionario',description:'Consulta definição em português no Wikcionário.',async execute(c){
 const q=c.q.trim();if(!q||q.length>80)return c.reply('Use '+c.prefix+'dicionario palavra.')
 try{
 const url='https://pt.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(q)
 const d=await json(url),entries=d.pt||[]
 const defs=entries.flatMap(x=>(x.definitions||[]).map(y=>String(y.definition||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' '))).filter(Boolean).slice(0,5)
 if(!defs.length)throw Error('Sem definição')
 return c.reply('📖 *'+q+'*\n\n'+defs.map((x,i)=>(i+1)+'. '+x).join('\n')+'\n\nFonte: Wikcionário (CC BY-SA)\nhttps://pt.wiktionary.org/wiki/'+encodeURIComponent(q))
 }catch(e){console.error('Falha no comando dicionario',e);return c.reply('Não consegui consultar a definição. Veja https://pt.wiktionary.org/wiki/'+encodeURIComponent(q))}
}}