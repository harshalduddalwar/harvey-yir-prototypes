/* Sticky notes. Pick a note from the tray (or press N) and press it onto a page: it lands slightly askew,
   ready to write on. Drag it by its top edge, change its colour, or fold it away into a flag that sticks
   out of the page edge like a paper index tab, which also works as a bookmark: B jumps between pages
   that carry a note, a flag or a folded corner. Notes turn with the page. Like the redlines, they last
   for this visit only. */
(()=>{
  const Y=window.YIR; if(!Y) return;
  const body=document.body, $=id=>document.getElementById(id), PW=560, PH=800, NW=164, NH=164;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLS={y:['#F7E27E','#EDD261'],p:['#F5C2C0','#E9A8A6'],b:['#C3DCEB','#A9C9DC'],g:['#CFE3B8','#B5D199']};

  // notes are typed in Harvey Sans (loaded by the page), so no handwriting face is fetched

  const css=document.createElement('style');
  css.textContent=`
.sn{position:absolute;width:${NW}px;min-height:${NH}px;z-index:7;display:flex;flex-direction:column;
  --c:${COLS.y[0]};--c2:${COLS.y[1]};background:linear-gradient(180deg,var(--c2) 0,var(--c) 22px,var(--c) 70%,color-mix(in srgb,var(--c) 92%,#8a6d2a) 100%);
  transform:rotate(var(--rot,0deg));transform-origin:50% 0;
  box-shadow:0 1px 1px rgba(47,38,9,.18),0 6px 10px -6px rgba(47,38,9,.35),0 16px 18px -14px rgba(47,38,9,.4)}
.sn::before{content:"";position:absolute;inset:0;background:var(--paper);opacity:.9;pointer-events:none;mix-blend-mode:multiply}
/* the free bottom edge lifts off the page a little, as a real note does */
.sn::after{content:"";position:absolute;left:6%;right:4%;bottom:-1px;height:12px;z-index:-1;border-radius:0 0 50% 50%/0 0 100% 100%;
  box-shadow:0 7px 9px -3px rgba(47,38,9,.32);transform:skewX(-6deg)}
.sn-grip{height:22px;flex:none;cursor:grab;touch-action:none}
.sn.drag .sn-grip{cursor:grabbing}
.sn.drag{box-shadow:0 2px 2px rgba(47,38,9,.14),0 18px 24px -10px rgba(47,38,9,.45),0 30px 40px -24px rgba(47,38,9,.4);z-index:9}
.sn-txt{flex:1;padding:0 12px 6px;min-height:${NH-22-26}px;outline:none;color:#2b2414;
  font:400 15px/1.35 'Harvey Sans','Helvetica Neue',Arial,sans-serif;padding-top:4px;word-wrap:break-word;overflow-wrap:anywhere;cursor:text;position:relative;z-index:1}
.sn-txt:empty::before{content:attr(data-ph);color:rgba(43,36,20,.38)}
.sn-foot{height:26px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 12px;position:relative;z-index:1;
  font:500 9.5px/1 var(--sans,system-ui,sans-serif);letter-spacing:.04em;text-transform:uppercase;color:rgba(43,36,20,.45)}
.sn-tools{display:flex;align-items:center;gap:3px;opacity:0;transition:opacity .2s ease}
.sn:hover .sn-tools,.sn:focus-within .sn-tools{opacity:1}
.sn-tools button{width:18px;height:18px;display:grid;place-items:center;border-radius:5px;color:rgba(43,36,20,.6);cursor:pointer;padding:0;border:0;background:none}
.sn-tools button:hover{background:rgba(43,36,20,.1);color:#2b2414}
.sn-tools svg{width:11px;height:11px}
.sn-tools .sw{width:12px;height:12px;border-radius:50%;margin:0 1px;background:var(--sw);box-shadow:inset 0 0 0 1px rgba(43,36,20,.25)}
.sn-tools .sw[aria-pressed="true"]{box-shadow:inset 0 0 0 1px rgba(43,36,20,.25),0 0 0 1.5px #fff,0 0 0 2.5px rgba(43,36,20,.5)}
.sn.new{animation:snIn .5s cubic-bezier(.2,.9,.3,1.25) both}
@keyframes snIn{0%{opacity:0;transform:translate(6px,-14px) rotate(calc(var(--rot) + 5deg)) scale(1.06)}60%{opacity:1}100%{transform:rotate(var(--rot)) scale(1)}}
.sn.out{transition:opacity .25s ease,transform .3s ease;opacity:0;transform:translateY(-10px) rotate(calc(var(--rot) - 4deg))}
.sn.tabbed{display:none}
.bm-leafw .sn{pointer-events:none}.bm-leafw .sn-tools{display:none}
body.marking .sn,body.marking .sn-flag{pointer-events:none}
/* the flag: a translucent index tab with a solid tip that sticks out past the page edge */
.sn-flag{position:absolute;width:76px;height:22px;z-index:8;cursor:pointer;padding:0;border:0;background:none;filter:drop-shadow(0 1px 1px rgba(47,38,9,.25))}
.sn-flag b{position:absolute;top:0;bottom:0;display:block}
.sn-flag .on{background:color-mix(in srgb,var(--c) 55%,transparent);backdrop-filter:saturate(1.2)}
.sn-flag .tip{background:var(--c);box-shadow:inset 0 0 0 .5px rgba(47,38,9,.12)}
.sn-flag.r .on{left:0;width:40px}.sn-flag.r .tip{left:40px;right:0;border-radius:0 3px 3px 0}
.sn-flag.l .on{right:0;width:40px}.sn-flag.l .tip{right:40px;left:0;border-radius:3px 0 0 3px}
.sn-flag span{position:absolute;top:0;bottom:0;display:flex;align-items:center;width:32px;overflow:hidden;white-space:nowrap;font:500 11px/1 'Harvey Sans','Helvetica Neue',Arial,sans-serif;color:rgba(43,36,20,.75)}
.sn-flag.r span{left:42px}.sn-flag.l span{left:4px}
.sn-flag:hover{filter:drop-shadow(0 2px 3px rgba(47,38,9,.35))}
.sn-flag.r:hover{transform:translateX(3px)}.sn-flag.l:hover{transform:translateX(-3px)}
.sn-flag{transition:transform .25s cubic-bezier(.2,.7,.2,1),filter .25s}
.spread.keepL > .sn-flag.l,.spread.keepR > .sn-flag.r{visibility:visible}
/* placing: a note follows the pointer */
.sn-ghost{position:fixed;left:0;top:0;z-index:80;width:62px;height:62px;pointer-events:none;opacity:0;transition:opacity .15s ease;
  background:linear-gradient(180deg,${COLS.y[1]} 0 9px,${COLS.y[0]} 9px);box-shadow:0 8px 14px -6px rgba(0,0,0,.45);transform-origin:0 0}
body.noting .sn-ghost.on{opacity:.92}
body.noting #book{cursor:copy}
/* tray tool */
.mk-tool .pad{width:44px;height:56px;border-radius:9px;display:grid;place-items:center;background:rgba(0,0,0,.22)}
.mk-tool .pad span{position:relative;width:30px;height:30px;display:block;transition:transform .35s cubic-bezier(.3,1.4,.4,1)}
.mk-tool .pad span::before,.mk-tool .pad span::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,${COLS.y[1]} 0 5px,${COLS.y[0]} 5px);box-shadow:0 2px 3px rgba(0,0,0,.4)}
.mk-tool .pad span::before{transform:translate(2px,3px) rotate(4deg);filter:brightness(.85)}
.mk-tool:hover .pad span,.mk-tool[aria-pressed="true"] .pad span{transform:rotate(-7deg) translateY(-3px)}
.tv .tsn{position:absolute;top:22%;width:4.5%;height:5%;z-index:4;display:none;background:${COLS.y[0]};box-shadow:0 0 0 .5px rgba(47,38,9,.2)}
.tv .tsn.l{left:-1%}.tv .tsn.r{right:-1%}
.tile.snl .tsn.l,.tile.snr .tsn.r{display:block}
@media (max-width:760px){.mk-tool .pad{width:26px;height:40px}.mk-tool .pad span{width:18px;height:18px}}
`;
  document.head.appendChild(css);

  /* ---------- tray tool ---------- */
  const tray=document.querySelector('.mk-tray');
  const btn=document.createElement('button'); btn.className='mk-tool'; btn.dataset.note='1';
  btn.setAttribute('aria-pressed','false'); btn.title='Sticky note (N)';
  btn.innerHTML='<span class="pad"><span></span></span><span class="lab">Note <kbd>N</kbd></span>';
  tray&&tray.insertBefore(btn,tray.querySelector('.rule'));
  const hint=document.querySelector('.mk-hint');
  const ghost=document.createElement('div'); ghost.className='sn-ghost'; body.appendChild(ghost);

  let noting=false;
  function setNoting(on){
    if(on&&Y.mode!=='open') return;
    if(on&&body.classList.contains('marking')) tray.querySelector('.mk-tool[aria-pressed="true"]:not([data-note])')?.click();   // put the pen down first
    noting=on; body.classList.toggle('noting',on); btn.setAttribute('aria-pressed',String(on));
    if(hint){ hint.innerHTML=on?'<kbd>Click</kbd> a page to stick a note there <kbd>Esc</kbd> cancel':''; hint.classList.toggle('on',on); }
    if(!on) ghost.classList.remove('on');
  }
  btn.addEventListener('click',()=>setNoting(!noting));
  new MutationObserver(()=>{ if(noting&&body.classList.contains('marking')) setNoting(false); }).observe(body,{attributes:true,attributeFilter:['class']});

  const pageEl=(i,s)=>Y.spreads[i]&&Y.spreads[i].querySelector('.pg.'+s);
  function hit(e){
    if(Y.mode!=='open'||Y.turning) return null;
    for(const s of ['l','r']){
      const p=pageEl(Y.cur,s); if(!p) continue; const r=p.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom) return {p,s,x:(e.clientX-r.left)/r.width*PW,y:(e.clientY-r.top)/r.height*PH,k:r.width/PW};
    }
    return null;
  }
  addEventListener('pointermove',e=>{
    if(!noting) return;
    const h=hit(e); ghost.classList.toggle('on',!!h&&!e.target.closest('.mk-tray,.sn,.sn-flag'));
    ghost.style.transform=`translate3d(${e.clientX-8}px,${e.clientY-6}px,0) rotate(-4deg)`;
  });

  /* ---------- sound: the peel and press of a sticky note ---------- */
  let ac=null;
  function snd(kind){
    if(reduce) return;
    try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ return; }
    if(ac.state==='suspended') ac.resume();
    const t=ac.currentTime;
    const hitS=(at,dur,f,q,g,type='bandpass')=>{
      const n=Math.ceil(ac.sampleRate*dur), buf=ac.createBuffer(1,n,ac.sampleRate), d=buf.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,1.6);
      const s=ac.createBufferSource(); s.buffer=buf; const bp=ac.createBiquadFilter(); bp.type=type; bp.frequency.value=f; bp.Q.value=q;
      const gn=ac.createGain(); gn.gain.value=g; s.connect(bp).connect(gn).connect(ac.destination); s.start(at);
    };
    if(kind==='stick'){ hitS(t,.12,2400,.6,.05); hitS(t+.16,.06,700,.7,.22,'lowpass'); }
    else if(kind==='peel'){ hitS(t,.22,3000,.5,.05); }
    else { hitS(t,.05,1800,.8,.08); }
  }

  /* ---------- notes ---------- */
  const DATE=new Date().toLocaleDateString(undefined,{day:'numeric',month:'short'});
  const ICON={
    tab:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 3.5h6l2.5 2.5L8 8.5H2z"/></svg>',
    del:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 3l6 6M9 3L3 9"/></svg>'
  };
  const tiles=[...document.querySelectorAll('#ovGrid .tile')];
  tiles.forEach((t,i)=>{ if(!i) return; const v=t.querySelector('.tv'); ['l','r'].forEach(sd=>{ const m=document.createElement('b'); m.className='tsn '+sd; v.appendChild(m); }); });
  function syncTile(i){
    const t=tiles[i]; if(!t) return;
    ['l','r'].forEach(s=>t.classList.toggle('sn'+s,!!pageEl(i,s)?.querySelector('.sn')));
  }

  function setColour(n,c){
    n.dataset.c=c; n.style.setProperty('--c',COLS[c][0]); n.style.setProperty('--c2',COLS[c][1]);
    n.querySelectorAll('.sw').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===c)));
    if(n._flag) n._flag.style.setProperty('--c',COLS[c][0]);
  }

  function makeNote(i,side,x,y){
    const p=pageEl(i,side); if(!p) return;
    const n=document.createElement('div'); n.className='sn new';
    n.style.left=Math.round(clamp(x,8,PW-NW-8))+'px'; n.style.top=Math.round(clamp(y,8,PH-NH-8))+'px';
    n.style.setProperty('--rot',((Math.random()*2-1)*2.6).toFixed(2)+'deg');
    n.innerHTML=`<div class="sn-grip" title="Drag to move"></div>
      <div class="sn-txt" contenteditable="true" spellcheck="false" data-ph="Write a note…" aria-label="Note"></div>
      <div class="sn-foot"><span>${DATE}</span><span class="sn-tools">
        <button class="tb" title="Fold into a tab" aria-label="Fold into a tab">${ICON.tab}</button>
        <button class="dl" title="Remove note" aria-label="Remove note">${ICON.del}</button></span></div>`;
    p.appendChild(n); n._i=i; n._side=side; setColour(n,'y');
    n.addEventListener('animationend',()=>n.classList.remove('new'),{once:true});
    wire(n); syncTile(i); snd('stick');
    setTimeout(()=>n.querySelector('.sn-txt').focus(),reduce?0:180);
    return n;
  }

  function wire(n){
    const txt=n.querySelector('.sn-txt');
    n.addEventListener('pointerdown',e=>e.stopPropagation());
    n.addEventListener('click',e=>e.stopPropagation());
    txt.addEventListener('keydown',e=>{
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); txt.blur(); }
      e.stopPropagation();
    });
    txt.addEventListener('paste',e=>{ e.preventDefault(); document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text')); });
    txt.addEventListener('input',()=>{ if(n._flag) n._flag.querySelector('span').textContent=txt.textContent; });
    n.querySelectorAll('.sw').forEach(b=>b.addEventListener('click',()=>{ setColour(n,b.dataset.c); snd('tap'); }));
    n.querySelector('.dl').addEventListener('click',()=>{
      snd('peel'); n.classList.add('out'); n._flag?.remove();
      setTimeout(()=>{ n.remove(); syncTile(n._i); },reduce?0:300);
    });
    n.querySelector('.tb').addEventListener('click',()=>tab(n,true));
    // drag by the top edge, within its page
    const grip=n.querySelector('.sn-grip');
    grip.addEventListener('pointerdown',e=>{
      if(e.button>0) return; e.preventDefault();
      const p=n.parentElement, r=p.getBoundingClientRect(), k=r.width/PW;
      const x0=parseFloat(n.style.left), y0=parseFloat(n.style.top), cx=e.clientX, cy=e.clientY;
      n.classList.add('drag'); try{ grip.setPointerCapture(e.pointerId); }catch(_){} snd('peel');
      const mv=ev=>{
        n.style.left=Math.round(clamp(x0+(ev.clientX-cx)/k,-NW*.3,PW-NW*.7))+'px';
        n.style.top=Math.round(clamp(y0+(ev.clientY-cy)/k,0,PH-NH*.5))+'px';
      };
      const up=()=>{ n.classList.remove('drag'); grip.removeEventListener('pointermove',mv); grip.removeEventListener('pointerup',up); grip.removeEventListener('pointercancel',up); snd('stick'); };
      grip.addEventListener('pointermove',mv); grip.addEventListener('pointerup',up); grip.addEventListener('pointercancel',up);
    });
  }

  // fold a note away into a flag on the page's outer edge, or open it back out
  function tab(n,on){
    if(on){
      const s=Y.spreads[n._i], side=n._side, y=clamp(parseFloat(n.style.top)+14,10,PH-32);
      const f=document.createElement('button'); f.className='sn-flag '+side; f.setAttribute('aria-label','Open note');
      f.style.top=y+'px'; f.style.left=(side==='r'?2*PW-40:-36)+'px'; f.style.setProperty('--c',COLS[n.dataset.c][0]);
      f.innerHTML='<b class="on"></b><b class="tip"></b><span></span>';
      f.querySelector('span').textContent=n.querySelector('.sn-txt').textContent;
      f.title=n.querySelector('.sn-txt').textContent||'Note';
      f.addEventListener('pointerdown',e=>e.stopPropagation());
      f.addEventListener('click',e=>{ e.stopPropagation(); tab(n,false); });
      s.appendChild(f); n._flag=f; n.classList.add('tabbed'); snd('peel');
    } else {
      n._flag?.remove(); n._flag=null; n.classList.remove('tabbed'); n.classList.add('new');
      n.addEventListener('animationend',()=>n.classList.remove('new'),{once:true}); snd('stick');
    }
  }

  // placing a note
  addEventListener('pointerdown',e=>{
    if(!noting||e.button>0) return;
    if(e.target.closest&&e.target.closest('.mk-tray,.sn,.sn-flag')) return;
    const h=hit(e); if(!h){ setNoting(false); return; }
    e.preventDefault(); e.stopPropagation();
    makeNote(Y.cur,h.s,h.x-10,h.y-8); setNoting(false);
  },{capture:true});

  addEventListener('keydown',e=>{
    if(e.target&&(e.target.isContentEditable||/^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
    if(e.metaKey||e.ctrlKey||e.altKey||body.classList.contains('intro-on')) return;
    if($('ov')&&$('ov').classList.contains('on')) return;
    if(e.key==='Escape'&&noting){ setNoting(false); e.stopImmediatePropagation(); return; }
    if(e.key==='n'||e.key==='N'){ e.preventDefault(); setNoting(!noting); }
  },{capture:true});

  function clamp(v,a,b){ return Math.min(b,Math.max(a,v)); }

  // the turning leaf is drawn from slices of the page image, so it is handed the notes to carry
  window.SN={ leaf(i,side){
    const p=pageEl(i,side); if(!p) return '';
    const ns=[...p.querySelectorAll('.sn:not(.tabbed)')]; if(!ns.length) return '';
    return '<div>'+ns.map(n=>{ const c=n.cloneNode(true); c.classList.remove('new','drag'); c.querySelector('.sn-txt').removeAttribute('contenteditable'); return c.outerHTML; }).join('')+'</div>';
  }};
})();
