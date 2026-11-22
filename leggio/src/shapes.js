// ================= Maniglie (allunga, ingrandisci, curva) · lazo sul testo T · emoji e Memoji · righe parziali · velocità =================

// ---------- Misura vera del testo (per lazo, tocchi ed evidenziatura precisa) ----------
const _tm=document.createElement('canvas').getContext('2d');
function textBox(s){
  const W=inkCanvas.width||1000, H=inkCanvas.height||1400;
  const fam=s.font==='serif'||s.font==='music'?css('--f-display'):css('--f-body');
  const style=s.font==='music'?'italic 600':`${s.italic?'italic ':''}${s.bold?'700':'500'}`;
  _tm.font=`${style} ${s.size*W}px ${fam}`;
  const lines=String(s.text).split('\n'); const w=Math.max(...lines.map(l=>_tm.measureText(l).width))/W;
  const lh=s.size*W*1.25/H, half=s.size*W*.62/H;
  const x0=s.align==='c'?s.x-w/2:s.x;
  return {x0,x1:x0+w,y0:s.y-half,y1:s.y+half+lh*(lines.length-1)};
}
function textExtent(list){ let a=1,b=0,c=1,d=0; list.forEach(s=>{ const t=textBox(s); a=Math.min(a,t.x0); b=Math.max(b,t.x1); c=Math.min(c,t.y0); d=Math.max(d,t.y1); }); return {x0:a,x1:b,y0:c,y1:d}; }
(function(){
  const sp0=strokePts; strokePts=function(s){ if(s&&s.t==='text'){ const b=textBox(s); return [[b.x0,b.y0],[b.x1,b.y0],[b.x0,b.y1],[b.x1,b.y1],[(b.x0+b.x1)/2,(b.y0+b.y1)/2],[s.x,s.y]]; } return sp0(s); };
  const hs0=hitStroke; hitStroke=function(s,x,y,r){ if(s&&s.t==='text'){ const b=textBox(s); return x>=b.x0-r&&x<=b.x1+r&&y>=b.y0-r&&y<=b.y1+r; } return hs0(s,x,y,r); };
})();

