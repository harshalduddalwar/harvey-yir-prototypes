/* V4: the screen is the book.
   Scroll position is read as p, a count of turns: 0 → 1 swings the hardcover across the screen on the centre
   line; from there each whole number is a spread and the fraction between is a page in mid-turn. The turning
   page is a chain of thin strips, so it bends like paper, lit along its curve, casting a shadow on the page
   beneath. Pages are fitted to the full height and run out to the screen edge in their own paper colour. */
(()=>{
  const $=id=>document.getElementById(id);
  const runway=$('runway'), pl=$('pl'), pr=$('pr'), cb=$('cb'), leaf=$('leaf'), cover=$('cover'),
        castL=$('castL'), castR=$('castR'), land=$('land'), thick=$('thick'), shF=$('shF'), shB=$('shB');
  const PG=window.PAGES||{}, N=49, NS=24, CURL=72, RAD=Math.PI/180;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), r2=v=>Math.round(v*100)/100;
  const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const key=i=>String(i).padStart(2,'0');
  const WT=Array.from({length:NS},(_,i)=>i+.6), WS=WT.reduce((a,b)=>a+b,0);
  let W,H,HW,IW,IH,OX,OY,SW, strips=[], leafN=-1, P=0, Pt=0, mode='';

  // the geometry of one page inside its half of the screen
  function layout(){
    W=innerWidth; H=innerHeight; HW=W/2;
    IW=Math.min(HW,H*.7); IH=IW/.7; OX=(HW-IW)/2; OY=(H-IH)/2; SW=HW/NS;
    runway.style.height=(H+N*H)+'px';
    buildLeaf(); leafN=-1; mode=''; render();
  }
  const fill=(n,side)=>{ const c=PG[key(n)]||{}; return side==='l'?`linear-gradient(90deg,${c.lo||'#f4f3ed'} 50%,${c.li||'#f4f3ed'} 50%)`:`linear-gradient(90deg,${c.ri||'#f4f3ed'} 50%,${c.ro||'#f4f3ed'} 50%)`; };
  function setPage(el,n,side){
    if(el.dataset.p===n+side) return; el.dataset.p=n+side;
    el.style.backgroundImage=`url(spreads/${key(n)}-${side}.webp),${fill(n,side)}`;
    el.style.backgroundSize=`${r2(IW)}px ${r2(IH)}px,100% 100%`;
    el.style.backgroundPosition=`${r2(OX)}px ${r2(OY)}px,0 0`;
  }

  // the leaf: strips hinged edge to edge, each carrying a slice of the page front and back
  function buildLeaf(){
    leaf.replaceChildren(); strips=[]; let parent=leaf;
    for(let i=0;i<NS;i++){
      const st=document.createElement('div'); st.className='strip';
      st.style.width=r2(SW+.6)+'px'; st.style.left=(i?r2(SW):0)+'px';
      const mk=isBack=>{ const f=document.createElement('div'); f.className='sface'+(isBack?' back':''); const sh=document.createElement('i'); f.appendChild(sh); st.appendChild(f); return {f,sh,innerLeft:!isBack}; };
      const F=mk(false), B=mk(true); parent.appendChild(st); strips.push({st,F,B}); parent=st;
    }
  }
  function dressLeaf(n){
    if(leafN===n) return; leafN=n;
    strips.forEach((s,i)=>{
      [[s.F,n,'r'],[s.B,n+1,'l']].forEach(([face,pn,side])=>{
        const x=face.innerLeft?i*SW:HW-(i+1)*SW;
        face.f.style.backgroundImage=`var(--paper),url(spreads/${key(pn)}-${side}.webp),${fill(pn,side)}`;
        face.f.style.backgroundSize=`512px 512px,${r2(IW)}px ${r2(IH)}px,${r2(HW)}px 100%`;
        face.f.style.backgroundPosition=`${r2(-x)}px 0,${r2(OX-x)}px ${r2(OY)}px,${r2(-x)}px 0`;
      });
    });
  }
  function bend(f){
    const a=f*180, k=Math.sin(a*RAD), c=k*CURL, base=a-c/2;
    leaf.style.transform=`rotateY(${r2(-base)}deg)`;
    let phi=base, X=0; const sh=[];
    const at=p=>{ const cs=Math.cos(p*RAD); return {f:clamp((1-cs)*.2), b:clamp((1+cs)*.2)}; };   // gentle: at this size the page is the whole screen
    sh.push(at(phi));
    strips.forEach((s,i)=>{
      const d=c*WT[i]/WS; s.st.style.transform=i?`rotateY(${r2(-d)}deg)`:'none';
      if(i) phi+=d; X+=SW*Math.cos(phi*RAD); sh.push(at(phi+(i+1<NS?c*WT[i+1]/WS:0)));
    });
    strips.forEach((s,i)=>{
      const u=sh[i], v=sh[i+1], cr=i===0?.1*k:0;
      const g=(p,q,inl)=>`linear-gradient(90deg,rgba(15,14,13,${r2(inl?p+cr:q)}),rgba(15,14,13,${r2(inl?q:p+cr)}))`;
      s.F.sh.style.background=g(u.f,v.f,true); s.B.sh.style.background=g(u.b,v.b,false);
    });
    cast(X,k);
  }
  // the shadow a lifted page or board throws on what lies beneath it
  function cast(X,k){
    if(X>0){ castR.style.background=`linear-gradient(90deg,rgba(15,14,13,${r2(.18*k)}) 0,rgba(15,14,13,${r2(.08*k)}) ${r2(Math.max(0,X-60))}px,rgba(15,14,13,${r2(.14*k)}) ${r2(X)}px,rgba(15,14,13,0) ${r2(X+140*k+10)}px)`; castR.style.opacity=1; castL.style.opacity=0; }
    else { const e=-X; castL.style.background=`linear-gradient(270deg,rgba(15,14,13,${r2(.17*k)}) 0,rgba(15,14,13,${r2(.07*k)}) ${r2(Math.max(0,e-60))}px,rgba(15,14,13,${r2(.13*k)}) ${r2(e)}px,rgba(15,14,13,0) ${r2(e+120*k+10)}px)`; castL.style.opacity=1; castR.style.opacity=0; }
  }

  function render(){
    if(P<1){
      // the cover: one rigid board swinging over on the centre line
      if(mode!=='cover'){ mode='cover'; cover.style.display=''; land.style.display=''; leaf.style.display='none'; setPage(pr,1,'r'); setPage(cb,1,'l'); }
      const f=io(clamp(P)), a=f*180, k=Math.sin(a*RAD);
      cover.style.transform=`rotateY(${r2(-a)}deg)`;
      shF.style.opacity=a<90?r2(k*.55):0; shB.style.opacity=a>90?r2(k*.45):0;
      thick.style.opacity=r2(1-clamp(P*4));
      if(P>0.001) cast(HW*Math.cos(a*RAD),k*.9); else castL.style.opacity=castR.style.opacity=0;
      return;
    }
    if(mode!=='book'){ mode='book'; cover.style.display='none'; land.style.display='none'; }
    let n=Math.floor(P), f=P-n; if(n>=N){ n=N; f=0; }
    setPage(pl,n,'l');
    if(f>.0005){ setPage(pr,n+1,'r'); dressLeaf(n); leaf.style.display=''; bend(f); }
    else { setPage(pr,n,'r'); leaf.style.display='none'; castL.style.opacity=castR.style.opacity=0; }
  }

  // scroll → p, eased toward the reading so it feels like paper rather than a scrubber
  const target=()=>clamp(scrollY/H,0,N);
  let raf=0;
  (function loop(){
    Pt=target(); const d=Pt-P;
    if(Math.abs(d)>.0004){ P+=reduce?d:d*.14; render(); } else if(d){ P=Pt; render(); }
    raf=requestAnimationFrame(loop);
  })();

  // come to rest on a spread: after the scroll stops, glide to the nearest whole turn
  let idle=0, gliding=0;
  function glideTo(p){
    cancelAnimationFrame(gliding); const y0=scrollY, y1=Math.round(clamp(p,0,N)*H), d=y1-y0; if(!d) return;
    const dur=reduce?0:Math.min(900,300+Math.abs(d)/H*500), t0=performance.now();
    (function st(now){ const k=dur?clamp((now-t0)/dur):1; scrollTo(0,y0+d*io(k)); if(k<1) gliding=requestAnimationFrame(st); else gliding=0; })(performance.now());
  }
  addEventListener('scroll',()=>{ if(gliding) return; clearTimeout(idle); idle=setTimeout(()=>{ const p=target(); if(Math.abs(p-Math.round(p))>.002) glideTo(Math.round(p)); },200); },{passive:true});
  ['wheel','touchstart'].forEach(ev=>addEventListener(ev,()=>{ if(gliding){ cancelAnimationFrame(gliding); gliding=0; } },{passive:true}));
  addEventListener('keydown',e=>{
    if(typeof sheetOpen==='function'&&sheetOpen()) return;
    const p=Math.round(target());
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){ e.preventDefault(); glideTo(p+1); }
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){ e.preventDefault(); glideTo(p-1); }
    else if(e.key==='Home'){ e.preventDefault(); glideTo(0); } else if(e.key==='End'){ e.preventDefault(); glideTo(N); }
  });


  /* ---------- home, index and overview ---------- */
  const CH=[[1,'—','Contents','Front matter','03'],[2,'—','A New Standard for Legal Work','Introduction','05'],
    [3,'I','The Year Legal Work Went Agentic','2026 at a Glance','07'],[11,'II','Advancing the Frontier of Legal Intelligence','Research at Harvey','29'],
    [18,'III','Our Connected Platform for Complex Legal Work','The Harvey Platform','45'],[25,'IV','Redefining What’s Possible in Legal Work','Customers','63'],
    [33,'V','Turning AI Into Value the Business Can See','Beyond the Platform','81'],[39,'VI','Shaping the Next Generation of Lawyers','Harvey Law Schools','93'],
    [44,'VII','Putting Responsible Innovation Into Practice','Responsible Business','103'],[48,'VIII','Expanding What Professionals Can Achieve','Looking Ahead','111']];
  const chOf=n=>CH.filter(c=>c[0]<=n).pop()||CH[0];
  const stageEl=document.getElementById('stage'), idx=$('index'), over=$('over'), bI=$('navIndex'), bO=$('navOver');
  // a jump is a quick fade, not a flurry of forty page turns
  function jumpTo(n){
    cancelAnimationFrame(gliding); gliding=0; clearTimeout(idle);
    stageEl.style.transition='opacity .28s ease'; stageEl.style.opacity=0;
    setTimeout(()=>{ scrollTo(0,n*H); P=Pt=n; mode=''; render(); requestAnimationFrame(()=>{ stageEl.style.opacity=1; }); },290);
  }
  function show(sheet,on){
    [[idx,bI],[over,bO]].forEach(([s,b])=>{ const v=s===sheet&&on; s.classList.toggle('on',v); b.setAttribute('aria-expanded',v); });
    if(on) markCurrent();
  }
  function markCurrent(){
    const n=Math.round(clamp(target(),0,N)), c=chOf(Math.max(1,n));
    $('toc').querySelectorAll('li').forEach(li=>li.classList.toggle('cur',+li.dataset.n===c[0]&&n>=1));
    $('grid').querySelectorAll('.tile').forEach(t=>t.classList.toggle('cur',+t.dataset.n===n));
    const cur=$('grid').querySelector('.tile.cur'); if(cur&&over.classList.contains('on')) cur.scrollIntoView({block:'center'});
  }
  CH.forEach(([n,num,title,label,page])=>{
    const li=document.createElement('li'); li.dataset.n=n;
    li.innerHTML=`<button><i>${num}</i><b></b><em></em><s>p.&thinsp;${page}</s></button>`;
    li.querySelector('b').textContent=title; li.querySelector('em').textContent=label;
    li.querySelector('button').addEventListener('click',()=>{ show(null,false); jumpTo(n); });
    $('toc').appendChild(li);
  });
  for(let n=1;n<=N;n++){
    const c=chOf(n), t=document.createElement('button'); t.className='tile'; t.dataset.n=n;
    t.innerHTML=`<div class="tv"><img src="spreads/${key(n)}-l.webp" alt="" loading="lazy"><img src="spreads/${key(n)}-r.webp" alt="" loading="lazy"></div><span><b>${c[1]==='—'?'':c[1]}</b>${c[3]}</span>`;
    t.addEventListener('click',()=>{ show(null,false); jumpTo(n); });
    $('grid').appendChild(t);
  }
  $('navHome').addEventListener('click',()=>{ show(null,false); jumpTo(0); });
  bI.addEventListener('click',()=>show(idx,!idx.classList.contains('on')));
  bO.addEventListener('click',()=>show(over,!over.classList.contains('on')));
  document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>show(null,false)));
  addEventListener('keydown',e=>{ if(e.key==='Escape') show(null,false); });
  const sheetOpen=()=>idx.classList.contains('on')||over.classList.contains('on');
  addEventListener('resize',layout);
  layout();
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  scrollTo(0,0);

  // arrival: the monogram alone in the middle of the screen, wordmark beneath; then it slides into the left
  // half as the closed book slides in from the right
  const b=document.body, lock=document.querySelector('.lock');
  // keep the black H itself on the vertical centre of the screen (the wordmark hangs beneath it)
  function centreH(){ const t=lock.style.transition; lock.style.transition='none'; lock.style.setProperty('--iy','0px'); const r=lock.querySelector('.mh').getBoundingClientRect(); lock.style.setProperty('--iy',(innerHeight/2-(r.top+r.height/2)).toFixed(1)+'px'); void lock.offsetWidth; lock.style.transition=t; }
  addEventListener('resize',centreH);
  if(reduce) centreH();
  let timers=[], done=false;
  function finish(){
    if(done) return; done=true; timers.forEach(clearTimeout);
    b.classList.add('on-a','on-f'); b.classList.remove('hold'); lock.style.setProperty('--ix','0px');
    ['wheel','touchstart','keydown','pointerdown'].forEach(ev=>removeEventListener(ev,skip,true));
  }
  function skip(){ if(done) return; lock.style.transition='none'; finish(); requestAnimationFrame(()=>{ lock.style.transition=''; }); }
  if(reduce){ finish(); }
  else {
    ['wheel','touchstart','keydown','pointerdown'].forEach(ev=>addEventListener(ev,skip,{capture:true,passive:true}));
    lock.style.transition='none'; lock.style.setProperty('--ix',(innerWidth/4).toFixed(1)+'px'); centreH(); void lock.offsetWidth; lock.style.transition='';
    (document.fonts?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]):Promise.resolve()).then(()=>{
      const at=(fn,ms)=>timers.push(setTimeout(fn,ms));
      at(()=>b.classList.add('on-a'),250);
      at(()=>b.classList.add('on-f'),1250);
      at(()=>{ lock.style.setProperty('--ix','0px'); b.classList.remove('hold'); },3300);
      at(finish,5300);
    });
  }
})();
