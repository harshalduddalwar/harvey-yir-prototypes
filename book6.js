/* Prototype F: intro monogram and wordmark → a 3D book on the desk (drag to turn it, click to open) → an immersive
   read where the desk takes the paper's colour. Pages turn as leaves: click a side for a quick turn,
   or grab a page and pull it across. The contents bar adds a preview on hover and an overview of
   every spread. Data on each spread plays once it settles, as in E. */
(function(){
  const $=id=>document.getElementById(id);
  const root=document.documentElement, body=document.body;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const seg=(p,a,b)=>clamp((p-a)/(b-a));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const out=t=>1-Math.pow(1-t,3);
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const r2=v=>Math.round(v*100)/100;
  const RAD=Math.PI/180;

  const spreads=[...document.querySelectorAll('.spread')], N=spreads.length;
  let cur=-1, mode='closed';            // closed · moving · open
  const later=(fn,ms)=>setTimeout(fn,reduce?0:ms);

  /* ---------- fit the spread to the window ---------- */
  function size(){
    const W=innerWidth, H=innerHeight, mx=W>760?120:12, my=W>760?84:56;   // room for the case, the header and the progress line
    root.style.setProperty('--s',Math.max(.2,Math.min((W-2*mx)/1120,(H-2*my)/800)).toFixed(4));
    if(ov.classList.contains('on')) fitTiles();
    if(window.__pfSize) window.__pfSize();
  }

  /* ---------- tweens, cancelled when a spread is left ---------- */
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

  /* ---------- snapshots: live pages for the turning leaf, finished spreads for previews ---------- */
  const strip=el=>{ el.removeAttribute('id'); el.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id')); return el; };
  const snapPage=p=>{ const c=strip(p.cloneNode(true)); c.classList.add('vis','in'); return c; };
  const pages=s=>s._pg||[s.querySelector('.pg.l'),s.querySelector('.pg.r')];
  /* ---------- the Figma spreads come alive as a page settles ----------
     Each spread is the Figma layout set as an image. FX (fx.js) maps where its text, rules and figures sit
     and the flat paper beneath each one. A swatch of that paper holds the element back; a slice of the page
     image, the element itself, then arrives on top: text rises in, rules draw across, figures count up and
     hand over to the exact set type. */
  const FXS=window.FX||{};
  const NUMS=[];   // [spreadIndex, live counter, slice, target]
  spreads.forEach((s,i)=>{
    if(i===0) return;
    const key=String(i).padStart(2,'0'), map=FXS[key]; if(!map) return;
    pages(s).forEach(p=>{
      const side=p.classList.contains('l')?'l':'r', src=`spreads/${key}-${side}.webp`;
      (map[side]||[]).forEach((e,j)=>{
        const [x,y,w,h]=e.b, d=Math.round(80+y*.3);   // a soft top-to-bottom sweep, all within a third of a second
        const cover=document.createElement('i'); cover.className='fxc';
        cover.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${e.bg}`;
        const sl=document.createElement('i'); sl.className='fxs';
        sl.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-image:url(${src});background-position:${-x}px ${-y}px`;
        p.append(cover,sl);
        if(e.k==='n'){   // figures count up, gently, then hand over to the printed type
          sl.classList.add('fxn');
          const c=document.createElement('span'); c.className='fxcnt it'; c.style.cssText=`left:${x}px;top:${y}px;height:${h}px;line-height:${h}px;color:${e.c};--d:${d/.55}`;
          p.append(c);
          const m=e.t.match(/^([^\d]*)([\d,]+)(.*)$/);
          NUMS.push({i,c,sl,pre:m[1],to:+m[2].replace(/,/g,''),comma:m[2].includes(','),suf:m[3],d,txt:e.t,fit:0,ink:e.ink,right:!!e.r});
        } else {
          sl.classList.add('it'); if(e.k==='r') sl.classList.add(e.v?'fxv':'fxh');
          sl.style.setProperty('--d',Math.round(d/.55));
        }
      });
    });
    s.dataset.play='fx';
  });
  const fmtN=(n,o)=>o.pre+(o.comma?Math.round(n).toLocaleString('en-US'):String(Math.round(n)))+o.suf;
  // set the live figure so its ink lands exactly on the printed one: size by ink width, place by ink top-left
  const mctx=document.createElement('canvas').getContext('2d');
  function fitN(o){
    if(o.fit) return;
    const fam=getComputedStyle(o.c).fontFamily; mctx.font=`400 100px ${fam}`;
    const m=mctx.measureText(o.txt), iw=m.actualBoundingBoxLeft+m.actualBoundingBoxRight; if(!iw) return;
    const [x0,y0,x1]=o.ink, F=100*(x1-x0)/iw, k=F/100;
    const fa=m.fontBoundingBoxAscent*k, fd=m.fontBoundingBoxDescent*k, base=y0+m.actualBoundingBoxAscent*k;
    const left=x0+m.actualBoundingBoxLeft*k, adv=m.width*k;
    Object.assign(o.c.style,{fontSize:r2(F)+'px',lineHeight:r2(fa+fd)+'px',height:r2(fa+fd)+'px',top:r2(base-fa)+'px',
      left:r2(left)+'px',width:r2(adv)+'px',textAlign:o.right?'right':'left',letterSpacing:'0'});
    o.fit=1;
  }
  const cntTo=(o,t)=>{ o.c.textContent=fmtN(o.to*t,o); };
  const PLAY={ fx:{
    run(i){ NUMS.forEach(o=>{ if(o.i!==i) return; fitN(o); o.sl.style.opacity=0; o.c.style.opacity=''; o.c.style.transitionDelay='';
      tween(1700,t=>{ cntTo(o,out(t)); if(t>=1){ o.c.style.transitionDelay='0s'; o.sl.style.opacity=1; o.c.style.opacity=0; } },o.d+250); }); },
    reset(i){ NUMS.forEach(o=>{ if(i!==undefined&&o.i!==i) return; fitN(o); o.sl.style.opacity=0; o.c.style.opacity=''; o.c.style.transitionDelay=''; cntTo(o,0); }); },
    done(){ NUMS.forEach(o=>{ o.sl.style.opacity=1; o.c.style.opacity=0; cntTo(o,1); }); }
  } };
  document.fonts&&document.fonts.ready.then(()=>NUMS.forEach(o=>{ o.fit=0; }));

  Object.values(PLAY).forEach(p=>p.done());
  const tpl=spreads.map((s,i)=>{
    if(i===0){ const c=document.createElement('div'); c.style.cssText='position:absolute;left:560px;top:0;width:560px;height:800px;overflow:hidden';   // the closed book lies on the right, where it opens from
      c.appendChild(strip($('cv').cloneNode(true))); c.firstChild.style.cssText='position:absolute;inset:0'; return c; }
    const c=strip(s.cloneNode(true)); c.classList.add('on'); c.querySelectorAll('.pg').forEach(p=>p.classList.add('vis','in')); return c;
  });
  Object.values(PLAY).forEach(p=>p.reset());
  const thumb=(i,k)=>{ const w=document.createElement('div'); w.className='thumb'; w.style.transform=k?`scale(${k})`:''; w.appendChild(tpl[i].cloneNode(true)); return w; };

  /* ---------- the 3D book on the desk ---------- */
  const b3=$('b3'), hinge=$('hinge'), inL=$('inL'), blk=$('blk'), glare=$('glare'), gshadow=$('gshadow');
  const gcontact=$('gcontact'), cvEl=$('cv');
  // geometry, hardbound: 560×800 boards 9px thick, a 64px case, a page block set 8px in at the fore-edge
  // and 7px at head and tail (the squares of a cased book), and a rounded spine bowed out 12px in three
  // facets. Each face carries its outward normal for lighting.
  const G={W:560,H:800,T:9,D:64}, SQ=8, SH=7, BOW=12;
  function place(el,l,t,w,h,tf,n){ Object.assign(el.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px',transform:tf}); el.dataset.n=n.join(','); return el; }
  function add(parent,cls,...geo){ const f=document.createElement('div'); f.className='f '+cls; parent.appendChild(f); return geo.length?place(f,...geo):f; }
  function facet(el,p,q){   // a facet from point p to q in the x/z plane, full height
    const dx=q[0]-p[0], dz=q[1]-p[1], L=Math.hypot(dx,dz), b=Math.atan2(-dz,dx);
    return place(el,0,0,r2(L),G.H,`translate3d(${r2((p[0]+q[0])/2-L/2)}px,0,${r2((p[1]+q[1])/2)}px) rotateY(${b.toFixed(4)}rad)`,[Math.sin(b),0,Math.cos(b)].map(v=>+v.toFixed(4)));
  }
  const SP=[[0,-G.D],[-BOW,-G.D+14],[-BOW,-14],[0,0]];
  facet(add(b3,'sb'),SP[0],SP[1]); facet($('spC'),SP[1],SP[2]); facet(add(b3,'sb'),SP[2],SP[3]);
  const bodyZ=-(G.D/2), bodyD=G.D-2*G.T;   // page block between the boards
  add(b3,'ed',G.W-SQ-bodyD/2,SH,bodyD,G.H-2*SH,`translateZ(${bodyZ}px) rotateY(90deg)`,[1,0,0]);
  add(b3,'tp',3,SH-bodyD/2,G.W-SQ-3,bodyD,`translateZ(${bodyZ}px) rotateX(90deg)`,[0,-1,0]);
  add(b3,'bt',3,G.H-SH-bodyD/2,G.W-SQ-3,bodyD,`translateZ(${bodyZ}px) rotateX(-90deg)`,[0,1,0]);
  // board edges: the front board's travel with the hinge
  [[hinge,-G.T/2],[b3,-G.D+G.T/2]].forEach(([parent,z])=>{
    add(parent,'be',G.W-G.T/2,0,G.T,G.H,`translateZ(${z}px) rotateY(90deg)`,[1,0,0]);
    add(parent,'be',0,-G.T/2,G.W,G.T,`translateZ(${z}px) rotateX(90deg)`,[0,-1,0]);
    add(parent,'be',0,G.H-G.T/2,G.W,G.T,`translateZ(${z}px) rotateX(-90deg)`,[0,1,0]);
  });
  $('cv').dataset.n='0,0,1'; b3.querySelector('.bk').dataset.n='0,0,-1';
  const lit=[...b3.querySelectorAll('[data-n]')].map(el=>({el,n:el.dataset.n.split(',').map(Number),hinged:hinge.contains(el)}));
  const LIGHT=(v=>{ const m=Math.hypot(...v); return v.map(x=>x/m); })([-.38,-.52,.76]);
  const BASE_Y=0, BASE_X=0;   // at rest the book faces you, square and flat
  const FRONT='translate3d(0px,0px,0px) scale(1) rotateX(0deg) rotateY(0deg)';
  const pose=(ry,rx,ty)=>`translate3d(-280px,${r2(ty)}px,0px) scale(.68) rotateX(${r2(rx)}deg) rotateY(${r2(ry)}deg)`;
  let spin=0, spinV=0, tilt={x:0,y:0}, aim={x:0,y:0}, posing=false, t0=0, lastTouch=0, ry=BASE_Y, rx=BASE_X, ty=0;
  let grab=null;
  function shade(ry,rx){
    const cy=Math.cos(ry*RAD), sy=Math.sin(ry*RAD), cx=Math.cos(rx*RAD), sx=Math.sin(rx*RAD);
    for(const f of lit){
      const [nx,ny,nz]=f.n, x1=nx*cy+nz*sy, z1=-nx*sy+nz*cy, y2=ny*cx-z1*sx, z2=ny*sx+z1*cx;
      const dot=x1*LIGHT[0]+y2*LIGHT[1]+z2*LIGHT[2];
      f.el.style.setProperty('--sh',r2(clamp(.7-dot*.78,0,.72)));
      if(f.el.id==='cv') f.el.style.visibility=hingeA<90&&z2>.001?'inherit':'hidden';
      else if(!(f.hinged&&hingeA>0)) f.el.style.visibility=z2>.001?'inherit':'hidden';
    }
    blk.style.visibility=cx*cy>.001?'inherit':'hidden';
    glare.style.transform=`translate3d(${r2(-(((ry%360)+540)%360-180)*5)}px,0,0)`;
  }
  function frame(now){
    if(!posing) return;
    const t=(now-t0)/1000;
    tilt.x+=(aim.x-tilt.x)*.05; tilt.y+=(aim.y-tilt.y)*.05;
    if(!grab){
      spin+=spinV; spinV*=.93;
      if(Math.abs(spinV)<.05 && now-lastTouch>1200) spin+=(Math.round(spin/360)*360-spin)*.035;   // settle back to the front
    }
    ry=BASE_Y+spin+tilt.y; rx=0; ty=0;   // it only ever turns left or right: no tilt, no float, never the top or bottom
    b3.style.transform=pose(ry,rx,ty); shade(ry,rx);
    gshadow.style.transform=`scale(${r2(1-ty/120)},1)`; gshadow.style.opacity=r2(.85-ty/40);
    gcontact.style.transform=`scale(${r2(1-ty/50)},1)`; gcontact.style.opacity=r2(.75-ty/14);
    requestAnimationFrame(frame);
  }
  function startPose(){ if(posing) return; posing=true; t0=performance.now(); tilt={x:0,y:0}; requestAnimationFrame(frame); }
  addEventListener('mousemove',e=>{ if(mode!=='closed'||grab) return; aim.y=(e.clientX/innerWidth-.5)*40; aim.x=0; });
  document.addEventListener('mouseleave',()=>{ aim.y=0; });

  b3.addEventListener('pointerdown',e=>{
    if(mode!=='closed'||e.button>0) return;
    grab={x0:e.clientX,y0:e.clientY,lx:e.clientX,moved:false,id:e.pointerId}; b3.setPointerCapture(e.pointerId); b3.classList.add('grabbing');
  });
  b3.addEventListener('pointermove',e=>{
    if(!grab) return;
    const d=e.clientX-grab.lx; grab.lx=e.clientX;
    if(Math.abs(e.clientX-grab.x0)>5||Math.abs(e.clientY-grab.y0)>5) grab.moved=true;
    spin+=d*.5; spinV=d*.5; lastTouch=performance.now();
  });
  const drop=e=>{ if(!grab) return; const g=grab; grab=null; b3.classList.remove('grabbing'); lastTouch=performance.now(); if(!g.moved&&e.type==='pointerup') go(1); };
  b3.addEventListener('pointerup',drop); b3.addEventListener('pointercancel',drop);
  b3.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(1); } });

  // the board swings on a tween so each of its faces can be shown only while it faces you
  let hingeA=0, hingeRaf=0;
  function setHinge(a){ hingeA=a; hinge.style.transform=`rotateY(${r2(-a)}deg)`; if(a>0) lit.forEach(f=>{ if(f.hinged&&f.el.id!=='cv') f.el.style.visibility='inherit'; }); cvEl.style.visibility=a<90?'inherit':'hidden'; inL.style.visibility=a<90?'hidden':'inherit'; }
  function hingeTo(a1,dur){
    cancelAnimationFrame(hingeRaf); const a0=hingeA, s0=performance.now();
    if(reduce||!dur){ setHinge(a1); return; }
    (function st(now){ const k=clamp((now-s0)/dur); setHinge(lerp(a0,a1,io(k))); if(k<1) hingeRaf=requestAnimationFrame(st); })(performance.now());
  }
  function setInside(i){ const [l,r]=pages(spreads[i]); inL.replaceChildren(snapPage(l)); blk.replaceChildren(snapPage(r)); }
  const normY=a=>((a%360)+540)%360-180;

  /* open: the book turns to face you, the board swings over, and the desk becomes the page */
  /* ---------- sound: paper, made in the browser ----------
     A page turn is a swish of filtered noise rising as the leaf lifts and crosses, then a soft settle as it
     lands; the hardcover gives a lower, weightier version. Each one varies slightly, as real paper does. */
  let actx=null, nbuf=null;
  function audio(){
    if(actx) return actx;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
    actx=new AC(); const n=actx.sampleRate*2; nbuf=actx.createBuffer(1,n,actx.sampleRate);
    const d=nbuf.getChannelData(0); let b=0; for(let i=0;i<n;i++){ const w=Math.random()*2-1; b=.97*b+.03*w; d[i]=w*.55+b*3.2; }   // a little pink: paper, not hiss
    return actx;
  }
  ['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{ const a=audio(); if(a&&a.state==='suspended') a.resume(); },{capture:true,passive:true}));
  function burst(t,dur,{f0,f1,q=.8,gain=.25,attack=.04,type='bandpass'}){
    const a=actx, src=a.createBufferSource(); src.buffer=nbuf; src.playbackRate.value=.9+Math.random()*.2;
    const f=a.createBiquadFilter(); f.type=type; f.Q.value=q; f.frequency.setValueAtTime(f0,t); f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const g=a.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+attack); g.gain.exponentialRampToValueAtTime(.0008,t+dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t,Math.random()*1.2); src.stop(t+dur+.05);
  }
  function flipSound(dur=.62){
    if(reduce) return; const a=audio(); if(!a||a.state!=='running') return;
    const t=a.currentTime, v=.85+Math.random()*.3;
    burst(t,dur*.75,{f0:900*v,f1:3800*v,q:.7,gain:.16,attack:dur*.25});            // the leaf lifting and sweeping across
    burst(t+dur*.18,dur*.55,{f0:5200*v,f1:2600*v,q:1.2,gain:.05,attack:.05});      // the fine rustle of its edge
    burst(t+dur*.86,.16,{f0:1400,f1:500,q:.6,gain:.12,attack:.008,type:'lowpass'}); // landing on the page beneath
  }
  function boardSound(){
    if(reduce) return; const a=audio(); if(!a||a.state!=='running') return;
    const t=a.currentTime;
    burst(t,.5,{f0:600,f1:1800,q:.6,gain:.1,attack:.15});
    burst(t+.62,.22,{f0:420,f1:140,q:.7,gain:.32,attack:.006,type:'lowpass'});      // the board settling: heavier, lower
  }

  function openTo(i){
    boardSound();
    mode='moving'; posing=false; body.classList.remove('closed');
    setInside(i);
    b3.style.transition='none'; b3.style.transform=pose(normY(ry),rx,ty); void b3.offsetWidth;
    b3.style.transition=`transform ${reduce?0:.8}s cubic-bezier(.55,.05,.25,1)`; b3.style.transform=FRONT;
    gshadow.style.opacity=0; gcontact.style.opacity=0; shade(0,0);
    later(()=>{ hingeTo(180,900); setBg(i); },520);
    later(()=>{
      spreads.forEach(s=>{ s.classList.remove('on'); settle(s,false); });
      const B=spreads[i]; B.classList.add('on'); settle(B,true);
      if(PF){ PF.turnToPage(2*(i-1)); prime(i,true); }
      body.classList.add('open'); body.classList.remove('show3d');
      cur=i; chrome(); arrive(i,120); mode='open';
    },reduce?0:1400);
    cur=i; chrome();
  }

  /* close: the reverse, from whatever spread is open */
  function closeBook(){
    boardSound();
    if(T) endTurn(true);
    const from=cur; mode='moving';
    setInside(from);
    b3.style.transition='none'; b3.style.transform=FRONT; setHinge(180); shade(0,0);
    void b3.offsetWidth;
    body.classList.add('show3d'); body.classList.remove('open');
    leave(from); spreads[from].classList.remove('on'); settle(spreads[from],false);
    cur=0; chrome(); setBg(0);
    requestAnimationFrame(()=>hingeTo(0,800));
    later(()=>{ spin=0; spinV=0; b3.style.transition=`transform ${reduce?0:.95}s cubic-bezier(.45,.05,.3,1)`; b3.style.transform=pose(BASE_Y,BASE_X,0); gshadow.style.opacity=.85; gcontact.style.opacity=.75; },reduce?0:620);
    later(()=>{ body.classList.add('closed'); },900);
    later(()=>{ b3.style.transition='none'; mode='closed'; startPose(); },reduce?0:1600);
  }

  /* ---------- the flat book: turning leaves ---------- */
  const book=$('book'), turns=$('turns'), castL=$('castL'), castR=$('castR');
  function settle(s,on){ pages(s).forEach(p=>{ p.classList.toggle('vis',on); p.classList.toggle('in',on); if(!on) p.classList.remove('done'); }); }
  function leave(i){ if(i<1) return; killTweens(); const p=PLAY[spreads[i].dataset.play]; if(p) p.reset(i); }
  function arrive(i,delay){ const p=PLAY[spreads[i].dataset.play]; if(p) later(()=>{ if(cur===i&&!T&&mode==='open') p.run(i); },delay); }
  /* ---------- V5: the room takes the chapter's pair from the colour system ----------
     dark colour fills the room, light colour marks the chrome (badges, progress, the current row) */
  const CHS=spreads.map((s,i)=>/^[IVX]+\|/.test(s.dataset.toc||'')?i:-1).filter(i=>i>0);
  // V6: one Texture colorway per chapter (Atoms/Background/Texture, R01 hues); the room takes the colorway's darkest value
  const PAIRS=[['#2A1E1D','#DB817E'],['#1D2019','#C5CCA6'],['#182027','#ABC5CC'],['#23211A','#C9A043'],   // I Rust, II Olive, III Slate, IV Ochre
               ['#201E29','#B8AFD0'],['#132020','#9FC4C0'],['#2A1E1D','#DB817E'],['#1D2019','#C5CCA6']];  // V Plum, VI Teal, VII Rust, VIII Olive
  const FRONT_PAIR=['#0F0E0D','#F4F2EC'];   // N05 Ink Ivory: cover, contents, introduction
  // B: the Texture image for each chapter (Image · Color), rendered from the Figma component set
  const TEX_FRONT='img/tex/t0-ink-ivory-1.3.webp';
  const TEX=['img/tex/t1-rust-2.5.webp','img/tex/t2-olive-1.1.webp','img/tex/t3-slate-2.10.webp','img/tex/t4-ochre-1.6.webp',
             'img/tex/t5-plum-2.12.webp','img/tex/t6-teal-2.7.webp','img/tex/t7-rust-1.8.webp','img/tex/t8-olive-2.16.webp'];
  const chOf=i=>{ let k=-1; CHS.forEach((c,j)=>{ if(c<=i) k=j; }); return k; };
  const pairOf=i=>{ const k=chOf(i); return k<0?FRONT_PAIR:PAIRS[k%PAIRS.length]; };
  // V6 ambient grounds, from the Figma draft "Web · Ambient Backgrounds · R1"; each matches its chapter's ground colour
  const AMB_FRONT='img/amb/b08-margin.webp';   // Umber: cover, contents, introduction
  const AMB=['img/amb/b01-drapery.webp','img/amb/b02-dusk-park.webp','img/amb/b03-night-harbour.webp','img/amb/b16-ochre-margin.webp',   // I Rubric, II Forest, III Slate, IV Ochre
             'img/amb/b14-dusk-clouds.webp','img/amb/b18-night-garden.webp','img/amb/b17-misty-ridges.webp','img/amb/b04-library-corner.webp']; // V Rubric, VI Forest, VII Slate, VIII Ochre
  const ambL=[...document.querySelectorAll('#amb i')]; let ambKey='', ambN=0;
  function setAmb(i){
    const pic=body.classList.contains('bg-f');   // E: the chapter's own painting, the one its opener carries
    if(!pic&&!body.classList.contains('bg-a')&&!body.classList.contains('bg-b')){ ambKey=''; ambL.forEach(e=>e.classList.remove('on')); return; }   // C, D paint no picture
    const k=chOf(i), tex=body.classList.contains('bg-b'), src=pic?(k<0?'img/hero.jpg':`img/ch/${String(CHS[k]).padStart(2,'0')}.jpg`):tex?(k<0?TEX_FRONT:TEX[k%TEX.length]):(k<0?AMB_FRONT:AMB[k%AMB.length]); if(src===ambKey) return; ambKey=src;
    const el=ambL[ambN=1-ambN], other=ambL[1-ambN], im=new Image();
    im.onload=()=>{ if(ambKey!==src) return; el.style.backgroundImage=`url(${src})`; el.classList.add('on'); other.classList.remove('on'); };
    im.src=src;
  }
  /* E: the room takes the colour of the open spread, kept at one low lightness and a whisper of chroma */
  const lin=c=>{ c/=255; return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4); }, gam=c=>{ c=c<=.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-.055; return Math.round(Math.max(0,Math.min(1,c))*255); };
  const toLab=([r,g,b])=>{ r=lin(r); g=lin(g); b=lin(b);
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s]; };
  const fromLab=([L,a,b])=>{ const l=(L+.3963377774*a+.2158037573*b)**3, m=(L-.1055613458*a-.0638541728*b)**3, s=(L-.0894841775*a-1.291485548*b)**3;
    return [gam(4.0767416621*l-3.3077115913*m+.2309699292*s), gam(-1.2684380046*l+2.6097574011*m-.3413193965*s), gam(-.0041960863*l-.7034186147*m+1.707614701*s)]; };
  const rgbOf=s=>{ const m=String(s).match(/rgba?\(([^)]+)\)/); if(!m) return null; const v=m[1].split(/[ ,\/]+/).map(Number); return (v.length>3&&v[3]<.9)?null:v.slice(0,3); };
  const cvsT=document.createElement('canvas'); cvsT.width=cvsT.height=6; const cxT=cvsT.getContext('2d',{willReadFrequently:true});
  const imgAvg=im=>{ try{ cxT.clearRect(0,0,6,6); cxT.drawImage(im,0,0,6,6); const d=cxT.getImageData(0,0,6,6).data; let r=0,g=0,b=0; for(let k=0;k<d.length;k+=4){ r+=d[k]; g+=d[k+1]; b+=d[k+2]; } return [r/36,g/36,b/36]; }catch(_){ return null; } };
  const toneCache={};
  function toneOf(i){
    if(toneCache[i]) return toneCache[i];
    let A=0,b=0,a=0,L=0,W=0;
    pages(spreads[i]).forEach(pg=>{ if(!pg) return; const R=pg.getBoundingClientRect(), PA=R.width*R.height; if(!PA) return;
      let cov=0; const add=(c,w)=>{ const o=toLab(c); L+=o[0]*w; a+=o[1]*w; b+=o[2]*w; W+=w; };
      pg.querySelectorAll('*').forEach(el=>{ const r=el.getBoundingClientRect(); const w=Math.max(0,Math.min(r.right,R.right)-Math.max(r.left,R.left))*Math.max(0,Math.min(r.bottom,R.bottom)-Math.max(r.top,R.top)); if(w<PA*.03) return;
        let c=null; if(el.tagName==='IMG'&&el.complete&&el.naturalWidth) c=imgAvg(el); else c=rgbOf(getComputedStyle(el).backgroundColor);
        if(c){ add(c,w); cov+=w; } });
      const base=rgbOf(getComputedStyle(pg).backgroundColor); if(base) add(base,Math.max(0,PA-cov)); A+=PA; });
    if(!W) return null;
    a/=W; b/=W; const C=Math.hypot(a,b), k=C>0?Math.min(C*.55,.035)/C:0;
    const [r,g,bb]=fromLab([.33,a*k,b*k]); return toneCache[i]=`rgb(${r},${g},${bb})`;
  }
  function setTone(i){ if(!body.classList.contains('bg-e')) return; const t=toneOf(i); if(t) root.style.setProperty('--tone',t); else setTimeout(()=>{ const t2=toneOf(i); if(t2&&cur===i) root.style.setProperty('--tone',t2); },400); }
  const setBg=i=>{ const [d,l]=pairOf(i); root.style.setProperty('--bg',d); root.style.setProperty('--dk',d); root.style.setProperty('--acc',l); setAmb(i); setTimeout(()=>{ if(cur===i) setTone(i); },60); };

  /* ---------- the turning page: thin paper, not board ----------
     The leaf is a chain of narrow strips hinged edge to edge, so it bends as it turns: lying flat at the
     start and end, bowing most mid-turn with its free edge leading, as a lifted page does. Each strip is lit
     by its own angle (shade blends smoothly strip to strip), and the leaf casts a moving shadow on the page
     beneath it, dark where it hangs over and falling off past its edge, with a crease at the spine. */
  let T=null;
  const NS=28, SW=G.W/NS, CURL=140;   // thin paper: many fine strips and a deep roll
  const WT=Array.from({length:NS},(_,i)=>Math.pow(i+.6,1.25)), WS=WT.reduce((a,b)=>a+b,0);   // the bend gathers toward the free edge   // more of the bend toward the free edge
  const keyOf=i=>String(i).padStart(2,'0');
  function startTurn(to){
    flipSound();
    const from=cur, A=spreads[from], B=spreads[to], dir=to>from?1:-1;
    B.classList.add('on'); settle(B,true); B.style.zIndex=1; pages(B)[dir>0?0:1].classList.add('done');
    A.style.zIndex=2; A.classList.add(dir>0?'keepL':'keepR');
    const leaf=document.createElement('div'); leaf.className='leaf2 '+(dir>0?'fw':'bw');
    const front=`spreads/${keyOf(from)}-${dir>0?'r':'l'}.webp`, back=`spreads/${keyOf(to)}-${dir>0?'l':'r'}.webp`;
    let parent=leaf; const strips=[];
    for(let i=0;i<NS;i++){
      const st=document.createElement('div'); st.className='strip';
      st.style.cssText=`width:${r2(SW)}px;left:${i?(dir>0?r2(SW):r2(-SW)):(dir>0?0:r2(-SW))}px;transform-origin:${dir>0?'0':'100%'} 50%`;
      const mk=(src,isBack)=>{
        const f=document.createElement('div'); f.className='sface'+(isBack?' back':'');
        const innerLeft=(dir>0)!==isBack, bx=innerLeft?-(i*SW):-(G.W-(i+1)*SW);
        f.style.backgroundImage=`url(${src})`; f.style.backgroundPosition=`${r2(bx+1)}px 0`;
        if(i===NS-1){ if(innerLeft) f.style.right='0'; else { f.style.left='0'; f.style.backgroundPosition=`${r2(bx)}px 0`; } }   // no overhang past the free edge: seen edge-on it flares as a bright seam
        const ink=window.MK&&MK.ink(isBack?to:from,(dir>0)!==isBack?'r':'l');   // redlines turn with the paper
        if(ink){ const w=document.createElement('div'); w.className='mk-leafink'; w.innerHTML=ink; w.firstChild.style.left=r2(bx+1)+'px'; f.appendChild(w); }
        const ear=[window.BM,window.SN].map(o=>o?o.leaf(isBack?to:from,(dir>0)!==isBack?'r':'l'):'').join('');   // a folded corner turns with the paper too
        if(ear){ const w=document.createElement('div'); w.className='bm-leafw'; w.innerHTML=ear; [...w.children].forEach(c=>c.style.left=r2(bx+1)+'px'); f.appendChild(w); }
        const sh=document.createElement('i'); f.appendChild(sh); st.appendChild(f); return {f,sh,innerLeft};
      };
      const F=mk(front,false), Bk=mk(back,true);
      parent.appendChild(st); strips.push({st,F,Bk}); parent=st;
    }
    turns.appendChild(leaf);
    T={from,to,A,B,dir,leaf,strips,a:0,raf:0};
    cur=to; chrome(); setBg(to); hideHint();
    return T;
  }
  function setAngle(a){
    // a thin leaf peels: its free edge leads as it lifts, then drifts down a moment after the spine side lands
    T.a=a; const d=T.dir, p=a/180, k=Math.sin(a*RAD), c=CURL*Math.sin(Math.PI*p)*(1-1.35*p);
    // the spine edge lags, the free edge leads; the two ends always total the turn so the page lands flat
    const base=c>=0?clamp(a-c/2,0,180-c):clamp(a-c/2,-c,180); T.leaf.style.transform=`rotateY(${r2(-d*base)}deg)`;   // the spine side stays down until the peel reaches it
    let phi=base, x=0; const sh=[];
    const shadeAt=p=>{ const cs=Math.cos(p*RAD); return {f:clamp((1-cs)*.3), b:clamp((1+cs)*.3)}; };
    sh.push(shadeAt(phi));
    T.strips.forEach((s,i)=>{
      const dlt=c*WT[i]/WS; if(i) s.st.style.transform=`rotateY(${r2(-d*dlt)}deg)`; else s.st.style.transform='none';
      if(i) phi+=dlt; x+=SW*Math.cos(phi*RAD); sh.push(shadeAt(phi+(i+1<NS?c*WT[i+1]/WS:0)));
    });
    T.strips.forEach((s,i)=>{
      const a0=sh[i], a1=sh[i+1], crease=i===0?.1*k:0;
      s.F.sh.style.opacity=r2((a0.f+a1.f)/2+crease); s.Bk.sh.style.opacity=r2((a0.b+a1.b)/2+crease);
    });
    // shadow on the page beneath: under the leaf while it is over that page, fading out past its edge
    const X=x, near=T.dir>0?castR:castL, far=T.dir>0?castL:castR, side=d>0?90:270;
    if(X>0){ const e=r2(X); near.style.background=`linear-gradient(${side}deg,rgba(15,14,13,${r2(.32*k)}) 0,rgba(15,14,13,${r2(.16*k)}) ${r2(Math.max(0,X-40))}px,rgba(15,14,13,${r2(.24*k)}) ${e}px,rgba(15,14,13,0) ${r2(X+90*k+10)}px)`; near.style.opacity=1; far.style.opacity=0; }
    else { const e=r2(-X); far.style.background=`linear-gradient(${side+180}deg,rgba(15,14,13,${r2(.3*k)}) 0,rgba(15,14,13,${r2(.14*k)}) ${r2(Math.max(0,-X-40))}px,rgba(15,14,13,${r2(.2*k)}) ${e}px,rgba(15,14,13,0) ${r2(-X+80*k+10)}px)`; far.style.opacity=1; near.style.opacity=0; }
  }
  function runTurn(complete,ease){
    const tt=T, a0=tt.a, a1=complete?180:0, dur=reduce?0:Math.max(260,1050*Math.abs(a1-a0)/180), s0=performance.now(), e=ease||out;
    cancelAnimationFrame(tt.raf);
    (function step(now){
      if(T!==tt) return;
      const k=dur?clamp((now-s0)/dur):1; setAngle(lerp(a0,a1,e(k)));
      if(k<1) tt.raf=requestAnimationFrame(step); else endTurn(complete);
    })(performance.now());
  }
  function endTurn(complete){
    const t=T; if(!t) return; T=null; cancelAnimationFrame(t.raf);
    t.leaf.remove(); castL.style.opacity=castR.style.opacity=0;
    if(complete){
      t.A.classList.remove('on','keepL','keepR'); t.A.style.zIndex=''; settle(t.A,false); t.B.style.zIndex='';
      leave(t.from); arrive(t.to,60);
    } else {
      t.B.classList.remove('on'); t.B.style.zIndex=''; settle(t.B,false);
      t.A.classList.remove('keepL','keepR'); t.A.style.zIndex='';
      cur=t.from; chrome(); setBg(t.from);
    }
  }

  /* ---------- going anywhere ---------- */
  function go(to){
    to=clamp(to,0,N-1);
    if(to===cur||mode==='moving'||D&&D.started) return;
    if(to===0){ closeBook(); return; }
    if(cur===0){ openTo(to); return; }
    if(PF){ if(PF.getState()!=='read') return; hold(to); hideHint();
      if(to===cur+1) PF.flipNext('bottom'); else if(to===cur-1) PF.flipPrev('bottom'); else PF.flip(2*(to-1),'bottom');
      return; }
    if(T) endTurn(true);
    startTurn(to); runTurn(true,t=>-(Math.cos(Math.PI*t)-1)/2);   // a slow sine: the page floats over
  }
  const next=()=>go(cur+1), prev=()=>go(cur-1);

  /* ---------- contents bar, preview and overview ---------- */
  const PREV_IMG={1:'img/hero.jpg',2:'img/research-soft.jpg'}, PREV_POS={1:'62% 22%',2:'50% 40%'};   // Contents: the cover painting; Introduction: the nave
  const toc=$('toc'), tocItems=[], btnPrev=$('prev'), btnNext=$('next'), preview=$('preview'), index=$('index');
  spreads.forEach((s,i)=>{
    if(!s.dataset.toc) return;
    const [a,b]=s.dataset.toc.split('|'), li=document.createElement('li'), btn=document.createElement('button');
    let text=a, cls='', num='';
    if(b!==undefined){ if(a==='sub'){ text=b; cls='sub'; } else { text=b; num=a; cls='ch'; } }
    if(i===N-1) cls+=' soon-ish';
    li.className=cls; btn.innerHTML='<i></i><span class="t"></span><em class="pgn"></em>'; btn.querySelector('.pgn').textContent=String(i*2).padStart(2,'0');
    btn.querySelector('i').textContent=num; btn.querySelector('.t').textContent=text;
    btn.addEventListener('click',()=>go(i));
    // V6: a square picture from the chapter itself rather than a miniature of the spread
    const pic=PREV_IMG[i]||(CHS.includes(i)?`img/ch/${String(i).padStart(2,'0')}.jpg`:'img/hero.jpg');
    const pre=new Image(); pre.src=pic;   // warm it so the hover is instant
    btn.addEventListener('mouseenter',()=>{
      const im=document.createElement('img'); im.src=pic; im.alt=''; im.decoding='async'; if(PREV_POS[i]) im.style.objectPosition=PREV_POS[i];
      preview.replaceChildren(im);
      const r=btn.getBoundingClientRect();
      preview.style.top=r2(clamp(r.top+r.height/2-88,16,innerHeight-192))+'px';
      preview.style.left=r2(index.getBoundingClientRect().left+288+12)+'px';
      preview.classList.add('on');
    });
    li.appendChild(btn); toc.appendChild(li); tocItems[i]=li;
  });
  index.addEventListener('mouseleave',()=>preview.classList.remove('on'));

  const ov=$('ov'), grid=$('ovGrid'), tiles=[];
  spreads.forEach((s,i)=>{
    const t=document.createElement('button'); t.className='tile'; t.style.setProperty('--i',i);
    const [a,b]=(s.dataset.toc||s.dataset.cap||'Cover').split('|');
    const ch=b!==undefined&&a!=='sub';
    t.innerHTML=`<div class="tv"></div><div class="tcap${ch?' ch':''}"><i>${ch?a:(i===0?'':'—')}</i><span></span></div>`;
    t.querySelector('span').textContent=i===0?'':(b===undefined?a:b);
    t.querySelector('.tv').appendChild(thumb(i));
    t.addEventListener('click',()=>{ closeOverview(); later(()=>go(i),260); });
    grid.appendChild(t); tiles.push(t);
  });
  function fitTiles(){ const w=tiles[0].querySelector('.tv').clientWidth; grid.style.setProperty('--k',(w/1120).toFixed(4)); }
  function openOverview(){ tiles.forEach((t,i)=>t.classList.toggle('on',i===cur)); ov.classList.add('on'); ov.setAttribute('aria-hidden','false'); fitTiles(); preview.classList.remove('on'); }
  function closeOverview(){ ov.classList.remove('on'); ov.setAttribute('aria-hidden','true'); }
  $('ovBtn').addEventListener('click',openOverview); $('ovClose').addEventListener('click',closeOverview);

  const hint=$('hint'); let turned=false;
  function hideHint(){ turned=true; hint.classList.add('gone'); }
  function chrome(){
    btnPrev.disabled=cur<=0; btnNext.disabled=cur>=N-1;
    let at=-1; tocItems.forEach((li,i)=>{ if(i<=cur) at=i; }); tocItems.forEach((li,i)=>li.classList.toggle('on',i===at));   // the section you are in
    renderV5();
    if(cur===0){ hint.innerHTML='<kbd>Drag</kbd> to turn the book <kbd>Click</kbd> to open'; hint.classList.remove('gone'); }
    else { hint.textContent=''; hint.classList.add('gone'); }   // no hint once the book is open
    history.replaceState(null,'','#'+(cur+1));
  }

  /* ---------- V5 chrome: chapter badge, chapter progress, the page block thickening on the left ---------- */
  const chip=$('chip'), segs=$('segs'), cnt=$('cnt'), ixCnt=$('ixCnt'), stackL=$('stackL'), stackR=$('stackR');
  const GROUPS=[{start:1,end:CHS[0]-1,n:'',t:'Front matter'}].concat(CHS.map((c,j)=>{ const [a,b]=spreads[c].dataset.toc.split('|'); return {start:c,end:(CHS[j+1]||N)-1,n:a,t:b}; }));
  GROUPS.forEach((g,j)=>{
    const b=document.createElement('button'); b.style.setProperty('--n',g.end-g.start+1); b.setAttribute('aria-label',(g.n?g.n+' · ':'')+g.t);
    b.style.setProperty('--c',j?PAIRS[(j-1)%PAIRS.length][1]:FRONT_PAIR[1]); b.addEventListener('click',()=>go(g.start)); g.el=b; segs.appendChild(b);
  });
  function renderV5(){
    const k=chOf(cur), total=N-1;
    if(cur>0){ const g=GROUPS[k+1]; $('chipN').textContent=g.n||'—'; $('chipT').textContent=k<0?(spreads[cur].dataset.cap||''):g.t; $('chipP').textContent=`${String(cur*2).padStart(2,'0')}–${String(cur*2+1).padStart(2,'0')}`; }
    GROUPS.forEach(g=>g.el.style.setProperty('--f',clamp((cur-g.start+1)/(g.end-g.start+1)).toFixed(3)));
    const txt=`${Math.max(cur,1)} / ${total}`; cnt.textContent=txt; ixCnt.textContent=txt;
    const f=clamp((cur-1)/(total-1)); stackL.style.width=r2(3+7*f)+'px'; stackR.style.width=r2(3+7*(1-f))+'px';
  }
  // background A (ambient painting) or B (solid colour with grain); remembered per viewer
  const bgt=$('bgt');
  function setBgMode(m){ ['a','b','c','e','f'].forEach(x=>body.classList.toggle('bg-'+x,m===x)); setAmb(cur); setTone(cur); bgt.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bg===m))); try{ localStorage.setItem('yir-v6-bg',m); }catch(_){} }
  bgt.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setBgMode(b.dataset.bg)));
  try{ const m=localStorage.getItem('yir-v6-bg'); if(/^[abcef]$/.test(m||'')) setBgMode(m); else if(m==='d') setBgMode('e'); }catch(_){}
  document.querySelectorAll('.acts a').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));

  /* ---------- input ---------- */
  btnPrev.addEventListener('click',prev); btnNext.addEventListener('click',next);
  $('restartIn')?.addEventListener('click',e=>{ e.stopPropagation(); go(0); });
  $('home').addEventListener('click',e=>{ e.preventDefault(); closeOverview(); go(0); });
  document.querySelectorAll('.ctas a').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));

  // grab a page and pull it across; a click without a pull turns it
  let D=null;
  const onDown=e=>{
    if(mode!=='open'||e.button>0||body.classList.contains('marking')||body.classList.contains('noting')||e.target.closest('a,button,.mapbox,.mk-tray,.dog,.sn,.sn-flag')) return;
    if(T) endTurn(true);
    const r=book.getBoundingClientRect();
    D={x0:e.clientX,y0:e.clientY,side:(e.clientX-r.left)>r.width/2?1:-1,w:r.width,lx:e.clientX,lt:performance.now(),v:0,id:e.pointerId,started:false};
  };
  book.addEventListener('pointerdown',onDown);
  addEventListener('pointermove',e=>{
    if(!D) return;
    const dx=e.clientX-D.x0;
    if(!D.started){
      if(Math.abs(dx)<8&&Math.abs(e.clientY-D.y0)<8) return;
      if(PF){ D=null; return; }   // a pull: StPageFlip has the page
      const dir=dx<0?1:-1, to=cur+dir;
      if(dir!==D.side||to<1||to>N-1){ D=null; return; }
      startTurn(to); D.started=true; try{ book.setPointerCapture(D.id); }catch(_){}
    }
    const now=performance.now(); D.v=(e.clientX-D.lx)/Math.max(1,now-D.lt); D.lx=e.clientX; D.lt=now;
    setAngle(clamp(Math.abs(dx)/(D.w*.7)*180,0,180));
  });
  const release=e=>{
    if(!D) return; const d=D; D=null;
    if(!d.started){ if(e.type==='pointerup'&&Math.abs(e.clientX-d.x0)<8&&Math.abs(e.clientY-d.y0)<8) d.side>0?next():prev(); return; }
    const fling=-d.v*T.dir;
    runTurn(fling>.35||(T.a>80&&fling>-.35));
  };
  addEventListener('pointerup',release); addEventListener('pointercancel',release);

  addEventListener('keydown',e=>{
    if(e.target&&(e.target.isContentEditable||/^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;   // typing in a note
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(body.classList.contains('intro-on')){ endIntro(); return; }
    const k=e.key;
    if(k==='Escape'){ closeOverview(); return; }
    if(k==='o'||k==='O'){ ov.classList.contains('on')?closeOverview():openOverview(); return; }
    if(ov.classList.contains('on')) return;
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(k)){ e.preventDefault(); next(); }
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(k)){ e.preventDefault(); prev(); }
    else if(k==='Home'){ e.preventDefault(); go(0); } else if(k==='End'){ e.preventDefault(); go(N-1); }
  });
  let wheelLock=0, acc=0;
  addEventListener('wheel',e=>{
    if(ov.classList.contains('on')) return;
    e.preventDefault(); const now=performance.now();
    if(mode==='closed'){ const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY; spin+=d*(e.deltaMode===1?6:.35); spinV=0; lastTouch=now; return; }
    if(now<wheelLock){ wheelLock=now+240; return; }
    acc+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(Math.abs(acc)>30){ acc>0?next():prev(); acc=0; wheelLock=now+700; }
  },{passive:false});

  // the label that rides with the pointer
  const cursor=$('cursor'), cursorT=$('cursorT');
  addEventListener('pointermove',e=>{
    cursor.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
    let txt='';
    if(e.target.closest&&!body.classList.contains('marking')&&!e.target.closest('a,button,.mapbox,.index,.ov,.landing,.seg,.prog,.chip,.mk-tray,.mk-sheet')){
      if(mode==='closed'&&e.target.closest('#b3')) txt=grab&&grab.moved?'':'Open';
      else if(mode==='open'&&(e.target.closest('.sn,.sn-flag')||body.classList.contains('noting'))) txt='';
      else if(mode==='open'&&!D&&!T&&e.target.closest('.dog')) txt=e.target.closest('.pg').classList.contains('bm')?'Unfold':'Bookmark';
      else if(mode==='open'&&!D&&e.target.closest('#book')&&!(PF&&PF.getState()!=='read')){
        const r=book.getBoundingClientRect(), right=(e.clientX-r.left)>r.width/2;
        txt=right?(cur<N-1?'Next':''):(cur===1?'Close':'Back');
      }
    }
    if(txt) cursorT.textContent=txt;
    cursor.classList.toggle('on',!!txt);
  });
  document.addEventListener('pointerleave',()=>cursor.classList.remove('on'));

  /* ---------- intro: the wordmark writes on beneath the monogram and the flourishes unfurl; then the
     title page recedes as one piece, the book rises, and the corner marks surface in place ---------- */
  const ist=$('ist'), w1=$('w1'), w2=$('w2'), monoC=$('monoC'); let introTimers=[];
  [w1,w2].forEach((w,k)=>{ const ln=w.querySelector('.ln'); let n=0; ln.innerHTML=[...ln.textContent].map(c=>c===' '?' ':`<i style="--i:${n++ + k*4}">${c}</i>`).join(''); });
  function runIntro(){
    if(!body.classList.contains('intro-on')) return;   // skipped before the type loaded
    const at=(fn,ms)=>introTimers.push(setTimeout(fn,ms));
    at(()=>body.classList.add('intro-a'),60);
    at(()=>body.classList.add('intro-f'),900);
    at(()=>body.classList.add('intro-x'),2600);   // the title page recedes in place
    at(()=>body.classList.add('intro-b'),3100);   // the book rises into the space
    at(()=>body.classList.add('intro-c'),3700);   // the corner marks, the lede, the contents bar surface
    at(endIntro,5600);
  }
  function endIntro(){
    introTimers.forEach(clearTimeout); introTimers=[];
    body.classList.remove('intro-on','intro-a','intro-f','intro-x','intro-b','intro-c');
  }
  ['pointerdown','wheel'].forEach(ev=>addEventListener(ev,()=>{ if(body.classList.contains('intro-on')) endIntro(); },{capture:true}));

  // the markup tools (markup5.js) read where the reader is and can move them
  window.YIR={get cur(){return cur},get mode(){return mode},get turning(){return !!T},go,N,spreads};

  /* ---------- V6: pages turn with StPageFlip (MIT, github.com/Nodlik/StPageFlip) ----------
     Every leaf of spreads 1..N-1 moves into the flip book, so its redlines, folded corner and notes curl
     with the paper. The layer sits inside .book at screen scale (scale(1/s)) so the library's pointer
     maths are in real pixels; each page is the original 560×800 .pg scaled back up by --s. The sections
     stay as an empty layer above it, holding the notes' tabs. */
  let PF=null;
  // the spread in hand is finished; the ones either side wait with their rules undrawn and figures at rest,
  // so a turn reveals them still, and they draw in once the page has landed
  const hold=j=>{ if(j<1||j>=N) return; const ps=pages(spreads[j]).filter(Boolean); if(ps.every(p=>p.classList.contains('vis')&&!p.classList.contains('in'))) return;
    ps.forEach(p=>{ p.classList.add('fxhold','vis'); p.classList.remove('in','done'); }); const pl=PLAY[spreads[j].dataset.play]; if(pl) pl.reset(j);
    void ps[0]&&ps[0].offsetWidth; setTimeout(()=>ps.forEach(p=>p.classList.remove('fxhold')),40); };
  const play=j=>pages(spreads[j]).forEach(p=>{ if(!p) return; p.classList.remove('done','fxhold'); p.classList.add('vis','in'); });
  const prime=(i,anim)=>{ for(let j=Math.max(1,i-1);j<=Math.min(N-1,i+1);j++){
    if(j!==i){ hold(j); continue; }
    if(anim) play(j); else pages(spreads[j]).forEach(p=>p&&p.classList.add('vis','in','done')); } };
  if(window.St&&St.PageFlip){
    const host=document.createElement('div'); host.className='pf'; host.id='pf'; book.appendChild(host);
    const leaves=[];
    spreads.forEach((sp,i)=>{
      if(!i) return;
      const two=[sp.querySelector('.pg.l'),sp.querySelector('.pg.r')]; sp._pg=two;
      two.forEach(pg=>{ const w=document.createElement('div'); w.className='pf-page '+(pg.classList.contains('l')?'l':'r'); w.appendChild(pg); leaves.push(w); });
      // the add-on scripts (redline, bookmarks, notes) still ask a spread for its pages
      const qs=Element.prototype.querySelector, qsa=Element.prototype.querySelectorAll;
      sp.querySelector=sel=>{ for(const pg of two){ if(pg.matches(sel)) return pg; const q=qs.call(pg,sel); if(q) return q; } return qs.call(sp,sel); };
      sp.querySelectorAll=sel=>{ const out=[]; two.forEach(pg=>{ if(pg.matches(sel)) out.push(pg); out.push(...qsa.call(pg,sel)); }); out.push(...qsa.call(sp,sel)); return out; };
    });
    window.__pfSize=()=>{ const k=parseFloat(getComputedStyle(root).getPropertyValue('--s'))||1;
      host.style.width=r2(1120*k)+'px'; host.style.height=r2(800*k)+'px'; host.style.transform=`scale(${(1/k).toFixed(5)})`;
      if(PF) PF.update(); };
    window.__pfSize();
    PF=new St.PageFlip(host,{width:560,height:800,size:'stretch',minWidth:80,maxWidth:5000,minHeight:114,maxHeight:7200,autoSize:true,
      showCover:false,usePortrait:false,drawShadow:true,maxShadowOpacity:.42,flippingTime:950,disableFlipByClick:true,
      showPageCorners:true,mobileScrollSupport:false,startZIndex:1,swipeDistance:40});
    PF.loadFromHTML(leaves);
    // the pen, the scissors, notes, a folded corner and links keep the pointer to themselves
    const mine=e=>body.classList.contains('marking')||body.classList.contains('noting')||mode!=='open'||(e.target.closest&&e.target.closest('a,button,.mapbox,.dog,.sn,.sn-flag'));
    ['mousedown','touchstart'].forEach(ev=>host.addEventListener(ev,e=>{ if(mine(e)) e.stopPropagation(); },true));
    host.addEventListener('pointerdown',onDown);
    PF.on('changeState',e=>{ if(e.data==='flipping') flipSound(); if(e.data==='user_fold'||e.data==='fold_corner') prime(cur); });
    PF.on('flip',e=>{
      const to=Math.floor(e.data/2)+1; if(to===cur||mode!=='open') return;
      const from=cur; leave(from); spreads[from].classList.remove('on'); spreads[to].classList.add('on');
      cur=to; chrome(); setBg(to); hideHint(); prime(to,true); arrive(to,60);
    });
  }

  /* ---------- start ---------- */
  addEventListener('resize',size); size();
  cur=0; mode='closed'; body.classList.add('show3d'); setBg(0); chrome(); startPose();
  if(!reduce){
    body.classList.add('intro-on');   // hold the stage empty until the type has loaded
    Promise.race([document.fonts.ready,new Promise(res=>setTimeout(res,1500))]).then(runIntro);
  }
  setTimeout(()=>body.classList.remove('preload'),60);
  addEventListener('hashchange',()=>{ const n=parseInt(location.hash.slice(1),10); if(n>=1&&n<=N&&n-1!==cur) go(n-1); });
})();
