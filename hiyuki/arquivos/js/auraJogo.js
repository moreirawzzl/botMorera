const fs=require('node:fs'),path=require('node:path'),{randomInt}=require('node:crypto')
const file=path.resolve(__dirname,'../../database/aura-jogo.json')
function read(){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{}}
function save(d){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(d));fs.renameSync(file+'.tmp',file)}
const cooldown=5*60*1000
function group(d,id){return d[id]||(d[id]={players:{}})}
function player(g,id){return g.players[id]||(g.players[id]={score:1000,last:0})}
function ranking(groupId,ids){const d=read(),g=group(d,groupId);const result=[...new Set(ids)].map(id=>({id,score:player(g,id).score}));save(d);return result.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))}
function steal(groupId,attacker,target,now=Date.now()){
 if(attacker===target)return {error:'Você não pode roubar sua própria aura.'}
 const d=read(),g=group(d,groupId),a=player(g,attacker),b=player(g,target)
 const wait=a.last+cooldown-now
 if(wait>0)return {error:'cooldown',next:a.last+cooldown}
 if(b.score<=0)return {error:'Esse jogador está sem aura.'}
 const success=randomInt(100)<65
 const amount=success?Math.min(b.score,randomInt(100,501)):Math.min(a.score,randomInt(50,201))
 if(success){a.score+=amount;b.score-=amount}else{a.score-=amount;b.score+=amount}
 a.last=now;save(d);return {success,amount,attacker:a.score,target:b.score,next:a.last+cooldown}
}
function roll(groupId,id,now=Date.now(),requestId){
 const format=ms=>{const sec=Math.max(0,Math.ceil(ms/1000));return Math.floor(sec/60)+'min '+String(sec%60).padStart(2,'0')+'s'}
 const d=read(),g=group(d,groupId),p=player(g,id)
 const wait=p.lastAura? p.lastAura+cooldown-now:0
 if((requestId&&p.lastAuraRequest===requestId)||wait>0)return {error:'⏳ Aguarde '+format(wait)+' para tentar novamente.\nSeu saldo permanece: '+p.score.toLocaleString('pt-BR')+' aura.'}
 const success=p.score===0||randomInt(100)<65
 const amount=success?randomInt(100,501):Math.min(p.score,randomInt(50,201))
 p.score+=success?amount:-amount
 p.lastAura=now;p.lastAuraRequest=requestId;save(d);return {success,amount,score:p.score,next:now+cooldown}
}
function addAura(groupId,id,amount){
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)return {error:'Informe de 1 a 1.000.000 aura.'}
 const d=read(),g=group(d,groupId),p=player(g,id)
 if(!Number.isSafeInteger(p.score+amount))return {error:'Limite de saldo atingido.'}
 p.score+=amount;save(d);return {score:p.score,amount}
}
function removeAura(groupId,id,amount){
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)return {error:'Informe de 1 a 1.000.000 aura.'}
 const d=read(),g=group(d,groupId),p=player(g,id)
 if(p.score<amount)return {error:'Saldo insuficiente. Saldo atual: '+p.score.toLocaleString('pt-BR')+' aura.'}
 p.score-=amount;save(d);return {score:p.score,amount}
}
function distribute(groupId,id,ids){
 const recipients=[...new Set(ids)].filter(x=>x!==id)
 if(!recipients.length)return {error:'Não há outros membros para receber aura.'}
 const d=read(),g=group(d,groupId),p=player(g,id),total=p.score
 if(!Number.isSafeInteger(total)||total<=0)return {error:'Essa pessoa está sem aura para distribuir.'}
 const each=Math.floor(total/recipients.length),remainder=total%recipients.length
 // Shuffle so any indivisible remainder is assigned fairly.
 for(let i=recipients.length-1;i>0;i--){const j=randomInt(i+1);[recipients[i],recipients[j]]=[recipients[j],recipients[i]]}
 const transfers=recipients.map((target,i)=>({target,amount:each+(i<remainder?1:0),p:player(g,target)}))
 if(transfers.some(x=>!Number.isSafeInteger(x.p.score+x.amount)))return {error:'Limite de saldo atingido.'}
 for(const x of transfers)x.p.score+=x.amount
 p.score=0;save(d);return {total,each,remainder,count:recipients.length,paid:transfers.filter(x=>x.amount>0).length}
}
function reserveVelha(groupId,key,ids,amount){
 if(ids.length!==2||ids[0]===ids[1]||!Number.isSafeInteger(amount)||amount<1||amount>1000000)return {error:'Aposta inválida.'}
 const d=read(),g=group(d,groupId),bets=g.velhaBets||(g.velhaBets={})
 if(bets[key])return bets[key].status==='reserved'?{ok:true}:{error:'Aposta já encerrada.'}
 const ps=ids.map(id=>player(g,id))
 if(ps.some(p=>p.score<amount))return {error:'Os dois jogadores precisam ter aura suficiente.'}
 for(const p of ps)p.score-=amount
 bets[key]={ids,amount,status:'reserved'}
 save(d);return {ok:true}
}
function finishVelha(groupId,key,winner){
 const d=read(),g=group(d,groupId),bet=g.velhaBets?.[key]
 if(!bet)return {ok:true}
 if(bet.status==='settled')return {ok:true}
 if(winner&&!bet.ids.includes(winner))return {error:'Vencedor inválido.'}
 const credits=winner?[[winner,bet.amount*2]]:bet.ids.map(id=>[id,bet.amount])
 if(credits.some(([id,n])=>!Number.isSafeInteger(player(g,id).score+n)))return {error:'Limite de saldo atingido; contate o dono.'}
 for(const [id,n] of credits)player(g,id).score+=n
 bet.status='settled';bet.winner=winner||null;save(d);return {ok:true}
}
function daily(groupId,id,now=Date.now()){
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now))
 const yesterday=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10)
 const d=read(),g=group(d,groupId),p=player(g,id)
 if(p.dailyDay===day)return {error:'Você já resgatou hoje! Volte amanhã, depois da meia-noite de Brasília.',streak:p.dailyStreak}
 const streak=p.dailyDay===yesterday?(p.dailyStreak||1)+1:1
 const amount=500+(streak-1)*100
 if(!Number.isSafeInteger(p.score+amount))return {error:'Limite de saldo atingido.'}
 p.score+=amount;p.dailyDay=day;p.dailyStreak=streak;save(d)
 return {amount,streak,score:p.score,next:amount+100}
}
function gamePrize(groupId,id,key){
 const d=read(),g=group(d,groupId),prizes=g.gamePrizes||(g.gamePrizes={})
 if(prizes[key])return {ok:true,score:prizes[key].score}
 const p=player(g,id)
 if(!Number.isSafeInteger(p.score+100))return {error:'Limite de saldo atingido.'}
 p.score+=100;prizes[key]={id,score:p.score};save(d);return {ok:true,score:p.score}
}
const soloRewards={facil:300,dificil:1200,impossivel:10000,master:5000}
function currency(groupId){return read()[groupId]?.currency||'aura'}
function setCurrency(groupId,name){name=String(name).trim().replace(/\s+/g,' ');if(!/^[\p{L}\p{N}][\p{L}\p{N} -]{1,23}$/u.test(name))return {error:'Nome inválido: use 2 a 24 letras, números, espaços ou hífen.'};const d=read(),g=group(d,groupId);g.currency=name;save(d);return {name}}
function soloPrize(groupId,id,key,mode,now=Date.now()){
 const amount=soloRewards[mode];if(!amount||!key)return {error:'Prêmio inválido.'};
 const d=read(),g=group(d,groupId),p=player(g,id),prizes=g.soloPrizes||(g.soloPrizes={});
 if(Object.hasOwn(prizes,key))return prizes[key];
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const daily=p.soloDay===day?(p.soloPaid||0):0;
 if((p.soloLast||0)+600000>now||daily>=3){const result={amount:0,score:p.score,limited:true};prizes[key]=result;save(d);return result;}
 if(!Number.isSafeInteger(p.score+amount))return {error:'Limite de saldo atingido.'};
 p.score+=amount;p.soloDay=day;p.soloPaid=daily+1;p.soloLast=now;
 const result={amount,score:p.score};prizes[key]=result;save(d);return result;
}
module.exports={currency,setCurrency,soloRewards,soloPrize,ranking,steal,roll,addAura,removeAura,distribute,reserveVelha,finishVelha,daily,gamePrize}
