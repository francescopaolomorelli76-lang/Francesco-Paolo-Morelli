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
    else o.color=(pr.k==='mask'||pr.k==='hl')?'#111111':(pr.color||'#111111');
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
      <div class="seg" id="tbFont"><button data-f="sans" class="${o.font==='sans'?'on':''}">Aa</button><button data-f="serif" class="${o.font==='serif'?'on':''}" style="font-family:var(--f-display)">Aa</button><button data-f="music" class="${o.font==='music'?'on':''}" style="font-family:var(--f-display);font-style:italic">rit.</button></div>
      <div class="seg"><button id="tbB" class="${o.bold?'on':''}" style="font-weight:900">G</button><button id="tbI" class="${o.italic?'on':''}" style="font-style:italic">C</button><button id="tbMinus">A−</button><button id="tbPlus">A+</button></div>
      <div class="swatches" id="tbCol">${['#111111','#d23b2f','#1f5fd6','#1d8a4a','#8b3fc4','#c8962e','#ff8a3d','#ffffff'].map(c=>`<button class="sw${c===o.color?' on':''}" style="background:${c};width:28px;height:28px" data-c="${c}" aria-label="Colore"></button>`).join('')}</div>
      <button class="ghostBtn danger" id="tbDel">${iconSvg('trash')}Elimina</button></div>`;
    $('#app').appendChild(m); const b=box.getBoundingClientRect();
    m.style.left=clamp(b.right-260,8,innerWidth-280)+'px'; m.style.top=(b.bottom+8+m.offsetHeight>innerHeight-10?Math.max(10,b.top-m.offsetHeight-8):b.bottom+8)+'px';
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
function detectNotes(st){
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
    const staves=detectStaves(); if(!staves.length){ toast('Non trovo i pentagrammi in questa pagina'); return; }
    // il rigo sopra il punto toccato
    const st=[...staves].filter(s=>s.top<p[1]).pop()||staves[0]; this.st=st;
    let notes=[]; try{ notes=detectNotes(st); }catch(e){}
    this.notes=notes.length?notes:null;
    // riga del testo: allineata a sillabe già scritte sotto questo rigo, altrimenti sotto il rigo
    const nx=staves[staves.indexOf(st)+1]; const lim=nx?nx.top:1;
    const ex=Anno.strokes.find(s=>s.t==='text'&&s.lyric&&s.y>st.bottom&&s.y<lim);
    this.y=ex?ex.y:Math.min(lim-st.gap*.6, Math.max(p[1], st.bottom+st.gap*2.2));
    this.size=ex?ex.size:Math.max(.014,st.gap*1.9);
    this.i=this.notes?this.nearest(p[0]):0; this.x=this.notes?this.notes[this.i]:p[0];
    this.box(); Anno.redraw(); this.marks();
  },
  nearest(x){ let b=0,bd=9; this.notes.forEach((n,k)=>{const d=Math.abs(n-x); if(d<bd){bd=d;b=k}}); return b; },
  marks(){ // segnini sulle note riconosciute, la nota corrente in oro
    const L=$('#lyMarks')||Object.assign(document.createElement('div'),{id:'lyMarks'}); if(!L.parentNode) $('#app').appendChild(L);
    const r=inkCanvas.getBoundingClientRect(); L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;z-index:24`;
    L.innerHTML=(this.notes||[this.x]).map((n,k)=>`<i style="position:absolute;left:${n*100}%;top:${this.y*100}%;width:${k===this.i?12:6}px;height:${k===this.i?12:6}px;margin:-${k===this.i?6:3}px 0 0 -${k===this.i?6:3}px;border-radius:50%;background:${k===this.i?'#d6a84e':'rgba(31,95,214,.55)'};box-shadow:0 0 0 2px #fff"></i>`).join('');
  },
  box(){
    $('#textEntry')?.remove(); const r=inkCanvas.getBoundingClientRect(); const b=document.createElement('div'); b.id='textEntry'; b.className='lybox';
    b.innerHTML=`<button class="ib" id="lyPrev" aria-label="Nota precedente">${iconSvg('chevLeft')}</button><input id="lyIn" placeholder="sillaba (Invio = nota dopo)" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"><button class="ib" id="lyNext" aria-label="Salta nota">${iconSvg('chevRight')}</button>
      <button class="ghostBtn" id="lyOcr" title="Legge il testo stampato di un altro rigo e lo copia qui">${iconSvg('copy')}Copia dal rigo…</button><button class="ib" id="lyX" aria-label="Chiudi">${iconSvg('close')}</button>`;
    $('#app').appendChild(b);
    const place=()=>{ b.style.left=clamp(r.left+this.x*r.width-150,8,innerWidth-470)+'px'; b.style.top=clamp(r.top+this.y*r.height+r.height*this.size*.9,60,innerHeight-70)+'px'; };
    place(); this._place=place;
    const inp=$('#lyIn');
    const commit=adv=>{ const v=inp.value.trim(); if(v){ Anno.push(); const old=Anno.strokes.findIndex(s=>s.t==='text'&&s.lyric&&Math.abs(s.y-this.y)<.003&&Math.abs(s.x-this.x)<.004); const s={t:'text',text:v,x:this.x,y:this.y,size:this.size,align:'c',lyric:1,color:'#111111',alpha:1,layer:Anno.layer}; if(old>=0) Anno.strokes[old]=s; else Anno.strokes.push(s); saveAnn(); }
      inp.value=''; if(adv) this.step(adv); Anno.redraw(); };
    inp.onkeydown=e=>{ if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); commit(1); } else if(e.key===' '&&inp.value.trim()){ e.preventDefault(); commit(1); } else if(e.key==='Backspace'&&!inp.value){ this.step(-1); } else if(e.key==='Escape') this.close(); };
    $('#lyNext').onclick=()=>{ commit(1); inp.focus(); }; $('#lyPrev').onclick=()=>{ commit(0); this.step(-1); inp.focus(); };
    $('#lyX').onclick=()=>this.close(); $('#lyOcr').onclick=()=>this.ocrPick();
    setTimeout(()=>inp.focus(),20);
  },
  step(d){ if(this.notes){ this.i=clamp(this.i+d,0,this.notes.length-1); this.x=this.notes[this.i]; } else this.x=clamp(this.x+d*.05,.02,.98); this._place&&this._place(); this.marks(); },
  close(){ $('#textEntry')?.remove(); $('#lyMarks')?.remove(); this.st=null; },
  // Omoritmia: legge il testo stampato sotto un altro rigo e lo scrive sotto questo, alla stessa altezza delle note.
  async ocrPick(){
    const staves=detectStaves(); const me=this.st; const target=this;
    const L=document.createElement('div'); L.id='lcLayer'; const r=inkCanvas.getBoundingClientRect();
    L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:27`;
    L.innerHTML=staves.map((st,i)=>st===me?'':`<button data-st="${i}" class="lcBand${st.printed?' ref':''}" style="top:${(st.bottom+st.gap*.3)*100}%;height:${st.gap*3.2*100}%">${st.printed?'Copia questo testo':'(senza testo)'}</button>`).join('')+`<div class="lcBar pill"><span class="hint" style="padding:0 10px">Tocca il testo stampato da copiare</span><button class="ib" data-x aria-label="Annulla">${iconSvg('close')}</button></div>`;
    $('#app').appendChild(L);
    L.onclick=async e=>{ if(e.target.closest('[data-x]')){ L.remove(); return; } const b=e.target.closest('[data-st]'); if(!b) return; L.remove();
      const src=staves[+b.dataset.st]; busy('Leggo il testo…');
      try{ const words=await readLyrics(src); busy();
        if(!words.length) return toast('Non riesco a leggere il testo di quel rigo');
        Anno.push(); const n=target.notes; let k=0;
        for(const w of words){ let x=w.x; if(n&&n.length){ let b2=0,bd=9; n.forEach((v,j)=>{const d=Math.abs(v-x); if(d<bd){bd=d;b2=j}}); if(bd<.03) x=n[b2]; }
          Anno.strokes.push({t:'text',text:w.text,x,y:target.y,size:target.size,align:'c',lyric:1,color:'#111111',alpha:1,layer:Anno.layer}); k++; }
        saveAnn(); Anno.redraw(); Anno.buildBar(); toast(`${k} sillabe copiate sotto il rigo · correggi toccando una sillaba con il lazo`,3400);
      }catch(err){ busy(); toast(err.message||'Lettura non riuscita',3400); } };
  },
};

// Lettura del testo stampato sotto un rigo (Vision di Apple nell'app; nel browser non disponibile).
async function readLyrics(st){
  const c=pageCanvas, W=c.width, H=c.height; const y0=Math.round((st.bottom+st.gap*.3)*H), y1=Math.round(Math.min(H,(st.bottom+st.gap*3.5)*H));
  const cut=document.createElement('canvas'); cut.width=W; cut.height=Math.max(1,y1-y0); cut.getContext('2d').drawImage(c,0,y0,W,y1-y0,0,0,W,y1-y0);
  let res;
  if(window.MozartNative&&MozartNative.ocr) res=await MozartNative.ocr(cut.toDataURL('image/jpeg',.92));
  else res=await ocrBrowser(cut);
  // parole → sillabe: "Glo - ri - a" restano separate; le parole senza trattini restano intere
  const out=[]; for(const w of res){ const parts=String(w.text).split(/\s+/).filter(Boolean); const step=w.w/Math.max(1,parts.length);
    parts.forEach((t,i)=>{ if(t==='-'||t==='—') return; out.push({text:t,x:w.x+step*(i+.5)}); }); }
  return out;
}

// Nel browser: Tesseract (scaricato la prima volta, poi in cache). Restituisce parole con posizione 0…1.
async function ocrBrowser(canvas){
  if(!window.Tesseract){ busy('Preparo la lettura del testo (solo la prima volta)…');
    await new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; sc.onload=res; sc.onerror=()=>rej(new Error('Lettura del testo non disponibile senza internet')); document.head.appendChild(sc); }); }
  busy('Leggo il testo stampato…');
  const w=await Tesseract.createWorker('ita+fra+deu+lat');
  try{ const {data}=await w.recognize(canvas); const W=canvas.width;
    return (data.words||[]).filter(x=>x.text&&x.confidence>25).map(x=>({text:x.text,x:x.bbox.x0/W,w:(x.bbox.x1-x.bbox.x0)/W})); }
  finally{ w.terminate(); }
}
