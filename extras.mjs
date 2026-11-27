import fs from 'node:fs'
import { randomInt } from 'node:crypto'
import { jidNormalizedUser } from '@whiskeysockets/baileys'
const file = new URL('./hiyuki/database/mutes.json', import.meta.url)
const read = () => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
const save = data => { const tmp = new URL(file.href+'.tmp'); fs.writeFileSync(tmp,JSON.stringify(data)); fs.renameSync(tmp,file) }
const norm = id => id ? jidNormalizedUser(id) : ''
const permissoes = new URL('./hiyuki/database/permissoes-dono.json', import.meta.url)
const autorizados = () => fs.existsSync(permissoes) ? JSON.parse(fs.readFileSync(permissoes,'utf8')) : []
export function temPermissaoDono(sender, principal) {
  return sender === principal || autorizados().includes(sender)
}
async function permissaoDono(c) {
  if (c.sender !== c.donoJid) return c.reply('Só o dono principal pode gerenciar estas permissões.')
  const [acao, argumento] = c.args
  if (acao === 'listar') {
    const lista = autorizados()
    return c.reply(lista.length ? lista.map(id => id.split('@')[0]).join('\n') : 'Nenhuma pessoa autorizada.')
  }
  const mencoes = context(c).mentionedJid || []
  let id
  if (mencoes.length === 1 && argumento?.startsWith('@')) {
    const membro = c.groupMembers.find(m => [m.id,m.lid,m.phoneNumber].some(j => norm(j) === norm(mencoes[0])))
    id = await canonical(c.columbina, membro?.phoneNumber || mencoes[0])
  } else if (!mencoes.length && /^\+?\d{10,15}$/.test(argumento || '')) {
    const n = argumento.replace(/^\+/,'')
    id = (n.length <= 11 && !argumento.startsWith('+') ? '55' : '') + n + '@s.whatsapp.net'
  }
  if (c.args.length !== 2 || !['add','remover'].includes(acao) || !/^\d+@s\.whatsapp\.net$/.test(id || '')) {
    return c.reply('Use '+c.prefix+'perm add @pessoa ou '+c.prefix+'perm remover @pessoa. Também pode informar o número com DDI.')
  }
  if (id === c.donoJid) return c.reply('O dono principal já tem acesso permanente.')
  const lista = new Set(autorizados())
  if (acao === 'add') lista.add(id)
  else lista.delete(id)
  const tmp = new URL(permissoes.href+'.tmp')
  fs.writeFileSync(tmp,JSON.stringify([...lista]))
  fs.renameSync(tmp,permissoes)
  return c.reply((acao === 'add' ? 'Acesso liberado para ' : 'Acesso retirado de ') + id.split('@')[0] + '.')
}
async function canonical(sock,id) {
  id=norm(id)
  if (id.endsWith('@lid')) return norm(await sock.signalRepository?.lidMapping?.getPNForLID?.(id) || id)
  return id
}
const names = new Map()
const authors = new Map()
export function rememberName(m) {
  const id=norm(m.key?.participant || m.key?.remoteJid)
  if (m.key?.id && m.key?.remoteJid) { const k=m.key.remoteJid+'/'+m.key.id; authors.set(k,{id:m.key.fromMe?'self':id,name:m.pushName}); if(authors.size>3000) authors.delete(authors.keys().next().value) }
  if (id && m.pushName && !m.key.fromMe) { names.set(id,m.pushName); if(names.size>3000) names.delete(names.keys().next().value) }
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
export async function quotedAuthor(ctx) {
  const c=context(ctx)
  const cached=authors.get(ctx.from+'/'+c.stanzaId)
  const id=norm(c.participant || (cached?.id==='self'?ctx.columbina.user?.id:cached?.id))
  if(!id) return {id:'',name:'Autor desconhecido'}
  const who=await canonical(ctx.columbina,id).catch(()=>id)
  const member=(ctx.groupMembers||[]).find(m=>[m.id,m.lid,m.phoneNumber].some(j=>[id,who].includes(norm(j))))
  const name=String(cached?.name||names.get(id)||names.get(who)||member?.notify||member?.name|| (norm(ctx.columbina.user?.id)===who ? ctx.columbina.user?.name : '') || 'Autor desconhecido').slice(0,60)
  return {id,name}
}
export async function quoteImage(ctx) {
  const c=context(ctx), q=c.quotedMessage
  const text=q?.conversation || q?.extendedTextMessage?.text || q?.imageMessage?.caption || q?.videoMessage?.caption
  if(!text?.trim()) return ctx.reply('Responda a uma mensagem de texto com '+ctx.prefix+'quote.')
  if([...text].length>700) return ctx.reply('Use uma mensagem de até 700 caracteres.')
  const {id,name}=await quotedAuthor(ctx)
  if(!id) return ctx.reply('Não consegui identificar o autor da mensagem.')
  const sharp=(await import('sharp')).default
  let avatar
  try { const url=await ctx.columbina.profilePictureUrl(id,'image'); if(url){const r=await fetch(url,{signal:AbortSignal.timeout(7000)}); if(r.ok){const bytes=Buffer.from(await r.arrayBuffer()); if(bytes.length<=5*1024*1024) avatar=await sharp(bytes,{limitInputPixels:20000000}).resize(176,176).composite([{input:Buffer.from('<svg width="176" height="176"><circle cx="88" cy="88" r="88" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer()}} }catch{}
  const x=avatar?260:64, width=avatar?26:34, rows=wrap(text,width), h=Math.max(360,rows.length*46+190)
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${h}"><rect width="960" height="${h}" fill="#12141a"/><rect x="26" y="26" width="908" height="${h-52}" rx="24" fill="#1c2029"/><rect x="48" y="56" width="5" height="${h-112}" rx="2" fill="#a5b4fc"/><text x="${x}" y="108" fill="#a5b4fc" font-family="DejaVu Sans,Arial,sans-serif" font-size="58">“</text>${rows.map((r,i)=>`<text x="${x}" y="${148+i*46}" fill="#ffffff" font-family="DejaVu Sans,Arial,sans-serif" font-size="33">${xml(r)}</text>`).join('')}<text x="${x}" y="${h-65}" fill="#c5c9d5" font-family="DejaVu Sans,Arial,sans-serif" font-size="23">— ${xml(name)}</text></svg>`
  let im=sharp(Buffer.from(svg)); if(avatar) im=im.composite([{input:avatar,left:64,top:Math.floor((h-176)/2)}]); await ctx.columbina.sendMessage(ctx.from,{image:await im.png().toBuffer()},{quoted:ctx.info})
}
export function registerExtras(manager) {
  manager.commands.set('perm',plugin('perm','dono','Gerencia acesso aos comandos de dono',permissaoDono))
  const list=[
    plugin('add','admin','Adiciona membro por número, menção ou resposta',async c=>{if(!c.isGroup||!admin(c))return c.reply('Somente administradores em grupos.'); if(!c.isBotAdm)return c.reply('O bot precisa ser administrador.');const id=await target(c); if(!id)return c.reply('Use '+c.prefix+'add 5511999999999 ou responda a uma mensagem.'); if(c.groupMembers.some(m=>[m.id,m.lid,m.phoneNumber].some(j=>norm(j)===id)))return c.reply('A pessoa já está no grupo.');try{const r=await c.columbina.groupParticipantsUpdate(c.from,[id],'add');return c.reply(String(r?.[0]?.status)==='200'?'Membro adicionado!':'Não foi possível adicionar. Verifique a privacidade e as permissões do WhatsApp.')}catch{return c.reply('Não foi possível adicionar esse membro.')}}),
    plugin('enquete','cmds-aleatorios','Cria enquete nativa do WhatsApp',async c=>{const [name,...values]=c.q.split('|').map(s=>s.trim()); if(!name||name.length>255||values.length<2||values.length>12||values.some(v=>!v||v.length>100)||new Set(values).size!==values.length)return c.reply('Use '+c.prefix+'enquete Pergunta | Opção 1 | Opção 2 (até 12 opções diferentes).');return c.columbina.sendMessage(c.from,{poll:{name,values,selectableCount:1}},{quoted:c.info})}),
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
