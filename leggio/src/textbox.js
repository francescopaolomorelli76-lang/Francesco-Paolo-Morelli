// ================= Casella di testo libera · Testo sulle note (sillaba per sillaba) · lettura del testo stampato =================

// ---- T: casella di testo per scrivere qualsiasi cosa (appunti, indicazioni, testo, note) ----
const TextBox = {
  opt:{size:22, font:'sans', bold:false, italic:false, color:null},
  // Casella sulla pagina, come in forScore: tocchi, scrivi lì; ⋯ per formato ed elimina.
  open(p){
    const A=Anno; this.close(true);
    const idx=A.strokes.findIndex(s=>s.t==='text'&&!s.lyric&&hitStroke(s,p[0],p[1],.012));
    const ed=idx>=0?A.strokes[idx]:null;
    const pr=A.presets[A.sel];
    const o=this.opt; if(ed) Object.assign(o,{size:Math.round(ed.size*1100),font:ed.font||'sans',bold:!!ed.bold,italic:!!ed.italic,color:ed.color});
    else { const mem=TStyle.get('text'); if(mem) Object.assign(o,{size:clamp(Math.round(mem.size*1100),8,90),font:mem.font,bold:mem.bold,italic:mem.italic,color:mem.color});
      else o.color=(pr.k==='mask'||pr.k==='hl')?'#111111':(pr.color||'#111111'); }
    const orig=ed?JSON.parse(JSON.stringify(ed)):null;
    const st=ed||{t:'text',text:'',x:p[0],y:p[1],align:'l',alpha:1,layer:A.layer};
    if(ed) ed._editing=true; A.redraw();
    const r=inkCanvas.getBoundingClientRect();
    const box=document.createElement('div'); box.id='textEntry'; box.className='tinline';
    box.innerHTML=`<div id="teIn" contenteditable="true" spellcheck="false" autocapitalize="sentences"></div><button class="tmore" id="tbMore" aria-label="Formato ed elimina">${iconSvg('dots')}</button>`;
    $('#app').appendChild(box);
    const ce=$('#teIn'); ce.innerText=ed?ed.text:'';
    const style=()=>{ const px=o.size/1100*r.width; ce.style.fontSize=px+'px'; ce.style.lineHeight='1.25';
      ce.style.fontFamily=o.font==='sans'?'var(--f-body)':'var(--f-display)'; ce.style.fontWeight=o.bold?'700':(o.font==='music'?'600':'500');
      ce.style.fontStyle=(o.italic||o.font==='music')?'italic':'normal'; ce.style.color=o.color;
      box.style.left=(r.left+st.x*r.width-8)+'px'; box.style.top=(r.top+st.y*r.height-px*.625-6)+'px'; };
    style();
    const save=()=>{ const v=ce.innerText.replace(/\s+$/,''); if(ed) delete ed._editing;
      const props={size:o.size/1100,font:o.font,bold:o.bold,italic:o.italic,color:o.color};
      if(ed){ const changed=v!==orig.text||Object.keys(props).some(k=>props[k]!==(orig[k]??(k==='font'?'sans':k==='bold'||k==='italic'?false:undefined))); if(!v){ A.push(); A.strokes.splice(A.strokes.indexOf(ed),1); } else if(changed){ A.push(); Object.assign(ed,{text:v},props); } }
      else if(v){ A.push(); A.strokes.push({...st,text:v,size:o.size/1100,font:o.font,bold:o.bold,italic:o.italic,color:o.color}); }
      if(v) TStyle.remember('text',{size:o.size/1100,font:o.font,bold:o.bold,italic:o.italic,color:o.color});
      this._last=ed&&v?A.strokes.indexOf(ed):(v&&!ed?A.strokes.length-1:-1);
      A.redraw(); saveAnn(); A.buildBar(); };
    this._close=(cancel)=>{ if(!box.parentNode) return; if(cancel){ if(ed){ delete ed._editing; } A.redraw(); } else save(); box.remove(); $('#tbMenu')?.remove(); document.removeEventListener('pointerdown',outside,true); };
    // tocco fuori dalla casella: salva (come forScore)
    const outside=e=>{ if(e.target.closest('#textEntry,#tbMenu')) return; e.stopPropagation(); e.preventDefault(); this._close(false); };
    setTimeout(()=>document.addEventListener('pointerdown',outside,true),50);
    ce.onkeydown=e=>{ if(e.key==='Escape') this._close(true); };
    $('#tbMore').onclick=e=>{ e.stopPropagation(); this.menu(box,o,style,()=>{ ce.innerText=''; this._close(false); }); };
    setTimeout(()=>{ ce.focus(); const sel=getSelection(); sel.selectAllChildren(ce); sel.collapseToEnd(); },30);
  },
  close(silent){ if(this._close) this._close(false); this._close=null; },
  menu(box,o,style,del){
    $('#tbMenu')?.remove(); const m=document.createElement('div'); m.id='tbMenu'; m.className='pop';
    m.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;min-width:250px">
      <div class="eyebrow">Formato</div>
      <div class="tsInfo" id="tbInfo"></div>
      <div class="seg" id="tbFont"><button data-f="sans" class="${o.font==='sans'?'on':''}">Sans</button><button data-f="serif" class="${o.font==='serif'?'on':''}" style="font-family:var(--f-display)">Serif</button><button data-f="music" class="${o.font==='music'?'on':''}" style="font-family:var(--f-display);font-style:italic">Corsivo</button></div>
      <div class="seg"><button id="tbB" class="${o.bold?'on':''}" style="font-weight:900">G</button><button id="tbI" class="${o.italic?'on':''}" style="font-style:italic">C</button><button id="tbMinus">A−</button><b class="tsPt" id="tbPt" style="min-width:34px;text-align:center;align-self:center"></b><button id="tbPlus">A+</button></div>
      <div class="swatches" id="tbCol">${['#111111','#d23b2f','#1f5fd6','#1d8a4a','#8b3fc4','#c8962e','#ff8a3d','#ffffff'].map(c=>`<button class="sw${c===o.color?' on':''}" style="background:${c};width:28px;height:28px" data-c="${c}" aria-label="Colore"></button>`).join('')}</div>
      <div class="seg" id="tbMore2"><button data-a="move">${iconSvg('hand')} Sposta</button><button data-a="hl">${iconSvg('pen')} Evidenzia</button><button data-a="tr">${iconSvg('voice')} Traslittera</button><button data-a="tt">🌐 Traduci</button></div>
      <button class="ghostBtn danger" id="tbDel">${iconSvg('trash')}Elimina</button></div>`;
    $('#app').appendChild(m); const b=box.getBoundingClientRect();
    m.style.left=clamp(b.right-260,8,innerWidth-280)+'px'; m.style.top=(b.bottom+8+m.offsetHeight>innerHeight-10?Math.max(10,b.top-m.offsetHeight-8):b.bottom+8)+'px';
    const info=()=>{ const t={size:o.size/1100,font:o.font,bold:o.bold,italic:o.italic}; m.querySelector('#tbInfo').textContent=TStyle.label(t); m.querySelector('#tbPt').textContent=o.size; };
    const style0=style; style=()=>{ style0(); info(); }; info();
    // dopo aver scritto: sposta con le frecce, evidenzia, traslittera o traduci (il testo si salva prima)
    m.querySelector('#tbMore2').onclick=e=>{ const a=e.target.closest('[data-a]')?.dataset.a; if(!a) return; m.remove(); this.close(); const i=this._last; if(i==null||i<0||!Anno.strokes[i]) return toast('Scrivi prima il testo',1600);
      Finger.openFor([i]); const b=$('#fgBar'); if(!b) return;
      if(a==='hl') b.querySelector('#fgHl')?.click(); else if(a==='tr') b.querySelector('#fgTr')?.click(); else if(a==='tt') b.querySelector('#fgTt')?.click(); };
    const keep=()=>$('#teIn')?.focus();
    m.querySelector('#tbFont').onclick=e=>{const x=e.target.closest('[data-f]');if(!x)return;o.font=x.dataset.f;m.querySelectorAll('#tbFont button').forEach(y=>y.classList.toggle('on',y===x));style();keep()};
    m.querySelector('#tbB').onclick=()=>{o.bold=!o.bold;m.querySelector('#tbB').classList.toggle('on',o.bold);style();keep()};
    m.querySelector('#tbI').onclick=()=>{o.italic=!o.italic;m.querySelector('#tbI').classList.toggle('on',o.italic);style();keep()};
    m.querySelector('#tbMinus').onclick=()=>{o.size=Math.max(10,o.size-3);style();keep()}; m.querySelector('#tbPlus').onclick=()=>{o.size=Math.min(90,o.size+3);style();keep()};
    m.querySelector('#tbCol').onclick=e=>{const x=e.target.closest('[data-c]');if(!x)return;o.color=x.dataset.c;m.querySelectorAll('#tbCol .sw').forEach(y=>y.classList.toggle('on',y===x));style();keep()};
    m.querySelector('#tbDel').onclick=()=>{ m.remove(); del(); };
  },
};

// ---- Riconoscimento delle teste delle note su un rigo ----
function pageGray(){
  const c=pageCanvas, W=c.width, H=c.height, s=Math.min(1,1400/W), w=Math.round(W*s), h=Math.round(H*s);
  const t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d',{willReadFrequently:true}); x.drawImage(c,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data; const g=new Uint8Array(w*h); for(let i=0;i<w*h;i++) g[i]=(d[i*4]+d[i*4+1]+d[i*4+2])/3<150?1:0;
  return {g,w,h};
}
function detectNotes(st,loose){
  // 1) fascia del rigo  2) tolgo righe del pentagramma e gambi sottili  3) le macchie della misura di una testa di nota sono note
  const {g,w,h}=pageGray(); const gap=Math.max(3,st.gap*h);
  const top=Math.max(2,Math.round(st.top*h-gap*1.8)), bot=Math.min(h-3,Math.round(st.bottom*h+gap*1.3)), bh=bot-top+1;
  // teste vuote (minime, semibrevi): riempio i piccoli buchi chiusi, così non spariscono come righe sottili
  { const vis=new Uint8Array(w*bh), q=[];
    for(let y=top;y<=bot;y++) for(let x=0;x<w;x++){ const k=(y-top)*w+x; if(g[y*w+x]||vis[k]) continue;
      let n=0; const pix=[]; q.push(k); vis[k]=1; let border=false;
      while(q.length){ const c=q.pop(); n++; if(pix.length<=gap*gap) pix.push(c); const cx=c%w, cy=(c/w)|0; if(cx===0||cx===w-1||cy===0||cy===bh-1) border=true;
        for(const d of [1,-1,w,-w]){ const t=c+d; if(t<0||t>=w*bh) continue; if((d===1&&cx===w-1)||(d===-1&&cx===0)) continue; if(!vis[t]&&!g[(((t/w)|0)+top)*w+(t%w)]){ vis[t]=1; q.push(t); } } }
      if(!border&&n<=gap*gap*.7) for(const c of pix) g[(((c/w)|0)+top)*w+(c%w)]=1; } }
  const m=new Uint8Array(w*bh);
  for(let y=top;y<=bot;y++) for(let x=2;x<w-2;x++){ const i=y*w+x; if(!g[i]) continue;
    const vthin = !g[i-2*w]&&!g[i+2*w] && (!g[i-w]||!g[i+w]);                 // riga orizzontale sottile
    const hthin = !g[i-2]&&!g[i+2] && (!g[i-1]||!g[i+1]);                       // gambo o stanghetta sottile
    if(!vthin&&!hthin) m[(y-top)*w+x]=1; }
  const seen=new Uint8Array(w*bh), out=[], stack=[]; const x0=Math.round(w*.03);
  for(let start=0;start<w*bh;start++){ if(!m[start]||seen[start]) continue;
    let minx=w,maxx=0,miny=bh,maxy=0,n=0; stack.push(start); seen[start]=1;
    while(stack.length){ const k=stack.pop(), x=k%w, y=(k/w)|0; n++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
      for(const d of [1,-1,w,-w]){ const q=k+d; if(q>=0&&q<w*bh&&m[q]&&!seen[q]){ seen[q]=1; stack.push(q); } } }
    const cw=maxx-minx+1, ch=maxy-miny+1;
    if(minx<x0) continue;
    if(loose){ if(cw>=gap*.45&&cw<=gap*3&&ch>=gap*.3&&ch<=gap*2.2&&n>=gap*gap*.12) out.push((minx+maxx)/2/w); continue; }
    if(cw>=gap*.75&&cw<=gap*2.4&&ch>=gap*.45&&ch<=gap*1.6&&n>=gap*gap*.25) out.push((minx+maxx)/2/w);
    else if(cw>gap*2.4&&ch>=gap*.45&&ch<=gap*1.6&&n>=cw*gap*.35){ const k2=Math.round(cw/(gap*1.35)); for(let j=0;j<k2;j++) out.push((minx+(j+.5)*cw/k2)/w); } // teste attaccate (accordi, seconde)
  }
  out.sort((a,b)=>a-b); const res=[]; for(const v of out){ if(!res.length||v-res[res.length-1]>gap*.6/w) res.push(v); }
  return res;
}

// ---- Testo sulle note: tocchi sotto un rigo, scrivi una sillaba, Invio → passa alla nota successiva ----
const LyricType = {
  st:null, notes:[], i:0, y:0,
  start(p){
    ocrWarmup().catch(()=>{});
    const staves=detectStaves(); if(!staves.length){ toast('Non trovo i pentagrammi in questa pagina'); return; }
    // il rigo sopra il punto toccato
    const st=[...staves].filter(s=>s.top<p[1]).pop()||staves[0]; this.st=st;
    let notes=[]; try{ notes=detectNotes(st); }catch(e){}
    this.notes=notes.length?notes:null;
    // riga del testo: allineata a sillabe già scritte sotto questo rigo, altrimenti sotto il rigo
    const nx=staves[staves.indexOf(st)+1]; const lim=nx?nx.top:1;
    const ex=Anno.strokes.find(s=>s.t==='text'&&s.lyric&&s.y>st.bottom&&s.y<lim);
    this.y=ex?ex.y:Math.min(lim-st.gap*.6, Math.max(p[1], st.bottom+st.gap*2.2));
    // grandezza: quella scelta l'ultima volta in questo spartito, altrimenti dalla misura del rigo (mai enorme)
    const base=TStyle.lyricSize(st), mem=TStyle.get('lyric');
    this.size=mem?clamp(mem.size,.006,.05):TStyle.sane(ex&&ex.size,base);
    this.style=mem||(ex?{font:ex.font||'sans',bold:ex.bold!==false,italic:!!ex.italic,color:ex.color||'#111111'}:null);
    // la sillaba va sotto la nota toccata: si cerca la nota più vicina (anche con il riconoscimento "largo" per note piccole)
    const tol=this.tol(st);
    this.i=this.notes?this.nearest(p[0]):0; this.x=(this.notes&&Math.abs(this.notes[this.i]-p[0])<tol)?this.notes[this.i]:p[0];
    if(this.x===p[0]){ let loose=[]; try{ loose=detectNotes(st,true); }catch(e){} const n2=nearestNote(loose,p[0]); if(n2!=null&&Math.abs(n2-p[0])<tol) this.x=n2; }
    if(this.notes&&!this.notes.includes(this.x)){ this.notes.push(this.x); this.notes.sort((a,b)=>a-b); }
    if(this.notes) this.i=this.notes.indexOf(this.x);
    this.box(); Anno.redraw(); this.marks();
  },
  // distanza utile per agganciare la nota: circa tre spazi del rigo
  tol(st){ const k=inkCanvas.width?inkCanvas.height/inkCanvas.width:1.4; return Math.max(.022,(st?st.gap:.01)*k*3); },
  props(){ const m=this.style||{}; return {font:m.font||'sans',bold:m.bold!==false,italic:!!m.italic,color:m.color||'#111111'}; },
  nearest(x){ let b=0,bd=9; this.notes.forEach((n,k)=>{const d=Math.abs(n-x); if(d<bd){bd=d;b=k}}); return b; },
  marks(){ // segnini sulle note riconosciute, la nota corrente in oro
    const L=$('#lyMarks')||Object.assign(document.createElement('div'),{id:'lyMarks'}); if(!L.parentNode) $('#app').appendChild(L);
    const r=inkCanvas.getBoundingClientRect(); L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;z-index:24`;
    L.innerHTML=(this.notes||[this.x]).map((n,k)=>`<i style="position:absolute;left:${n*100}%;top:${this.y*100}%;width:${k===this.i?12:6}px;height:${k===this.i?12:6}px;margin:-${k===this.i?6:3}px 0 0 -${k===this.i?6:3}px;border-radius:50%;background:${k===this.i?'#d6a84e':'rgba(31,95,214,.55)'};box-shadow:0 0 0 2px #fff"></i>`).join('');
  },
  box(){
    $('#textEntry')?.remove(); const r=inkCanvas.getBoundingClientRect(); const b=document.createElement('div'); b.id='textEntry'; b.className='lybox';
    b.innerHTML=`<button class="ib" id="lyPrev" aria-label="Nota precedente">${iconSvg('chevLeft')}</button><input id="lyIn" placeholder="sillaba (Invio = nota dopo)" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"><button class="ib" id="lyNext" aria-label="Nota dopo">${iconSvg('chevRight')}</button><button class="ib" id="lyGap" title="Prossima nota senza parola" aria-label="Prossima nota senza parola">${iconSvg('skipFwd')}</button>
      <button class="ghostBtn" id="lyOcr" title="Legge il testo stampato di un altro rigo e lo copia qui">${iconSvg('copy')}Copia dal rigo…</button><button class="ghostBtn" id="lyTr" title="Pronuncia all'italiana della riga">${iconSvg('voice')}Traslittera</button><button class="ghostBtn" id="lyTt" title="Traduci la riga in italiano">🌐 Traduci</button><button class="ghostBtn" id="lySt" title="Carattere, colore e grandezza">Aa <small id="lyPt">${TStyle.pt(this.size)}</small></button><button class="ib" id="lyX" aria-label="Chiudi">${iconSvg('close')}</button>`;
    $('#app').appendChild(b);
    const place=()=>dockBar(b, r.top+this.y*r.height);
    place(); this._place=place;
    const inp=$('#lyIn');
    const commit=adv=>{ const v=inp.value.trim(); if(v){ Anno.push(); const old=Anno.strokes.findIndex(s=>s.t==='text'&&s.lyric&&Math.abs(s.y-this.y)<.003&&Math.abs(s.x-this.x)<.004); const s={t:'text',text:v,x:this.x,y:this.y,size:this.size,align:'c',lyric:1,...this.props(),alpha:1,layer:Anno.layer}; if(old>=0) Anno.strokes[old]=s; else Anno.strokes.push(s); saveAnn(); }
      inp.value=''; if(adv) this.step(adv); Anno.redraw(); };
    inp.onkeydown=e=>{ if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); commit(1); } else if(e.key===' '&&inp.value.trim()){ e.preventDefault(); commit(1); } else if(e.key==='Backspace'&&!inp.value){ this.step(-1); } else if(e.key==='Escape') this.close(); };
    $('#lyNext').onclick=()=>{ commit(1); inp.focus(); }; $('#lyPrev').onclick=()=>{ commit(0); this.step(-1); inp.focus(); };
    $('#lyGap').onclick=()=>{ commit(0); this.nextGap(); inp.focus(); };
    $('#lyX').onclick=()=>this.close(); $('#lyOcr').onclick=()=>this.ocrPick();
    $('#lyTr').onclick=()=>{ const idx=Anno.strokes.map((s,k)=>s.t==='text'&&s.lyric&&!s.pron&&Math.abs(s.y-this.y)<.004?k:-1).filter(k=>k>=0); if(!idx.length) return toast('Questa riga non ha ancora testo: scrivilo o copialo prima'); Finger.line=idx; Finger.idx=idx[0]; Finger.translit($('#textEntry')); };
    const rowIdx=()=>Anno.strokes.map((s,k)=>s.t==='text'&&s.lyric&&!s.pron&&!s.tr&&Math.abs(s.y-this.y)<.004?k:-1).filter(k=>k>=0);
    $('#lyTt').onclick=()=>{ const idx=rowIdx(); if(!idx.length) return toast('Questa riga non ha ancora testo: scrivilo o copialo prima'); Translate.open(idx.map(k=>Anno.strokes[k]),$('#textEntry')); };
    $('#lySt').onclick=e=>TStyle.pick(e.currentTarget,'lyric',{size:this.size,...this.props()},t=>{ this.size=t.size; this.style=t; const idx=rowIdx();
      if(idx.length){ Anno.push(); idx.forEach(k=>Object.assign(Anno.strokes[k],{size:t.size,font:t.font,bold:t.bold,italic:t.italic,color:t.color})); Anno.redraw(); saveAnn(); }
      const pt=$('#lyPt'); if(pt) pt.textContent=TStyle.pt(t.size); inp.focus(); });
    setTimeout(()=>inp.focus(),20);
  },
  startAt(st,notes,y,size,i){ this.st=st; this.notes=notes&&notes.length?notes:null; this.y=y; this.size=size; this.i=Math.max(0,i); this.x=notes&&notes.length?notes[this.i]:.5; this.box(); Anno.redraw(); this.marks(); },
  nextGap(){ if(!this.notes) return; const xs=Anno.strokes.filter(s=>s.t==='text'&&s.lyric&&!s.pron&&Math.abs(s.y-this.y)<.004).map(s=>s.x); const tol=Math.max(.012,this.st.gap*1.2);
    for(let k=1;k<=this.notes.length;k++){ const j=(this.i+k)%this.notes.length; if(!xs.some(x=>Math.abs(x-this.notes[j])<tol)){ this.i=j; this.x=this.notes[j]; this._place&&this._place(); this.marks(); return; } }
    toast('Tutte le note hanno la loro sillaba',1800); },
  step(d){ if(this.notes){ this.i=clamp(this.i+d,0,this.notes.length-1); this.x=this.notes[this.i]; } else this.x=clamp(this.x+d*.05,.02,.98); this._place&&this._place(); this.marks(); },
  close(){ $('#textEntry')?.remove(); $('#lyMarks')?.remove(); this.st=null; },
  // Omoritmia: legge il testo stampato sotto un altro rigo e lo scrive sotto questo, alla stessa altezza delle note.
  async ocrPick(){
    const staves=detectStaves(); const me=this.st; const target=this;
    const L=document.createElement('div'); L.id='lcLayer'; const r=inkCanvas.getBoundingClientRect();
    L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:27`;
    L.innerHTML=staves.map((st,i)=>st===me?'':`<button data-st="${i}" class="lcBand${st.printed?' ref':''}" style="top:${(st.bottom+st.gap*.3)*100}%;height:${st.gap*3.2*100}%">${st.printed?'Copia questo testo':'(senza testo)'}</button>`).join('')+`<div class="lcLegend"><i style="background:#1f5fd6"></i>Blu: riga con testo stampato <i style="background:#999"></i>Grigio: senza testo stampato <i style="background:#d6a84e;border-radius:50%"></i>Pallino oro: la nota dove scrivi</div><div class="lcBar pill"><span class="hint" style="padding:0 10px">Tocca il testo stampato da copiare</span><button class="ib" data-x aria-label="Annulla">${iconSvg('close')}</button></div>`;
    $('#app').appendChild(L);
    L.onclick=e=>{ if(e.target.closest('[data-x]')){ L.remove(); return; } const b=e.target.closest('[data-st]'); if(!b) return; L.remove(); this.adjustBand(staves[+b.dataset.st]); };
  },
  // La fascia blu si sposta (frecce o trascinando) e si allarga/stringe: legge solo la riga di testo che contiene.
  // opts.y: fascia centrata dove si è toccato · opts.free: senza copia (aperta dal Dito)
  adjustBand(src,opts={}){
    const target=this, copy=!opts.free&&!!this.st; const r=inkCanvas.getBoundingClientRect(); const g=src.gap;
    const all=detectStaves(); const nx=all.find(s=>s.top>src.bottom+g); const lim=nx?nx.top-g*.25:1;
    const band=opts.y!=null?{y0:Math.max(src.bottom+g*.2,opts.y-g*.9),y1:Math.min(lim,opts.y+g*.9)}:{y0:src.bottom+g*.35,y1:Math.max(src.bottom+g*1.6,Math.min(lim,src.bottom+g*2.9))};
    if(band.y1-band.y0<g) band.y1=band.y0+g*1.6;
    const L=document.createElement('div'); L.id='lcLayer';
    L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:27`;
    L.innerHTML=`<div class="rdBand"><span>Fascia blu = riga di testo da leggere · trascinala o usa le frecce</span><i class="rdH" data-e="t"></i><i class="rdH" data-e="b"></i></div>
      <div class="lcBar pill"><button class="ib" data-mv="-1" aria-label="Su">${iconSvg('up')}</button><button class="ib" data-mv="1" aria-label="Giù">${iconSvg('down')}</button>
        <button class="ib" data-sz="1" aria-label="Allarga la fascia" title="Allarga">${iconSvg('plus')}</button><button class="ib" data-sz="-1" aria-label="Stringi la fascia" title="Stringi">${iconSvg('minus')}</button>
        <button class="ghostBtn" data-hl style="height:36px">${iconSvg('pen')}Evidenzia</button><button class="ghostBtn" data-tr style="height:36px">${iconSvg('voice')}Traslittera</button><button class="ghostBtn" data-tt style="height:36px">🌐 Traduci</button>
        ${copy?`<button class="ghostBtn" data-st style="height:36px">Aa <small>${TStyle.pt(target.size)}</small></button><button class="goldBtn sm" data-ok>${iconSvg('check')}Leggi e copia</button>`:''}<button class="ib" data-x aria-label="Annulla">${iconSvg('close')}</button></div>`;
    $('#app').appendChild(L); const B=L.querySelector('.rdBand');
    const place=()=>{ B.style.top=band.y0*100+'%'; B.style.height=(band.y1-band.y0)*100+'%'; }; place();
    B.onpointerdown=e=>{ e.preventDefault(); B.setPointerCapture(e.pointerId); const edge=e.target.dataset.e; const y=e.clientY, a0={...band};
      const mv=ev=>{ const d=(ev.clientY-y)/r.height;
        if(edge==='t') band.y0=Math.min(a0.y1-g*.8,a0.y0+d); else if(edge==='b') band.y1=Math.max(a0.y0+g*.8,a0.y1+d); else { band.y0=a0.y0+d; band.y1=a0.y1+d; }
        band.y0=clamp(band.y0,0,.98); band.y1=clamp(band.y1,band.y0+.01,1); place(); };
      const up=()=>{ B.removeEventListener('pointermove',mv); B.removeEventListener('pointerup',up); };
      B.addEventListener('pointermove',mv); B.addEventListener('pointerup',up); };
    const read=async()=>{ L.remove(); busy('Leggo il testo…'); try{ const w=await readLyrics({...band,gap:g}); busy(); if(!w.length) toast('Non leggo testo in quella fascia: spostala sulla riga delle parole e riprova',3600); return w; }catch(err){ busy(); toast(err.message||'Lettura non riuscita',3400); return []; } };
    const pseudo=words=>{ const yy=(band.y0+band.y1)/2, sz=TStyle.lyricSize(src); return words.map(w=>({t:'text',text:w.text,x:w.x,y:yy,size:sz,align:'c',layer:Anno.layer})); };
    L.onclick=async e=>{
      if(e.target.closest('[data-x]')){ L.remove(); return; }
      const mvb=e.target.closest('[data-mv]'); if(mvb){ const d=+mvb.dataset.mv*g*.4; band.y0=clamp(band.y0+d,0,.97); band.y1=clamp(band.y1+d,band.y0+.01,1); place(); return; }
      const szb=e.target.closest('[data-sz]'); if(szb){ const d=+szb.dataset.sz*g*.3; if(band.y1-band.y0+2*d>=g*.7){ band.y0=clamp(band.y0-d,0,.98); band.y1=clamp(band.y1+d,band.y0+.01,1); place(); } return; }
      const stb=e.target.closest('[data-st]'); if(stb){ TStyle.pick(stb,'lyric',{size:target.size,...target.props()},t=>{ target.size=t.size; target.style=t; stb.querySelector('small').textContent=TStyle.pt(t.size); }); return; }
      const hb=e.target.closest('[data-hl]'); if(hb){ AutoHL.pick(hb,c=>{ const sp=AutoHL.inkSpan(band.y0,band.y1); if(!sp) return toast('Niente da evidenziare in quella fascia'); L.remove(); AutoHL.rect(sp[0],band.y0,sp[1],band.y1,c); toast('Testo evidenziato',1500); }); return; }
      if(e.target.closest('[data-tr]')){ const words=await read(); if(!words.length) return;
        let lang=detectLang(words.map(w=>w.text).join(' '))||'la'; if(lang==='it') lang='la';
        Finger.writeTranslit(pseudo(words),lang,'up'); toast('Pronuncia scritta sopra il testo stampato · con il Dito ✋ la sposti',3200); return; }
      if(e.target.closest('[data-tt]')){ const words=await read(); if(!words.length) return; Translate.open(pseudo(words),null); return; }
      if(!e.target.closest('[data-ok]')) return;
      const words=await read(); if(!words.length) return;
      Anno.push(); const n=target.notes; const added=[]; const tol=target.tol(target.st);
      for(const w of words){ let x=w.x; if(n&&n.length){ const v=nearestNote(n,x); if(v!=null&&Math.abs(v-x)<tol) x=v; }
        Anno.strokes.push({t:'text',text:w.text,x,y:target.y,size:target.size,align:'c',lyric:1,...target.props(),alpha:1,layer:Anno.layer}); added.push(Anno.strokes.length-1); }
      saveAnn(); Anno.redraw(); Anno.buildBar();
      target.box(); target.marks();
      toast(`${added.length} sillabe copiate · se ne manca qualcuna: tocca la nota e scrivila qui, oppure con il Dito ✋ tocca lo spazio vuoto nella riga`,4800);
      Finger.offerTranslit(added); };
  },
};

