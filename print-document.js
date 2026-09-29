(async function(){
  const profile=await window.TrustAuth.ready;if(window.TrustAuth.enabled&&!profile)return;
  const target=document.querySelector('#document'),status=document.querySelector('#print-status'),id=new URLSearchParams(location.search).get('id');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
  try{
    const db=await window.TrustFinanceStore.load()||window.TrustFinanceSeed,doc=(db.internalDocuments||[]).find(item=>item.id===id);
    if(!doc)throw new Error('المستند مش موجود أو الحساب مش مسموح له يفتحه.');
    document.title=doc.number+' | Trust M';
    target.innerHTML='<div class="top"><div><div class="brand">TRUST M</div><small>سجل المشتريات والمصروفات</small></div><div>'+esc(doc.number)+'<br>'+esc(doc.date)+'</div></div><h1>مستند مصروف داخلي</h1><p class="muted">توثيق مشتريات محلية ضمن ملف المشروع</p><div class="notice">المستند أعدته Trust M اعتمادًا على السجل الداخلي. مش فاتورة ضريبية أو فاتورة صادرة من المورّد.</div><div class="meta"><div><small>المشروع</small>'+esc(doc.projectName)+'</div><div><small>الفئة</small>'+esc(doc.category)+'</div><div><small>الشركة / المورّد</small>'+esc(doc.supplierName)+'</div><div><small>بيانات التواصل</small>'+(esc(doc.supplierContact)||'—')+'</div><div><small>المرجع الخارجي</small>'+(esc(doc.reference)||'—')+'</div><div><small>المصروف المرتبط</small>'+(esc(doc.expenseReference)||'غير مرتبط')+'</div></div><table><thead><tr><th>البند</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'+doc.items.map(item=>'<tr><td>'+esc(item.description)+'</td><td class="num">'+money(item.quantity)+'</td><td>'+esc(item.unit)+'</td><td class="num">'+money(item.price)+'</td><td class="num">'+money(item.quantity*item.price)+'</td></tr>').join('')+'</tbody></table><div class="total"><strong>الإجمالي المسجل</strong><strong>'+money(doc.total)+' جنيه مصري</strong></div><p><strong>ملاحظات:</strong> '+(esc(doc.notes)||'—')+'</p><div class="sign"><span>أعده</span><span>راجعه</span></div><div class="foot">Trust M · مستند داخلي للمراجعة · الضرائب والرسوم تتطلب مستند مورّد معتمد</div>';
    status.textContent='المستند جاهز';
  }catch(error){target.innerHTML='<div class="empty"><h1>تعذر فتح المستند</h1><p>'+esc(error.message)+'</p></div>';status.textContent='تعذر الفتح';}
  document.querySelector('#print-button').onclick=()=>window.print();
})();
