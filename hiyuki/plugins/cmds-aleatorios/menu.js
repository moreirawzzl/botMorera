const labels = {
 musicas:'🎵 MÚSICAS', fig:'🖼️ FIGURINHAS', jogos:'🎮 JOGOS E PONTOS', geral:'📌 COMANDOS GERAIS',
 admin:'🛡️ ADMINISTRAÇÃO', dono:'👑 DONO', resenha:'😂 RESENHA', premium:'💎 PREMIUM',
 downloads:'📥 DOWNLOADS', efeitos:'✨ EFEITOS', midias:'📷 MÍDIAS', 'inteligencia-ia':'🤖 IA', rpg:'⚔️ RPG', menu:'📋 OUTROS MENUS'
}
const fig = new Set(['fig','sticker','s','figaudio','figfrase','togif','toimg','figu','figurinha','quote','frase'])
const musicas = new Set(['play','spotify'])
const jogos = new Set(['velha','ranking','pontos','jogodavelha','addpontos','tirarpontos'])
const ordem = Object.keys(labels)
const descriptions = {
  ping:'Mede o tempo de resposta, recorde, média e memória do bot.',
  play:'Pesquisa cinco vídeos por nome ou link. Use .play nome/mp3 ou nome/mp4; escolha pelo número.',
  spotify:'Pesquisa até cinco faixas e envia link e prévia quando disponível. Ex.: .spotify nome da música',
  limparmusicas:'Limpa pesquisas e arquivos locais de músicas.',
  "info": "Mostra informações do bot.",
  "provavel": "Sorteia uma porcentagem. Ex.: .provavel ganhar hoje",
  "enquete": "Cria enquete. Ex.: .enquete Pergunta | Sim | Não",
  "sticker": "Transforma foto ou vídeo marcado em figurinha.",
  "fig": "Cria uma figurinha de mídia.",
  "figaudio": "Cria figurinha com áudio a partir de vídeo.",
  "figfrase": "Transforma texto marcado em figurinha quadrada. Ex.: .figfrase neon",
  "togif": "Converte figurinha em GIF.",
  "toimg": "Converte figurinha em imagem.",
  "frase": "Transforma mensagem marcada em imagem de citação.",
  "quote": "Cria imagem de citação.",
  "velha": "Desafia alguém ou joga uma casa de 1 a 9. Ex.: .velha @pessoa",
  "ranking": "Mostra a classificação dos jogadores.",
  "pontos": "Consulta saldo de pontos.",
  "add": "Adiciona membro ao grupo pelo número ou mensagem marcada.",
  "ban": "Remove membro do grupo.",
  "mute": "Bloqueia acesso aos comandos do bot. Ex.: .mute @pessoa 10m",
  "unmute": "Libera acesso ao bot.",
  "mutados": "Lista usuários bloqueados.",
  "promover": "Torna membro administrador.",
  "rebaixar": "Retira cargo de administrador.",
  "apagar": "Apaga a mensagem marcada, conforme permissões.",
  "marcar": "Marca membros do grupo.",
  "grupo": "Gerencia abertura e fechamento do grupo.",
  "bemvindo": "Configura mensagens de boas-vindas.",
  "addpontos": "Adiciona pontos. Ex.: .addpontos 100",
  "tirarpontos": "Retira pontos. Ex.: .tirarpontos 50",
  "limparfotos": "Remove fotos guardadas pelo bot.",
  "limparfigurinhas": "Remove figurinhas armazenadas na pasta de mídias.",
  "limparmidias": "Remove fotos e figurinhas armazenadas.",
  "limparpedidos": "Limpa pedidos pendentes de figurinha com áudio.",
  "agendar": "Programa envio de mensagem.",
  "botligar": "Reativa os comandos do bot.",
  "botdesligar": "Desativa os comandos para outros usuários.",
  "gerarlink": "Gera link de uma mídia.",
  "premium": "Gerencia acesso premium.",
  "resenha": "Ativa ou desativa modo resenha.",
  "setprefix": "Altera o prefixo do bot.",
  "setprefixgp": "Altera o prefixo do grupo.",
  "sair": "Faz o bot sair do grupo.",
  "getquoted": "Mostra informações da mensagem marcada.",
  "guardarfoto": "Guarda foto enviada por você.",
  "minhafoto": "Exibe sua foto guardada."
}
module.exports = {
 name:'menu', description:'Menu organizado por categorias',
 async execute(ctx) {
  const {prefix,reply,commandManager,isDono,isAdm} = ctx
  const grupos = new Map(ordem.map(k=>[k,[]]))
  for(const c of commandManager.ObterTodosComandos()){
   if(c.isAlias || c.name==='menu') continue
   if(c.category==='dono'&&!isDono || c.category==='admin'&&!isAdm) continue
   const cat = c.category==='cmds-aleatorios' ? (musicas.has(c.name)?'musicas':fig.has(c.name)?'fig':jogos.has(c.name)?'jogos':'geral') : c.category
   if(!grupos.has(cat)) grupos.set(cat,[])
   grupos.get(cat).push(c)
  }
  const aliases={musica:'musicas','música':'musicas','músicas':'musicas',figurinha:'fig',figurinhas:'fig',comandos:'geral',gerais:'geral',jogo:'jogos'}
  const arg=(ctx.args[0]||'').toLowerCase()
  const filtro=aliases[arg]||arg
  if(filtro&&!grupos.has(filtro)) return reply('Use '+prefix+'menu ou '+prefix+'menu figurinhas / geral / jogos / admin / dono / resenha')
  const sections=[]
  for(const [cat,commands] of grupos){
   if(!commands.length || filtro&&filtro!==cat) continue
   commands.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
   const lines=commands.flatMap(c=>{
    const desc=(descriptions[c.name]||c.description||'Comando do bot.').replace(/\.(?=[a-z]+\s)/g,prefix)
    const aliases=Array.isArray(c.aliases)&&c.aliases.length?'\n│   Aliases: '+c.aliases.map(a=>prefix+a).join(', '):''
    return ['│ *'+prefix+c.name+(c.name==='figfrase'?' [estilo]':'')+'*','│   '+desc+aliases,'│']
   })
   if(commands.some(c=>c.name==='figfrase')) lines.push('│   branco • preto • neon • gold','│   vidro • transparente • piscar','│   arcoiris • glitch • neon animado')
   sections.push('╭─ *'+(labels[cat]||cat.toUpperCase())+'*\n'+lines.join('\n')+'\n╰────────────')
  }
  return reply(['╔══ *BOT MOREIRA* ══╗','🟢 Online  •  Prefixo: '+prefix,'📂 '+prefix+'menu figurinhas | musicas | geral | jogos',...sections,'Base Hiyuki • MisheruModz'].join('\n\n'))
 }
}