// Lettura del testo stampato sotto un rigo (Vision di Apple nell'app; Tesseract nel browser).
// 1) legge la fascia intera  2) tiene la riga di testo con più parole  3) rilegge, ingranditi, i pezzi d'inchiostro rimasti senza parola
async function ocrImage(cv){ return (window.MozartNative&&MozartNative.ocr)?(await MozartNative.ocr(cv.toDataURL('image/jpeg',.92)))||[]:await ocrBrowser(cv); }
async function readLyrics(st){
  const c=pageCanvas, W=c.width, H=c.height;
  const y0=Math.round((st.y0!=null?st.y0:st.bottom+st.gap*.3)*H), y1=Math.round(Math.min(H,(st.y1!=null?st.y1:st.bottom+st.gap*3.5)*H));
  // solo la striscia del testo, alla misura che serve alla lettura (caratteri alti ~24 px), in bianco e nero
  const gapPx=st.gap*H, k=Math.min(3,Math.max(.3,34/Math.max(1,gapPx)));
  const cut=document.createElement('canvas'); cut.width=Math.round(W*k); cut.height=Math.max(1,Math.round((y1-y0)*k));
  const cx=cut.getContext('2d',{willReadFrequently:true}); cx.fillStyle='#fff'; cx.fillRect(0,0,cut.width,cut.height); cx.imageSmoothingQuality='high'; cx.drawImage(c,0,y0,W,y1-y0,0,0,cut.width,cut.height);
  cleanForOcr(cut,gapPx*k);
  let res=(await ocrImage(cut)).filter(w=>w&&w.text&&/[A-Za-zÀ-ÿ]/.test(w.text));
  // righe di testo: si tiene quella con più lettere (prima: la più alta, e un segno sopra il testo faceva perdere tutta la riga)
  let band=[0,1];
  if(res.length&&res[0].y!=null){
    const yc=w=>w.y+(w.h||.3)/2; const sorted=res.slice().sort((a,b)=>yc(a)-yc(b)); const lines=[];
    for(const w of sorted){ const l=lines[lines.length-1]; if(l&&yc(w)-l.y<Math.max(.18,(w.h||.3)*.7)){ l.w.push(w); l.n+=w.text.length; l.y=(l.y*(l.w.length-1)+yc(w))/l.w.length; } else lines.push({y:yc(w),w:[w],n:w.text.length}); }
    const mx=Math.max(...lines.map(l=>l.n)); const best=lines.find(l=>l.n>=mx*.6);
    res=best.w; const hh=Math.max(...res.map(w=>w.h||.3)); band=[clamp(best.y-hh*.9,0,1),clamp(best.y+hh*.9,0,1)];
  }
  // pezzi d'inchiostro senza parola: si rileggono da soli, più grandi
  try{
    const extra=[]; const CW=cut.width, CH=cut.height, d=cut.getContext('2d').getImageData(0,0,CW,CH).data;
    const ya=Math.floor(band[0]*CH), yb=Math.ceil(band[1]*CH), ink=new Uint8Array(CW);
    for(let x=0;x<CW;x++){ for(let y=ya;y<yb;y++){ if(d[(y*CW+x)*4]<128){ ink[x]=1; break; } } }
    const covered=x=>res.some(w=>x>=(w.x-.004)*CW&&x<=(w.x+w.w+.004)*CW);
    const join=gapPx*k*.9, runs=[]; let st0=-1, last=-1;
    for(let x=0;x<=CW;x++){ const on=x<CW&&ink[x]&&!covered(x); if(on){ if(st0<0) st0=x; last=x; } else if(st0>=0&&x-last>join){ runs.push([st0,last]); st0=-1; } }
    for(const [a,b] of runs.filter(r=>r[1]-r[0]>gapPx*k*.6).slice(0,16)){
      const pad=Math.round(gapPx*k*.6), ax=Math.max(0,a-pad), bx=Math.min(CW,b+pad), z=1.7;
      const pc=document.createElement('canvas'); pc.width=Math.round((bx-ax)*z)+40; pc.height=Math.round((yb-ya)*z)+40; const px=pc.getContext('2d');
      px.fillStyle='#fff'; px.fillRect(0,0,pc.width,pc.height); px.imageSmoothingQuality='high'; px.drawImage(cut,ax,ya,bx-ax,yb-ya,20,20,pc.width-40,pc.height-40);
      const got=(await ocrImage(pc)).filter(w=>w&&w.text&&/[A-Za-zÀ-ÿ]/.test(w.text));
      for(const w of got){ const gx=(ax+(w.x*pc.width-20)/z)/CW, gw=w.w*pc.width/z/CW; extra.push({text:w.text,x:gx,w:gw,y:band[0],h:band[1]-band[0]}); }
    }
    if(extra.length){ res=res.concat(extra).sort((a,b)=>a.x-b.x); }
  }catch(e){}
  // parole → sillabe: "Glo - ri - a" restano separate; le parole senza trattini restano intere
  const out=[]; for(const w of res){ const parts=String(w.text).split(/\s+/).filter(Boolean); const step=w.w/Math.max(1,parts.length);
    parts.forEach((t,i)=>{ if(/^[-–—_]+$/.test(t)){ if(out.length&&!/-$/.test(out[out.length-1].text)) out[out.length-1].text+='-'; return; } t=t.replace(/_+/g,''); if(!t) return; out.push({text:t,x:w.x+step*(i+.5)}); }); }
  return out;
}

