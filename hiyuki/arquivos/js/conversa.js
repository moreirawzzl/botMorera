const {randomInt}=require('node:crypto')
const memory=new Map()
const pick=a=>a[randomInt(a.length)]
const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
function responder(texto,key=''){
 const raw=String(texto).trim().slice(0,1500),t=normalize(raw),now=Date.now()
 for(const [k,v] of memory)if(now-v.at>600000)memory.delete(k)
 const previous=key?memory.get(key):null
 if(key){if(memory.size>=500&&!previous)memory.delete(memory.keys().next().value);memory.set(key,{raw,at:now})}
 const m=t.match(/^(?:quanto (?:e|da)\s+)?(-?\d+(?:[.,]\d+)?)\s*([+*/x×÷-])\s*(-?\d+(?:[.,]\d+)?)\s*\??$/)
 if(m){const a=Number(m[1].replace(',','.')),b=Number(m[3].replace(',','.')),op=m[2],r=op==='+'?a+b:op==='-'?a-b:['*','x','×'].includes(op)?a*b:b===0?NaN:a/b;return Number.isFinite(r)?'Dá '+Number(r.toPrecision(12)).toLocaleString('pt-BR')+'. Até que enfim uma conta que presta.':'Divisão por zero não dá, campeão.'}
 if(/^(oi|ola|opa|e ai|salve|bom dia|boa tarde|boa noite)[!? .]*$/.test(t))return pick(['Salve. Veio com fofoca ou testar se eu tô vivo?','Opa, desembucha.','Chegou a fiscalização? Fala aí.'])
 if(/quem e (voce|vc)|qual seu nome|quem te criou/.test(t))return 'Sou o Moreira, assistente local do bot. Sem API e sem fingir que sei tudo.'
 if(/que horas|hora agora/.test(t))return new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})+' em Brasília. Teu relógio pediu demissão?'
 if(/que dia|data de hoje/.test(t))return 'Hoje é '+new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'full'}).format(new Date())+'.'
 if(/^(obrigad[oa]|valeu|tmj)\b/.test(t))return 'De nada. A próxima consultoria custa duas coxinhas.'
 if(/^(k{3,}|hahaha)/.test(t))return 'Ri mesmo. Pelo menos alguém tá aproveitando o espetáculo.'
 if(/piada|me faz rir/.test(t))return pick(['O que o zero disse pro oito? Belo cinto.','O computador foi ao médico porque pegou um vírus. Humor de TI.','Por que o livro de matemática ficou triste? Tinha muitos problemas.'])
 if(/^(repete|qual foi minha pergunta|o que eu perguntei)/.test(t))return previous?'Você perguntou: '+previous.raw:'Não tenho pergunta anterior sua nesta conversa.'
 if(/comando|menu|figurinha|musica|jogo da velha/.test(t))return 'Consulta o menu do bot. Não vou inventar comando que não existe.'
 if(/^(sim|nao|aham|entendi)[.!? ]*$/.test(t)&&previous)return 'Beleza. Sobre "'+previous.raw.slice(0,100)+'", manda a próxima pergunta.'
 return pick(['Essa eu não sei responder sem um modelo de IA. Manda outra, campeão.','Não vou tirar resposta da cartola. Essa está fora do meu repertório local.','A pergunta é boa, mas minha biblioteca de respostas não cobre isso ainda.'])
}
module.exports={responder}
