(async function(){
  const profile=await window.TrustAuth.ready;
  if(!profile)return;
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
    renderOverview(projects);
    render(projects);
  }catch(error){
    console.error(error);
    document.querySelector('#client-project-list').innerHTML='<section class="panel empty-state"><strong>تعذر تحميل مشروعاتك</strong><p>راجع الاتصال أو كلم فريق Trust M.</p></section>';
  }finally{finishLoader();}

  async function loadProjects(){
    const [projectsResult,overviewResult]=await Promise.all([
      window.TrustAuth.client.rpc('get_client_portal_projects'),
      window.TrustAuth.client.rpc('get_client_portal_overview')
    ]);
    if(projectsResult.error)throw projectsResult.error;
    if(overviewResult.error&&overviewResult.error.code!=='42883')throw overviewResult.error;
    const overview=new Map((overviewResult.data||[]).map(item=>[String(item.id),item]));
    return Promise.all((projectsResult.data||[]).map(async project=>{
      const extra=overview.get(String(project.id))||{};
      let latest_photo_url='';
      if(extra.latest_photo_path){const signed=await window.TrustAuth.client.storage.from('trust-m-documents').createSignedUrl(extra.latest_photo_path,300);latest_photo_url=signed.data?.signedUrl||'';}
      return {...project,...extra,latest_photo_url,name:project.project_name,progress:Number(project.progress_percent||0),schedule:Array.isArray(project.phases)?project.phases:[]};
    }));
  }

  function demoProjects(){
    return [{id:'client-demo',name:'مشروع فيلا الساحل',project_code:'TM/2026/18',location:'الساحل الشمالي',status:'active',current_phase:'التشطيبات الداخلية',next_phase:'المعاينة والتسليم',start_date:'2026-08-01',target_end_date:'2026-11-15',total_contract_value:1775000,last_payment_amount:300000,last_payment_date:'2026-09-12',current_balance:267405.75,next_payment_due:'2026-10-15',cost_to_date:2042405.75,latest_photo_caption:'آخر تحديث من الموقع · أعمال الدهانات مستمرة',progress:72,schedule:[{name:'التصميم والاعتمادات',from:'2026-08-01',to:'2026-08-15',progress:100,status:'complete'},{name:'التنفيذ والتشطيبات',from:'2026-08-16',to:'2026-10-31',progress:72,status:'in_progress'},{name:'المعاينة والتسليم',from:'2026-11-01',to:'2026-11-15',progress:0,status:'planned'}]}];
  }

  function renderOverview(projects){
    const overview=document.querySelector('#client-overview');
    if(!projects.length){overview.innerHTML='<div class="client-overview-empty">هنعرض ملخص المشروع هنا بعد ربط حسابك بمشروع.</div>';return;}
    const project=projects[0];
    const choices=projects.length>1?'<select class="client-project-switcher" id="client-project-switcher" aria-label="اختيار المشروع">'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select>':'';
    const moneyOrPending=value=>value==null||value===''?'قيد التحديث':money(value);
    const dateOrPending=value=>value?esc(value):'لم يُحدد بعد';
    overview.innerHTML='<div class="client-overview-head"><div><div class="eyebrow">ملخص المشروع</div><h2 id="client-overview-title">نظرة سريعة على مشروعك</h2><p>آخر المعلومات التي اعتمدها فريق Trust M لحسابك.</p></div>'+choices+'</div><div class="client-finance-strip"><div class="client-finance-item"><small>آخر دفعة مسجلة</small><strong>'+moneyOrPending(project.last_payment_amount)+'</strong><span>'+dateOrPending(project.last_payment_date)+'</span></div><div class="client-finance-item"><small>الرصيد الحالي</small><strong>'+moneyOrPending(project.current_balance)+'</strong><span>جنيه مصري · بعد آخر حركة معتمدة</span></div><div class="client-finance-item"><small>الدفعة القادمة</small><strong>'+dateOrPending(project.next_payment_due)+'</strong><span>يُحدّد حسب جدول التعاقد</span></div></div><div class="client-main-grid"><section class="client-phase-panel"><h3>أين وصلنا؟</h3><div class="client-phase-cards"><div class="client-phase-card"><small>المرحلة الحالية</small><strong>'+esc(project.current_phase||'لم تُحدد بعد')+'</strong></div><div class="client-phase-card next"><small>المرحلة القادمة</small><strong>'+esc(project.next_phase||'لم تُحدد بعد')+'</strong></div></div></section><section class="client-progress-panel"><h3>تقدم المشروع</h3><div class="client-progress-top"><span>نسبة الإنجاز الإجمالية</span><strong>'+Number(project.progress||0)+'%</strong></div><div class="client-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Number(project.progress||0)+'"><span style="width:'+Math.max(0,Math.min(100,Number(project.progress||0)))+'%"></span></div><div class="client-progress-foot"><span>التكلفة المسجلة: '+moneyOrPending(project.cost_to_date)+'</span><span>التسليم: '+dateOrPending(project.target_end_date)+'</span></div><a class="client-account-link" href="#projects">افتح كشف الحساب والمراحل</a></section><section class="client-feed-panel"><h3>آخر تحديث من الموقع</h3><div class="client-feed-frame">'+(project.latest_photo_url?'<img src="'+esc(project.latest_photo_url)+'" alt="آخر صورة من موقع المشروع">':'<div class="client-feed-placeholder"><span>✦</span><strong>لا توجد صورة مرفوعة بعد</strong><p>ستظهر هنا آخر صورة أو تحديث يرفعه فريق الموقع.</p></div>')+'</div><p class="client-feed-caption">'+esc(project.latest_photo_caption||'تحديثات الموقع ستظهر هنا بعد اعتمادها.')+'</p></section></div>';
    const switcher=overview.querySelector('#client-project-switcher');
    if(switcher)switcher.onchange=()=>{const selected=projects.find(p=>String(p.id)===switcher.value);if(selected){renderOverview([selected,...projects.filter(p=>p!==selected)]);}};
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
