const {randomInt}=require('node:crypto')
const excuses=[
 'Meu despertador tocou, eu respondi “já vou” e ele acreditou.',
 'Fui pegar água e acabei numa reunião com a geladeira.',
 'O chinelo saiu na frente e eu tive que esperar ele voltar.',
 'Minha internet caiu porque o roteador precisava pensar na vida.',
 'Eu estava chegando, mas o caminho virou uma missão secundária.',
 'Um pombo me pediu ajuda com uma planilha e não consegui negar.',
 'O relógio pulou um horário para testar minha atenção.',
 'Fiquei preso tentando lembrar por que entrei neste cômodo.'
]
module.exports={name:'desculpa',description:'Gera uma desculpa absurda para qualquer situação.',execute(c){
 const excuse=excuses[randomInt(excuses.length)]
 return c.reply('📝 *DESCULPA DO CAOS*\n\n'+excuse+'\n\n_(inventada pelo bot; use com responsabilidade 😅)_')
}}
