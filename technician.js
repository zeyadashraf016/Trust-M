(async function(){
  const profile=await window.TrustAuth.ready;
  if(window.TrustAuth.enabled&&!profile)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fmt=value=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(Number(value||0));
  const title=document.querySelector('#technician-title'),grid=document.querySelector('#technician-projects'),form=document.querySelector('#technician-receipt-form');
  form.elements.date.value=new Date().toISOString().slice(0,10);
  if(profile?.full_name)title.textContent='أهلًا يا '+profile.full_name.split(' ')[0];
  if(!window.TrustAuth.enabled){
    document.querySelector('#technician-mode').hidden=false;
    document.querySelector('#technician-mode').textContent='وضع المراجعة بس. تسجيل الإيصالات بيشتغل بعد توصيل Supabase وتسجيل الدخول بحساب فني.';
    grid.innerHTML='<article class="document-card"><small>بيانات تجريبية</small><h3>مشروع مسند ليك</h3><p>المرحلة الحالية ونسبة الإنجاز هتظهر هنا.</p></article>';
    form.querySelector('button').disabled=true;document.querySelector('#submission-list').innerHTML='<div class="empty-state compact"><p>مفيش إرسال حقيقي في وضع المراجعة.</p></div>';return;
  }
  const sb=window.TrustAuth.client;
  let projects=[];
  await loadProjects();await loadSubmissions();
  document.querySelector('#refresh-submissions').onclick=loadSubmissions;

  async function loadProjects(){
    const {data,error}=await sb.from('projects').select('id, project_name, project_code, location, status, current_phase, next_phase, target_end_date, project_phases(phase_name, progress_percent, sort_order)').order('target_end_date',{ascending:true});
    if(error){grid.innerHTML='<div class="empty-state"><strong>تعذر تحميل التكليفات</strong><p>'+esc(error.message)+'</p></div>';return;}
    projects=data||[];
    form.elements.project.innerHTML=projects.map(project=>'<option value="'+esc(project.id)+'">'+esc(project.project_name)+'</option>').join('');
    form.querySelector('button').disabled=!projects.length;
    if(!projects.length){grid.innerHTML='<div class="empty-state"><strong>لسه مفيش مشروع متسند ليك</strong><p>كلم لمياء عشان تضيفك لفريق المشروع.</p></div>';return;}
    grid.innerHTML=projects.map(project=>{const phases=(project.project_phases||[]).sort((a,b)=>a.sort_order-b.sort_order),active=phases.find(phase=>phase.progress_percent>0&&phase.progress_percent<100),progress=active?.progress_percent||Math.round(phases.reduce((n,phase)=>n+phase.progress_percent,0)/(phases.length||1));return '<article class="document-card technician-project-card"><small>'+esc(project.project_code||project.status)+'</small><h3>'+esc(project.project_name)+'</h3><p>'+esc(project.location||'الموقع مش مسجل')+'</p><div class="progress-ring" style="--progress:'+progress+'"><strong>'+progress+'%</strong></div><dl class="technician-meta"><div><dt>المرحلة الحالية</dt><dd>'+esc(active?.phase_name||project.current_phase||'مش محددة')+'</dd></div><div><dt>المرحلة الجاية</dt><dd>'+esc(project.next_phase||'مش محددة')+'</dd></div></dl><a class="quiet-button tech-card-action" href="#add-receipt" data-project-choice="'+esc(project.id)+'">ضيف إيصال للمشروع</a></article>';}).join('');
    grid.querySelectorAll('[data-project-choice]').forEach(link=>link.onclick=()=>form.elements.project.value=link.dataset.projectChoice);
  }

  form.onsubmit=async event=>{
    event.preventDefault();const errorBox=document.querySelector('#receipt-error'),button=event.submitter;errorBox.textContent='';button.disabled=true;
    const values=new FormData(form),file=values.get('file'),id=crypto.randomUUID();
    try{
      if(!file?.size||file.size>10*1024*1024||!['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type))throw new Error('اختار صورة أو PDF لحد 10 ميجا.');
      const safeName=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'-').slice(-100),path=profile.id+'/'+id+'-'+safeName;
      const {error:uploadError}=await sb.storage.from('trust-m-technician-receipts').upload(path,file,{upsert:false});if(uploadError)throw uploadError;
      const {error:insertError}=await sb.from('technician_submissions').insert({
        id,project_id:values.get('project'),submitted_by:profile.id,expense_date:values.get('date'),category:values.get('category'),amount:Number(values.get('amount')),notes:String(values.get('notes')).trim(),storage_path:path,original_name:file.name
      });
      if(insertError){await sb.storage.from('trust-m-technician-receipts').remove([path]);throw insertError;}
      form.reset();form.elements.date.value=new Date().toISOString().slice(0,10);form.elements.project.value=projects[0]?.id||'';
      errorBox.textContent='اترفع الإيصال واتبعث للمراجعة.';await loadSubmissions();
    }catch(error){errorBox.textContent=error.message||'تعذر رفع الإيصال. جرّب تاني.';}finally{button.disabled=false;}
  };

  async function loadSubmissions(){
    const target=document.querySelector('#submission-list');target.innerHTML='<p class="finance-note">بنحدّث القائمة…</p>';
    const {data,error}=await sb.from('technician_submissions').select('id, expense_date, category, amount, notes, status, review_note, created_at, projects(project_name)').order('created_at',{ascending:false}).limit(30);
    if(error){target.innerHTML='<div class="empty-state compact"><p>تعذر تحميل الإيصالات.</p></div>';return;}
    target.innerHTML=data?.length?'<div class="submission-cards">'+data.map(item=>'<article class="submission-card"><div><span class="status submission-'+esc(item.status)+'">'+({pending:'معلق',approved:'اتعمد',rejected:'مرفوض'}[item.status]||item.status)+'</span><small>'+esc(item.expense_date)+'</small></div><h3>'+esc(item.projects?.project_name||'مشروع')+'</h3><p>'+esc(item.notes)+'</p><strong>'+fmt(item.amount)+' ج.م</strong>'+(item.review_note?'<small>ملاحظة المراجعة: '+esc(item.review_note)+'</small>':'')+'</article>').join('')+'</div>':'<div class="empty-state compact"><strong>لسه مبعتش إيصالات</strong><p>أول إيصال تبعته هيظهر هنا وحالته هتتحدث بعد المراجعة.</p></div>';
  }
})();
