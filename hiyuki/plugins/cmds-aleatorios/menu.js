const labels = {
 fig:'🖼️ FIGURINHAS', jogos:'🎮 JOGOS E PONTOS', geral:'📌 COMANDOS GERAIS',
 admin:'🛡️ ADMINISTRAÇÃO', dono:'👑 DONO', resenha:'😂 RESENHA', premium:'💎 PREMIUM',
 downloads:'📥 DOWNLOADS', efeitos:'✨ EFEITOS', midias:'📷 MÍDIAS', 'inteligencia-ia':'🤖 IA', rpg:'⚔️ RPG', menu:'📋 OUTROS MENUS'
}
const fig = new Set(['fig','sticker','s','figaudio','figfrase','togif','toimg','figu','figurinha','quote','frase'])
const jogos = new Set(['velha','ranking','pontos','jogodavelha','addpontos','tirarpontos'])
const ordem = Object.keys(labels)
module.exports = {
 name:'menu', description:'Menu organizado por categorias',
 async execute(ctx) {
  const {prefix,reply,commandManager,isDono,isAdm} = ctx
  const grupos = new Map(ordem.map(k=>[k,[]]))
  for(const c of commandManager.ObterTodosComandos()){
   if(c.isAlias || c.name==='menu') continue
   if(c.category==='dono'&&!isDono || c.category==='admin'&&!isAdm) continue
   const cat = c.category==='cmds-aleatorios' ? (fig.has(c.name)?'fig':jogos.has(c.name)?'jogos':'geral') : c.category
   if(!grupos.has(cat)) grupos.set(cat,[])
   grupos.get(cat).push(c)
  }
  const aliases={figurinha:'fig',figurinhas:'fig',comandos:'geral',gerais:'geral',jogo:'jogos'}
  const arg=(ctx.args[0]||'').toLowerCase()
  const filtro=aliases[arg]||arg
  if(filtro&&!grupos.has(filtro)) return reply('Use '+prefix+'menu ou '+prefix+'menu figurinhas / geral / jogos / admin / dono / resenha')
  const sections=[]
  for(const [cat,commands] of grupos){
   if(!commands.length || filtro&&filtro!==cat) continue
   commands.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
   const lines=commands.map(c=>'│ '+prefix+c.name+(c.name==='figfrase'?' [estilo]':'')+(c.name==='figfrase'?' — Texto em figurinha':''))
   if(commands.some(c=>c.name==='figfrase')) lines.push('│   branco • preto • neon • gold','│   vidro • transparente • piscar','│   arcoiris • glitch • neon animado')
   sections.push('╭─ *'+(labels[cat]||cat.toUpperCase())+'*\n'+lines.join('\n')+'\n╰────────────')
  }
  return reply(['╔══ *BOT MOREIRA* ══╗','🟢 Online  •  Prefixo: '+prefix,'📂 '+prefix+'menu figurinhas | geral | jogos',...sections,'Base Hiyuki • MisheruModz'].join('\n\n'))
 }
}
