const {send}=require('../../arquivos/js/feedbackDono')
module.exports={name:'feedback',description:'Envia sua opinião ou relato de erro, com identificação do remetente, ao privado do dono. Ex.: .feedback gostei do bot',execute:c=>send(c,'feedback')}
