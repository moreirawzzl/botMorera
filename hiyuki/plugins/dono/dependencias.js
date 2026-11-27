const fs=require('node:fs'),path=require('node:path')
const {execFile}=require('node:child_process'),{promisify}=require('node:util')
const exec=promisify(execFile)
const root=path.resolve(__dirname,'../../..')
let busy=false
const opts={cwd:root,timeout:8000,windowsHide:true,maxBuffer:256*1024,env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}}
const line=(ok,label,detail='')=>(ok?'✅':'❌')+' '+label+(detail?' — '+detail:'')
async function probe(exes,args){
 for(const exe of [...new Set(exes.filter(Boolean))]){
  try{const {stdout,stderr}=await exec(exe,args,opts);return {ok:true,version:(stdout||stderr).trim().split(/\r?\n/)[0].slice(0,100)}}catch{}
 }
 return {ok:false,version:''}
}
function winget(prefix,exe){
 const local=process.env.LOCALAPPDATA;if(!local)return []
 const base=path.join(local,'Microsoft','WinGet')
 const out=[path.join(base,'Links',exe)]
 try{for(const name of fs.readdirSync(path.join(base,'Packages')).filter(n=>n.startsWith(prefix))){
  const dir=path.join(base,'Packages',name)
  out.push(path.join(dir,exe),path.join(dir,'bin',exe))
  for(const e of fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()))out.push(path.join(dir,e.name,'bin',exe))
 }}catch{}
 return out.filter(p=>fs.existsSync(p))
}
function packageVersion(name){
 try{
  const filename=path.join(root,'node_modules',...name.split('/'),'package.json')
  const d=JSON.parse(fs.readFileSync(filename,'utf8'))
  return d.version||'instalado'
 }catch{return null}
}
module.exports={name:'dependencias',description:'Verifica dependências Node, Python e ferramentas do bot.',async execute(c){
 if(!c.isDono)return c.reply('Exclusivo do dono.')
 if(busy)return c.reply('Já existe uma verificação em andamento.')
 busy=true
 try{
  await c.reply('🔍 Verificando dependências, sem instalar ou alterar arquivos...')
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
  const names=[...new Set([...Object.keys(pkg.dependencies||{}),'qrcode','node-webpmux'])]
  const node=names.map(n=>{const v=packageVersion(n);return line(Boolean(v),n,v||'não encontrado')})
  const win=process.platform==='win32'
  const python=process.env.PANELEIRO_PYTHON||(win?'py':'python3')
  const pyargs=win&&python==='py'?['-3.12']:[]
  const pyNames={whisper:'openai-whisper',torch:'torch',PIL:'Pillow',pypdf:'pypdf',zxingcpp:'zxing-cpp',rembg:'rembg'}
  let pyLines=[]
  try{
   const code='import importlib.util as u, importlib.metadata as m, json, sys\np=json.loads(sys.argv[1])\nr={}\nfor k,v in p.items():\n try: r[k]=m.version(v) if u.find_spec(k) else None\n except Exception: r[k]=None\nprint(json.dumps({"python":sys.version.split()[0],"packages":r}))'
   const {stdout}=await exec(python,[...pyargs,'-c',code,JSON.stringify(pyNames)],opts)
   const data=JSON.parse(stdout)
   pyLines=[line(true,'Python',data.python),...Object.entries(pyNames).map(([k,n])=>line(Boolean(data.packages[k]),n,data.packages[k]||'não encontrado'))]
  }catch{pyLines=[line(false,'Python','não respondeu; pacotes não verificados')]}
  const tools=[
   ['Git',['git'],['--version']],
   ['FFmpeg',['ffmpeg',...winget('Gyan.FFmpeg_','ffmpeg.exe')],['-version']],
   ['FFprobe',['ffprobe',...winget('Gyan.FFmpeg_','ffprobe.exe')],['-version']],
   ['yt-dlp',[process.env.YTDLP_PATH,'yt-dlp',...winget('yt-dlp.yt-dlp_','yt-dlp.exe')],['--version']],
   ['Tesseract',[process.env.TESSERACT_PATH,'tesseract',win?'C:\\Program Files\\Tesseract-OCR\\tesseract.exe':null],['--version']]
  ]
  const toolLines=[]
  for(const [label,exes,args] of tools){const r=await probe(exes,args);toolLines.push(line(r.ok,label,r.version||'não respondeu'))}
  let translation='❌ LibreTranslate — não configurado'
  if(process.env.LIBRETRANSLATE_URL){
   try{const u=new URL('languages',process.env.LIBRETRANSLATE_URL.replace(/\/?$/,'/'));const r=await fetch(u,{signal:AbortSignal.timeout(5000)});const d=r.ok?await r.json():null;translation=Array.isArray(d)?line(true,'LibreTranslate',d.map(x=>x.code).join(', ')):line(false,'LibreTranslate','resposta inválida')}
   catch{translation=line(false,'LibreTranslate','servidor indisponível')}
  }
  const all=[...node,...pyLines,...toolLines,translation]
  return c.reply('🧰 *DEPENDÊNCIAS DO PANELEIRO*\n\n*NODE '+process.version+'*\n'+node.join('\n')+'\n\n*PYTHON*\n'+pyLines.join('\n')+'\n\n*FERRAMENTAS*\n'+toolLines.join('\n')+'\n'+translation+'\n\nVerificações positivas: '+all.filter(x=>x.startsWith('✅')).length+'/'+all.length+'\nPacotes conferidos por presença/versão; não é teste de conversão ou transcrição. Nenhuma instalação realizada.')
 }catch(e){console.error('Falha no comando dependencias',e.message);return c.reply('Não consegui concluir a verificação. Confira .logs.')}
 finally{busy=false}
}}