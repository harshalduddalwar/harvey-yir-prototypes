/* Prototype F, scroll version. Scrolling plays a prologue: the monogram alone, its flourishes unfurl, it rises
   to the top over the lede, the wordmark writes on, then the wordmark drops to the foot of the page as the
   book slides up into view. Scroll once more (or click) to open; the contents bar fades in as it opens, and
   from there the book behaves exactly as in F.
   Prototype F: intro monogram and wordmark → a 3D book on the desk (drag to turn it, click to open) → an immersive
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
  let S=1;
  function size(){
    const W=innerWidth, H=innerHeight, mx=W>760?128:12, my=W>760?112:12;   // room above for the monogram, below for the wordmark
    S=Math.max(.2,Math.min((W-2*mx)/1120,(H-2*my)/800));
    root.style.setProperty('--s',S.toFixed(4));
    if(ov.classList.contains('on')) fitTiles();
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
  const pages=s=>[s.querySelector('.pg.l'),s.querySelector('.pg.r')];
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
        if(false&&e.k==='n'){   // figures appear as printed: no counting up
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
      tween(1300,t=>{ cntTo(o,out(t)); if(t>=1){ o.c.style.transitionDelay='0s'; o.sl.style.opacity=1; o.c.style.opacity=0; } },o.d+250); }); },
    reset(i){ NUMS.forEach(o=>{ if(i!==undefined&&o.i!==i) return; fitN(o); o.sl.style.opacity=0; o.c.style.opacity=''; o.c.style.transitionDelay=''; cntTo(o,0); }); },
    done(){ NUMS.forEach(o=>{ o.sl.style.opacity=1; o.c.style.opacity=0; cntTo(o,1); }); }
  } };
  document.fonts&&document.fonts.ready.then(()=>NUMS.forEach(o=>{ o.fit=0; }));

  Object.values(PLAY).forEach(p=>p.done());
  const tpl=spreads.map((s,i)=>{
    if(i===0){ const c=document.createElement('div'); c.style.cssText='position:absolute;left:280px;top:0;width:560px;height:800px;overflow:hidden';
      c.appendChild(strip($('cv').cloneNode(true))); c.firstChild.style.cssText='position:absolute;inset:0'; return c; }
    const c=strip(s.cloneNode(true)); c.classList.add('on'); c.querySelectorAll('.pg').forEach(p=>p.classList.add('vis','in')); return c;
  });
  Object.values(PLAY).forEach(p=>p.reset());
  const thumb=(i,k)=>{ const w=document.createElement('div'); w.className='thumb'; w.style.transform=k?`scale(${k})`:''; w.appendChild(tpl[i].cloneNode(true)); return w; };

  /* ---------- the 3D book on the desk ---------- */
  const b3=$('b3'), hinge=$('hinge'), inL=$('inL'), blk=$('blk'), glare=$('glare'), gshadow=$('gshadow');
  const gcontact=$('gcontact'), cvEl=$('cv');
  // geometry: 560×800 boards 4px thick, a 48px page block inset 6px at the fore-edge and 5px at head and
  // tail, and a spine bowed out 7px in three facets. Each face carries its outward normal for lighting.
  const G={W:560,H:800,T:4,D:56};
  function place(el,l,t,w,h,tf,n){ Object.assign(el.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px',transform:tf}); el.dataset.n=n.join(','); return el; }
  function add(parent,cls,...geo){ const f=document.createElement('div'); f.className='f '+cls; parent.appendChild(f); return geo.length?place(f,...geo):f; }
  function facet(el,p,q){   // a facet from point p to q in the x/z plane, full height
    const dx=q[0]-p[0], dz=q[1]-p[1], L=Math.hypot(dx,dz), b=Math.atan2(-dz,dx);
    return place(el,0,0,r2(L),G.H,`translate3d(${r2((p[0]+q[0])/2-L/2)}px,0,${r2((p[1]+q[1])/2)}px) rotateY(${b.toFixed(4)}rad)`,[Math.sin(b),0,Math.cos(b)].map(v=>+v.toFixed(4)));
  }
  const SP=[[0,-G.D],[-7,-G.D+10],[-7,-10],[0,0]];
  facet(add(b3,'sb'),SP[0],SP[1]); facet($('spC'),SP[1],SP[2]); facet(add(b3,'sb'),SP[2],SP[3]);
  const bodyZ=-(G.D/2), bodyD=G.D-2*G.T;   // page block between the boards
  add(b3,'ed',614-bodyD/2,5,bodyD,790,`translateZ(${bodyZ}px) rotateY(90deg)`,[1,0,0]);
  add(b3,'tp',3,5-bodyD/2,611,bodyD,`translateZ(${bodyZ}px) rotateX(90deg)`,[0,-1,0]);
  add(b3,'bt',3,795-bodyD/2,611,bodyD,`translateZ(${bodyZ}px) rotateX(-90deg)`,[0,1,0]);
  // board edges: the front board's travel with the hinge
  [[hinge,-G.T/2],[b3,-G.D+G.T/2]].forEach(([parent,z])=>{
    add(parent,'be',G.W-G.T/2,0,G.T,G.H,`translateZ(${z}px) rotateY(90deg)`,[1,0,0]);
    add(parent,'be',0,-G.T/2,G.W,G.T,`translateZ(${z}px) rotateX(90deg)`,[0,-1,0]);
    add(parent,'be',0,G.H-G.T/2,G.W,G.T,`translateZ(${z}px) rotateX(-90deg)`,[0,1,0]);
  });
  $('cv').dataset.n='0,0,1'; b3.querySelector('.bk').dataset.n='0,0,-1';
  const lit=[...b3.querySelectorAll('[data-n]')].map(el=>({el,n:el.dataset.n.split(',').map(Number),hinged:hinge.contains(el)}));
  const LIGHT=(v=>{ const m=Math.hypot(...v); return v.map(x=>x/m); })([-.38,-.52,.76]);
  const BASE_Y=24, BASE_X=-8;
  const FRONT='translate3d(0px,0px,0px) scale(1) rotateX(0deg) rotateY(0deg)';
  const pose=(ry,rx,ty)=>`translate3d(-280px,${r2(ty)}px,0px) scale(.68) rotateX(${r2(rx)}deg) rotateY(${r2(ry)}deg)`;
  let spin=0, spinV=0, tilt={x:0,y:0}, aim={x:0,y:0}, posing=false, t0=0, lastTouch=0, ry=BASE_Y, rx=BASE_X, ty=0;
  let grab=null, live=0;
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
    ry=BASE_Y+spin+tilt.y+Math.sin(t*.55)*3; rx=BASE_X+tilt.x+Math.sin(t*.8)*1.2; ty=Math.sin(t*1.05)*7;
    // V2: the book stays flat and square to the screen: no turn, no tilt, no float
    ry=0; rx=0; ty=0;
    b3.style.transform=pose(ry,rx,ty); shade(ry,rx);
    gshadow.style.transform=`scale(${r2(1-ty/120)},1)`; gshadow.style.opacity=r2(.85-ty/40);
    gcontact.style.transform=`scale(${r2(1-ty/50)},1)`; gcontact.style.opacity=r2(.75-ty/14);
    requestAnimationFrame(frame);
  }
  function startPose(){ if(posing) return; posing=true; t0=performance.now(); tilt={x:0,y:0}; requestAnimationFrame(frame); }
  addEventListener('mousemove',e=>{ if(mode!=='closed') return; aim.y=(e.clientX/innerWidth-.5)*16; aim.x=-(e.clientY/innerHeight-.5)*10; });

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
  function openTo(i){
    mode='moving'; posing=false; body.classList.remove('closed');
    Pt=P=1; holdWheel(); animO(1,1300);
    setInside(i);
    b3.style.transition='none'; b3.style.transform=pose(normY(ry),rx,ty); void b3.offsetWidth;
    b3.style.transition=`transform ${reduce?0:.8}s cubic-bezier(.55,.05,.25,1)`; b3.style.transform=FRONT;
    gshadow.style.opacity=0; gcontact.style.opacity=0; shade(0,0);
    later(()=>{ hingeTo(180,900); setBg(i); setArt(i); },520);
    later(()=>{
      spreads.forEach(s=>{ s.classList.remove('on'); settle(s,false); });
      const B=spreads[i]; B.classList.add('on'); settle(B,true);
      body.classList.add('open'); body.classList.remove('show3d');
      cur=i; chrome(); arrive(i,120); mode='open';
    },reduce?0:1400);
    cur=i; chrome();
  }

  /* close: the reverse, from whatever spread is open */
  function closeBook(){
    if(T) endTurn(true);
    const from=cur; mode='moving';
    holdWheel(); animO(0,1300,150);
    setInside(from);
    b3.style.transition='none'; b3.style.transform=FRONT; setHinge(180); shade(0,0);
    void b3.offsetWidth;
    body.classList.add('show3d'); body.classList.remove('open');
    leave(from); spreads[from].classList.remove('on'); settle(spreads[from],false);
    cur=0; chrome(); setBg(0); setArt(0);
    requestAnimationFrame(()=>hingeTo(0,800));
    later(()=>{ spin=0; spinV=0; b3.style.transition=`transform ${reduce?0:.95}s cubic-bezier(.45,.05,.3,1)`; b3.style.transform=pose(0,0,0); gshadow.style.opacity=.85; gcontact.style.opacity=.75; },reduce?0:620);
    later(()=>{ body.classList.add('closed'); },900);
    later(()=>{ b3.style.transition='none'; mode='closed'; startPose(); },reduce?0:1600);
  }

  /* ---------- the flat book: turning leaves ---------- */
  const book=$('book'), turns=$('turns'), castL=$('castL'), castR=$('castR');
  function settle(s,on){ pages(s).forEach(p=>{ p.classList.toggle('vis',on); p.classList.toggle('in',on); if(!on) p.classList.remove('done'); }); }
  function leave(i){ if(i<1) return; killTweens(); const p=PLAY[spreads[i].dataset.play]; if(p) p.reset(i); }
  function arrive(i,delay){ const p=PLAY[spreads[i].dataset.play]; if(p) later(()=>{ if(cur===i&&!T&&mode==='open') p.run(i); },delay); }
  const setBg=i=>root.style.setProperty('--bg',i===0?'var(--desk)':'#BEC4AE');
  // the room behind the open book: the painting from the chapter you are in, crossfading as you enter the next
  const artL=[...document.querySelectorAll("#art i")], CHS=spreads.map((s,i)=>/^[IVX]+\|/.test(s.dataset.toc||'')?i:-1).filter(i=>i>0);
  let artKey='', artN=0;
  function setArt(i){
    if(i<1) return;
    const c=CHS.filter(k=>k<=i).pop()??CHS[0], key=String(c).padStart(2,'0'); if(key===artKey) return; artKey=key;
    const el=artL[artN=1-artN], other=artL[1-artN], im=new Image();
    im.onload=()=>{ if(artKey!==key) return; el.style.backgroundImage=`url(${im.src})`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); other.classList.remove('on'); };
    im.src=`img/ch/${key}.jpg`;
  }

  /* turning, V2: no leaf. The next spread simply arrives over the one you are on, a quiet crossfade
     (its text then settles in as usual). A drag scrubs the same fade; a click or a key plays it. */
  let T=null;
  function startTurn(to){
    const from=cur, A=spreads[from], B=spreads[to], dir=to>from?1:-1;
    B.classList.add('on'); settle(B,true); B.style.zIndex=2; B.style.opacity=0; A.style.zIndex=1;
    T={from,to,A,B,dir,a:0,raf:0};
    cur=to; chrome(); setBg(to); setArt(to); hideHint();
    return T;
  }
  function setAngle(a){ T.a=a; T.B.style.opacity=r2(clamp(a/180)); }
  function runTurn(complete,ease){
    const tt=T, a0=tt.a, a1=complete?180:0, dur=reduce?0:Math.max(160,700*Math.abs(a1-a0)/180), s0=performance.now(), e=ease||io;
    cancelAnimationFrame(tt.raf);
    (function step(now){
      if(T!==tt) return;
      const k=dur?clamp((now-s0)/dur):1; setAngle(lerp(a0,a1,e(k)));
      if(k<1) tt.raf=requestAnimationFrame(step); else endTurn(complete);
    })(performance.now());
  }
  function endTurn(complete){
    const t=T; if(!t) return; T=null; cancelAnimationFrame(t.raf);
    t.A.style.zIndex=t.B.style.zIndex=''; t.B.style.opacity='';
    if(complete){
      t.A.classList.remove('on'); settle(t.A,false);
      leave(t.from); arrive(t.to,60);
    } else {
      t.B.classList.remove('on'); settle(t.B,false);
      cur=t.from; chrome(); setBg(t.from); setArt(t.from);
    }
  }

  /* ---------- going anywhere ---------- */
  function go(to){
    to=clamp(to,0,N-1);
    if(to===cur||mode==='moving'||D&&D.started) return;
    if(to===0){ closeBook(); return; }
    if(cur===0){ openTo(to); return; }
    if(T) endTurn(true);
    startTurn(to); runTurn(true,io);
  }
  const next=()=>go(cur+1), prev=()=>go(cur-1);

  /* ---------- contents bar, preview and overview ---------- */
  const toc=$('toc'), tocItems=[], btnPrev=$('prev'), btnNext=$('next'), preview=$('preview'), index=$('index');
  spreads.forEach((s,i)=>{
    if(!s.dataset.toc) return;
    const [a,b]=s.dataset.toc.split('|'), li=document.createElement('li'), btn=document.createElement('button');
    let text=a, cls='', num='';
    if(b!==undefined){ if(a==='sub'){ text=b; cls='sub'; } else { text=b; num=a; cls='ch'; } }
    if(i===N-1) cls+=' soon-ish';
    li.className=cls; btn.innerHTML='<i></i><span class="t"></span>';
    btn.querySelector('i').textContent=num; btn.querySelector('.t').textContent=text;
    btn.addEventListener('click',()=>go(i));
    btn.addEventListener('mouseenter',()=>{
      preview.replaceChildren(thumb(i,.2));
      const r=btn.getBoundingClientRect();
      preview.style.top=r2(clamp(r.top+r.height/2-80,16,innerHeight-176))+'px';
      preview.style.left=r2(index.getBoundingClientRect().left+262+14)+'px';
      preview.classList.add('on');
    });
    li.appendChild(btn); toc.appendChild(li); tocItems[i]=li;
  });
  index.addEventListener('mouseleave',()=>preview.classList.remove('on'));

  /* overview, V2: an endless canvas. The spreads repeat in staggered columns forever in every direction;
     drag, scroll or swipe to wander, with a little momentum. Only the tiles in view exist in the DOM. */
  const ov=$('ov'), grid=$('ovGrid');
  const TW=300, TH=TW*800/1120, CAP=42, GX=56, GY=40, CW=TW+GX, CH=TH+CAP+GY, TK=TW/1120;
  const cells=new Map(); let cam={x:0,y:0}, vel={x:0,y:0}, ovRaf=0, odrag=null, dragged=false, entering=false;
  const mod=(a,n)=>((a%n)+n)%n;
  const idxAt=(c,r)=>mod(c*3+r,N);
  const yOff=c=>mod(c,2)?CH*.5:0;
  function makeCell(c,r,delay){
    const i=idxAt(c,r), s=spreads[i], [a,b]=(s.dataset.toc||s.dataset.cap||'Cover').split('|'), ch=b!==undefined&&a!=='sub';
    const cell=document.createElement('div'); cell.className='cell';
    const t=document.createElement('button'); t.className='tile'+(i===cur?' on':'')+(i===0?' cv0':''); t.style.setProperty('--i',delay);
    t.innerHTML=`<div class="tv"></div><div class="tcap${ch?' ch':''}"><i>${ch?a:(i===0?'':'—')}</i><span></span></div>`;
    t.querySelector('span').textContent=b===undefined?a:b;
    const tv=t.querySelector('.tv'); tv.style.background=i===0?'var(--desk)':'var(--cream)'; tv.appendChild(thumb(i,TK));
    t.addEventListener('click',()=>{ if(dragged) return; closeOverview(); later(()=>go(i),260); });
    cell.appendChild(t); grid.appendChild(cell); return cell;
  }
  function layout(){
    const W=innerWidth, H=innerHeight, seen=new Set();
    const c0=Math.floor((cam.x-W/2)/CW)-1, c1=Math.ceil((cam.x+W/2)/CW)+1;
    for(let c=c0;c<=c1;c++){
      const oy=yOff(c), r0=Math.floor((cam.y-H/2-oy)/CH)-1, r1=Math.ceil((cam.y+H/2-oy)/CH)+1;
      for(let r=r0;r<=r1;r++){
        const key=c+','+r, x=W/2+c*CW-TW/2-cam.x, y=H/2+r*CH+oy-TH/2-cam.y; seen.add(key);
        let cell=cells.get(key);
        if(!cell){ cell=makeCell(c,r,entering?Math.round(Math.hypot(x+TW/2-W/2,y+TH/2-H/2)/90):0); cells.set(key,cell); }
        cell.style.transform=`translate3d(${r2(x)}px,${r2(y)}px,0)`;
      }
    }
    for(const [k,cell] of cells) if(!seen.has(k)){ cell.remove(); cells.delete(k); }
  }
  function glide(){
    cancelAnimationFrame(ovRaf);
    (function st(){
      if(odrag||!ov.classList.contains('on')) return;
      vel.x*=.94; vel.y*=.94; cam.x+=vel.x; cam.y+=vel.y; layout();
      if(Math.hypot(vel.x,vel.y)>.15) ovRaf=requestAnimationFrame(st);
    })();
  }
  ov.addEventListener('pointerdown',e=>{
    if(e.button>0||e.target.closest('.ov-head')) return;
    cancelAnimationFrame(ovRaf); vel={x:0,y:0}; dragged=false;
    odrag={x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,lt:performance.now()}; ov.classList.add('grabbing');
  });
  addEventListener('pointermove',e=>{
    if(!odrag) return;
    const now=performance.now(), dt=Math.max(8,now-odrag.lt), dx=e.clientX-odrag.lx, dy=e.clientY-odrag.ly;
    if(Math.hypot(e.clientX-odrag.x0,e.clientY-odrag.y0)>5) dragged=true;
    cam.x-=dx; cam.y-=dy; vel={x:-dx/dt*16,y:-dy/dt*16}; odrag.lx=e.clientX; odrag.ly=e.clientY; odrag.lt=now; layout();
  });
  const odrop=()=>{ if(!odrag) return; odrag=null; ov.classList.remove('grabbing'); glide(); setTimeout(()=>{ dragged=false; },0); };
  addEventListener('pointerup',odrop); addEventListener('pointercancel',odrop);
  ov.addEventListener('wheel',e=>{
    e.preventDefault(); cancelAnimationFrame(ovRaf); vel={x:0,y:0};
    const m=e.deltaMode===1?16:1; let dx=e.deltaX*m, dy=e.deltaY*m;
    if(e.shiftKey&&!dx){ dx=dy; dy=0; }
    cam.x+=dx; cam.y+=dy; layout();
  },{passive:false});
  function fitTiles(){ layout(); }
  function openOverview(){
    for(const cell of cells.values()) cell.remove(); cells.clear();
    cam={x:0,y:cur*CH}; vel={x:0,y:0}; entering=true; layout(); entering=false;
    void ov.offsetWidth; ov.classList.add('on'); ov.setAttribute('aria-hidden','false'); preview.classList.remove('on');
  }
  function closeOverview(){
    if(!ov.classList.contains('on')) return;
    ov.classList.remove('on'); ov.setAttribute('aria-hidden','true'); cancelAnimationFrame(ovRaf);
    setTimeout(()=>{ if(!ov.classList.contains('on')){ for(const cell of cells.values()) cell.remove(); cells.clear(); } },400);
  }
  $('ovBtn').addEventListener('click',openOverview); $('ovClose').addEventListener('click',closeOverview);

  const hint=$('hint'); let turned=false;
  function hideHint(){ turned=true; hint.classList.add('gone'); }
  function chrome(){
    btnPrev.disabled=cur<=0; btnNext.disabled=cur>=N-1;
    let at=-1; tocItems.forEach((li,i)=>{ if(i<=cur) at=i; }); tocItems.forEach((li,i)=>li.classList.toggle('on',i===at));   // the section you are in
    if(cur===0){ hint.textContent='Scroll or click to open'; hint.classList.remove('gone'); }
    else { hint.textContent='Click either side to turn the page'; hint.classList.toggle('gone',turned); }
    history.replaceState(null,'','#'+(cur+1));
  }

  /* ---------- input ---------- */
  btnPrev.addEventListener('click',prev); btnNext.addEventListener('click',next);
  $('restartIn')?.addEventListener('click',e=>{ e.stopPropagation(); go(0); });
  $('home').addEventListener('click',e=>{ e.preventDefault(); closeOverview(); go(0); });
  document.querySelectorAll('.ctas a').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));

  // grab a page and pull it across; a click without a pull turns it
  let D=null;
  book.addEventListener('pointerdown',e=>{
    if(mode!=='open'||e.button>0||e.target.closest('a,button,.mapbox')) return;
    if(T) endTurn(true);
    const r=book.getBoundingClientRect();
    D={x0:e.clientX,y0:e.clientY,side:(e.clientX-r.left)>r.width/2?1:-1,w:r.width,lx:e.clientX,lt:performance.now(),v:0,id:e.pointerId,started:false};
  });
  addEventListener('pointermove',e=>{
    if(!D) return;
    const dx=e.clientX-D.x0;
    if(!D.started){
      if(Math.abs(dx)<8) return;
      const dir=dx<0?1:-1, to=cur+dir;
      if(dir!==D.side||to<1||to>N-1){ D=null; return; }
      startTurn(to); D.started=true; try{ book.setPointerCapture(D.id); }catch(_){}
    }
    const now=performance.now(); D.v=(e.clientX-D.lx)/Math.max(1,now-D.lt); D.lx=e.clientX; D.lt=now;
    setAngle(clamp(Math.abs(dx)/(D.w*.45)*180,0,180));
  });
  const release=e=>{
    if(!D) return; const d=D; D=null;
    if(!d.started){ if(e.type==='pointerup'&&Math.abs(e.clientX-d.x0)<8&&Math.abs(e.clientY-d.y0)<8) d.side>0?next():prev(); return; }
    const fling=-d.v*T.dir;
    runTurn(fling>.35||(T.a>80&&fling>-.35),out);
  };
  addEventListener('pointerup',release); addEventListener('pointercancel',release);

  addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key;
    if(k==='Escape'){ closeOverview(); return; }
    if(k==='o'||k==='O'){ ov.classList.contains('on')?closeOverview():openOverview(); return; }
    if(ov.classList.contains('on')) return;
    if(mode==='closed'){
      if(intro) { if(k!=='Tab') e.preventDefault(); return; }
      if(['ArrowRight','ArrowDown','PageDown',' '].includes(k)){ e.preventDefault(); if(Pt>=.999) go(1); else { Pt=STOPS.find(v=>v>Pt+.01); dirty=true; } }
      else if(['ArrowLeft','ArrowUp','PageUp'].includes(k)){ e.preventDefault(); Pt=[...STOPS].reverse().find(v=>v<Pt-.01)??0; dirty=true; }
      else if(k==='Home'){ e.preventDefault(); Pt=0; dirty=true; } else if(k==='End'){ e.preventDefault(); Pt=1; dirty=true; }
      return;
    }
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(k)){ e.preventDefault(); next(); }
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(k)){ e.preventDefault(); prev(); }
    else if(k==='Home'){ e.preventDefault(); go(0); } else if(k==='End'){ e.preventDefault(); go(N-1); }
  });
  let wheelLock=0, acc=0, gate=false, lastW=0, over=0;
  function holdWheel(){ gate=true; lastW=performance.now(); }
  function scrub(dy){
    if(mode!=='closed'||intro) return;
    if(Pt>=1&&dy>0){ over+=dy; if(over>110){ over=0; go(1); } return; }
    over=0; const was=Pt; Pt=clamp(Pt+dy/2400); dirty=true;
    if(was<1&&Pt>=1) holdWheel();   // a detent at the end, so one long swipe doesn't also open the book
  }
  addEventListener('wheel',e=>{
    if(ov.classList.contains('on')) return;
    e.preventDefault(); const now=performance.now(), gap=now-lastW; lastW=now;
    if(gate){ if(gap<220) return; gate=false; }
    if(mode==='closed'){ const d=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX; scrub(e.deltaMode===1?d*16:d); return; }
    if(mode!=='open') return;
    if(now<wheelLock){ wheelLock=now+240; return; }
    acc+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(Math.abs(acc)>30){ acc>0?next():prev(); acc=0; wheelLock=now+700; }
  },{passive:false});

  // the label that rides with the pointer
  const cursor=$('cursor'), cursorT=$('cursorT');
  addEventListener('pointermove',e=>{
    cursor.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
    let txt='';
    if(e.target.closest&&!e.target.closest('a,button,.mapbox,.index,.ov,.vt,.pro')){
      if(mode==='closed'&&e.target.closest('#b3')) txt=grab&&grab.moved?'':'Open';
      else if(mode==='open'&&!D&&e.target.closest('#book')){
        const r=book.getBoundingClientRect(), right=(e.clientX-r.left)>r.width/2;
        txt=right?(cur<N-1?'Next':''):(cur===1?'Close':'Back');
      }
    }
    if(txt) cursorT.textContent=txt;
    cursor.classList.toggle('on',!!txt);
  });
  document.addEventListener('pointerleave',()=>cursor.classList.remove('on'));

  /* ---------- the scroll prologue ----------
     P runs 0→1 with the scroll (smoothed); O runs 0→1 as the book opens and hands the monogram to the
     bottom-left corner, the wordmark to the lockup, and the page to the contents bar. */
  const monoC=$('monoC'), mf=monoC.querySelector('.mf'), lede=$('lede'), w1=$('w1'), w2=$('w2'), cue=$('cue'), persp=$('persp'), home=$('home');
  home.style.display='none';
  [monoC,w1,w2].forEach(el=>el.addEventListener('click',()=>{ if(mode==='open'){ closeOverview(); go(0); } }));
  monoC.addEventListener('mouseenter',()=>{ hvT=1; }); monoC.addEventListener('mouseleave',()=>{ hvT=0; });
  const STOPS=[0,.16,.4,.56,.7,1];
  let P=0, Pt=0, O=0, dirty=true, oRaf=0, hv=0, hvT=0, intro=true;
  const IEND=.4;   // the intro plays itself up to here: monogram, flourish, the wordmark written in the middle
  const chars=[];
  [w1,w2].forEach((w,k)=>{ const ln=w.querySelector('.ln'); let n=0;
    ln.innerHTML=[...ln.textContent].map(c=>c===' '?' ':`<i data-i="${n++ + k*4}">${c}</i>`).join('');
    ln.querySelectorAll('i').forEach(el=>chars.push([el,+el.dataset.i])); });
  const MW=196, MH=MW*945/859;
  let M={};
  function measure(){ M={w1:w1.offsetWidth,w2:w2.offsetWidth,h:w1.offsetHeight,t1:w1.querySelector('.ln').offsetWidth,lh:lede.offsetHeight}; dirty=true; }
  function animO(to,dur,delay=0){
    cancelAnimationFrame(oRaf); const o0=O, s0=performance.now()+delay;
    if(reduce){ O=to; dirty=true; return; }
    (function st(now){ const k=clamp((now-s0)/dur); O=lerp(o0,to,k); dirty=true; if(k<1) oRaf=requestAnimationFrame(st); })(performance.now());
  }
  const tf=(x,y,k)=>`translate3d(${r2(x)}px,${r2(y)}px,0) scale(${k.toFixed(4)})`;
  function render(){
    const W=innerWidth, H=innerHeight;
    // the order: flourishes → monogram rises / wordmark writes on in the middle → wordmark to the foot →
    // the lede as a statement in the middle → it fades as the book slides up. Opening keeps the monogram
    // at the top and the wordmark at the foot; only the contents bar arrives.
    const fl=out(seg(P,.02,.16)), up=io(seg(P,.16,.32)), wr=seg(P,.26,.4), dn=io(seg(P,.42,.56)),
          li=out(seg(P,.56,.68)), lo=seg(P,.74,.84), bk=seg(P,.78,1);   // linear, so the book tracks the scroll exactly
    const kT=45/MW, x=lerp(W/2-MW/2,W/2-22.5,up), y=lerp(H/2-MH/2,26,up), k=lerp(1,kT,up);
    monoC.style.transform=tf(x,y,k);
    // the flourishes gather back into the letter as it rises; at the top they return only on hover
    const ret=io(seg(P,.17,.3)), f=fl*(1-ret)+io(hv)*ret;
    mf.style.setProperty('--r',r2(lerp(-25,95,f))+'%'); mf.style.opacity=r2(clamp(f*6));
    mf.style.transform=`scale(${r2(lerp(.96,1,f))}) rotate(${r2(lerp(-3,0,f))}deg)`;
    // the wordmark: written on large in the middle, then set small at the foot, where it stays
    const KA=Math.min(2.6,W*.6/M.w1), h=M.h, footY=H-62;
    [[w1,M.w1,-1],[w2,M.w2,1]].forEach(([el,ww,a],i)=>{
      const kk=lerp(KA,1,dn), cy=lerp(H/2+a*h*KA/2,footY+(i?0:-h),dn);
      el.style.transform=tf(W/2-ww*kk/2,cy-h*kk/2,kk); el.style.opacity=r2(seg(P,.25,.28));
    });
    for(const [el,j] of chars){ const t=out(clamp((wr-j*.035)/.6)); el.style.transform=`translate3d(0,${r2((1-t)*110)}%,0)`; }
    // the lede, a statement in the middle of the page
    lede.style.top=r2(H/2-M.lh/2)+'px'; lede.style.opacity=r2(li*(1-lo));
    lede.style.transform=`translate3d(0,${r2((1-li)*14-lo*14)}px,0)`;
    // the book slides up from below and settles between the monogram and the wordmark
    const top=26+kT*MH+16, bot=footY-h*1.5-14, bh=800*.68*S;
    const fit=clamp((bot-top)/(bh+36),.45,1), shift=(top+bot)/2-H/2, c=1-io(seg(O,0,.6));
    persp.style.transform=`translate3d(0,${r2((shift*c+(1-bk)*(H/2+bh*.6+40))/S)}px,0) scale(${lerp(1,fit,c).toFixed(4)})`;
    persp.style.opacity=P>.775?1:0;
    // only the contents bar arrives with the open book
    index.style.opacity=r2(seg(O,.35,1)); index.style.pointerEvents=O>.6?'':'none';
    cue.style.opacity=intro?0:r2(1-seg(P,IEND+.01,IEND+.05));
    hint.style.opacity=cur===0?r2(seg(P,.95,1)*(1-seg(O,0,.3))):'';
  }
  (function loop(){
    const d=Pt-P;
    if(Math.abs(d)>.0005){ P+=reduce?d:d*.16; dirty=true; } else if(d){ P=Pt; dirty=true; }
    const now=performance.now(), dt=Math.min(100,now-(loop.t||now)); loop.t=now;
    if(hv!==hvT){ hv=reduce?hvT:hvT>hv?Math.min(hvT,hv+dt/700):Math.max(hvT,hv-dt/500); dirty=true; }
    if(dirty&&M.h){ dirty=false; render(); }
    requestAnimationFrame(loop);
  })();
  // touch: a vertical drag scrubs like a scroll
  let tY=null;
  addEventListener('touchstart',e=>{ tY=mode==='closed'?e.touches[0].clientY:null; },{passive:true});
  addEventListener('touchmove',e=>{ if(tY===null) return; const y=e.touches[0].clientY; scrub((tY-y)*1.6); tY=y; },{passive:true});
  addEventListener('touchend',()=>{ tY=null; });

  /* ---------- start: always at the top of the prologue ---------- */
  addEventListener('resize',()=>{ size(); measure(); }); size();
  cur=0; mode='closed'; body.classList.add('show3d'); setBg(0); setArt(0); chrome(); startPose();
  function playIntro(){
    if(reduce){ Pt=P=IEND; intro=false; dirty=true; return; }
    const t0=performance.now()+700, DUR=3600;   // a beat on the bare monogram, then the rest plays through
    (function st(now){
      if(mode!=='closed'){ intro=false; dirty=true; return; }   // the book was opened mid-intro; let it take over
      const k=clamp((now-t0)/DUR); Pt=P=IEND*(k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2); dirty=true;
      if(k<1) requestAnimationFrame(st); else { intro=false; holdWheel(); dirty=true; }
    })(performance.now());
  }
  Promise.race([document.fonts.ready,new Promise(res=>setTimeout(res,1500))]).then(()=>{ measure(); setTimeout(()=>{ body.classList.add('ready'); playIntro(); },60); });
  setTimeout(()=>body.classList.remove('preload'),60);
  addEventListener('hashchange',()=>{ const n=parseInt(location.hash.slice(1),10); if(n>=1&&n<=N&&n-1!==cur) go(n-1); });
})();
