const {send}=require('../../arquivos/js/feedbackDono')
module.exports={name:'sugestao',aliases:['sugestão','sugerir'],description:'Envia uma sugestão de comando, com identificação do remetente, ao privado do dono. Ex.: .sugestao criar um jogo de cartas',execute:c=>send(c,'sugestao')}
