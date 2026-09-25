// Deliberately small mathematical language. No JavaScript evaluation.
export function evaluate(source, variables = {}) {
  const tokens = String(source).match(/(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?|[a-zA-Z_]+|[^\s]/g) || [];
  let at = 0;
  const funcs = {exp:Math.exp,ln:Math.log,sqrt:Math.sqrt,sqr:x=>x*x,sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,round:Math.round,floor:Math.floor,ceil:Math.ceil,abs:Math.abs};
  function atom() {
    const t=tokens[at++];
    if(t==='+'||t==='-') return (t==='-'?-1:1)*expr(3);
    if(t==='('){const n=expr(0);if(tokens[at++]!==')')throw Error('Ожидается )');return n;}
    if(/^[0-9.]/.test(t||''))return Number(t);
    if(Object.hasOwn(variables,t))return variables[t];
    if(t==='pi')return Math.PI;
    if(Object.hasOwn(funcs,t)){if(tokens[at++]!=='(')throw Error('Ожидается (');const n=expr(0);if(tokens[at++]!==')')throw Error('Ожидается )');return funcs[t](n);}
    throw Error('Неизвестное выражение: '+(t||''));
  }
  function expr(min){let a=atom();while(at<tokens.length){const op=tokens[at],p={'+':1,'-':1,'*':2,'/':2,'%':2,'^':3}[op];if(!p||p<min)break;at++;const b=expr(p+(op==='^'?0:1));a=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:op==='%'?a%b:a**b;}return a;}
  const result=expr(0);if(at!==tokens.length||!Number.isFinite(result))throw Error('Некорректное числовое выражение');return result;
}
