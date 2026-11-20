// ================= Testo: copia in omoritmia sui righi senza testo · pronuncia italianizzata =================

// Trova i pentagrammi nella pagina: righe orizzontali scure lunghe, raggruppate a 5 con passo regolare.
function detectStaves(){
  const c=pageCanvas, W=c.width, H=c.height; if(!W) return [];
  const s=Math.min(1,1100/W), w=Math.round(W*s), h=Math.round(H*s);
  const t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d',{willReadFrequently:true}); x.drawImage(c,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data; const prof=new Float32Array(h);
  // scuro = più scuro della media della pagina; si contano solo i tratti SOTTILI e LUNGHI (le righe):
  // teste di note, travature e testo sono spessi o corti e non contano
  let tot=0; for(let i=0;i<w*h;i++) tot+=d[i*4]+d[i*4+1]+d[i*4+2]; const thr=Math.min(600,tot/(w*h)*.82);
  const g=new Uint8Array(w*h); for(let i=0;i<w*h;i++) g[i]=(d[i*4]+d[i*4+1]+d[i*4+2])<thr?1:0;
  const T=Math.max(2,Math.round(h/450)), runMin=Math.round(w*.02);
  for(let y=T;y<h-T;y++){ let st=-1,n=0;
    for(let i=0;i<=w;i++){ const on=i<w&&(g[y*w+i]||g[(y+1)*w+i])&&!(g[(y-T)*w+i]&&g[(y+T+1<h?y+T+1:y)*w+i]);
      if(on){ if(st<0) st=i; } else if(st>=0){ if(i-st>=runMin) n+=i-st; st=-1; } }
    prof[y]=n/w; }
  const lines=[]; for(let y=1;y<h-1;y++) if(prof[y]>.22&&prof[y]>=prof[y-1]&&prof[y]>=prof[y+1]){ if(lines.length&&y-lines[lines.length-1]<=2){ continue; } lines.push(y); }
  // cinque righe equidistanti, anche se in mezzo ci sono altre linee (tagli addizionali, 8va, forcelle)
  const staves=[], used=new Set();
  const near=(y,tol)=>{ let b=-1,bd=tol+1; for(let k=0;k<lines.length;k++){ const dd=Math.abs(lines[k]-y); if(dd<bd&&!used.has(k)){bd=dd;b=k;} } return bd<=tol?b:-1; };
  for(let a=0;a<lines.length;a++){ if(used.has(a)) continue;
    let best=null;
    for(let b=a+1;b<lines.length&&lines[b]-lines[a]<=h/22;b++){ if(used.has(b)) continue; const d=lines[b]-lines[a]; if(d<3) continue;
      // tolleranza larga: nelle scansioni le righe non sono perfette; una riga su cinque può mancare
      const ks=[a,b]; let miss=0, err=0, last=lines[b], dd=d;
      for(let m=2;m<=4;m++){ const pred=last+dd, tol=Math.max(2,dd*.3); const k=near(pred,tol);
        if(k<0){ miss++; last=pred; } else { ks.push(k); err+=Math.abs(lines[k]-pred); last=lines[k]; dd=(lines[k]-lines[a])/m; } }
      if(miss>1) continue;
      const sc=miss*100+d+err/d*2;
      if(!best||sc<best.sc) best={sc,ks,d,miss}; }
    if(!best) continue;
    const ys=best.ks.map(k=>lines[k]).sort((x,y)=>x-y), top=ys[0], bot=top+4*best.d;
    if(staves.some(st=>Math.abs(st.top*h-top)<best.d*2)) continue;
    best.ks.forEach(k=>used.add(k));
    staves.push({top:top/h,bottom:(best.miss?bot:ys[ys.length-1])/h,gap:best.d/h}); }
  staves.sort((x,y)=>x.top-y.top);
  // testo stampato sotto il rigo: molte colonne con segni nella fascia delle sillabe (gambi e note isolate ne toccano poche)
  staves.forEach((st,k)=>{ const g=st.gap*h, y0=Math.round(st.bottom*h+g*.45), lim=staves[k+1]?staves[k+1].top*h-g*.3:h, y1=Math.round(Math.min(lim,st.bottom*h+g*3.2)); let cols=0;
    if(y1>y0) for(let i=0;i<w;i++){ for(let y=y0;y<y1;y++){ const q=(y*w+i)*4; if(d[q]+d[q+1]+d[q+2]<540){cols++;break} } }
    st.printed = y1>y0 && cols/w>.12; });
  return staves;
}

