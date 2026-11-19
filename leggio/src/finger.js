// ================= Dito: tocca o sposta i testi; modifica una sillaba, formato della riga, copia e traslittera =================
const Finger = {
  st:null, line:[], idx:-1,
  // tutte le sillabe della stessa riga di testo
  lineOf(i){ const A=Anno, s=A.strokes[i]; if(!s.lyric) return [i];
    return A.strokes.map((t,k)=>t.t==='text'&&t.lyric&&!t.pron===!s.pron&&Math.abs(t.y-s.y)<.004&&(t.layer||0)===(s.layer||0)?k:-1).filter(k=>k>=0); },
  hitText(p){ const A=Anno; let best=-1,bd=9; A.strokes.forEach((s,i)=>{ if(s.t!=='text'||(s.layer||0)!==A.layer) return; if(hitStroke(s,p[0],p[1],.012)){ const d=Math.abs(s.x-p[0])+Math.abs(s.y-p[1]); if(d<bd){bd=d;best=i;} } }); return best; },
  hit(p){ const t=this.hitText(p); if(t>=0) return t; const A=Anno; for(let i=A.strokes.length-1;i>=0;i--){ const s=A.strokes[i]; if(s.t==='text'||s.t==='img'||(s.layer||0)!==A.layer) continue; if(hitStroke(s,p[0],p[1],.016)) return i; } return -1; },
  hitOld(p){ const A=Anno; let best=-1,bd=9; A.strokes.forEach((s,i)=>{ if(s.t!=='text'||(s.layer||0)!==A.layer) return; if(hitStroke(s,p[0],p[1],.012)){ const d=Math.abs(s.x-p[0])+Math.abs(s.y-p[1]); if(d<bd){bd=d;best=i;} } }); return best; },
  down(p,from){
    $('#fgBar')?.remove(); const i=this.hit(p); this.from=from||'hand';
    if(i<0){ this.st=null; Anno.clearSel(); toast('Tocca un testo, una riga o un segno',1600); return; }
    const line=Anno.strokes[i].t==='text'?this.lineOf(i):[i];
    this.st={p0:p,i,line,orig:line.map(k=>JSON.parse(JSON.stringify(Anno.strokes[k]))),moved:false,single:!Anno.strokes[i].lyric};
    Anno.selIdx=line; Anno.updSelBox(); Anno.redraw();
  },
  move(p){
    const s=this.st; if(!s) return; const dx=p[0]-s.p0[0], dy=p[1]-s.p0[1];
    if(!s.moved&&Math.hypot(dx,dy)<.006) return;
    if(!s.moved){ s.moved=true; Anno.push(); }
    // la riga si sposta in su o in giù; un testo libero si sposta anche di lato
    s.line.forEach((k,j)=>{ const c=JSON.parse(JSON.stringify(s.orig[j])); moveStroke(c,dx,dy); Anno.strokes[k]=c; });
    Anno.updSelBox(); Anno.redraw();
  },
  up(){
    const s=this.st; if(!s) return; this.st=null;
    if(s.moved){ saveAnn(); Anno.buildBar(); }
    this.line=s.line; this.idx=s.i;
    // con la T: tocco senza spostare = modifica il testo
    if(!s.moved&&this.from==='text'&&!Anno.strokes[s.i].lyric){ Anno.clearSel(); const t=Anno.strokes[s.i]; TextBox.open([t.x+.001,t.y]); return; }
    if(Anno.strokes[s.i].t!=='text'){ this.strokeBar(); return; }
    this.bar();
  },
  bar(){
    $('#fgBar')?.remove(); const A=Anno, s=A.strokes[this.idx]; if(!s) return;
    const r=inkCanvas.getBoundingClientRect(); const lyric=!!s.lyric;
    const b=document.createElement('div'); b.id='fgBar'; b.className='pop';
    b.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;min-width:300px">
      <div style="display:flex;gap:6px;align-items:center"><input id="fgTxt" value="${esc(s.text)}" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--panel-2);padding:0 10px;font-size:17px;outline:none"><button class="goldBtn sm" id="fgOk">${iconSvg('check')}</button></div>
      <div class="seg" id="fgFont"><button data-f="sans">Aa</button><button data-f="serif" style="font-family:var(--f-display)">Aa</button><button data-f="music" style="font-family:var(--f-display);font-style:italic">rit.</button>
        <span class="fgCols">${['#111111','#d23b2f','#1f5fd6','#1d8a4a','#8b3fc4','#c8962e'].map(c=>`<button class="sw" data-col="${c}" style="background:${c};width:26px;height:26px" aria-label="Colore"></button>`).join('')}</span>
        <button id="fgB" style="font-weight:900">G</button><button id="fgI" style="font-style:italic">C</button><button id="fgM">A−</button><button id="fgP">A+</button></div>
      <div class="seg"><button id="fgLt">${iconSvg('chevLeft')}</button><button id="fgUp">${iconSvg('up')}</button><button id="fgDn">${iconSvg('down')}</button><button id="fgRt">${iconSvg('chevRight')}</button>
        ${lyric?`<button id="fgPrev" title="Sillaba precedente">${iconSvg('skipBack')}</button><button id="fgNext" title="Sillaba successiva">${iconSvg('skipFwd')}</button><button id="fgGap" title="Nota senza parola: scrivi la sillaba mancante sotto la nota">${iconSvg('plus')} Parola mancante</button><button id="fgCopy">${iconSvg('copy')} Copia sui righi</button>`:''}<button id="fgHl">${iconSvg('pen')} Evidenzia</button><button id="fgTr">${iconSvg('voice')} Traslittera</button><button id="fgDel" style="color:var(--danger)">${iconSvg('trash')}</button></div>
      <div class="hint" style="font-size:12px">${lyric?`Riga di ${this.line.length} sillabe: formato, spostamento e copia valgono per tutta la riga; il testo in alto cambia solo la sillaba toccata.`:'Trascina con il dito per spostarlo.'}</div></div>`;
    $('#app').appendChild(b);
    dockBar(b, r.top+s.y*r.height);
    const L=()=>this.line.map(k=>A.strokes[k]).filter(Boolean);
    const ch=fn=>{ A.push(); L().forEach(fn); A.redraw(); A.updSelBox(); saveAnn(); A.buildBar(); };
    const mark=()=>{ const t=L()[0]||s; b.querySelectorAll('#fgFont [data-f]').forEach(x=>x.classList.toggle('on',(t.font||'sans')===x.dataset.f)); $('#fgB').classList.toggle('on',!!t.bold); $('#fgI').classList.toggle('on',!!t.italic); };
    mark();
    b.querySelector('#fgFont').onclick=e=>{ const x=e.target.closest('button'); if(!x) return;
      if(x.dataset.col){ ch(t=>t.color=x.dataset.col); return; }
      if(x.dataset.f) ch(t=>t.font=x.dataset.f);
      else if(x.id==='fgB'){ const v=!L()[0].bold; ch(t=>t.bold=v); }
      else if(x.id==='fgI'){ const v=!L()[0].italic; ch(t=>t.italic=v); }
      else if(x.id==='fgM') ch(t=>t.size=Math.max(.008,t.size*.9));
      else if(x.id==='fgP') ch(t=>t.size=Math.min(.08,t.size*1.1));
      mark(); };
    const step=.004;
    $('#fgUp').onclick=()=>ch(t=>t.y-=step); $('#fgDn').onclick=()=>ch(t=>t.y+=step); $('#fgLt').onclick=()=>ch(t=>t.x-=step); $('#fgRt').onclick=()=>ch(t=>t.x+=step);
    const save=()=>{ const v=$('#fgTxt').value.trim(); if(v===s.text) return; A.push(); if(!v){ A.strokes.splice(this.idx,1); b.remove(); A.clearSel(); } else s.text=v; A.redraw(); saveAnn(); A.buildBar(); };
    $('#fgOk').onclick=()=>{ save(); b.remove(); A.clearSel(); };
    $('#fgTxt').onkeydown=e=>{ if(e.key==='Enter'){ save(); this.nextSyl(); } if(e.key==='Escape'){ b.remove(); A.clearSel(); } };
    $('#fgDel').onclick=()=>{ A.push(); const del=new Set(this.line); A.strokes=A.strokes.filter((_,k)=>!del.has(k)); b.remove(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar(); };
    const cp=$('#fgCopy'); if(cp) cp.onclick=()=>{ b.remove(); A.selIdx=[...this.line]; A.updSelBox(); LyricCopy.start(); };
    $('#fgTr').onclick=()=>this.translit(b);
    $('#fgHl').onclick=e=>AutoHL.pick(e.currentTarget,c=>{ const bx=A.selBox; if(!bx) return; AutoHL.rect(bx.x0,bx.y0,bx.x1,bx.y1,c); b.remove(); A.clearSel(); toast('Riga evidenziata',1500); });
    const pv=$('#fgPrev'); if(pv){ pv.onclick=()=>{ save(); this.stepSyl(-1); }; $('#fgNext').onclick=()=>{ save(); this.stepSyl(1); }; $('#fgGap').onclick=()=>{ save(); this.gapNote(); }; }
  },
  // Invio: passa alla sillaba successiva della riga
  nextSyl(){ const A=Anno; const ord=[...this.line].sort((a,b)=>A.strokes[a].x-A.strokes[b].x); const j=ord.indexOf(this.idx); if(j>=0&&j<ord.length-1){ this.idx=ord[j+1]; this.bar(); setTimeout(()=>{ const i=$('#fgTxt'); if(i){ i.focus(); i.select(); } },20); } else { $('#fgBar')?.remove(); A.clearSel(); } },
  guessLang(t){ return detectLang(t)||'la'; },
  guessLangOld(t){ t=t.toLowerCase(); if(/sch|ß|[äöü]|\b(und|der|die|das|ich|nicht|mein)\b/.test(t)) return 'de'; if(/[éèêàçœ]|qu'|\b(les|je|vous|dans|pour|mon|votre|avec|nous|est)\b/.test(t)) return 'fr'; return 'la'; },
  translit(bar){
    const A=Anno; const L=this.line.map(k=>A.strokes[k]).filter(Boolean); const all=L.map(t=>t.text).join(' ');
    let lang=this.guessLang(all), where='up';
    const p=document.createElement('div'); p.className='pop'; p.id='fgTrPop';
    const draw=()=>{ p.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;width:300px"><div class="eyebrow">Traslitterazione (pronuncia all'italiana)</div>
      <div class="seg" id="ftL">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${k===lang?'on':''}">${l.split(' ')[0]}</button>`).join('')}</div>
      <div class="seg" id="ftW"><button data-w="up" class="${where==='up'?'on':''}">${iconSvg('up')} Sopra</button><button data-w="down" class="${where==='down'?'on':''}">${iconSvg('down')} Sotto</button></div>
      <div class="hint" style="font-size:15px;line-height:1.6">${L.slice().sort((a,b)=>a.x-b.x).map(t=>`<b>${esc(t.text)}</b> → <span style="color:#5aa0ff">${esc(PRON.conv(t.text,lang))}</span>`).join(' · ')}</div>
      <button class="goldBtn block" id="ftOk">${iconSvg('check')}Scrivi sul rigo</button></div>`;
      p.querySelector('#ftL').onclick=e=>{const x=e.target.closest('[data-l]');if(x){lang=x.dataset.l;draw()}};
      p.querySelector('#ftW').onclick=e=>{const x=e.target.closest('[data-w]');if(x){where=x.dataset.w;draw()}};
      p.querySelector('#ftOk').onclick=()=>{ A.push(); const sz=(L[0]?.size||.016)*.8; const y0=L[0]?.y||0; const ny=where==='up'?y0-(L[0].size*.55+sz*.6):y0+(L[0].size*.55+sz*.7);
        A.strokes=A.strokes.filter(t=>!(t.t==='text'&&t.pron&&Math.abs(t.y-ny)<.004));
        L.forEach(t=>A.strokes.push({t:'text',text:PRON.conv(t.text,lang),x:t.x,y:ny,size:sz,align:t.align||'c',lyric:1,pron:1,font:'sans',bold:true,color:'#1f5fd6',alpha:1,layer:t.layer||0}));
        p.remove(); bar&&bar.remove(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar(); toast('Traslitterazione scritta sul rigo',2200); };
    };
    draw(); $('#app').appendChild(p); const br=bar.getBoundingClientRect(); p.style.left=br.left+'px'; p.style.top=Math.max(70,Math.min(br.top,innerHeight-p.offsetHeight-10))+'px';
  },
  // Dopo una copia: se il testo è in lingua straniera chiede se traslitterare, e lo fa da solo.
  offerTranslit(idx){
    const A=Anno; const L=idx.map(k=>A.strokes[k]).filter(Boolean); if(!L.length) return;
    let lang=detectLang(L.map(t=>t.text).join(' ')); if(!lang||lang==='it'||!PRON[lang]) return;
    const p=document.createElement('div'); p.className='pop'; p.id='fgTrPop';
    const prev=()=>L.slice().sort((a,b)=>a.x-b.x).slice(0,6).map(t=>`<b>${esc(t.text)}</b> → <span style="color:#5aa0ff">${esc(PRON.conv(t.text,lang))}</span>`).join(' · ');
    p.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;width:320px"><b>Testo in ${esc(PRON.names[lang].split(' ')[0].toLowerCase())}: vuoi la pronuncia all'italiana sopra le parole?</b>
      <div class="hint" style="font-size:12.5px">Se la lingua è sbagliata, sceglila:</div>
      <div class="seg" id="otL">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${k===lang?'on':''}">${l.split(' ')[0]}</button>`).join('')}</div>
      <div class="hint" id="otP" style="font-size:14px;line-height:1.6">${prev()}</div>
      <div style="display:flex;gap:8px"><button class="ghostBtn" data-n style="flex:1">No</button><button class="goldBtn" data-y style="flex:1">${iconSvg('voice')}Traslittera</button></div></div>`;
    $('#app').appendChild(p); p.style.left='50%'; p.style.transform='translateX(-50%)'; p.style.bottom='calc(env(safe-area-inset-bottom,0px) + 170px)'; p.style.top='auto';
    p.querySelector('[data-n]').onclick=()=>p.remove();
    p.querySelector('#otL').onclick=e=>{const x=e.target.closest('[data-l]');if(!x)return;lang=x.dataset.l;p.querySelectorAll('#otL button').forEach(y=>y.classList.toggle('on',y===x));p.querySelector('#otP').innerHTML=prev();};
    p.querySelector('[data-y]').onclick=()=>{ p.remove(); this.writeTranslit(L,lang,'up'); toast('Traslitterazione aggiunta sopra la riga',2200); };
  },
  writeTranslit(L,lang,where){
    const A=Anno; A.push(); const sz=(L[0].size||.016)*.8; const y0=L[0].y; const ny=where==='up'?y0-(L[0].size*.55+sz*.6):y0+(L[0].size*.55+sz*.7);
    A.strokes=A.strokes.filter(t=>!(t.t==='text'&&t.pron&&Math.abs(t.y-ny)<.004));
    L.forEach(t=>A.strokes.push({t:'text',text:PRON.conv(t.text,lang),x:t.x,y:ny,size:sz,align:t.align||'c',lyric:1,pron:1,font:'sans',bold:true,color:'#1f5fd6',alpha:1,layer:t.layer||0}));
    A.redraw(); saveAnn(); A.buildBar();
  },
  // barretta per un tratto (riga evidenziata, linea, forma, segno): frecce, duplica, elimina
  strokeBar(){
    $('#fgBar')?.remove(); const A=Anno; const r=inkCanvas.getBoundingClientRect(); const bx=A.selBox||{x0:.4,y0:.4,y1:.45};
    const b=document.createElement('div'); b.id='fgBar'; b.className='pill';
    b.innerHTML=`<button class="ib" data-a="l" aria-label="Sinistra">${iconSvg('chevLeft')}</button><button class="ib" data-a="u" aria-label="Su">${iconSvg('up')}</button><button class="ib" data-a="d" aria-label="Giù">${iconSvg('down')}</button><button class="ib" data-a="r" aria-label="Destra">${iconSvg('chevRight')}</button><button class="ib" data-a="sm" aria-label="Più piccolo">${iconSvg('minus')}</button><button class="ib" data-a="lg" aria-label="Più grande">${iconSvg('plus')}</button><button class="ib" data-a="c" aria-label="Duplica">${iconSvg('copy')}</button><button class="ib" data-a="x" aria-label="Elimina" style="color:var(--danger)">${iconSvg('trash')}</button><button class="ib" data-a="ok" aria-label="Fine">${iconSvg('check')}</button>`;
    $('#app').appendChild(b); dockBar(b, r.top+(bx.y0+(bx.y1||bx.y0))/2*r.height);
    const st=.004;
    b.onclick=e=>{ const a=e.target.closest('[data-a]')?.dataset.a; if(!a) return;
      if(a==='ok'){ b.remove(); A.clearSel(); return; }
      A.push();
      if(a==='x'){ const del=new Set(this.line); A.strokes=A.strokes.filter((_,k)=>!del.has(k)); b.remove(); A.clearSel(); }
      else if(a==='c'){ const n=this.line.map(k=>{ const c=JSON.parse(JSON.stringify(A.strokes[k])); moveStroke(c,.015,.015); return c; }); const base=A.strokes.length; A.strokes.push(...n); this.line=n.map((_,j)=>base+j); A.selIdx=this.line; A.updSelBox(); }
      else if(a==='sm'||a==='lg'){ const f=a==='lg'?1.15:1/1.15; this.line.forEach(k=>{ const t=A.strokes[k]; if(t.t==='gif'){ const cx=t.x+t.w/2, cy=t.y+t.h/2; t.w*=f; t.h*=f; t.x=cx-t.w/2; t.y=cy-t.h/2; } else if(t.t==='stamp') t.size*=f; else if(t.w) t.w*=f; }); A.updSelBox(); }
      else { const [dx,dy]={l:[-st,0],r:[st,0],u:[0,-st],d:[0,st]}[a]; this.line.forEach(k=>moveStroke(A.strokes[k],dx,dy)); A.updSelBox(); }
      A.redraw(); saveAnn(); A.buildBar(); };
  },
  stepSyl(d){ const A=Anno; const ord=[...this.line].sort((a,b)=>A.strokes[a].x-A.strokes[b].x); const j=ord.indexOf(this.idx); const k=clamp(j+d,0,ord.length-1); this.idx=ord[k]; A.selIdx=[...this.line]; A.updSelBox(); A.redraw(); this.bar(); setTimeout(()=>{ const i=$('#fgTxt'); if(i){ i.focus(); i.select(); } },20); },
  // trova le note del rigo sopra la riga che non hanno sillaba e apre la scrittura esattamente sotto la prima
  gapNote(){
    const A=Anno, s=A.strokes[this.idx]; if(!s) return;
    const staves=detectStaves(); const st=[...staves].filter(t=>t.bottom<s.y).pop(); if(!st) return toast('Non trovo il rigo sopra questa riga');
    let notes=[]; try{ notes=detectNotes(st); }catch(e){} if(!notes.length) return toast('Non riconosco le note di questo rigo: tocca sotto la nota con "Testo sulle note"');
    const xs=this.line.map(k=>A.strokes[k]).filter(Boolean).map(t=>t.x), tol=Math.max(.012,st.gap*1.2);
    const free=notes.map((n,i)=>({n,i})).filter(o=>!xs.some(x=>Math.abs(x-o.n)<tol));
    if(!free.length) return toast('Tutte le note di questo rigo hanno già la loro sillaba');
    const next=free.find(o=>o.n>s.x)||free[0];
    $('#fgBar')?.remove(); A.clearSel();
    if(!ST.annotate) Anno.enter(); A.mode='lyric'; A.buildBar();
    LyricType.startAt(st,notes,s.y,s.size,next.i);
  },
  strokeBar0(){},
};
