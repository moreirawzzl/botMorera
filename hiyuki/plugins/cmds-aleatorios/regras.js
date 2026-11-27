const fs=require('node:fs')
const path=require('node:path')
const file=path.join(__dirname,'../../arquivos/json/regras-grupos.json')
function read(){
 try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))}
 catch(error){if(error.code!=='ENOENT')console.error('Regras:',error.message);return {}}
}
function save(data){
 fs.mkdirSync(path.dirname(file),{recursive:true})
 const tmp=file+'.tmp'
 fs.writeFileSync(tmp,JSON.stringify(data,null,2))
 fs.renameSync(tmp,file)
}
module.exports={name:'regras',description:'Mostra regras; .regras definir texto adiciona uma linha; .regras editar texto substitui.',async execute(c){
 if(!c.isGroup)return c.reply('O comando .regras só pode ser usado em grupos.')
 const acao=(c.args[0]||'').toLowerCase()
 const data=read()
 if(['definir','set','editar','add','adicionar','acrescentar'].includes(acao)){
  if(!c.isAdm&&!c.isDono)return c.reply('Somente administradores podem definir as regras do grupo.')
  const nova=c.args.slice(1).join(' ').trim()
  const anterior=typeof data[c.from]==='string'?data[c.from]:data[c.from]?.texto
  const substituir=acao==='editar'
  const texto=nova?(substituir||!anterior?nova:anterior.trimEnd()+'\n'+nova):''
  if(!texto)return c.reply('Use '+c.prefix+'regras definir texto para acrescentar ou '+c.prefix+'regras editar texto para substituir.')
  if([...texto].length>2500)return c.reply('O conjunto de regras pode ter no máximo 2.500 caracteres.')
  data[c.from]={texto,atualizadoEm:Date.now()}
  save(data)
  return c.reply('✅ '+(substituir?'Regras substituídas.':'Regra adicionada em uma nova linha.')+' Todos podem consultá-las com '+c.prefix+'regras.')
 }
 if(['remover','limpar','apagar'].includes(acao)){
  if(!c.isAdm&&!c.isDono)return c.reply('Somente administradores podem remover as regras do grupo.')
  if(!data[c.from])return c.reply('Este grupo ainda não tem regras cadastradas.')
  delete data[c.from]
  save(data)
  return c.reply('✅ Regras removidas. Um administrador pode cadastrá-las com '+c.prefix+'regras definir texto.')
 }
 const valor=data[c.from]
 const texto=typeof valor==='string'?valor:valor?.texto
 if(!texto)return c.reply('Este grupo ainda não cadastrou regras. Um administrador pode usar '+c.prefix+'regras definir texto das regras.')
 return c.reply('📜 *REGRAS DO GRUPO*\n\n'+texto)
}}
