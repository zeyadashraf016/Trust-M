(function(root){
 const M=typeof module!=='undefined'?require('./finance-model.js'):root.FinanceModel;
 const catalog=[
 ['pnl','Operating profit & loss','Profitability','Recorded earned revenue less incurred costs; before tax.'],
 ['monthly-pnl','Monthly profit & loss','Profitability','Revenue, direct costs, overhead and profit for each active month.'],
 ['project-profit','Project profitability','Profitability','Compare project revenue, costs and operating margins.'],
 ['revenue','Revenue by project','Profitability','Earned revenue, independently of client cash receipts.'],
 ['expense-category','Expenses by category','Costs','Group incurred costs by their recorded category.'],
 ['expense-supplier','Expenses by supplier / technician','Costs','Group incurred costs by the recorded counterparty name.'],
 ['expense-detail','Detailed expense register','Costs','Every recorded expense and its supporting reference.'],
 ['receipts','Client receipt register','Cash','Dated client receipts and payment references.'],
 ['payments','Supplier & technician payment register','Cash','Dated outgoing cash payments; not an expense recognition report.'],
 ['cash','Cash movement register','Cash','Cash receipts and outgoings with opening and running net movement.'],
 ['monthly-cash','Monthly cash movements','Cash','Cash received, paid and net movement by active month.'],
 ['client-balances','Client balance summary','Clients','Charges less receipts through the end date, including earlier activity.'],
 ['client-statement','Client statement detail','Clients','Opening balances, charges, receipts and running client balances.'],
 ['charges','Client charge register','Clients','All posted client charges, including earned portions.'],
 ['charge-revenue','Charges and earned revenue','Clients','Compare client charges with their recorded earned portions.'],
 ['quotations','Quotation register','Documents','Saved quotations and their current statuses; not posted revenue.'],
 ['invoices','Invoice document register','Documents','Archived invoice metadata; values are not additional expenses.'],
 ['missing-documents','Expenses without linked invoices','Documents','Recorded expenses with no linked invoice document.']
 ].map(([id,title,group,note])=>({id,title,group,note}));
 function build(db,key,project='all',from='',to=''){
  const entry=catalog.find(r=>r.id===key);if(!entry)throw Error('Unknown report');
  const select=rows=>M.scope(rows,project,from,to),through=rows=>M.scope(rows,project,'',to);
  const ps=db.projects.filter(p=>project==='all'||p.id===project),name=id=>db.projects.find(p=>p.id===id)?.name||id;
  const expenses=select(db.expenses),charges=select(db.charges),payments=select(db.payments);
  const group=(rows,key,fn)=>[...new Set(rows.map(key))].sort().map(k=>[k,M.sum(rows.filter(r=>key(r)===k),fn)]);
  const months=rows=>[...new Set(rows.map(r=>r.date?r.date.slice(0,7):'من غير تاريخ'))].sort();
  const total=(rows,key)=>key==='earned'&&rows.some(r=>r.earned==null)?null:M.sum(rows,r=>r[key]);
  const pending=ps.some(p=>p.accountingPending);
  let headers=[],rows=[],note=entry.note,numeric=[];
  if(key==='pnl'){const r=M.pnl(db,project,from,to);headers=['Line','EGP'];rows=[['Earned revenue',r.revenue],['Direct costs',r.direct],['Gross profit',r.gross],['Overheads',r.overhead],['Operating profit before tax',r.profit]];numeric=[1];}
  if(key==='monthly-pnl'){headers=['Month','Earned revenue','Direct costs','Overheads','Operating profit'];numeric=[1,2,3,4];rows=months([...charges,...expenses]).map(month=>{const c=charges.filter(r=>(r.date?r.date.slice(0,7):'من غير تاريخ')===month),e=expenses.filter(r=>(r.date?r.date.slice(0,7):'من غير تاريخ')===month),rev=pending?null:total(c,'earned'),direct=total(e.filter(r=>r.category!=='Overhead'),'amount'),overhead=total(e.filter(r=>r.category==='Overhead'),'amount');return [month,rev,direct,overhead,rev==null?null:M.money(rev-direct-overhead)];});}
  if(key==='project-profit'){headers=['Project','Earned revenue','Direct costs','Overhead','Operating profit','Operating margin %'];numeric=[1,2,3,4,5];rows=ps.map(p=>{const r=M.pnl(db,p.id,from,to);return [p.name,r.revenue,r.direct,r.overhead,r.profit,r.revenue?M.money(r.profit/r.revenue*100):null];});}
  if(key==='revenue'){headers=['Project','Earned revenue · EGP'];numeric=[1];rows=ps.map(p=>[p.name,p.accountingPending?null:total(charges.filter(r=>r.project===p.id),'earned')]);}
  if(key==='expense-category'||key==='expense-supplier'){headers=[key==='expense-category'?'Category':'Counterparty','Incurred expenses · EGP'];numeric=[1];rows=group(expenses,r=>(key==='expense-category'?r.category:r.party)||'Not recorded',r=>r.amount);if(key==='expense-supplier')note+=' Grouped by exact recorded name; duplicate names are not automatically merged.';}
  if(key==='expense-detail'||key==='missing-documents'){headers=['Date','Project','Category','Counterparty','Description','Reference','Incurred cost · EGP'];numeric=[6];rows=expenses.filter(r=>key!=='missing-documents'||!db.invoices.some(i=>i.linked===r.id)).map(r=>[r.date,name(r.project),r.category,r.party,r.description,r.reference,r.amount]);if(key==='missing-documents')note+=' Checks documents linked now, even if uploaded after the report period; does not establish invoice validity.';}
  if(key==='receipts'||key==='payments'){headers=['Date','Project','Counterparty','Description','Method','Reference','EGP'];numeric=[6];rows=payments.filter(r=>r.direction===(key==='receipts'?'in':'out')).map(r=>[r.date,name(r.project),r.party,r.description,r.method,r.reference,r.amount]);}
  if(key==='cash'){headers=['Date','Project','Description','Receipt','Outgoing','Cumulative net movement'];numeric=[3,4,5];const earlier=through(db.payments).filter(r=>from&&r.date&&r.date<from);let running=M.sum(earlier,r=>r.direction==='in'?r.amount:-r.amount);rows=[['Opening','','Net recorded movement before period',0,0,running],...payments.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).map(r=>{running=M.money(running+(r.direction==='in'?r.amount:-r.amount));return [r.date,name(r.project),r.description,r.direction==='in'?r.amount:0,r.direction==='out'?r.amount:0,running];})];note+=' This is not a bank balance or a statutory cash flow statement; opening cash balances are not recorded.';}
  if(key==='monthly-cash'){headers=['Month','Client receipts','Outgoing payments','Net movement'];numeric=[1,2,3];rows=months(payments).map(month=>{const rs=payments.filter(r=>(r.date?r.date.slice(0,7):'من غير تاريخ')===month),incoming=total(rs.filter(r=>r.direction==='in'),'amount'),outgoing=total(rs.filter(r=>r.direction==='out'),'amount');return [month,incoming,outgoing,M.money(incoming-outgoing)];});}
  if(key==='client-balances'){headers=['Project','Client','Charges to date','Receipts to date','Balance to collect','Client credit'];numeric=[2,3,4,5];rows=ps.map(p=>{const s=M.statement(db,p.id,'',to);return [p.name,p.client,s.charges,s.receipts,Math.max(0,s.closing),Math.max(0,-s.closing)];});note+=' The start date is intentionally ignored. This is not an overdue/aging assessment.';}
  if(key==='client-statement'){headers=['Project','Client','Date','Entry','Description','Charges','Receipts','Client balance'];numeric=[5,6,7];rows=ps.flatMap(p=>{const s=M.statement(db,p.id,from,to);return [[p.name,p.client,'Opening','','Prior activity',0,0,s.opening],...s.rows.map(r=>[p.name,p.client,r.date,r.type,r.description,r.debit,r.credit,r.balance])];});note+=' Running balance resets per project. Positive is unpaid charges; negative is client credit. Internal costs are excluded.';}
  if(key==='charges'){headers=['Date','Project','Description','Charged · EGP','Earned · EGP'];numeric=[3,4];rows=charges.map(r=>[r.date,name(r.project),r.description,r.amount,r.earned]);}
  if(key==='charge-revenue'){headers=['Project','Client charges','Recorded earned revenue','Unearned portion of charges'];numeric=[1,2,3];rows=ps.map(p=>{const cs=charges.filter(r=>r.project===p.id),charged=total(cs,'amount'),earned=p.accountingPending?null:total(cs,'earned');return [p.name,charged,earned,earned==null?null:M.money(charged-earned)];});note+=' This is a charge reconciliation, not a deferred-revenue liability balance.';}
  if(key==='quotations'){headers=['Reference','Project','Date','Current status','Line subtotal','Supervision fee','Design fee','Total · EGP'];numeric=[4,5,6,7];rows=select(db.quotes).map(q=>{const t=M.quote(q);return [q.reference,name(q.project),q.date,q.status,t.base,t.fee,q.design,t.total];});note+=' Filtered by quotation date; status history and budget baselines are not stored.';}
  if(key==='invoices'){headers=['Invoice no.','Project','Invoice date','Issuer','Filename','Expense reference','Face value · EGP'];numeric=[6];rows=select(db.invoices).map(r=>[r.number,name(r.project),r.date,r.party,r.name,db.expenses.find(e=>e.id===r.linked)?.reference||'Not linked',r.amount]);}
  if(ps.some(p=>p.source))note+=' بيانات الملف اللي من غير تاريخ بتظهر في كل الحركات بس، وبتتستبعد عند اختيار فترة. الأرباح والإيراد المكتسب غير مؤكدين وبيظهروا بشرطة. اختار كل الحركات لعرض رصيد الملف كامل.';
  return {...entry,note,headers,rows,numeric,project,from,to};
 }
 const api={catalog,build};if(typeof module!=='undefined')module.exports=api;else root.TrustReports=api;
})(globalThis);
