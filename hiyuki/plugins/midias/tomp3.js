const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');let active=0
module.exports={name:'tomp3',description:'Converte vídeo marcado em MP3 (até 10 minutos).',async execute(c){
const {normalizeMessageContent,downloadContentFromMessage}=await import('@whiskeysockets/baileys')
const m=normalizeMessageContent(c.info.message),q=normalizeMessageContent(m?.extendedTextMessage?.contextInfo?.quotedMessage)||m,v=q?.videoMessage
if(!v||v.viewOnce||Number(v.seconds)>600)return c.reply('Marque um vídeo comum de até 10 minutos.')
if(active>=1)return c.reply('Conversor ocupado.');active++;let dir
try{dir=await fs.mkdtemp(path.join(os.tmpdir(),'moreira-mp3-'));let n=0,parts=[]
for await(const b of await downloadContentFromMessage(v,'video')){n+=b.length;if(n>32*1024*1024)throw Error('Limite de 32 MB');parts.push(b)}
const input=path.join(dir,'in.mp4'),output=path.join(dir,'out.mp3')
await fs.writeFile(input,Buffer.concat(parts));parts=[]
const {ffmpeg}=await import('../../../lib.mjs');await ffmpeg(['-i',input,'-t','600','-vn','-c:a','libmp3lame','-b:a','128k',output])
await c.columbina.sendMessage(c.from,{audio:await fs.readFile(output),mimetype:'audio/mpeg'},{quoted:c.info})
}catch(e){return c.reply('Não consegui converter o vídeo. Confira o FFmpeg e o tamanho do arquivo.')}finally{active--;if(dir)await fs.rm(dir,{recursive:true,force:true})}
}}
