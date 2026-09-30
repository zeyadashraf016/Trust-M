(async function(){
  const profile=await window.TrustAuth.ready;
  if(window.TrustAuth.enabled&&!profile)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:0}).format(Number(value||0))+' ج.م';
  const statusLabel=status=>({planning:'تجهيز',active:'شغال',on_hold:'متوقف مؤقتًا',completed:'مكتمل',cancelled:'ملغي'}[status]||status||'غير محدد');
  const dateText=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  document.querySelector('#client-date').textContent=dateText;
  document.querySelector('#client-footer-date').textContent='آخر فتح للبوابة: '+dateText;
  if(window.TrustAuth.enabled&&profile?.full_name)document.querySelector('#client-greeting').innerHTML='أهلًا يا '+esc(profile.full_name.split(' ')[0])+'<span>.</span>';

  try{
    const projects=window.TrustAuth.enabled?await loadProjects():demoProjects();
    if(!window.TrustAuth.enabled){const notice=document.querySelector('#client-mode');notice.hidden=false;notice.textContent='وضع مراجعة ببيانات وهمية. الحساب الحقيقي بيعرض مشروعات العميل المسجلة بس.';}
    render(projects);
  }catch(error){
    console.error(error);
    document.querySelector('#client-project-list').innerHTML='<section class="panel empty-state"><strong>تعذر تحميل مشروعاتك</strong><p>راجع الاتصال أو كلم فريق Trust M.</p></section>';
  }finally{finishLoader();}

  async function loadProjects(){
    const {data,error}=await window.TrustAuth.client.rpc('get_client_portal_projects');
    if(error)throw error;
    return (data||[]).map(project=>({...project,name:project.project_name,progress:Number(project.progress_percent||0),schedule:Array.isArray(project.phases)?project.phases:[]}));
  }

  function demoProjects(){
    return [{id:'client-demo',name:'مشروع تجريبي للعميل',project_code:'DEMO-01',location:'القاهرة الجديدة',status:'active',current_phase:'التشطيبات',next_phase:'المعاينة النهائية',start_date:'2026-08-01',target_end_date:'2026-11-15',total_contract_value:350000,progress:72,schedule:[{name:'التصميم والاعتمادات',from:'2026-08-01',to:'2026-08-15',progress:100,status:'complete'},{name:'التنفيذ والتشطيبات',from:'2026-08-16',to:'2026-10-31',progress:72,status:'in_progress'},{name:'المعاينة والتسليم',from:'2026-11-01',to:'2026-11-15',progress:0,status:'planned'}]}];
  }

  function render(projects){
    document.querySelector('#client-project-count').textContent=projects.length;
    const list=document.querySelector('#client-project-list');
    if(!projects.length){list.innerHTML='<section class="panel empty-state"><strong>لسه مفيش مشروع مربوط بالحساب</strong><p>كلم فريق Trust M عشان يربط حسابك بالمشروع.</p></section>';return;}
    list.innerHTML='<div class="client-project-grid">'+projects.map(project=>'<article class="project panel clickable-project client-project-card" data-client-project="'+esc(project.id)+'" tabindex="0" role="button" aria-haspopup="dialog"><div class="project-head"><div class="project-number">'+esc(project.project_code||'TM')+'</div><div class="project-name"><h3>'+esc(project.name)+'</h3><p>'+esc(project.location||'الموقع مش مسجل')+'</p></div><span class="status '+(project.status==='active'?'on-track':'warning')+'">'+esc(statusLabel(project.status))+'</span></div><div class="progress-label"><span>نسبة الإنجاز</span><strong>'+project.progress+'%</strong></div><div class="progress" role="progressbar" aria-label="نسبة إنجاز المشروع" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+project.progress+'"><span style="width:'+Math.max(0,Math.min(100,project.progress))+'%"></span></div><div class="phases"><div><small>المرحلة الحالية</small><span>'+esc(project.current_phase||'مش محددة')+'</span></div><span class="phase-arrow">←</span><div><small>المرحلة الجاية</small><span>'+esc(project.next_phase||'مش محددة')+'</span></div></div><dl class="client-project-meta"><div><dt>قيمة التعاقد</dt><dd>'+money(project.total_contract_value)+'</dd></div><div><dt>ميعاد التسليم المستهدف</dt><dd>'+esc(project.target_end_date||'مش مسجل')+'</dd></div></dl><button class="project-open" type="button">افتح تفاصيل المشروع</button></article>').join('')+'</div>';
    list.querySelectorAll('[data-client-project]').forEach(card=>{const open=()=>show(projects.find(project=>String(project.id)===card.dataset.clientProject));card.onclick=event=>{if(!event.target.closest('button'))open();};card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}};card.querySelector('button').onclick=open;});
  }

  function show(project){
    const dialog=document.querySelector('#client-project-dialog')||makeDialog();
    const rows=(project.schedule||[]).length?project.schedule.map(item=>'<div class="timeline-row"><span class="timeline-status '+esc(item.status||'planned')+'"></span><div><strong>'+esc(item.name)+'</strong><small>'+esc(item.from||'')+' — '+esc(item.to||'')+'</small></div><b>'+Number(item.progress||0)+'%</b></div>').join(''):'<div class="empty-state compact"><p>لسه مفيش مراحل متسجلة.</p></div>';
    dialog.innerHTML='<div class="detail-header"><div><div class="eyebrow">تفاصيل المشروع</div><h2 id="client-project-dialog-title">'+esc(project.name)+'</h2><p>'+esc(project.location||'')+'</p></div><button class="close-detail" type="button" aria-label="اقفل">×</button></div><div class="detail-body"><div class="detail-summary"><span class="status '+(project.status==='active'?'on-track':'warning')+'">'+esc(statusLabel(project.status))+'</span><span>'+project.progress+'% مكتمل</span><span>التسليم المستهدف: '+esc(project.target_end_date||'مش مسجل')+'</span></div><div class="phases"><div><small>المرحلة الحالية</small><span>'+esc(project.current_phase||'مش محددة')+'</span></div><span class="phase-arrow">←</span><div><small>المرحلة الجاية</small><span>'+esc(project.next_phase||'مش محددة')+'</span></div></div><section class="detail-section"><h3>الجدول الزمني</h3><div class="project-timeline">'+rows+'</div></section><p class="client-privacy-note">التكاليف الداخلية وأرباح Trust M مش ظاهرة في بوابة العميل.</p></div>';
    dialog.querySelector('.close-detail').onclick=()=>dialog.close();dialog.showModal();
  }

  function makeDialog(){const dialog=document.createElement('dialog');dialog.id='client-project-dialog';dialog.className='project-dialog';dialog.setAttribute('aria-labelledby','client-project-dialog-title');dialog.onclick=event=>{if(event.target===dialog)dialog.close();};document.body.append(dialog);return dialog;}
  function finishLoader(){const loader=document.querySelector('#loader'),seen=sessionStorage.getItem('trust-m-brand-seen');setTimeout(()=>loader.classList.add('finished'),seen?0:850);sessionStorage.setItem('trust-m-brand-seen','1');}
})();
