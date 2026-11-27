import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('./',import.meta.url))
const file=new URL('./hiyuki/database/erros.log',import.meta.url)
let version='Desconhecida'
try{version=execFileSync('git',['log','-1','--format=%h%n%cI%n%s'],{cwd:root,encoding:'utf8',timeout:5000,windowsHide:true}).trim()}catch{}
global.botRuntimeVersion=version
function record(level,args){
 try{
  // Store only safe categories, not message contents, credentials or stack traces.
  const labels=['Falha no comando','Moderacao','Agenda','Pedido pendente','ERRO','Controle de sessão','Atualização','Supervisor','Conexao encerrada']
  const first=typeof args[0]==='string'?args[0]:''
  const label=labels.find(x=>first.startsWith(x))||'Erro interno'
  const code=args.find(x=>x instanceof Error)?.code
  const line=new Date().toISOString()+' | '+level+' | '+label+(/^[A-Z_0-9]{1,30}$/.test(String(code||''))?' | '+code:'')+'\n'
  fs.mkdirSync(new URL('./hiyuki/database/',import.meta.url),{recursive:true})
  if(fs.existsSync(file)&&fs.statSync(file).size>128000)fs.writeFileSync(file,fs.readFileSync(file,'utf8').split('\n').slice(-300).join('\n')+'\n')
  fs.appendFileSync(file,line)
 }catch{}
}
for(const level of ['error','warn','log']){
 const original=console[level].bind(console)
 console[level]=(...args)=>{original(...args);if(level!=='log'||/^(Falha no comando|ERRO|Agenda:|Pedido pendente:|Conexao encerrada)/.test(String(args[0])))record(level,args)}
}
process.on('uncaughtExceptionMonitor',e=>record('fatal',[e]))
