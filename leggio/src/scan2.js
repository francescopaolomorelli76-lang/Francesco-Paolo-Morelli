// ============ Scanner: cornice a 8 maniglie, Annulla/Ripeti, toni e livelli ============
(function(){
  const EXPO=[1.7,1.3,1,.8,.62];
  const snapStr=s=>JSON.stringify({q:s.quad,m:s.mode,p:s.p,d:s.deskew,t:s.tone});
  Object.assign(Scan,{
    hist:[], fut:[], tone:2,
    snap(){ const s=snapStr(this); if(this.hist[this.hist.length-1]!==s){ this.hist.push(s); if(this.hist.length>80) this.hist.shift(); } this.fut=[]; this.updUR(); },
    restore(s){ const o=JSON.parse(s); this.quad=o.q; this.mode=o.m; this.p=o.p; this.deskew=o.d; this.tone=o.t; },
    undo(){ if(!this.hist.length) return; this.fut.push(snapStr(this)); this.restore(this.hist.pop()); this.go(this.step); this.updUR(); },
    redo(){ if(!this.fut.length) return; this.hist.push(snapStr(this)); this.restore(this.fut.pop()); this.go(this.step); this.updUR(); },
    updUR(){ const u=$('#scUn'), r=$('#scRe'); if(u) u.classList.toggle('dis',!this.hist.length); if(r) r.classList.toggle('dis',!this.fut.length); },
  });
  const start0=Scan.start, load0=Scan.load, ui0=Scan.ui, go0=Scan.go, rot0=Scan.rotate;
  Scan.start=async function(files,target){ this.hist=[]; this.fut=[]; this.tone=2; this.p.expo=1; this.p.lo=0; this.p.hi=100; return start0.call(this,files,target); };
  Scan.load=async function(){ const r=await load0.call(this); this.hist=[]; this.fut=[]; this.updUR(); return r; };
  Scan.rotate=function(){ rot0.call(this); this.hist=[]; this.fut=[]; this.updUR(); };
  Scan.ui=function(){ ui0.call(this);
    const st=$('.scanSteps'); if(st) st.insertAdjacentHTML('beforeend',`<button id="scUn" class="ib" aria-label="Annulla" title="Annulla">${iconSvg('undo')}</button><button id="scRe" class="ib" aria-label="Ripeti" title="Ripeti">${iconSvg('redo')}</button>`);
    $('#scUn').onclick=()=>this.undo(); $('#scRe').onclick=()=>this.redo(); this.updUR();
    $('#scTools').addEventListener('pointerdown',()=>this.snap(),true); };
  Scan.go=function(st){ go0.call(this,st); if(st!==2) return;
    const T=$('#scTools'), tones=['#0c0c0c','#4d4d4d','#8e8e8e','#cfcfcf','#fafafa'];
    const lv=(k,l,min,max,v)=>`<div class="sl"><span>${l}<em id="sv-${k}">${v}</em></span><input type="range" id="sp-${k}" min="${min}" max="${max}" value="${v}" style="--v:${(v-min)/(max-min)*100}%"></div>`;
    T.insertAdjacentHTML('afterbegin',`<div class="eyebrow">Tono della pagina</div><div class="toneRow" id="scTone">${tones.map((c,i)=>`<button data-t="${i}" class="${(this.tone??2)===i?'on':''}" style="background:${c}" aria-label="Tono ${i+1} di 5"></button>`).join('')}</div>`);
    T.insertAdjacentHTML('beforeend',`<div class="eyebrow" style="margin-top:6px">Livelli dei colori</div><div class="sliders">${lv('lo','Punto nero',0,60,this.p.lo||0)}${lv('hi','Punto bianco',40,100,this.p.hi==null?100:this.p.hi)}</div>`);
    const upd=debounce(()=>this.process(false),90);
    $('#scTone').onclick=e=>{ const b=e.target.closest('[data-t]'); if(!b) return; this.tone=+b.dataset.t; this.p.expo=EXPO[this.tone]; $$('#scTone button').forEach(x=>x.classList.toggle('on',x===b)); upd(); };
    ['lo','hi'].forEach(k=>{ const i=$('#sp-'+k); i.oninput=()=>{ this.p[k]=+i.value; $('#sv-'+k).textContent=i.value; i.style.setProperty('--v',(i.value-i.min)/(i.max-i.min)*100+'%'); upd(); }; });
    this.updUR(); };
  // cornice: 4 angoli + 4 maniglie sui lati (come nelle scansioni dei documenti), area interna colorata
  Scan.drawCrop=function(){
    const c=$('#scCanvas'); if(!c) return; const s=this.src; const ps=Math.min(1,1400/Math.max(s.width,s.height));
    c.width=Math.round(s.width*ps); c.height=Math.round(s.height*ps); c.getContext('2d').drawImage(s,0,0,c.width,c.height);
    const k=this.fitCanvas(c,c.width,c.height)*ps; this.viewK=k;
    const ov=$('#scOv'), stg=$('#scStage'); const st=stg.getBoundingClientRect(), cr=c.getBoundingClientRect(); const ox=cr.left-st.left, oy=cr.top-st.top;
    const P=()=>this.quad.map(([x,y])=>[ox+x*k,oy+y*k]); const mid=p=>p.map((a,i)=>{ const b=p[(i+1)%4]; return [(a[0]+b[0])/2,(a[1]+b[1])/2]; });
    const pts=p=>p.map(q=>q.join(',')).join(' ');
    const build=()=>{ const p=P(), m=mid(p);
      ov.innerHTML=`<svg><path id="scDim" d="M0 0H${st.width}V${st.height}H0Z M${p.map(q=>q.join(' ')).join(' L')} Z" fill="rgba(0,0,0,.5)" fill-rule="evenodd"/><polygon id="scPoly" points="${pts(p)}" fill="rgba(235,90,70,.22)" stroke="#f2d382" stroke-width="2.5"/></svg>`
        +p.map((q,i)=>`<div class="handle" data-h="${i}" style="left:${q[0]}px;top:${q[1]}px"></div>`).join('')+m.map((q,i)=>`<div class="handle edge" data-h="e${i}" style="left:${q[0]}px;top:${q[1]}px"></div>`).join(''); };
    const place=()=>{ const p=P(), m=mid(p); ov.querySelector('#scDim').setAttribute('d',`M0 0H${st.width}V${st.height}H0Z M${p.map(q=>q.join(' ')).join(' L')} Z`); ov.querySelector('#scPoly').setAttribute('points',pts(p));
      p.forEach((q,i)=>{ const h=ov.querySelector(`[data-h="${i}"]`); h.style.left=q[0]+'px'; h.style.top=q[1]+'px'; }); m.forEach((q,i)=>{ const h=ov.querySelector(`[data-h="e${i}"]`); h.style.left=q[0]+'px'; h.style.top=q[1]+'px'; }); };
    build();
    const loupe=$('#scLoupe'), lc=loupe.querySelector('canvas').getContext('2d');
    ov.onpointerdown=e=>{ const h=e.target.closest('[data-h]'); if(!h) return; const id=h.dataset.h, edge=id[0]==='e', i=+(edge?id.slice(1):id);
      h.setPointerCapture(e.pointerId); this.snap(); const q0=this.quad.map(q=>q.slice()); const sx=e.clientX, sy=e.clientY; if(!edge) loupe.classList.add('on');
      const mv=ev=>{ if(edge){ const dx=(ev.clientX-sx)/k, dy=(ev.clientY-sy)/k; [i,(i+1)%4].forEach(j=>{ this.quad[j]=[clamp(q0[j][0]+dx,0,s.width),clamp(q0[j][1]+dy,0,s.height)]; }); place(); return; }
        const x=clamp((ev.clientX-st.left-ox)/k,0,s.width), y=clamp((ev.clientY-st.top-oy)/k,0,s.height); this.quad[i]=[x,y]; place(); const p=P()[i];
        loupe.style.left=clamp(p[0]-60,0,st.width-120)+'px'; loupe.style.top=Math.max(0,p[1]-150)+'px'; lc.fillStyle='#000'; lc.fillRect(0,0,240,240); lc.drawImage(s,x-60,y-60,120,120,0,0,240,240); lc.strokeStyle='#f2d382'; lc.lineWidth=2; lc.beginPath(); lc.moveTo(120,90); lc.lineTo(120,150); lc.moveTo(90,120); lc.lineTo(150,120); lc.stroke(); };
      const up=()=>{ h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); loupe.classList.remove('on'); };
      h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up); if(!edge) mv(e); };
  };
})();
