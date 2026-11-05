/* Scroll engine for the Year in Review prototype.
   One rAF loop reads a smoothed scroll value (Lenis), computes every section's progress from
   positions measured once per resize, and writes only the styles whose values changed. */
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

  // style writes are skipped when the value is unchanged
  function css(el,prop,val){ const k='_'+prop; if(el[k]!==val){ el[k]=val; el.style[prop]=val; } }
  function txt(el,val){ if(el._txt!==val){ el._txt=val; el.textContent=val; } }
  const tf=(el,x,y,s)=>css(el,'transform',`translate3d(${r2(x)}px,${r2(y)}px,0)`+(s!=null&&s!==1?` scale(${Math.round(s*10000)/10000})`:''));
  const op=(el,v)=>css(el,'opacity',String(Math.round(clamp(v)*1000)/1000));

  /* ---------- layout, measured once per resize ---------- */
  const ids=['hero','ch1','glance','stats','figures','innov','launches','mapsec','ch2','research','endnote'];
  const S={}; ids.forEach(id=>S[id]={el:$(id),top:0,h:0});
  let VH=innerHeight, Y=0;
  function measure(){
    VH=innerHeight;
    root.style.setProperty('--s',Math.min(innerWidth/1440,innerHeight/800));
    root.style.setProperty('--sc',Math.max(innerWidth/1440,innerHeight/800));
    ids.forEach(id=>{ const s=S[id]; s.top=s.el.offsetTop; s.h=s.el.offsetHeight; });
  }
  const pin=s=>clamp((Y-s.top)/(s.h-VH));            // 0 when it pins, 1 when it releases
  const enter=s=>clamp(1-(s.top-Y)/VH);               // 0 when its top meets the fold, 1 at the top
  const pass=s=>clamp((Y+VH-s.top)/(s.h+VH));         // whole pass, entering to leaving
  const near=s=>Y+VH>s.top-VH*.25 && Y<s.top+s.h+VH*.25;

  /* ---------- hero: keyframes lifted from storyboard frames 1–8 ---------- */
  const clip=$('heroClip'), img=$('heroImg'), glyph=$('hGlyph'), yir=$('yir'), heroH=$('heroH'), heroP=$('heroP'), card=$('card'), cue=$('cue');
  const K1=[-393,-657,2225], K2=[-204,-672,2225], K3=[-661,-1214,3111], K4=[-661,-1711,3111], K5=[-661,-2101,3111];
  function keys(p,list){
    if(p<=list[0][0]) return list[0][1];
    for(let i=1;i<list.length;i++){ if(p<=list[i][0]){ const t=io(seg(p,list[i-1][0],list[i][0])), a=list[i-1][1], b=list[i][1]; return Array.isArray(a)?a.map((v,k)=>lerp(v,b[k],t)):lerp(a,b,t); } }
    return list[list.length-1][1];
  }
  function octagon(Sz){ const h=Sz/2, c=Sz*.1875, x0=720-h, x1=720+h, y0=400-h, y1=400+h, q=v=>Math.round(v*10)/10;
    return `polygon(${q(x0+c)}px ${q(y0)}px,${q(x1-c)}px ${q(y0)}px,${q(x1)}px ${q(y0+c)}px,${q(x1)}px ${q(y1-c)}px,${q(x1-c)}px ${q(y1)}px,${q(x0+c)}px ${q(y1)}px,${q(x0)}px ${q(y1-c)}px,${q(x0)}px ${q(y0+c)}px)`; }
  function renderHero(){
    const p=pin(S.hero);
    css(clip,'clipPath', p<.29 ? octagon(keys(p,[[.03,92],[.12,266],[.21,690],[.29,1560]])) : 'none');
    op(img,seg(p,.03,.11));
    const r=keys(p,[[.21,K1],[.30,K2],[.36,K2],[.50,K3],[.58,K3],[.70,K4],[.76,K4],[.86,K5]]);
    tf(img,r[0],r[1],r[2]/2225);
    op(glyph,1-seg(p,.24,.29));
    op(cue,1-seg(p,0,.03));
    const m=io(seg(p,.38,.48));
    op(yir,seg(p,.27,.32)-seg(p,.56,.61)); tf(yir,0,lerp(0,-325,m),lerp(1,.667,m));
    op(heroH,seg(p,.44,.50)-seg(p,.56,.61)); tf(heroH,0,lerp(24,0,out(seg(p,.44,.52))));
    op(heroP,seg(p,.64,.69)-seg(p,.76,.80)); tf(heroP,0,lerp(18,0,out(seg(p,.64,.71))));
    const cy=keys(p,[[.78,1100],[.88,521],[.96,231]]);
    tf(card,0,cy-231); css(card,'visibility',cy>=1100?'hidden':'visible');
  }

  /* ---------- chapter openers ---------- */
  const chapters=['ch1','ch2'].map(id=>({s:S[id],els:[...S[id].el.querySelectorAll('.art > *')]}));
  function renderChapters(){
    chapters.forEach(c=>{ if(!near(c.s)) return; const e=enter(c.s);
      c.els.forEach((el,i)=>{ const t=out(seg(e,.35+i*.08,.85+i*.05)); op(el,t); tf(el,0,lerp(40,0,t)); }); });
  }

  /* ---------- glance: subtle drift, copy fades up ---------- */
  const gImg=$('glanceImg'), gTx=$('glanceText');
  function renderGlance(){
    const s=S.glance, t=pass(s), p=pin(s);
    css(gImg,'transform',`translate3d(${r2(lerp(-2,2,t))}%,${r2(lerp(8,-8,t))}%,0) scale(${r2(lerp(1.16,1.04,t))})`);
    op(gTx,seg(p,.05,.45)); tf(gTx,0,lerp(30,0,out(seg(p,.05,.5))));
  }

  /* ---------- stats ---------- */
  const dots=$('dots'), col=$('dotcol');
  for(let i=0;i<100;i++) dots.appendChild(document.createElement('i'));
  for(let i=0;i<10;i++) col.appendChild(document.createElement('i'));
  const dotEls=[...dots.children], colEls=[...col.children];
  const steps=[...document.querySelectorAll('#steps path')], marks=[...document.querySelectorAll('#marks rect')];
  const plate1=$('plate1'), plate2=$('plate2'), cnt0=$('cnt0'), cnt2=$('cnt2'), reachMap=$('reachMap'), stT=[0,1,2].map(i=>$('stT'+i));
  let lit=-1, litCol=-1;
  function renderStats(){
    const p=pin(S.stats), c=seg(p,.04,.30);
    steps.forEach((s,i)=>css(s,'strokeDashoffset',String(r2(1-seg(c*7,i,i+1)))));
    marks.forEach((m,i)=>op(m,seg(c*7,i*2+.6,i*2+1)));
    txt(cnt0,fmt(lerp(1000,3500,io(c)))+'+');
    tf(plate1,0,(1-io(seg(p,.34,.43)))*680);
    tf(plate2,0,(1-io(seg(p,.64,.73)))*680);
    const L=Math.round(seg(p,.45,.6)*80), LC=Math.round(seg(p,.58,.62)*5);
    if(L!==lit){ dotEls.forEach((el,i)=>el.classList.toggle('on',i<L)); lit=L; }
    if(LC!==litCol){ colEls.forEach((el,i)=>el.classList.toggle('on',i<LC)); litCol=LC; }
    const m=seg(p,.74,.95);
    txt(cnt2,fmt(200000*out(m))+(m>0?'+':''));
    tf(reachMap,lerp(0,-60,p),lerp(10,-20,p));
    const w=[1-seg(p,.36,.40), seg(p,.38,.42)-seg(p,.66,.70), seg(p,.68,.72)];
    w.forEach((o,i)=>{ op(stT[i],o); tf(stT[i],0,(1-o)*12); });
  }

  /* ---------- year in figures ---------- */
  const figNums=[...document.querySelectorAll('#figures b')];
  function renderFigures(){
    const e=enter(S.figures);
    figNums.forEach((b,i)=>{ const t=out(seg(e,.35+i*.1,.8+i*.08)); txt(b,fmt(+b.dataset.to*t)+b.dataset.suf); op(b.parentNode,lerp(.25,1,seg(e,.2+i*.1,.5+i*.1))); });
  }

  /* ---------- innovation ---------- */
  const inImgs=[...document.querySelectorAll('#inImg img')], inTexts=[...document.querySelectorAll('#inText > div')], prevImgs=[...document.querySelectorAll('#inPrev img')];
  const inNow=$('inNow'), inNext=$('inNext'), inPrev=$('inPrev'), inPrevText=$('inPrevText');
  const nextLine=["Next: Harvey Tenet, Harvey's first model trained for legal work.","Next: Harvey Graph, connected legal and organizational context."];
  let lastIdx=-1;
  function renderInnov(){
    const p=pin(S.innov), b=[.33,.66];
    const w1=io(seg(p,b[0]-.07,b[0]+.07)), w2=io(seg(p,b[1]-.07,b[1]+.07));
    css(inImgs[1],'clipPath',`inset(${r2((1-w1)*100)}% 0 0 0)`); css(inImgs[2],'clipPath',`inset(${r2((1-w2)*100)}% 0 0 0)`);
    inImgs.forEach((im,i)=>{ const a=i?b[i-1]-.07:0; tf(im,0,0,lerp(1.06,1,seg(p,a,a+.25))); });
    const o=[1-seg(p,b[0]-.04,b[0]), seg(p,b[0],b[0]+.04)-seg(p,b[1]-.04,b[1]), seg(p,b[1],b[1]+.04)];
    inTexts.forEach((t,i)=>{ op(t,o[i]); tf(t,0,(1-o[i])*14); });
    const idx=p<b[0]?0:p<b[1]?1:2;
    op(inPrev,idx<2?1:1-seg(p,b[1],b[1]+.04));
    if(idx!==lastIdx){
      lastIdx=idx; txt(inNow,'0'+(idx+1)); txt(inNext,idx<2?'0'+(idx+2):'');
      prevImgs.forEach((im,i)=>im.classList.toggle('on',i===Math.min(idx,1))); txt(inPrevText,nextLine[Math.min(idx,1)]);
    }
  }

  /* ---------- timeline ---------- */
  const monthsEl=$('months');
  ['Jan','Feb','March','April','May','June','July','Aug','Sept','Oct','Nov','Dec'].forEach((n,i)=>{ const s=document.createElement('span'); s.className='month'; s.style.left=(60+487*i)+'px'; s.textContent=n; monthsEl.appendChild(s); });
  const track=$('track'), axisFill=$('axisFill'), TRACK_END=60+487*11+260;
  function renderLaunches(){
    const t=io(seg(pin(S.launches),.04,.96));
    tf(track,-t*(TRACK_END-1180),0);
    css(axisFill,'transform',`scaleX(${Math.round(lerp(.03,1,t)*1000)/1000})`);
  }

  /* ---------- map: eased cursor follow ---------- */
  const mapWrap=$('mapWrap'); let mx=0,my=0,cx=0,cy=0;
  addEventListener('mousemove',e=>{ mx=e.clientX/innerWidth-.5; my=e.clientY/innerHeight-.5; },{passive:true});
  function renderMap(){
    cx+=(mx-cx)*.08; cy+=(my-cy)*.08;
    css(mapWrap,'transform',`translate3d(${r2(-cx*3)}%,${r2(-cy*3)}%,0)`);
  }

  /* ---------- research ---------- */
  const resImg=$('resImg'), rCard=$('rCard'), resText=$('resText');
  function renderResearch(){
    const s=S.research, p=pin(s), e=enter(s);
    const ps=pass(s); css(resImg,'transform',`translate3d(${r2(lerp(2,-2,ps))}%,${r2(lerp(8,-8,ps))}%,0) scale(${r2(lerp(1.14,1.03,ps))})`);
    const y=keys(p,[[.12,1100],[.42,625],[.55,625],[.82,445]]);
    tf(rCard,0,y-445); css(rCard,'visibility',y>=1100?'hidden':'visible');
    op(resText,seg(e,.5,1)); tf(resText,0,lerp(30,0,out(seg(e,.5,1))));
  }

  /* ---------- review chrome ---------- */
  const bar=$('bar'), whereN=$('whereN'), whereT=$('whereT');
  function renderChrome(){
    const max=root.scrollHeight-VH; css(bar,'transform',`scaleX(${max>0?Math.round(Y/max*1000)/1000:0})`);
    let cur=0; ids.forEach((id,i)=>{ if(S[id].top<=Y+VH*.5) cur=i; });
    txt(whereN,String(cur+1).padStart(2,'0')+' / '+ids.length); txt(whereT,S[ids[cur]].el.dataset.name);
  }

  const parts=[['hero',renderHero],['glance',renderGlance],['stats',renderStats],['figures',renderFigures],['innov',renderInnov],['launches',renderLaunches],['research',renderResearch]];
  function render(){
    parts.forEach(([id,fn])=>{ if(near(S[id])) fn(); });
    renderChapters(); renderChrome();
  }

  /* ---------- smooth scrolling ---------- */
  let lenis=null;
  if(!reduce && window.Lenis){ lenis=new Lenis({lerp:.085,wheelMultiplier:.9,smoothWheel:true,syncTouch:false}); window.__lenis=lenis; }
  let lastY=-1;
  function loop(t){
    if(lenis){ lenis.raf(t); Y=lenis.animatedScroll; } else Y=scrollY;
    if(Y!==lastY){ lastY=Y; render(); }
    if(near(S.mapsec)) renderMap();
    requestAnimationFrame(loop);
  }
  addEventListener('resize',()=>{ measure(); lastY=-1; });
  addEventListener('load',()=>{ measure(); lastY=-1; });
  if(document.fonts) document.fonts.ready.then(()=>{ measure(); lastY=-1; });
  measure(); Y=scrollY; render();
  requestAnimationFrame(loop);
})();
