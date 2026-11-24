// ================= Testo: stile ricordato per spartito · traduzione · Dito con carattere e grandezza · parola mancante · salvataggio automatico =================

// ---------- Stile del testo: l'ultima scelta (carattere, colore, grandezza) vale per i nuovi inserimenti nello stesso spartito ----------
const TS_FONTS=[['sans','Sans'],['serif','Serif'],['music','Corsivo']];
const TS_COLORS=['#111111','#d23b2f','#1f5fd6','#1d8a4a','#8b3fc4','#c8962e','#ff8a3d','#ffffff'];
const TStyle = {
  kindOf(t){ return t.tr?'tr':t.pron?'pron':t.lyric?'lyric':'text'; },
  get(kind){ const s=ST.cur&&ST.cur.style; return s&&s[kind]||null; },
  remember(kind,t){ if(!ST.cur||!t) return; const st=ST.cur.style=ST.cur.style||{};
    st[kind]={size:t.size,font:t.font||'sans',bold:!!t.bold,italic:!!t.italic,color:t.color||'#111111'}; st.last=t.size; DB.putScore(ST.cur); },
  // grandezza leggibile per le sillabe: dalla distanza tra le righe del rigo, mai enorme
  START:.0152,                                   // 16,7 pt: dimensione di partenza
  last(){ const s=ST.cur&&ST.cur.style; return clamp((s&&s.last)||this.START,.006,.05); },
  size(kind){ const m=this.get(kind); return clamp(m&&m.size||this.last(),.006,.05); },
  lyricSize(st){ return this.size('lyric'); },
  sane(size,base){ return size&&size>base*.45&&size<base*1.9?size:base; },
  pt(size){ return Math.round(size*1100); },
  label(t){ const f=TS_FONTS.find(x=>x[0]===(t.font||'sans')); return `${f?f[1]:'Sans'}${t.bold?' grassetto':''}${t.italic?' corsivo':''} · ${this.pt(t.size)} pt`; },
  // controlli condivisi: carattere con il nome, colori, grassetto/corsivo, A− grandezza A+
  html(t){ return `<div class="seg tsFont">${TS_FONTS.map(([k,n])=>`<button data-f="${k}" class="${(t.font||'sans')===k?'on':''}" style="${k==='sans'?'':'font-family:var(--f-display);'}${k==='music'?'font-style:italic':''}">${n}</button>`).join('')}
      <button data-b class="${t.bold?'on':''}" style="font-weight:900">G</button><button data-i class="${t.italic?'on':''}" style="font-style:italic">C</button></div>
    <div class="tsRow"><span class="tsCols">${TS_COLORS.map(c=>`<button class="sw${(t.color||'').toLowerCase()===c?' on':''}" data-col="${c}" style="background:${c}" aria-label="Colore"></button>`).join('')}</span>
      <span class="tsSize"><button data-m aria-label="Più piccolo">A−</button><b class="tsPt">${this.pt(t.size)}</b><button data-p aria-label="Più grande">A+</button></span></div>`; },
  // list(): sillabe da cambiare · done(): dopo ogni modifica
  bind(root,list,done,noHist){
    const first=()=>list()[0]||{};
    const mark=()=>{ const t=first(); root.querySelectorAll('.tsFont [data-f]').forEach(x=>x.classList.toggle('on',(t.font||'sans')===x.dataset.f));
      root.querySelector('.tsFont [data-b]')?.classList.toggle('on',!!t.bold); root.querySelector('.tsFont [data-i]')?.classList.toggle('on',!!t.italic);
      root.querySelectorAll('.tsCols [data-col]').forEach(x=>x.classList.toggle('on',x.dataset.col===(t.color||'').toLowerCase()));
      const pt=root.querySelector('.tsPt'); if(pt) pt.textContent=this.pt(t.size||.016); };
    const ch=fn=>{ if(!noHist) Anno.push(); list().forEach(fn); const t=first(); if(!noHist&&t.t==='text') this.remember(this.kindOf(t),t); done&&done(); mark(); };
    root.addEventListener('click',e=>{ const x=e.target.closest('button'); if(!x||!x.closest('.tsFont,.tsRow')) return;
      if(x.dataset.f) ch(t=>t.font=x.dataset.f);
      else if(x.hasAttribute('data-b')){ const v=!first().bold; ch(t=>t.bold=v); }
      else if(x.hasAttribute('data-i')){ const v=!first().italic; ch(t=>t.italic=v); }
      else if(x.dataset.col) ch(t=>t.color=x.dataset.col);
      else if(x.hasAttribute('data-m')) ch(t=>t.size=Math.max(.006,t.size/1.08));
      else if(x.hasAttribute('data-p')) ch(t=>t.size=Math.min(.05,t.size*1.08)); });
    mark();
  },
  // finestrella di stile prima di copiare o scrivere (vale per lo spartito)
  pick(anchor,kind,def,cb){
    $('#tsPop')?.remove(); const t={...def,...(this.get(kind)||{})}; t.t='text';
    const p=document.createElement('div'); p.className='pop'; p.id='tsPop';
    p.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;width:310px"><div class="eyebrow">Carattere, colore e grandezza</div>${this.html(t)}
      <div class="tsPrev" style="font-size:22px;text-align:center;padding:6px;border-radius:10px;background:#f4efe4">Glo - ri - a</div>
      <button class="goldBtn block" data-ok>${iconSvg('check')}Usa questo stile</button></div>`;
    document.body.appendChild(p); p.style.position='fixed'; p.style.zIndex=72;
    const r=anchor.getBoundingClientRect(); p.style.left=clamp(r.left,8,innerWidth-340)+'px'; p.style.top=(r.top>innerHeight/2?Math.max(8,r.top-p.offsetHeight-8):r.bottom+8)+'px';
    const prev=()=>{ const v=p.querySelector('.tsPrev'); v.style.fontFamily=t.font==='sans'?'var(--f-body)':'var(--f-display)'; v.style.fontWeight=t.bold?'700':'500'; v.style.fontStyle=(t.italic||t.font==='music')?'italic':'normal'; v.style.color=t.color; v.style.fontSize=clamp(this.pt(t.size)*1.3,10,40)+'px'; };
    this.bind(p,()=>[t],prev,true); prev();
    p.querySelector('[data-ok]').onclick=()=>{ this.remember(kind,t); p.remove(); cb&&cb(t); };
  },
};

// ---------- Traduzione in italiano (riconosce la lingua da solo) · rosso corsivo ----------
const TR_NAMES={la:'Latino',de:'Tedesco',fr:'Francese',es:'Spagnolo',en:'Inglese',it:'Italiano'};
// latino liturgico senza internet: frasi e parole più frequenti nei brani per coro
const LA_IT={'kyrie eleison':'Signore, pietà','christe eleison':'Cristo, pietà','gloria in excelsis deo':'Gloria a Dio nell\'alto dei cieli','et in terra pax hominibus':'e pace in terra agli uomini',
  'agnus dei':'Agnello di Dio','qui tollis peccata mundi':'che togli i peccati del mondo','miserere nobis':'abbi pietà di noi','dona nobis pacem':'dona a noi la pace','sanctus':'santo','benedictus qui venit in nomine domini':'benedetto colui che viene nel nome del Signore',
  'hosanna in excelsis':'osanna nell\'alto dei cieli','ave maria':'Ave Maria','gratia plena':'piena di grazia','dominus tecum':'il Signore è con te','ora pro nobis':'prega per noi','requiem aeternam':'l\'eterno riposo','dona eis domine':'dona loro, Signore',
  'lux aeterna':'luce eterna','pleni sunt caeli et terra gloria tua':'i cieli e la terra sono pieni della tua gloria','alleluia':'alleluia','amen':'amen','te deum laudamus':'ti lodiamo, Dio','pater noster':'Padre nostro','stabat mater dolorosa':'stava la madre addolorata',
  'deus':'Dio','deo':'a Dio','dei':'di Dio','dominus':'Signore','domine':'Signore','domini':'del Signore','christe':'Cristo','christus':'Cristo','pax':'pace','pacem':'pace','gloria':'gloria','sanctus':'santo','sancte':'santo','spiritus':'spirito','spiritu':'Spirito',
  'pater':'padre','patris':'del Padre','filius':'figlio','filii':'del Figlio','mater':'madre','virgo':'vergine','caeli':'cieli','coeli':'cieli','terra':'terra','lux':'luce','lumen':'luce','vita':'vita','mors':'morte','cor':'cuore','amor':'amore','laudamus':'lodiamo',
  'benedicimus':'benediciamo','adoramus':'adoriamo','glorificamus':'glorifichiamo','te':'te','tibi':'a te','nobis':'a noi','nos':'noi','in':'in','et':'e','cum':'con','excelsis':'alto dei cieli','aeternam':'eterna','aeterna':'eterna','salve':'salve','regina':'regina','rex':'re'};
const Translate = {
  cache:new Map(),
  async text(q,from){
    q=String(q).replace(/\s+/g,' ').trim(); if(!q) return ''; const key=(from||'auto')+'|'+q; if(this.cache.has(key)) return this.cache.get(key);
    let out='';
    const nq=q.toLowerCase().replace(/[.,;:!?]/g,'').trim(); const offline=(from==='la'||from==='auto'||!from)?LA_IT[nq]:null;
    if(window.MozartNative&&MozartNative.translate){ try{ out=(await MozartNative.translate(q,from||'',''))||''; }catch(e){} }
    if(!out){ try{ const j=await (await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from||'auto'}&tl=it&dt=t&q=${encodeURIComponent(q)}`)).json();
      out=(j&&j[0]||[]).map(x=>x&&x[0]||'').join('').trim(); }catch(e){} }
    if(!out){ try{ const j=await (await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from&&from!=='auto'?from:'la'}|it`)).json();
      out=String(j&&j.responseData&&j.responseData.translatedText||'').trim(); }catch(e){} }
    if(!out&&offline) out=offline;
    if(!out) throw new Error('Traduzione non riuscita: serve la connessione a internet');
    this.cache.set(key,out); return out;
  },
  // sillabe → parole: "Glo-" "ri-" "a" diventa "Gloria"
  words(L){ const ord=L.filter(t=>t&&t.text).slice().sort((a,b)=>a.x-b.x); const out=[]; let cur=null;
    for(const t of ord){ let w=String(t.text).trim(); const lead=/^[-–—]/.test(w), hy=/[-–—]$/.test(w); w=w.replace(/^[-–—_]+|[-–—_]+$/g,''); if(!w) continue;
      if(cur&&(cur.open||lead)){ cur.text+=w; cur.items.push(t); cur.open=hy; } else { cur={text:w,items:[t],open:hy}; out.push(cur); } }
    return out; },
  phrase(L){ return this.words(L).map(w=>w.text).join(' ').replace(/\s+([,.;:!?])/g,'$1'); },
  // finestra: lingua, frase intera o parola toccata, anteprima e "Scrivi sul rigo"
  open(L,anchor,tapped){
    L=L.filter(Boolean); if(!L.length) return toast('Niente da tradurre');
    $('#trPop')?.remove(); const words=this.words(L); const wt=tapped&&words.find(w=>w.items.includes(tapped));
    let lang=detectLang(this.phrase(L))||'auto', mode=wt&&words.length>1?'word':'all', where='down', res='';
    const p=document.createElement('div'); p.className='pop'; p.id='trPop';
    const src=()=>mode==='word'&&wt?wt.text:this.phrase(L);
    const run=async()=>{ const box=p.querySelector('#trOut'); box.innerHTML='<span class="hint">Traduco…</span>'; res='';
      if(lang==='it'){ box.innerHTML='<span class="hint">Il testo sembra già in italiano: scegli la lingua giusta se non lo è.</span>'; return; }
      try{ res=await this.text(src(),lang); box.innerHTML=`<span style="color:#ff6b5e;font-style:italic;font-family:var(--f-display);font-size:18px">${esc(res)}</span>`; }
      catch(err){ box.innerHTML=`<span style="color:var(--danger)">${esc(err.message)}</span>`; } };
    const draw=()=>{ p.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;width:330px"><div class="eyebrow">Traduzione in italiano</div>
      <div class="seg" id="trL">${Object.entries(TR_NAMES).map(([k,n])=>`<button data-l="${k}" class="${k===lang?'on':''}">${n}</button>`).join('')}</div>
      ${wt&&words.length>1?`<div class="seg" id="trM"><button data-m="all" class="${mode==='all'?'on':''}">Frase intera</button><button data-m="word" class="${mode==='word'?'on':''}">Solo “${esc(wt.text)}”</button></div>`:''}
      <div class="hint" style="font-size:14px"><b>${esc(src())}</b></div><div id="trOut" style="min-height:26px"></div>
      <div class="seg" id="trW"><button data-w="down" class="${where==='down'?'on':''}">${iconSvg('down')} Sotto il rigo</button><button data-w="up" class="${where==='up'?'on':''}">${iconSvg('up')} Sopra</button></div>
      <div style="display:flex;gap:8px"><button class="ghostBtn" data-x style="flex:1">Chiudi</button><button class="goldBtn" data-ok style="flex:1">${iconSvg('check')}Scrivi in rosso</button></div></div>`;
      p.querySelector('#trL').onclick=e=>{ const x=e.target.closest('[data-l]'); if(x){ lang=x.dataset.l; draw(); } };
      const m=p.querySelector('#trM'); if(m) m.onclick=e=>{ const x=e.target.closest('[data-m]'); if(x){ mode=x.dataset.m; draw(); } };
      p.querySelector('#trW').onclick=e=>{ const x=e.target.closest('[data-w]'); if(x){ where=x.dataset.w; p.querySelectorAll('#trW button').forEach(y=>y.classList.toggle('on',y===x)); } };
      p.querySelector('[data-x]').onclick=()=>p.remove();
      p.querySelector('[data-ok]').onclick=()=>{ if(!res) return toast('Aspetta la traduzione',1400); this.write(mode==='word'&&wt?wt.items:L,res,where); p.remove(); $('#fgBar')?.remove(); Anno.clearSel(); toast('Traduzione scritta · con il Dito ✋ la sposti o la cambi',2600); };
      run(); };
    draw(); $('#app').appendChild(p);
    const r=anchor&&anchor.getBoundingClientRect?anchor.getBoundingClientRect():{left:innerWidth/2-165,top:innerHeight/2,bottom:innerHeight/2};
    p.style.position='fixed'; p.style.zIndex=66; p.style.left=clamp(r.left,8,innerWidth-350)+'px';
    p.style.top=clamp(r.top>innerHeight/2?r.top-p.offsetHeight-8:r.bottom+8,8,innerHeight-p.offsetHeight-8)+'px';
  },
  write(L,text,where){
    const A=Anno; const ord=L.slice().sort((a,b)=>a.x-b.x); const s0=ord[0]; const base=s0.size||.016;
    const mem=TStyle.get('tr'); const sz=TStyle.size('tr');
    const y0=Math.min(...ord.map(t=>t.y)), y1=Math.max(...ord.map(t=>t.y));
    // sotto: dopo l'eventuale pronuncia già scritta sotto
    let ny=where==='up'?y0-(base*.6+sz*.75):y1+(base*.6+sz*.8);
    if(where!=='up'){ const pr=A.strokes.filter(t=>t.t==='text'&&(t.pron||t.tr)&&t.y>y1&&t.y<y1+base*2.2&&t.x>=ord[0].x-.05&&t.x<=ord[ord.length-1].x+.05); if(pr.length) ny=Math.max(...pr.map(t=>t.y))+sz*1.15; }
    const one=ord.length===1||ord.every(t=>Math.abs(t.y-y0)<.004)&&ord.length<4;
    A.push();
    A.strokes.push({t:'text',text,x:one&&s0.align==='c'?ord.reduce((a,t)=>a+t.x,0)/ord.length:ord[0].x-(s0.align==='c'?(s0.size*String(s0.text).length*.28):0),y:ny,size:sz,
      align:one&&s0.align==='c'?'c':'l',font:mem?mem.font:'serif',italic:mem?mem.italic:true,bold:mem?mem.bold:false,color:mem?mem.color:'#d23b2f',alpha:1,tr:1,lyric:1,layer:s0.layer||A.layer});
    A.redraw(); saveAnn(); A.buildBar();
  },
};

