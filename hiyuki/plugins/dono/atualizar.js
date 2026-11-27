const {randomUUID}=require('node:crypto')
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
  await c.reply('✅ Main sincronizada: '+result.version+'. Reiniciando o bot...')
  setTimeout(()=>process.exit(75),500)
 }catch(e){return c.reply('Não foi possível concluir a atualização. Confira o CMD.')}finally{busy=false}
}}
