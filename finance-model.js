(function(root){
 const cents=n=>Math.round(Number(n)*100);
 const money=n=>{const value=cents(n)/100;return Object.is(value,-0)?0:value;};
 const sum=(rows,fn)=>money(rows.reduce((a,r)=>a+cents(fn(r)),0)/100);
 function scope(rows,project,from,to){return rows.filter(r=>(project==='all'||r.project===project)&&(r.date?(!from||r.date>=from)&&(!to||r.date<=to):!from&&!to));}
 function pnl(db,project,from,to){
  const pending=db.projects?.some(p=>(project==='all'||p.id===project)&&p.accountingPending);
  const revenue=pending?null:sum(scope(db.charges,project,from,to),r=>r.earned);
  const expenses=scope(db.expenses,project,from,to);
  const direct=sum(expenses.filter(r=>r.category!=='Overhead'),r=>r.amount);
  const overhead=sum(expenses.filter(r=>r.category==='Overhead'),r=>r.amount);
  return {revenue,direct,overhead,gross:pending?null:money(revenue-direct),profit:pending?null:money(revenue-direct-overhead)};
 }
 function statement(db,project,from,to){
  const movements=[...db.charges.filter(r=>r.project===project).map(r=>({...r,type:'Charge',debit:r.amount,credit:0})),...db.payments.filter(r=>r.project===project&&r.direction==='in').map(r=>({...r,type:'Receipt',debit:0,credit:r.amount}))].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const opening=sum(movements.filter(r=>from&&r.date&&r.date<from),r=>r.debit-r.credit);
  let balance=opening;const rows=scope(movements,project,from,to).map(r=>{balance=money(balance+r.debit-r.credit);return {...r,balance};});
  return {opening,rows,closing:balance,charges:sum(rows,r=>r.debit),receipts:sum(rows,r=>r.credit)};
 }
 function quote(q){const base=sum(q.items,r=>money(r.quantity*r.rate));const fee=money(base*q.fee/100);return {base,fee,total:money(base+fee+q.design)};}
 function csv(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(typeof v==='string'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
 const api={cents,money,sum,scope,pnl,statement,quote,csv};if(typeof module!=='undefined')module.exports=api;else root.FinanceModel=api;
})(globalThis);