// ---------- Dito: barra con carattere e grandezza sempre visibili, traduci, parola mancante ----------
Finger.bar=function(){
  $('#fgBar')?.remove(); const A=Anno, s=A.strokes[this.idx]; if(!s) return;
  const r=inkCanvas.getBoundingClientRect(); const lyric=!!s.lyric&&!s.tr;
  const b=document.createElement('div'); b.id='fgBar'; b.className='pop';
  b.innerHTML=`<div class="fgWrap">
    <div style="display:flex;gap:6px;align-items:center"><input id="fgTxt" value="${esc(s.text)}" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="goldBtn sm" id="fgOk" aria-label="Fatto">${iconSvg('check')}</button></div>
    <div class="tsInfo" id="fgInfo">${esc(TStyle.label(s))}</div>
    ${TStyle.html(s)}
    <div class="seg fgAct"><button id="fgLt" aria-label="Sinistra">${iconSvg('chevLeft')}</button><button id="fgUp" aria-label="Su">${iconSvg('up')}</button><button id="fgDn" aria-label="Giù">${iconSvg('down')}</button><button id="fgRt" aria-label="Destra">${iconSvg('chevRight')}</button>
      ${lyric?`<button id="fgPrev" title="Sillaba precedente">${iconSvg('skipBack')}</button><button id="fgNext" title="Sillaba successiva">${iconSvg('skipFwd')}</button></div>
    <div class="seg fgAct"><button id="fgGap" title="Scrivi la sillaba che manca sotto la nota">${iconSvg('plus')} Parola mancante</button><button id="fgCopy">${iconSvg('copy')} Copia sui righi</button>`:''}
      <button id="fgHl">${iconSvg('pen')} Evidenzia</button><button id="fgTr">${iconSvg('voice')} Traslittera</button><button id="fgTt">🌐 Traduci</button><button id="fgDel" style="color:var(--danger)" aria-label="Elimina">${iconSvg('trash')}</button></div>
    <div class="hint" style="font-size:12px">${lyric?`Riga di ${this.line.length} sillabe: carattere, grandezza e spostamento valgono per tutta la riga; il testo in alto cambia solo la sillaba toccata. Per una parola che manca: tocca con il Dito lo spazio vuoto nella riga.`:'Trascina con il dito per spostarlo.'} L'ultimo stile scelto resta per i nuovi testi di questo spartito.</div></div>`;
  $('#app').appendChild(b);
  dockBar(b, r.top+s.y*r.height);
  const L=()=>this.line.map(k=>A.strokes[k]).filter(Boolean);
  const after=()=>{ A.redraw(); A.updSelBox(); saveAnn(); A.buildBar(); const i=$('#fgInfo'); if(i) i.textContent=TStyle.label(A.strokes[this.idx]||s); };
  TStyle.bind(b,L,after);
  const ch=fn=>{ A.push(); L().forEach(fn); after(); };
  const step=.003;
  $('#fgUp').onclick=()=>ch(t=>t.y-=step); $('#fgDn').onclick=()=>ch(t=>t.y+=step); $('#fgLt').onclick=()=>ch(t=>t.x-=step); $('#fgRt').onclick=()=>ch(t=>t.x+=step);
  const save=()=>{ const v=$('#fgTxt').value.trim(); const cur=A.strokes[this.idx]; if(!cur||v===cur.text) return; A.push(); if(!v){ A.strokes.splice(this.idx,1); b.remove(); A.clearSel(); } else cur.text=v; A.redraw(); saveAnn(); A.buildBar(); };
  $('#fgOk').onclick=()=>{ save(); b.remove(); A.clearSel(); };
  $('#fgTxt').onkeydown=e=>{ if(e.key==='Enter'){ save(); this.nextSyl(); } if(e.key==='Escape'){ b.remove(); A.clearSel(); } };
  $('#fgDel').onclick=()=>{ A.push(); const del=new Set(this.line); A.strokes=A.strokes.filter((_,k)=>!del.has(k)); b.remove(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar(); };
  const cp=$('#fgCopy'); if(cp) cp.onclick=()=>{ b.remove(); A.selIdx=[...this.line]; A.updSelBox(); LyricCopy.start(); };
  $('#fgTr').onclick=()=>this.translit(b);
  $('#fgTt').onclick=()=>{ save(); Translate.open(L(),b,A.strokes[this.idx]); };
  $('#fgHl').onclick=e=>AutoHL.pick(e.currentTarget,c=>{ const bx=A.selBox; if(!bx) return; AutoHL.rect(bx.x0,bx.y0+.008,bx.x1,bx.y1-.008,c); b.remove(); A.clearSel(); toast('Testo evidenziato',1500); });
  const pv=$('#fgPrev'); if(pv){ pv.onclick=()=>{ save(); this.stepSyl(-1); }; $('#fgNext').onclick=()=>{ save(); this.stepSyl(1); }; $('#fgGap').onclick=()=>{ save(); this.gapNote(); }; }
};
// apre la barra del Dito per alcune scritte (dal lazo, dalla T)
Finger.openFor=function(idx){ const A=Anno; idx=idx.filter(k=>A.strokes[k]&&A.strokes[k].t==='text'); if(!idx.length) return;
  if(!ST.annotate) A.enter(); this.line=idx; this.idx=idx.slice().sort((a,b)=>A.strokes[a].x-A.strokes[b].x)[0]; A.selIdx=[...idx]; A.updSelBox(); A.redraw(); this.bar(); };

// Tocco nel vuoto: sulla riga del testo = parola mancante; sotto un rigo con testo stampato = fascia da leggere (traslittera, traduci, evidenzia)
Finger._down0=Finger.down;
Finger.down=function(p,from){
  const i=this.hit(p);
  if(i>=0||from==='text') return this._down0(p,from);
  $('#fgBar')?.remove(); this.st=null; Anno.clearSel();
  const A=Anno; const near=A.strokes.filter(s=>s.t==='text'&&s.lyric&&!s.pron&&!s.tr&&(s.layer||0)===A.layer&&Math.abs(s.y-p[1])<Math.max(.012,s.size*1.1));
  if(near.length) return this.insertAt(p,near);
  const staves=detectStaves(); const st=[...staves].filter(t=>t.bottom<p[1]).pop();
  if(st&&p[1]<st.bottom+st.gap*5){ LyricType.adjustBand(st,{y:p[1],free:true}); return; }
  toast('Tocca un testo, una riga o un segno · sotto un rigo stampato si apre la lettura del testo',2600);
};
// scrive una sillaba nello spazio vuoto della riga, sotto la nota più vicina al tocco
Finger.insertAt=function(p,near){
  const A=Anno; const ref=near.slice().sort((a,b)=>Math.abs(a.x-p[0])-Math.abs(b.x-p[0]))[0];
  const staves=detectStaves(); const st=[...staves].filter(t=>t.bottom<ref.y).pop()||staves[0];
  let notes=[]; if(st){ try{ notes=detectNotes(st); }catch(e){} }
  const tol=LyricType.tol(st); let x=p[0];
  const nn=nearestNote(notes,p[0]); if(nn!=null&&Math.abs(nn-p[0])<tol) x=nn;
  else if(st){ let loose=[]; try{ loose=detectNotes(st,true); }catch(e){} const n2=nearestNote(loose,p[0]); if(n2!=null&&Math.abs(n2-p[0])<tol) x=n2; }
  const list=[...new Set([...notes,x])].sort((a,b)=>a-b);
  if(!ST.annotate) A.enter();
  LyricType.style={font:ref.font||'sans',bold:ref.bold!==false,italic:!!ref.italic,color:ref.color||'#111111'};
  LyricType.startAt(st||{gap:.01,top:0,bottom:0},list,ref.y,ref.size,list.indexOf(x));
  toast('Scrivi la parola che manca · Invio = nota dopo',2200);
};
function nearestNote(notes,x){ let b=null,bd=9; (notes||[]).forEach(n=>{ const d=Math.abs(n-x); if(d<bd){bd=d;b=n;} }); return b; }

// ---------- Lazo su testo: Modifica (carattere, grandezza, traslittera, traduci, evidenzia) ----------
Anno.showSelBar=function(){
  $('#selBar')?.remove(); if(!this.selBox) return; const r=inkCanvas.getBoundingClientRect();
  const b=document.createElement('div'); b.id='selBar'; b.className='pill';
  const tIdx=this.selIdx.filter(i=>this.strokes[i]&&this.strokes[i].t==='text');
  b.innerHTML=(tIdx.length?`<button class="ghostBtn" data-s="ed" style="height:40px">${iconSvg('text')}Modifica</button><button class="ghostBtn" data-s="tl" style="height:40px">${iconSvg('voice')}Traslittera</button><button class="ghostBtn" data-s="tt" style="height:40px">🌐 Traduci</button><button class="ghostBtn" data-s="lc" style="height:40px">${iconSvg('staff')}Copia sui righi</button>`:'')
    +`<button class="ib" data-s="hl" aria-label="Evidenzia">${iconSvg('pen')}</button><button class="ib" data-s="dup" aria-label="Duplica">${iconSvg('copy')}</button><button class="ib" data-s="del" aria-label="Elimina">${iconSvg('trash')}</button><button class="ib" data-s="done" aria-label="Fine">${iconSvg('check')}</button>`;
  $('#app').appendChild(b); const w=b.offsetWidth||400;
  b.style.left=clamp(r.left+this.selBox.x0*r.width,8,innerWidth-w-8)+'px'; b.style.top=clamp(r.top+this.selBox.y0*r.height-60,120,innerHeight-60)+'px';
  b.onclick=e=>{const k=e.target.closest('[data-s]')?.dataset.s; if(!k) return;
    if(k==='ed'){ b.remove(); Finger.openFor(tIdx); return; }
    if(k==='tl'){ b.remove(); Finger.offerTranslit(tIdx,true); return; }
    if(k==='tt'){ Translate.open(tIdx.map(i=>this.strokes[i]),b); return; }
    if(k==='hl'){ AutoHL.pick(e.target.closest('[data-s]'),c=>{ const bx=this.selBox; if(!bx) return; AutoHL.rect(bx.x0,bx.y0+.008,bx.x1,bx.y1-.008,c); this.clearSel(); toast('Evidenziato',1400); }); return; }
    if(k==='del'){this.push();this.strokes=this.strokes.filter((_,i)=>!this.selIdx.includes(i));this.clearSel()}
    if(k==='dup'){this.push();const n=this.selIdx.map(i=>{const c=JSON.parse(JSON.stringify(this.strokes[i]));moveStroke(c,.02,.02);return c});const base=this.strokes.length;this.strokes.push(...n);this.selIdx=n.map((_,i)=>base+i);this.updSelBox();this.showSelBar()}
    if(k==='done') this.clearSel();
    if(k==='lc'){ LyricCopy.start(); return; }
    this.redraw(); saveAnn(); this.buildBar(); };
};

// ---------- Evidenziatore automatico: colore + spessore (si può ingrandire) ----------
AutoHL.k=1;
AutoHL.pick=function(anchor,cb){
  $('#hlPick')?.remove(); const p=document.createElement('div'); p.id='hlPick'; p.className='pop';
  const sizes=[[.7,'Sottile'],[1,'Normale'],[1.4,'Largo'],[1.9,'Molto largo']];
  p.innerHTML=`<div class="eyebrow" style="margin-bottom:8px">Evidenzia con</div><div class="swatches">${NEON.map(c=>`<button class="sw" style="background:${c};box-shadow:0 0 10px ${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
    <div class="seg" id="hlK" style="margin-top:10px">${sizes.map(([k,n])=>`<button data-k="${k}" class="${k===this.k?'on':''}">${n}</button>`).join('')}</div>`;
  document.body.appendChild(p); const r=anchor.getBoundingClientRect(); p.style.position='fixed'; p.style.zIndex=70;
  p.style.left=clamp(r.left,8,innerWidth-360)+'px'; p.style.top=clamp(r.top>innerHeight/2?r.top-p.offsetHeight-8:r.bottom+8,8,innerHeight-p.offsetHeight-8)+'px';
  p.onclick=e=>{ const k=e.target.closest('[data-k]'); if(k){ this.k=+k.dataset.k; p.querySelectorAll('#hlK button').forEach(x=>x.classList.toggle('on',x===k)); return; }
    const s=e.target.closest('[data-c]'); if(!s) return; p.remove(); cb(s.dataset.c); };
  setTimeout(()=>document.addEventListener('pointerdown',function f(ev){ if(!ev.target.closest('#hlPick')){ p.remove(); document.removeEventListener('pointerdown',f,true); } },true),30);
};
AutoHL.rect=function(x0,y0,x1,y1,color){
  const A=Anno, ar=inkCanvas.height/inkCanvas.width, yc=(y0+y1)/2, w=Math.max(.006,(y1-y0)*ar*1.05*(this.k||1));
  A.push(); A.strokes.unshift({t:'hl',color,alpha:.45,w,pts:[[x0,yc],[x1,yc]],layer:A.layer}); A.redraw(); saveAnn(); A.buildBar();
};

// ---------- GIF: si muovono (prima il livello veniva ridisegnato a ogni tocco e l'animazione ripartiva da capo) ----------
Gif.sync=function(){
  const L=this.layer(), list=(ST.ann[ST.page]||[]).filter(s=>s.t==='gif'&&(!Anno.layers[s.layer||0]||Anno.layers[s.layer||0].vis));
  const key=ST.page+'|'+list.map(s=>s.src.length+':'+s.src.slice(-24)).join(',');
  if(L._key!==key){ L._key=key; L.innerHTML=''; list.forEach(()=>{ const im=document.createElement('img'); im.alt=''; im.decoding='async'; L.appendChild(im); }); [...L.children].forEach((im,i)=>{ im.src=list[i].src; }); }
  [...L.children].forEach((im,i)=>{ const s=list[i]; if(!s) return; const st=`left:${s.x*100}%;top:${s.y*100}%;width:${s.w*100}%;height:${s.h*100}%`; if(im._st!==st){ im._st=st; im.style.cssText=st; } });
};

// ---------- Salvataggio automatico: ogni minuto e quando l'app va in secondo piano o si chiude ----------
const AutoSave = {
  init(){
    const now=()=>{ try{ if($('#textEntry.tinline')) TextBox.close(); }catch(e){} try{ if(ST.cur) DB.set('ann:'+ST.cur.id,ST.ann); if(ST.cur) DB.putScore(ST.cur); DB.set('settings',ST.settings); }catch(e){} };
    this.now=now;
    setInterval(()=>{ if(ST.cur&&ST.annotate) now(); },60000);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') now(); });
    addEventListener('pagehide',now); addEventListener('beforeunload',now);
  },
};

// ---------- Numero della pagina sempre visibile mentre si annota ----------
const PageBadge = {
  update(){ let b=$('#annoPage'); if(!b){ b=document.createElement('div'); b.id='annoPage'; $('#app').appendChild(b); }
    b.hidden=!(ST.annotate&&ST.cur); if(ST.cur) b.textContent=`Pag. ${ST.page+1} / ${ST.cur.pages}`; },
};
(function(){ const u0=updateChrome; updateChrome=function(){ u0.apply(this,arguments); try{ PageBadge.update(); }catch(e){} }; })();
(function(){ const ex=Anno.exit; Anno.exit=function(){ const r=ex.apply(this,arguments); PageBadge.update(); return r; }; })();
