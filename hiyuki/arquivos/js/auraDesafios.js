const {wrap}=require('./moedaGrupo')
const fs=require('node:fs'),path=require('node:path'),{randomInt,randomUUID}=require('node:crypto')
const {words,quiz}=require('./auraDesafiosBanco')
const {members,match,tag}=require('./resenhaMembros')
const {gamePrize}=require('./auraJogo')
const file=path.resolve(__dirname,'../../database/aura-desafios.json')
const read=()=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{}
const save=d=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(d));fs.renameSync(file+'.tmp',file)}
const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ')
function scramble(s){const a=[...s];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a.join('')===s?s.slice(1)+s[0]:a.join('')}
function display(type,r,prefix){
 if(type==='quiz')return '🧠 *QUIZ* — 100 aura\n\n'+r.question+'\n\nResponda: '+prefix+'quiz resposta'
 if(type==='anagrama')return '🔀 *ANAGRAMA* — 100 aura\n\n'+r.scrambled.toUpperCase()+'\nDica: '+r.hint+'\n\nResponda: '+prefix+'anagrama palavra'
 return '🔤 *FORCA* — 100 aura\n\n'+[...r.answer].map(x=>r.letters.includes(x)?x.toUpperCase():'▢').join(' ')+'\nDica: '+r.hint+'\nErros: '+r.errors+'/6\nLetras: '+(r.letters.join(', ')||'nenhuma')+'\n\nUse '+prefix+'forca letra ou palavra'
}
async function execute(c,type){
 c=wrap(c);
 if(!c.isGroup)return c.reply('Só em grupos.')
 const me=await match(c,await members(c),c.sender)
 if(!me)return c.reply('Não consegui identificar seu jogador.')
 const d=read(),g=d[c.from]||(d[c.from]={usedWords:[],usedQuiz:[],active:{},seen:{}})
 const key=c.info?.key?.id
 if(key&&g.seen[key])return
 const arg=norm(c.q||'')
 let r=g.active[type]
 if(r?.winner){
  const prize=gamePrize(c.from,r.winner,r.id)
  if(prize.error)return c.reply(prize.error)
  delete g.active[type];save(d);r=null
 }
 if(r&&Date.now()>r.expires){delete g.active[type];save(d);r=null;if(arg)return c.reply('Tempo encerrado! Inicie outra rodada com '+c.prefix+type+'.')}
 if(arg==='--revelar'){if(!r)return c.reply('Não tem rodada.');if(!c.isDono&&r.owner!==me.id)return c.reply('Só quem iniciou ou o dono pode revelar.');delete g.active[type];save(d);return c.reply('Resposta: '+r.answer)}
 if(!arg){
  if(r)return c.reply(display(type,r,c.prefix))
  const bank=type==='quiz'?quiz:words,used=type==='quiz'?g.usedQuiz:g.usedWords
  const available=bank.filter(x=>!used.includes(norm(x[0])))
  if(!available.length){used.length=0;available.push(...bank)}
  const item=available[randomInt(available.length)]
  used.push(norm(item[0]))
  r={id:randomUUID(),owner:me.id,expires:Date.now()+180000,answer:norm(type==='quiz'?item[1]:item[0]),hint:item[1],letters:[],errors:0}
  if(type==='quiz'){r.question=item[0];r.answers=item.slice(1).map(norm)}
  if(type==='anagrama')r.scrambled=scramble(r.answer)
  g.active[type]=r;if(key)g.seen[key]=true;save(d)
  return c.reply(display(type,r,c.prefix)+'\nTempo: 3 minutos.')
 }
 if(!r)return c.reply('Não há rodada ativa. Use '+c.prefix+type+'.')
 const correct=type==='quiz'?r.answers.includes(arg):arg===r.answer
 let win=correct
 if(type==='forca'&&!correct){
  if(!/^[a-z]+$/.test(arg))return c.reply('Envie uma letra ou palavra.')
  if(arg.length===1){
   if(r.letters.includes(arg))return c.reply('Essa letra já foi tentada.')
   r.letters.push(arg)
   if(!r.answer.includes(arg))r.errors++
   win=[...r.answer].every(x=>r.letters.includes(x))
  }else r.errors++
 }
 if(key)g.seen[key]=true
 if(win){
  r.winner=me.id;save(d)
  const prize=gamePrize(c.from,me.id,r.id)
  if(prize.error)return c.reply(prize.error)
  delete g.active[type];save(d)
  return c.columbina.sendMessage(c.from,{text:'🏆 '+tag(me.id)+' acertou! Resposta: *'+r.answer.toUpperCase()+'*\n+100 aura\nSaldo: '+prize.score.toLocaleString('pt-BR')+' aura.',mentions:[me.id]},{quoted:c.info})
 }
 if(type==='forca'&&r.errors>=6){delete g.active[type];save(d);return c.reply('Fim de jogo! A palavra era *'+r.answer.toUpperCase()+'*.')}
 save(d)
 return c.reply(type==='forca'?display(type,r,c.prefix):'Errou, porra. Tenta novamente.')
}
module.exports={execute}
