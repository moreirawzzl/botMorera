const {randomInt}=require('node:crypto')
const questions=[
 'Qual pequena coisa sempre melhora o seu dia?',
 'Se pudesse aprender uma habilidade agora, qual escolheria?',
 'Qual música você nunca pula quando toca?',
 'Prefere passar as férias na praia, na montanha ou numa cidade grande?',
 'Qual comida você escolheria para comer hoje?',
 'Que filme ou série você sempre recomenda para alguém?',
 'Qual era sua brincadeira favorita quando era criança?',
 'Que lugar você ainda sonha conhecer?',
 'Qual talento inútil você tem?',
 'Como seria um dia perfeito para você?',
 'Qual personagem de filme ou série seria uma boa companhia para viajar?',
 'Que hábito você gostaria de criar este ano?',
 'Qual foi a coisa mais engraçada que aconteceu com você recentemente?',
 'Se pudesse reviver um dia especial, qual seria?',
 'Qual sobremesa você escolheria agora?',
 'Você prefere acordar cedo ou dormir tarde?',
 'Qual jogo marcou sua infância?',
 'Que assunto faz você perder a noção do tempo conversando?',
 'Se pudesse ter um superpoder por um dia, qual seria?',
 'Qual conselho simples você sempre lembra?'
]
const cooldowns=new Map(),lastQuestion=new Map()
const cooldown=15000
module.exports={name:'pergunta',description:'Faz uma pergunta para iniciar conversa no grupo ou no privado.',async execute(c){
 const now=Date.now(),wait=(cooldowns.get(c.from)||0)-now
 if(wait>0)return c.reply('⏳ Aguarde '+Math.ceil(wait/1000)+'s para mandar outra pergunta nesta conversa.')
 const custom=(c.q||'').trim()
 if([...custom].length>500)return c.reply('A pergunta personalizada pode ter até 500 caracteres.')
 let question=custom
 if(!question){
  const previous=lastQuestion.get(c.from)
  const options=questions.filter(item=>item!==previous)
  question=options[randomInt(options.length)]
  lastQuestion.set(c.from,question)
 }
 cooldowns.set(c.from,now+cooldown)
 return c.columbina.sendMessage(c.from,{text:'💬 *PERGUNTA PARA CONVERSAR*\n\n'+question+'\n\nTodo mundo pode responder 👇'},{quoted:c.info})
}}
