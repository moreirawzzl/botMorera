const {randomInt}=require('node:crypto')
const {members,match,quotedMentions,tag}=require('../../arquivos/js/resenhaMembros')
const acusacoes=[
 'responder “kkkk” sem saber do que estão rindo',
 'abrir a geladeira três vezes esperando aparecer comida nova',
 'visualizar a mensagem e responder só mentalmente',
 'mandar “bom dia” quando já está quase na hora do boa-noite',
 'sumir bem na hora de escolher o lanche',
 'ter uma figurinha para cada situação e esconder isso do grupo',
 'dizer “estou chegando” antes mesmo de sair de casa',
 'começar uma história com “é rapidinho” e levar meia hora'
]
const penas=[
 'fica responsável por escolher a próxima figurinha da conversa.',
 'deve apresentar uma defesa de até dez segundos usando voz de narrador de futebol.',
 'recebe uma medalha imaginária de excelência nessa categoria.',
 'fica encarregado(a) de lembrar o grupo de beber água — tarefa válida por zero minutos.',
 'deve mandar um emoji que represente seu advogado imaginário.'
]
module.exports={name:'tribunal',description:'Julga uma pessoa marcada por crimes completamente bobos.',async execute(c){
 if(!c.isGroup)return c.reply('O tribunal do caos só funciona em grupos.')
 const marked=await quotedMentions(c)
 if(marked.length!==1)return c.reply('Marque uma pessoa para o julgamento. Ex.: '+c.prefix+'tribunal @pessoa')
 const rows=await members(c),person=await match(c,rows,marked[0])
 if(!person)return c.reply('Marque alguém que ainda esteja neste grupo.')
 const accusation=acusacoes[randomInt(acusacoes.length)]
 const penalty=penas[randomInt(penas.length)]
 return c.columbina.sendMessage(c.from,{text:'⚖️ *TRIBUNAL DO CAOS*\n\nRéu: '+tag(person.id)+'\nAcusação: '+accusation+'.\nVeredito: *culpado(a)* — o júri foi escolhido por um hamster.\nPena: '+penalty+'\n\n_(julgamento fictício, sem consequências reais)_',mentions:[person.id]},{quoted:c.info})
}}
