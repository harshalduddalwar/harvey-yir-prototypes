/* Prototype E: a framed book read spread by spread. Turning crossfades the pages in reading order
   (forward: right page first, then left) while a soft light passes across the paper; the page stacks
   on the outer edges shift with progress. Each spread plays its data once it settles. */
(function(){
  const $=id=>document.getElementById(id);
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const seg=(p,a,b)=>clamp((p-a)/(b-a));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const out=t=>1-Math.pow(1-t,3);
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const r2=v=>Math.round(v*100)/100;

  const spreads=[...document.querySelectorAll('.spread')], N=spreads.length;
  let cur=-1;

  /* ---------- fit the object to the window ---------- */
  function size(){
    const W=innerWidth, H=innerHeight, mx=W>760?92:10;
    const s=Math.min((W-2*mx)/1272,(H-112)/828);
    root.style.setProperty('--s',Math.max(.2,s).toFixed(4));
  }

  /* ---------- tweens: one per running animation, cancelled when the spread is left ---------- */
  let tweens=[];
  function tween(dur,fn,delay=0){
    const tw={dead:false}; tweens.push(tw);
    if(reduce){ fn(1); return tw; }
    const t0=performance.now()+delay;
    (function step(now){
      if(tw.dead) return;
      const t=clamp((now-t0)/dur);
      if(now>=t0) fn(t);
      if(t<1) requestAnimationFrame(step);
    })(performance.now());
    return tw;
  }
  const killTweens=()=>{ tweens.forEach(t=>t.dead=true); tweens=[]; };

  /* ---------- data on each spread ---------- */
  // customers chart
  const steps=[...document.querySelectorAll('#steps path')], marks=[...document.querySelectorAll('#marks rect')], cnt0=$('cnt0');
  const chart=c=>{ steps.forEach((p,i)=>p.style.strokeDashoffset=r2(1-seg(c*7,i,i+1))); marks.forEach((m,i)=>m.style.opacity=r2(seg(c*7,i*2+.6,i*2+1))); cnt0.textContent=fmt(lerp(1000,3500,io(c)))+'+'; };

  // leaders plate: 100 Am Law marks and a column of 10 for the Fortune 10; reach count
  const plate=$('dotPlate'), dots=[], col=[];
  const dot=(x,y,list)=>{ const d=document.createElement('i'); d.className='dot'; d.style.left=x+'px'; d.style.top=y+'px'; plate.appendChild(d); list.push(d); };
  for(let r=0;r<10;r++) for(let c=0;c<10;c++) dot(16.54+c*25.03,16.54+r*25.03,dots);
  const sep=document.createElement('i'); Object.assign(sep.style,{position:'absolute',left:'269.5px',top:'16.5px',width:'1.5px',height:'248px',background:'#FDFCE7'}); plate.appendChild(sep);
  for(let r=0;r<10;r++) dot(275.7,16.54+r*25.03,col);
  const cnt2=$('cnt2');
  const leaders=t=>{ const L=Math.round(seg(t,0,.8)*80), LC=Math.round(seg(t,.8,1)*5); dots.forEach((el,i)=>el.classList.toggle('on',i<L)); col.forEach((el,i)=>el.classList.toggle('on',i<LC)); };
  const reach=m=>{ cnt2.textContent=fmt(200000*out(m))+(m>0?'+':''); };

  // figures
  const figs=[...document.querySelectorAll('.fig b')];
  const fig=(b,t)=>{ b.textContent=fmt(+b.dataset.to*out(t))+b.dataset.suf; };

  // launches: positions carried over from C's 5600px track onto one 1112px axis
  const LAUNCHES=[
    {x:283,l:'Date',t:'Harvey II',p:'Spaces, Memory, and AI agents around the legal matter'},
    {x:842,l:'Date',t:'Legal Agent Benchmark',p:'Open-sourced, with 1,200+ long-horizon legal tasks'},
    {x:1104,l:'Date',t:'Harvey Tenet',p:"Harvey's first model trained for legal work"},
    {x:1590,l:'Date',t:'Harvey Graph',p:'Connected legal and organizational context'},
    {x:2108,l:'May',t:'Transformation Office',p:'Helping legal leaders rethink how work gets done'},
    {x:2690,l:'Date',t:'User-level Memory',p:'Across web, mobile, Word, Outlook, and agents'},
    {x:3170,l:'Date',t:'Agent Builder',p:'Text-based agent creation, pre-built agents, and routines'},
    {x:3640,l:'Q3',t:'U.S. Case Law',p:'With major legal research source expansion'},
    {x:4600,l:'Q4',t:'Space Memory',p:'Matter- and project-specific knowledge carried forward'}
  ];
  const MONTHS=['Jan','Feb','March','April','May','June','July','Aug','Sept','Oct','Nov','Dec'];
  const AX=x=>64+(x-60)*1112/5600;
  const tl=$('tl'), axisFill=$('axisFill'), feat=$('feat');
  const moEls=MONTHS.map((m,i)=>{ const s=document.createElement('span'); s.className='mo'; s.textContent=m; s.style.left=AX(60+487*i)+'px'; tl.appendChild(s); return s; });
  const mks=[], lts=[];
  LAUNCHES.forEach((L,i)=>{
    const x=AX(L.x);
    const b=document.createElement('button'); b.className='mk'; b.style.left=x+'px'; b.style.pointerEvents='auto'; b.setAttribute('aria-label',L.t);
    const t=document.createElement('button'); t.className='lt'; t.textContent=L.t; t.style.pointerEvents='auto'; t.tabIndex=-1;
    t.style.top=(i%2?600:548)+'px';
    // keep the label off the gutter
    if(x>540&&x<660){ t.style.left=(x-104)+'px'; t.style.textAlign='right'; t.style.setProperty('--r','1'); t.classList.add('rt'); } else t.style.left=x+'px';
    const pick=()=>{ stopCycle(); select(i); };
    b.addEventListener('click',pick); t.addEventListener('click',pick); b.addEventListener('mouseenter',pick);
    tl.appendChild(b); tl.appendChild(t); mks.push(b); lts.push(t);
  });
  document.head.insertAdjacentHTML('beforeend','<style>.lt.rt::before{left:auto;right:0}</style>');
  let sel=-1, cycle=0;
  function select(i,instant){
    if(i===sel) return; sel=i;
    const L=LAUNCHES[i], m=Math.min(11,Math.floor((L.x-60)/487));
    mks.forEach((b,j)=>b.classList.toggle('on',j===i)); lts.forEach((b,j)=>b.classList.toggle('on',j===i));
    moEls.forEach((s,j)=>s.classList.toggle('on',j===m));
    const write=()=>{ $('featL').textContent=L.l; $('featT').textContent=L.t; $('featP').textContent=L.p; $('featN').textContent=String(i+1).padStart(2,'0')+' / '+String(LAUNCHES.length).padStart(2,'0'); };
    if(instant||reduce){ write(); return; }
    feat.classList.add('swapping'); clearTimeout(select.t);
    select.t=setTimeout(()=>{ write(); feat.classList.remove('swapping'); },380);
  }
  function stopCycle(){ clearInterval(cycle); cycle=0; }

  const PLAY={
    chart:{ run(){ tween(1900,t=>chart(t),350); }, reset(){ chart(0); } },
    reach:{ run(){ tween(1500,leaders,250); tween(1700,reach,500); }, reset(){ leaders(0); reach(0); } },
    figs:{ run(){ figs.forEach((b,i)=>tween(1500,t=>fig(b,t),250+i*260)); }, reset(){ figs.forEach(b=>fig(b,0)); } },
    launches:{
      run(){
        tween(1400,t=>axisFill.style.transform=`scaleX(${r2(io(t))})`,200);
        mks.forEach((b,i)=>setTimeout(()=>{ if(cur===LI){ b.classList.add('show'); lts[i].classList.add('show'); } },reduce?0:300+i*120));
        select(0,true);
        if(!reduce) cycle=setInterval(()=>select((sel+1)%LAUNCHES.length),2800);
      },
      reset(){ stopCycle(); axisFill.style.transform='scaleX(0)'; mks.forEach(b=>b.classList.remove('show')); lts.forEach(b=>b.classList.remove('show')); sel=-1; select(0,true); }
    }
  };
  const LI=spreads.findIndex(s=>s.dataset.play==='launches');
  Object.values(PLAY).forEach(p=>p.reset());

  // offices map follows the pointer
  const mapbox=$('mapbox'), mapImg=$('mapImg');
  mapbox.addEventListener('mousemove',e=>{
    const r=mapbox.getBoundingClientRect(), px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
    mapImg.style.transform=`translate3d(${r2(-px*2*60)}px,${r2(-py*2*36)}px,0)`;
  });
  mapbox.addEventListener('mouseleave',()=>{ mapImg.style.transform=''; });

  /* ---------- contents ---------- */
  const toc=$('toc'), tocItems=[];
  spreads.forEach((s,i)=>{
    const [a,b]=s.dataset.toc.split('|'), li=document.createElement('li'), btn=document.createElement('button');
    let text=a, cls='';
    if(b!==undefined){ if(a==='sub'){ text=b; cls='sub'; } else { text=a+' · '+b; cls='ch'; } }
    if(i===N-1) cls+=' soon-ish';
    li.className=cls; btn.innerHTML='<i></i><span class="t"></span>'; btn.querySelector('.t').textContent=text;
    btn.addEventListener('click',()=>go(i));
    li.appendChild(btn); toc.appendChild(li); tocItems.push(li);
  });

  /* ---------- turning ---------- */
  const sweep=$('sweep'), where=$('where'), btnPrev=$('prev'), btnNext=$('next');
  let timers=[];
  const pages=s=>[s.querySelector('.pg.l'),s.querySelector('.pg.r')];
  function settle(s,on){ pages(s).forEach(p=>{ p.classList.toggle('vis',on); p.classList.toggle('in',on); }); }
  function finish(){
    timers.forEach(clearTimeout); timers=[];
    spreads.forEach((s,i)=>{ if(i!==cur){ s.classList.remove('on','out'); s.style.zIndex=''; settle(s,false); } });
    if(cur>=0){ const s=spreads[cur]; s.classList.remove('out'); settle(s,true); }
  }
  function leave(i){
    if(i<0) return; killTweens();
    const p=PLAY[spreads[i].dataset.play]; if(p) timers.push(setTimeout(()=>p.reset(),reduce?0:520));
  }
  function arrive(i,delay){
    const p=PLAY[spreads[i].dataset.play]; if(!p) return;
    if(delay) timers.push(setTimeout(()=>{ if(cur===i) p.run(); },delay)); else p.run();
  }
  function chrome(){
    const p=cur/(N-1);
    root.style.setProperty('--stl',r2(3+10*p)+'px'); root.style.setProperty('--str',r2(3+10*(1-p))+'px');
    where.innerHTML=`<b>${String(cur+1).padStart(2,'0')}</b> / ${String(N).padStart(2,'0')}<span> · ${spreads[cur].dataset.name}</span>`;
    btnPrev.disabled=cur===0; btnNext.disabled=cur===N-1;
    tocItems.forEach((li,i)=>li.classList.toggle('on',i===cur));
    history.replaceState(null,'','#'+(cur+1));
  }
  function go(to,instant){
    to=clamp(to,0,N-1); if(to===cur) return;
    finish();
    const from=cur, dir=to>from?1:-1, A=spreads[from], B=spreads[to];
    cur=to; leave(from); chrome();
    if(instant||from<0||reduce){
      if(A){ A.classList.remove('on','out'); settle(A,false); }
      B.classList.add('on'); settle(B,true); arrive(to,reduce?0:500); return;
    }
    A.style.zIndex=1; B.style.zIndex=2;
    A.classList.add('out'); B.classList.add('on');
    const [bl,br]=pages(B), first=dir>0?br:bl, second=dir>0?bl:br;
    // the light crosses the paper in reading direction
    sweep.animate([{transform:`translate3d(${dir>0?1240:-340}px,0,0)`,opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.75},{transform:`translate3d(${dir>0?-340:1240}px,0,0)`,opacity:0}],{duration:1150,easing:'cubic-bezier(.45,.05,.35,1)'});
    timers.push(setTimeout(()=>{ first.classList.add('vis','in'); },240));
    timers.push(setTimeout(()=>{ second.classList.add('vis','in'); },600));
    timers.push(setTimeout(()=>{ A.classList.remove('on','out'); A.style.zIndex=''; settle(A,false); B.style.zIndex=''; },1300));
    arrive(to,900);
  }
  const next=()=>go(cur+1), prev=()=>go(cur-1);
  function restart(){ go(0); }

  /* ---------- input ---------- */
  btnPrev.addEventListener('click',prev); btnNext.addEventListener('click',next);
  $('restart').addEventListener('click',restart); $('restartIn').addEventListener('click',e=>{ e.stopPropagation(); restart(); });
  document.querySelectorAll('.ctas a').forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); }));
  // click the right page to go on, the left page to go back
  $('book').addEventListener('click',e=>{
    if(e.target.closest('a,button,.mapbox')) return;
    const r=$('book').getBoundingClientRect();
    (e.clientX-r.left)>r.width/2?next():prev();
  });
  addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key;
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(k)){ e.preventDefault(); next(); }
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(k)){ e.preventDefault(); prev(); }
    else if(k==='Home'){ e.preventDefault(); go(0); } else if(k==='End'){ e.preventDefault(); go(N-1); }
  });
  let tx=0,ty=0;
  addEventListener('touchstart',e=>{ tx=e.touches[0].clientX; ty=e.touches[0].clientY; },{passive:true});
  addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)) dx<0?next():prev(); },{passive:true});
  let wheelLock=0, acc=0;
  addEventListener('wheel',e=>{
    e.preventDefault(); const now=performance.now();
    if(now<wheelLock){ wheelLock=now+260; return; }       // still the same gesture (trackpad momentum)
    acc+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(Math.abs(acc)>30){ acc>0?next():prev(); acc=0; wheelLock=now+800; }
  },{passive:false});

  /* ---------- start ---------- */
  addEventListener('resize',size); size();
  const h=parseInt(location.hash.slice(1),10);
  go(h>=1&&h<=N?h-1:0,true);
  addEventListener('hashchange',()=>{ const n=parseInt(location.hash.slice(1),10); if(n>=1&&n<=N&&n-1!==cur) go(n-1); });
})();