// Nel browser: Tesseract (scaricato la prima volta, poi in cache). Restituisce parole con posizione 0…1.
// Nel browser: Tesseract, caricato UNA volta e tenuto pronto (prima veniva ricreato a ogni lettura: lentissimo).
let _ocrWorker=null;
function ocrWarmup(){
  if(window.MozartNative&&MozartNative.ocr) return Promise.resolve(null);
  if(_ocrWorker) return _ocrWorker;
  _ocrWorker=(async()=>{
    if(!window.Tesseract) await new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; sc.onload=res; sc.onerror=()=>rej(new Error('Lettura del testo non disponibile senza internet')); document.head.appendChild(sc); });
    const w=await Tesseract.createWorker('ita+fra+lat');
    await w.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
    return w;
  })();
  _ocrWorker.catch(()=>{ _ocrWorker=null; });
  return _ocrWorker;
}
async function ocrBrowser(canvas){
  if(!_ocrWorker) busy('Preparo la lettura del testo (solo la prima volta)…');
  const w=await ocrWarmup(); busy('Leggo il testo stampato…');
  const {data}=await w.recognize(canvas); const W=canvas.width;
  const Hh=canvas.height;
  return (data.words||[]).filter(x=>x.text&&x.confidence>8&&/[A-Za-zÀ-ÿ]/.test(x.text)).map(x=>({text:x.text,x:x.bbox.x0/W,w:(x.bbox.x1-x.bbox.x0)/W,y:x.bbox.y0/Hh,h:(x.bbox.y1-x.bbox.y0)/Hh}));
}

