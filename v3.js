/* V3: one continuous read. Sheets stick once their foot reaches the bottom of the screen, so the next
   chapter slides up over the last; the tray lists the next chapters and gives each one up as it arrives. */
(()=>{
  const $=id=>document.getElementById(id);
  const root=document.documentElement, sheets=[...document.querySelectorAll('.sheet')];
  const tray=$('tray'), rows=[...tray.querySelectorAll('.tr button')];
  const BAR=0, SHOW=5;
  let statics=[], open=false;
  const chap=$('chap'), shade=$('shade');
  function setOpen(v){ open=v; tray.classList.toggle('all',v); shade.classList.toggle('on',v); chap.setAttribute('aria-expanded',v); chap.querySelector('span').textContent=v?'Close':'Index'; update(); if(v) requestAnimationFrame(update); }
  chap.addEventListener('click',()=>setOpen(!open));
  $('hcell').addEventListener('click',()=>{ if(open) setOpen(false); travel(0); });
  shade.addEventListener('click',()=>setOpen(false));
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&open) setOpen(false); });

  function layout(){
    const avail=innerHeight-BAR, narrow=innerWidth<=860;
    statics=[]; let y=0;
    sheets.forEach(s=>{ statics.push(y); y+=s.offsetHeight; s.style.setProperty('--stick',narrow?'auto':(BAR+Math.min(0,avail-s.offsetHeight))+'px'); });
    update();
  }

  const pad=n=>(n<10?'0':'')+n.toFixed(2);
  function update(){
    const sy=scrollY, max=root.scrollHeight-innerHeight;
    // the sheet you are in: the last one whose top has reached the top of the screen
    let cur=0; sheets.forEach((s,i)=>{ if(statics[i]-BAR<=sy+1) cur=i; });
    document.body.classList.toggle('past',sy>(statics[1]||innerHeight)*.5);   // past the cover: the H takes its place in the tray
    // the tray: the next few chapters that have not yet come up from below
    let shown=0;
    rows.forEach(r=>{
      const i=+r.dataset.i, arrived=statics[i]-sy<innerHeight-SHOW*33;
      const show=open||(i>0&&!arrived&&shown<SHOW); if(show&&!open) shown++;
      r.classList.toggle('gone',!show); r.classList.toggle('cur',open&&i===cur);
    });
    root.style.setProperty('--trayh',Math.max(33,open?tray.offsetHeight:shown*33)+'px');
  }

    // travel to a chapter on an eased glide (long jumps stay brisk; reduced motion jumps straight there)
  let glideRaf=0;
  function travel(y){
    cancelAnimationFrame(glideRaf);
    const y0=scrollY, d=y-y0, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce||!d){ scrollTo(0,y); return; }
    const dur=Math.min(1400,500+Math.abs(d)*.05), t0=performance.now(), e=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    (function st(now){ const k=Math.min(1,(now-t0)/dur); scrollTo(0,y0+d*e(k)); if(k<1) glideRaf=requestAnimationFrame(st); })(performance.now());
  }
  addEventListener('wheel',()=>cancelAnimationFrame(glideRaf),{passive:true});
  addEventListener('touchstart',()=>cancelAnimationFrame(glideRaf),{passive:true});
  rows.forEach(r=>r.addEventListener('click',()=>{ const i=+r.dataset.i; if(open) setOpen(false); travel(statics[i]); }));

  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  document.querySelectorAll('.rv').forEach(el=>io.observe(el));
  const so=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('seen'); }),{threshold:.25});
  sheets.forEach(s=>so.observe(s));

  let raf=0; addEventListener('scroll',()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; update(); }); },{passive:true});
  addEventListener('resize',layout);
  addEventListener('load',layout);
  document.fonts&&document.fonts.ready.then(layout);
  layout();
})();
