module.exports={name:'pesquisar',description:'Pesquisa assuntos na Wikipédia e fornece links para busca geral na web.',async execute(c){
 const q=c.q.trim();if(!q||q.length>200)return c.reply('Use .pesquisar assunto.')
 const general='https://www.google.com/search?q='+encodeURIComponent(q)
 try{
  const u=new URL('https://pt.wikipedia.org/w/api.php');u.search=new URLSearchParams({action:'query',list:'search',srsearch:q,srlimit:'5',format:'json'})
  const r=await fetch(u,{headers:{'User-Agent':'BotPaneleiro/1.0 (WhatsApp research utility)'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status)
  const d=await r.json(),items=d.query?.search||[]
  const clean=x=>x.replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
  return c.reply('🔎 *PESQUISA — '+q+'*\n\n'+(items.length?items.map((x,i)=>(i+1)+'. '+x.title+'\n'+clean(x.snippet)+'\nhttps://pt.wikipedia.org/?curid='+x.pageid).join('\n\n'):'Sem resultados na Wikipédia.')+'\n\nBusca geral: '+general)
 }catch(e){console.error('Falha no comando pesquisar',e);return c.reply('Consulta à Wikipédia indisponível.\nBusca geral: '+general)}
}}