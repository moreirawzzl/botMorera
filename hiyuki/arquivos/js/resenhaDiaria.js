const fs=require('node:fs'),path=require('node:path'),{createHash,randomBytes}=require('node:crypto')
const file=path.resolve(__dirname,'../../database/resenha-diaria.json')
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
function seed(group,type,renew=false){
 const today=day(),data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{}
 const key=group+'|'+type
 if(renew){
  for(const k of Object.keys(data))if(data[k].day!==today)delete data[k]
  data[key]={day:today,salt:randomBytes(16).toString('hex')}
  fs.mkdirSync(path.dirname(file),{recursive:true})
  fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file)
 }
 return JSON.stringify([group,type,today,data[key]?.day===today?data[key].salt:'original'])
}
const hash=(seed,id)=>createHash('sha256').update(JSON.stringify([seed,id])).digest().readUInt32BE(0)
module.exports={seed,hash}
