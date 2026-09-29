window.TrustFinanceSeed={
  projects:[{id:'apartment',name:'Apartment renovation · Demo',client:'Demo Client A'},{id:'pool',name:'Swimming pool · Demo',client:'Demo Client B'}],
  payments:[{id:'PAY-001',project:'apartment',date:'2026-09-01',direction:'in',amount:300000,party:'Demo Client A',description:'Client advance',method:'Bank transfer',reference:'DEMO-001'},
   {id:'PAY-002',project:'apartment',date:'2026-09-02',direction:'out',amount:200000,party:'Demo supplier',description:'Materials payment',method:'Bank transfer',reference:'DEMO-002'},
   {id:'PAY-003',project:'pool',date:'2026-09-03',direction:'in',amount:120000,party:'Demo Client B',description:'Project advance',method:'Bank transfer',reference:'DEMO-003'}],
  expenses:[{id:'EXP-001',project:'apartment',date:'2026-09-02',amount:84500,category:'Materials',party:'Demo supplier',description:'Illustrative renovation materials',reference:'DEMO-EXP-1'},
   {id:'EXP-002',project:'pool',date:'2026-09-04',amount:100000,category:'Subcontractors',party:'Demo subcontractor',description:'Civil work completed',reference:'DEMO-EXP-2'}],
  charges:[{id:'CHG-001',project:'apartment',date:'2026-09-02',amount:84500,earned:84500,description:'Completed works charged to client'},
   {id:'CHG-002',project:'apartment',date:'2026-09-03',amount:8450,earned:8450,description:'Illustrative supervision fee'},
   {id:'CHG-003',project:'apartment',date:'2026-09-03',amount:12000,earned:12000,description:'Engineering drawings'},
   {id:'CHG-004',project:'pool',date:'2026-09-04',amount:125000,earned:125000,description:'Completed civil milestone'}],
  invoices:[],quotes:[],
  blocks:[{id:'civil',name:'Pool · Civil works',items:[{description:'Concrete works',unit:'Lump sum',quantity:1,rate:110000},{description:'Waterproofing',unit:'m²',quantity:200,rate:450},{description:'Plastering',unit:'m²',quantity:125,rate:300},{description:'Mosaic finish',unit:'m²',quantity:125,rate:1050}]},
   {id:'equipment',name:'Pool · Equipment',items:[{description:'Sand filter',unit:'Item',quantity:1,rate:40000},{description:'Circulation pump',unit:'Item',quantity:2,rate:40000},{description:'Control panel',unit:'Lump sum',quantity:1,rate:50000}]},
   {id:'renovation',name:'Renovation · Services',items:[{description:'Electrical installation',unit:'Lump sum',quantity:1,rate:0},{description:'Plumbing installation',unit:'Lump sum',quantity:1,rate:0}]}]
 };
