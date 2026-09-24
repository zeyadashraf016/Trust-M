(function(root){
 'use strict';
 const projectId='ahmed-apartment-8';
 function merge(db,source){
  if(db.projects.some(p=>p.id===projectId))return false;
  const get=(r,c)=>source.rows.find(x=>x.number===r)?.cells.find(x=>x.col===c)?.value??null;
  const origin=row=>({file:source.filename,sheet:source.sheet,row,sha256:source.sha256});
  const record=row=>({project:projectId,date:get(row,6)||'',source:origin(row),sourceRow:row,reference:`${source.sheet}!${row}`});
  db.projects.unshift({id:projectId,name:get(3,1),client:'مهندس احمد',type:'تشطيب وإشراف',source:{file:source.filename,sha256:source.sha256},accountingPending:true});
  for(const row of source.rows){
   const r=row.number;
   if(r>=6&&r<=9&&typeof get(r,1)==='number')db.payments.push({...record(r),id:`AHMED-RECEIPT-${r}`,direction:'in',amount:get(r,1),party:'مهندس احمد',description:get(r,5)||'',method:get(r,4)||'',status:get(r,2)||''});
   if(r>=12&&r<=26&&typeof get(r,3)==='number')db.expenses.push({...record(r),id:`AHMED-EXPENSE-${r}`,amount:get(r,3),party:'',category:get(r,4)||'',description:get(r,5)||'',status:get(r,2)||'',serial:get(r,7)});
  }
  for(const [r,description,chargeType] of [[27,'إجمالي المصروفات حسب الكشف','cost'],[29,get(29,5),'supervision'],[30,get(30,5),'design'],[31,get(31,5)||'بند إضافي حسب الكشف','other']]){
   if(typeof get(r,3)==='number')db.charges.push({...record(r),date:'',id:`AHMED-CHARGE-${r}`,amount:get(r,3),earned:null,description,chargeType});
  }
  db.sheetNotes??={};db.sheetNotes[projectId]=source.rows.filter(r=>r.number>=36&&get(r.number,5)).map(r=>({date:'',text:get(r.number,5),source:origin(r.number)}));
  return true;
 }
 const api={projectId,merge};if(typeof module!=='undefined')module.exports=api;else root.TrustSourceImport=api;
})(globalThis);
