
const {randomInt,randomUUID,createHash}=require('node:crypto')
const fs=require('node:fs'),path=require('node:path')
const {members,match,quotedMentions,tag}=require('./resenhaMembros')
const {gamePrize,ranking}=require('./auraJogo')
const {wrap}=require('./moedaGrupo')
const words=require('./termoPalavras')
const {quiz}=require('./auraDesafiosBanco')
const file=path.resolve(__dirname,'../../database/entretenimento.json')
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim()
const pick=a=>a[randomInt(a.length)]
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
const read=()=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{}
const save=d=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(d));fs.renameSync(file+'.tmp',file)}
const actions=['chegar atrasado','perder o celular','esquecer a senha','pagar mico','mandar áudio no grupo errado','dormir no rolê','rir na hora errada','errar uma conta básica','fingir que entendeu','pedir desconto','inventar desculpa','perder uma aposta','cantar errado','comprar coisa inútil','esquecer a carteira','discutir com o GPS','errar o caminho','sumir do mapa','falar merda','rir da própria piada','trocar nomes','quebrar a cara','passar raiva','fugir de uma conversa','dar um fora']
const places=['no churrasco','no trabalho','na escola','na festa','no mercado','no ônibus','no jogo','no aniversário','na viagem','no casamento','no elevador','no shopping','na fila','no domingo','na reunião','na chamada de vídeo','no restaurante','no cinema','na academia','no primeiro encontro']
const subjects=['pizza','hambúrguer','churrasco','truco','futebol','videogame','filme','série','funk','pagode','rock','samba','café','sorvete','praia','piscina','ônibus','metrô','carro','bicicleta','livro','podcast','celular','computador','notebook','teclado','mouse','cachorro','gato','papagaio','arroz','feijão','macarrão']
const pairs=subjects.flatMap((a,i)=>subjects.slice(i+1).map(b=>[a,b]))
const situations=actions.flatMap(a=>places.map(b=>a+' '+b))
const animals=[['elefante','tromba'],['girafa','pescoço comprido'],['zebra','listras pretas e brancas'],['canguru','bolsa abdominal'],['ornitorrinco','bico semelhante ao de pato'],['pinguim','ave marinha que não voa'],['polvo','oito braços'],['aranha','oito patas e produz seda'],['tartaruga','casco'],['tamanduá','língua comprida para comer formigas'],['morcego','mamífero capaz de voo ativo'],['golfinho','mamífero marinho conhecido pela ecolocalização'],['camaleão','língua projetável e olhos independentes'],['hipopótamo','mamífero africano semiaquático'],['rinoceronte','chifre no focinho'],['tucano','bico grande e colorido'],['avestruz','maior ave viva'],['guepardo','felino terrestre mais veloz'],['castor','constrói barragens'],['coala','alimenta-se principalmente de eucalipto'],['panda','alimenta-se principalmente de bambu'],['lula','molusco com oito braços e dois tentáculos'],['abelha','produz mel'],['sapo','anfíbio que costuma coaxar'],['foca','mamífero marinho com nadadeiras']]
const countries=[['🇧🇷','brasil'],['🇦🇷','argentina'],['🇨🇱','chile'],['🇺🇾','uruguai'],['🇵🇾','paraguai'],['🇵🇪','peru'],['🇨🇴','colombia'],['🇲🇽','mexico'],['🇺🇸','estados unidos'],['🇨🇦','canada'],['🇯🇵','japao'],['🇨🇳','china'],['🇰🇷','coreia do sul'],['🇮🇳','india'],['🇵🇹','portugal'],['🇪🇸','espanha'],['🇫🇷','franca'],['🇩🇪','alemanha'],['🇮🇹','italia'],['🇬🇧','reino unido'],['🇳🇱','paises baixos'],['🇧🇪','belgica'],['🇨🇭','suica'],['🇸🇪','suecia'],['🇳🇴','noruega'],['🇫🇮','finlandia'],['🇩🇰','dinamarca'],['🇬🇷','grecia'],['🇪🇬','egito'],['🇿🇦','africa do sul'],['🇦🇺','australia'],['🇳🇿','nova zelandia'],['🇹🇷','turquia'],['🇮🇩','indonesia'],['🇹🇭','tailandia'],['🇻🇳','vietna'],['🇵🇭','filipinas'],['🇮🇪','irlanda'],['🇮🇸','islandia'],['🇵🇱','polonia']]
const verbs={abracar:'abraçou',beijar:'beijou',jantar:'chamou para jantar',cafune:'fez cafuné em',cutucar:'cutucou',morder:'mordeu',lamber:'lambeu',hi5:'bateu aqui com',maodemao:'deu a mão para',derrubar:'derrubou',glomp:'pulou para abraçar',cocegas:'fez cócegas em',encarar:'encarou',brindar:'brindou com',desculpar:'pediu desculpas a',beijarmao:'beijou a mão de',amar:'declarou amor a',lutar:'saiu na porrada com',matar:'eliminou no duelo',socar:'deu um soco de desenho animado em',tapa:'deu um tapa de desenho animado em',desviar:'desviou do golpe de'}
const reactions={comemorar:'🎉 comemorou pra caralho!',aplaudir:'👏 aplaudiu de pé!',acenar:'👋 mandou um salve!',facepalm:'🤦 perdeu a fé na humanidade.',chorar:'😭 desabou de tanto chorar.',dancar:'🕺 mandou o passinho.',cantar:'🎤 soltou a voz, infelizmente.',confuso:'❓ não entendeu porra nenhuma.'}
const banks={voceprefere:pairs.map(([a,b])=>['Você prefere '+a+' ou '+b+'?',[a,b]]),issoouaquilo:pairs.map(([a,b])=>['Escolhe logo:',[a,b]]),polemica:pairs.map(([a,b])=>['Qual é melhor: '+a+' ou '+b+'?',[a,b]]),maisoumenos:situations.map(s=>['O que acha de '+s+'?',['Boa','Mais ou menos','Uma merda']]),eununca:situations.map(s=>['Eu nunca '+s.replace(/^/,'tentei '),['Já fiz','Nunca fiz']]),conselho:situations.map(s=>'Se for '+s+', pensa antes de fazer merda.'),verdade:situations.map(s=>'Já aconteceu de você '+s+'? Conta essa história.')}
function draw(g,k,a){const h=g.used||(g.used={});let ids=h[k]||[];ids=ids.filter(i=>i>=0&&i<a.length);if(!ids.length)ids=a.map((_,i)=>i);const [i]=ids.splice(randomInt(ids.length),1);h[k]=ids;return a[i]}
const games=['termo','adivinhe','bandeira','stop','cacapalavras','memoria','charada','contrarelogio','enigma','quiz_animais','detetive','batalha','duelojjk','campeonato']
const help=(c,k)=>c.prefix+k
async function execute(c,k){
 if(!c.isGroup)return c.reply('Isso aqui é pra grupo.')
 c=wrap(c)
 const rows=await members(c), me=await match(c,rows,c.sender)
 if(!me)return c.reply('Não achei teu usuário.')
 const d=read(),g=d[c.from]||(d[c.from]={active:{},rank:{}}),a=g.active
 const q=norm(c.q), reply=t=>c.reply(t), send=(t,ids)=>c.columbina.sendMessage(c.from,{text:t,mentions:ids},{quoted:c.info})
 if(verbs[k]){const ids=await quotedMentions(c);const id=ids[0]||await c.quotedAuthor();const target=await match(c,rows,id);if(!target)return reply('Marca alguém ou responde a mensagem, caramba.');return send('💥 '+tag(me.id)+' '+verbs[k]+' '+tag(target.id)+'!', [me.id,target.id])}
 if(reactions[k])return send(tag(me.id)+' '+reactions[k],[me.id])
 if(banks[k]){const v=draw(g,k,banks[k]);save(d);if(Array.isArray(v))return c.columbina.sendMessage(c.from,{poll:{name:v[0],values:v[1],selectableCount:1}},{quoted:c.info});return reply(v)}
 if(k==='avalie'){const ids=await quotedMentions(c),target=await match(c,rows,ids[0]||await c.quotedAuthor());if(!target)return reply('Marca quem vai ser avaliado.');return send('📋 '+tag(target.id)+'\nNota de resenha: '+randomInt(11)+'/10',[target.id])}
 if(k==='chance')return reply('🎲 '+(c.q||'Chance de dar merda')+': '+randomInt(101)+'%')
 if(k==='dado')return reply('🎲 Caiu '+randomInt(1,7)+'.')
 if(k==='sorte'){const n=createHash('sha256').update(c.from+me.id+new Date().toISOString().slice(0,10)).digest()[0]%101;return reply('🍀 Sorte de hoje: '+n+'%. '+(n<30?'Tá fodido.':'Vai que dá.'))}
 if(k==='aura'){const p=ranking(c.from,[me.id])[0];return reply('⚡ '+p.score+' aura.')}
 if(k==='ranktermo'){const rank=Object.entries(g.rank).sort((a,b)=>b[1]-a[1]).slice(0,10);return send('🏆 TERMO\n'+(rank.map(([id,n],i)=>(i+1)+'. '+tag(id)+' — '+n+' vitórias').join('\n')||'Ninguém ganhou ainda.'),rank.map(x=>x[0]))}
 if(k==='revelar_anagrama'){return reply('O anagrama atual usa o sistema de aura; a revelação será liberada pelo módulo original.')}
 if(k==='termo-parar'||k==='revelar_enigma'){const type=k==='termo-parar'?'termo':'enigma';const s=a[type];if(!s)return reply('Não tem rodada.');if(s.owner!==me.id&&!c.isDono)return reply('Só quem iniciou pode encerrar.');delete a[type];save(d);return reply('Resposta: '+s.answer)}
 if(k==='t')k='termo';if(k==='p')k='cacapalavras';if(k==='m')k='memoria'
 if(!games.includes(k))return reply('Comando inválido.')
 let s=a[k];if(s&&s.expires<Date.now()){delete a[k];save(d);s=null}
 const finish=async()=>{delete a[k];if(k==='termo')g.rank[me.id]=(g.rank[me.id]||0)+1;save(d);const p=gamePrize(c.from,me.id,s.id);return send('🏆 '+tag(me.id)+' acertou! '+(s.answer||'')+(p.error?'':'\n+100 aura'),[me.id])}
 if(!s){
  if(q&&!['batalha','duelojjk'].includes(k))return reply('Inicia com '+help(c,k))
  s={id:randomUUID(),owner:me.id,expires:Date.now()+180000,tries:0}
  if(k==='termo'){s.answer=draw(g,k,words);s.prompt='🟩 TERMO — seis tentativas. '+help(c,'t')+' palavra'}
  else if(k==='cacapalavras'){s.answer=draw(g,k,words);const line=shuffle([...s.answer,'x','z','q']).join('');const grid=Array.from({length:8},()=>Array.from({length:8},()=>pick('abcdefghijklmnopqrstuvwxyz'.split(''))).join(' '));const row=randomInt(8),start=randomInt(4),letters=grid[row].split(' ');letters.splice(start,5,...s.answer);grid[row]=letters.join(' ');s.prompt='🔎 CAÇA-PALAVRAS — encontre uma palavra de 5 letras (horizontal).\n'+grid.join('\n')+'\n'+help(c,'p')+' palavra'}
  else if(k==='bandeira'){const v=draw(g,k,countries);s.answer=v[1];s.prompt=v[0]+' Qual país? '+help(c,k)+' país'}
  else if(k==='quiz_animais'){const v=draw(g,k,animals);s.answer=v[0];s.prompt='🐾 Qual animal: '+v[1]+'?'}
  else if(k==='memoria'){s.board=shuffle(['🍌','🍌','🍉','🍉','🍇','🍇','🍓','🍓']);s.found=[];s.prompt='🧠 MEMÓRIA: 1 2 3 4 5 6 7 8\n'+help(c,'m')+' 1 2 para virar duas cartas.'}
  else if(k==='stop'){s.letter=pick('abcdefghijklmnopqrstuv'.split(''));s.prompt='🛑 STOP — letra '+s.letter.toUpperCase()+'\n'+help(c,k)+' nome | animal | comida | cidade'}
  else if(k==='batalha'||k==='duelojjk'){const ids=await quotedMentions(c),target=await match(c,rows,ids[0]||await c.quotedAuthor());if(!target||target.id===me.id)return reply('Marca um adversário.');s.players=[me.id,target.id];s.hp=[100,100];s.turn=0;s.guard=[false,false];s.energy=[3,3];s.prompt='⚔️ '+tag(me.id)+' vs '+tag(target.id)+'\n'+help(c,k)+' atacar / defender'+(k==='duelojjk'?' / especial':'')+' — começa quem desafiou.'}
  else if(k==='campeonato'){s.players=[me.id];s.prompt='🏆 CAMPEONATO — '+help(c,k)+' entrar / iniciar (mínimo 2).'}
  else if(k==='detetive'){const suspects=['o porteiro','o cozinheiro','o motorista','o fotógrafo','o músico'];const guilty=pick(suspects);s.answer=guilty;s.prompt='🕵️ Sumiu um troféu. Suspeitos: '+suspects.join(', ')+'. Só '+guilty+' tinha a chave do armário; os demais tinham álibi. Quem levou?'}
  else if(k==='adivinhe'){const v=draw(g,k,animals);s.answer=v[0];s.prompt='Adivinha: '+v[1]+'.'}
  else {const v=draw(g,k,quiz);s.answer=norm(v[1]);s.answers=v.slice(1).map(norm);s.prompt=(k==='contrarelogio'?'⏱️ 20 segundos! ':'🧩 ')+v[0];if(k==='contrarelogio')s.expires=Date.now()+20000}
  a[k]=s;save(d);return s.players&&k!=='campeonato'?send(s.prompt,s.players):reply(s.prompt+'\nResponda com '+help(c,k)+' resposta.')
 }
 if(!q)return reply(s.prompt)
 if(k==='termo'){if(!words.includes(q))return reply('Palavra inválida.');s.tries++;if(q===s.answer)return finish();const left=s.answer.split(''),result=Array(5).fill('⬛');for(let i=0;i<5;i++)if(q[i]===left[i]){result[i]='🟩';left[i]=null}for(let i=0;i<5;i++)if(result[i]==='⬛'){const j=left.indexOf(q[i]);if(j>=0){result[i]='🟨';left[j]=null}}if(s.tries>=6){delete a[k];save(d);return reply(result.join('')+'\nAcabou, porra. Era '+s.answer)}save(d);return reply(result.join('')+' '+q.toUpperCase()+' — '+s.tries+'/6')}
 if(k==='memoria'){const [i,j,...rest]=q.split(/\s+/).map(Number);if(rest.length||!Number.isInteger(i)||!Number.isInteger(j)||i<1||j<1||i>8||j>8||i===j||s.found.includes(i)||s.found.includes(j))return reply('Escolhe duas posições livres de 1 a 8.');if(s.board[i-1]===s.board[j-1]){s.found.push(i,j);if(s.found.length===8)return finish();save(d);return reply('Acertou! '+s.board.map((v,n)=>s.found.includes(n+1)?v:String(n+1)).join(' '))}return reply(i+': '+s.board[i-1]+' | '+j+': '+s.board[j-1]+' — errou.')}
 if(k==='stop'){const v=q.split('|').map(x=>x.trim());if(v.length!==4||v.some(x=>!x.startsWith(s.letter)||x.length<2))return reply('Quatro respostas com a letra '+s.letter+'.');delete a[k];save(d);return reply('🛑 STOP de '+tag(me.id)+': '+v.join(' | ')+'\nGrupo, confere as categorias.')}
 if(k==='batalha'||k==='duelojjk'){const i=s.players.indexOf(me.id),j=1-i;if(i!==s.turn)return reply('Não é tua vez.');if(!['atacar','defender',...(k==='duelojjk'?['especial']:[])].includes(q))return reply('Atacar ou defender'+(k==='duelojjk'?' ou especial':'')+'.');if(q==='defender'){s.guard[i]=true;s.energy[i]=Math.min(3,s.energy[i]+1)}else{if(q==='especial'&&s.energy[i]<2)return reply('Sem energia.');if(q==='especial')s.energy[i]-=2;let hit=q==='especial'?randomInt(24,40):randomInt(12,24);if(s.guard[j])hit=Math.floor(hit/2);s.guard[j]=false;s.hp[j]=Math.max(0,s.hp[j]-hit);if(!s.hp[j])return finish()}s.turn=j;save(d);return send('⚔️ '+s.hp[0]+' HP × '+s.hp[1]+' HP\nVez de '+tag(s.players[j]),s.players)}
 if(k==='campeonato'){if(q==='entrar'){if(!s.players.includes(me.id))s.players.push(me.id);save(d);return reply(s.players.length+' inscritos.')}if(q!=='iniciar'||s.owner!==me.id||s.players.length<2)return reply('Só o organizador inicia com 2 ou mais.');let p=shuffle(s.players),rounds=[];while(p.length>1){let next=[];for(let i=0;i<p.length;i+=2){if(!p[i+1]){next.push(p[i]);continue}const w=pick([p[i],p[i+1]]);rounds.push(tag(p[i])+' × '+tag(p[i+1])+' → '+tag(w));next.push(w)}p=next}delete a[k];save(d);return send(rounds.join('\n')+'\n🏆 CAMPEÃO: '+tag(p[0]),s.players)}
 if(q===s.answer||s.answers?.includes(q))return finish()
 return reply(pick(['Errou, porra.','Não foi dessa vez.','Passou longe, caramba.','Tenta de novo.']))
}
module.exports={execute}
