const fs=require('node:fs'),path=require('node:path')
const file=path.resolve(__dirname,'../../database/rankinggrupo.json')
let data={},dirty=false
try{data=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code!=='ENOENT')console.error(e.message)}
const seen=new Set()
function count(m){const group=m.key.remoteJid,id=m.key.participantAlt||m.key.participant;if(!group?.endsWith('@g.us')||!id||m.key.fromMe)return;const k=group+'/'+m.key.id;if(seen.has(k))return;seen.add(k);if(seen.size>4096)seen.delete(seen.values().next().value);const g=data[group]||(data[group]={});g[id]=(g[id]||0)+1;dirty=true}
function save(){if(!dirty)return;try{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file);dirty=false}catch(e){console.error('Ranking grupo:',e.message)}}
setInterval(save,5000).unref();process.on('exit',save)
function ranking(group){return Object.entries(data[group]||{}).sort((a,b)=>b[1]-a[1]).slice(0,10)}
module.exports={count,ranking}