// Bianco e nero netto e senza le linee orizzontali lunghe (estensioni delle sillabe "____"), che confondono la lettura.
function cleanForOcr(c,gap){
  const x=c.getContext('2d',{willReadFrequently:true}), W=c.width, H=c.height, im=x.getImageData(0,0,W,H), d=im.data;
  let tot=0; for(let i=0;i<W*H;i++) tot+=d[i*4]+d[i*4+1]+d[i*4+2]; const thr=tot/(W*H)*.72;
  const g=new Uint8Array(W*H); for(let i=0;i<W*H;i++) g[i]=(d[i*4]+d[i*4+1]+d[i*4+2])<thr?1:0;
  const long=Math.max(12,gap*2.2), T=Math.max(2,Math.round(gap*.12));
  for(let y=T;y<H-T;y++){ let st=-1; for(let i=0;i<=W;i++){ const on=i<W&&g[y*W+i]&&!(g[(y-T)*W+i]&&g[(y+T)*W+i]);
    if(on){ if(st<0) st=i; } else if(st>=0){ if(i-st>long) for(let k=st;k<i;k++){ g[y*W+k]=0; g[(y-1)*W+k]=0; g[(y+1)*W+k]=0; } st=-1; } } }
  for(let i=0;i<W*H;i++){ const v=g[i]?0:255; d[i*4]=d[i*4+1]=d[i*4+2]=v; d[i*4+3]=255; }
  x.putImageData(im,0,0);
}
