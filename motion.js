/* Trust M motion layer. See motion.css. No dependencies, no network, CSP-safe.
   It reveals sections, counts numbers up, sweeps charts and slides the nav
   indicator. It does nothing when the visitor prefers reduced motion. */
(function(){
  'use strict';
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window)||!('MutationObserver' in window))return;
  const root=document.documentElement;
  root.classList.add('m-on');

  const REVEAL='.heading,.kpi,.panel,.project,.approval-card,.submission-card,.document-card,.client-finance-item,.client-phase-card,.client-overview-head,.login-panel,.finance-kpis';
  const FILL='.progress>span,.balance-track>span';
  const COUNT='.kpis strong,.finance-kpis strong,.kpi>strong,.balance-total>strong,.client-finance-item>strong,.donut strong,.project-finance dd,.detail-finance dd';
  const ALL=[REVEAL,FILL,COUNT,'.donut','.progress-ring','.bar','.gantt-bar'].join(',');

  const done=new WeakSet();        // parents whose first render already animated
  const queue=new WeakMap();       // element -> kind
  const io=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      const el=entry.target;io.unobserve(el);
      const kind=queue.get(el);queue.delete(el);
      if(kind==='reveal')reveal(el);
      else if(kind==='count')startCount(el);
      else release(el);
    }
  },{threshold:0,rootMargin:'0px 0px -8% 0px'});

  function inViewNow(el){const r=el.getBoundingClientRect();return r.height>0&&r.top<innerHeight;}
  function track(el,kind){queue.set(el,kind);io.observe(el);}
  function delayOf(el){const holder=el.closest('[data-m-i]');return holder?Number(holder.dataset.mI)*70:0;}

  /* Reveal: fade and rise, staggered within one batch */
  function reveal(el){
    el.classList.remove('m-pending');el.classList.add('m-in');
    const finish=event=>{if(event&&event.target!==el)return;el.classList.remove('m-in');el.style.removeProperty('--i');el.removeEventListener('animationend',finish);};
    el.addEventListener('animationend',finish);
    setTimeout(finish,1800);
  }
  /* Await-style effects (fills, bars, donut, ring, gantt) just drop the class */
  function release(el){el.classList.remove('m-await');}

  /* Count-up: first numeric run in the first text node */
  const NUM=/^([^\d٠-٩]*)([\d٠-٩][\d٠-٩,٬.٫]*)([^]*)$/;
  const ARABIC=/[٠-٩]/;
  function parse(text){
    const m=NUM.exec(text);if(!m||/[\d٠-٩]/.test(m[3]))return null;
    const latin=m[2].replace(/[٠-٩]/g,d=>d.charCodeAt(0)-0x660).replace(/[,٬]/g,'').replace('٫','.');
    const value=Number(latin);if(!isFinite(value)||value<=0||value>1e12||/\..*\./.test(latin))return null;
    const decimals=(latin.split('.')[1]||'').length;
    return{prefix:m[1],suffix:m[3],value,decimals,locale:ARABIC.test(m[2])?'ar-EG':'en-US'};
  }
  function prepareCount(el){
    if(el._m)return;
    const node=el.firstChild;if(!node||node.nodeType!==3)return;
    const info=parse(node.nodeValue);if(!info)return;
    el._m={node,info,final:node.nodeValue};
    const fmt=info.fmt=new Intl.NumberFormat(info.locale,{minimumFractionDigits:info.decimals,maximumFractionDigits:info.decimals});
    if(inViewNow(el)){node.nodeValue=info.prefix+fmt.format(0)+info.suffix;}
    track(el,'count');
    setTimeout(()=>{if(el._m&&!el._m.started){node.nodeValue=el._m.final;}},6000);
  }
  function startCount(el){
    const state=el._m;if(!state||state.started)return;state.started=true;
    const {node,info}=state;
    const long=el.closest('.donut');
    const duration=long?1400:950,delay=delayOf(el);
    el.setAttribute('role','text');el.setAttribute('aria-label',state.final.trim());
    const begin=performance.now()+delay;
    (function frame(now){
      const t=Math.min(1,Math.max(0,(now-begin)/duration));
      const eased=1-Math.pow(1-t,3);
      node.nodeValue=info.prefix+info.fmt.format(info.value*eased)+info.suffix;
      if(t<1)requestAnimationFrame(frame);
      else{node.nodeValue=state.final;el.removeAttribute('role');el.removeAttribute('aria-label');}
    })(performance.now());
  }

  /* Scan newly added markup */
  function scan(added){
    const batch=[];
    for(const node of added){
      if(node.nodeType!==1)continue;
      if(node.matches(ALL))batch.push(node);
      node.querySelectorAll&&batch.push(...node.querySelectorAll(ALL));
    }
    if(!batch.length)return;
    const claimed=new Set(),counters=new Map();
    for(const el of batch){
      if(el.dataset.m)continue;
      const parent=el.parentElement||document.body;
      if(done.has(parent))continue;                    // a re-render of a container we already animated
      const inDialog=!!el.closest('dialog');
      let kind=null;
      if(el.matches('.bar'))kind='bar';
      else if(el.matches('.gantt-bar'))kind='gantt';
      else if(el.matches('.donut'))kind='donut';
      else if(el.matches('.progress-ring'))kind='ring';
      else if(el.matches(FILL))kind='fill';
      else if(el.matches(COUNT))kind='count';
      else if(el.matches(REVEAL)&&!inDialog&&!el.parentElement.closest('.m-pending,.m-in'))kind='reveal';
      if(!kind)continue;
      el.dataset.m=kind;
      const n=counters.get(parent)||0;counters.set(parent,n+1);
      const index=Math.min(n,7);
      if(kind==='reveal'){
        el.style.setProperty('--i',index);el.dataset.mI=index;
        el.classList.add('m-pending');track(el,'reveal');
      }else if(kind==='count'){
        prepareCount(el);
      }else{
        let i=index;
        if(kind==='bar'){const group=el.closest('.bar-group'),pair=el.parentElement;i=(group?[...group.parentElement.children].indexOf(group):0)*2+(pair?[...pair.children].indexOf(el):0);}
        if(kind==='gantt'){const row=el.closest('.gantt-row');i=row?[...row.parentElement.children].indexOf(row):0;}
        el.style.setProperty('--i',i);
        el.classList.add('m-await','m-'+(kind==='fill'?'fill':kind));
        track(el,'release');
      }
      claimed.add(parent);
    }
    claimed.forEach(parent=>{if(parent!==document.body&&parent!==document.documentElement)done.add(parent);});
  }

  /* Status messages pop when their text changes */
  const STATUS='[role=status]:not(#loader),[role=alert],.form-error,.login-message';
  function pop(mutations){
    for(const mutation of mutations){
      const target=mutation.target.nodeType===1?mutation.target:mutation.target.parentElement;
      const box=target&&target.closest&&target.closest(STATUS);
      if(box&&box.textContent.trim()&&!box.classList.contains('m-pop')){
        box.classList.add('m-pop');
        setTimeout(()=>box.classList.remove('m-pop'),600);
      }
    }
  }

  /* Sliding nav indicator */
  function setupNav(nav){
    if(nav.dataset.ink||nav.classList.contains('tech-bottom-nav'))return;
    nav.dataset.ink='1';
    const bar=document.createElement('i');bar.className='m-ink';bar.setAttribute('aria-hidden','true');
    nav.classList.add('m-ink-nav');nav.append(bar);
    const move=a=>{
      if(!a||!a.offsetWidth){bar.style.opacity='0';return;}
      bar.style.opacity='1';bar.style.width=a.offsetWidth+'px';bar.style.transform='translateX('+a.offsetLeft+'px)';
    };
    const rest=()=>move(nav.querySelector('a.active,a[aria-current]'));
    nav.addEventListener('pointerover',event=>{const a=event.target.closest('a');if(a&&nav.contains(a))move(a);});
    nav.addEventListener('focusin',event=>{const a=event.target.closest('a');if(a)move(a);});
    nav.addEventListener('pointerleave',rest);
    nav.addEventListener('focusout',rest);
    new MutationObserver(rest).observe(nav,{attributes:true,subtree:true,attributeFilter:['class','aria-current']});
    addEventListener('resize',rest);
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(rest);
    rest();
    requestAnimationFrame(()=>requestAnimationFrame(()=>bar.classList.add('m-ink-ready')));
  }

  const observer=new MutationObserver(mutations=>{
    const added=[];
    for(const mutation of mutations){
      for(const node of mutation.addedNodes)added.push(node);
      // an existing number element whose text is filled in later (e.g. #balance-total)
      const t=mutation.target;
      if(t.nodeType===1&&t.matches&&t.matches(COUNT)&&!t._m&&!t.closest('dialog'))prepareCount(t);
    }
    if(added.length)scan(added);
    pop(mutations);
  });

  function start(){
    scan([document.body]);
    document.querySelectorAll('header nav').forEach(setupNav);
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
