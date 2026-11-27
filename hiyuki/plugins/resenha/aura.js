const {members,match}=require('../../arquivos/js/resenhaMembros')
const game=require('../../arquivos/js/auraJogo')
module.exports={name:'aura',description:'Sorteia ganho ou perda de aura. Intervalo de 5 minutos.',async execute(c){
 if(!c.isGroup)return c.reply('Só em grupos.')
 const rows=await members(c),me=await match(c,rows,c.sender)
 if(!me)return c.reply('Não consegui identificar seu jogador.')
 const r=game.roll(c.from,me.id)
 if(r.error)return c.reply(r.error)
 return c.reply((r.success?'⚡ *VOCÊ GANHOU AURA!*':'💀 *VOCÊ PERDEU AURA!*')+'\n\n'+(r.success?'+':'-')+r.amount.toLocaleString('pt-BR')+' aura\nSaldo atual: *'+r.score.toLocaleString('pt-BR')+' aura*\n\nPróxima tentativa em 5 minutos.\nVeja o ranking com '+c.prefix+'rankaura.')
}}
