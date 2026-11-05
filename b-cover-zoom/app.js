/* Scroll engine for prototype B. One rAF loop reads Lenis's smoothed scroll, derives every
   animation from positions measured once per resize, and writes only styles that changed. */
(function(){
  const root=document.documentElement, $=id=>document.getElementById(id);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const seg=(p,a,b)=>clamp((p-a)/(b-a));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const out=t=>1-Math.pow(1-t,3);
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const r2=v=>Math.round(v*100)/100;
  function css(el,prop,val){ const k='_'+prop; if(el[k]!==val){ el[k]=val; el.style[prop]=val; } }
  function txt(el,val){ if(el._txt!==val){ el._txt=val; el.textContent=val; } }
  const tf=(el,x,y,s)=>css(el,'transform',`translate3d(${r2(x)}px,${r2(y)}px,0)`+(s!=null&&s!==1?` scale(${Math.round(s*10000)/10000})`:''));
  const op=(el,v)=>css(el,'opacity',String(Math.round(clamp(v)*1000)/1000));
  function keys(p,list){
    if(p<=list[0][0]) return list[0][1];
    for(let i=1;i<list.length;i++){ if(p<=list[i][0]){ const t=io(seg(p,list[i-1][0],list[i][0])); return lerp(list[i-1][1],list[i][1],t); } }
    return list[list.length-1][1];
  }

  /* ---------- layout ---------- */
  const hero=$('hero'), page=$('page'), pa=$('pa');
  const PAGE_H=6251;          // long page height in design px
  const SLIDE=328;            // design px of hero image still to scroll after the zoom (1128 − 800)
  let VH=innerHeight, Y=0, s=1, sc=1, k=1, Z=0, D=0, heroTop=0, pageTop=0;
  const rvs=[...document.querySelectorAll('[data-rv]')].map(el=>({el,y:0,h:0}));
  const designY=el=>{ let y=0; for(let n=el;n&&n!==pa;n=n.offsetParent) y+=n.offsetTop; return y; };
  function measure(){
    VH=innerHeight; s=Math.min(innerWidth/1440,VH/800); sc=Math.max(innerWidth/1440,VH/800); k=innerWidth/1440;
    root.style.setProperty('--s',s); root.style.setProperty('--sc',sc); root.style.setProperty('--k',k);
    Z=VH*2.4; D=SLIDE*s;
    hero.style.height=(VH+Z+D)+'px';
    page.style.height=(PAGE_H*k)+'px';
    heroTop=hero.offsetTop; pageTop=page.offsetTop;
    rvs.forEach(r=>{ r.y=designY(r.el); r.h=r.el.offsetHeight; });
    launches.forEach(l=>{ l.y=designY(l.el)+37; });
    secTop.launches=designY($('launches')); secTop.research=designY($('research'));
  }
  const screenY=dy=>pageTop+dy*k-Y;   // a design-y on the long page, in viewport px

  /* ---------- hero: board frames 1–5 ---------- */
  const heroImg=$('heroImg'), cover=$('cover'), intro=$('intro'), ctas=$('ctas'), yir=$('yir'), cue=$('scrollCue'), pageTopEl=$('pageTop'), heroH=$('heroH'), dropI=$('dropI'), dropText=$('dropText');
  function renderHero(){
    const t=Y-heroTop, q=clamp(t/Z), d=clamp(t-Z,0,D), after=Math.max(0,t-Z-D);
    // frame 1 → 2: the intro copy and buttons leave as the cover begins to grow
    const leave=out(seg(q,0,.14)); op(intro,1-leave); op(ctas,1-leave); tf(intro,0,-24*leave); tf(ctas,0,-24*leave);
    op(cue,1-seg(q,.7,.85));
    // frames 2–3: cover scales about its centre (1 → 1.49 → 2.61), then gives way to the full-bleed painting
    tf(cover,0,0,keys(q,[[0,1],[.45,1.49],[.8,2.61],[1,3.1]]));
    op(cover,1-seg(q,.78,.96));
    op(heroImg,seg(q,.78,.96));
    // the painting sits at its page position (-865, -1162); it trails the copy for a gentle downward drift
    tf(heroImg,-865,-1162-(.55*d)/sc+(.45*after)/sc,3171/3171);
    // "Year in Review" keeps its size and rides up from the cover (389) to the page (30)
    const yy=keys(q,[[0,389.4],[.45,369.4],[.8,42],[1,30]]);
    tf(yir,0,yy-389.4-d/s);
    // frame 4: headline settles; frame 5: copy on the bottom right slides in
    tf(pageTopEl,0,-d/s);
    op(heroH,seg(q,.86,1)); tf(heroH,0,lerp(20,0,out(seg(q,.86,1))));
    const sl=out(seg(d,0,D*.8)); const pre=seg(q,.9,1)*.35;
    op(dropI,Math.max(pre,sl)); op(dropText,Math.max(pre,sl));
    tf(dropI,lerp(60,0,Math.max(pre,sl)),0); tf(dropText,lerp(60,0,Math.max(pre,sl)),0);
  }

  /* ---------- long page: gentle reveals ---------- */
  function renderReveals(){
    rvs.forEach(r=>{
      const top=screenY(r.y); if(top>VH*1.1||top+r.h*k<-VH*.2) return;
      const t=out(seg(1-top/VH,.04,.32)); op(r.el,t); tf(r.el,0,(1-t)*36);
      r.t=t;
    });
  }

  /* customers chart, dots, reach, figures: tied to how far each plate has come into view */
  const steps=[...document.querySelectorAll('#steps path')], marks=[...document.querySelectorAll('#marks rect')];
  const chartR=rvs.find(r=>r.el.id==='chartPlate'), dotR=rvs.find(r=>r.el.id==='dotPlate'), reachR=rvs.find(r=>r.el.id==='reachPlate');
  const cnt0=$('cnt0'), cnt2=$('cnt2'), reachMap=$('reachMap');
  const dotPlate=$('dotPlate'), dots=[], col=[];
  for(let r=0;r<10;r++){ for(let c=0;c<10;c++){ const d=document.createElement('i'); d.className='dot'; d.style.left=(16.54+c*25.03)+'px'; d.style.top=(16.54+r*25.03)+'px'; dotPlate.appendChild(d); dots.push(d); } }
  const sep=document.createElement('i'); sep.className='abs'; Object.assign(sep.style,{left:'269.5px',top:'16.5px',width:'1.5px',height:'248px',background:'#FDFCE7'}); dotPlate.appendChild(sep);
  for(let r=0;r<10;r++){ const d=document.createElement('i'); d.className='dot'; d.style.left='275.7px'; d.style.top=(16.54+r*25.03)+'px'; dotPlate.appendChild(d); col.push(d); }
  let lit=-1, litCol=-1;
  const figs=[...document.querySelectorAll('.fig b')].map(b=>({b,r:rvs.find(x=>x.el===b.parentNode)}));
  const viewP=r=>clamp(1-screenY(r.y)/VH);  // 0 at the fold → 1 at the top
  const vis=r=>{ const t=screenY(r.y); return t<VH*1.05 && t+r.h*k>-VH*.05; };
  function renderData(){
    if(vis(chartR)){
    const c=seg(viewP(chartR),.15,.75);
    steps.forEach((p,i)=>css(p,'strokeDashoffset',String(r2(1-seg(c*7,i,i+1)))));
    marks.forEach((m,i)=>op(m,seg(c*7,i*2+.6,i*2+1)));
    txt(cnt0,fmt(lerp(1000,3500,io(c)))+'+');
    }
    const dp=viewP(dotR), L=Math.round(seg(dp,.15,.6)*80), LC=Math.round(seg(dp,.55,.7)*5);
    if(L!==lit){ dots.forEach((el,i)=>el.classList.toggle('on',i<L)); lit=L; }
    if(LC!==litCol){ col.forEach((el,i)=>el.classList.toggle('on',i<LC)); litCol=LC; }
    if(vis(reachR)){ const rp=viewP(reachR), m=seg(rp,.15,.7);
    txt(cnt2,fmt(200000*out(m))+(m>0?'+':''));
    tf(reachMap,lerp(0,-50,rp),lerp(14,-14,rp)); }
    figs.forEach(f=>{ const t=out(seg(viewP(f.r),.1,.55)); txt(f.b,fmt(+f.b.dataset.to*t)+f.b.dataset.suf); });
  }

  /* product image: slow zoom as it passes */
  const prodImg=$('prodImg').querySelector('img'), prodR=rvs.find(r=>r.el.id==='prodImg');
  const officeImg=$('officeMap').querySelector('img'), officeR=rvs.find(r=>r.el.id==='officeMap');
  function renderImages(){
    if(vis(prodR)) tf(prodImg,0,0,lerp(1.12,1,out(viewP(prodR))));
    if(vis(officeR)){ const op2=clamp((VH-screenY(officeR.y))/(VH+officeR.h*k)); tf(officeImg,0,lerp(-10,10,op2),1.04); }
  }

  /* launches: heading holds while the list passes; the item at the centre lights up with its month */
  const secTop={launches:0,research:0};
  const tlHead=$('tlHead'), months=[...$('months').children];
  const launches=[...document.querySelectorAll('.launch')].map(el=>({el,y:0,m:+el.dataset.m}));
  let active=-1;
  function renderLaunches(){
    const viewTop=(Y-pageTop)/k, mid=viewTop+VH/k*.5;
    tf(tlHead,0,clamp(viewTop+60-(secTop.launches+60),0,1072));
    let best=0, bd=1e9; launches.forEach((l,i)=>{ const dd=Math.abs(l.y-mid); if(dd<bd){ bd=dd; best=i; } });
    if(best!==active){ active=best; launches.forEach((l,i)=>l.el.classList.toggle('on',i===best)); months.forEach((m,i)=>m.classList.toggle('on',i===launches[best].m)); }
  }

  /* research: background drifts, the right side stays softly blurred */
  const resA=$('resA');
  function renderResearch(){
    const t=clamp((VH-screenY(secTop.research))/(VH+800*k));
    const y=lerp(90,-90,t), sz=lerp(1.08,1,t);
    tf(resA,0,y,sz);
  }

  /* chrome: progress bar, monogram flips to cream over dark grounds */
  const bar=$('bar'), mono=$('mono');
  function renderChrome(){
    const max=root.scrollHeight-VH; css(bar,'transform',`scaleX(${max>0?Math.round(Y/max*1000)/1000:0})`);
    mono.classList.toggle('light',Y-heroTop>Z*.62);
  }

  function render(){
    if(Y<heroTop+hero.offsetHeight) renderHero();
    if(Y+VH>pageTop){ renderReveals(); renderData(); renderImages(); renderLaunches(); if(screenY(secTop.research)<VH) renderResearch(); }
    renderChrome();
  }

  /* doors: placeholders until destinations are confirmed */
  document.querySelectorAll('[data-door]').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));

  let lenis=null;
  if(!reduce && window.Lenis){ lenis=new Lenis({lerp:.085,wheelMultiplier:.9,smoothWheel:true}); window.__lenis=lenis; }
  let lastY=-1;
  function loop(t){
    if(lenis){ lenis.raf(t); Y=lenis.animatedScroll; } else Y=scrollY;
    if(Y!==lastY){ lastY=Y; render(); }
    requestAnimationFrame(loop);
  }
  const remeasure=()=>{ measure(); if(lenis) lenis.resize(); lastY=-1; };
  addEventListener('resize',remeasure); addEventListener('load',remeasure);
  if(document.fonts) document.fonts.ready.then(remeasure);
  measure(); Y=scrollY; render();
  requestAnimationFrame(loop);
})();
