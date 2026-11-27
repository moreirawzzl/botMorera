import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('./',import.meta.url))
const exec=promisify(execFile)
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}
let stopping=false,child,busy=false
const git=async(...args)=>(await exec('git',args,{cwd:root,env,timeout:120000,maxBuffer:1024*1024,windowsHide:true})).stdout.trim()
async function update(){
 if(await git('branch','--show-current')!=='main')throw Error('A branch local precisa ser main.')
 if(await git('status','--porcelain','--untracked-files=no'))throw Error('Existem alterações locais rastreadas. Atualização cancelada para preservar seus arquivos.')
 await git('fetch','origin','main')
 await git('merge-base','--is-ancestor','HEAD','FETCH_HEAD')
 const before=await git('rev-parse','HEAD')
 await git('merge','--ff-only','FETCH_HEAD')
 const after=await git('rev-parse','HEAD')
 if(before!==after){
  const args=['install','--no-save','--package-lock=false','--no-audit','--no-fund','qrcode','node-webpmux']
  if(process.platform==='win32')await exec(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm '+args.join(' ')],{cwd:root,env,timeout:300000,windowsHide:true})
  else await exec('npm',args,{cwd:root,env,timeout:300000})
 }
 return after.slice(0,8)
}
function launch(){
 if(stopping)return
 child=spawn(process.execPath,[fileURLToPath(new URL('./bot.mjs',import.meta.url))],{cwd:root,env:{...process.env,BOT_SUPERVISED:'1'},stdio:['inherit','inherit','inherit','ipc']})
 const current=child
 current.on('message',async m=>{
  if(m?.type!=='bot-update'||typeof m.id!=='string')return
  const reply=data=>{if(current.connected)current.send({type:'bot-update-result',id:m.id,...data},()=>{})}
  if(busy)return reply({error:'Já existe uma atualização em andamento.'})
  busy=true
  try{reply({version:await update()})}catch(e){console.error('Atualização:',e.message);reply({error:'Não foi possível atualizar com segurança. Confira o CMD (branch, conflitos, rede ou dependências). Nenhum reset foi executado.'})}finally{busy=false}
 })
 current.on('error',e=>console.error('Supervisor:',e.message))
 current.on('exit',(code,signal)=>{
  if(stopping)return
  if(code===75){setTimeout(launch,1200);return}
  console.log('Bot encerrado:',code,signal||'')
  process.exitCode=code||0
 })
}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;if(child&&!child.killed)child.kill();})
launch()
