/* Bookmarks: dog-ear a page. Tap a page's top outer corner and it folds over diagonally, the way you'd
   save a place in a paper book. Tap it again to smooth it back out. The fold is part of the page, so it
   turns with the leaf. B jumps to the next folded page. Like the redlines, folds last for this visit only. */
(()=>{
  const Y=window.YIR; if(!Y) return;
  const S=74, body=document.body, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css=document.createElement('style');
  css.textContent=`
.dog{position:absolute;top:0;width:${S}px;height:${S}px;z-index:6;perspective:520px;cursor:pointer;-webkit-tap-highlight-color:transparent;--a:0deg}
.dog.r{right:0;perspective-origin:100% 0}.dog.l{left:0;perspective-origin:0 0}
.dog > *{position:absolute;inset:0;display:block;pointer-events:none}
.dog .fl{transform-style:preserve-3d;opacity:0;transition:transform .62s cubic-bezier(.55,0,.2,1),opacity 0s linear .62s}
.dog.r .fl{transform:rotate3d(1,1,0,calc(var(--a) * -1))}
.dog.l .fl{transform:rotate3d(1,-1,0,var(--a))}
.dog .fl b{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.dog .ff{background-size:auto,560px 800px;background-repeat:repeat,no-repeat}
.dog.r .ff{clip-path:polygon(0 0,100% 0,100% 100%);background-position:0 0,${S-560}px 0}
.dog.l .ff{clip-path:polygon(0 0,100% 0,0 100%);background-position:0 0,0 0}
.dog .fb{background-color:var(--bk,var(--cream))}
.dog.r .fb{clip-path:polygon(0 0,0 100%,100% 100%);transform:rotate3d(1,1,0,180deg);
  background-image:linear-gradient(to bottom left,rgba(255,255,255,.5) 49%,rgba(255,255,255,.12) 56%,rgba(47,38,9,0) 70%,rgba(47,38,9,.1)),var(--paper)}
.dog.l .fb{clip-path:polygon(100% 0,100% 100%,0 100%);transform:rotate3d(1,-1,0,180deg);
  background-image:linear-gradient(to bottom right,rgba(255,255,255,.5) 49%,rgba(255,255,255,.12) 56%,rgba(47,38,9,0) 70%,rgba(47,38,9,.1)),var(--paper)}
/* the page beneath, shaded where the corner has lifted off it */
.dog .un{opacity:0;transition:opacity .5s ease}
.dog.r .un{clip-path:polygon(0 0,100% 0,100% 100%);background:linear-gradient(to top right,rgba(47,38,9,.16) 50%,rgba(47,38,9,.04) 75%,rgba(47,38,9,0))}
.dog.l .un{clip-path:polygon(0 0,100% 0,0 100%);background:linear-gradient(to top left,rgba(47,38,9,.16) 50%,rgba(47,38,9,.04) 75%,rgba(47,38,9,0))}
/* the shadow the folded flap casts on the page */
.dog .sh{opacity:0;filter:blur(2.5px);background:rgba(47,38,9,.3);transition:opacity .3s ease}
.dog.r .sh{clip-path:polygon(0 0,0 100%,100% 100%);transform:translate(-1.5px,2.5px)}
.dog.l .sh{clip-path:polygon(100% 0,100% 100%,0 100%);transform:translate(1.5px,2.5px)}
/* hover: the corner lifts a little, inviting the fold */
.dog:hover{--a:34deg}
.dog:hover .fl,.pg.bm .dog .fl{opacity:1;transition:transform .62s cubic-bezier(.55,0,.2,1),opacity 0s}
.dog:hover .un{opacity:.55}
.pg.bm .dog{--a:180deg}
.pg.bm .dog .un{opacity:1}
.pg.bm .dog .sh{opacity:1;transition:opacity .25s ease .4s}
.pg.bm .dog:hover{--a:166deg}
.pg.bm .dog:hover .sh{opacity:.6;transition-delay:0s}
body.marking .dog,.turns .dog,.thumb .dog,.face .dog{pointer-events:none}
.dog:focus-visible{outline:2px solid rgba(47,38,9,.5);outline-offset:-4px}
@media (prefers-reduced-motion:reduce){.dog .fl{transition:none!important}}
/* overview: folded pages show a folded corner on their tile */
.tv .tbm{position:absolute;top:0;width:9%;aspect-ratio:1;z-index:4;pointer-events:none;display:none;filter:drop-shadow(-1px 1px 1px rgba(47,38,9,.3))}
.tv .tbm.l{left:0;background:linear-gradient(to bottom right,var(--bg,#efe9dc) 50%,#f7f3ea 50%)}
.tv .tbm.r{right:0;background:linear-gradient(to bottom left,var(--bg,#efe9dc) 50%,#f7f3ea 50%)}
.tile.bml .tbm.l,.tile.bmr .tbm.r{display:block}
.bm-leafw{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.bm-leafw > div{position:absolute;top:0;width:560px;height:800px}
.bmz{position:absolute;top:0;width:${S}px;height:${S}px}
.bmz.r{right:0}.bmz.l{left:0}
.bmz b{position:absolute;inset:0;display:block}
.bmz.r .u{clip-path:polygon(0 0,100% 0,100% 100%);background:linear-gradient(to top right,rgba(47,38,9,.16) 50%,rgba(47,38,9,.04) 75%,rgba(47,38,9,0))}
.bmz.l .u{clip-path:polygon(0 0,100% 0,0 100%);background:linear-gradient(to top left,rgba(47,38,9,.16) 50%,rgba(47,38,9,.04) 75%,rgba(47,38,9,0))}
.bmz .s{filter:blur(2.5px);background:rgba(47,38,9,.3)}
.bmz.r .s{clip-path:polygon(0 0,0 100%,100% 100%);transform:translate(-1.5px,2.5px)}
.bmz.l .s{clip-path:polygon(100% 0,100% 100%,0 100%);transform:translate(1.5px,2.5px)}
.bmz .b{background-color:var(--bk,var(--cream))}
.bmz.r .b{clip-path:polygon(0 0,0 100%,100% 100%);background-image:linear-gradient(to bottom left,rgba(255,255,255,.5) 49%,rgba(255,255,255,.12) 56%,rgba(47,38,9,0) 70%,rgba(47,38,9,.1)),var(--paper)}
.bmz.l .b{clip-path:polygon(100% 0,100% 100%,0 100%);background-image:linear-gradient(to bottom right,rgba(255,255,255,.5) 49%,rgba(255,255,255,.12) 56%,rgba(47,38,9,0) 70%,rgba(47,38,9,.1)),var(--paper)}
.bm-toast{position:fixed;left:50%;bottom:76px;z-index:70;transform:translate3d(-50%,8px,0);opacity:0;pointer-events:none;
  font:500 12px/1 var(--sans,system-ui,sans-serif);letter-spacing:.01em;color:#f7f3ea;background:rgba(28,24,18,.86);
  padding:10px 14px;border-radius:999px;transition:opacity .3s ease,transform .4s cubic-bezier(.2,.7,.2,1);white-space:nowrap}
.bm-toast.on{opacity:1;transform:translate3d(-50%,0,0)}
.bm-toast kbd{font:inherit;padding:2px 6px;margin:0 1px;border-radius:4px;background:rgba(255,255,255,.16)}
`;
  document.head.appendChild(css);

  /* the back of the sheet: the paper colour at that corner of the page */
  const cv=document.createElement('canvas'); cv.width=cv.height=1;
  const cx=cv.getContext('2d',{willReadFrequently:true});
  function backColour(p,img,side){
    if(p.dataset.bk||!img.complete||!img.naturalWidth) return;
    try{
      const w=img.naturalWidth, k=w/560, x=side==='r'?w-30*k:6*k;
      cx.clearRect(0,0,1,1); cx.drawImage(img,x,6*k,24*k,24*k,0,0,1,1);
      const [r,g,b]=cx.getImageData(0,0,1,1).data;
      const m=v=>Math.round(v+(255-v)*.12);           // the reverse is a touch lighter than the printed face
      p.dataset.bk=1; p.style.setProperty('--bk',`rgb(${m(r)},${m(g)},${m(b)})`);
    }catch(_){ p.dataset.bk=1; }
  }

  /* a crisp paper crease */
  let ac=null;
  function crease(fold){
    if(reduce) return;
    try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ return; }
    if(ac.state==='suspended') ac.resume();
    const t=ac.currentTime;
    const hit=(at,dur,f,q,g)=>{
      const n=Math.ceil(ac.sampleRate*dur), buf=ac.createBuffer(1,n,ac.sampleRate), d=buf.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2);
      const s=ac.createBufferSource(); s.buffer=buf;
      const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q;
      const gn=ac.createGain(); gn.gain.value=g;
      s.connect(bp).connect(gn).connect(ac.destination); s.start(at);
    };
    if(fold){ hit(t,.22,4200,.7,.05); hit(t+.36,.07,2600,1.1,.2); hit(t+.4,.05,900,.8,.12); }  // lift, then the press of the crease
    else { hit(t,.18,3600,.7,.06); hit(t+.12,.25,5200,.6,.035); }                         // peeled back up
  }

  const tiles=[...document.querySelectorAll('#ovGrid .tile')];
  tiles.forEach((t,i)=>{ if(!i) return; const v=t.querySelector('.tv'); ['l','r'].forEach(sd=>{ const m=document.createElement('i'); m.className='tbm '+sd; v.appendChild(m); }); });

  const toast=document.createElement('div'); toast.className='bm-toast'; toast.setAttribute('role','status'); body.appendChild(toast);
  let tt=0;
  function say(html){ toast.innerHTML=html; toast.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>toast.classList.remove('on'),2400); }

  // the turning leaf is drawn from slices of the page image, so it is handed the folded corner to carry
  window.BM={ leaf(i,side){
    const p=Y.spreads[i]&&Y.spreads[i].querySelector('.pg.'+side); if(!p||!p.classList.contains('bm')) return '';
    const bk=p.style.getPropertyValue('--bk');
    return `<div><div class="bmz ${side}"${bk?` style="--bk:${bk}"`:''}><b class="u"></b><b class="s"></b><b class="b"></b></div></div>`;
  }};
  const marked=()=>Y.spreads.map((s,i)=>i&&s.querySelector('.pg.bm,.pg .sn')?i:-1).filter(i=>i>0);

  Y.spreads.forEach((s,i)=>{
    if(!i) return;
    s.querySelectorAll('.pg').forEach(p=>{
      const img=p.querySelector('.fp'); if(!img) return;
      const side=p.classList.contains('l')?'l':'r';
      const d=document.createElement('div'); d.className='dog '+side;
      d.setAttribute('role','button'); d.setAttribute('tabindex','0'); d.setAttribute('aria-pressed','false');
      d.setAttribute('aria-label',`Bookmark the ${side==='l'?'left':'right'} page`);
      d.innerHTML='<i class="un"></i><i class="sh"></i><div class="fl"><b class="ff"></b><b class="fb"></b></div>';
      d.querySelector('.ff').style.backgroundImage=`var(--paper),url(${img.getAttribute('src')})`;
      p.appendChild(d);
      d.addEventListener('pointerenter',()=>backColour(p,img,side));
      d.addEventListener('pointerdown',e=>e.stopPropagation());
      const toggle=()=>{
        if(Y.mode!=='open'||Y.turning) return;
        backColour(p,img,side);
        const on=p.classList.toggle('bm');
        d.setAttribute('aria-pressed',on); crease(on);
        tiles[i]?.classList.toggle('bm'+side,on);
        const name=s.dataset.name||'this page';
        if(on) say(`Bookmarked · ${name} &nbsp;<kbd>B</kbd> to come back`);
        else say(`Bookmark removed · ${name}`);
      };
      d.addEventListener('click',e=>{ e.stopPropagation(); toggle(); });
      d.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); toggle(); } });
    });
  });

  // B: go to the next folded page (wrapping round), from anywhere in the open book
  addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey||(e.key!=='b'&&e.key!=='B')) return;
    if(e.target.closest&&e.target.closest('input,textarea,[contenteditable]')) return;
    if(Y.mode!=='open') return;
    const m=marked();
    if(!m.length){ say('No bookmarks yet · fold a top corner or leave a note (N)'); return; }
    const to=m.find(i=>i>Y.cur)??m[0];
    if(to===Y.cur){ say('This is your only bookmark'); return; }
    Y.go(to);
  });
})();
