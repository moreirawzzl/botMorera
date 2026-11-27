const fs=require('node:fs'),path=require('node:path')
const root=path.resolve(__dirname,'../../database')
module.exports={name:'limpar',aliases:['limpeza'],description:'Limpa logs e resíduos locais de mídia. .limpar ver mostra o espaço; .limpar confirmar executa.',async execute(c){
 if(!c.isDono)return c.reply('Exclusivo do dono.')
 if(c.isGroup)return c.reply('Use .limpar no privado do bot.')
 const action=(c.q||'').trim().toLowerCase()
 if(action&&!['ver','confirmar'].includes(action))return c.reply('Use .limpar ver ou .limpar confirmar.')
 const files=[]
 const age=Date.now()-24*60*60*1000
 try{
  if(fs.existsSync(root)&&fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink()){
   const log=path.join(root,'erros.log')
   if(fs.existsSync(log)){const s=fs.lstatSync(log);if(s.isFile()&&!s.isSymbolicLink())files.push({p:log,size:s.size,log:true})}
   // Only explicitly known cache directories. Never touch authentication or databases.
   const cache=path.join(root,'musicas')
   if(fs.existsSync(cache)&&fs.lstatSync(cache).isDirectory()&&!fs.lstatSync(cache).isSymbolicLink()){
    for(const e of fs.readdirSync(cache,{withFileTypes:true})){
     if(!e.isFile()||e.isSymbolicLink())continue
     if(!/\.(mp3|mp4|ogg|opus|webm|m4a|wav|part|tmp)$/i.test(e.name))continue
     const p=path.join(cache,e.name),s=fs.lstatSync(p)
     if(s.isFile()&&!s.isSymbolicLink()&&s.mtimeMs<age)files.push({p,size:s.size})
    }
   }
  }
  const bytes=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(2)+' KB'
  const total=files.reduce((n,f)=>n+f.size,0)
  if(action!=='confirmar')return c.reply('🧹 *LIMPEZA SEGURA*\n\nArquivos elegíveis: '+files.length+'\nEspaço estimado: '+bytes(total)+'\n\nLimpa o histórico de erros e cache de músicas com mais de 24h. Preserva sessões, dados, configurações, modelos de IA e mídias guardadas.\n\nUse .limpar confirmar para executar.')
  let removed=0,freed=0,failed=0
  for(const f of files){
   try{
    const s=fs.lstatSync(f.p)
    if(!s.isFile()||s.isSymbolicLink()||(!f.log&&s.mtimeMs>=age))continue
    if(f.log)fs.truncateSync(f.p,0);else fs.unlinkSync(f.p)
    removed++;freed+=s.size
   }catch{failed++}
  }
  return c.reply('🧹 *LIMPEZA CONCLUÍDA*\n\nArquivos limpos: '+removed+'\nEspaço liberado: '+bytes(freed)+'\nFalhas: '+failed+'\n\nSessões e dados preservados.')
 }catch(e){console.error('Falha no comando limpar',e);return c.reply('Não consegui concluir a limpeza. Confira .logs.')}
}}