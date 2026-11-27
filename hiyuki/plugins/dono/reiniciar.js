module.exports={name:'reiniciar',description:'Reinicia o bot pelo supervisor sem atualizar.',async execute(c){
 if(!c.isDono)return c.reply('Exclusivo do dono.')
 if(!process.send||process.env.BOT_SUPERVISED!=='1'){
  if(process.env.pm_id){await c.reply('Reiniciando o bot...');setTimeout(()=>process.exit(0),500);return}
  return c.reply('Inicie pelo novo INICIAR-BOT.bat para habilitar o reinício remoto.')
 }
 await c.reply('🔄 Reiniciando o bot...')
 setTimeout(()=>process.exit(75),500)
}}
