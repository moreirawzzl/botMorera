const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {execFile}=require('node:child_process'),{promisify}=require('node:util')
const exec=promisify(execFile)
// Windows pipes can default to cp1252; Whisper help and transcripts contain Unicode.
const run=(exe,args,options={})=>exec(exe,args,{...options,env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}})
let busy=false
let selected
async function launcher(){
 const candidates=[...(selected?[selected]:[]),...(process.env.WHISPER_PATH?[[process.env.WHISPER_PATH,[]]]:[]),...(process.platform==='win32'?[['py',['-3.12','-m','whisper']],...(process.env.LOCALAPPDATA?[[path.join(process.env.LOCALAPPDATA,'Programs','Python','Python312','python.exe'),['-m','whisper']]]:[])]:[]),['python',['-m','whisper']],['python3',['-m','whisper']],['whisper',[]]]
 let last
 for(const [exe,args] of candidates){
  try{await run(exe,[...args,'--help'],{timeout:90000,windowsHide:true,maxBuffer:1024*1024});return selected=[exe,args]}
  catch(e){last=e;console.error('Falha no comando transcrever: inicialização Whisper',exe,e.code,e.stderr||e.message)}
 }
 throw last||Error('Whisper indisponível')
}
module.exports={name:'transcrever',description:'Transcreve áudio marcado com Whisper local (instalação opcional).',async execute(c,mode='transcrever'){
 const langs=mode==='traduziraudio'?(c.q||'pt en').trim().split(/\s+/):['pt'];if(mode==='traduziraudio'&&(langs.length!==2||!langs.every(x=>/^[a-z]{2,3}$/.test(x))))return c.reply('Marque um áudio e use .traduziraudio pt en.')
 const max=mode==='resumiraudio'?300:120;
 if(busy)return c.reply('Já existe uma transcrição em andamento.')
 const B=await import('@whiskeysockets/baileys')
 const m=B.normalizeMessageContent(c.info.message),q=B.normalizeMessageContent(m?.extendedTextMessage?.contextInfo?.quotedMessage)
 const a=q?.audioMessage
 if(!a||a.viewOnce||!Number.isFinite(Number(a.seconds))||Number(a.seconds)>max||Number(a.seconds)<=0)return c.reply('Marque um áudio comum de até '+(max/60)+' minutos.')
 busy=true;let dir
 try{
 const [exe,args]=await launcher()
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'paneleiro-transcrever-'))
 const chunks=[];let size=0
 for await(const x of await B.downloadContentFromMessage(a,'audio')){size+=x.length;if(size>8*1024*1024)throw Error('Áudio grande');chunks.push(x)}
 const input=path.join(dir,'audio.ogg');fs.writeFileSync(input,Buffer.concat(chunks))
 await c.reply('🎙️ Transcrevendo áudio...')
 await run(exe,[...args,input,'--model','tiny','--language',langs[0],'--device','cpu','--fp16','False','--threads','2','--output_format','txt','--output_dir',dir],{timeout:600000,maxBuffer:1024*1024,windowsHide:true})
 const result=fs.readFileSync(path.join(dir,'audio.txt'),'utf8').trim()
 if(!result)return c.reply('Nenhuma fala identificada.')
 if(mode==='resumiraudio')return require('./resumo.js').execute({...c,info:{message:{}},q:result.slice(0,30000)})
 if(mode==='traduziraudio'){
  const base=process.env.LIBRETRANSLATE_URL
  if(!base)return c.reply('Configure LIBRETRANSLATE_URL.')
  const chunks=result.match(/[\s\S]{1,1800}(?:\s|$)|[\s\S]{1,1800}/g)||[result]
  const translations=[]
  for(const chunk of chunks.slice(0,10)){
   const r=await fetch(new URL('translate',base.replace(/\/?$/,'/')),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:chunk,source:langs[0],target:langs[1],format:'text',api_key:process.env.LIBRETRANSLATE_KEY||undefined}),signal:AbortSignal.timeout(30000)})
   if(!r.ok)throw Error('LibreTranslate HTTP '+r.status)
   const d=await r.json();if(!d.translatedText)throw Error('Tradução vazia');translations.push(d.translatedText)
  }
  return c.reply('🌐 *TRADUÇÃO DO ÁUDIO ('+langs.join(' → ')+')*\n\n'+translations.join(' ').slice(0,8000))
 }
 return c.reply('🎙️ *TRANSCRIÇÃO*\n\n'+result.slice(0,8000))
 }catch(e){console.error('Falha no comando transcrever',e);return c.reply('Não consegui iniciar ou executar o Whisper. Confira o erro detalhado no CMD e use py -3.12 -m whisper --help.')}
 finally{busy=false;if(dir)fs.rmSync(dir,{recursive:true,force:true})}
}}