(async function(){
  const profile=await window.TrustAuth.ready;
  if(window.TrustAuth.enabled&&!profile)return;
  const esc=window.TrustDashboardData.esc;
  const statusLabel=status=>({planning:'تجهيز',active:'شغال',on_hold:'متوقف مؤقتًا',completed:'مكتمل',cancelled:'ملغي'}[status]||status||'غير محدد');
  const dateText=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  document.querySelector('#amr-date').textContent=dateText;
  document.querySelector('#amr-footer-date').textContent='آخر فتح للوحة: '+dateText;
  if(window.TrustAuth.enabled&&profile?.full_name)document.querySelector('#amr-greeting').innerHTML='أهلًا يا '+esc(profile.full_name.split(' ')[0])+'<span>.</span>';
  try{
    const data=await window.TrustDashboardData.amr();
    if(data.mode==='demo'){const notice=document.querySelector('#amr-mode');notice.hidden=false;notice.textContent='وضع المراجعة شغال ببيانات وهمية. في التشغيل الفعلي مش بيظهر غير المشروعات المسجلة.';}
    render(data.projects||[]);
  }catch(error){
    console.error(error);
    document.querySelector('#amr-project-list').innerHTML='<section class="panel empty-state"><strong>تعذر تحميل المشروعات</strong><p>راجع الاتصال والصلاحيات وبعدها حدّث الصفحة.</p></section>';
  }finally{finishLoader();}

  function finishLoader(){
    const loader=document.querySelector('#loader'),seen=sessionStorage.getItem('trust-m-brand-seen');
    setTimeout(()=>loader.classList.add('finished'),seen?0:850);sessionStorage.setItem('trust-m-brand-seen','1');
    document.querySelector('#replay').onclick=()=>{loader.classList.remove('finished');setTimeout(()=>loader.classList.add('finished'),1100);};
  }

  function render(projects){
    document.querySelector('#amr-project-count').textContent=projects.length;
    document.querySelector('#amr-project-subtitle').textContent=projects.length+' مشروع';
    const list=document.querySelector('#amr-project-list');
    if(!projects.length){list.innerHTML='<section class="panel empty-state"><strong>لسه مفيش مشروعات</strong><p>المشروعات اللي لمياء تسجلها هتظهر هنا.</p></section>';return;}
    list.innerHTML=projects.map((project,index)=>'<article class="project panel clickable-project amr-project-card" data-amr-project="'+esc(project.id)+'" tabindex="0" role="button" aria-haspopup="dialog"><div class="project-head"><div class="project-number">'+String(index+1).padStart(2,'0')+'</div><div class="project-name"><h3>'+esc(project.name)+'</h3><p>'+esc(project.location)+'</p></div><span class="status '+(project.status==='active'?'on-track':'warning')+'">'+esc(statusLabel(project.status))+'</span></div><div class="progress-label"><span>نسبة الإنجاز</span><strong>'+project.progress+'%</strong></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+project.progress+'"><span style="width:'+Math.max(0,Math.min(100,project.progress))+'%"></span></div><div class="phases"><div><small>المرحلة الحالية</small><span>'+esc(project.phase)+'</span></div><span class="phase-arrow">←</span><div><small>المرحلة الجاية</small><span>'+esc(project.next)+'</span></div></div><div class="project-bottom"><span>'+project.team+' فني على المشروع</span><span>'+esc(project.end||'ميعاد التسليم مش مسجل')+'</span></div><button class="project-open" type="button">افتح التفاصيل والجدول الزمني</button></article>').join('');
    list.querySelectorAll('[data-amr-project]').forEach(card=>{const open=()=>show(projects.find(project=>String(project.id)===card.dataset.amrProject));card.onclick=event=>{if(!event.target.closest('button'))open();};card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}};card.querySelector('button').onclick=open;});
  }

  function show(project){
    const dialog=document.querySelector('#amr-project-dialog')||makeDialog();
    const schedule=project.schedule||[];
    const rows=schedule.length?schedule.map(item=>'<div class="timeline-row"><span class="timeline-status '+esc(item.status)+'"></span><div><strong>'+esc(item.name)+'</strong><small>'+esc(item.from)+' — '+esc(item.to)+'</small></div><b>'+item.progress+'%</b></div>').join(''):'<div class="empty-state compact"><p>لسه مفيش مراحل متسجلة للمشروع.</p></div>';
    dialog.innerHTML='<div class="detail-header"><div><div class="eyebrow">ملف التنفيذ</div><h2 id="amr-project-dialog-title">'+esc(project.name)+'</h2><p>'+esc(project.location)+'</p></div><button class="close-detail" type="button" aria-label="اقفل">×</button></div><div class="detail-body"><div class="detail-summary"><span class="status '+(project.status==='active'?'on-track':'warning')+'">'+esc(statusLabel(project.status))+'</span><span>'+project.progress+'% مكتمل</span><span>'+project.team+' فني</span></div><div class="phases"><div><small>المرحلة الحالية</small><span>'+esc(project.phase)+'</span></div><span class="phase-arrow">←</span><div><small>المرحلة الجاية</small><span>'+esc(project.next)+'</span></div></div><section class="detail-section"><h3>الجدول الزمني</h3><div class="project-timeline">'+rows+'</div></section><section class="detail-section"><h3>تعليقات ومتابعة المشروع</h3><div data-project-comments></div></section></div>';
    dialog.querySelector('.close-detail').onclick=()=>dialog.close();dialog.showModal();window.TrustProjectComments.mount(dialog.querySelector('[data-project-comments]'),project.id,{canPost:true});
  }

  function makeDialog(){const dialog=document.createElement('dialog');dialog.id='amr-project-dialog';dialog.className='project-dialog';dialog.setAttribute('aria-labelledby','amr-project-dialog-title');dialog.onclick=event=>{if(event.target===dialog)dialog.close();};document.body.append(dialog);return dialog;}
})();
