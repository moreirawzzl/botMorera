const {randomUUID}=require('node:crypto')
const {execFile}=require('node:child_process')
const {promisify}=require('node:util')
const path=require('node:path')
const exec=promisify(execFile)
async function commitMessage(){
 try{
  const {stdout}=await exec('git',['log','-1','--format=%s'],{cwd:path.resolve(__dirname,'../../..'),timeout:10000,maxBuffer:65536,windowsHide:true})
  return stdout.trim().slice(0,500)||'Sem descrição'
 }catch{return 'Descrição indisponível'}
}
let busy=false
module.exports={name:'atualizar',aliases:['pull','push'],description:'Busca a main do GitHub e reinicia o bot com segurança.',async execute(c){
 if(!c.isDono)return c.reply('Exclusivo do dono.')
 if(!process.send||process.env.BOT_SUPERVISED!=='1')return c.reply('Inicie pelo INICIAR-BOT.bat ou com npm start para habilitar a atualização remota.')
 if(busy)return c.reply('Já existe uma atualização em andamento.')
 busy=true
 try{
  await c.reply('🔄 Buscando atualizações da main. O bot reiniciará se tudo estiver certo.')
  const id=randomUUID()
  const result=await new Promise((resolve,reject)=>{
   const done=()=>{clearTimeout(timer);process.off('message',onMessage)}
   const onMessage=m=>{if(m?.type==='bot-update-result'&&m.id===id){done();resolve(m)}}
   const timer=setTimeout(()=>{done();reject(Error('Tempo limite de atualização. Confira o CMD.'))},600000)
   process.on('message',onMessage)
   process.send({type:'bot-update',id},e=>{if(e){done();reject(e)}})
  })
  if(result.error)return c.reply(result.error)
  if(!result.updated){
   if(result.ahead)return c.reply('✅ A versão remota já está incluída nesta cópia do bot. Há '+result.ahead+' commit(s) local(is) ainda não enviados ao GitHub. O comando .push atualiza a partir da main; ele não publica commits.')
   return c.reply('✅ O bot já está na versão mais recente da main. Nenhuma reinicialização foi necessária.')
  }
  const message=await commitMessage()
  await c.reply('✅ *MAIN SINCRONIZADA*\n\nCommit: '+result.version+'\nAlteração: '+message+'\n\n🔄 Reiniciando o bot...')
  setTimeout(()=>process.exit(75),500)
 }catch(e){return c.reply('Não foi possível concluir a atualização. Confira o CMD.')}finally{busy=false}
}}
