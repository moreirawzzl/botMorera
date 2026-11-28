const {randomInt}=require('node:crypto');
function win(b,c){return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(l=>l.every(i=>b[i]===c));}
function cells(b){return b.flatMap((v,i)=>v?[]:[i]);}
function minimax(b,t,d){if(win(b,'O'))return 10-d;if(win(b,'X'))return d-10;const a=cells(b);if(!a.length)return 0;const v=a.map(i=>{const n=b.slice();n[i]=t;return minimax(n,t==='O'?'X':'O',d+1)});return t==='O'?Math.max(...v):Math.min(...v);}
function best(b){const a=cells(b).map(i=>{const n=b.slice();n[i]='O';return [i,minimax(n,'X',1)]});const m=Math.max(...a.map(x=>x[1]));return a.filter(x=>x[1]===m).map(x=>x[0]);}

function chooseMove(b,mode){const a=cells(b);if(!a.length)return;const pick=x=>x[randomInt(x.length)];if(mode==='facil'&&randomInt(100)<65)return pick(a);const immediate=c=>a.find(i=>{const n=b.slice();n[i]=c;return win(n,c)});if(mode==='facil'||mode==='dificil')return immediate('O')??immediate('X')??(a.includes(4)?4:pick(a));const v=best(b);return mode==='master'?[4,0,2,6,8,1,3,5,7].find(i=>v.includes(i)):pick(v);}

module.exports={chooseMove,win,best};
