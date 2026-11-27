module.exports={name:'versao',description:'Mostra o commit em execução e sua data.',async execute(c){
 const [hash,date,...msg]=(global.botRuntimeVersion||'Desconhecida').split('\n')
 const d=new Date(date)
 return c.reply('🤖 *VERSÃO DO BOT*\n\nCommit: '+hash+'\nData do commit: '+(Number.isNaN(d.getTime())?'Não informada':d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))+' (Brasília)\nAlteração: '+(msg.join(' ')||'Não informada')+'\nUptime: '+Math.floor(process.uptime()/60)+' min')
}}