import fs from 'node:fs'
import { randomInt } from 'node:crypto'
import * as baileys from '@whiskeysockets/baileys'
const {jidNormalizedUser,normalizeMessageContent,getDevice}=baileys
const file = new URL('./hiyuki/database/mutes.json', import.meta.url)
const read = () => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
const save = data => { const tmp = new URL(file.href+'.tmp'); fs.writeFileSync(tmp,JSON.stringify(data)); fs.renameSync(tmp,file) }
const norm = id => id ? jidNormalizedUser(id) : ''
const permissoes = new URL('./hiyuki/database/permissoes-dono.json', import.meta.url)
const validOwnerId = id => /^\d+@(s\.whatsapp\.net|lid)$/.test(id)
function autorizados() {
  if (!fs.existsSync(permissoes)) return []
  const data = JSON.parse(fs.readFileSync(permissoes,'utf8').replace(/^\uFEFF/,''))
  if(!Array.isArray(data)) throw Error('Arquivo de permissões inválido.')
  return data.map(x=>Array.isArray(x)?x:[x]).map(ids=>[...new Set(ids.filter(x=>typeof x==='string').map(norm).filter(validOwnerId))]).filter(ids=>ids.length)
}
function salvarAutorizados(lista) {
  fs.mkdirSync(new URL('./hiyuki/database/',import.meta.url),{recursive:true})
  const tmp = new URL(permissoes.href+'.tmp')
  fs.writeFileSync(tmp,JSON.stringify(lista,null,2))
  fs.renameSync(tmp,permissoes)
}
async function ownerIds(sock, ids) {
  const result=new Set(ids.filter(x=>typeof x==='string').map(norm).filter(validOwnerId))
  const map=sock?.signalRepository?.lidMapping
  for(const id of [...result]){
    try {
      const alias=id.endsWith('@lid')?await map?.getPNForLID?.(id):await map?.getLIDForPN?.(id)
      if(alias&&validOwnerId(norm(alias)))result.add(norm(alias))
    }catch{}
  }
  return result
}
export async function temPermissaoDono(sender, principal, sock, key={}) {
  const principalId=norm(principal)
  if(norm(sender)===principalId)return true
  const direct=key.fromMe?[sock?.user?.id,sock?.user?.lid]:key.remoteJid?.endsWith('@g.us')?[key.participant,key.participantAlt]:[key.remoteJid,key.remoteJidAlt]
  const ids=await ownerIds(sock,[sender,...direct])
  if(ids.has(principalId))return true
  const lista=autorizados()
  const match=lista.filter(row=>row.some(id=>ids.has(id)))
  if(!match.length)return false
  const merged=[...new Set([...match.flat(),...ids])]
  if(match.length>1||merged.length!==match[0].length)salvarAutorizados([...lista.filter(row=>!match.includes(row)),merged])
  return true
}
async function permissaoDono(c) {
  if (norm(c.sender)!==norm(c.donoJid)) return c.reply('Só o dono principal pode gerenciar estas permissões.')
  const [acao, argumento] = c.args
  if (acao === 'listar') {
    const lista = autorizados()
    return c.reply(lista.length ? lista.map(ids=>ids.find(id=>id.endsWith('@s.whatsapp.net'))||ids[0]).map(id=>id.split('@')[0]).join('\n') : 'Nenhuma pessoa autorizada.')
  }
  const mencoes = context(c).mentionedJid || []
  let ids=new Set()
  if (mencoes.length === 1 && argumento?.startsWith('@')) {
    const membro = c.groupMembers.find(m => [m.id,m.lid,m.phoneNumber].some(j => norm(j) === norm(mencoes[0])))
    ids=await ownerIds(c.columbina,[mencoes[0],membro?.id,membro?.lid,membro?.phoneNumber])
  } else if (!mencoes.length && /^\+?\d{10,15}$/.test(argumento || '')) {
    const n = argumento.replace(/^\+/,'')
    ids=await ownerIds(c.columbina,[(n.length<=11&&!argumento.startsWith('+')?'55':'')+n+'@s.whatsapp.net'])
  }
  if (c.args.length !== 2 || !['add','remover'].includes(acao) || !ids.size) return c.reply('Use '+c.prefix+'perm add @pessoa ou '+c.prefix+'perm remover @pessoa. Também pode informar o número com DDI.')
  if(ids.has(norm(c.donoJid)))return c.reply('O dono principal já tem acesso permanente.')
  const lista=autorizados(),matched=lista.filter(row=>row.some(id=>ids.has(id)))
  const next=lista.filter(row=>!matched.includes(row))
  if(acao==='add')next.push([...new Set([...ids,...matched.flat()])])
  salvarAutorizados(next)
  const id=[...ids].find(x=>x.endsWith('@s.whatsapp.net'))||[...ids][0]
  return c.reply((acao==='add'?'Acesso permanente salvo para ':'Acesso retirado de ')+id.split('@')[0]+'.')
}
async function canonical(sock,id) {
  id=norm(id)
  if (id.endsWith('@lid')) return norm(await sock.signalRepository?.lidMapping?.getPNForLID?.(id) || id)
  return id
}
const names=new Map(),authors=new Map()
const cleanName=x=>typeof x==='string'&&!/^@?\d+(?:@.*)?$/.test(x.trim())?x.trim().replace(/[\r\n]/g,' ').slice(0,60):''
function cacheName(id,name,priority=1){
 id=norm(id);name=cleanName(name)
 if(!id||!name||(names.get(id)?.priority||0)>priority)return
 names.set(id,{name,priority})
 if(names.size>10000)names.delete(names.keys().next().value)
}
export function rememberContacts(rows){
 for(const c of rows||[])for(const id of [c.id,c.lid,c.phoneNumber])cacheName(id,c.name||c.notify||c.verifiedName,c.name?3:2)
}
export function rememberName(m){
 const k=m.key||{},ids=[k.participant,k.participantAlt,...(!k.remoteJid?.endsWith('@g.us')&&!k.fromMe?[k.remoteJid,k.remoteJidAlt]:[])].filter(Boolean).map(norm)
 if(!k.fromMe)for(const id of ids)cacheName(id,m.pushName)
 if(k.id&&k.remoteJid){authors.set(k.remoteJid+'/'+k.id,{id:k.fromMe?'self':ids[0],name:cleanName(m.pushName),aliases:ids});if(authors.size>5000)authors.delete(authors.keys().next().value)}
}
function platform(id){
 if(!id||typeof getDevice!=='function')return 'Não identificado'
 try{return ({android:'Android',ios:'iOS / iPhone',web:'WhatsApp Web',desktop:'WhatsApp Desktop'})[getDevice(id)]||'Não identificado'}catch{return 'Não identificado'}
}
export async function resolveName(ctx,id,extra=[]){
 const ids=await ownerIds(ctx.columbina,[id,...extra])
 const member=(ctx.groupMembers||[]).find(m=>[m.id,m.lid,m.phoneNumber].some(x=>ids.has(norm(x))))
 const cached=[...ids].map(x=>names.get(x)).filter(Boolean).sort((a,b)=>b.priority-a.priority)[0]
 const self=[ctx.columbina.user?.id,ctx.columbina.user?.lid].some(x=>ids.has(norm(x)))
 return cleanName(member?.name)||(cached?.priority===3?cached.name:'')||cleanName(member?.notify)||cached?.name||(self?cleanName(ctx.columbina.user?.name):'')||''
}
async function readableQuote(ctx,text,q){
 const info=q?.extendedTextMessage?.contextInfo||q?.imageMessage?.contextInfo||q?.videoMessage?.contextInfo||{}
 for(const id of info.mentionedJid||[]){
  const name=await resolveName(ctx,id),raw=norm(id).split('@')[0]
  if(/^\d+$/.test(raw))text=text.replace(new RegExp('@'+raw+'(?!\\d)','g'),()=>name?'@'+name:'@Contato')
 }
 return text.replace(/([*_~])(?=\S)(.+?)\1/g,'$2').replace(/@(\d{10,})(?!\d)/g,'@Contato')
}
export async function muted(sock,key,sender) {
  const data=read(), now=Date.now()
  const ids=new Set([sender,key.participant,key.participantAlt,key.remoteJidAlt].filter(Boolean).map(norm))
  if(sender.endsWith('@s.whatsapp.net')) { const lid=await sock.signalRepository?.lidMapping?.getLIDForPN?.(sender); if(lid) ids.add(norm(lid)) }
  return [...ids].some(id=>['global',key.remoteJid].some(scope=>{const v=data[scope]?.[id]; return v===0 || v>now}))
}
function context(ctx) { return ctx.info.message?.extendedTextMessage?.contextInfo || ctx.info.message?.imageMessage?.contextInfo || {} }
async function target(ctx) {
  const c=context(ctx)
  let id=c.mentionedJid?.[0] || c.participant
  if(!id && ctx.args[0] && /^\+?\d{10,15}$/.test(ctx.args[0])) { let n=ctx.args[0].replace(/^\+/,''); if(n.length===10||n.length===11) n='55'+n; id=n+'@s.whatsapp.net' }
  if(!id) return ''
  const member=ctx.groupMembers.find(m=>[m.id,m.lid,m.phoneNumber].some(j=>norm(j)===norm(id)))
  return canonical(ctx.columbina, member?.phoneNumber || id)
}
function plugin(name,category,description,execute,aliases=[]) {return {name,category,description,execute,aliases}}
const admin = ctx => ctx.isDono || (ctx.isGroup && ctx.isAdm)
const xml = s=>String(s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))
function wrap(s,width) {
  const rows=[]; for(const p of s.split(/\r?\n/)) { let line=''; for(const w of p.split(/\s+/)) { for(const part of (w.match(new RegExp('.{1,'+width+'}','gu')) || [''])) { if(line && [...line+' '+part].length>width) {rows.push(line); line=''} line+=(line?' ':'')+part } } rows.push(line) } return rows
}
export async function quotedAuthor(ctx){
 const c=context(ctx),cached=authors.get(ctx.from+'/'+c.stanzaId)
 const id=norm(cached?.id==='self'?ctx.columbina.user?.id:c.participant||cached?.id||(!ctx.isGroup?ctx.from:''))
 if(!id)return {id:'',name:'Autor desconhecido',device:platform(c.stanzaId)}
 return {id,name:await resolveName(ctx,id,cached?.aliases||[])||cached?.name||'Autor desconhecido',device:platform(c.stanzaId)}
}
export async function quoteImage(ctx){
 const c=context(ctx),q=normalizeMessageContent?.(c.quotedMessage)||c.quotedMessage
 const raw=q?.conversation||q?.extendedTextMessage?.text||q?.imageMessage?.caption||q?.videoMessage?.caption
 if(!raw?.trim())return ctx.reply('Responda a uma mensagem de texto com '+ctx.prefix+'quote.')
 if([...raw].length>700)return ctx.reply('Use uma mensagem de até 700 caracteres.')
 const {id,name,device}=await quotedAuthor(ctx)
 if(!id)return ctx.reply('Não consegui identificar o autor da mensagem.')
 const text=await readableQuote(ctx,raw,q)
  const sharp=(await import('sharp')).default
  let avatar
  try { const url=await ctx.columbina.profilePictureUrl(id,'image'); if(url){const r=await fetch(url,{signal:AbortSignal.timeout(7000)}); if(r.ok){const bytes=Buffer.from(await r.arrayBuffer()); if(bytes.length<=5*1024*1024) avatar=await sharp(bytes,{limitInputPixels:20000000}).resize(176,176).composite([{input:Buffer.from('<svg width="176" height="176"><circle cx="88" cy="88" r="88" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer()}} }catch{}
  const x=avatar?260:64, width=avatar?26:34, rows=wrap(text,width), h=Math.max(360,rows.length*46+250)
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${h}"><rect width="960" height="${h}" fill="#12141a"/><rect x="26" y="26" width="908" height="${h-52}" rx="24" fill="#1c2029"/><rect x="48" y="56" width="5" height="${h-112}" rx="2" fill="#a5b4fc"/><text x="${x}" y="108" fill="#a5b4fc" font-family="DejaVu Sans,Arial,sans-serif" font-size="58">“</text>${rows.map((r,i)=>`<text x="${x}" y="${148+i*46}" fill="#ffffff" font-family="DejaVu Sans,Arial,sans-serif" font-size="33">${xml(r)}</text>`).join('')}<text x="${x}" y="${h-85}" fill="#c5c9d5" font-family="DejaVu Sans,Arial,sans-serif" font-size="23">— ${xml(name)}</text><text x="${x}" y="${h-52}" fill="#929bad" font-family="DejaVu Sans,Arial,sans-serif" font-size="19">${xml(device==="Não identificado"?"Dispositivo não identificado":"Plataforma estimada: "+device)}</text></svg>`
  let im=sharp(Buffer.from(svg)); if(avatar) im=im.composite([{input:avatar,left:64,top:Math.floor((h-176)/2)}]); await ctx.columbina.sendMessage(ctx.from,{image:await im.png().toBuffer()},{quoted:ctx.info})
}
export function registerExtras(manager) {
  manager.commands.set('perm',plugin('perm','dono','Gerencia acesso aos comandos de dono',permissaoDono))
  const list=[
    plugin('add','admin','Adiciona membro ou envia convite privado quando a adição é bloqueada',async c=>{
      if(!c.isGroup||!admin(c))return c.reply('Somente administradores em grupos.')
      if(!c.isBotAdm)return c.reply('O bot precisa ser administrador.')
      const id=await target(c)
      if(!validOwnerId(id))return c.reply('Use '+c.prefix+'add 5511999999999 ou responda a uma mensagem.')
      const ids=await ownerIds(c.columbina,[id])
      if(c.groupMembers.some(m=>[m.id,m.lid,m.phoneNumber].some(j=>ids.has(norm(j)))))return c.reply('A pessoa já está no grupo.')
      let result
      try{result=(await c.columbina.groupParticipantsUpdate(c.from,[id],'add'))?.[0]}
      catch{return c.reply('Não consegui adicionar. Verifique a conexão e as permissões do bot.')}
      const status=String(result?.status)
      if(status==='200')return c.reply('✅ Membro adicionado!')
      if(status==='409')return c.reply('A pessoa já está no grupo.')
      if(!['403','408','401'].includes(status))return c.reply('Não foi possível adicionar (status '+status+'). Verifique o número e as permissões.')
      // One private invitation per explicit administrator request; never retry automatically.
      try{
        const code=await c.columbina.groupInviteCode(c.from)
        if(!code||!/^[A-Za-z0-9_-]+$/.test(code))throw Error('Convite indisponível')
        const meta=await c.columbina.groupMetadata(c.from)
        await c.columbina.sendMessage(id,{text:'👋 Você recebeu um convite de um administrador para entrar no grupo '+(meta.subject||'do WhatsApp')+'.\n\nhttps://chat.whatsapp.com/'+code+'\n\nEntre apenas se desejar.'})
        return c.reply('✅ O WhatsApp não permitiu adicionar diretamente. Convite enviado no privado da pessoa.')
      }catch{return c.reply('Não foi possível adicionar nem enviar o convite privado. Verifique as permissões do grupo e do contato.')}
    }),
    plugin('enquete','cmds-aleatorios','Cria enquete nativa do WhatsApp',async c=>{const [name,...values]=c.q.split('|').map(s=>s.trim()); if(!name||name.length>255||values.length<2||values.length>12||values.some(v=>!v||v.length>100)||new Set(values).size!==values.length)return c.reply('Use '+c.prefix+'enquete Pergunta | Opção 1 | Opção 2 (até 12 opções diferentes).');return c.columbina.sendMessage(c.from,{poll:{name,values,selectableCount:1}},{quoted:c.info})}),
    plugin('device','cmds-aleatorios','Estima a plataforma de uma mensagem citada.',async c=>{
      const q=context(c)
      if(!q.stanzaId||!q.quotedMessage)return c.reply('Responda a uma mensagem com '+c.prefix+'device.')
      const {name,device}=await quotedAuthor(c)
      return c.reply('📱 *DISPOSITIVO DA MENSAGEM*\n\nAutor: '+name+'\nPlataforma estimada: '+device+'\n\nEstimativa pelo identificador da mensagem, não pelo modelo do aparelho.')
    }),
    plugin('quote','cmds-aleatorios','Cria imagem de uma mensagem citada',quoteImage,['frase']),
    ...['mute','unmute','mutados'].map(action=>plugin(action,action==='mutados'?'admin':'dono',({mute:'Bloqueia comandos do bot',unmute:'Desbloqueia comandos',mutados:'Lista usuários bloqueados'})[action],async c=>{
      if(action!=='mutados'&&c.sender!==c.donoJid)return c.reply('Somente o dono principal pode bloquear ou desbloquear usuários.'); if(!admin(c))return c.reply('Comando exclusivo de administradores.'); const global=c.args.includes('global')||!c.isGroup; if(global&&!c.isDono)return c.reply('Só o dono pode bloquear globalmente.'); const scope=global?'global':c.from; const data=read(), entries=data[scope]||{};
      if(action==='mutados'){const active=Object.entries(entries).filter(([,v])=>v===0||v>Date.now());return c.reply(active.length?'🔇 Bloqueados ('+scope.replace(c.from,'grupo')+'):\n'+active.map(([id,v])=>id.split('@')[0]+' — '+(v===0?'permanente':new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))).join('\n'):'Nenhum usuário bloqueado.');}
      const id=await target(c); if(!id)return c.reply('Marque uma pessoa, informe o número ou responda à mensagem.'); if(id===c.donoJid||id===await canonical(c.columbina,c.columbina.user?.id))return c.reply('Não é possível bloquear o dono ou o bot.');
      if(action==='unmute'){delete entries[id]; data[scope]=entries;save(data);return c.reply('Usuário desbloqueado neste escopo.');}
      const duration=c.args.find(a=>/^\d+[mhd]$/i.test(a)); const invalid=c.args.filter(a=>a!=='global'&&!a.startsWith('@')&&!/^\+?\d{10,15}$/.test(a)&&a!==duration); if(invalid.length)return c.reply('Tempo inválido. Use 10m, 2h ou 7d.'); let expires=0; if(duration){const n=Number(duration.slice(0,-1));const ms=n*({m:60000,h:3600000,d:86400000}[duration.slice(-1).toLowerCase()]); if(!Number.isSafeInteger(ms)||ms<60000||ms>365*86400000)return c.reply('Use um prazo de 1 minuto a 365 dias.'); expires=Date.now()+ms;} entries[id]=expires; data[scope]=entries;save(data);return c.reply('🔇 Usuário bloqueado '+(global?'globalmente':'neste grupo')+' '+(duration?'por '+duration:'até o desbloqueio')+'.');
    }))
  ]; for(const p of list){manager.commands.set(p.name,p);for(const a of p.aliases)manager.commands.set(a,{...p,name:a,isAlias:true,originalName:p.name})}
}
