function searchLink(domain, query) {
  const url = new URL('https://www.google.com/search')
  url.searchParams.set('q', 'site:' + domain + ' ' + query)
  return url.href
}
function duration(value) {
  if(!Number.isFinite(value)||value<0)return 'Não informada'
  const n=Math.round(value)
  return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')
}
module.exports={
 name:'letra',
 description:'Pesquisa músicas na LRCLIB gratuitamente. Ex.: .letra Infiel Marília Mendonça',
 async execute(c){
  const query=(c.q||'').trim()
  if(!query||query.length>180)return c.reply('Use '+c.prefix+'letra nome da música e artista (até 180 caracteres).')
  const url=new URL('https://lrclib.net/api/search')
  url.searchParams.set('q',query)
  let rows
  try{
   const r=await fetch(url,{headers:{'User-Agent':'BOT-PANELEIRO/1.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)})
   if(!r.ok)throw Error('HTTP '+r.status)
   rows=await r.json()
  }catch{return c.reply('LRCLIB temporariamente indisponível. Consulte:\n'+searchLink('letras.mus.br',query))}
  if(!Array.isArray(rows)||!rows.length)return c.reply('Não encontrei a música. Tente informar também o artista.\n'+searchLink('letras.mus.br',query))
  const seen=new Set(),results=[]
  for(const x of rows){
   if(typeof x?.trackName!=='string'||typeof x?.artistName!=='string')continue
   const key=(x.trackName+'|'+x.artistName).toLowerCase()
   if(seen.has(key))continue
   seen.add(key);results.push(x)
   if(results.length===5)break
  }
  if(!results.length)return c.reply('Nenhum resultado válido encontrado.')
  return c.reply('🎵 *BUSCA DE MÚSICAS — LRCLIB*\n\n'+results.map((x,i)=>(
   (i+1)+'. *'+x.trackName.slice(0,120)+'*\nArtista: '+x.artistName.slice(0,120)+'\nÁlbum: '+String(x.albumName||'Não informado').slice(0,120)+'\nDuração: '+duration(x.duration)+'\nConsultar letra: '+searchLink('letras.mus.br',x.trackName+' '+x.artistName)
  )).join('\n\n')+'\n\n_Fonte: LRCLIB. Letras completas permanecem nas páginas autorizadas._')
 }
}
