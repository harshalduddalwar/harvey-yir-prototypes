/* V5 markup: a redline pen and a tear-off clipping.
   Redline: a felt-tip pen rides the pointer; drag to ink the page. A near-level stroke is ruled into a clean
   strike-through, the way a lawyer strikes a clause. Ink turns with the paper and is gone on reload.
   Tear off: drag a box over a passage; it rips out of the page and lands on a share sheet as a clipping,
   with a link back to that exact passage, a copy of the image and a PNG. */
(function(){
  const Y=window.YIR; if(!Y) return;
  const $=id=>document.getElementById(id), body=document.body, root=document.documentElement;
  const PW=560, PH=800, K=1008/560;   // page units; the page images are 1.8× that
  const RED='#C8211A';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const key=i=>String(i).padStart(2,'0');
  const f1=v=>Math.round(v*10)/10;

  /* ---------- stored ink ---------- */
  // ink lasts only as long as the page is open: a reload starts with clean paper
  const marks={}; const save=()=>{};
  try{ localStorage.removeItem('yir-v5-marks'); }catch(_){}   // clear ink kept by the earlier build
  const list=(i,s)=>(marks[i]&&marks[i][s])||[];
  const pageEl=(i,s)=>Y.spreads[i]&&Y.spreads[i].querySelector('.pg.'+s);

  /* ---------- shared defs: pen gradients and the felt-tip roughness ---------- */
  const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');
  defs.setAttribute('width','0'); defs.setAttribute('height','0'); defs.style.position='absolute';
  defs.innerHTML=`<defs>
    <filter id="mkRough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.3"/></filter>
    <linearGradient id="mkBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d3b37"/><stop offset=".3" stop-color="#1b1a18"/><stop offset="1" stop-color="#090908"/></linearGradient>
    <linearGradient id="mkRedG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5493a"/><stop offset=".35" stop-color="#c8211a"/><stop offset="1" stop-color="#7d110c"/></linearGradient>
    <linearGradient id="mkMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e7e1"/><stop offset=".5" stop-color="#9c9a94"/><stop offset="1" stop-color="#5d5b57"/></linearGradient>
    <linearGradient id="mkHi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff" stop-opacity=".26"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>`;
  body.appendChild(defs);

  // a felt-tip drawn lying flat, nib at the origin pointing left
  const PEN=`<svg class="pen-g" viewBox="0 0 210 22" width="210" height="22" aria-hidden="true">
    <path d="M0 11C2.4 9.7 6 9.3 10 9.2V12.8C6 12.7 2.4 12.3 0 11Z" fill="${RED}"/>
    <rect x="10" y="8" width="4.5" height="6" fill="url(#mkMetal)"/>
    <path d="M14.5 7.4L40 3V19L14.5 14.6Z" fill="url(#mkBar)"/>
    <rect x="40" y="3" width="146" height="16" fill="url(#mkBar)"/>
    <rect x="174" y="3" width="10" height="16" fill="url(#mkRedG)"/>
    <path d="M186 3.4H202C205.6 3.4 208 6.4 208 11S205.6 18.6 202 18.6H186Z" fill="url(#mkBar)"/>
    <rect x="148" y=".6" width="48" height="3.4" rx="1.7" fill="url(#mkMetal)"/>
    <text x="58" y="13.3" font-family="Harvey Sans,Helvetica Neue,Arial,sans-serif" font-size="6.4" font-weight="600" letter-spacing="1.9" fill="#F4F2EC">HARVEY</text>
    <text x="104" y="13" font-family="Harvey Sans,Helvetica Neue,Arial,sans-serif" font-size="4.6" letter-spacing=".9" fill="rgba(244,242,236,.5)">REDLINE · 0.7 FELT</text>
    <rect x="14.5" y="3" width="193.5" height="16" fill="url(#mkHi)"/>
  </svg>`;
  const PEN_SHADOW=`<svg viewBox="0 0 210 22" width="210" height="22" aria-hidden="true"><path d="M0 11L14.5 7.4L40 3H202C205.6 3 208 6.4 208 11S205.6 19 202 19H40L14.5 14.6Z" fill="#000"/></svg>`;

  /* ---------- tray ---------- */
  const tray=document.createElement('div'); tray.className='mk-tray'; tray.setAttribute('role','toolbar'); tray.setAttribute('aria-label','Markup');
  tray.innerHTML=`
    <button class="mk-tool" data-tool="pen" aria-pressed="false" title="Redline (R)"><span class="slot"><span class="nib-pen">${PEN}</span></span><span class="lab">Redline <kbd>R</kbd></span></button>
    <button class="mk-tool" data-tool="tear" aria-pressed="false" title="Tear off and share (T)"><span class="slot slip"><svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true"><path d="M2 2H32V35L29 37.5 26 35.5 22.5 38 19 35.8 15.5 38.4 12 36 8.5 38.2 5 35.6 2 37.6Z" fill="#F4F2EC"/><path d="M6 9H26M6 13H28M6 17H22M6 21H27M6 25H18" stroke="#0F0E0D" stroke-opacity=".28" stroke-width="1.3"/><path d="M6 13H28" stroke="${RED}" stroke-width="1.4"/><path d="M0 30.5H34" stroke="#F4F2EC" stroke-opacity=".55" stroke-dasharray="2 2"/></svg></span><span class="lab">Tear off <kbd>T</kbd></span></button>
    <i class="rule"></i>
    <button class="mk-mini" id="mkUndo" title="Undo last mark (⌘Z)" aria-label="Undo last mark"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5.5 4L2.5 7l3 3"/><path d="M2.5 7H10a3.5 3.5 0 010 7H7"/></svg></button>
    <button class="mk-mini" id="mkClear" title="Clear this spread's marks" aria-label="Clear this spread's marks"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg><b>Clear?</b></button>`;
  body.appendChild(tray);

  const pen=document.createElement('div'); pen.className='mk-pen'; pen.setAttribute('aria-hidden','true');
  pen.innerHTML=`<div class="sh">${PEN_SHADOW}</div><div class="bd">${PEN}</div>`;
  body.appendChild(pen);

  const mkHint=document.createElement('p'); mkHint.className='mk-hint'; body.appendChild(mkHint);

  /* ---------- share sheet ---------- */
  const sheet=document.createElement('div'); sheet.className='mk-sheet'; sheet.setAttribute('aria-hidden','true');
  sheet.innerHTML=`<div class="mk-dim"></div>
    <div class="mk-card" role="dialog" aria-modal="true" aria-labelledby="mkTitle">
      <div class="mk-stage"><canvas id="mkCard"></canvas></div>
      <div class="mk-side">
        <div class="mk-eye"><i id="mkNum"></i><span>Clipping</span><em id="mkPg"></em></div>
        <h3 id="mkTitle"></h3>
        <p class="mk-meta">Torn from the Harvey 2026 Year in Review. The link opens the book on this passage.</p>
        <label class="mk-sw" id="mkSwRow"><input type="checkbox" id="mkInkOn" checked><span class="tr"></span>Include my redlines</label>
        <div class="mk-url"><input id="mkUrl" readonly aria-label="Link to this passage"><button class="btn solid" id="mkCopyLink"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 7a2.5 2.5 0 003.5 0l1.8-1.8a2.5 2.5 0 00-3.5-3.5L6 2.5"/><path d="M7 5a2.5 2.5 0 00-3.5 0L1.7 6.8a2.5 2.5 0 003.5 3.5L6 9.5"/></svg>Copy link</button></div>
        <div class="mk-acts">
          <button class="btn ghost" id="mkCopyImg">Copy image</button>
          <button class="btn ghost" id="mkSave">Download PNG</button>
          <a class="btn ghost" id="mkLi" target="_blank" rel="noopener">LinkedIn</a>
          <a class="btn ghost" id="mkMail">Email</a>
        </div>
        <p class="mk-toast" id="mkToast" role="status"></p>
      </div>
      <button class="mk-x" id="mkClose" aria-label="Close"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg></button>
    </div>`;
  body.appendChild(sheet);

  /* ---------- sound: felt on paper, and a rip ---------- */
  let ac=null, noise=null, scratch=null;
  function audio(){
    if(ac) return ac;
    try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ return null; }
    const len=ac.sampleRate*2, buf=ac.createBuffer(1,len,ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    noise=buf; return ac;
  }
  function scratchOn(){
    const a=audio(); if(!a) return; if(a.state==='suspended') a.resume();
    const src=a.createBufferSource(); src.buffer=noise; src.loop=true;
    const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=3200; bp.Q.value=.9;
    const g=a.createGain(); g.gain.value=0;
    src.connect(bp); bp.connect(g); g.connect(a.destination); src.start();
    scratch={src,g,bp};
  }
  function scratchAt(v){ if(!scratch) return; const t=ac.currentTime; scratch.g.gain.setTargetAtTime(clamp(v*.05,0,.045),t,.03); scratch.bp.frequency.setTargetAtTime(2600+v*1400,t,.05); }
  function scratchOff(){ if(!scratch) return; const s=scratch; scratch=null; s.g.gain.setTargetAtTime(0,ac.currentTime,.04); setTimeout(()=>{ try{ s.src.stop(); }catch(_){} },300); }
  function ripSound(){
    const a=audio(); if(!a) return; if(a.state==='suspended') a.resume();
    const t=a.currentTime, src=a.createBufferSource(); src.buffer=noise;
    const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.4; bp.frequency.setValueAtTime(700,t); bp.frequency.exponentialRampToValueAtTime(3600,t+.42);
    const g=a.createGain(); g.gain.setValueAtTime(0,t);
    for(let k=0;k<22;k++){ const tk=t+k*.019; g.gain.setValueAtTime(.05+Math.random()*.13,tk); g.gain.setTargetAtTime(.015,tk+.004,.006); }   // the fibres giving one by one
    g.gain.setTargetAtTime(0,t+.44,.03);
    src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t); src.stop(t+.7);
  }

  /* ---------- ink: a felt-tip outline whose width follows the speed of the hand ---------- */
  function inkPath(raw){
    let P=[raw[0]];
    for(const p of raw){ const q=P[P.length-1]; if(Math.hypot(p[0]-q[0],p[1]-q[1])>=1.1) P.push(p); }
    if(P.length<3){ const [x,y]=raw[0], r=1.7; return `M${f1(x-r)} ${f1(y)}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`; }
    for(let k=0;k<2;k++) P=P.map((p,i)=>i===0||i===P.length-1?p:[(P[i-1][0]+2*p[0]+P[i+1][0])/4,(P[i-1][1]+2*p[1]+P[i+1][1])/4,p[2]]);
    const n=P.length;
    let W=P.map((p,i)=>{ const q=P[Math.max(0,i-1)], r=P[Math.min(n-1,i+1)]; const v=Math.hypot(r[0]-q[0],r[1]-q[1])/Math.max(10,r[2]-q[2]); return clamp(4.4-v*2.6,2.1,4.4)/2; });
    for(let k=0;k<3;k++) W=W.map((w,i)=>(W[Math.max(0,i-1)]+2*w+W[Math.min(n-1,i+1)])/4);
    W=W.map((w,i)=>{ const e=Math.min(i,n-1-i); return w*(e<3?.6+.13*e:1); });
    const L=[],R=[];
    P.forEach((p,i)=>{ const q=P[Math.max(0,i-1)], r=P[Math.min(n-1,i+1)]; const dx=r[0]-q[0], dy=r[1]-q[1], l=Math.hypot(dx,dy)||1, nx=-dy/l, ny=dx/l; L.push([p[0]+nx*W[i],p[1]+ny*W[i]]); R.push([p[0]-nx*W[i],p[1]-ny*W[i]]); });
    let d='M'+f1(L[0][0])+' '+f1(L[0][1]);
    for(let i=1;i<n;i++) d+='L'+f1(L[i][0])+' '+f1(L[i][1]);
    d+=`A${f1(W[n-1])} ${f1(W[n-1])} 0 0 1 ${f1(R[n-1][0])} ${f1(R[n-1][1])}`;
    for(let i=n-2;i>=0;i--) d+='L'+f1(R[i][0])+' '+f1(R[i][1]);
    return d+`A${f1(W[0])} ${f1(W[0])} 0 0 1 ${f1(L[0][0])} ${f1(L[0][1])}Z`;
  }
  // a stroke drawn nearly level becomes a ruled strike-through at its mean height
  function ruled(pts){
    const a=pts[0], b=pts[pts.length-1], dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
    if(L<26||Math.abs(dy)/L>.18) return null;
    let dev=0, my=0; for(const p of pts){ dev=Math.max(dev,Math.abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)/L); my+=p[1]; }
    if(dev>4.5) return null; my/=pts.length;
    const x0=Math.min(a[0],b[0]), x1=Math.max(a[0],b[0]), m=Math.ceil((x1-x0)/3), out=[];
    for(let i=0;i<=m;i++){ const t=i/m; out.push([x0+(x1-x0)*t, my+Math.sin(t*7+x0)*.3, t*(x1-x0)/.5]); }
    return out;
  }
  const bboxOf=pts=>{ let a=1e9,b=1e9,c=-1e9,d=-1e9; pts.forEach(p=>{ a=Math.min(a,p[0]); b=Math.min(b,p[1]); c=Math.max(c,p[0]); d=Math.max(d,p[1]); }); return [f1(a-2),f1(b-2),f1(c+2),f1(d+2)]; };

  const SVGNS='http://www.w3.org/2000/svg';
  const inkHTML=(i,s)=>{ const L=list(i,s); return L.length?`<svg class="mk-ink" viewBox="0 0 560 800" preserveAspectRatio="none"><g filter="url(#mkRough)">${L.map(m=>`<path d="${m.d}"/>`).join('')}</g></svg>`:''; };
  function layer(i,s){
    const p=pageEl(i,s); if(!p) return null;
    let svg=p.querySelector(':scope > .mk-ink');
    if(!svg){ svg=document.createElementNS(SVGNS,'svg'); svg.setAttribute('class','mk-ink'); svg.setAttribute('viewBox','0 0 560 800'); svg.setAttribute('preserveAspectRatio','none'); const g=document.createElementNS(SVGNS,'g'); g.setAttribute('filter','url(#mkRough)'); svg.appendChild(g); p.appendChild(svg); }
    return svg.firstChild;
  }
  function render(i){ ['l','r'].forEach(s=>{ const L=list(i,s); const p=pageEl(i,s); if(!p) return; if(!L.length&&!p.querySelector(':scope > .mk-ink')) return; const g=layer(i,s); g.innerHTML=L.map(m=>`<path d="${m.d}"/>`).join(''); }); syncTray(); }
  Object.keys(marks).forEach(i=>render(+i));
  window.MK={ ink:(i,s)=>inkHTML(i,s) };

  /* ---------- tools ---------- */
  let tool=null;
  const HINTS={
    pen:'<kbd>Drag</kbd> to redline · a level line becomes a strike-through <kbd>Esc</kbd> done',
    tear:'<kbd>Drag</kbd> a box over a passage to tear it out and share it <kbd>Esc</kbd> done'
  };
  function setTool(t){
    if(t&&Y.mode!=='open') return;
    tool=tool===t?null:t;
    body.classList.toggle('marking',!!tool); body.classList.toggle('mk-pen-on',tool==='pen'); body.classList.toggle('mk-tear-on',tool==='tear');
    tray.querySelectorAll('.mk-tool').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
    mkHint.innerHTML=tool?HINTS[tool]:''; mkHint.classList.toggle('on',!!tool);
    if(tool!=='pen') pen.classList.remove('on');
  }
  tray.querySelectorAll('.mk-tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

  function syncTray(){
    const c=Y.cur, n=list(c,'l').length+list(c,'r').length;
    $('mkUndo').disabled=!n; $('mkClear').disabled=!n;
    if(!n) $('mkClear').classList.remove('arm');
  }
  function undo(){
    const c=Y.cur; let best=null;
    ['l','r'].forEach(s=>list(c,s).forEach((m,k)=>{ if(!best||m.n>best.m.n) best={s,k,m}; }));
    if(!best) return; marks[c][best.s].splice(best.k,1); save(); render(c);
  }
  $('mkUndo').addEventListener('click',undo);
  let clearT=0;
  $('mkClear').addEventListener('click',()=>{
    const b=$('mkClear');
    if(!b.classList.contains('arm')){ b.classList.add('arm'); clearTimeout(clearT); clearT=setTimeout(()=>b.classList.remove('arm'),2400); return; }
    b.classList.remove('arm'); delete marks[Y.cur]; save(); render(Y.cur);
  });

  // which page of the open spread is under the pointer, in page units
  function hit(e){
    if(Y.mode!=='open'||Y.turning) return null;
    for(const s of ['l','r']){
      const p=pageEl(Y.cur,s); if(!p) continue; const r=p.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom) return {p,s,x:(e.clientX-r.left)/r.width*PW,y:(e.clientY-r.top)/r.height*PH,r};
    }
    return null;
  }

  /* ---------- the pen in the hand ---------- */
  let ink=null, sel=null;
  function placePen(e,down){
    pen.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
    pen.classList.toggle('down',!!down);
  }
  addEventListener('pointermove',e=>{
    if(tool==='pen'){
      const h=hit(e), over=!!h&&!(e.target.closest&&e.target.closest('.mk-tray,.index,.prog,.seg,.acts,.chip,.mk-sheet'));
      pen.classList.toggle('on',over||!!ink); placePen(e,!!ink);
    }
    if(ink){
      const r=ink.r, x=clamp((e.clientX-r.left)/r.width*PW,0,PW), y=clamp((e.clientY-r.top)/r.height*PH,0,PH), t=performance.now()-ink.t0;
      const q=ink.pts[ink.pts.length-1], v=Math.hypot(x-q[0],y-q[1])/Math.max(1,t-q[2]);
      ink.pts.push([x,y,t]); ink.path.setAttribute('d',inkPath(ink.pts)); scratchAt(v);
    }
    if(sel){
      const r=sel.r, x=clamp((e.clientX-r.left)/r.width*PW,0,PW), y=clamp((e.clientY-r.top)/r.height*PH,0,PH);
      sel.x1=x; sel.y1=y; drawSel();
    }
  });
  document.addEventListener('pointerleave',()=>pen.classList.remove('on'));

  $('book').addEventListener('pointerdown',e=>{
    if(!tool||e.button>0||e.target.closest('a,button')) return;
    const h=hit(e); if(!h) return;
    e.preventDefault();
    try{ $('book').setPointerCapture(e.pointerId); }catch(_){}
    if(tool==='pen'){
      const g=layer(Y.cur,h.s), path=document.createElementNS(SVGNS,'path'); g.appendChild(path);
      ink={i:Y.cur,s:h.s,r:h.r,t0:performance.now(),pts:[[h.x,h.y,0]],path};
      path.setAttribute('d',inkPath(ink.pts)); placePen(e,true); scratchOn();
    } else {
      const box=document.createElement('div'); box.className='mk-sel'; box.innerHTML='<span class="sc"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="4" cy="4.5" r="2.2"/><circle cx="4" cy="11.5" r="2.2"/><path d="M5.8 5.7L14 12M5.8 10.3L14 4"/></svg></span><em>Release to tear</em>';
      h.p.appendChild(box);
      sel={i:Y.cur,s:h.s,p:h.p,r:h.r,x0:h.x,y0:h.y,x1:h.x,y1:h.y,box}; drawSel();
    }
  },{capture:true});

  function finishInk(){
    const k=ink; ink=null; scratchOff(); pen.classList.remove('down');
    let pts=k.pts, kind='free';
    const straight=ruled(pts); if(straight){ pts=straight; kind='strike'; }
    const d=inkPath(pts); k.path.setAttribute('d',d);
    if(kind==='strike'){ k.path.classList.add('ruled'); }
    (marks[k.i]=marks[k.i]||{})[k.s]=list(k.i,k.s).concat([{d,k:kind,b:bboxOf(pts),n:Date.now()}]);
    save(); syncTray();
  }
  const selRect=(o=sel)=>{ const x=Math.min(o.x0,o.x1), y=Math.min(o.y0,o.y1); return {x,y,w:Math.abs(o.x1-o.x0),h:Math.abs(o.y1-o.y0)}; };
  function drawSel(){ const q=selRect(); Object.assign(sel.box.style,{left:q.x+'px',top:q.y+'px',width:q.w+'px',height:q.h+'px'}); sel.box.classList.toggle('ok',q.w>=40&&q.h>=22); }
  const up=()=>{
    if(ink) finishInk();
    if(sel){ const s=sel; sel=null; const q=selRect(s); if(q.w>=40&&q.h>=22) tear(s,q); else s.box.remove(); }
  };
  addEventListener('pointerup',up); addEventListener('pointercancel',up);

  /* ---------- tearing ---------- */
  // a rectangle whose edges have been ripped: small random bites in from each side
  function tornPoly(w,h,amp,seed){
    let r=seed||1; const rnd=()=>{ r=(r*16807)%2147483647; return r/2147483647; };
    const pts=[], step=()=>3+rnd()*5, bite=()=>rnd()*amp;
    for(let x=0;x<w;x+=step()) pts.push([x,bite()]);
    for(let y=0;y<h;y+=step()) pts.push([w-bite(),y]);
    for(let x=w;x>0;x-=step()) pts.push([x,h-bite()]);
    for(let y=h;y>0;y-=step()) pts.push([bite(),y]);
    return pts;
  }
  const loadImg=src=>new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=src; });

  // the scrap itself: the page cut out with a pale fibrous rim, the reader's ink on top if wanted
  async function scrap(c,withInk){
    const k=K, w=Math.round(c.w*k), h=Math.round(c.h*k), cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    const x=cv.getContext('2d'), im=await loadImg(`spreads/${key(c.i)}-${c.s}.webp`);
    const outer=tornPoly(w,h,5*k,c.seed), inner=outer.map(([px,py])=>[px+(px<w/2?1:-1)*(1.2+((px*7+py*3)%5)*.35)*k*.55,py+(py<h/2?1:-1)*(1.2+((px*3+py*7)%5)*.35)*k*.55]);
    const poly=P=>{ x.beginPath(); P.forEach(([a,b],j)=>j?x.lineTo(a,b):x.moveTo(a,b)); x.closePath(); };
    poly(outer); x.fillStyle='#FBFAF3'; x.fill();
    x.save(); poly(inner); x.clip();
    x.drawImage(im,c.x*k,c.y*k,c.w*k,c.h*k,0,0,w,h);
    if(withInk){
      x.save(); x.scale(k,k); x.translate(-c.x,-c.y); x.globalCompositeOperation='multiply'; x.fillStyle=RED; x.globalAlpha=.9;
      list(c.i,c.s).forEach(m=>x.fill(new Path2D(m.d))); x.restore();
    }
    x.restore();
    return cv;
  }
  const inkIn=c=>list(c.i,c.s).some(m=>m.b[2]>c.x&&m.b[0]<c.x+c.w&&m.b[3]>c.y&&m.b[1]<c.y+c.h);

  // the shareable card: the clipping laid on the chapter's colour with its source beneath
  const ROT=-1.4*Math.PI/180;
  async function card(c,withInk){
    const sc=await scrap(c,withInk), pad=Math.round(clamp(Math.max(sc.width,sc.height)*.12,56,110)), foot=86;
    const W=Math.max(sc.width+pad*2,640), H=sc.height+pad*2+foot, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    const x=cv.getContext('2d'), cs=getComputedStyle(root), bg=cs.getPropertyValue('--bg').trim()||'#2F2609', acc=cs.getPropertyValue('--acc').trim()||'#F4F2EC';
    x.fillStyle=bg; x.fillRect(0,0,W,H);
    const vg=x.createRadialGradient(W/2,H*.42,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.35)'); x.fillStyle=vg; x.fillRect(0,0,W,H);
    const cx=W/2, cy=pad+sc.height/2;
    x.save(); x.translate(cx,cy); x.rotate(ROT);
    x.shadowColor='rgba(0,0,0,.5)'; x.shadowBlur=34; x.shadowOffsetY=16; x.drawImage(sc,-sc.width/2,-sc.height/2);
    x.restore();
    // footer: source line and page
    const y0=H-foot+30;
    x.fillStyle='rgba(244,242,236,.16)'; x.fillRect(pad*.6,y0-24,W-pad*1.2,1);
    x.textBaseline='middle';
    x.fillStyle=acc; x.font='600 21px "Harvey Sans","Helvetica Neue",Arial,sans-serif'; x.fillText('Harvey',pad*.6,y0+12);
    const hw=x.measureText('Harvey ').width;
    x.fillStyle='rgba(244,242,236,.62)'; x.font='400 21px "Harvey Serif",Georgia,serif'; x.fillText('2026 Year in Review',pad*.6+hw+4,y0+12);
    x.textAlign='right'; x.font='500 17px "Harvey Sans","Helvetica Neue",Arial,sans-serif'; x.fillStyle='rgba(244,242,236,.62)';
    x.fillText(`${c.num?c.num+' · ':''}${c.title}  ·  p. ${c.page}`,W-pad*.6,y0+12);
    return {cv,sc,pad,cx,cy};
  }

  function chapterOf(i){
    let num='', title=Y.spreads[i].dataset.cap||'';
    for(let j=i;j>0;j--){ const t=Y.spreads[j].dataset.toc; if(t&&/^[IVX]+\|/.test(t)){ [num,title]=t.split('|'); break; } }
    return {num,title:Y.spreads[i].dataset.cap||title};
  }
  const linkFor=c=>`${location.origin}${location.pathname}#clip-${c.i}-${c.s}-${Math.round(c.x)}-${Math.round(c.y)}-${Math.round(c.w)}-${Math.round(c.h)}`;

  let open=null;   // the clipping on the sheet
  async function tear(s,q){
    const c={i:s.i,s:s.s,x:q.x,y:q.y,w:q.w,h:q.h,seed:Math.floor(Math.random()*1e6)+1};
    Object.assign(c,chapterOf(c.i)); c.page=c.i*2+(c.s==='r'?1:0);
    const r0=s.box.getBoundingClientRect(); s.box.remove();
    ripSound();
    // the hole left behind, same ragged outline
    const hole=document.createElement('div'); hole.className='mk-hole';
    const poly=tornPoly(c.w,c.h,5,c.seed).map(([a,b])=>`${(a/c.w*100).toFixed(2)}% ${(b/c.h*100).toFixed(2)}%`).join(',');
    Object.assign(hole.style,{left:c.x+'px',top:c.y+'px',width:c.w+'px',height:c.h+'px',clipPath:`polygon(${poly})`});
    s.p.appendChild(hole); c.hole=hole;
    c.ink=inkIn(c);
    const sc=await scrap(c,true);
    const fly=document.createElement('div'); fly.className='mk-fly'; fly.appendChild(sc);
    Object.assign(fly.style,{left:r0.left+'px',top:r0.top+'px',width:r0.width+'px',height:r0.height+'px'});
    body.appendChild(fly);
    await showSheet(c);
    // land on the card's clipping
    const cvs=$('mkCard'), cr=cvs.getBoundingClientRect(), k=cr.width/cvs.width;
    const tx=cr.left+open.cx*k, ty=cr.top+open.cy*k, tw=open.sc.width*k;
    const dx=tx-(r0.left+r0.width/2), dy=ty-(r0.top+r0.height/2), s1=tw/r0.width;
    const anim=fly.animate([
      {transform:'translate(0,0) rotate(0deg) scale(1)',filter:'drop-shadow(0 1px 1px rgba(0,0,0,.2))'},
      {transform:'translate(0,-10px) rotate(-3deg) scale(1.04)',filter:'drop-shadow(0 14px 18px rgba(0,0,0,.4))',offset:.32},
      {transform:`translate(${dx}px,${dy}px) rotate(-1.4deg) scale(${s1})`,filter:'drop-shadow(0 16px 24px rgba(0,0,0,.5))'}
    ],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?1:1050,easing:'cubic-bezier(.5,0,.15,1)',fill:'forwards'});
    anim.onfinish=()=>{ cvs.classList.add('in'); fly.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'}).onfinish=()=>fly.remove(); };
  }

  async function paint(){
    const c=open.c, withInk=c.ink&&$('mkInkOn').checked, res=await card(c,withInk);
    const cvs=$('mkCard'); cvs.width=res.cv.width; cvs.height=res.cv.height; cvs.getContext('2d').drawImage(res.cv,0,0);
    Object.assign(open,res);
  }
  async function showSheet(c){
    open={c};
    $('mkNum').textContent=c.num||'—'; $('mkPg').textContent='p. '+String(c.page).padStart(2,'0'); $('mkTitle').textContent=c.title;
    $('mkSwRow').hidden=!c.ink; $('mkInkOn').checked=true;
    const url=linkFor(c); $('mkUrl').value=url;
    const msg=`“${c.title}” from the Harvey 2026 Year in Review, p. ${c.page}`;
    $('mkLi').href='https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url);
    $('mkMail').href=`mailto:?subject=${encodeURIComponent(msg)}&body=${encodeURIComponent(msg+'\n\n'+url)}`;
    toast('');
    $('mkCard').classList.remove('in');
    await paint();
    sheet.classList.add('on'); sheet.setAttribute('aria-hidden','false');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }
  function closeSheet(){
    if(!open) return; const h=open.c.hole; open=null;
    sheet.classList.remove('on'); sheet.setAttribute('aria-hidden','true');
    if(h){ h.classList.add('mend'); setTimeout(()=>h.remove(),1200); }   // the page closes over again
  }
  $('mkClose').addEventListener('click',closeSheet);
  sheet.querySelector('.mk-dim').addEventListener('click',closeSheet);
  $('mkInkOn').addEventListener('change',()=>{ if(open) paint(); });

  let toastT=0;
  function toast(t){ const el=$('mkToast'); el.textContent=t; el.classList.toggle('on',!!t); clearTimeout(toastT); if(t) toastT=setTimeout(()=>el.classList.remove('on'),2200); }
  $('mkCopyLink').addEventListener('click',()=>{
    const v=$('mkUrl').value;
    const legacy=()=>{ const u=$('mkUrl'); u.focus(); u.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(_){} toast(ok?'Link copied':'Press ⌘C to copy'); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(()=>toast('Link copied'),legacy); else legacy();
  });
  $('mkUrl').addEventListener('focus',e=>e.target.select());
  $('mkCopyImg').addEventListener('click',()=>{
    const cvs=$('mkCard');
    if(!navigator.clipboard||!window.ClipboardItem){ toast('Copying images is not supported here, use Download'); return; }
    navigator.clipboard.write([new ClipboardItem({'image/png':new Promise(r=>cvs.toBlob(r,'image/png'))})]).then(()=>toast('Image copied, paste it anywhere'),()=>toast('Could not copy the image, use Download'));
  });
  $('mkSave').addEventListener('click',()=>{
    const c=open&&open.c; if(!c) return;
    $('mkCard').toBlob(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`harvey-yir-2026-p${c.page}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); toast('Saved'); },'image/png');
  });

  /* ---------- keys ---------- */
  addEventListener('keydown',e=>{
    if(open){
      if(e.key==='Escape'){ e.preventDefault(); closeSheet(); }
      if(!(e.metaKey||e.ctrlKey)) e.stopImmediatePropagation();
      return;
    }
    if(e.target&&(e.target.isContentEditable||/^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;   // typing in a note
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&(e.key==='z'||e.key==='Z')&&Y.mode==='open'){ e.preventDefault(); undo(); return; }
    if(e.metaKey||e.ctrlKey||e.altKey||body.classList.contains('intro-on')) return;
    if($('ov').classList.contains('on')) return;
    if(e.key==='Escape'&&tool){ setTool(tool); e.stopImmediatePropagation(); return; }
    if(e.key==='r'||e.key==='R'){ setTool('pen'); return; }
    if(e.key==='t'||e.key==='T'){ setTool('tear'); return; }
  },{capture:true});

  // tools put themselves away when the book closes; the tray follows the spread
  let lastCur=-2;
  (function watch(){
    if(Y.cur!==lastCur){ lastCur=Y.cur; syncTray(); }
    if(tool&&Y.mode!=='open'&&Y.mode!=='moving') setTool(tool);
    requestAnimationFrame(watch);
  })();

  /* ---------- arriving from a shared link: open on the passage and mark it ---------- */
  const m=/^#clip-(\d+)-([lr])-(\d+)-(\d+)-(\d+)-(\d+)$/.exec(window.__clip||'');
  if(m){
    const [i,s,x,y,w,h]=[+m[1],m[2],+m[3],+m[4],+m[5],+m[6]];
    if(i>0&&i<Y.N){
      const start=()=>{
        if(body.classList.contains('intro-on')) dispatchEvent(new KeyboardEvent('keydown',{key:'Shift'}));
        setTimeout(()=>Y.go(i),250);
        const t0=performance.now();
        (function wait(){
          if(Y.mode==='open'&&Y.cur===i){ setTimeout(()=>flag(i,s,x,y,w,h),500); return; }
          if(performance.now()-t0<6000) requestAnimationFrame(wait);
        })();
      };
      setTimeout(start,900);
    }
  }
  function flag(i,s,x,y,w,h){
    const p=pageEl(i,s); if(!p) return;
    const f=document.createElement('div'); f.className='mk-flag';
    Object.assign(f.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    f.innerHTML='<em>Shared with you</em>';
    p.appendChild(f); requestAnimationFrame(()=>f.classList.add('on'));
    const off=()=>{ f.classList.remove('on'); setTimeout(()=>f.remove(),600); removeEventListener('pointerdown',off,true); };
    setTimeout(()=>addEventListener('pointerdown',off,true),600);
  }
})();
