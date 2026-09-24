const projects = [
 {id:1,name:'The Courtyard Villa',client:'Ahmed Hassan',location:'New Cairo',progress:78,phase:'Finishing & fixtures',next:'Final inspection',contract:350000,paid:260000,cost:180000,nextCost:18000,final:230000,status:'On track',team:2},
 {id:2,name:'Palm Residence',client:'Mona Adel',location:'Sheikh Zayed',progress:62,phase:'Flooring',next:'Painting',contract:280000,paid:170000,cost:120000,nextCost:70000,final:190000,status:'Payment pending',team:2},
 {id:3,name:'The West Duplex',client:'Omar Khaled',location:'6th of October',progress:45,phase:'Electrical & plumbing',next:'Plastering',contract:250000,paid:150000,cost:90000,nextCost:25000,final:160000,status:'On track',team:2},
 {id:4,name:'Garden Apartment',client:'Salma Mostafa',location:'Maadi',progress:55,phase:'Custom joinery',next:'Installation',contract:220000,paid:130000,cost:85000,nextCost:30000,final:155000,status:'Cost risk',team:1},
 {id:5,name:'Heliopolis Studio',client:'Karim Nabil',location:'Heliopolis',progress:30,phase:'Electrical work',next:'Flooring',contract:150000,paid:70000,cost:45000,nextCost:20000,final:95000,status:'Delayed',team:1}
];
const fmt = n => new Intl.NumberFormat('en-US').format(n);
const sum = key => projects.reduce((n,p)=>n+p[key],0);
const total=sum('contract'), paid=sum('paid'), cost=sum('cost'), final=sum('final');
const metrics=[['Open Projects',projects.length,'Across your portfolio'],['Active Technicians',sum('team'),'Assigned to open projects'],['Total Contract Value',fmt(total),'EGP · signed contracts'],['Collected',fmt(paid),'62.4% of contract value'],['Outstanding',fmt(total-paid),'EGP · remaining client balance'],['Cost to Date',fmt(cost),'EGP · incurred operating cost'],['Forecast Remaining Cost',fmt(final-cost),'EGP · estimated to complete'],['Forecast Profit',fmt(total-final),'33.6% forecast margin']];
document.querySelector('#kpis').innerHTML=metrics.map(([label,value,note],i)=>`<article class="kpi ${i===7?'profit':''}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
document.querySelector('#financial-list').innerHTML=[['Client payments collected',paid,'gold-dot'],['Client payments pending',total-paid,'gray-dot'],['Materials & procurement',290000,''],['Technicians & subcontractors',185000,''],['Other operational costs',45000,'']].map(([l,v,d])=>`<div><span>${d?`<i class="dot ${d}"></i>`:''}${l}</span><strong>${fmt(v)}</strong></div>`).join('');
document.querySelector('#project-list').innerHTML=projects.map(p=>`<article class="project panel" id="project-${p.id}"><div class="project-head"><div class="project-number">0${p.id}</div><div class="project-name"><h3>${p.name}</h3><p>${p.client} <span>·</span> ${p.location}</p></div><span class="status ${p.status==='On track'?'on-track':'warning'}">${p.status}</span></div><div class="progress-label"><span>Project completion</span><strong>${p.progress}%</strong></div><div class="progress" role="progressbar" aria-label="${p.name} completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.progress}"><span style="width:${p.progress}%"></span></div><div class="phases"><div><small>CURRENT PHASE</small><span>${p.phase}</span></div><span class="phase-arrow">→</span><div><small>NEXT PHASE</small><span>${p.next}</span></div></div><dl class="project-finance">${[['Total contract value',p.contract],['Amount paid',p.paid],['Still needed from customer',p.contract-p.paid],['Operational cost to date',p.cost],['Next phase initial cost',p.nextCost],['Forecast final cost',p.final]].map(([l,v])=>`<div><dt>${l}</dt><dd>${fmt(v)}</dd></div>`).join('')}</dl><div class="project-bottom"><span>Forecast profit <strong>${fmt(p.contract-p.final)} <small>EGP</small></strong></span><span>${((p.contract-p.final)/p.contract*100).toFixed(1)}% margin <i>·</i> ${p.team} technician${p.team>1?'s':''}</span></div></article>`).join('');
const months=[['Apr',90,65],['May',130,80],['Jun',170,105],['Jul',180,120],['Aug',210,150],['Sep',210,145]];
document.querySelector('#bars').innerHTML=months.map(([m,a,b],i)=>`<div class="bar-group ${i===5?'forecast-bars':''}"><div class="bar-pair"><div style="height:${a/2.3}px" class="bar collected"><span>${a}</span></div><div style="height:${b/2.3}px" class="bar spent"><span>${b}</span></div></div><span>${m}${i===5?'*':''}</span></div>`).join('');
document.querySelector('#balance-chart').innerHTML=projects.map(p=>`<div class="balance-row"><div><span>${p.name}</span><strong>${fmt(p.contract-p.paid)}</strong></div><div class="balance-track"><span style="width:${(p.contract-p.paid)/110000*100}%"></span></div></div>`).join('');
const loader=document.querySelector('#loader');
function reveal(){loader.classList.add('finished');}
setTimeout(reveal,2200);
document.querySelector('#replay').addEventListener('click',()=>{loader.classList.remove('finished');setTimeout(reveal,2200);});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('nav a').forEach(n=>n.classList.remove('active'));a.classList.add('active');}));

// Illustrative baseline schedules; dates are independent of financial forecasts.
const schedules = {
 1:[['Design & approvals','2026-07-06','2026-07-19','Complete'],['Site preparation','2026-07-20','2026-08-02','Complete'],['Electrical & plumbing','2026-08-03','2026-08-16','Complete'],['Flooring & painting','2026-08-17','2026-08-30','Complete'],['Finishing & fixtures','2026-08-31','2026-09-13','In progress'],['Final inspection','2026-09-14','2026-09-20','Planned']],
 2:[['Design & approvals','2026-07-13','2026-07-26','Complete'],['Site preparation','2026-07-27','2026-08-09','Complete'],['Electrical & plumbing','2026-08-10','2026-08-23','Complete'],['Flooring','2026-08-24','2026-09-13','In progress'],['Painting','2026-09-14','2026-09-27','Blocked'],['Fixtures & handover','2026-09-28','2026-10-11','Planned']],
 3:[['Design & approvals','2026-08-03','2026-08-16','Complete'],['Site preparation','2026-08-17','2026-08-23','Complete'],['Electrical & plumbing','2026-08-24','2026-09-13','In progress'],['Plastering','2026-09-14','2026-09-27','Planned'],['Flooring & finishes','2026-09-28','2026-10-18','Planned'],['Inspection & handover','2026-10-19','2026-10-25','Planned']],
 4:[['Design & approvals','2026-07-20','2026-08-02','Complete'],['Site & services','2026-08-03','2026-08-16','Complete'],['Flooring','2026-08-17','2026-08-23','Complete'],['Custom joinery','2026-08-24','2026-09-13','In progress'],['Installation','2026-09-14','2026-09-27','At risk'],['Inspection & handover','2026-09-28','2026-10-04','Planned']],
 5:[['Design & approvals','2026-08-10','2026-08-23','Complete'],['Site preparation','2026-08-24','2026-08-30','Complete'],['Electrical work','2026-08-31','2026-09-11','Delayed'],['Flooring','2026-09-12','2026-09-27','Planned'],['Painting & fixtures','2026-09-28','2026-10-18','Planned'],['Inspection & handover','2026-10-19','2026-10-25','Planned']]
};
const projectNotes={1:'Confirm fixture delivery and prepare the final inspection checklist.',2:'EGP 35,000 is overdue by 7 days. Available project cash is EGP 50,000 against EGP 70,000 needed for painting: collect at least EGP 20,000 to release the phase.',3:'Confirm plastering materials and technician availability before the next phase.',4:'Joinery quote exceeds the phase allowance by EGP 12,000. Review scope and approve the quote before installation. The current forecast includes this estimate.',5:'Electrical work is 5 days behind the original 06 September finish. The schedule shows a provisional revised finish of 11 September; confirm with the technician.'};
const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
const dateLabel=s=>new Date(s+'T00:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'});
const dialog=document.createElement('dialog');
dialog.className='project-dialog';dialog.setAttribute('aria-labelledby','detail-title');
document.body.appendChild(dialog);
let previousFocus;
function openProject(id){
 const p=projects.find(p=>p.id===id);if(!p)return;
 const tasks=schedules[id],start=day(tasks[0][1]),end=day(tasks.at(-1)[2])+1,days=end-start;
 const today=(day('2026-09-06')-start)/days*100;
 const ticks=[];for(let d=start;d<end;d+=7)ticks.push(`<span style="left:${(d-start)/days*100}%">${dateLabel(new Date(d*86400000).toISOString().slice(0,10))}</span>`);
 const finances=[['Total contract value',p.contract],['Amount paid',p.paid],['Still needed from customer',p.contract-p.paid],['Operational cost to date',p.cost],['Next phase initial cost',p.nextCost],['Forecast remaining cost',p.final-p.cost],['Forecast final cost',p.final],['Forecast profit',p.contract-p.final]];
 dialog.innerHTML=`<div class="detail-header"><div><div class="eyebrow">PROJECT 0${p.id} · SAMPLE DATA</div><h2 id="detail-title">${p.name}</h2><p>${p.client} · ${p.location}</p></div><button class="close-detail" aria-label="Close project details" autofocus>×</button></div><div class="detail-body"><div class="detail-summary"><span class="status ${p.status==='On track'?'on-track':'warning'}">${p.status}</span><span>${p.progress}% complete</span><span>${p.team} active technician${p.team>1?'s':''}</span><span>${dateLabel(tasks[0][1])} – ${dateLabel(tasks.at(-1)[2])} 2026</span></div><div class="phases"><div><small>CURRENT PHASE</small><span>${p.phase}</span></div><span class="phase-arrow">→</span><div><small>NEXT PHASE</small><span>${p.next}</span></div></div><section class="detail-section"><h3>Financial details <small>EGP</small></h3><dl class="detail-finance">${finances.map(([label,value])=>`<div><dt>${label}</dt><dd>${fmt(value)}</dd></div>`).join('')}</dl><p class="footnote">Forecast margin: ${((p.contract-p.final)/p.contract*100).toFixed(1)}% · Forecast profit is contract value less forecast final cost.</p></section><section class="detail-section"><div class="section-top"><div><h3>Project schedule</h3><p class="footnote">Illustrative phase dates · Snapshot 06 September 2026</p></div><span class="subtle">Gantt chart</span></div><div class="gantt-legend"><span class="complete">Complete</span><span class="in-progress">In progress</span><span class="planned">Planned</span><span class="blocked">Blocked / at risk / delayed</span></div><div class="gantt-scroll" tabindex="0" role="region" aria-label="Project Gantt chart, scroll horizontally for full schedule"><div class="gantt"><div class="gantt-axis"><span>PHASE</span><div>${ticks.join('')}</div></div>${tasks.map(([name,from,to,status])=>`<div class="gantt-row"><div class="gantt-name"><strong>${name}</strong><small>${dateLabel(from)} – ${dateLabel(to)} · ${status}</small></div><div class="gantt-track"><i class="today-line" style="left:${today}%"></i><span class="gantt-bar ${status.toLowerCase().replaceAll(' ','-')}" style="left:${(day(from)-start)/days*100}%;width:${(day(to)+1-day(from))/days*100}%" title="${name}: ${dateLabel(from)}–${dateLabel(to)}, ${status}" aria-label="${name}: ${dateLabel(from)} to ${dateLabel(to)}, ${status}"></span></div></div>`).join('')}</div></div><p class="footnote">Vertical gold line: 06 September · Dates are inclusive. Planned dates depend on prior phases and payment clearance.</p></section><section class="detail-action"><div class="eyebrow">NEXT ACTION</div><p>${projectNotes[id]}</p></section></div>`;
 previousFocus=document.activeElement;
 dialog.querySelector('.close-detail').addEventListener('click',()=>dialog.close());
 dialog.querySelector('.detail-body').prepend(clientActions(p));
 dialog.showModal();document.body.classList.add('modal-open');dialog.scrollTop=0;
}
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');previousFocus?.focus();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
projects.forEach(p=>{
 const card=document.querySelector(`#project-${p.id}`);
 const trigger=document.createElement('button');trigger.className='project-open';trigger.textContent='View full details & schedule ↗';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-label',`View ${p.name} details and Gantt chart`);
 card.appendChild(trigger);card.classList.add('clickable-project');
 card.addEventListener('click',()=>openProject(p.id));
});
document.querySelectorAll('.attention a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openProject(Number(a.getAttribute('href').split('-').at(-1)));}));

function downloadFile(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function reportText(p){const t=window.egText||String;return `TRUST M — كشف حساب العميل
بيانات تجريبية · ٦ سبتمبر ٢٠٢٦ · جنيه مصري

العميل: ${t(p.client)}
المشروع: ${t(p.name)}
قيمة التعاقد: ${fmt(p.contract)}
الدفعات المستلمة: ${fmt(p.paid)}
باقي قيمة التعاقد: ${fmt(p.contract-p.paid)}
الدفعة المتأخرة: ${p.id===2?'٣٥٬٠٠٠ جنيه (استحقاق ٣٠ أغسطس ٢٠٢٦)':'مفيش دفعة متأخرة مسجلة'}

مش شرط باقي التعاقد كله يكون مستحق دلوقتي. الدفعات الجاية حسب مراحل الشغل المتفق عليها.

شكرًا،
Trust M`;}
function reminderText(p){const t=window.egText||String;return `أهلاً ${t(p.client)}،

بنذكّرك إن دفعة ٣٥٬٠٠٠ جنيه الخاصة بمشروع ${t(p.name)}، المستحقة يوم ٣٠ أغسطس ٢٠٢٦، لسه مسجلة عندنا كمبلغ متبقي لحد ٦ سبتمبر ٢٠٢٦. ياريت ترتّب الدفع وتبعتلنا الإيصال، ولو دفعت بالفعل بلّغنا عشان نراجع الحساب.

شكرًا،
Trust M

رسالة تجريبية — راجع المبلغ وميعاد الاستحقاق قبل الإرسال.`;}
function clientActions(p){const box=document.createElement('div');box.className='client-actions';const report=document.createElement('button');report.textContent='Send financial report';report.addEventListener('click',e=>{e.stopPropagation();openMessage(p,false);});box.append(report);if(p.status==='Payment pending'){const reminder=document.createElement('button');reminder.textContent='Send payment reminder';reminder.addEventListener('click',e=>{e.stopPropagation();openMessage(p,true);});box.append(reminder);}return box;}
projects.forEach(p=>document.querySelector(`#project-${p.id}`).append(clientActions(p)));
const composer=document.createElement('dialog');composer.className='project-dialog message-dialog';composer.setAttribute('aria-labelledby','message-title');document.body.append(composer);
let messageFocus;
function openMessage(p,reminder){
 messageFocus=document.activeElement;
 composer.innerHTML=`<div class="detail-header"><div><div class="eyebrow">CLIENT COMMUNICATION · SAMPLE DATA</div><h2 id="message-title">${reminder?'Payment reminder':'Financial report'}</h2><p>${p.client} · ${p.name}</p></div><button class="close-detail" aria-label="Close message">×</button></div><div class="detail-body"><p class="message-note">Review the message before sharing. No client contact details are saved. Opening a messaging app does not send the message.</p><label for="client-message">Message</label><textarea id="client-message" rows="13"></textarea><div class="client-actions"><button id="copy-message">Copy message</button><button id="save-report">${reminder?'Download reminder':'Download report sheet (CSV)'}</button></div><p class="footnote">${reminder?'Verify the overdue installment against your records.':'The sheet includes client-facing balances only; internal costs and profit are excluded. CSV opens in Excel or Google Sheets.'}</p><p id="message-status" role="status"></p></div>`;
 composer.querySelector('textarea').value=reminder?reminderText(p):reportText(p);
 const delivery=document.createElement('div');delivery.className='delivery-options';
 delivery.innerHTML=`<label for="client-email">Client email</label><input id="client-email" type="email" placeholder="Enter client email" autocomplete="off"><label for="client-phone">Client WhatsApp number</label><input id="client-phone" type="tel" placeholder="Country code + number, e.g. +20…" autocomplete="off"><div class="client-actions"><button id="open-email">Open email draft</button><button id="open-whatsapp">Open WhatsApp draft</button></div><p class="footnote">${reminder?'Review the recipient and message, then send from your chosen app.':'The balance summary is included in the message. Download the CSV sheet above and attach it in email or WhatsApp before sending.'} Contact details are used for this draft only and are not saved.</p>`;
 composer.querySelector('#message-status').before(delivery);
 delivery.querySelector('#open-email').onclick=()=>{
 const input=delivery.querySelector('#client-email');if(!input.value.trim()||!input.checkValidity()){input.setCustomValidity('Enter a valid client email.');input.reportValidity();input.setCustomValidity('');return;}
 const subject=`Trust M | ${reminder?'Payment reminder':'Financial report'} | ${p.name}`;
 const a=document.createElement('a');a.href=`mailto:${encodeURIComponent(input.value.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composer.querySelector('textarea').value)}`;a.click();
 composer.querySelector('#message-status').textContent='Email draft requested in your mail app. No delivery has been confirmed.';
 };
 delivery.querySelector('#open-whatsapp').onclick=()=>{
 const input=delivery.querySelector('#client-phone'),number=input.value.replace(/[\s()+-]/g,'');
 if(!/^[1-9]\d{7,14}$/.test(number)){input.setCustomValidity('Enter a complete international number with country code (8–15 digits).');input.reportValidity();input.setCustomValidity('');return;}
 window.open(`https://wa.me/${number}?text=${encodeURIComponent(composer.querySelector('textarea').value)}`,'_blank','noopener,noreferrer');
 composer.querySelector('#message-status').textContent='WhatsApp draft requested. Review the recipient and press Send in WhatsApp. No delivery has been confirmed.';
 };
 composer.querySelector('.close-detail').onclick=()=>composer.close();
 composer.querySelector('#copy-message').onclick=async()=>{try{await navigator.clipboard.writeText(composer.querySelector('textarea').value);composer.querySelector('#message-status').textContent='Message copied. Paste it into your client conversation.';}catch{composer.querySelector('textarea').select();composer.querySelector('#message-status').textContent='Select and copy the message manually.';}};
 composer.querySelector('#save-report').onclick=()=>{
 if(reminder)downloadFile(`Trust-M-${p.id}-reminder.txt`,composer.querySelector('textarea').value,'text/plain;charset=utf-8');
 else {const rows=[['TRUST M CLIENT FINANCIAL REPORT',''],['Data','Sample data'],['As of','2026-09-06'],['Currency','EGP'],['Client',p.client],['Project',p.name],['Contract value',p.contract],['Payments received',p.paid],['Remaining contract balance',p.contract-p.paid],['Overdue installment',p.id===2?35000:0],['Overdue due date',p.id===2?'2026-08-30':'Not recorded'],['Note','Remaining contract balance is not necessarily due now. Future installments follow agreed milestones.']];downloadFile(`Trust-M-${p.id}-client-report.csv`,'\uFEFF'+rows.map(row=>row.map(x=>'"'+(typeof x==='string'?(window.egText?.(x)||x):String(x)).replaceAll('"','""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8');}
 composer.querySelector('#message-status').textContent='Download requested. Nothing has been sent to the client.';
 };
 composer.showModal();document.body.classList.add('modal-open');
}
composer.addEventListener('close',()=>{if(!dialog.open)document.body.classList.remove('modal-open');messageFocus?.focus();});

const technicians=[
 ['T01','Hassan Ali','Finishing',1,32000,27000,'On track'],['T02','Mahmoud Samir','Fixtures',1,23000,18000,'On track'],
 ['T03','Youssef Ibrahim','Flooring',2,28000,22000,'On track'],['T04','Mostafa Adel','Painting',2,12000,10000,'Awaiting phase release'],
 ['T05','Mohamed Tarek','Electrical',3,27000,23000,'On track'],['T06','Ahmed Fathy','Plumbing',3,18000,15000,'On track'],
 ['T07','Khaled Nabil','Joinery',4,30000,20000,'Quote review'],['T08','Amr Hany','Electrical',5,15000,10000,'Delayed']
];
const technicianSection=document.createElement('section');technicianSection.id='technicians';technicianSection.hidden=true;
technicianSection.innerHTML=`<div class="section-top"><div><div class="eyebrow">PEOPLE & DELIVERY · SAMPLE DATA</div><h2>Technician breakdown</h2></div><span class="subtle">06 September 2026 · EGP</span></div><div class="kpis">${[['Active technicians','8'],['Incurred labour cost','185,000'],['Paid to technicians','145,000'],['Technician balance','40,000']].map(([l,v])=>`<article class="kpi"><span>${l}</span><strong>${v}</strong></article>`).join('')}</div><p class="message-note">Illustrative technician names and payments. Incurred labour costs reconcile to the portfolio’s technician and subcontractor total. Unpaid incurred costs are already included in cost to date.</p><div class="technician-scroll"><table class="technician-table"><caption>Technician assignments and payment breakdown</caption><thead><tr>${['Technician','Trade','Project / phase','Incurred cost','Paid','Balance','Work status'].map(l=>`<th scope="col">${l}</th>`).join('')}</tr></thead><tbody>${technicians.map(([id,name,trade,pid,incurred,paid,status])=>{const p=projects.find(x=>x.id===pid);return `<tr><th scope="row">${name}<small>${id}</small></th><td>${trade}</td><td><button data-project="${pid}">${p.name} ↗</button><small>${trade==='Painting'?p.next:p.phase}</small></td><td>${fmt(incurred)}</td><td>${fmt(paid)}</td><td class="gold">${fmt(incurred-paid)}</td><td>${status}</td></tr>`;}).join('')}</tbody><tfoot><tr><th colspan="3" scope="row">Total · EGP</th><td>185,000</td><td>145,000</td><td>40,000</td><td>8 technicians</td></tr></tfoot></table></div>`;
const main=document.querySelector('main');main.insertBefore(technicianSection,main.querySelector('footer'));
technicianSection.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>openProject(Number(b.dataset.project)));
const nav=document.querySelector('nav');const techLink=document.createElement('a');techLink.href='#technicians';techLink.textContent='Technicians';nav.append(techLink);
function setView(){const isTech=location.hash==='#technicians';Array.from(main.children).forEach(el=>{if(el.tagName!=='FOOTER')el.hidden=isTech?el!==technicianSection:el===technicianSection;});nav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',isTech?a===techLink:a.getAttribute('href')===(location.hash||'#overview')));}
window.addEventListener('hashchange',setView);setView();
