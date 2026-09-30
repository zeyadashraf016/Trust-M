(async function(){
  const profile=await window.TrustAuth.ready;
  const panel=document.querySelector('#technician-approvals');
  if(!panel||!window.TrustAuth.enabled||!profile||profile.role!=='lamiaa_owner')return;
  const sb=window.TrustAuth.client,esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),fmt=value=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(Number(value||0));
  panel.hidden=false;await load();

  async function load(){
    panel.innerHTML='<p class="finance-note">بنفتح إيصالات الفنيين المعلقة…</p>';
    const {data,error}=await sb.from('technician_submissions').select('id, expense_date, category, amount, notes, storage_path, original_name, status, created_at, projects(project_name), profiles!technician_submissions_submitted_by_fkey(full_name)').order('created_at',{ascending:false}).limit(50);
    if(error){panel.innerHTML='<div class="empty-state compact"><strong>تعذر تحميل إيصالات الفنيين</strong><p>'+esc(error.message)+'</p></div>';return;}
    const pending=(data||[]).filter(item=>item.status==='pending'),recent=(data||[]).filter(item=>item.status!=='pending').slice(0,5);
    panel.innerHTML='<div class="section-top"><div><div class="eyebrow">مراجعة واعتماد</div><h2>إيصالات الفنيين <span class="count">'+pending.length+'</span></h2><p class="finance-note">اعتماد الإيصال بيضيف مصروف مشروع في السجل المالي. الرفض ما بيضيفش أي حركة.</p></div><button class="quiet-button" id="refresh-approvals" type="button">حدّث</button></div>'+(pending.length?'<div class="approval-grid">'+pending.map(card).join('')+'</div>':'<div class="empty-state compact"><strong>مفيش إيصالات مستنية مراجعة</strong><p>أي إيصال جديد من الفنيين هيظهر هنا.</p></div>')+(recent.length?'<details class="recent-reviews"><summary>آخر مراجعات</summary><div class="submission-cards">'+recent.map(item=>'<article class="submission-card"><span class="status submission-'+esc(item.status)+'">'+(item.status==='approved'?'اتعمد':'مرفوض')+'</span><h3>'+esc(item.projects?.project_name||'مشروع')+'</h3><p>'+esc(item.notes)+'</p><strong>'+fmt(item.amount)+' ج.م</strong></article>').join('')+'</div></details>':'');
    panel.querySelector('#refresh-approvals').onclick=load;
    panel.querySelectorAll('[data-open-submission]').forEach(button=>button.onclick=()=>openFile(button.dataset.openSubmission));
    panel.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>review(button.dataset.review,button.dataset.decision==='approve'));
  }

  function card(item){
    return '<article class="approval-card" data-submission="'+esc(item.id)+'"><div class="approval-card-top"><span class="status submission-pending">معلق</span><small>'+esc(item.expense_date)+'</small></div><h3>'+esc(item.projects?.project_name||'مشروع')+'</h3><p>'+esc(item.notes)+'</p><dl><div><dt>الفني</dt><dd>'+esc(item.profiles?.full_name||'فني')+'</dd></div><div><dt>الفئة</dt><dd>'+esc(item.category)+'</dd></div><div><dt>القيمة</dt><dd>'+fmt(item.amount)+' ج.م</dd></div></dl><label>ملاحظة المراجعة<input data-review-note maxlength="300" placeholder="اختياري"></label><div class="project-action-row"><button type="button" data-open-submission="'+esc(item.storage_path)+'">افتح الإيصال</button><button type="button" data-review="'+esc(item.id)+'" data-decision="approve" class="approve-button">اعتمد</button><button type="button" data-review="'+esc(item.id)+'" data-decision="reject" class="reject-button">ارفض</button></div><p class="form-error" role="alert"></p></article>';
  }

  async function openFile(path){
    const {data,error}=await sb.storage.from('trust-m-technician-receipts').createSignedUrl(path,60);
    if(error){setPanelMessage(error.message);return;}
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }

  async function review(id,approved){
    const card=panel.querySelector('[data-submission="'+CSS.escape(id)+'"]'),buttons=card.querySelectorAll('button'),note=card.querySelector('[data-review-note]').value;
    buttons.forEach(button=>button.disabled=true);
    const {error}=await sb.rpc('review_technician_submission',{p_submission_id:id,p_approved:approved,p_review_note:note||null});
    if(error){card.querySelector('.form-error').textContent=error.message||'تعذر حفظ المراجعة.';buttons.forEach(button=>button.disabled=false);return;}
    await load();
  }

  function setPanelMessage(message){let status=panel.querySelector('[role="status"]');if(!status){status=document.createElement('p');status.setAttribute('role','status');panel.append(status);}status.textContent=message;}
})();
