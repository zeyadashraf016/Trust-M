/* Internal supporting documents. These are not supplier-issued or tax invoices. */
(function(root){
 'use strict';
 const categories=['خامات وتشطيبات','كهرباء وإضاءة','سباكة وصحي','نجارة وألوميتال','نقل وخدمات'];
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const money=value=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
 const rows=db=>db.internalDocuments||[];
 const companies=db=>db.supplierCompanies||[];
 const expenseLabel=(db,id)=>{const item=db.expenses.find(x=>x.id===id);return item?item.reference+' · '+item.description:'';};
 function render(db){
  const suppliers=companies(db),documents=rows(db),today=new Date().toISOString().slice(0,10);
  return `<div class="supplier-docs" dir="rtl" lang="ar-EG">
   <div class="finance-tools"><div><div class="eyebrow">TRUST M · مستندات المشتريات</div><h2>مستندات المصروف PDF</h2><p>جهّز مستند داخلي منسق لأي مشتريات محلية مفيش ليها فاتورة مورّد، واربطه بالمصروف المسجل.</p></div></div>
   <p class="demo-notice">المستند ده صادر من Trust M لتوثيق المصروف داخليًا. مش فاتورة ضريبية ولا فاتورة صادرة من المورّد. لو المورّد أصدر فاتورة فعلية، احفظها في تبويب «الفواتير».</p>
   <div class="supplier-layout"><section class="panel"><h3>الشركات حسب الفئة</h3><p class="finance-note">خمس فئات جاهزة. سجّل اسم الشركة الحقيقي وبياناتها قبل استخدامها؛ مفيش أسماء شركات مفترضة.</p>
   <div class="supplier-categories">${categories.map(c=>`<div><strong>${c}</strong><span>${suppliers.filter(s=>s.category===c).map(s=>esc(s.name)).join('، ')||'لسه مفيش شركة مسجلة'}</span></div>`).join('')}</div>
   <form id="supplier-company-form" class="finance-form"><label>الفئة<select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></label><label>اسم الشركة / المورّد<input name="name" required maxlength="150" placeholder="الاسم من بيانات المورّد"></label><label>بيانات التواصل أو العنوان<input name="contact" maxlength="200" placeholder="اختياري"></label><div class="form-actions"><button type="submit" class="quiet-button">سجّل الشركة</button></div></form></section>
   <section class="panel"><h3>مستند مصروف جديد</h3><form id="supplier-document-form" class="finance-form">
   <label>المشروع<select name="project" required>${db.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
   <label>الشركة<select name="supplier" required><option value="">اختار شركة مسجلة</option>${suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.category)}</option>`).join('')}</select></label>
   <label>تاريخ المستند<input type="date" name="date" value="${today}" required></label><label>مرجع خارجي أو رقم إيصال<input name="reference" maxlength="100" placeholder="اختياري"></label>
   <label class="wide">المصروف المرتبط<select name="expense"><option value="">مستند مستقل للمراجعة</option>${db.expenses.map(e=>`<option value="${esc(e.id)}" data-project="${esc(e.project)}">${esc(e.reference)} · ${esc(e.description)} · ${money(e.amount)} ج</option>`).join('')}</select></label>
   <label class="wide">البنود: كل سطر «البيان | الكمية | الوحدة | سعر الوحدة»<textarea name="items" rows="5" required placeholder="سيراميك أرضيات | 10 | متر | 350&#10;نقل الخامات | 1 | خدمة | 500"></textarea></label>
   <label class="wide">ملاحظات / طريقة الإثبات<textarea name="notes" rows="2" maxlength="1000" placeholder="مثال: تم الدفع نقدًا، والإيصال الأصلي غير متاح"></textarea></label>
   <div class="form-actions"><button type="submit" class="gold-button">احفظ وجهّز PDF</button></div></form></section></div>
   <section class="panel"><div class="section-top"><div><h3>المستندات المحفوظة</h3><p class="finance-note">تقدر تفتح أي مستند وتختار حفظه PDF من نافذة الطباعة.</p></div></div>
   <div class="finance-table-wrap"><table class="finance-table"><thead><tr><th>الرقم</th><th>التاريخ</th><th>المشروع</th><th>الشركة</th><th>الفئة</th><th>الإجمالي</th><th>المصروف المرتبط</th><th></th></tr></thead><tbody>${documents.length?documents.slice().reverse().map(d=>`<tr><td>${esc(d.number)}</td><td>${esc(d.date)}</td><td>${esc(db.projects.find(p=>p.id===d.project)?.name)}</td><td>${esc(d.supplierName)}</td><td>${esc(d.category)}</td><td>${money(d.total)} ج</td><td>${esc(expenseLabel(db,d.expense))||'—'}</td><td><button class="quiet-button" data-doc-pdf="${esc(d.id)}">افتح PDF</button></td></tr>`).join(''):'<tr><td colspan="8">لسه مفيش مستندات داخلية.</td></tr>'}</tbody></table></div></section></div>`;
 }
 function parseItems(value){
  const lines=String(value).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length||lines.length>50)throw Error('اكتب من بند واحد لحد 50 بند.');
  return lines.map((line,index)=>{const parts=line.split('|').map(x=>x.trim());if(parts.length!==4||!parts[0]||!parts[2])throw Error('راجع تنسيق البند رقم '+(index+1)+'.');const qty=Number(parts[1]),price=Number(parts[3]);if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0)throw Error('راجع كمية وسعر البند رقم '+(index+1)+'.');return {description:parts[0].slice(0,250),quantity:qty,unit:parts[2].slice(0,40),price:Math.round(price*100)/100};});
 }
 function printDocument(d,existingWindow){
  const url='print-document.html?id='+encodeURIComponent(d.id);
  const popup=existingWindow||window.open(url,'_blank','noopener');
  if(!popup)throw Error('المتصفح منع نافذة المستند. افتحه من قائمة المستندات المحفوظة.');
  if(existingWindow)popup.location.replace(url);
  popup.focus();
 }
 function bind({db,change,render:refresh,notice,projectName}){
  const companyForm=document.querySelector('#supplier-company-form');
  companyForm.onsubmit=async event=>{event.preventDefault();const f=new FormData(companyForm),name=String(f.get('name')).trim(),category=String(f.get('category'));if(!name)return;try{await change(next=>{next.supplierCompanies||=[];if(next.supplierCompanies.some(s=>s.name.toLocaleLowerCase('ar')===name.toLocaleLowerCase('ar')&&s.category===category))throw Error('الشركة دي مسجلة بالفعل في نفس الفئة.');next.supplierCompanies.push({id:crypto.randomUUID(),name,category,contact:String(f.get('contact')).trim()});});refresh();notice('اتسجلت الشركة على المتصفح ده.');}catch(error){notice(error.message);}};
  const docForm=document.querySelector('#supplier-document-form');
  const syncExpenses=()=>{const project=docForm.elements.project.value;for(const option of docForm.elements.expense.options)if(option.value)option.hidden=option.dataset.project!==project;if(docForm.elements.expense.selectedOptions[0]?.hidden)docForm.elements.expense.value='';};
  docForm.elements.project.onchange=syncExpenses;syncExpenses();
  docForm.onsubmit=async event=>{event.preventDefault();const f=new FormData(docForm);let popup;try{const supplier=companies(db).find(s=>s.id===f.get('supplier'));if(!supplier)throw Error('سجّل واختار شركة الأول.');const items=parseItems(f.get('items')),total=Math.round(items.reduce((sum,i)=>sum+i.quantity*i.price,0)*100)/100;if(total<=0||total>1e12)throw Error('راجع إجمالي المستند.');const expense=db.expenses.find(e=>e.id===f.get('expense'));if(expense&&expense.project!==f.get('project'))throw Error('المصروف تابع لمشروع تاني.');const nextNumber='TM-INT-'+String(Math.max(0,...rows(db).map(d=>Number(String(d.number).split('-').pop())||0))+1).padStart(5,'0');const doc={id:crypto.randomUUID(),number:nextNumber,date:String(f.get('date')),project:String(f.get('project')),projectName:projectName(f.get('project')),supplier:supplier.id,supplierName:supplier.name,supplierContact:supplier.contact,category:supplier.category,expense:expense?.id||'',expenseReference:expense?.reference||'',reference:String(f.get('reference')).trim(),items,total,notes:String(f.get('notes')).trim()};popup=window.open('','_blank');await change(next=>{next.internalDocuments||=[];next.internalDocuments.push(doc);});refresh();notice('المستند اتحفظ. اختار الطباعة أو الحفظ PDF من الصفحة الجديدة.');if(popup)printDocument(doc,popup);else notice('المستند اتحفظ. افتحه من قائمة المستندات المحفوظة عشان تحفظه PDF.');}catch(error){popup?.close();notice(error.message);}};
  document.querySelectorAll('[data-doc-pdf]').forEach(button=>button.onclick=()=>{const d=rows(db).find(x=>x.id===button.dataset.docPdf);if(d)try{printDocument(d);}catch(error){notice(error.message);}});
 }
 root.TrustSupplierDocs={render,bind};
})(globalThis);
