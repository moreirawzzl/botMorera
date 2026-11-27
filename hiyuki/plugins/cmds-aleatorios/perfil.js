const fs=require('node:fs')
const path=require('node:path')
const {members,match}=require('../../arquivos/js/resenhaMembros')
const database=path.join(__dirname,'../../database')
const normalize=id=>typeof id==='string'?id.replace(/:\d+@/,'@'):''
function read(name,fallback={}){
 try{return JSON.parse(fs.readFileSync(path.join(database,name),'utf8').replace(/^\uFEFF/,''))}
 catch{return fallback}
}
function aliasesFor(obj,aliases){
 return [...new Set(aliases.map(normalize).filter(Boolean))].filter(id=>Object.hasOwn(obj||{},id))
}
function numeric(obj,aliases){
 const values=aliasesFor(obj,aliases).map(id=>Number(obj[id])).filter(n=>Number.isFinite(n)&&n>=0)
 return values.length?Math.max(...values):0
}
module.exports={name:'perfil',description:'Mostra estatísticas suas ou de uma pessoa marcada.',async execute(c){
 const info=c.info.message?.extendedTextMessage?.contextInfo||c.info.message?.imageMessage?.contextInfo||{}
 const mentioned=info.mentionedJid||[]
 if(mentioned.length>1)return c.reply('Marque apenas uma pessoa para consultar o perfil.')
 if(c.args.length&&!mentioned.length&&!info.participant)return c.reply('Marque uma pessoa ou responda à mensagem dela. Ex.: '+c.prefix+'perfil @pessoa')
 const requested=mentioned[0]||info.participant||c.sender
 let target,aliases
 if(c.isGroup){
  const rows=await members(c)
  target=await match(c,rows,requested)
  if(!target)return c.reply('Não encontrei essa pessoa no grupo.')
  aliases=[...new Set([target.id,...target.aliases].map(normalize).filter(Boolean))]
 }else{
  aliases=[c.sender,c.info.key.remoteJidAlt,c.info.key.participantAlt].map(normalize).filter(Boolean)
  target={id:c.sender,aliases}
 }
 const pointData=read('jogo-da-velha.json',{pontos:{}})
 const points=numeric(pointData.pontos,aliases)
 const labelId=target.aliases?.find(id=>id.endsWith('@s.whatsapp.net'))||target.id
 const lines=['👤 *PERFIL DE '+(c.isGroup?'@'+labelId.split('@')[0]:'VOCÊ')+'*','🎮 Pontos de jogo: *'+points.toLocaleString('pt-BR')+'*']
 const mentions=[]
 if(c.isGroup){
  const auraData=read('aura-jogo.json',{})
  const players=auraData[c.from]?.players||{}
  const auraKeys=aliasesFor(players,aliases)
  const aura=auraKeys.length?Math.max(...auraKeys.map(id=>Number(players[id]?.score)||0)):1000
  const cornoData=read('ranking-corno.json',{})
  const corno=numeric(cornoData[c.from],aliases)
  const messagesData=read('rankinggrupo.json',{})
  const messages=numeric(messagesData[c.from],aliases)
  lines.push('⚡ Aura: *'+aura.toLocaleString('pt-BR')+'*'+(!auraKeys.length?' (saldo inicial)':''))
  lines.push('🤠 Pontos de corno: *'+corno.toLocaleString('pt-BR')+'*')
  lines.push('💬 Mensagens registradas: *'+messages.toLocaleString('pt-BR')+'*')
  mentions.push(labelId)
 }else{
  lines.push('_Use .perfil dentro de um grupo para ver aura, pontos de corno e atividade._')
 }
 return c.columbina.sendMessage(c.from,{text:lines.join('\n'),mentions},{quoted:c.info})
}}
