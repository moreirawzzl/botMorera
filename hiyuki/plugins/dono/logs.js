const fs=require('node:fs'),path=require('node:path')
module.exports={name:'logs',description:'Consulta erros recentes do bot, sem dados sensíveis.',async execute(c){
 if(c.sender!==c.donoJid)return c.reply('Só o dono principal pode consultar os logs.')
 if(c.isGroup)return c.reply('Use .logs no privado do bot.')
 const file=path.resolve(__dirname,'../../database/erros.log')
 const n=Math.min(30,Math.max(1,parseInt(c.args[0],10)||15))
 if(!fs.existsSync(file))return c.reply('Nenhum erro registrado.')
 const lines=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).slice(-n)
 return c.reply('📋 *LOGS RECENTES (UTC)*\n\n'+(lines.join('\n')||'Nenhum erro registrado.'))
}}