const {json}=require('../../arquivos/js/utilweb')
module.exports={name:'ddd',description:'Consulta cidades de um DDD brasileiro.',async execute(c){
 const n=c.q.trim();if(!/^[1-9]\d$/.test(n))return c.reply('Use '+c.prefix+'ddd 11.')
 try{const d=await json('https://brasilapi.com.br/api/ddd/v1/'+n);return c.reply('📞 *DDD '+n+'*\nEstado: '+d.state+'\nCidades: '+d.cities.slice(0,35).join(', ')+(d.cities.length>35?'\n… e outras '+(d.cities.length-35):''))}
 catch(e){console.error('Falha no comando ddd',e);return c.reply('DDD não encontrado ou consulta indisponível.')}
}}