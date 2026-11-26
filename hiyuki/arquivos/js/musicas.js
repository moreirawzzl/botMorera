const fs=require('node:fs'), path=require('node:path')
const {execFile}=require('node:child_process')
const {promisify}=require('node:util')
const os=require('node:os')
const run=promisify(execFile)
let activeDownloads=0
const cache=path.resolve(__dirname,'../../database/musicas')
const sessions=new Map()
const ttl=5*60*1000
let token, tokenUntil=0
async function json(url,options={}) {
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)})
 if(!r.ok) throw Error('Serviço retornou HTTP '+r.status)
 return r.json()
}
async function spotifyToken(){
 if(token && Date.now()<tokenUntil) return token
 const id=process.env.SPOTIFY_CLIENT_ID,secret=process.env.SPOTIFY_CLIENT_SECRET
 if(!id||!secret) throw Error('Configure SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.')
 const r=await json('https://accounts.spotify.com/api/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
 token=r.access_token;tokenUntil=Date.now()+(r.expires_in-30)*1000;return token
}
function youtubeId(q){
 try{const u=new URL(q);if(u.hostname==='youtu.be')return u.pathname.slice(1);if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(u.hostname))return u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|live)\/([^/]+)/)?.[1]}catch{}
}
async function youtube(q){
 const key=process.env.YOUTUBE_API_KEY
 const id=youtubeId(q)
 if(!key){
  if(id&&!/^[\w-]{11}$/.test(id))throw Error('Link inválido.')
  const target=id?'https://www.youtube.com/watch?v='+id:'ytsearch5:'+q.slice(0,250)
  const {stdout}=await run(process.env.YTDLP_PATH||'yt-dlp',['--ignore-config','--no-playlist','--flat-playlist','--dump-json','--skip-download','--',target],{timeout:45000,maxBuffer:4*1024*1024,windowsHide:true})
  return stdout.trim().split('\n').filter(Boolean).slice(0,5).map(line=>JSON.parse(line)).filter(x=>/^[\w-]{11}$/.test(x.id)).map(x=>({title:x.title||'Vídeo do YouTube',url:'https://www.youtube.com/watch?v='+x.id,service:'youtube'}))
 }
 const base='https://www.googleapis.com/youtube/v3/'
 const u=new URL(base+(id?'videos':'search'))
 u.search=new URLSearchParams({key,part:id?'snippet,status':'snippet',...(id?{id}:{q,type:'video',maxResults:'5'})})
 const r=await json(u)
 return (r.items||[]).slice(0,5).map(x=>({title:x.snippet.title,url:'https://www.youtube.com/watch?v='+(typeof x.id==='string'?x.id:x.id.videoId),service:'youtube'}))
}
async function spotify(q){
 const t=await spotifyToken(),headers={Authorization:'Bearer '+t}
 let id
 try{const u=new URL(q);if(u.hostname==='open.spotify.com')id=u.pathname.match(/\/track\/([A-Za-z0-9]+)/)?.[1]}catch{}
 const r=await json(id?'https://api.spotify.com/v1/tracks/'+id:'https://api.spotify.com/v1/search?'+new URLSearchParams({q,type:'track',limit:'5'}),{headers})
 return (id?[r]:r.tracks?.items||[]).slice(0,5).map(x=>({title:x.name+' — '+x.artists.map(a=>a.name).join(', '),url:x.external_urls.spotify,preview:x.preview_url}))
}
async function downloadYouTube(ctx,item){
 const id=youtubeId(item.url)
 if(!id||!/^[\w-]{11}$/.test(id))return ctx.reply('Link de vídeo inválido.')
 if(activeDownloads>=2)return ctx.reply('Conversor ocupado. Tente novamente em instantes.')
 activeDownloads++
 let dir
 try {
  const executable=process.env.YTDLP_PATH||'yt-dlp'
  const url='https://www.youtube.com/watch?v='+id
  const opts={timeout:60000,maxBuffer:8*1024*1024,windowsHide:true}
  const {stdout}=await run(executable,['--ignore-config','--no-playlist','--skip-download','--dump-single-json','--',url],opts)
  const meta=JSON.parse(stdout)
  const licensed=/creative commons|cc.by|public domain/i.test(meta.license||'')
  if(!licensed)return ctx.reply('🎵 '+item.title+'\n'+url+'\nNão encontrei licença de download aberta nos dados do vídeo.')
  if(meta.is_live||!Number.isFinite(meta.duration)||meta.duration>600)return ctx.reply('Escolha um vídeo gravado de até 10 minutos.')
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'moreira-musica-'))
  await ctx.reply('🎵 Preparando áudio: '+item.title)
  await run(executable,['--ignore-config','--no-playlist','--no-progress','--max-filesize','25M','-f','bestaudio','-o',path.join(dir,'audio.%(ext)s'),'--',url],{...opts,timeout:120000})
  const input=fs.readdirSync(dir).find(n=>/^audio\.[a-z0-9]+$/i.test(n)&&!/\.(part|ytdl)$/i.test(n))
  if(!input)throw Error('Áudio não baixado.')
  const {ffmpeg}=await import('../../../lib.mjs')
  const output=path.join(dir,'saida.mp3')
  await ffmpeg(['-i',path.join(dir,input),'-vn','-c:a','libmp3lame','-b:a','128k',output])
  if(fs.statSync(output).size>16*1024*1024)throw Error('Áudio ultrapassa o limite de 16 MB.')
  return await ctx.columbina.sendMessage(ctx.from,{audio:fs.readFileSync(output),mimetype:'audio/mpeg'},{quoted:ctx.info})
 }finally{activeDownloads--;if(dir)fs.rmSync(dir,{recursive:true,force:true})}
}
async function deliver(ctx,item){
 if(item.service==='youtube')return downloadYouTube(ctx,item)
 await ctx.reply('🎵 '+item.title+'\n'+item.url)
 if(!item.preview)return
 const u=new URL(item.preview)
 if(u.protocol!=='https:'||!['p.scdn.co','audio-fa.scdn.co','audio-ak-spotify-com.akamaized.net'].includes(u.hostname))return
 const r=await fetch(u,{signal:AbortSignal.timeout(15000),redirect:'error'})
 if(!r.ok)return
 const reader=r.body.getReader(),chunks=[];let total=0
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>5*1024*1024){await reader.cancel();return}chunks.push(Buffer.from(value))}}finally{reader.releaseLock()}
 await ctx.columbina.sendMessage(ctx.from,{audio:Buffer.concat(chunks),mimetype:'audio/mpeg'},{quoted:ctx.info})
}
async function execute(ctx,service){
 const q=ctx.q?.trim()
 if(!q)return ctx.reply('Use '+ctx.prefix+service+' nome da música ou link.')
 const owner=ctx.from+'|'+ctx.sender+'|'+service
 const now=Date.now()
 for(const [k,v] of sessions)if(v.until<now)sessions.delete(k)
 try{
  if(/^[1-5]$/.test(q)){
   const s=sessions.get(owner),item=s?.items[Number(q)-1]
   if(!item)return ctx.reply('Faça uma pesquisa primeiro. A seleção expira em 5 minutos.')
   sessions.delete(owner);return await deliver(ctx,item)
  }
  const items=await (service==='youtube'?youtube(q):spotify(q))
  if(!items.length)return ctx.reply('Nenhum resultado encontrado.')
  if(items.length===1)return await deliver(ctx,items[0])
  if(sessions.size>=500)sessions.delete(sessions.keys().next().value)
  sessions.set(owner,{items,until:now+ttl})
  return ctx.reply('🎵 *'+service.toUpperCase()+' — RESULTADOS*\n\n'+items.map((x,i)=>(i+1)+'. '+x.title).join('\n')+'\n\nEscolha com '+ctx.prefix+service+' 1 até '+items.length+'.\nSeleção válida por 5 minutos.')
 }catch(e){console.error(service,e.message);return ctx.reply('Não consegui consultar o serviço: '+e.message)}
}
function clear(){sessions.clear();if(!fs.existsSync(cache)||!fs.lstatSync(cache).isDirectory()||fs.lstatSync(cache).isSymbolicLink())return 0;let n=0;for(const e of fs.readdirSync(cache,{withFileTypes:true})){if(e.isFile()){fs.unlinkSync(path.join(cache,e.name));n++}}return n}
module.exports={execute,clear}
