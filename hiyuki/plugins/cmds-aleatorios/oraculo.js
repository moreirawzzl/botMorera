const {randomInt}=require('node:crypto')
const answers=[
 'Sim, mas só depois de consultar o conselho dos pombos.',
 'Não. O micro-ondas foi bem claro sobre isso.',
 'Talvez. Os dados caíram dentro de uma coxinha.',
 'Os sinais apontam para um cochilo estratégico.',
 'O universo está carregando em 2G. Pergunte de novo daqui a pouco.',
 'Com certeza, desde que ninguém mande áudio de oito minutos.',
 'Hoje não: o destino está em reunião e esqueceu de pôr no silencioso.',
 'A resposta é 42, mas o bot perdeu a pergunta no caminho.',
 'As estrelas recomendam um lanche antes de qualquer decisão.',
 'Sim. Uma capivara analisou os dados e aprovou.'
]
module.exports={name:'oraculo',description:'Responde perguntas com a sabedoria duvidosa do oráculo do caos.',execute(c){
 const question=(c.q||'').trim().slice(0,220)
 const answer=answers[randomInt(answers.length)]
 return c.reply('🔮 *ORÁCULO DO CAOS*'+(question?'\n\nPergunta: '+question:'')+'\n\nResposta: '+answer+'\n\n_(brincadeira: não consulte o oráculo para decisões importantes)_')
}}