// ---------- Maniglie sul segno scelto: estremi delle legature, curva, grandezza di segni/emoji/GIF, lunghezza dell'evidenziatore ----------
const Handles = {
  idx:-1, bar:false,
  show(i,opts={}){ this.idx=i; this.bar=!!opts.bar; this.render(); },
  hide(){ this.idx=-1; this.bar=false; $('#hdLayer')?.remove(); },
  curvy(s){ return s.t==='shape'&&['slurUp','slurDown','tie'].includes(s.shape); },
  // altezza di base della legatura in pixel della tela (come in drawShape)
  slurH(s,W,H){ const len=Math.hypot((s.b[0]-s.a[0])*W,(s.b[1]-s.a[1])*H)||1; return Math.min(len*(s.shape==='tie'?.12:.2),18+len*.07); },
  points(s){
    const W=inkCanvas.width||1, H=inkCanvas.height||1;
    if(s.t==='shape'){ const out=[{k:'a',x:s.a[0],y:s.a[1]},{k:'b',x:s.b[0],y:s.b[1]}];
      if(this.curvy(s)){ const dx=(s.b[0]-s.a[0])*W, dy=(s.b[1]-s.a[1])*H, len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
        const up=s.shape==='slurDown'?1:-1, sg=dx>=0?1:-1, h=this.slurH(s,W,H)*(s.bend??1)*up*sg*.55;
        out.push({k:'m',x:(s.a[0]+s.b[0])/2+nx*h/W,y:(s.a[1]+s.b[1])/2+ny*h/H}); }
      return out; }
    if(s.t==='stamp'){ const r=s.size*.42; return [{k:'s',x:s.x+r,y:s.y+r*W/H}]; }
    if(s.t==='gif') return [{k:'g',x:s.x+s.w,y:s.y+s.h},{k:'g0',x:s.x,y:s.y}];
    if(s.pts&&s.pts.length){ let a=1,b=0,c=1,d=0; s.pts.forEach(p=>{a=Math.min(a,p[0]);b=Math.max(b,p[0]);c=Math.min(c,p[1]);d=Math.max(d,p[1]);}); const cy=(c+d)/2;
      return [{k:'l',x:a,y:cy},{k:'r',x:b,y:cy}]; }
    return [];
  },
  render(){
    const s=Anno.strokes[this.idx]; if(!s||!ST.annotate||s.t==='text'){ this.hide(); return; }
    const r=inkCanvas.getBoundingClientRect(); let L=$('#hdLayer');
    if(!L){ L=document.createElement('div'); L.id='hdLayer'; $('#app').appendChild(L); L.addEventListener('pointerdown',e=>this.grab(e)); }
    L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:26;pointer-events:none`;
    const pts=this.points(s);
    // le maniglie si creano una volta e poi si spostano (ricrearle durante il trascinamento interrompeva il gesto)
    const flip=s.t==='stamp'&&noteFlip(s.g), sig=pts.map(p=>p.k).join(',')+'|'+this.bar+'|'+(flip?1:0);
    if(L._sig!==sig){ L._sig=sig;
      let h=pts.map(p=>`<i class="hd hd-${p.k}" data-k="${p.k}"></i>`).join('');
      if(this.bar) h+=`<div class="hdBar pill"><button class="ib" data-h="sm" aria-label="Più piccolo">${iconSvg('minus')}</button><button class="ib" data-h="lg" aria-label="Più grande">${iconSvg('plus')}</button>${flip?`<button class="ib" data-h="flip" aria-label="Stanghetta in su o in giù" title="Stanghetta in su / in giù" style="font-weight:900;font-size:18px">⇅</button>`:''}<button class="ib" data-h="del" aria-label="Elimina" style="color:var(--danger)">${iconSvg('trash')}</button><button class="ib" data-h="ok" aria-label="Fatto">${iconSvg('check')}</button></div>`;
      L.innerHTML=h; const b=L.querySelector('.hdBar'); if(b) b.onclick=e=>this.barClick(e); }
    pts.forEach(p=>{ const el=L.querySelector(`.hd-${p.k}`); if(el){ el.style.left=p.x*100+'%'; el.style.top=p.y*100+'%'; } });
    const b=L.querySelector('.hdBar'); if(b){ const y=Math.max(...pts.map(p=>p.y)), x=pts.reduce((a,p)=>a+p.x,0)/Math.max(1,pts.length); b.style.left=x*100+'%'; b.style.top=`calc(${y*100}% + 26px)`; }
  },
  barClick(e){ const a=e.target.closest('[data-h]')?.dataset.h; if(!a) return; const A=Anno, s=A.strokes[this.idx]; if(!s) return this.hide();
    if(a==='ok'){ this.hide(); return; }
    A.push();
    if(a==='flip'){ const g=noteFlip(s.g); if(g) s.g=g; }
    else if(a==='del'){ A.strokes.splice(this.idx,1); this.hide(); }
    else { const f=a==='lg'?1.15:1/1.15; this.scale(s,f); this.rememberSize(s,f); }
    A.redraw(); saveAnn(); A.buildBar(); },
  scale(s,f){ if(s.t==='stamp') s.size*=f; else if(s.t==='gif'){ const cx=s.x+s.w/2, cy=s.y+s.h/2; s.w*=f; s.h*=f; s.x=cx-s.w/2; s.y=cy-s.h/2; } else if(s.t==='shape') s.w*=f; else if(s.w) s.w*=f; },
  rememberSize(s,f){ if(s.t==='stamp'&&ST.cur){ const st=ST.cur.style=ST.cur.style||{}; st.stampK=clamp((st.stampK||1)*f,.3,4); DB.putScore(ST.cur); } },
  grab(e){
    const hd=e.target.closest('.hd'); if(!hd) return; e.preventDefault(); e.stopPropagation();
    const A=Anno, k=hd.dataset.k, s=A.strokes[this.idx]; if(!s) return;
    hd.setPointerCapture(e.pointerId); A.push(); const o=JSON.parse(JSON.stringify(s)); const p0=A.pt(e); const W=inkCanvas.width, H=inkCanvas.height;
    const mv=ev=>{ const p=A.pt(ev);
      if(k==='a'||k==='b') s[k]=[p[0],p[1]];
      else if(k==='m'){ const dx=(s.b[0]-s.a[0])*W, dy=(s.b[1]-s.a[1])*H, len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
        const mx=(s.a[0]+s.b[0])/2*W, my=(s.a[1]+s.b[1])/2*H, dist=(p[0]*W-mx)*nx+(p[1]*H-my)*ny;
        const up=s.shape==='slurDown'?1:-1, sg=dx>=0?1:-1; s.bend=clamp(dist/(this.slurH(s,W,H)*.55*up*sg||1),-3,4); }
      else if(k==='s'){ const d0=Math.hypot((p0[0]-o.x)*W,(p0[1]-o.y)*H)||1, d1=Math.hypot((p[0]-o.x)*W,(p[1]-o.y)*H); s.size=clamp(o.size*d1/d0,.004,.4); }
      else if(k==='g'){ const f=Math.max(.15,Math.max((p[0]-o.x)/o.w,(p[1]-o.y)/o.h)); s.w=o.w*f; s.h=o.h*f; }
      else if(k==='g0'){ const f=Math.max(.15,Math.max((o.x+o.w-p[0])/o.w,(o.y+o.h-p[1])/o.h)); s.w=o.w*f; s.h=o.h*f; s.x=o.x+o.w-s.w; s.y=o.y+o.h-s.h; }
      else if(k==='l'||k==='r'){ const xs=o.pts.map(q=>q[0]), a=Math.min(...xs), b=Math.max(...xs), anchor=k==='l'?b:a, h0=k==='l'?a:b;
        const f=(p[0]-anchor)/((h0-anchor)||1e-4); if(f>.05) s.pts=o.pts.map(q=>{ const n=[anchor+(q[0]-anchor)*f,q[1]]; if(q[2]!=null) n.push(q[2]); return n; }); }
      A.frame(); };
    const up=()=>{ hd.removeEventListener('pointermove',mv); hd.removeEventListener('pointerup',up); hd.removeEventListener('pointercancel',up);
      if(k==='s'&&o.size) this.rememberSize(s,s.size/o.size);
      A.updSelBox&&A.selIdx.length&&A.updSelBox(); A.redraw(); saveAnn(); A.buildBar(); };
    hd.addEventListener('pointermove',mv); hd.addEventListener('pointerup',up); hd.addEventListener('pointercancel',up);
  },
};
// le maniglie seguono il segno a ogni ridisegno; spariscono cambiando pagina o uscendo
(function(){
  const rd=Anno.redraw; Anno.redraw=function(){ const r=rd.apply(this,arguments); if(Handles.idx>=0) Handles.render(); if(Finger._range) Finger.rangeRender(); return r; };
  const ex=Anno.exit; Anno.exit=function(){ Handles.hide(); Finger.rangeHide(); return ex.apply(this,arguments); };
  const pc=Anno.pageChanged; Anno.pageChanged=function(){ Handles.hide(); Finger.rangeHide(); return pc.apply(this,arguments); };
  const un=Anno.undo, re=Anno.redo; Anno.undo=function(){ Handles.hide(); return un.apply(this,arguments); }; Anno.redo=function(){ Handles.hide(); return re.apply(this,arguments); };
  // appena inserito un segno, una legatura o una forma: maniglie e piccola barra (più grande, più piccolo, elimina)
  const up=Anno.up; Anno.up=function(e){ const n=this.strokes.length, L=this.live; const r=up.apply(this,arguments);
    if(L&&['stamp','shape'].includes(L.t)&&this.strokes.length===n+1&&this.strokes[n]===L) Handles.show(n,{bar:true});
    return r; };
  const dn=Anno.down; Anno.down=function(e){ if(ST.annotate&&Handles.idx>=0) Handles.hide(); return dn.apply(this,arguments); };
  const sl=Anno.selectLasso; Anno.selectLasso=function(poly){ const r=sl.apply(this,arguments); if(this.selIdx.length===1&&this.strokes[this.selIdx[0]].t!=='text') Handles.show(this.selIdx[0]); return r; };
  const cs=Anno.clearSel; Anno.clearSel=function(){ if(Handles.idx>=0&&!Handles.bar) Handles.hide(); Finger.rangeHide(); return cs.apply(this,arguments); };
  const ga=Gif.add; Gif.add=async function(){ const r=await ga.apply(this,arguments); Handles.show(Anno.strokes.length-1,{bar:true}); return r; };
})();
// Dito su un segno: maniglie oltre alla barretta
(function(){ const sb=Finger.strokeBar; Finger.strokeBar=function(){ const r=sb.apply(this,arguments); if(this.line.length===1) Handles.show(this.line[0]); return r; }; })();

// ---------- Dito sulla riga di testo: due maniglie per prendere solo una parte della riga ----------
Finger.rangeHide=function(){ this._range=null; $('#rgLayer')?.remove(); };
Finger.rangeRender=function(){
  const R=this._range; if(!R) return; const r=inkCanvas.getBoundingClientRect(); let L=$('#rgLayer');
  if(!L){ L=document.createElement('div'); L.id='rgLayer'; $('#app').appendChild(L); L.addEventListener('pointerdown',e=>this.rangeGrab(e)); }
  L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:26;pointer-events:none`;
  if(!L.children.length) L.innerHTML='<i class="hd hdR" data-k="l"></i><i class="hd hdR" data-k="r"></i>';
  const [a,b]=L.children; a.style.left=R.x0*100+'%'; b.style.left=R.x1*100+'%'; a.style.top=b.style.top=R.y*100+'%';
};
Finger.rangeGrab=function(e){
  const hd=e.target.closest('.hd'); if(!hd||!this._range) return; e.preventDefault(); e.stopPropagation(); hd.setPointerCapture(e.pointerId);
  const k=hd.dataset.k, R=this._range, A=Anno;
  const apply=()=>{ const sel=R.full.filter(i=>{ const t=A.strokes[i]; return t&&t.x>=R.x0-.002&&t.x<=R.x1+.002; }); if(sel.length){ this.line=sel; if(!sel.includes(this.idx)) this.idx=sel[0]; A.selIdx=[...sel]; A.updSelBox(); A.redraw(); } };
  const mv=ev=>{ const p=A.pt(ev); if(k==='l') R.x0=Math.min(p[0],R.x1-.01); else R.x1=Math.max(p[0],R.x0+.01); apply(); this.rangeRender(); };
  const up=()=>{ hd.removeEventListener('pointermove',mv); hd.removeEventListener('pointerup',up); const keep=this._range; this.bar(); this._range=keep; this.rangeRender(); };
  hd.addEventListener('pointermove',mv); hd.addEventListener('pointerup',up);
};
(function(){ const b0=Finger.bar; Finger.bar=function(){ const r=b0.apply(this,arguments); const A=Anno, s=A.strokes[this.idx];
  if(s&&s.lyric&&this.line.length>1){ if(!this._range||!this._range.full.includes(this.idx)){ const full=Finger.lineOf(this.idx); const xs=full.map(i=>A.strokes[i].x);
      const xl=this.line.map(i=>A.strokes[i].x); this._range={full,x0:Math.min(...xl),x1:Math.max(...xl),y:s.y,all:[Math.min(...xs),Math.max(...xs)]}; } this.rangeRender(); }
  else this.rangeHide();
  const hint=$('#fgBar .hint'); if(hint&&this._range) hint.insertAdjacentHTML('afterbegin','<b>Maniglie blu</b>: trascinale per prendere solo una parte della riga. ');
  return r; }; })();

// ---------- Evidenziatura automatica che parte esattamente dalla prima parola ----------
(function(){
  const pick=(idx)=>idx.map(i=>Anno.strokes[i]).filter(s=>s&&s.t==='text');
  Finger._hlLine=function(c){ const L=pick(this.line); if(!L.length) return; const b=textExtent(L); AutoHL.rect(b.x0,b.y0,b.x1,b.y1,c); };
  const b0=Finger.bar; Finger.bar=function(){ const r=b0.apply(this,arguments); const hl=$('#fgHl');
    if(hl) hl.onclick=e=>AutoHL.pick(e.currentTarget,c=>{ this._hlLine(c); $('#fgBar')?.remove(); Anno.clearSel(); toast('Testo evidenziato',1500); });
    return r; };
  const sb=Anno.showSelBar; Anno.showSelBar=function(){ const r=sb.apply(this,arguments); const b=$('#selBar [data-s="hl"]');
    if(b) b.onclick=e=>{ e.stopPropagation(); AutoHL.pick(b,c=>{ const T=pick(this.selIdx); const bx=T.length?textExtent(T):this.selBox; if(!bx) return; AutoHL.rect(bx.x0,bx.y0+(T.length?0:.012),bx.x1,bx.y1-(T.length?0:.012),c); this.clearSel(); toast('Evidenziato',1400); }); };
    return r; };
  // fascia blu: inchiostro misurato senza margine in più
  const ink0=AutoHL.inkSpan; AutoHL.inkSpan=function(y0,y1,x0,x1){ const r=ink0.call(this,y0,y1); if(!r) return r; let a=r[0]+.004, b=r[1]-.004; if(x0!=null){ a=Math.max(a,x0); b=Math.min(b,x1); } return b>a?[a,b]:null; };
})();

// ---------- Emoji di Apple (tutte) e Memoji / adesivi ----------
const EmojiPick = {
  open(pr){
    const rec=ST.settings.emojiRecent||[];
    const m2=modal('Emoji e Memoji',`<div class="field"><label for="emIn">Qualsiasi emoji</label><input id="emIn" placeholder="Tocca qui e scegli dalla tastiera 😀 (tasto 🌐 o 😀)" autocomplete="off" style="font-size:26px;height:56px"></div>
      ${rec.length?`<div class="eyebrow">Usate di recente</div><div class="emRec">${rec.map(c=>`<button data-e="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:''}
      <div class="field"><label>Memoji e adesivi</label><div id="emPaste" contenteditable="true" class="emPaste">Tocca qui, apri la tastiera emoji e scegli un Memoji o un adesivo (scorri le emoji a destra fino ai Memoji). Puoi anche incollare un'immagine.</div></div>
      <div><button class="ghostBtn" id="emFile">${iconSvg('image')}Immagine dalle Foto o dai File</button></div>
      <div class="hint" style="font-size:12.5px">L'emoji diventa un segno: tocca la pagina per metterla, poi usa le maniglie per ingrandirla. Memoji e immagini si ridimensionano con le maniglie d'oro.</div>`,null,{eyebrow:'Inserisci'});
    const useEmoji=c=>{ c=String(c).trim(); if(!c) return; const seg=window.Intl&&Intl.Segmenter?[...new Intl.Segmenter('it',{granularity:'grapheme'}).segment(c)].map(x=>x.segment):[...c]; const e=seg[seg.length-1];
      ST.settings.emojiRecent=[e,...(ST.settings.emojiRecent||[]).filter(x=>x!==e)].slice(0,16); saveSettings();
      pr.g={c:e,f:'e',n:'emoji'}; Anno.mode='preset'; Anno.savePresets(); closeLayers(); $('#stampPanel')?.remove(); toast('Tocca la pagina per mettere '+e,1800); };
    $('#emIn').oninput=e=>{ if(/\p{Extended_Pictographic}/u.test(e.target.value)) useEmoji(e.target.value); };
    m2.querySelector('.emRec')?.addEventListener('click',e=>{ const b=e.target.closest('[data-e]'); if(b) useEmoji(b.dataset.e); });
    const P=$('#emPaste'); let cleared=false;
    P.onfocus=()=>{ if(!cleared){ cleared=true; P.textContent=''; } };
    const takeImg=async src=>{ try{ let data=src; if(!/^data:/.test(src)){ const bl=await (await fetch(src)).blob(); data=await blobToDataURL(bl); } closeLayers(); $('#stampPanel')?.remove(); Gif.add(data); }catch(err){ toast('Non riesco a usare questa immagine'); } };
    P.addEventListener('paste',e=>{ const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(i=>i.type.startsWith('image/')); if(it){ e.preventDefault(); blobToDataURL(it.getAsFile()).then(takeImg); } });
    P.addEventListener('input',()=>{ const img=P.querySelector('img'); if(img&&img.src) takeImg(img.src); else if(/\p{Extended_Pictographic}/u.test(P.textContent)) useEmoji(P.textContent); });
    $('#emFile').onclick=()=>{ const f=$('#fileImg'); f.value=''; f.onchange=async()=>{ const file=f.files[0]; if(!file) return; takeImg(await blobToDataURL(file)); }; f.click(); };
    setTimeout(()=>$('#emIn')?.focus(),60);
  },
};

// ---------- Riconoscimento dei righi: una volta per pagina (prima a ogni tocco) ----------
(function(){
  const ds=detectStaves; let key='', val=null;
  detectStaves=function(){ const k=(ST.cur&&ST.cur.id)+'|'+ST.page+'|'+renderSeq+'|'+pageCanvas.width+'x'+pageCanvas.height; if(k!==key||!val){ val=ds(); key=k; } return val; };
  const pg=pageGray; let k2='', v2=null;
  pageGray=function(){ const k=(ST.cur&&ST.cur.id)+'|'+ST.page+'|'+renderSeq+'|'+pageCanvas.width; if(k!==k2||!v2){ v2=pg(); k2=k; } return {g:v2.g.slice(),w:v2.w,h:v2.h}; };
})();

// ---------- L'app non scorre mai di lato (mettendo a fuoco una casella, a volte tutto si spostava e compariva un pannello) ----------
(function(){ const app=$('#app'); app.addEventListener('scroll',()=>{ if(app.scrollLeft||app.scrollTop){ app.scrollLeft=0; app.scrollTop=0; } }); })();
