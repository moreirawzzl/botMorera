const os=require('node:os')
const {performance}=require('node:perf_hooks')
let total=0,count=0,best=Infinity
module.exports={name:'ping',description:'Mede tempo de envio ao WhatsApp, média, recorde, memória e uptime.',async execute(c){
 const start=performance.now()
 await c.reply('🏓 Pong!')
 const ms=Math.max(1,Math.round(performance.now()-start))
 total+=ms;count++;best=Math.min(best,ms)
 const mb=n=>(n/1048576).toFixed(1)+' MB'
 const uptime=Math.floor(process.uptime())
 return c.reply('⚡ *PING DO PANELEIRO*\n\nResposta (envio): '+ms+' ms\nRecorde: '+best+' ms\nMédia: '+Math.round(total/count)+' ms\nRAM do bot: '+mb(process.memoryUsage().rss)+'\nRAM do sistema: '+mb(os.totalmem()-os.freemem())+' / '+mb(os.totalmem())+'\nOnline: '+Math.floor(uptime/3600)+'h '+Math.floor(uptime%3600/60)+'min '+uptime%60+'s')
}}