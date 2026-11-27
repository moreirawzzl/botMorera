const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {execFile}=require('node:child_process'),{promisify}=require('node:util')
const exec=promisify(execFile)
let busy=false
async function execute(c,mode){
 if(busy)return c.reply('Outra conversão de arquivo está em andamento.')
 const B=await import('@whiskeysockets/baileys')
 const m=B.normalizeMessageContent(c.info.message)
 const ctx=m?.extendedTextMessage?.contextInfo||m?.imageMessage?.contextInfo||m?.documentMessage?.contextInfo
 const q=B.normalizeMessageContent(ctx?.quotedMessage)||m
 const allowed=mode==='zip'?['document','image','video','audio','sticker']:mode==='extrairpdf'?['document']:['image','sticker']
 const type=allowed.find(t=>q?.[t+'Message'])
 const v=type&&q[type+'Message']
 if(!v||v.viewOnce||m?.viewOnceMessage||ctx?.quotedMessage?.viewOnceMessage||Number(v.fileLength)>12*1024*1024)return c.reply('Marque um arquivo comum de até 12 MB.')
 if(mode==='extrairpdf'&&v.mimetype!=='application/pdf'&&!/\.pdf$/i.test(v.fileName||''))return c.reply('Marque um PDF.')
 busy=true;let dir
 try{
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'paneleiro-arquivo-'))
  const ext={document:'bin',image:'jpg',video:'mp4',audio:'ogg',sticker:'webp'}[type]
  const filename=String(v.fileName||'arquivo.'+ext).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/^\.+/,'').slice(0,120)||'arquivo.bin'
  const input=path.join(dir,'input.bin'),out=path.join(dir,mode==='pdf'?'imagem.pdf':mode==='zip'?'arquivo.zip':'resultado.txt')
  const chunks=[];let n=0
  for await(const b of await B.downloadContentFromMessage(v,type)){n+=b.length;if(n>12*1024*1024)throw Error('Arquivo grande demais');chunks.push(b)}
  fs.writeFileSync(input,Buffer.concat(chunks))
  const py=process.env.PANELEIRO_PYTHON||(process.platform==='win32'?'py':'python3')
  const args=process.platform==='win32'&&py==='py'?['-3.12']:[]
  await exec(py,[...args,path.join(__dirname,'arquivo-worker.py'),mode,input,out,filename],{timeout:60000,windowsHide:true,maxBuffer:256*1024,env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}})
  if(fs.statSync(out).size>16*1024*1024)throw Error('Resultado grande demais')
  if(mode==='pdf'||mode==='zip')return await c.columbina.sendMessage(c.from,{document:fs.readFileSync(out),mimetype:mode==='pdf'?'application/pdf':'application/zip',fileName:path.basename(out)},{quoted:c.info})
  const t=fs.readFileSync(out,'utf8').trim()
  if(!t)return c.reply(mode==='extrairpdf'?'Nenhum texto selecionável encontrado. PDFs digitalizados precisam de OCR.':'Nenhum QR Code encontrado.')
  if(mode==='extrairpdf'&&t.length>3500)return await c.columbina.sendMessage(c.from,{document:Buffer.from(t),mimetype:'text/plain',fileName:'texto-extraido.txt'},{quoted:c.info})
  return c.reply((mode==='lerqrcode'?'🔎 *CONTEÚDO DO QR CODE* (não aberto automaticamente)':'📄 *TEXTO EXTRAÍDO*')+'\n\n'+t)
 }catch(e){console.error('Falha no comando '+mode,e.stderr||e.message);return c.reply('Falha ao processar. Confira o formato, tamanho e dependências Python: Pillow, pypdf e zxing-cpp.')}
 finally{busy=false;if(dir)fs.rmSync(dir,{recursive:true,force:true})}
}
module.exports={execute}
