(function(root){
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const n=value=>Number(value||0);
  const sum=(rows,pick)=>rows.reduce((total,row)=>total+n(pick(row)),0);
  const monthKey=date=>String(date||'').slice(0,7);
  const demoProjects=[
    {id:'demo-1',name:'فيلا تجريبية 01',client:'عميل تجريبي أ',location:'القاهرة الجديدة',progress:78,phase:'التشطيبات والتركيبات',next:'المعاينة النهائية',contract:350000,paid:260000,cost:180000,nextCost:18000,final:230000,status:'active',team:2,start:'2026-07-06',end:'2026-09-20'},
    {id:'demo-2',name:'شقة تجريبية 02',client:'عميل تجريبي ب',location:'الشيخ زايد',progress:62,phase:'الأرضيات',next:'الدهانات',contract:280000,paid:170000,cost:120000,nextCost:70000,final:190000,status:'on_hold',team:2,start:'2026-07-13',end:'2026-10-11'},
    {id:'demo-3',name:'دوبلكس تجريبي 03',client:'عميل تجريبي ج',location:'6 أكتوبر',progress:45,phase:'الكهرباء والسباكة',next:'المحارة',contract:250000,paid:150000,cost:90000,nextCost:25000,final:160000,status:'active',team:2,start:'2026-08-03',end:'2026-10-25'},
    {id:'demo-4',name:'شقة جاردن تجريبية 04',client:'عميل تجريبي د',location:'المعادي',progress:34,phase:'المحارة',next:'الأرضيات',contract:190000,paid:90000,cost:61000,nextCost:22000,final:132000,status:'active',team:1,start:'2026-08-15',end:'2026-11-08'},
    {id:'demo-5',name:'ستوديو تجريبي 05',client:'عميل تجريبي هـ',location:'مصر الجديدة',progress:18,phase:'التجهيزات',next:'الكهرباء',contract:160000,paid:60000,cost:28000,nextCost:17000,final:105000,status:'planning',team:1,start:'2026-09-01',end:'2026-11-30'}
  ].map((project,index)=>({...project,schedule:[
    {name:'التصميم والاعتمادات',from:project.start,to:project.start,progress:100,status:'complete'},
    {name:project.phase,from:project.start,to:project.end,progress:project.progress,status:'in_progress'},
    {name:project.next,from:project.end,to:project.end,progress:0,status:'planned'}
  ],costBreakdown:index===0?{materials:110000,labour:55000,other:15000}:{materials:project.cost*.6,labour:project.cost*.3,other:project.cost*.1}}));

  function monthsFrom(records){
    const now=new Date(),keys=[];
    for(let offset=5;offset>=0;offset--){const d=new Date(now.getFullYear(),now.getMonth()-offset,1);keys.push(d.toISOString().slice(0,7));}
    return keys.map(key=>{
      const [year,month]=key.split('-').map(Number);
      const label=new Intl.DateTimeFormat('ar-EG',{month:'short'}).format(new Date(year,month-1,1));
      const rows=records.filter(row=>monthKey(row.date||row.entry_date)===key);
      return {key,label,collected:sum(rows,row=>row.kind==='receipt'?row.amount:0),outgoing:sum(rows,row=>row.kind==='outgoing'||row.kind==='expense'?row.amount:0)};
    });
  }

  function demo(){
    const records=[
      {date:'2026-04-01',kind:'receipt',amount:90000},{date:'2026-04-03',kind:'expense',amount:65000},
      {date:'2026-05-01',kind:'receipt',amount:130000},{date:'2026-05-03',kind:'expense',amount:80000},
      {date:'2026-06-01',kind:'receipt',amount:170000},{date:'2026-06-03',kind:'expense',amount:105000}
    ];
    return {mode:'demo',projects:demoProjects,months:monthsFrom(records),technicians:[],breakdown:{materials:290000,labour:185000,other:45000}};
  }

  function progressFor(phases){
    if(!phases?.length)return 0;
    return Math.round(sum(phases,phase=>phase.progress_percent)/phases.length);
  }

  function scheduleFor(project){
    return (project.project_phases||[]).slice().sort((a,b)=>a.sort_order-b.sort_order).map(phase=>({
      name:phase.phase_name,
      from:phase.starts_on||project.start_date||project.target_end_date,
      to:phase.ends_on||project.target_end_date||project.start_date,
      progress:n(phase.progress_percent),
      status:n(phase.progress_percent)>=100?'complete':n(phase.progress_percent)>0?'in_progress':'planned'
    })).filter(phase=>phase.from&&phase.to);
  }

  async function liveOwner(){
    const sb=root.TrustAuth.client;
    const [projectResult,entryResult,workspaceResult,memberResult]=await Promise.all([
      sb.from('projects').select('id, project_name, project_code, location, status, current_phase, next_phase, start_date, target_end_date, total_contract_value, forecast_final_cost, clients(display_name), project_phases(phase_name, starts_on, ends_on, progress_percent, sort_order), project_members(profile_id, member_role)').order('created_at',{ascending:true}),
      sb.from('finance_entries').select('id, project_id, direction, entry_date, category, amount, description').order('entry_date',{ascending:true}),
      sb.from('finance_workspaces').select('state').eq('id','main').maybeSingle(),
      sb.from('project_members').select('project_id, member_role, profiles!project_members_profile_id_fkey(full_name), projects!project_members_project_id_fkey(project_name,current_phase)')
    ]);
    if(projectResult.error)throw projectResult.error;
    const entries=entryResult.error?[]:(entryResult.data||[]);
    const state=workspaceResult.error?null:workspaceResult.data?.state;
    const statePayments=state?.payments||[],stateExpenses=state?.expenses||[];
    const projects=(projectResult.data||[]).map(project=>{
      const projectEntries=entries.filter(entry=>entry.project_id===project.id);
      const receipts=sum(projectEntries.filter(entry=>entry.direction==='client_receipt'),entry=>entry.amount)+sum(statePayments.filter(row=>row.project===project.id&&row.direction==='in'),row=>row.amount);
      const expenses=sum(projectEntries.filter(entry=>entry.direction==='project_expense'),entry=>entry.amount)+sum(stateExpenses.filter(row=>row.project===project.id),row=>row.amount);
      const breakdownRows=[...projectEntries.filter(entry=>entry.direction==='project_expense').map(entry=>({category:entry.category,amount:entry.amount})),...stateExpenses.filter(row=>row.project===project.id)];
      const materials=sum(breakdownRows.filter(row=>/material|خامات/i.test(row.category||'')),row=>row.amount);
      const labour=sum(breakdownRows.filter(row=>/technician|subcontract|عمال|فني/i.test(row.category||'')),row=>row.amount);
      const finalCost=n(project.forecast_final_cost)||expenses;
      const schedule=scheduleFor(project);
      return {
        id:project.id,name:project.project_name,client:project.clients?.display_name||'عميل غير محدد',location:project.location||'الموقع مش مسجل',
        progress:progressFor(project.project_phases),phase:project.current_phase||schedule.find(item=>item.status==='in_progress')?.name||'المرحلة الحالية مش محددة',
        next:project.next_phase||schedule.find(item=>item.status==='planned')?.name||'المرحلة الجاية مش محددة',
        contract:n(project.total_contract_value),paid:receipts,cost:expenses,nextCost:0,final:finalCost,status:project.status,
        team:(project.project_members||[]).length,start:project.start_date,end:project.target_end_date,schedule,
        costBreakdown:{materials,labour,other:Math.max(0,expenses-materials-labour)}
      };
    });
    const records=[
      ...entries.map(entry=>({date:entry.entry_date,kind:entry.direction==='client_receipt'?'receipt':entry.direction==='supplier_payment'||entry.direction==='technician_payment'?'outgoing':entry.direction==='project_expense'?'expense':'other',amount:n(entry.amount)})),
      ...statePayments.map(row=>({date:row.date,kind:row.direction==='in'?'receipt':'outgoing',amount:n(row.amount)})),
      ...stateExpenses.map(row=>({date:row.date,kind:'expense',amount:n(row.amount)}))
    ];
    const technicians=memberResult.error?[]:(memberResult.data||[]).map(member=>({
      name:member.profiles?.full_name||'فني',trade:member.member_role||'فني',project:member.projects?.project_name||'مشروع',phase:member.projects?.current_phase||'غير محددة'
    }));
    return {mode:'live',projects,months:monthsFrom(records),technicians,breakdown:{
      materials:sum(projects,p=>p.costBreakdown.materials),labour:sum(projects,p=>p.costBreakdown.labour),other:sum(projects,p=>p.costBreakdown.other)
    }};
  }

  async function owner(){
    if(!root.TrustAuth.enabled)return demo();
    return liveOwner();
  }

  async function amr(){
    if(!root.TrustAuth.enabled)return {mode:'demo',projects:demoProjects.map(({contract,paid,cost,nextCost,final,costBreakdown,...project})=>project)};
    const {data,error}=await root.TrustAuth.client.from('projects')
      .select('id, project_name, project_code, location, status, current_phase, next_phase, start_date, target_end_date, project_phases(phase_name, starts_on, ends_on, progress_percent, sort_order), project_members(profile_id)')
      .order('created_at',{ascending:true});
    if(error)throw error;
    return {mode:'live',projects:(data||[]).map(project=>({
      id:project.id,name:project.project_name,location:project.location||'الموقع مش مسجل',status:project.status,
      phase:project.current_phase||'المرحلة الحالية مش محددة',next:project.next_phase||'المرحلة الجاية مش محددة',
      progress:progressFor(project.project_phases),team:(project.project_members||[]).length,start:project.start_date,end:project.target_end_date,schedule:scheduleFor(project)
    }))};
  }

  root.TrustDashboardData={owner,amr,esc};
})(globalThis);
