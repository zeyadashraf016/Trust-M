(async function(){
  const profile=await window.TrustAuth.ready;
  if(window.TrustAuth.enabled&&!profile)return;
  const esc=window.TrustDashboardData.esc;
  const fmt=value=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:0}).format(Number(value||0));
  const money=value=>fmt(value)+' ج.م';
  const statusLabel=status=>({planning:'تجهيز',active:'شغال',on_hold:'متوقف مؤقتًا',completed:'مكتمل',cancelled:'ملغي'}[status]||status||'غير محدد');
  const dateText=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  document.querySelector('#current-date').innerHTML=esc(dateText)+'<br><span class="demo">جنيه مصري</span>';
  document.querySelector('#footer-date').textContent='آخر فتح للوحة: '+dateText;
  if(window.TrustAuth.enabled&&profile?.full_name)document.querySelector('#owner-greeting').innerHTML='أهلًا يا '+esc(profile.full_name.split(' ')[0])+'<span>.</span>';

  try{
    const dashboard=await window.TrustDashboardData.owner();
    render(dashboard);
    finishLoader();
  }catch(error){
    console.error(error);
    document.querySelector('#project-list').innerHTML='<section class="panel empty-state"><strong>تعذر تحميل بيانات المشروعات</strong><p>راجع اتصال Supabase والصلاحيات، وبعدها حدّث الصفحة.</p><button class="quiet-button" type="button" onclick="location.reload()">حاول تاني</button></section>';
    document.querySelector('#dashboard-mode').hidden=false;
    document.querySelector('#dashboard-mode').textContent='البيانات الحية مش متاحة دلوقتي. مفيش أرقام تجريبية اتعرضت بدلها.';
    finishLoader();
  }

  function finishLoader(){
    const loader=document.querySelector('#loader');
    const seen=sessionStorage.getItem('trust-m-brand-seen');
    const delay=seen?0:850;
    setTimeout(()=>loader.classList.add('finished'),delay);
    sessionStorage.setItem('trust-m-brand-seen','1');
    document.querySelector('#replay').onclick=()=>{loader.classList.remove('finished');setTimeout(()=>loader.classList.add('finished'),1100);};
  }

  function render(data){
    const projects=data.projects||[];
    if(data.mode==='demo'){
      const notice=document.querySelector('#dashboard-mode');
      notice.hidden=false;
      notice.textContent='وضع المراجعة شغال ببيانات وهمية. أول ما Supabase يتوصل، اللوحة بتعرض السجلات الحقيقية بس.';
    }
    const total=sum(projects,'contract'),paid=sum(projects,'paid'),cost=sum(projects,'cost'),finalCost=sum(projects,'final');
    const outstanding=Math.max(0,total-paid),profit=total-finalCost,rate=total?paid/total*100:0;
    const activeTech=projects.reduce((value,project)=>value+Number(project.team||0),0);
    const metrics=[
      ['المشروعات المفتوحة',projects.filter(project=>!['completed','cancelled'].includes(project.status)).length,'مشروعات تحت التنفيذ أو التجهيز'],
      ['الفنيين الموزعين',activeTech,'على المشروعات المفتوحة'],
      ['إجمالي التعاقدات',fmt(total),'جنيه مصري'],
      ['المتحصل',fmt(paid),rate.toFixed(1)+'% من التعاقدات'],
      ['المتبقي عند العملاء',fmt(outstanding),'جنيه مصري'],
      ['التكلفة لحد دلوقتي',fmt(cost),'مصروفات مسجلة'],
      ['المتبقي المتوقع للتكلفة',fmt(Math.max(0,finalCost-cost)),'حسب توقع كل مشروع'],
      ['الربح المتوقع',fmt(profit),total?(profit/total*100).toFixed(1)+'% هامش متوقع':'مفيش تعاقدات']
    ];
    document.querySelector('#kpis').innerHTML=metrics.map(([label,value,note],index)=>'<article class="kpi '+(index===4?'priority-kpi':index===7?'profit':'')+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></article>').join('');
    document.querySelector('#nav-project-count').textContent=projects.length;
    document.querySelector('#project-count').textContent=projects.length;
    document.querySelector('#project-subtitle').textContent=projects.length+' مشروع · '+activeTech+' فني';
    document.querySelector('#collection-rate').innerHTML=rate.toFixed(1)+'<span>%</span>';
    document.querySelector('#collection-donut').style.background='conic-gradient(var(--gold) 0 '+Math.min(100,rate)+'%,#3c3d34 '+Math.min(100,rate)+'% 100%)';
    document.querySelector('#collection-donut').setAttribute('aria-label','تم تحصيل '+rate.toFixed(1)+' في المية');
    document.querySelector('#financial-list').innerHTML=[
      ['تحصيلات العملاء',paid,'gold-dot'],['المتبقي عند العملاء',outstanding,'gray-dot'],
      ['الخامات والمشتريات',data.breakdown?.materials||0,''],['الفنيين والمقاولين',data.breakdown?.labour||0,''],['تكاليف تانية',data.breakdown?.other||0,'']
    ].map(([label,value,dot])=>'<div><span>'+(dot?'<i class="dot '+dot+'"></i>':'')+esc(label)+'</span><strong>'+fmt(value)+'</strong></div>').join('');
    document.querySelector('#finance-foot').innerHTML='<span>التكلفة النهائية المتوقعة<strong>'+money(finalCost)+'</strong></span><span>هامش الربح المتوقع<strong class="gold">'+(total?(profit/total*100).toFixed(1):'0')+'%</strong></span>';

    renderCash(data.months||[]);
    renderProjects(projects,data.mode);
    renderAttention(projects);
    renderBalances(projects,outstanding);
    renderTechnicians(data.technicians||[],projects);
  }

  function sum(rows,key){return rows.reduce((value,row)=>value+Number(row[key]||0),0);}

  function renderCash(months){
    const latest=months.at(-1)||{label:'',collected:0,outgoing:0};
    document.querySelector('#cash-month').textContent=latest.label;
    document.querySelector('#month-collected').textContent=money(latest.collected);
    document.querySelector('#month-outgoing').textContent=money(latest.outgoing);
    document.querySelector('#month-net').textContent=(latest.collected-latest.outgoing>=0?'+':'')+money(latest.collected-latest.outgoing);
    document.querySelector('#cash-note').textContent=latest.collected>=latest.outgoing?'التحصيلات المسجلة مغطية المدفوعات المسجلة الشهر ده.':'المدفوعات المسجلة أعلى من التحصيلات الشهر ده؛ راجعي مواعيد التحصيل.';
    const max=Math.max(1,...months.flatMap(month=>[month.collected,month.outgoing]));
    document.querySelector('#bars').innerHTML=months.map(month=>'<div class="bar-group"><div class="bar-pair"><div style="height:'+Math.max(2,month.collected/max*110)+'px" class="bar collected"><span>'+fmt(month.collected)+'</span></div><div style="height:'+Math.max(2,month.outgoing/max*110)+'px" class="bar spent"><span>'+fmt(month.outgoing)+'</span></div></div><span>'+esc(month.label)+'</span></div>').join('');
  }

  function renderProjects(projects,mode){
    const list=document.querySelector('#project-list');
    if(!projects.length){list.innerHTML='<section class="panel empty-state"><strong>لسه مفيش مشروعات</strong><p>أضيفي أول مشروع في قاعدة البيانات عشان يظهر هنا.</p></section>';return;}
    list.innerHTML=projects.map((project,index)=>'<article class="project panel clickable-project" id="project-'+esc(project.id)+'" data-project="'+esc(project.id)+'" tabindex="0" role="button" aria-haspopup="dialog"><div class="project-head"><div class="project-number">'+String(index+1).padStart(2,'0')+'</div><div class="project-name"><h3>'+esc(project.name)+'</h3><p>'+esc(project.client)+' <span>·</span> '+esc(project.location)+'</p></div><span class="status '+(project.status==='active'?'on-track':'warning')+'">'+esc(statusLabel(project.status))+'</span></div><div class="progress-label"><span>نسبة الإنجاز</span><strong>'+project.progress+'%</strong></div><div class="progress" role="progressbar" aria-label="نسبة إنجاز '+esc(project.name)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+project.progress+'"><span style="width:'+Math.max(0,Math.min(100,project.progress))+'%"></span></div><div class="phases"><div><small>المرحلة الحالية</small><span>'+esc(project.phase)+'</span></div><span class="phase-arrow">←</span><div><small>المرحلة الجاية</small><span>'+esc(project.next)+'</span></div></div><dl class="project-finance">'+[
      ['قيمة التعاقد',project.contract],['المتحصل',project.paid],['المتبقي عند العميل',Math.max(0,project.contract-project.paid)],['التكلفة لحد دلوقتي',project.cost],['تكلفة بداية المرحلة الجاية',project.nextCost],['التكلفة النهائية المتوقعة',project.final]
    ].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+fmt(value)+'</dd></div>').join('')+'</dl><div class="project-bottom"><span>الربح المتوقع <strong>'+money(project.contract-project.final)+'</strong></span><span>'+project.team+' فني</span></div><button class="project-open" type="button">افتح التفاصيل والجدول الزمني</button></article>').join('');
    list.querySelectorAll('[data-project]').forEach(card=>{
      const open=()=>openProject(projects.find(project=>String(project.id)===card.dataset.project),mode);
      card.onclick=event=>{if(!event.target.closest('button'))open();};
      card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}};
      card.querySelector('.project-open').onclick=open;
    });
  }

  function renderAttention(projects){
    const alerts=[];
    const today=new Date().toISOString().slice(0,10);
    for(const project of projects){
      const outstanding=Math.max(0,project.contract-project.paid);
      if(project.status==='on_hold')alerts.push({project,label:'المشروع متوقف',text:'راجعي سبب التوقف قبل اعتماد المرحلة الجاية.'});
      else if(project.end&&project.end<today&&!['completed','cancelled'].includes(project.status))alerts.push({project,label:'ميعاد التسليم عدى',text:'حدّثي ميعاد التسليم وخطة الاستكمال.'});
      else if(outstanding>0)alerts.push({project,label:'تحصيل مطلوب',text:'المتبقي في حساب العميل '+money(outstanding)+'. راجعي ميعاد الدفعة الجاية.'});
    }
    const visible=alerts.slice(0,4);
    document.querySelector('#alert-count').textContent=visible.length;
    document.querySelector('#attention-list').innerHTML=visible.length?visible.map(item=>'<button class="attention-item" type="button" data-alert-project="'+esc(item.project.id)+'"><span class="alert-label">'+esc(item.label)+'</span><h3>'+esc(item.project.name)+'</h3><p>'+esc(item.text)+'</p><span class="text-link">راجع المشروع</span></button>').join(''):'<div class="empty-state compact"><strong>مفيش متابعة عاجلة</strong><p>أي تعطل أو تأخير أو رصيد مطلوب هيظهر هنا.</p></div>';
    document.querySelectorAll('[data-alert-project]').forEach(button=>button.onclick=()=>button.closest('main').querySelector('[data-project="'+CSS.escape(button.dataset.alertProject)+'"]')?.querySelector('.project-open').click());
  }

  function renderBalances(projects,total){
    const max=Math.max(1,...projects.map(project=>Math.max(0,project.contract-project.paid)));
    document.querySelector('#balance-chart').innerHTML=projects.map(project=>{const balance=Math.max(0,project.contract-project.paid);return '<div class="balance-row"><div><span>'+esc(project.name)+'</span><strong>'+fmt(balance)+'</strong></div><div class="balance-track"><span style="width:'+balance/max*100+'%"></span></div></div>';}).join('');
    document.querySelector('#balance-total').textContent=money(total);
  }

  function renderTechnicians(technicians,projects){
    document.querySelector('#technician-count').textContent=technicians.length?technicians.length+' تكليف':'ملخص حسب المشروع';
    document.querySelector('#technician-list').innerHTML=technicians.length?'<div class="technician-scroll"><table class="technician-table"><thead><tr><th>الفني</th><th>الدور</th><th>المشروع</th><th>المرحلة</th></tr></thead><tbody>'+technicians.map(item=>'<tr><td>'+esc(item.name)+'</td><td>'+esc(item.trade)+'</td><td>'+esc(item.project)+'</td><td>'+esc(item.phase)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="document-grid">'+projects.map(project=>'<article class="document-card"><small>'+esc(project.name)+'</small><h3>'+project.team+' فني</h3><p>'+esc(project.phase)+'</p></article>').join('')+'</div>';
  }

  function openProject(project,mode){
    if(!project)return;
    const dialog=document.querySelector('#project-detail')||makeDialog('project-detail');
    const schedule=project.schedule||[];
    const dates=schedule.flatMap(item=>[item.from,item.to]).filter(Boolean).sort();
    const start=dates[0],end=dates.at(-1);
    const day=value=>Date.parse(value+'T00:00:00Z')/86400000;
    const totalDays=start&&end?Math.max(1,day(end)-day(start)+1):1;
    const chart=schedule.length?'<div class="gantt-scroll" tabindex="0"><div class="gantt"><div class="gantt-axis"><span>المرحلة</span><div></div></div>'+schedule.map(item=>'<div class="gantt-row"><div class="gantt-name"><strong>'+esc(item.name)+'</strong><small>'+esc(item.from)+' — '+esc(item.to)+'</small></div><div class="gantt-track"><span class="gantt-bar '+esc(item.status).replaceAll('_','-')+'" style="left:'+((day(item.from)-day(start))/totalDays*100)+'%;width:'+((day(item.to)-day(item.from)+1)/totalDays*100)+'%"></span></div></div>').join('')+'</div></div>':'<div class="empty-state compact"><p>لسه مفيش مراحل متسجلة للمشروع.</p></div>';
    dialog.innerHTML='<div class="detail-header"><div><div class="eyebrow">'+(mode==='live'?'ملف المشروع':'بيانات تجريبية')+'</div><h2 id="project-detail-title">'+esc(project.name)+'</h2><p>'+esc(project.client)+' · '+esc(project.location)+'</p></div><button class="close-detail" type="button" aria-label="اقفل">×</button></div><div class="detail-body"><div class="detail-summary"><span class="status '+(project.status==='active'?'on-track':'warning')+'">'+esc(statusLabel(project.status))+'</span><span>'+project.progress+'% مكتمل</span><span>'+project.team+' فني</span></div><div class="phases"><div><small>المرحلة الحالية</small><span>'+esc(project.phase)+'</span></div><span class="phase-arrow">←</span><div><small>المرحلة الجاية</small><span>'+esc(project.next)+'</span></div></div><section class="detail-section"><h3>التفاصيل المالية <small>جنيه مصري</small></h3><dl class="detail-finance">'+[
      ['قيمة التعاقد',project.contract],['المتحصل',project.paid],['المتبقي عند العميل',Math.max(0,project.contract-project.paid)],['التكلفة المسجلة',project.cost],['التكلفة النهائية المتوقعة',project.final],['الربح المتوقع',project.contract-project.final]
    ].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+fmt(value)+'</dd></div>').join('')+'</dl></section><section class="detail-section"><div class="section-top"><div><h3>الجدول الزمني</h3><p class="footnote">من المراحل المسجلة على المشروع</p></div></div>'+chart+'</section><section class="detail-section"><h3>تعليقات ومتابعة المشروع</h3><div data-project-comments></div></section><div class="project-action-row"><button type="button" data-client-report>نزّل كشف العميل</button>'+(project.contract-project.paid>0?'<button type="button" data-payment-followup>جهّز تذكير دفع</button>':'')+'</div></div>';
    dialog.querySelector('.close-detail').onclick=()=>dialog.close();
    dialog.querySelector('[data-client-report]').onclick=()=>downloadReport(project);
    dialog.querySelector('[data-payment-followup]')?.addEventListener('click',()=>openMessage(project));
    dialog.showModal();
    window.TrustProjectComments.mount(dialog.querySelector('[data-project-comments]'),project.id,{canPost:true});
  }

  function makeDialog(id){
    const dialog=document.createElement('dialog');
    dialog.id=id;dialog.className='project-dialog';dialog.setAttribute('aria-labelledby',id+'-title');
    dialog.onclick=event=>{if(event.target===dialog)dialog.close();};
    document.body.append(dialog);return dialog;
  }

  function downloadReport(project){
    const rows=[['TRUST M','كشف حساب العميل'],['التاريخ',new Date().toISOString().slice(0,10)],['العميل',project.client],['المشروع',project.name],['قيمة التعاقد',project.contract],['المتحصل',project.paid],['المتبقي',Math.max(0,project.contract-project.paid)]];
    const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
    link.href=url;link.download='Trust-M-client-statement.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function openMessage(project){
    const balance=Math.max(0,project.contract-project.paid);
    const dialog=document.querySelector('#client-message-dialog')||makeDialog('client-message-dialog');
    const message='أهلًا '+project.client+'،\n\nحابين نراجع معاك رصيد مشروع '+project.name+'. الرصيد المتبقي المسجل عندنا '+money(balance)+'. ياريت تأكد لنا ميعاد الدفعة الجاية حسب المرحلة المتفق عليها، ولو تم الدفع ابعت لنا الإيصال عشان نحدّث الحساب.\n\nشكرًا،\nTrust M';
    dialog.innerHTML='<div class="detail-header"><div><div class="eyebrow">متابعة العميل</div><h2 id="client-message-dialog-title">تذكير دفع</h2></div><button class="close-detail" type="button">×</button></div><div class="detail-body"><label>راجع الرسالة قبل الإرسال<textarea id="client-message" rows="9"></textarea></label><div class="delivery-options"><label>البريد الإلكتروني<input id="client-email" type="email" autocomplete="off"></label><label>رقم واتساب بكود الدولة<input id="client-phone" type="tel" autocomplete="off"></label></div><div class="project-action-row"><button type="button" data-copy>انسخ الرسالة</button><button type="button" data-email>افتح إيميل</button><button type="button" data-whatsapp>افتح واتساب</button></div><p id="client-message-status" role="status"></p></div>';
    dialog.querySelector('textarea').value=message;
    dialog.querySelector('.close-detail').onclick=()=>dialog.close();
    dialog.querySelector('[data-copy]').onclick=async()=>{await navigator.clipboard.writeText(message);dialog.querySelector('#client-message-status').textContent='اتنسخت الرسالة.';};
    dialog.querySelector('[data-email]').onclick=()=>{const input=dialog.querySelector('#client-email');if(!input.checkValidity()||!input.value){input.reportValidity();return;}location.href='mailto:'+encodeURIComponent(input.value)+'?subject='+encodeURIComponent('Trust M | متابعة حساب '+project.name)+'&body='+encodeURIComponent(message);};
    dialog.querySelector('[data-whatsapp]').onclick=()=>{const number=dialog.querySelector('#client-phone').value.replace(/\D/g,'');if(!/^[1-9]\d{7,14}$/.test(number)){dialog.querySelector('#client-message-status').textContent='اكتب رقم دولي صحيح.';return;}window.open('https://wa.me/'+number+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');};
    dialog.showModal();
  }
})();
