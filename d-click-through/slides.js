/* Prototype D: prototype A as a click-through report.
   Each section is a full-screen slide. Each step is a fixed progress value P[section]; going to a
   step tweens that value over time (not scroll), so A's states and motion play out on every click.
   Moving between sections pushes the next one in from the right, like a story. */
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
  function keys(p,list,ease=io){
    if(p<=list[0][0]) return list[0][1];
    for(let i=1;i<list.length;i++){ if(p<=list[i][0]){ const t=ease(seg(p,list[i-1][0],list[i][0])), a=list[i-1][1], b=list[i][1]; return Array.isArray(a)?a.map((v,k)=>lerp(v,b[k],t)):lerp(a,b,t); } }
    return list[list.length-1][1];
  }
  const lin=t=>t;
  const sine=t=>-(Math.cos(Math.PI*t)-1)/2;    // gentle ease-in-out for every timed step

  /* ---------- the deck: sections, the progress value each step lands on, and its tone ---------- */
  const SECTIONS=[
    {id:'hero',     steps:[0,.32,.52,.72,.96]},
    {id:'ch1',      steps:[1]},
    {id:'glance',   steps:[.6]},
    {id:'stats',    steps:[.32,.62,.97]},
    {id:'figures',  steps:[1]},
    {id:'innov',    steps:[.12,.5,.9]},
    {id:'launches', steps:[.04,.37,.7,1]},
    {id:'mapsec',   steps:[1]},
    {id:'ch2',      steps:[1]},
    {id:'research', steps:[.15,1]},
    {id:'endnote',  steps:[1]},
  ];
  const DARK={ch1:1,glance:1,figures:1,innov:1,ch2:1};
  const deck=[]; SECTIONS.forEach((s,si)=>{ s.el=$(s.id); s.steps.forEach((p,k)=>deck.push({si,p,k})); });
  const P={}; SECTIONS.forEach(s=>P[s.id]=0);

  function size(){
    root.style.setProperty('--s',Math.min(innerWidth/1440,innerHeight/800));
    root.style.setProperty('--sc',Math.max(innerWidth/1440,innerHeight/800));
  }

  /* ---------- renderers: A's, reading P instead of scroll ---------- */
  const clip=$('heroClip'), img=$('heroImg'), glyph=$('hGlyph'), yir=$('yir'), heroH=$('heroH'), heroP=$('heroP'), card=$('card'), cue=$('cue');
  const K1=[-393,-657,2225], K2=[-204,-672,2225], K3=[-661,-1214,3111], K4=[-661,-1711,3111], K5=[-661,-2101,3111];
  function octagon(Sz){ const h=Sz/2, c=Sz*.1875, x0=720-h, x1=720+h, y0=400-h, y1=400+h, q=v=>Math.round(v*10)/10;
    return `polygon(${q(x0+c)}px ${q(y0)}px,${q(x1-c)}px ${q(y0)}px,${q(x1)}px ${q(y0+c)}px,${q(x1)}px ${q(y1-c)}px,${q(x1-c)}px ${q(y1)}px,${q(x0+c)}px ${q(y1)}px,${q(x0)}px ${q(y1-c)}px,${q(x0)}px ${q(y0+c)}px)`; }
  function renderHero(p){
    // the octagon grows on one continuous exponential curve (92px → full bleed), no stops at sizes
    css(clip,'clipPath', p<.3 ? octagon(92*Math.pow(1560/92,sine(seg(p,0,.3)))) : 'none');
    op(img,seg(p,.01,.14));
    const r=keys(p,[[.18,K1],[.30,K2],[.34,K2],[.50,K3],[.54,K3],[.70,K4],[.74,K4],[.86,K5]],lin);
    tf(img,r[0],r[1],r[2]/2225);
    op(glyph,1-seg(p,.22,.29));
    op(cue,1-seg(p,0,.04));
    // "Year in Review" fades out in the centre and fades back in at the top, rather than travelling visibly
    const up=p>=.43, o1=seg(p,.27,.32)-seg(p,.35,.41), o2=seg(p,.45,.51)-seg(p,.56,.61);
    op(yir,up?o2:o1); tf(yir,0,up?lerp(-317,-325,out(seg(p,.45,.51))):lerp(0,-8,seg(p,.35,.41)),up?.667:1);
    op(heroH,seg(p,.42,.52)-seg(p,.54,.62)); tf(heroH,0,lerp(24,0,out(seg(p,.42,.52))));
    op(heroP,seg(p,.62,.72)-seg(p,.74,.81)); tf(heroP,0,lerp(18,0,out(seg(p,.62,.72))));
    const cy=keys(p,[[.78,1100],[.96,231]],out);
    tf(card,0,cy-231); css(card,'visibility',cy>=1100?'hidden':'inherit');
  }
  const chEls={ch1:[...$('ch1').querySelectorAll('.art > *')], ch2:[...$('ch2').querySelectorAll('.art > *')]};
  function renderChapter(id,e){ chEls[id].forEach((el,i)=>{ const t=out(seg(e,.1+i*.15,.7+i*.15)); op(el,t); tf(el,0,lerp(40,0,t)); }); }
  const gImg=$('glanceImg'), gTx=$('glanceText');
  function renderGlance(p){
    // the image itself is never re-scaled per frame (that caused shimmer); it drifts on a CSS loop
    op(gTx,seg(p,.15,.55)); tf(gTx,0,lerp(30,0,out(seg(p,.15,.6))));
  }
  const dots=$('dots'), col=$('dotcol');
  for(let i=0;i<100;i++) dots.appendChild(document.createElement('i'));
  for(let i=0;i<10;i++) col.appendChild(document.createElement('i'));
  const dotEls=[...dots.children], colEls=[...col.children];
  const steps=[...document.querySelectorAll('#steps path')], marks=[...document.querySelectorAll('#marks rect')];
  const plate1=$('plate1'), plate2=$('plate2'), cnt0=$('cnt0'), cnt2=$('cnt2'), reachMap=$('reachMap'), stT=[0,1,2].map(i=>$('stT'+i));
  let lit=-1, litCol=-1;
  function renderStats(p){
    const c=seg(p,.04,.30);
    steps.forEach((s,i)=>css(s,'strokeDashoffset',String(r2(1-seg(c*7,i,i+1)))));
    marks.forEach((m,i)=>op(m,seg(c*7,i*2+.6,i*2+1)));
    txt(cnt0,fmt(lerp(1000,3500,io(c)))+'+');
    const a1=sine(seg(p,.34,.48)), a2=sine(seg(p,.64,.78));
    tf(plate1,0,(1-a1)*90,lerp(1.03,1,a1)); op(plate1,a1);
    tf(plate2,0,(1-a2)*90,lerp(1.03,1,a2)); op(plate2,a2);
    const L=Math.round(seg(p,.45,.6)*80), LC=Math.round(seg(p,.58,.62)*5);
    if(L!==lit){ dotEls.forEach((el,i)=>el.classList.toggle('on',i<L)); lit=L; }
    if(LC!==litCol){ colEls.forEach((el,i)=>el.classList.toggle('on',i<LC)); litCol=LC; }
    const m=seg(p,.74,.95);
    txt(cnt2,fmt(200000*out(m))+(m>0?'+':''));
    tf(reachMap,lerp(0,-60,p),lerp(10,-20,p));
    const w=[1-seg(p,.34,.41), seg(p,.41,.48)-seg(p,.64,.71), seg(p,.71,.78)];
    w.forEach((o,i)=>{ op(stT[i],o); tf(stT[i],0,(1-o)*12); });
  }
  const figNums=[...document.querySelectorAll('#figures b')];
  function renderFigures(e){ figNums.forEach((b,i)=>{ const t=out(seg(e,.1+i*.15,.7+i*.1)); txt(b,fmt(+b.dataset.to*t)+b.dataset.suf); op(b.parentNode,lerp(.25,1,seg(e,i*.15,.3+i*.15))); }); }
  const inImgs=[...document.querySelectorAll('#inImg img')], inTexts=[...document.querySelectorAll('#inText > div')], prevImgs=[...document.querySelectorAll('#inPrev img')];
  const inNow=$('inNow'), inNext=$('inNext'), inPrev=$('inPrev'), inPrevText=$('inPrevText');
  const nextLine=["Next: Harvey Tenet, Harvey's first model trained for legal work.","Next: Harvey Graph, connected legal and organizational context."];
  let lastIdx=-1;
  function renderInnov(p){
    const b=[.33,.66];
    const w1=sine(seg(p,b[0]-.1,b[0]+.1)), w2=sine(seg(p,b[1]-.1,b[1]+.1));
    css(inImgs[1],'clipPath','none'); css(inImgs[2],'clipPath','none');
    op(inImgs[1],w1); op(inImgs[2],w2);
    tf(inImgs[0],0,0,lerp(1.04,1,sine(seg(p,0,.2))));
    tf(inImgs[1],0,0,lerp(1.06,1,w1)); tf(inImgs[2],0,0,lerp(1.06,1,w2));
    const o=[1-seg(p,b[0]-.08,b[0]), seg(p,b[0],b[0]+.08)-seg(p,b[1]-.08,b[1]), seg(p,b[1],b[1]+.08)];
    inTexts.forEach((t,i)=>{ op(t,o[i]); tf(t,0,(1-o[i])*14); });
    const idx=p<b[0]?0:p<b[1]?1:2;
    op(inPrev,idx<2?1:1-seg(p,b[1],b[1]+.04));
    if(idx!==lastIdx){
      lastIdx=idx; txt(inNow,'0'+(idx+1)); txt(inNext,idx<2?'0'+(idx+2):'');
      prevImgs.forEach((im,i)=>im.classList.toggle('on',i===Math.min(idx,1))); txt(inPrevText,nextLine[Math.min(idx,1)]);
    }
  }
  const monthsEl=$('months');
  ['Jan','Feb','March','April','May','June','July','Aug','Sept','Oct','Nov','Dec'].forEach((n,i)=>{ const s=document.createElement('span'); s.className='month'; s.style.left=(60+487*i)+'px'; s.textContent=n; monthsEl.appendChild(s); });
  const track=$('track'), axisFill=$('axisFill'), TRACK_END=60+487*11+260;
  function renderLaunches(p){
    const t=io(seg(p,.04,.96)); tf(track,-t*(TRACK_END-1180),0);
    css(axisFill,'transform',`scaleX(${Math.round(lerp(.03,1,t)*1000)/1000})`);
  }
  const mapWrap=$('mapWrap'); let mx=0,my=0,mcx=0,mcy=0;
  addEventListener('mousemove',e=>{ mx=e.clientX/innerWidth-.5; my=e.clientY/innerHeight-.5; },{passive:true});
  function renderMap(){ mcx+=(mx-mcx)*.06; mcy+=(my-mcy)*.06; css(mapWrap,'transform',`translate3d(${r2(-mcx*18)}%,${r2(-mcy*18)}%,0)`); }
  const resImg=$('resImg'), rCard=$('rCard'), resText=$('resText');
  function renderResearch(p){
    // like slide 7: the image is never re-scaled per frame; it drifts on a CSS loop
    const c=sine(seg(p,.2,1)), y=lerp(1000,445,c);
    tf(rCard,0,y-445); op(rCard,seg(p,.2,.55)); css(rCard,'visibility',p<=.2?'hidden':'inherit');
    const e=seg(p,0,.15); op(resText,e); tf(resText,0,lerp(30,0,out(e)));
  }
  const R={hero:renderHero, ch1:p=>renderChapter('ch1',p), glance:renderGlance, stats:renderStats, figures:renderFigures,
           innov:renderInnov, launches:renderLaunches, mapsec:()=>{}, ch2:p=>renderChapter('ch2',p), research:renderResearch, endnote:()=>{}};

  /* ---------- chrome ---------- */
  const segsEl=$('segs'); deck.forEach(()=>segsEl.appendChild(document.createElement('i'))); const segEls=[...segsEl.children];
  const whereN=$('whereN'), whereT=$('whereT'), live=$('live'), btnPrev=$('btnPrev'), btnNext=$('btnNext'), btnPlay=$('btnPlay');
  function renderChrome(fill){
    segEls.forEach((el,i)=>{ const v=String(i<cur?1:i===cur?Math.round(fill*1000)/1000:0); if(el._f!==v){ el._f=v; el.style.setProperty('--f',v); } });
    const s=SECTIONS[deck[cur].si];
    segsEl.classList.toggle('dark', !!DARK[s.id] || (s.id==='hero' && P.hero>.25));
    txt(whereN,String(cur+1).padStart(2,'0')+' / '+deck.length); txt(whereT,s.el.dataset.name);
    btnPrev.disabled=cur===0; btnNext.disabled=cur===deck.length-1;
  }

  /* ---------- navigation ---------- */
  let cur=0, anim=null, playing=false, dwellStart=0;
  const DWELL=5500;
  function show(si,on){ SECTIONS[si].el.classList.toggle('vis',on); }
  function go(to, instant){
    to=clamp(to,0,deck.length-1); if(to===cur && !instant) return;
    finish();
    const from=cur, B=deck[to], secB=SECTIONS[B.si];
    cur=to; dwellStart=0;
    history.replaceState(null,'','#'+(to+1));
    live.textContent=`${secB.el.dataset.name}, ${to+1} of ${deck.length}`;
    if(instant||reduce||from<0){
      SECTIONS.forEach((s,i)=>{ show(i,i===B.si); s.el.style.transform=''; s.el.style.opacity=''; s.el.style.zIndex=''; });
      P[secB.id]=B.p; R[secB.id](B.p); anim=null; return;
    }
    const A=deck[from], secA=SECTIONS[A.si], sameSec=A.si===B.si;
    if(sameSec){
      const p0=P[secB.id];
      const span=Math.abs(B.p-p0);
      anim={type:'step', id:secB.id, p0, p1:B.p, t0:performance.now(), dur:secB.id==='hero'?clamp(span*11000,2200,3600):clamp(span*4200,1500,2600)};
    } else {
      const fwd=to>from;
      // forward: the next section plays in from its start; back: it returns already at its last state
      const p0=fwd ? (B.k===0 ? 0 : secB.steps[B.k-1]) : B.p;
      P[secB.id]=p0;
      SECTIONS.forEach((s,i)=>{ if(i!==A.si && i!==B.si){ show(i,false); s.el.style.transform=''; s.el.style.opacity=''; } });
      show(B.si,true); show(A.si,true);
      secB.el.style.zIndex=2; secA.el.style.zIndex=1;
      anim={type:'push', a:A.si, b:B.si, dir:fwd?1:-1, id:secB.id, p0, p1:B.p, t0:performance.now(), dur:fwd?1250:1000, step:clamp(Math.abs(B.p-p0)*4200,1200,2400)};
    }
  }
  // a click mid-transition completes the running one at once, then starts the new one
  function finish(){
    if(!anim) return;
    if(anim.type==='push'){
      const A=SECTIONS[anim.a].el, B=SECTIONS[anim.b].el;
      show(anim.a,false); [A,B].forEach(el=>{ el.style.transform=''; el.style.opacity=''; el.style.zIndex=''; });
    }
    P[anim.id]=anim.p1; R[anim.id](anim.p1); anim=null;
  }
  const next=()=>go(cur+1), prev=()=>go(cur-1);

  function frame(now){
    let fill=1;
    if(anim){
      const t=now-anim.t0;
      if(anim.type==='step'){
        const k=sine(clamp(t/anim.dur)); P[anim.id]=lerp(anim.p0,anim.p1,k); R[anim.id](P[anim.id]);
        if(t>=anim.dur) anim=null;
      } else {
        const k=sine(clamp(t/anim.dur)), A=SECTIONS[anim.a].el, B=SECTIONS[anim.b].el, d=anim.dir;
        B.style.transform=`translate3d(${r2((1-k)*100*d)}%,0,0)`;
        A.style.transform=`translate3d(${r2(-k*28*d)}%,0,0)`; A.style.opacity=String(r2(1-k*.6));
        const ks=sine(clamp((t-anim.dur*.4)/anim.step)); P[anim.id]=lerp(anim.p0,anim.p1,ks); R[anim.id](P[anim.id]);
        if(t>=anim.dur){ show(anim.a,false); A.style.transform=''; A.style.opacity=''; A.style.zIndex=''; B.style.zIndex=''; B.style.transform=''; }
        if(t>=anim.dur*.4+anim.step && t>=anim.dur) anim=null;
      }
    } else if(playing){
      if(!dwellStart) dwellStart=now;
      fill=clamp((now-dwellStart)/DWELL);
      if(fill>=1){ if(cur<deck.length-1) next(); else setPlay(false); }
    }
    if(SECTIONS[deck[cur].si].id==='mapsec') renderMap();
    renderChrome(playing && !anim ? fill : 1);
    requestAnimationFrame(frame);
  }
  function setPlay(on){ playing=on; dwellStart=0; btnPlay.setAttribute('aria-pressed',String(on)); }

  /* ---------- input: click/tap zones, buttons, keys, swipe, one wheel gesture = one step ---------- */
  $('zonePrev').addEventListener('click',()=>{ setPlay(false); prev(); });
  $('zoneNext').addEventListener('click',()=>{ setPlay(false); next(); });
  btnPrev.addEventListener('click',()=>{ setPlay(false); prev(); });
  btnNext.addEventListener('click',()=>{ setPlay(false); next(); });
  btnPlay.addEventListener('click',()=>setPlay(!playing));
  // restart: every section back to its opening state, then the first slide
  $('btnRestart').addEventListener('click',()=>{ setPlay(false); finish(); SECTIONS.forEach(s=>{ P[s.id]=0; R[s.id](0); }); go(0,true); });
  addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key;
    if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(k)){ e.preventDefault(); setPlay(false); next(); }
    else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(k)){ e.preventDefault(); setPlay(false); prev(); }
    else if(k==='Home'){ e.preventDefault(); go(0); } else if(k==='End'){ e.preventDefault(); go(deck.length-1); }
    else if(k==='p'||k==='P'){ setPlay(!playing); }
  });
  let tx=0,ty=0;
  addEventListener('touchstart',e=>{ tx=e.touches[0].clientX; ty=e.touches[0].clientY; },{passive:true});
  addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ setPlay(false); dx<0?next():prev(); } },{passive:true});
  let wheelLock=0, acc=0;
  addEventListener('wheel',e=>{
    e.preventDefault(); const now=performance.now();
    if(now<wheelLock){ wheelLock=now+260; return; }       // still the same gesture (trackpad momentum)
    acc+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(Math.abs(acc)>30){ setPlay(false); acc>0?next():prev(); acc=0; wheelLock=now+700; }
  },{passive:false});

  /* ---------- start ---------- */
  addEventListener('resize',size); size();
  SECTIONS.forEach(s=>{ R[s.id](0); });
  const h=parseInt(location.hash.slice(1),10);
  const start=h>=1&&h<=deck.length?h-1:0;
  // land on the requested step with every section before it settled
  SECTIONS.forEach((s,i)=>{ if(i<deck[start].si){ P[s.id]=s.steps[s.steps.length-1]; R[s.id](P[s.id]); } });
  cur=-1; go(start,true);
  addEventListener('hashchange',()=>{ const n=parseInt(location.hash.slice(1),10); if(n>=1&&n<=deck.length&&n-1!==cur){ setPlay(false); go(n-1); } });
  requestAnimationFrame(frame);
})();