const LyricCopy = {
  start(){
    const A=Anno; const src=A.selIdx.map(i=>A.strokes[i]).filter(s=>s.t==='text');
    if(!src.length) return toast('Seleziona con il lazo le sillabe da copiare');
    const staves=detectStaves(); if(!staves.length) return toast('Non trovo i pentagrammi in questa pagina: copia con Duplica e trascina');
    const sy=Math.min(...src.map(s=>s.y));
    // rigo di riferimento: l'ultimo che termina sopra il testo selezionato
    const ref=[...staves].filter(st=>st.bottom<sy+.005).pop()||staves[0];
    this.src=src; this.ref=ref; this.staves=staves; this.picked=new Set();
    this.overlay();
  },
  overlay(){
    $('#lcLayer')?.remove(); const r=inkCanvas.getBoundingClientRect(); const L=document.createElement('div'); L.id='lcLayer';
    L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:27`;
    L.innerHTML=this.staves.map((st,i)=>{const isRef=st===this.ref; return `<button data-st="${i}" class="lcBand${isRef?' ref':''}${this.picked.has(i)?' on':''}" style="top:${(st.top-st.gap*.6)*100}%;height:${(st.bottom-st.top+st.gap*1.2)*100}%">${isRef?'Testo da qui':this.picked.has(i)?'✓ Copia qui':'Tocca per copiare'}</button>`}).join('')
      +`<div class="lcLegend"><i style="background:#1f5fd6"></i>Blu: rigo con il testo da copiare <i style="background:#1d8a4a"></i>Verde: dove lo copi <i style="background:#999"></i>Grigio: rigo senza testo <i style="border:2px dashed #c8962e;background:none"></i>Riquadro arancio: le sillabe selezionate</div>`
      +`<div class="lcBar pill"><button class="ghostBtn" data-lc="all">Tutti i righi senza testo</button><button class="goldBtn" data-lc="ok">${iconSvg('check')}Copia</button><button class="ib" data-lc="x" aria-label="Annulla">${iconSvg('close')}</button></div>`;
    $('#app').appendChild(L);
    L.onclick=e=>{ const b=e.target.closest('[data-st]'); if(b){ const i=+b.dataset.st; if(this.staves[i]===this.ref) return; this.picked.has(i)?this.picked.delete(i):this.picked.add(i); this.overlay(); return; }
      const a=e.target.closest('[data-lc]')?.dataset.lc; if(a==='x') L.remove(); if(a==='all'){ this.staves.forEach((st,i)=>{ if(st!==this.ref && !this.hasText(st)) this.picked.add(i); }); this.overlay(); } if(a==='ok') this.apply(); };
  },
  hasText(st){ if(st.printed) return true; const nx=this.staves[this.staves.indexOf(st)+1]; const lim=nx?nx.top:1; return Anno.strokes.some(s=>s.t==='text'&&s.y>st.bottom&&s.y<lim); },
  apply(){
    if(!this.picked.size) return toast('Tocca almeno un rigo dove copiare');
    const A=Anno; A.push(); let n=0;
    for(const i of this.picked){ const st=this.staves[i]; const k=st.gap/this.ref.gap||1; // righi di dimensione diversa: mantiene la distanza proporzionale
      for(const s of this.src){ const c=JSON.parse(JSON.stringify(s)); c.y=st.bottom+(s.y-this.ref.bottom)*k; A.strokes.push(c); n++; } }
    $('#lcLayer')?.remove(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar();
    toast(`Testo copiato su ${this.picked.size} ${this.picked.size===1?'rigo':'righi'} (${n} sillabe) · Annulla per tornare indietro`,3200);
  },
};

// ---------- Pronuncia italianizzata (latino ecclesiastico, tedesco, francese) ----------
const PRON = {
  la:w=>RULES.la(w), de:w=>RULES.de(w), fr:w=>RULES.fr(w), es:w=>RULES.es(w), en:w=>RULES.en(w),
  conv(text,lang){ return String(text).replace(/[A-Za-zÀ-ÿßæœ]+/g,w=>{const r=this[lang](w);return w[0]===w[0].toUpperCase()&&w[0]!==w[0].toLowerCase()?r.charAt(0).toUpperCase()+r.slice(1):r}); },
  names:{la:'Latino (ecclesiastico)',de:'Tedesco',fr:'Francese',es:'Spagnolo',en:'Inglese'},
};
const Pron = {
  lang:'la',
  // Dalle sillabe selezionate: aggiunge sotto ciascuna la pronuncia all'italiana, in blu.
  fromSelection(){
    const A=Anno; const src=A.selIdx.map(i=>A.strokes[i]).filter(s=>s.t==='text');
    if(!src.length) return toast('Seleziona con il lazo il testo da pronunciare');
    const m2=modal('Pronuncia italianizzata',`<div class="field"><label>Lingua del testo</label><div class="seg" id="prLang">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${this.lang===k?'on':''}">${l}</button>`).join('')}</div></div>
      <div id="prPrev" class="hint" style="font-size:16px;line-height:1.7"></div>
      <div class="hint" style="font-size:12.5px">ṡ = s sonora (come in “rosa”) · sc' c' g' = suono dolce senza vocale (sc' come in “scena”) · kh = h aspirata · ç = suono di “ich” tedesco · ã õ ẽ = vocali nasali francesi · ü ö = vocali turbate · (e) = e muta.</div>`,
      `<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-ok>${iconSvg('check')}Scrivi sotto il testo</button>`);
    const upd=()=>{$('#prPrev').innerHTML=src.map(s=>`<b>${esc(s.text)}</b> → <span style="color:var(--gold-hi)">${esc(PRON.conv(s.text,this.lang))}</span>`).join(' &nbsp; ')};
    $('#prLang').onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;this.lang=b.dataset.l;$$('#prLang button').forEach(x=>x.classList.toggle('on',x===b));upd()}; upd();
    m2.querySelector('[data-no]').onclick=closeLayers;
    m2.querySelector('[data-ok]').onclick=()=>{ A.push(); src.forEach(s=>A.strokes.push({...JSON.parse(JSON.stringify(s)),text:PRON.conv(s.text,this.lang),y:s.y+s.size*1.15,size:s.size*.8,color:'#1f5fd6',lyric:1,align:s.align||'l',pron:1}));
      closeLayers(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar(); toast('Pronuncia aggiunta sotto il testo'); };
  },
  // Testo libero (anche per partiture scansionate, dove il testo è un'immagine)
  open(){
    const m2=modal('Pronuncia italianizzata',`<div class="field"><label>Lingua</label><div class="seg" id="prLang">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${this.lang===k?'on':''}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="prIn">Testo da cantare</label><textarea id="prIn" placeholder="Scrivi o incolla qui il testo in lingua"></textarea></div>
      <div class="field"><label>Come si legge</label><div id="prOut" style="font-size:19px;line-height:1.6;color:var(--gold-hi);min-height:30px"></div></div>
      <div class="hint" style="font-size:12.5px">ṡ = s sonora · sc' c' g' = suono dolce senza vocale · kh = h aspirata · ç = “ich” tedesco · ã õ ẽ = nasali francesi · ü ö = vocali turbate · (e) = e muta. È una guida: per i casi dubbi fa fede il maestro del coro.</div>`,
      `<button class="goldBtn" data-ok>${iconSvg('text')}Metti sulla pagina</button>`,{eyebrow:'Per Cantanti'});
    const upd=()=>{$('#prOut').textContent=PRON.conv($('#prIn').value,this.lang)};
    $('#prLang').onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;this.lang=b.dataset.l;$$('#prLang button').forEach(x=>x.classList.toggle('on',x===b));upd()};
    $('#prIn').oninput=upd;
    m2.querySelector('[data-ok]').onclick=()=>{ const t=$('#prOut').textContent.trim(); if(!t) return toast('Scrivi prima il testo'); closeLayers(); if(!ST.annotate) Anno.enter(); Anno.mode='text'; Anno.textMode='free'; Anno.buildBar(); Anno.pendingText=t; toast('Tocca la pagina dove scrivere la pronuncia',2600); };
  },
};

