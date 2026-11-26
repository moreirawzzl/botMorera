const fs=require('node:fs'),path=require('node:path')
const {performance,monitorEventLoopDelay}=require('node:perf_hooks')
const file=path.resolve(__dirname,'../../database/desempenho.json')
let stats={count:0,total:0,best:null,last:null}
try{const s=JSON.parse(fs.readFileSync(file,'utf8'));if(Number.isFinite(s.count)&&Number.isFinite(s.total))stats=s}catch{}
let dirty=false
const lag=monitorEventLoopDelay({resolution:20});lag.enable()
const timer=setInterval(()=>{if(!dirty)return;try{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(stats));fs.renameSync(file+'.tmp',file);dirty=false}catch(e){console.error('desempenho:',e.message)}},5000);timer.unref()
function record(ms){if(!Number.isFinite(ms)||ms<0)return;stats.count++;stats.total+=ms;stats.last=ms;stats.best=stats.best===null?ms:Math.min(stats.best,ms);dirty=true}
const fmt=n=>n===null?'Sem medição':n.toFixed(1)+' ms'
module.exports={name:'ping',aliases:['desempenho','velocidade'],description:'Mede tempo de envio, recorde, média e uso de memória.',async execute(ctx){
 const start=performance.now()
 await ctx.reply('🏓 Pong!')
 const ms=performance.now()-start
 record(ms)
 const mem=process.memoryUsage().rss/1048576
 return ctx.reply('⚡ *DESEMPENHO DO BOT MOREIRA*\n\nÚltimo ping: '+fmt(stats.last)+'\n🏆 Melhor tempo: '+fmt(stats.best)+'\nMédia: '+fmt(stats.total/stats.count)+'\nTestes: '+stats.count+'\nRAM: '+mem.toFixed(1)+' MB\nAtraso do processamento (p95): '+fmt(lag.percentile(95)/1e6)+'\n\nTempo medido do envio pelo bot, não da entrega ao celular.')
}}
