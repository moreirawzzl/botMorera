const {randomInt}=require('node:crypto')
const eventos=[
 'O grupo foi escolhido para testar uma geladeira que só abre depois de ouvir uma piada.',
 'Uma capivara acabou de ser nomeada síndica do universo e proibiu áudio sem contexto.',
 'Foi encontrado um portal na conversa: ele leva direto para a mensagem que ninguém respondeu.',
 'O grupo ganhou um campeonato mundial de abrir a geladeira e esquecer o que queria.',
 'Um extraterrestre entrou no grupo, leu o histórico e pediu para voltar para casa.',
 'A partir de agora, toda figurinha repetida vale como moeda oficial do grupo.',
 'O Wi-Fi foi promovido a administrador por manter a calma nos momentos difíceis.',
 'O grupo foi convocado para resolver um mistério: quem pegou o último pedaço de pizza imaginário?',
 'Uma reunião de pombos decidiu que hoje todo mundo merece um lanche.',
 'O bot tentou organizar o grupo e acabou criando uma fila para conversar com uma batata.'
]
module.exports={name:'caos',description:'Sorteia um acontecimento absurdo para animar a conversa.',execute(c){
 return c.reply('🌀 *EVENTO ALEATÓRIO*\n\n'+eventos[randomInt(eventos.length)]+'\n\n_(ficção oficial do caos)_')
}}
