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
 if(wait>0)return {error:'Espere '+Math.ceil(wait/1000)+' segundos para tentar novamente.'}
 if(b.score<=0)return {error:'Esse jogador está sem aura.'}
 const success=randomInt(100)<65
 const amount=success?Math.min(b.score,randomInt(100,501)):Math.min(a.score,randomInt(50,201))
 if(success){a.score+=amount;b.score-=amount}else{a.score-=amount;b.score+=amount}
 a.last=now;save(d);return {success,amount,attacker:a.score,target:b.score}
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
module.exports={ranking,steal,roll}
