const {draw}=require('../../arquivos/js/resenhaBanco')
module.exports={name:'desafio',description:'Sorteia um desafio de resenha.',async execute(c){return c.reply('🎯 *DESAFIO*\n\n'+draw(c.from,'desafio')+'\n\nQuero ver essa merda.')}}
