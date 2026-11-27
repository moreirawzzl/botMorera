const {randomInt}=require('node:crypto');
module.exports={name:"verdade",description:"Pergunta divertida de verdade.",aliases:[],async execute(c){const a=['Qual foi seu maior mico?','Qual hábito estranho você tem?','Qual música você canta escondido?','Qual foi sua pior desculpa?','Qual comida você nunca dividiria?'];return c.reply('🗣️ '+a[randomInt(a.length)])}}
