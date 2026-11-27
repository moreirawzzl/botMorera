module.exports={name:'noticias',description:'Busca manchetes recentes por assunto.',async execute(c){
 const q=c.q.trim();if(!q||q.length>150)return c.reply('Use '+c.prefix+'noticias assunto.')
 try{
 const url=new URL('https://news.google.com/rss/search');url.search=new URLSearchParams({q:q+' when:7d',hl:'pt-BR',gl:'BR',ceid:'BR:pt-419'})
 const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status)
 const xml=await r.text(),decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
 const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,5).map(([,x])=>{const get=t=>decode(x.match(new RegExp('<'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+t+'>'))?.[1]||'');return {title:get('title'),link:get('link'),date:get('pubDate')}}).filter(x=>x.title&&x.link.startsWith('https://'))
 return c.reply(items.length?'📰 *NOTÍCIAS — '+q+'*\n\n'+items.map((x,i)=>(i+1)+'. '+x.title+'\n'+new Date(x.date).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})+'\n'+x.link).join('\n\n'):'Nenhuma notícia recente encontrada.')
 }catch(e){console.error('Falha no comando noticias',e);return c.reply('Consulta de notícias indisponível.')}
}}