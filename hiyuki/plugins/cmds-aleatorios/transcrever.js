const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {execFile}=require('node:child_process'),{promisify}=require('node:util')
const run=promisify(execFile)
let busy=false
module.exports={name:'transcrever',description:'Transcreve áudio marcado com Whisper local (instalação opcional).',async execute(c){
 if(busy)return c.reply('Já existe uma transcrição em andamento.')
 const B=await import('@whiskeysockets/baileys')
 const m=B.normalizeMessageContent(c.info.message),q=B.normalizeMessageContent(m?.extendedTextMessage?.contextInfo?.quotedMessage)
 const a=q?.audioMessage
 if(!a||a.viewOnce||!Number.isFinite(Number(a.seconds))||Number(a.seconds)>120||Number(a.seconds)<=0)return c.reply('Marque um áudio comum de até 2 minutos.')
 busy=true;let dir
 try{
 const exe=process.env.WHISPER_PATH||'whisper'
 try{await run(exe,['--help'],{timeout:30000,windowsHide:true})}catch{return c.reply('Whisper local não instalado. Configure WHISPER_PATH ou instale openai-whisper no Python.')}
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'paneleiro-transcrever-'))
 const chunks=[];let size=0
 for await(const x of await B.downloadContentFromMessage(a,'audio')){size+=x.length;if(size>8*1024*1024)throw Error('Áudio grande');chunks.push(x)}
 const input=path.join(dir,'audio.ogg');fs.writeFileSync(input,Buffer.concat(chunks))
 await c.reply('🎙️ Transcrevendo áudio...')
 await run(exe,[input,'--model','tiny','--language','pt','--device','cpu','--fp16','False','--threads','2','--output_format','txt','--output_dir',dir],{timeout:300000,maxBuffer:1024*1024,windowsHide:true})
 const result=fs.readFileSync(path.join(dir,'audio.txt'),'utf8').trim()
 return c.reply(result?'🎙️ *TRANSCRIÇÃO*\n\n'+result.slice(0,8000):'Nenhuma fala identificada.')
 }catch(e){console.error('Falha no comando transcrever',e);return c.reply('Não consegui transcrever. Confira Whisper, FFmpeg e o CMD.')}
 finally{busy=false;if(dir)fs.rmSync(dir,{recursive:true,force:true})}
}}