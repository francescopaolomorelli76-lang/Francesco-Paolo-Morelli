// ================= Mozart — stato e lettore =================
const ST = {
  scores:[], cur:null, doc:null, page:0, ann:{}, setlists:[], activeSetlist:null,
  bars:{top:true,bottom:true}, annotate:false,
  settings:{pencilOnly:false, autoPencil:true, night:false, longPress:450, tapZones:true, turnAnim:true, turnStyle:'curl', bright:100, warm:0, firstRun:true},
  libTab:'all', libDrill:null, libSelect:false, selected:new Set(), libQuery:'',
};
const stage=$('#stage'), pageWrap=$('#pageWrap'), pageCanvas=$('#pageCanvas'), inkCanvas=$('#inkCanvas'), hlCanvas=$('#hlCanvas');
let renderSeq=0, renderTask=null, pageGeom={w:1,h:1,cssW:1,cssH:1,dpr:1,offX:0,offY:0};
const thumbCache=new Map();

function toast(msg,ms=2400){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),ms)}
function busy(msg){let b=$('#busy');if(!msg){b&&b.remove();return}if(!b){b=document.createElement('div');b.id='busy';$('#app').appendChild(b)}b.innerHTML=`<div><span class="spin"></span>${esc(msg)}</div>`}

// ---------- Libreria: caricamento e salvataggio ----------
async function loadAll(){
  await DB.open();
  ST.scores = await DB.allScores();
  ST.setlists = (await DB.get('setlists'))||[];
  Object.assign(ST.settings, (await DB.get('settings'))||{});
  const pr = await DB.get('presets'); if(pr&&pr.length) Anno.presets=pr;
  if(pr&&pr.length&&!ST.settings.presetsV2){ Anno.presets=Anno.presets.filter(p=>p.k!=='hl'); const hi=Anno.presets.findIndex(p=>p.k==='mask'); Anno.presets.splice(hi<0?Anno.presets.length:hi,0,{k:'hl',color:'#fff200',size:40,alpha:.5}); DB.set('presets',Anno.presets); }
  ST.settings.presetsV2=1; ST.settings.neonV=1;
  if(!ST.settings.fluoY){ const h0=Anno.presets.find(p=>p.k==='hl'); if(h0&&h0.color==='#fff200'&&!h0.rainbow) h0.color='#f7ff00'; ST.settings.fluoY=1; DB.set('presets',Anno.presets); DB.set('settings',ST.settings); }
  // un solo evidenziatore nella barra (le versioni precedenti ne avevano aggiunti tanti): colore e tipo si scelgono al secondo tocco
  { const hl=Anno.presets.filter(p=>p.k==='hl'); if(hl.length!==1){ const keep=hl[0]||{k:'hl',color:'#fff200',size:40,alpha:.5}; let put=false;
      Anno.presets=Anno.presets.filter(p=>{ if(p.k!=='hl') return true; if(!put){ put=true; return true; } return false; });
      if(!put){ const mi=Anno.presets.findIndex(p=>p.k==='mask'); Anno.presets.splice(mi<0?Anno.presets.length:mi,0,keep); }
      Anno.sel=Math.min(Anno.sel,Anno.presets.length-1); DB.set('presets',Anno.presets); } }
  if(false){ Anno.presets.push({k:'hl',color:'#39ff14',size:50,alpha:.45},{k:'hl',color:'#ff3cac',size:50,alpha:.45},{k:'hl',color:'#00e5ff',size:50,alpha:.45},{k:'hl',color:'#ff3cac',size:55,alpha:.45,rainbow:true}); DB.set('presets',Anno.presets); }
  ST.settings.neonV=1;
  document.body.classList.toggle('night', !!ST.settings.night);
  if(!ST.scores.length){ busy('Preparo gli spartiti di esempio…'); await makeDemoLibrary(); busy(); }
}
const saveSettings=()=>DB.set('settings',ST.settings);
const saveSetlists=()=>DB.set('setlists',ST.setlists);
const saveAnn=debounce(()=>{ if(ST.cur) DB.set('ann:'+ST.cur.id, ST.ann); },400);

async function addScore(bytes, meta={}){
  const doc = await pdfjsLib.getDocument({data:bytes.slice(0)}).promise;
  if(meta.fromFile){ try{ const info=(await doc.getMetadata()).info||{}; const t=(info.Title||'').trim(), a=(info.Author||'').trim();
    if(t && !/^(untitled|senza titolo|microsoft|document|documento|\d+)/i.test(t) && t.length<140) meta.title=t;
    if(a && !meta.composer && a.length<80 && !/scanner|adobe|microsoft|camscanner/i.test(a)) meta.composer=a; }catch(e){} }
  const sc = {id:uid(), title:meta.title||'Senza titolo', file:meta.file||'', composer:meta.composer||'', genre:meta.genre||'', tags:meta.tags||[], key:meta.key||'',
    added:Date.now(), opened:0, pages:doc.numPages, bookmarks:[], crop:{l:0,t:0,r:0,b:0}, size:bytes.byteLength};
  try{ sc.thumb=await thumbOf(doc); }catch(e){}
  doc.destroy();
  await DB.set('pdf:'+sc.id, bytes);
  ST.scores.push(sc); await DB.putScore(sc);
  try{ if(typeof applyForscoreAnn==='function' && await applyForscoreAnn(sc)) toast('Testi e disegni di forScore aggiunti a “'+sc.title+'”',3200); }catch(e){}
  return sc;
}
// PDF di uno spartito: in memoria solo quello aperto.
async function getBytes(sc){ if(sc._bytes) return sc._bytes; const b=await DB.get('pdf:'+sc.id); if(!b) throw new Error('PDF mancante'); if(ST.cur===sc) sc._bytes=b; return b; }
async function thumbOf(doc){
  const pg=await doc.getPage(1); const vp=pg.getViewport({scale:1}); const v2=pg.getViewport({scale:120/vp.height});
  const c=document.createElement('canvas');c.width=Math.round(v2.width);c.height=Math.round(v2.height);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
  await pg.render({canvasContext:x,viewport:v2}).promise; return c.toDataURL('image/jpeg',.7);
}
async function replaceBytes(sc, bytes, annMap){
  sc._bytes=bytes; sc.size=bytes.byteLength; thumbCache.delete(sc.id); pageCache.clear();
  const doc = await pdfjsLib.getDocument({data:bytes.slice(0)}).promise; sc.pages=doc.numPages;
  try{ sc.thumb=await thumbOf(doc); }catch(e){}
  await DB.set('pdf:'+sc.id, bytes); await DB.putScore(sc);
  if(ST.cur && ST.cur.id===sc.id){ if(ST.doc) ST.doc.destroy(); ST.doc=doc; if(annMap){ST.ann=annMap; DB.set('ann:'+sc.id,annMap);} ST.page=clamp(ST.page,0,sc.pages-1); await renderPage(); updateChrome(); }
  else { doc.destroy(); if(annMap) DB.set('ann:'+sc.id,annMap); }
}

// ---------- Apertura e rendering ----------
async function openScore(id, page=0, opts={}){
  const sc = ST.scores.find(s=>s.id===id); if(!sc) return;
  if(ST.annotate) Anno.exit(true);
  if(ST.doc){ try{ST.doc.destroy()}catch(e){} }
  if(ST.cur && ST.cur!==sc) ST.cur._bytes=null;
  let bytes; try{ bytes=await DB.get('pdf:'+sc.id); }catch(e){}
  if(!bytes){ toast('Non trovo il PDF di questo spartito'); return; }
  ST.cur=sc; sc._bytes=bytes; sc.opened=Date.now(); DB.putScore(sc); pageCache.clear();
  ST.doc = await pdfjsLib.getDocument({data:bytes.slice(0)}).promise;
  sc.pages=ST.doc.numPages;
  ST.ann = (await DB.get('ann:'+id))||{};
  ST.page = clamp(page,0,sc.pages-1);
  if(!opts.keepSetlist) ST.activeSetlist=null;
  $('#loading').hidden=true; pageWrap.hidden=false;
  await renderPage(); updateChrome(); renderLibrary();
  try{localStorage.setItem('fpm-last',JSON.stringify({id,page:ST.page}))}catch(e){}
}

// Pagine già disegnate (corrente, precedente e successive) per un cambio pagina immediato.
const pageCache=new Map();
function cacheKey(p,W,H,dpr){const c=ST.cur.crop||{};return `${ST.cur.id}|${ST.cur.size||0}|${JSON.stringify(fixOfPage(ST.cur,p))}|${p}|${W}x${H}|${dpr.toFixed(2)}|${c.l},${c.t},${c.r},${c.b}`}
async function drawPageTo(p,W,H,dpr){
  const key=cacheKey(p,W,H,dpr); if(pageCache.has(key)){const v=pageCache.get(key);pageCache.delete(key);pageCache.set(key,v);return v;}
  const pg=await ST.doc.getPage(p+1); let crop=ST.cur.crop||{l:0,t:0,r:0,b:0};
  { const f=fixOfPage(ST.cur,p); if(f.on){ try{ const a=await autoAnalyze(ST.cur,p,pg,f.crop&&f.cropAuto); const bb=fixBox(f,a); if(bb) crop=bb; }catch(e){} } }
  const vp1=pg.getViewport({scale:1}); const cw=vp1.width*(1-crop.l-crop.r), ch=vp1.height*(1-crop.t-crop.b);
  const scale=Math.min((W-16)/cw,(H-16)/ch);
  // limite di memoria delle tele su iPhone/iPad (circa 16 milioni di pixel)
  let d=dpr; const full=vp1.width*vp1.height*scale*scale; if(full*d*d>7e6) d=Math.sqrt(7e6/full);
  const vp=pg.getViewport({scale:scale*d});
  const off=document.createElement('canvas'); off.width=Math.round(vp.width); off.height=Math.round(vp.height);
  const x=off.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,off.width,off.height);
  try{ await pg.render({canvasContext:x,viewport:vp}).promise; }
  catch(e){ if(d>1.2){ off.width=1; off.height=1; pg.cleanup&&pg.cleanup(); return drawPageTo(p,W,H,1.2); } throw e; }
  try{ pg.cleanup&&pg.cleanup(); }catch(e){}
  let fixed=off; try{ fixed=fixPage(off,ST.cur,p); }catch(e){}
  const v={off:fixed,cssW:vp.width/d,cssH:vp.height/d,cw:cw*scale,ch:ch*scale,crop};
  pageCache.set(key,v);
  // memoria limitata (iPad/iPhone chiudono l'app se le immagini in memoria sono troppe): ~24 milioni di pixel
  let px=0; for(const q of pageCache.values()) px+=q.off.width*q.off.height;
  while(pageCache.size>1&&px>16e6){ const k0=pageCache.keys().next().value, q=pageCache.get(k0); px-=q.off.width*q.off.height; q.off.width=q.off.height=1; pageCache.delete(k0); }
  return v;
}
const baseDpr=()=>Math.min(window.devicePixelRatio||1,2.5);
async function renderPage(dir,opts={}){
  if(!ST.doc) return;
  const seq=++renderSeq; const W=stage.clientWidth, H=stage.clientHeight;
  // iPad/iPhone: una tela oltre ~16 milioni di pixel smette di disegnare (e la memoria finisce: l'app si riavvia).
  // Si resta sotto i 9 milioni per tela anche con lo zoom.
  const dpr=Math.min(baseDpr()*(Zoom.z>1.05?Math.min(Zoom.z,3):1), Math.sqrt(9e6/Math.max(1,W*H)));
  let v;
  try{ v=await drawPageTo(ST.page,W,H,dpr); }catch(e){ return; }
  if(seq!==renderSeq) return;
  const old = (dir && ST.settings.turnAnim!==false && !pageWrap.hidden) ? snapshotPage() : null;
  pageGeom={w:v.off.width,h:v.off.height,cssW:v.cssW,cssH:v.cssH,dpr,offX:-v.crop.l*v.cssW,offY:-v.crop.t*v.cssH};
  for(const c of [pageCanvas,hlCanvas,inkCanvas]){ c.width=v.off.width; c.height=v.off.height; c.style.width=v.cssW+'px'; c.style.height=v.cssH+'px'; c.style.left=pageGeom.offX+'px'; c.style.top=pageGeom.offY+'px'; }
  pageCanvas.getContext('2d').drawImage(v.off,0,0);
  pageWrap.style.width=v.cw+'px'; pageWrap.style.height=v.ch+'px';
  Anno.redraw();
  if(old) animateTurn(old,dir);
  $('#ribbon').hidden = !(ST.cur.bookmarks||[]).some(b=>b.p===ST.page);
  updateChrome();
  if(!opts.noPrefetch) setTimeout(()=>prefetch(seq),60);
  setTimeout(()=>{ if(seq===renderSeq) Fix.check(); },400);
}
function prefetch(seq){
  const W=stage.clientWidth,H=stage.clientHeight,d=baseDpr();
  const fx=fixOfPage(ST.cur,ST.page); (fx.on&&fx.sharpen?[ST.page+1]:[ST.page+1,ST.page-1,ST.page+2]).forEach((p,i)=>{ if(p>=0&&p<ST.cur.pages) setTimeout(()=>{ if(seq===renderSeq) drawPageTo(p,W,H,d).catch(()=>{}); },i*120); });
}
// Fotografa la pagina visibile (con annotazioni) per l'effetto voltapagina.
function snapshotPage(){
  const r=pageWrap.getBoundingClientRect(); const c=document.createElement('canvas'); const k=Math.min(2,baseDpr());
  c.width=Math.max(1,Math.round(r.width*k)); c.height=Math.max(1,Math.round(r.height*k)); const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
  const sx=-pageGeom.offX/pageGeom.cssW*pageCanvas.width, sy=-pageGeom.offY/pageGeom.cssH*pageCanvas.height;
  const sw=r.width/Zoom.z/pageGeom.cssW*pageCanvas.width, sh=r.height/Zoom.z/pageGeom.cssH*pageCanvas.height;
  if(document.body.classList.contains('night')) x.filter='invert(1) hue-rotate(180deg) brightness(.92)';
  x.drawImage(pageCanvas,sx,sy,sw,sh,0,0,c.width,c.height); x.filter='none';
  x.globalCompositeOperation='multiply'; x.drawImage(hlCanvas,sx,sy,sw,sh,0,0,c.width,c.height); x.globalCompositeOperation='source-over';
  x.drawImage(inkCanvas,sx,sy,sw,sh,0,0,c.width,c.height);
  return {c,r};
}
// Effetto pagina che gira: il foglio vecchio ruota sul dorso e rivela quello nuovo.
function animateTurn(old,dir){
  $$('.turnSheet').forEach(e=>e.parentNode&&e.parentNode.removeChild(e));
  const mode=ST.settings.turnStyle||'curl';
  const sr=stage.getBoundingClientRect(); const {c,r}=old;
  const wrap=document.createElement('div'); wrap.className='turnSheet';
  wrap.style.cssText=`left:${r.left-sr.left}px;top:${r.top-sr.top}px;width:${r.width}px;height:${r.height}px`;
  c.className='tsFace'; wrap.appendChild(c); const shade=document.createElement('i'); shade.className='tsShade'; wrap.appendChild(shade);
  stage.appendChild(wrap);
  const fwd=dir>0, dur=mode==='slide'?220:420;
  const drop=()=>{ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); };
  wrap.style.transformOrigin=fwd?'left center':'right center';
  shade.style.background=`linear-gradient(${fwd?'90deg':'270deg'},rgba(0,0,0,0) 25%,rgba(0,0,0,.45))`;
  const kf = mode==='slide'
    ? [{transform:'translateX(0)',opacity:1},{transform:`translateX(${fwd?-35:35}%)`,opacity:0}]
    : [{transform:'perspective(2200px) rotateY(0deg)'},{transform:`perspective(2200px) rotateY(${fwd?-95:95}deg)`}];
  const an=wrap.animate(kf,{duration:dur,easing:'cubic-bezier(.45,.05,.4,1)',fill:'forwards'});
  shade.animate([{opacity:0},{opacity:1}],{duration:dur,fill:'forwards'});
  an.onfinish=drop; setTimeout(drop,dur+200);
}

function goPage(p, animate=true){
  if(!ST.cur) return;
  const n=ST.cur.pages;
  if(p>=n){ if(ST.activeSetlist){ setlistStep(1); } else toast('Ultima pagina'); return; }
  if(p<0){ if(ST.activeSetlist){ setlistStep(-1, true); } else toast('Prima pagina'); return; }
  const dir = p>ST.page?1:-1; ST.page=p; Zoom.reset(true);
  if(ST.annotate) Anno.pageChanged();
  renderPage(animate?dir:0);
  try{localStorage.setItem('fpm-last',JSON.stringify({id:ST.cur.id,page:p}))}catch(e){}
}
const nextPage=()=>goPage(ST.page+1), prevPage=()=>goPage(ST.page-1);

function updateChrome(){
  const sc=ST.cur;
  $('#titleText').innerHTML = sc? `<b>${esc(sc.title)}</b><span>, p. ${ST.page+1} di ${sc.pages}</span>` : '<b>Mozart</b>';
  $('#pageNum').textContent = sc? `${ST.page+1} / ${sc.pages}` : '–';
  $('#annoTitle').innerHTML = `Pagina ${ST.page+1} <span>(${esc(Anno.layers[Anno.layer]?.name||'Livello 1')})</span>`;
  buildScrub();
  $('#setlistNav').classList.toggle('on', !!ST.activeSetlist);
}

// ---------- Scrubber pagine ----------
function buildScrub(){
  const sc=ST.cur; const dots=$('#scrubDots'); if(!sc){dots.innerHTML='';return}
  const n=sc.pages, show=Math.min(n,48); const bm=new Set((sc.bookmarks||[]).map(b=>b.p));
  let h=''; for(let i=0;i<show;i++){const p=Math.round(i*(n-1)/Math.max(1,show-1)); h+=`<i class="${bm.has(p)?'bm':''}"></i>`;}
  dots.innerHTML=h;
  placeKnob(n>1? ST.page/(n-1) : 0);
}
function placeKnob(f){const tr=$('#scrubTrack');const w=tr.clientWidth-16;$('#scrubKnob').style.left=(8+f*w)+'px';$('#scrubBubble').style.left=(8+f*w)+'px'}
(function initScrub(){
  const tr=$('#scrubTrack'); let drag=false, target=0;
  const at=e=>{const r=tr.getBoundingClientRect();return clamp((e.clientX-r.left-8)/(r.width-16),0,1)};
  tr.addEventListener('pointerdown',e=>{if(!ST.cur)return;drag=true;tr.setPointerCapture(e.pointerId);tr.classList.add('drag');move(e)});
  const move=e=>{if(!drag)return;const f=at(e);const n=ST.cur.pages;target=Math.round(f*(n-1));placeKnob(n>1?target/(n-1):0);const bm=(ST.cur.bookmarks||[]).find(b=>b.p===target);$('#scrubBubble').textContent=`p. ${target+1}${bm?' · '+bm.name:''}`};
  tr.addEventListener('pointermove',move);
  tr.addEventListener('pointerup',()=>{if(!drag)return;drag=false;tr.classList.remove('drag');if(target!==ST.page)goPage(target)});
  tr.addEventListener('pointercancel',()=>{drag=false;tr.classList.remove('drag')});
})();

// ---------- Barre e bordi (pressione lunga) ----------
function setBars(top,bottom){ST.bars.top=top;ST.bars.bottom=bottom;document.body.classList.toggle('topOn',!!top||!!ST.annotate);document.body.classList.toggle('barsOn',(top||ST.annotate)&&!document.body.classList.contains('immersive'));$('#topbar').classList.toggle('hide',!top||ST.annotate);$('#bottombar').classList.toggle('hide',!bottom||ST.annotate)}
function openSide(which,open=true){
  const el=$('#'+which); el.classList.toggle('open',open);
  if(open){ const other=which==='library'?'tools':'library'; $('#'+other).classList.remove('open'); if(which==='library') renderLibrary(); }
}
const closeSides=()=>{openSide('library',false);openSide('tools',false)};
const anySideOpen=()=>$('#library').classList.contains('open')||$('#tools').classList.contains('open');

(function initStageGestures(){
  const EDGE=44; let st=null, timer=null;
  const glow=e=>$('.edgeGlow.'+e);
  const clearGlow=()=>{$$('.edgeGlow').forEach(g=>g.classList.remove('charging'))};
  const edgeOf=(x,y)=>{const W=innerWidth,H=innerHeight;
    if(y<EDGE+ (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0)) return 'top';
    if(y>H-EDGE) return 'bottom'; if(x<EDGE) return 'left'; if(x>W-EDGE) return 'right'; return null};
  function reveal(edge){
    if(navigator.vibrate) try{navigator.vibrate(12)}catch(e){}
    if(edge==='top') setBars(true,ST.bars.bottom);
    else if(edge==='bottom') setBars(ST.bars.top,true);
    else if(edge==='left') openSide('library');
    else if(edge==='right') openSide('tools');
  }
  stage.addEventListener('pointerdown',e=>{
    if(ST.annotate) return; // mentre si annota i bordi non aprono pannelli (prima a volte si apriva Attrezzi)
    const edge=edgeOf(e.clientX,e.clientY);
    st={x:e.clientX,y:e.clientY,t:Date.now(),edge,done:false};
    if(edge){ const g=glow(edge); g.style.setProperty('--lp',ST.settings.longPress+'ms'); requestAnimationFrame(()=>g.classList.add('charging'));
      timer=setTimeout(()=>{st.done=true;clearGlow();reveal(edge)},ST.settings.longPress); }
  });
  stage.addEventListener('pointermove',e=>{if(!st)return;if(Zoom.ptrs.size>1||Math.hypot(e.clientX-st.x,e.clientY-st.y)>14){clearTimeout(timer);clearGlow()}});
  const end=e=>{
    clearTimeout(timer);clearGlow(); if(!st) return; const s=st; st=null; if(s.done) return;
    if(ST.annotate) return;
    if(Zoom.gestured || Zoom.active || Zoom.ptrs.size || Date.now()-(Zoom.lastPinch||0)<600) return;
    const dx=e.clientX-s.x, dy=e.clientY-s.y;
    if(Zoom.z>1.02){ return; }
    if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.3){ dx<0?nextPage():prevPage(); return; }
    if(Math.hypot(dx,dy)>14) return;
    if(anySideOpen()){ closeSides(); return; }
    if(Date.now()-s.t>ST.settings.longPress) return;
    const W=innerWidth, x=e.clientX;
    if(Zoom.z>1.02) return;
    if(ST.settings.tapZones && x<W*.3) prevPage();
    else if(ST.settings.tapZones && x>W*.7) nextPage();
    else setBars(!(ST.bars.top&&ST.bars.bottom), !(ST.bars.top&&ST.bars.bottom));
  };
  stage.addEventListener('pointerup',end);
  stage.addEventListener('pointercancel',()=>{clearTimeout(timer);clearGlow();st=null});
  // Anche sopra le barre: tenere premuto sul bordo apre il pannello corrispondente
  addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea,select')||e.target.isContentEditable) return;
    if(ST.annotate&&$('#fgBar')&&Finger.line&&Finger.line.length&&e.key.startsWith('Arrow')){ e.preventDefault(); const st=e.shiftKey?.012:.003; const m={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key]; Anno.push(); Finger.line.forEach(k=>Anno.strokes[k]&&moveStroke(Anno.strokes[k],m[0],m[1])); Anno.updSelBox(); Anno.redraw(); saveAnn(); return; }
    if(e.key==='+'||e.key==='='){e.preventDefault();ZoomPad.zoom(1.25);return}
    if(e.key==='-'||e.key==='_'){e.preventDefault();ZoomPad.zoom(1/1.25);return}
    if(Zoom.z>1.02&&e.key.startsWith('Arrow')){e.preventDefault();const m={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];ZoomPad.pan(m[0],m[1]);return}
    if(['ArrowRight','PageDown',' ','ArrowDown'].includes(e.key)){e.preventDefault();nextPage()}
    else if(['ArrowLeft','PageUp','ArrowUp'].includes(e.key)){e.preventDefault();prevPage()}
    else if(e.key==='Escape'){closeLayers();closeSides()}
  });
  let lastW=innerWidth,lastH=innerHeight,typedAt=0;
  document.addEventListener('focusout',()=>typedAt=Date.now(),true);
  addEventListener('resize',debounce(()=>{ const a=document.activeElement; const typing=a&&(a.matches('input,textarea')||a.isContentEditable)||Date.now()-typedAt<1500;
    if(innerWidth===lastW&&(typing||Math.abs(innerHeight-lastH)<160)){ lastH=innerHeight; return; } lastW=innerWidth; lastH=innerHeight; renderPage(); },200));
})();

// ---------- Popover e modali ----------
const layerRoot=$('#layerRoot');
function closeLayers(){layerRoot.innerHTML='';Metro.onClose&&Metro.onClose();}
function popover(anchor, html, opts={}){
  closeLayers();
  const scrim=document.createElement('div');scrim.className='scrim clear';scrim.onpointerdown=()=>closeLayers();
  const p=document.createElement('div');p.className='pop';p.id=opts.id||'';p.innerHTML=html;
  layerRoot.append(scrim,p); hydrateIcons(p);
  const r=anchor? anchor.getBoundingClientRect() : {left:innerWidth/2,right:innerWidth/2,bottom:80,top:80,width:0};
  const pw=p.offsetWidth, W=innerWidth;
  let left=clamp(r.left+r.width/2-pw/2, 10, W-pw-10);
  let top=r.bottom+10; if(opts.above) top=Math.max(10,r.top-p.offsetHeight-10);
  if(top+p.offsetHeight>innerHeight-10) top=Math.max(10,innerHeight-p.offsetHeight-10);
  p.style.left=left+'px'; p.style.top=top+'px';
  return p;
}
function modal(title, body, foot, opts={}){
  closeLayers();
  const scrim=document.createElement('div');scrim.className='scrim';if(!opts.sticky)scrim.onpointerdown=()=>closeLayers();
  const m2=document.createElement('div');m2.className='modal'+(opts.full?' full':'');m2.id=opts.id||'';
  m2.innerHTML=`<div class="mHead"><h3>${opts.eyebrow?`<span class="eyebrow">${esc(opts.eyebrow)}</span>`:''}${title}</h3><button class="ib" data-close aria-label="Chiudi" data-i="close"></button></div><div class="mBody">${body}</div>${foot?`<div class="mFoot">${foot}</div>`:''}`;
  layerRoot.append(scrim,m2); hydrateIcons(m2);
  m2.querySelector('[data-close]').onclick=()=>{opts.onClose&&opts.onClose();closeLayers()};
  return m2;
}

// ---------- Azioni (tutti i pulsanti con data-act) ----------
const ACTIONS = {
  clock:(el)=>Clock.open(el),
  midi:()=>Midi.connect(),
  gif:()=>{closeSides();Gif.open()},
  zoompad:(el)=>ZoomPad.open(el),
  fix:(el)=>Fix.open(el),
  annoUndo:()=>Anno.undo(), annoRedo:()=>Anno.redo(),
  lyr:()=>{closeSides();Lyr.open()},
  pron:()=>{closeSides();Pron.open()},
  fullscreen:()=>FS.toggle(), bright:(el)=>Bright.open(el), share:()=>{closeSides();shareScore()}, singers:()=>{closeSides();Singers.open()},
  forscore:()=>{closeSides();FS4.pick()},
  library:()=>openSide('library',!$('#library').classList.contains('open')),
  libClose:()=>openSide('library',false),
  tools:()=>openSide('tools',!$('#tools').classList.contains('open')),
  toolsClose:()=>openSide('tools',false),
  prev:prevPage, next:nextPage,
  first:()=>{goPage(0);closeSides()},
  annotate:()=>{closeSides();Anno.enter()},
  stampsOpen:()=>{closeSides();Anno.enter();setTimeout(()=>Anno.openStamps(),350)},
  annoDone:()=>Anno.exit(), annoCancel:()=>Anno.cancel(),
  insert:(el)=>{closeSides();Insert.open()},
  scanInsert:()=>{closeSides();Insert.fromPhoto('insert')},
  web:()=>{closeSides();WebImport.open(ST.cur?'insert':'new')},
  scanNew:()=>{closeSides();Insert.fromPhoto('new')},
  importPdf:()=>{closeSides();Insert.pickPdf('new')},
  templates:()=>{closeSides();Insert.templatesNew()},
  metro:(el)=>{closeSides();Metro.open(el)},
  bookmarks:(el)=>showBookmarks(el),
  setlists:(el)=>showSetlistsPop(el),
  services:(el)=>showImportPop(el),
  recents:(el)=>showRecentsPop(el),
  search:(el)=>showSearchPop(el),
  info:()=>{closeSides();editInfo(ST.cur)},
  reorder:()=>{closeSides();Reorder.open()},
  crop:()=>{closeSides();showCrop()},
  export:()=>{closeSides();exportPdf()},
  piano:()=>{closeSides();Piano.open()}, pianoClose:()=>Piano.close(),
  record:()=>{closeSides();Rec.open()},
  pedals:()=>{closeSides();showPedals()},
  dashboard:()=>{closeSides();showDashboard()},
  backup:()=>{closeSides();showBackup()},
  settings:()=>{closeSides();showSettings()},
  about:()=>{closeSides();showAbout()},
  slPrev:()=>setlistStep(-1), slNext:()=>setlistStep(1),
  libSelect:(el)=>libMenu(el),
};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return;
  const f=ACTIONS[b.dataset.act]; if(f){e.preventDefault();f(b)}
});

// ---------- Libreria ----------
const TAB_TITLES={all:'Tutti gli spartiti',recent:'Recenti',composers:'Compositori',genres:'Generi',setlists:'Setlist',tags:'Etichette'};
$('#libTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;ST.libTab=b.dataset.tab;ST.libDrill=null;$$('#libTabs button').forEach(x=>x.classList.toggle('on',x===b));renderLibrary()});
$('#libSearch').addEventListener('input',e=>{ST.libQuery=e.target.value.trim().toLowerCase();renderLibrary()});
const byTitle=(a,b)=>a.title.localeCompare(b.title,'it',{sensitivity:'base'});
function matches(sc){const q=ST.libQuery;if(!q)return true;return (sc.title+' '+sc.composer+' '+sc.genre+' '+(sc.tags||[]).join(' ')).toLowerCase().includes(q)}
function scoreRow(sc){
  const sel=ST.libSelect, on=ST.selected.has(sc.id);
  return `<div class="item${ST.cur&&ST.cur.id===sc.id?' cur':''}" data-open="${sc.id}">
    ${sel?`<span class="chk${on?' on':''}">${on?iconSvg('check'):''}</span>`:`<span class="thumb" data-thumb="${sc.id}"></span>`}
    <div class="tx"><div class="tt">${esc(sc.title)}${(sc.tags||[]).includes('esempio')?'<span class="tag">ESEMPIO</span>':''}</div><div class="st">${typeof K!=='undefined'?K.badge(sc.composer):''}${esc([sc.composer,sc.pages+' pag.'].filter(Boolean).join(' · '))}</div></div>
    ${sel?'':`<button class="infoBtn" data-info="${sc.id}" aria-label="Informazioni">${iconSvg('info')}</button>`}</div>`;
}
function groupRows(title,rows){return `<div class="group"><div class="groupHead">${esc(title)}</div>${rows}</div>`}
function drillRow(key,label,count){return `<div class="item" data-drill="${esc(key)}"><div class="tx"><div class="tt">${ST.libTab==='composers'&&typeof K!=='undefined'?K.badge(label,24):''}${esc(label)}</div><div class="st">${count} ${count===1?'elemento':'elementi'}</div></div><span class="chev">${iconSvg('chevRight')}</span></div>`}
function renderLibrary(){
  const body=$('#libBody'), idx=$('#letterIdx'); idx.innerHTML='';
  const list=ST.scores.filter(matches);
  let h='', title=TAB_TITLES[ST.libTab];
  const back = label=>`<div class="item" data-back><span class="chev">${iconSvg('chevLeft')}</span><div class="tx"><div class="tt" style="color:var(--gold)">${esc(label)}</div></div></div>`;
  if(ST.libTab==='all'){
    const groups={}; list.sort(byTitle).forEach(s=>{const L=(s.title[0]||'#').toUpperCase().normalize('NFD')[0];const k=/[A-Z]/.test(L)?L:'#';(groups[k]=groups[k]||[]).push(s)});
    const keys=Object.keys(groups).sort();
    h=keys.map(k=>`<div class="group" id="L-${k}"><div class="groupHead">${k}</div>${groups[k].map(scoreRow).join('')}</div>`).join('');
    idx.innerHTML=keys.map(k=>`<button data-jump="${k}">${k}</button>`).join('');
  } else if(ST.libTab==='recent'){
    const op=[...list].filter(s=>s.opened).sort((a,b)=>b.opened-a.opened).slice(0,12);
    const ad=[...list].sort((a,b)=>b.added-a.added).slice(0,12);
    h=groupRows('Aperti di recente',op.map(scoreRow).join('')||'<div class="empty">Nessuno spartito aperto.</div>')+groupRows('Aggiunti di recente',ad.map(scoreRow).join(''));
  } else if(['composers','genres','tags'].includes(ST.libTab)){
    const field=ST.libTab==='composers'?'composer':ST.libTab==='genres'?'genre':'tags';
    const map=new Map(); list.forEach(s=>{const vals=field==='tags'?(s.tags||[]):[s[field]||'(senza '+(field==='composer'?'compositore':'genere')+')'];vals.forEach(v=>{if(!map.has(v))map.set(v,[]);map.get(v).push(s)})});
    if(ST.libDrill!=null && map.has(ST.libDrill)){ title=ST.libDrill; h=back(TAB_TITLES[ST.libTab])+map.get(ST.libDrill).sort(byTitle).map(scoreRow).join(''); }
    else { const keys=[...map.keys()].sort((a,b)=>a.localeCompare(b,'it')); h=keys.map(k=>drillRow(k,k,map.get(k).length)).join('')||'<div class="empty">Ancora niente qui. Aggiungi '+(field==='tags'?'etichette':field==='genre'?'un genere':'un compositore')+' dalle informazioni dello spartito (ⓘ).</div>'; }
  } else if(ST.libTab==='setlists'){
    const sl=ST.setlists.find(x=>x.id===ST.libDrill);
    if(sl){ title=sl.name; h=back('Setlist')+`<div class="group">${sl.items.map((id,i)=>{const s=ST.scores.find(x=>x.id===id);return s?`<div class="item" data-open="${s.id}" data-sl="${sl.id}"><span class="chk" style="border-color:var(--gold);color:var(--gold);font-weight:800;font-size:12px">${i+1}</span><div class="tx"><div class="tt">${esc(s.title)}</div><div class="st">${esc(s.composer||'')}</div></div><button class="infoBtn" data-slrm="${sl.id}:${i}" aria-label="Togli">${iconSvg('minus')}</button></div>`:''}).join('')||'<div class="empty">Setlist vuota. Apri uno spartito e usa il pulsante Setlist in alto per aggiungerlo.</div>'}</div>
      <div style="display:flex;gap:8px;margin-top:14px"><button class="ghostBtn" data-slplay="${sl.id}">${iconSvg('play')}Suona dall'inizio</button><button class="ghostBtn danger" data-sldel="${sl.id}">${iconSvg('trash')}Elimina</button></div>`; }
    else h=ST.setlists.map(s=>drillRow(s.id,s.name,s.items.length)).join('')+`<div style="margin-top:14px"><button class="ghostBtn" data-slnew>${iconSvg('plus')}Nuova setlist</button></div>`;
  }
  $('#libTitle').textContent=title;
  body.innerHTML=h||'<div class="empty">Nessun risultato.</div>';
  // Piede: importa + inserisci (sempre visibile)
  $('#libFoot').innerHTML = ST.libSelect
    ? `<button class="ghostBtn" data-libdo="setlist">${iconSvg('rings')}Setlist</button><button class="ghostBtn" data-libdo="merge">${iconSvg('merge')}Unisci</button><button class="ghostBtn danger" data-libdo="delete">${iconSvg('trash')}Elimina</button><button class="ghostBtn" data-libdo="done">Fine</button>`
    : `<button class="goldBtn" data-libdo="import">${iconSvg('plus')}Importa</button><button class="goldBtn" data-act="scanNew" style="flex:1;justify-content:center">${iconSvg('camera')}Scansiona</button><button class="sealBtn" data-act="about" title="© 2026 FPM webdesignertech" aria-label="Copyright FPM webdesignertech"><img src="__SEAL__" alt=""></button>`;
  // Miniature (prima pagina), pigre
  body.querySelectorAll('[data-thumb]').forEach(el=>drawThumb(el.dataset.thumb, el));
}
$('#letterIdx').addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(b)$('#L-'+b.dataset.jump)?.scrollIntoView({block:'start'})});
$('#libBody').addEventListener('click',async e=>{
  const t=e.target;
  const info=t.closest('[data-info]'); if(info){e.stopPropagation();editInfo(ST.scores.find(s=>s.id===info.dataset.info));return}
  const rm=t.closest('[data-slrm]'); if(rm){e.stopPropagation();const [id,i]=rm.dataset.slrm.split(':');const sl=ST.setlists.find(x=>x.id===id);sl.items.splice(+i,1);saveSetlists();renderLibrary();return}
  if(t.closest('[data-back]')){ST.libDrill=null;renderLibrary();return}
  const dr=t.closest('[data-drill]'); if(dr){ST.libDrill=dr.dataset.drill;renderLibrary();$('#libBody').scrollTop=0;return}
  if(t.closest('[data-slnew]')){newSetlist();return}
  const sp=t.closest('[data-slplay]'); if(sp){const sl=ST.setlists.find(x=>x.id===sp.dataset.slplay);if(sl&&sl.items.length){await openScore(sl.items[0],0);ST.activeSetlist={id:sl.id,i:0};updateChrome();closeSides();}return}
  const sd=t.closest('[data-sldel]'); if(sd){confirmBox('Eliminare questa setlist?','Gli spartiti restano in libreria.','Elimina',()=>{ST.setlists=ST.setlists.filter(x=>x.id!==sd.dataset.sldel);saveSetlists();ST.libDrill=null;renderLibrary()});return}
  const op=t.closest('[data-open]'); if(op){
    const id=op.dataset.open;
    if(ST.libSelect){ST.selected.has(id)?ST.selected.delete(id):ST.selected.add(id);renderLibrary();return}
    if(op.dataset.sl){const sl=ST.setlists.find(x=>x.id===op.dataset.sl);await openScore(id,0,{keepSetlist:true});ST.activeSetlist={id:sl.id,i:sl.items.indexOf(id)};updateChrome();}
    else await openScore(id,0);
    if(innerWidth<900) closeSides();
  }
});
$('#libFoot').addEventListener('click',e=>{
  const b=e.target.closest('[data-libdo]'); if(!b) return; const a=b.dataset.libdo;
  if(a==='import') showImportPop(b,true);
  if(a==='done'){ST.libSelect=false;ST.selected.clear();renderLibrary()}
  if(a==='delete'){ if(!ST.selected.size) return toast('Seleziona almeno uno spartito'); confirmBox(`Eliminare ${ST.selected.size} spartiti?`,'Verranno tolti anche dalle setlist. Non si può annullare.','Elimina',async()=>{for(const id of ST.selected){await DB.delScore(id);DB.del('ann:'+id);ST.setlists.forEach(s=>s.items=s.items.filter(x=>x!==id))}ST.scores=ST.scores.filter(s=>!ST.selected.has(s.id));saveSetlists();if(ST.cur&&ST.selected.has(ST.cur.id)){ST.cur=null;ST.doc=null;pageWrap.hidden=true;$('#loading').hidden=false;if(ST.scores[0])openScore(ST.scores[0].id)}ST.selected.clear();ST.libSelect=false;renderLibrary();toast('Eliminati')})}
  if(a==='setlist'){ if(!ST.selected.size) return toast('Seleziona almeno uno spartito'); pickSetlist(b,[...ST.selected]) }
  if(a==='merge'){ if(ST.selected.size<2) return toast('Seleziona almeno due spartiti da unire'); mergeSelected() }
});
function libMenu(el){
  const p=popover(el,`<div class="toolList" style="padding:0;min-width:240px">
    <button class="toolRow" data-m="select">${iconSvg('check')}Seleziona più spartiti</button>
    <button class="toolRow" data-m="import">${iconSvg('file')}Importa PDF</button>
    <button class="toolRow" data-m="scan">${iconSvg('camera')}Scansiona (fotocamera)</button>
    <button class="toolRow" data-m="web">${iconSvg('file')}Importa dal web</button>
    <button class="toolRow" data-m="crea">${iconSvg('pen')}Crea: scrivi le note</button>
    <button class="toolRow" data-m="dups">${iconSvg('copy')}Trova spartiti doppi</button>
    <button class="toolRow" data-m="tpl">${iconSvg('staff')}Pentagrammata vuota</button>
    <button class="toolRow" data-m="fs">${iconSvg('backup')}Apri backup forScore (.4sb)</button></div>`);
  p.onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;closeLayers();const m2=b.dataset.m;
    if(m2==='select'){ST.libSelect=true;ST.selected.clear();renderLibrary()} if(m2==='import')Insert.pickPdf('new'); if(m2==='scan')Insert.fromPhoto('new'); if(m2==='web')WebImport.open('new'); if(m2==='tpl')Insert.templatesNew(); if(m2==='crea')Compose.open('new'); if(m2==='dups')Dups.open(); if(m2==='fs')FS4.pick();};
}
async function drawThumb(id, el){
  const sc=ST.scores.find(s=>s.id===id); if(!sc) return;
  let url=sc.thumb||thumbCache.get(id);
  if(!url){
    // una miniatura alla volta, poi salvata: la libreria non ricarica più tutti i PDF
    if(drawThumb.busy) { drawThumb.q=(drawThumb.q||[]); drawThumb.q.push([id,el]); return; }
    drawThumb.busy=true;
    try{ const doc=await pdfjsLib.getDocument({data:(await getBytes(sc)).slice(0)}).promise; url=await thumbOf(doc); doc.destroy(); sc.thumb=url; DB.putScore(sc); }catch(e){}
    drawThumb.busy=false; const nx=(drawThumb.q||[]).shift(); if(nx) setTimeout(()=>drawThumb(...nx),30);
    if(!url) return;
  }
  el.innerHTML=`<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`;
}

// ---------- Informazioni spartito ----------
function editInfo(sc){
  if(!sc) return toast('Apri prima uno spartito');
  const m2=modal('Informazioni',`
    <div class="field"><label for="iTitle">Titolo</label><input id="iTitle" value="${esc(sc.title)}"></div>
    <div class="grid2"><div class="field"><label for="iComp">Compositore</label><input id="iComp" value="${esc(sc.composer)}" list="compList"></div>
    <div class="field"><label for="iGenre">Genere</label><input id="iGenre" value="${esc(sc.genre)}" list="genreList"></div></div>
    <div class="grid2"><div class="field"><label for="iKey">Tonalità</label><input id="iKey" value="${esc(sc.key||'')}" placeholder="es. Sol maggiore"></div>
    <div class="field"><label for="iTags">Etichette (separate da virgola)</label><input id="iTags" value="${esc((sc.tags||[]).join(', '))}" placeholder="coro, uomini, Barbiere"></div></div>
    <div class="hint">${sc.pages} pagine · aggiunto il ${new Date(sc.added).toLocaleDateString('it-IT')}</div>
    <datalist id="compList">${[...new Set(ST.scores.map(s=>s.composer).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
    <datalist id="genreList">${[...new Set(['Opera','Coro','Sacra','Lirica da camera','Sinfonica',...ST.scores.map(s=>s.genre).filter(Boolean)])].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>`,
    `<button class="ghostBtn danger" id="iDel">${iconSvg('trash')}Elimina</button><span style="flex:1"></span><button class="ghostBtn" data-close2>Annulla</button><button class="goldBtn" id="iSave">${iconSvg('check')}Salva</button>`,{eyebrow:sc.title});
  m2.querySelector('[data-close2]').onclick=closeLayers;
  m2.querySelector('#iSave').onclick=()=>{sc.title=$('#iTitle').value.trim()||'Senza titolo';sc.composer=$('#iComp').value.trim();sc.genre=$('#iGenre').value.trim();sc.key=$('#iKey').value.trim();sc.tags=$('#iTags').value.split(',').map(s=>s.trim()).filter(Boolean);DB.putScore(sc);closeLayers();renderLibrary();updateChrome();toast('Salvato')};
  m2.querySelector('#iDel').onclick=()=>confirmBox('Eliminare “'+sc.title+'”?','Lo spartito e le sue annotazioni verranno cancellati.','Elimina',async()=>{await DB.delScore(sc.id);DB.del('ann:'+sc.id);ST.scores=ST.scores.filter(s=>s!==sc);ST.setlists.forEach(s=>s.items=s.items.filter(x=>x!==sc.id));saveSetlists();if(ST.cur===sc){ST.cur=null;if(ST.scores[0])openScore(ST.scores[0].id);else{pageWrap.hidden=true;$('#loading').hidden=false}}renderLibrary();toast('Eliminato')});
}
function confirmBox(title,text,okLabel,onOk){
  const m2=modal(esc(title),`<div class="hint">${esc(text)}</div>`,`<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-ok>${esc(okLabel)}</button>`);
  m2.querySelector('[data-no]').onclick=closeLayers; m2.querySelector('[data-ok]').onclick=()=>{closeLayers();onOk()};
}

// ---------- Segnalibri, setlist, ricerca, recenti, importa ----------
function showBookmarks(el){
  if(!ST.cur) return toast('Apri prima uno spartito');
  const sc=ST.cur; sc.bookmarks=sc.bookmarks||[];
  const p=popover(el,`<h4>Segnalibri</h4><div style="min-width:280px">
    ${sc.bookmarks.sort((a,b)=>a.p-b.p).map((b,i)=>`<div class="item" data-go="${b.p}"><span class="chk" style="border-color:var(--gold);color:var(--gold-hi);font-size:12px;font-weight:800">${b.p+1}</span><div class="tx"><div class="tt">${esc(b.name)}</div></div><button class="infoBtn" data-rm="${i}" aria-label="Togli">${iconSvg('trash')}</button></div>`).join('')||'<div class="empty">Nessun segnalibro.</div>'}
    <div class="field" style="margin-top:12px"><label for="bmName">Nuovo segnalibro a pagina ${ST.page+1}</label><div style="display:flex;gap:8px"><input id="bmName" style="flex:1" placeholder="es. Finaletto II, n. 171"><button class="goldBtn sm" id="bmAdd">${iconSvg('bookmarkAdd')}Aggiungi</button></div></div></div>`);
  p.onclick=e=>{const rm=e.target.closest('[data-rm]');if(rm){sc.bookmarks.splice(+rm.dataset.rm,1);DB.putScore(sc);closeLayers();updateChrome();renderPage();return}
    const g=e.target.closest('[data-go]');if(g){closeLayers();goPage(+g.dataset.go)}};
  $('#bmAdd').onclick=()=>{const n=$('#bmName').value.trim()||('Pagina '+(ST.page+1));sc.bookmarks.push({p:ST.page,name:n});DB.putScore(sc);closeLayers();buildScrub();$('#ribbon').hidden=false;toast('Segnalibro aggiunto')};
}
function showSetlistsPop(el){
  const p=popover(el,`<h4>Setlist</h4><div style="min-width:280px">
    ${ST.setlists.map(s=>`<div class="item" data-sl="${s.id}"><span class="chk" style="border-color:var(--gold)">${iconSvg('rings')}</span><div class="tx"><div class="tt">${esc(s.name)}</div><div class="st">${s.items.length} brani</div></div>${ST.cur?`<button class="infoBtn" data-add="${s.id}" title="Aggiungi lo spartito aperto">${iconSvg('plus')}</button>`:''}</div>`).join('')||'<div class="empty">Nessuna setlist.</div>'}
    <div style="margin-top:12px"><button class="ghostBtn" id="slNew">${iconSvg('plus')}Nuova setlist</button></div></div>`);
  p.onclick=async e=>{const a=e.target.closest('[data-add]');if(a){const s=ST.setlists.find(x=>x.id===a.dataset.add);if(!s.items.includes(ST.cur.id))s.items.push(ST.cur.id);saveSetlists();closeLayers();toast('Aggiunto a “'+s.name+'”');return}
    const r=e.target.closest('[data-sl]');if(r){closeLayers();ST.libTab='setlists';ST.libDrill=r.dataset.sl;$$('#libTabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab==='setlists'));openSide('library')}};
  $('#slNew').onclick=()=>newSetlist(ST.cur?[ST.cur.id]:[]);
}
function newSetlist(items=[]){
  const m2=modal('Nuova setlist',`<div class="field"><label for="slName">Nome</label><input id="slName" placeholder="es. Concerto 13 novembre"></div>`,`<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-ok>${iconSvg('check')}Crea</button>`);
  m2.querySelector('[data-no]').onclick=closeLayers;
  m2.querySelector('[data-ok]').onclick=()=>{const n=$('#slName').value.trim()||'Setlist';const s={id:uid(),name:n,items:[...items]};ST.setlists.push(s);saveSetlists();closeLayers();renderLibrary();toast('Setlist creata')};
  setTimeout(()=>$('#slName')?.focus(),50);
}
function pickSetlist(el,ids){
  const p=popover(el,`<h4>Aggiungi a setlist</h4><div style="min-width:260px">${ST.setlists.map(s=>`<div class="item" data-sl="${s.id}"><div class="tx"><div class="tt">${esc(s.name)}</div></div></div>`).join('')}<div style="margin-top:10px"><button class="ghostBtn" id="pkNew">${iconSvg('plus')}Nuova</button></div></div>`,{above:true});
  p.onclick=e=>{const r=e.target.closest('[data-sl]');if(!r)return;const s=ST.setlists.find(x=>x.id===r.dataset.sl);ids.forEach(id=>{if(!s.items.includes(id))s.items.push(id)});saveSetlists();closeLayers();ST.libSelect=false;ST.selected.clear();renderLibrary();toast('Aggiunti a “'+s.name+'”')};
  $('#pkNew').onclick=()=>{newSetlist(ids);ST.libSelect=false;ST.selected.clear()};
}
async function setlistStep(d,toEnd){
  const a=ST.activeSetlist; if(!a) return; const sl=ST.setlists.find(x=>x.id===a.id); if(!sl) return;
  const i=a.i+d; if(i<0||i>=sl.items.length){toast(i<0?'Inizio della setlist':'Fine della setlist');return}
  await openScore(sl.items[i],0,{keepSetlist:true}); if(toEnd) goPage(ST.cur.pages-1,false);
  ST.activeSetlist={id:sl.id,i}; updateChrome(); toast(`${i+1}/${sl.items.length} · ${ST.cur.title}`);
}
function showSearchPop(el){
  const p=popover(el,`<label class="search" style="min-width:300px"><svg class="i" data-i="search"></svg><input id="qIn" type="search" placeholder="Cerca negli spartiti"></label><div id="qRes" style="margin-top:8px;max-height:50vh;overflow:auto"></div>`);
  const run=()=>{const q=$('#qIn').value.trim().toLowerCase();const r=ST.scores.filter(s=>!q||(s.title+' '+s.composer+' '+(s.tags||[]).join(' ')).toLowerCase().includes(q)).sort(byTitle).slice(0,30);
    $('#qRes').innerHTML=r.map(s=>`<div class="item" data-o="${s.id}"><div class="tx"><div class="tt">${esc(s.title)}</div><div class="st">${esc(s.composer)}</div></div></div>`).join('')||'<div class="empty">Nessun risultato.</div>'};
  $('#qIn').oninput=run; run(); setTimeout(()=>$('#qIn').focus(),30);
  p.onclick=e=>{const o=e.target.closest('[data-o]');if(o){closeLayers();openScore(o.dataset.o)}};
}
function showRecentsPop(el){
  const r=[...ST.scores].filter(s=>s.opened).sort((a,b)=>b.opened-a.opened).slice(0,8);
  const p=popover(el,`<h4>Aperti di recente</h4><div style="min-width:300px">${r.map(s=>`<div class="item${ST.cur===s?' cur':''}" data-o="${s.id}"><div class="tx"><div class="tt">${esc(s.title)}</div><div class="st">${esc(s.composer)}</div></div></div>`).join('')||'<div class="empty">Ancora nessuno.</div>'}</div>`);
  p.onclick=e=>{const o=e.target.closest('[data-o]');if(o){closeLayers();openScore(o.dataset.o)}};
}
function showImportPop(el,above){
  const p=popover(el,`<div class="toolList" style="padding:0;min-width:270px"><div class="eyebrow" style="padding:4px 10px">Importa</div>
    <button class="toolRow" data-m="pdf">${iconSvg('file')}PDF dai File</button>
    <button class="toolRow" data-m="cam">${iconSvg('camera')}Scansione (foto → spartito)</button>
    <button class="toolRow" data-m="img">${iconSvg('image')}Foto dalla libreria</button>
    <button class="toolRow" data-m="web">${iconSvg('file')}Dal web (link a PDF o foto)</button>
    <button class="toolRow" data-m="pop">${iconSvg('voice')}Canto pop: testi e accordi</button>
    <div class="eyebrow" style="padding:12px 10px 4px">Aggiungi spartiti</div>
    <button class="toolRow" data-m="crea">${iconSvg('pen')}<b>Crea</b>&nbsp;· scrivi le note</button>
    <button class="toolRow" data-m="dups">${iconSvg('copy')}Trova spartiti doppi</button>
    <button class="toolRow" data-m="fsmiss">${iconSvg('file')}Completa l'import di forScore (PDF mancanti)</button>
    <button class="toolRow" data-m="tpl">${iconSvg('staff')}Modelli: pentagrammata vuota</button>
    <button class="toolRow" data-m="fs">${iconSvg('backup')}Backup o archivio forScore (.4sb)</button>
    <button class="toolRow" data-m="backup">${iconSvg('backup')}Ripristina da backup</button></div>`,{above});
  p.onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;closeLayers();({pdf:()=>Insert.pickPdf('new'),cam:()=>Insert.fromPhoto('new'),img:()=>Insert.fromPhoto('new',true),web:()=>WebImport.open('new'),pop:()=>PopSong.open(),crea:()=>Compose.open('new'),dups:()=>Dups.open(),fsmiss:()=>FS4.report({pdfs:0,dups:0,matched:0,setlists:0,errors:[],resume:true}),tpl:()=>Insert.templatesNew(),fs:()=>FS4.pick(),backup:()=>showBackup()})[b.dataset.m]()};
}

// ---------- Ritaglia margini ----------
function showCrop(){
  if(!ST.cur) return; const c=ST.cur.crop=ST.cur.crop||{l:0,t:0,r:0,b:0};
  const sl=(k,l)=>`<div class="sl"><span>${l}<em id="cv-${k}">${Math.round(c[k]*100)}%</em></span><input type="range" id="cr-${k}" min="0" max="25" value="${Math.round(c[k]*100)}" style="--v:${c[k]*400}%"></div>`;
  const m2=modal('Ritaglia margini',`<div class="hint">Togli i bordi bianchi della scansione: la musica si ingrandisce sullo schermo. Vale per tutte le pagine di questo spartito.</div><div class="sliders">${sl('t','Sopra')}${sl('b','Sotto')}${sl('l','Sinistra')}${sl('r','Destra')}</div>`,
    `<button class="ghostBtn" data-reset>Azzera</button><button class="goldBtn" data-ok>${iconSvg('check')}Fatto</button>`);
  const upd=debounce(()=>{DB.putScore(ST.cur);renderPage()},120);
  ['t','b','l','r'].forEach(k=>{const i=$('#cr-'+k);i.oninput=()=>{c[k]=i.value/100;i.style.setProperty('--v',(i.value/25*100)+'%');$('#cv-'+k).textContent=i.value+'%';upd()}});
  m2.querySelector('[data-reset]').onclick=()=>{Object.assign(c,{l:0,t:0,r:0,b:0});closeLayers();DB.putScore(ST.cur);renderPage()};
  m2.querySelector('[data-ok]').onclick=closeLayers;
  m2.style.top='auto';m2.style.bottom='20px';m2.style.transform='translateX(-50%)';$('.scrim',layerRoot).style.background='transparent';
}

// ---------- Impostazioni e altri pannelli ----------
function switchRow(id,label,on,hint){return `<div class="switchRow"><div><b>${label}</b>${hint?`<div class="hint" style="font-size:13px">${hint}</div>`:''}</div><button class="switch${on?' on':''}" id="${id}" role="switch" aria-checked="${on}" aria-label="${esc(label)}"></button></div>`}
function showSettings(){
  const s=ST.settings;
  const m2=modal('Impostazioni',`
    ${switchRow('setAuto','Riconosci Apple Pencil da sola',s.autoPencil!==false,'Appena usi la Pencil: Pencil per scrivere, dito per sfogliare e ingrandire, il palmo appoggiato non lascia segni.')}
    ${switchRow('setPencil','Disegna solo con Apple Pencil',s.pencilOnly,'Sempre: con il dito sfogli le pagine anche mentre annoti.')}
    <div class="field"><label>Cambio pagina</label><div class="seg" id="setTurn">${[['curl','Pagina che gira'],['slide','Scorrimento'],['none','Istantaneo']].map(([k,l])=>`<button data-k="${k}" class="${(s.turnAnim===false?'none':(s.turnStyle||'curl'))===k?'on':''}">${l}</button>`).join('')}</div></div>
    <div><button class="ghostBtn" id="setFs">${iconSvg('expand')}Tutto schermo</button></div>
    ${switchRow('setNight','Modalità notte',s.night,'Pagina scura e note chiare, per il palco buio.')}
    ${switchRow('setZones','Tocca ai lati per girare pagina',s.tapZones,'Sinistra: indietro · destra: avanti · centro: barre.')}
    <div class="field"><label>Dimensione di pannelli e finestre (anche pizzicando con due dita)</label><div class="seg" id="setUiz">${[[.8,'Piccola'],[1,'Normale'],[1.2,'Grande'],[1.45,'Molto grande']].map(([v,l])=>`<button data-z="${v}" class="${Math.abs((s.uiz||1)-v)<.04?'on':''}">${l}</button>`).join('')}</div></div>
    ${window.MozartNative&&MozartNative.setSecure?switchRow('setSecure','Proteggi le schermate',true,'Blocca screenshot e registrazione dello schermo: nelle immagini Mozart appare nero.'):''}
    <div class="eyebrow" style="margin-top:6px">Barra di Annota</div>
    <div class="sl"><span>Scurezza della barra (più scura = si legge meglio)<em id="abv">${Math.round((s.annoBarA??.86)*100)}%</em></span><input type="range" id="setAb" min="30" max="100" step="2" value="${Math.round((s.annoBarA??.86)*100)}" style="--v:${((s.annoBarA??.86)*100-30)/70*100}%"></div>
    ${switchRow('setLbl','Nome sotto ogni icona',s.annoLabels!==false,'Così le funzioni si capiscono al volo.')}
    ${switchRow('setGuide','Spiega i pulsanti quando apri Annota',s.annoGuide!==false,'Compare le prime volte; il punto interrogativo nella barra la richiama sempre.')}
    <div class="sl"><span>Durata della pressione sui bordi<em id="lpv">${s.longPress} ms</em></span><input type="range" id="setLp" min="250" max="1000" step="50" value="${s.longPress}" style="--v:${(s.longPress-250)/7.5}%"></div>
    <div class="hint">Tieni premuto sul <b>bordo alto</b> per la barra superiore, sul <b>bordo basso</b> per le pagine, a <b>sinistra</b> per la libreria e a <b>destra</b> per gli attrezzi.</div>`,
    `<button class="goldBtn" data-ok>${iconSvg('check')}Fatto</button>`);
  const tg=(id,key,after)=>{const b=$('#'+id);b.onclick=()=>{s[key]=!s[key];b.classList.toggle('on',s[key]);b.setAttribute('aria-checked',s[key]);saveSettings();after&&after()}};
  tg('setPencil','pencilOnly'); s.autoPencil=s.autoPencil!==false; tg('setAuto','autoPencil');
  $('#setUiz').onclick=e=>{const b=e.target.closest('[data-z]');if(!b)return;UIZoom.apply(+b.dataset.z);saveSettings();$$('#setUiz button').forEach(x=>x.classList.toggle('on',x===b))};
  $('#setTurn').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k;s.turnAnim=k!=='none';if(k!=='none')s.turnStyle=k;saveSettings();$$('#setTurn button').forEach(x=>x.classList.toggle('on',x===b))};
  $('#setFs').onclick=()=>{closeLayers();FS.toggle()}; tg('setNight','night',()=>document.body.classList.toggle('night',s.night)); tg('setZones','tapZones');
  const ab=$('#setAb'); ab.oninput=()=>{ s.annoBarA=+ab.value/100; $('#abv').textContent=ab.value+'%'; ab.style.setProperty('--v',(ab.value-30)/70*100+'%'); saveSettings(); try{ Anno.labelBar(); }catch(e){} };
  s.annoLabels=s.annoLabels!==false; s.annoGuide=s.annoGuide!==false; tg('setLbl','annoLabels',()=>{ try{ Anno.labelBar(); }catch(e){} }); tg('setGuide','annoGuide');
  const sb=$('#setSecure'); if(sb){ MozartNative.getSecure().then(v=>{ sb.classList.toggle('on',!!v); sb.setAttribute('aria-checked',!!v); }).catch(()=>{}); sb.onclick=()=>{ const on=!sb.classList.contains('on'); MozartNative.setSecure(on).then(v=>{ sb.classList.toggle('on',!!v); sb.setAttribute('aria-checked',!!v); toast(v?'Screenshot e registrazione bloccati':'Protezione schermate disattivata',2600); }); }; }
  const lp=$('#setLp'); lp.oninput=()=>{s.longPress=+lp.value;$('#lpv').textContent=lp.value+' ms';lp.style.setProperty('--v',((lp.value-250)/7.5)+'%');saveSettings()};
  m2.querySelector('[data-ok]').onclick=closeLayers;
}
function showPedals(){
  modal('Pedaliera Bluetooth',`<div class="hint">Collega la pedaliera all'iPad dalle Impostazioni di sistema (Bluetooth). Mozart riconosce i tasti più usati dalle pedaliere:</div>
    <div class="hint"><kbd>→</kbd> <kbd>↓</kbd> <kbd>Pag giù</kbd> <kbd>Spazio</kbd> pagina successiva<br><kbd>←</kbd> <kbd>↑</kbd> <kbd>Pag su</kbd> pagina precedente</div>
    <div class="hint">Prova ora: premi un pedale, la pagina gira.</div>`,`<button class="goldBtn" data-close>${iconSvg('check')}Ok</button>`);
  $('.modal [data-close]:last-child')?.addEventListener('click',closeLayers);
}
async function showDashboard(){
  let anns=0; for(const s of ST.scores){const a=await DB.get('ann:'+s.id);if(a)for(const k in a)anns+=a[k].length}
  const pages=ST.scores.reduce((a,s)=>a+s.pages,0);
  const comp=new Set(ST.scores.map(s=>s.composer).filter(Boolean)).size;
  const tile=(n,l)=>`<div style="background:var(--panel-2);border:1px solid var(--line);border-radius:16px;padding:14px"><div style="font-family:var(--f-display);font-size:34px;font-weight:700;color:var(--gold-hi);font-variant-numeric:tabular-nums">${n}</div><div class="hint">${l}</div></div>`;
  modal('Cruscotto',`<div class="grid2">${tile(ST.scores.length,'spartiti')}${tile(pages,'pagine')}${tile(ST.setlists.length,'setlist')}${tile(comp,'compositori')}${tile(anns,'annotazioni e segni')}${tile((ST.scores.reduce((a,s)=>a+(s.size||0),0)/1048576).toFixed(1)+' MB','spazio usato')}</div>`);
}
function showBackup(){
  const m2=modal('Backup',`<div class="hint">Salva tutta la libreria (spartiti, annotazioni, setlist, segnalibri) in un unico file, oppure ripristinala da un backup.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="goldBtn" id="bkSave">${iconSvg('backup')}Crea backup</button><button class="ghostBtn" id="bkLoad">${iconSvg('up')}Ripristina</button></div>
    <div class="hint">Vieni da forScore? Apri qui il suo backup o archivio <b>.4sb</b>: Mozart importa spartiti, titoli, compositori, etichette e setlist.</div>
    <div><button class="goldBtn" id="bkFs">${iconSvg('backup')}Apri backup forScore (.4sb)</button></div><div id="bkOut"></div>`);
  $('#bkFs').onclick=()=>{closeLayers();FS4.pick()};
  $('#bkSave').onclick=async()=>{busy('Preparo il backup…');const data={v:1,setlists:ST.setlists,scores:[]};
    for(const s of ST.scores){const {_bytes,bytes:_b,...meta}=s;const bytes=await getBytes(s);let b64='';const u8=new Uint8Array(bytes);for(let i=0;i<u8.length;i+=32768)b64+=String.fromCharCode.apply(null,u8.subarray(i,i+32768));data.scores.push({...meta,pdf:btoa(b64),ann:await DB.get('ann:'+s.id)})}
    busy();offerDownload(new Blob([JSON.stringify(data)],{type:'application/json'}),`Mozart-backup-${new Date().toISOString().slice(0,10)}.json`,$('#bkOut'))};
  $('#bkLoad').onclick=()=>{const f=$('#fileBackup');f.value='';f.onchange=async()=>{const file=f.files[0];if(!file)return;Conflict.reset();busy('Ripristino…');try{const data=JSON.parse(await file.text());for(const s of data.scores){const bin=atob(s.pdf);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);const {pdf,ann,...meta}=s;const sc={...meta,size:u8.byteLength};const ex=ST.scores.find(x=>x.id===sc.id||normName(x.file||x.title)===normName(sc.file||sc.title));let mode='new';if(ex){busy();mode=await Conflict.ask(ex.title);busy('Ripristino…');}if(mode==='skip')continue;if(mode==='replace'){Object.assign(ex,{...meta,id:ex.id,size:u8.byteLength});await DB.set('pdf:'+ex.id,u8.buffer);await DB.putScore(ex);if(ann)await DB.set('ann:'+ex.id,ann);continue;}if(mode==='both')sc.id=uid();await DB.set('pdf:'+sc.id,u8.buffer);ST.scores.push(sc);await DB.putScore(sc);if(ann)await DB.set('ann:'+sc.id,ann)}
      for(const sl of data.setlists||[]) if(!ST.setlists.some(x=>x.id===sl.id)) ST.setlists.push(sl); saveSetlists(); busy(); closeLayers(); renderLibrary(); toast('Backup ripristinato')}catch(e){busy();toast('File di backup non valido')}};f.click()};
}
function offerDownload(blob,name,where){
  const url=URL.createObjectURL(blob);
  if(navigator.canShare && navigator.share){ try{const file=new File([blob],name,{type:blob.type}); if(navigator.canShare({files:[file]})){navigator.share({files:[file],title:name}).catch(()=>{});}}catch(e){} }
  const a=document.createElement('a');a.href=url;a.download=name;a.className='goldBtn';a.style.textDecoration='none';a.innerHTML=iconSvg('share')+'Salva “'+esc(name)+'”';
  if(where){where.innerHTML='';where.appendChild(a);where.insertAdjacentHTML('beforeend','<div class="hint" style="margin-top:8px">Se il salvataggio non parte, apri Mozart da Safari o dalla Home dell\'iPad.</div>')}
  else { const m2=modal('File pronto',`<div id="dlBox"></div>`); $('#dlBox').appendChild(a); }
}
function showAbout(){
  modal('Mozart',`<div style="display:flex;gap:16px;align-items:center"><img src="__SEAL__" alt="Sigillo FPM webdesignertech" style="width:140px;flex:none;filter:drop-shadow(0 0 18px rgba(214,168,78,.35))">
    <div><div style="font-family:var(--f-display);font-size:26px;font-weight:700">FPM webdesignertech</div><div class="hint">Mozart · Leggio digitale per cantanti, cori e musicisti.<br>© 2026 FPM webdesignertech · Tutti i diritti riservati.<br>Nome, marchio, icona e codice sono opera protetta: vietata la copia e la distribuzione senza autorizzazione.</div></div></div>
    <div class="hint">Gli spartiti restano sul tuo iPad: nessun account, nessun caricamento online.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px"><button class="goldBtn" id="abWrite">${iconSvg('mail')}Scrivici</button></div>
    <div class="hint" style="font-family:var(--f-display);font-style:italic;text-align:center;margin-top:6px;color:var(--gold-hi)">In affettuosa memoria del caro collega e amico Francesco De Candia</div>`);
  $('#abWrite').onclick=()=>Contact.open();
}
// ---------- Scrivici: messaggio a FPM webdesignertech ----------
const Contact={
  to:'fpm@fpmwebdesignertech.it',
  open(){
    const m=modal('Scrivici',`<div class="hint">Domande, problemi o idee per migliorare Mozart? Scrivi qui: il messaggio parte dalla tua posta verso FPM webdesignertech.</div>
      <div class="field"><label for="ctKind">Argomento</label><select id="ctKind"><option>Domanda</option><option>Segnala un problema</option><option>Suggerimento</option><option>Collaborazione</option><option>Altro</option></select></div>
      <div class="field"><label for="ctName">Il tuo nome</label><input id="ctName" autocomplete="name"></div>
      <div class="field"><label for="ctMsg">Messaggio</label><textarea id="ctMsg" rows="6" style="width:100%;resize:vertical"></textarea></div>
      <label class="switchRow" style="gap:10px"><span class="hint" style="font-size:13px">Aggiungi informazioni tecniche (versione, dispositivo) per aiutarci a capire</span><input type="checkbox" id="ctTech" checked style="width:22px;height:22px;accent-color:var(--gold)"></label>
      <div class="hint" id="ctNote" style="font-size:12.5px">Scrivi a: ${this.to}</div>`,
      `<button class="ghostBtn" id="ctCopy">${iconSvg('copy')}Copia indirizzo</button><button class="goldBtn" id="ctSend">${iconSvg('mail')}Invia</button>`);
    $('#ctCopy',m).onclick=async()=>{ try{ await navigator.clipboard.writeText(this.to); toast('Indirizzo copiato: '+this.to,2600); }catch(e){ toast(this.to,3500); } };
    $('#ctSend',m).onclick=()=>this.send(m);
  },
  send(m){
    const msg=$('#ctMsg',m).value.trim(); if(msg.length<5){ $('#ctMsg',m).focus(); return toast('Scrivi il messaggio',2200); }
    const kind=$('#ctKind',m).value, name=$('#ctName',m).value.trim();
    const tech=$('#ctTech',m).checked?`\n\n—\nMozart · ${window.MozartNative&&MozartNative.app?'app iPad/iPhone':'versione web'} · ${navigator.platform||''} · ${navigator.language||''}`:'';
    const subject='Mozart · '+kind, body=(name?`Da: ${name}\n\n`:'')+msg+tech;
    if(window.MozartNative&&MozartNative.mail){
      MozartNative.mail(this.to,subject,body).then(r=>{ if(r==='mailto') toast('Si apre la tua app di posta',2600); closeLayers(); }).catch(()=>{ toast('Nessuna app di posta: indirizzo copiato, scrivici da dove preferisci',4200); try{ navigator.clipboard.writeText(this.to); }catch(e){} });
    } else {
      location.href='mailto:'+this.to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      $('#ctNote',m).innerHTML='Si è aperta la tua app di posta? Se non succede nulla, copia l\'indirizzo e scrivici da dove preferisci: '+this.to;
    }
  },
};

// ---------- Unisci spartiti ed esporta ----------
async function mergeSelected(){
  busy('Unisco gli spartiti…');
  try{
    const ids=[...ST.selected]; const scs=ids.map(id=>ST.scores.find(s=>s.id===id));
    const out=await PDFLib.PDFDocument.create(); const ann={}; let off=0;
    for(const s of scs){const src=await PDFLib.PDFDocument.load(await getBytes(s),{ignoreEncryption:true});const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p));
      const a=(await DB.get('ann:'+s.id))||{};for(const k in a)ann[+k+off]=a[k];off+=pages.length}
    const bytes=(await out.save()).buffer;
    const sc=await addScore(bytes,{title:scs.map(s=>s.title).join(' + '),composer:scs[0].composer,genre:scs[0].genre});
    await DB.set('ann:'+sc.id,ann);
    ST.libSelect=false;ST.selected.clear();busy();renderLibrary();openScore(sc.id);toast('Spartiti uniti in uno nuovo');
  }catch(e){busy();toast('Non riesco a unire questi PDF')}
}
async function exportPdf(){
  if(!ST.cur) return; busy('Preparo il PDF con le annotazioni…');
  try{
    const bytes=await buildAnnotatedPdf(ST.cur,ST.ann); busy();
    offerDownload(new Blob([bytes],{type:'application/pdf'}),(ST.cur.title||'spartito')+' (annotato).pdf');
  }catch(e){busy();toast('Esportazione non riuscita')}
}

// ---------- Libreria di esempio ----------
async function makeDemoLibrary(){
  const demos=[
    {title:'Esempio · Finaletto per coro',composer:'Esempi FPM',genre:'Opera',tags:['esempio','coro'],pages:4,key:'Sol maggiore',ks:1},
    {title:'Esempio · Corale a quattro voci',composer:'Esempi FPM',genre:'Sacra',tags:['esempio','coro'],pages:2,key:'Fa maggiore',ks:-1},
    {title:'Esempio · Vocalizzi del coro',composer:'Esempi FPM',genre:'Esercizi',tags:['esempio','riscaldamento'],pages:2,key:'Do maggiore',ks:0},
  ];
  for(const d of demos){
    const bytes=await demoPdf(d);
    const sc=await addScore(bytes,d); sc.added=Date.now()-Math.random()*1e8; if(d.pages===4){sc.bookmarks=[{p:2,name:'n. 171 · Di sì felice'}]} DB.putScore(sc);
  }
  const fin=ST.scores.find(s=>s.pages===4);
  ST.setlists=[{id:uid(),name:'Esempio · Concerto di novembre',items:ST.scores.map(s=>s.id)}]; saveSetlists();
  // Qualche segno già messo, per mostrare le annotazioni
  if(fin) await DB.set('ann:'+fin.id,{0:[
    {t:'stamp',g:{c:U(0x1D110),f:'m'},x:.34,y:.25,size:.05,color:'#d23b2f',layer:0},
    {t:'pen',color:'#1f5fd6',w:.0035,alpha:1,pts:[[.12,.395],[.2,.392],[.3,.394],[.42,.391]],layer:0},
    {t:'stamp',g:{c:P+P,f:'m'},x:.13,y:.44,size:.045,color:'#d23b2f',layer:0},
    {t:'hl',color:'#f4e04d',w:.022,alpha:.42,pts:[[.12,.52],[.5,.52],[.88,.521]],layer:0},
    {t:'stamp',g:{v:'breathV'},x:.6,y:.47,size:.035,color:'#d23b2f',layer:0},
  ]});
}
async function demoPdf(d){
  const {PDFDocument,StandardFonts,rgb}=PDFLib; const doc=await PDFDocument.create();
  const fB=await doc.embedFont(StandardFonts.TimesRomanBold), fI=await doc.embedFont(StandardFonts.TimesRomanItalic), fR=await doc.embedFont(StandardFonts.TimesRoman);
  let seed=d.title.length*977; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  const black=rgb(.08,.08,.08);
  for(let p=0;p<d.pages;p++){
    const pg=doc.addPage([595,842]); const W=595,H=842;
    if(p===0){ pg.drawText(d.title.replace('Esempio · ',''),{x:W/2-fB.widthOfTextAtSize(d.title.replace('Esempio · ',''),22)/2,y:H-70,size:22,font:fB,color:black});
      pg.drawText('Spartito di esempio generato da Mozart',{x:W/2-fI.widthOfTextAtSize('Spartito di esempio generato da Mozart',11)/2,y:H-90,size:11,font:fI,color:rgb(.35,.35,.35)});
      pg.drawText('Allegro',{x:60,y:H-125,size:13,font:fB,color:black}); }
    pg.drawText(String(440+p),{x:p%2?W-60:40,y:H-40,size:11,font:fB,color:black});
    const systems=p===0?5:6; const top=p===0?H-160:H-80;
    for(let sy=0;sy<systems;sy++){
      const y0=top-sy*120; const left=60,right=W-40;
      for(let st=0;st<2;st++){
        const yb=y0-st*44;
        for(let l=0;l<5;l++) pg.drawLine({start:{x:left,y:yb-l*7},end:{x:right,y:yb-l*7},thickness:.7,color:black});
        // chiave stilizzata e armatura
        if(st===0){pg.drawEllipse({x:left+12,y:yb-21,xScale:5,yScale:7,borderColor:black,borderWidth:1.4});pg.drawLine({start:{x:left+14,y:yb+8},end:{x:left+10,y:yb-34},thickness:1.4,color:black})}
        else {pg.drawEllipse({x:left+12,y:yb-8,xScale:5,yScale:5,color:black});pg.drawCircle({x:left+22,y:yb-4,size:1.3,color:black});pg.drawCircle({x:left+22,y:yb-11,size:1.3,color:black})}
        const bars=4, bw=(right-left-40)/bars;
        for(let b=0;b<=bars;b++) pg.drawLine({start:{x:left+40+b*bw,y:yb},end:{x:left+40+b*bw,y:yb-28},thickness:b===bars&&sy===systems-1&&p===d.pages-1?3:.9,color:black});
        for(let b=0;b<bars;b++){ const n=3+Math.floor(rnd()*3);
          for(let k=0;k<n;k++){ const x=left+48+b*bw+k*(bw-14)/n; const step=Math.floor(rnd()*9)-1; const y=yb-28+step*3.5;
            const filled=rnd()>.25; pg.drawEllipse({x,y,xScale:4.2,yScale:3,rotate:PDFLib.degrees(-20),color:filled?black:undefined,borderColor:black,borderWidth:filled?0:1.1});
            const up=step<4; pg.drawLine({start:{x:up?x+3.8:x-3.8,y},end:{x:up?x+3.8:x-3.8,y:up?y+22:y-22},thickness:.9,color:black});
            if(rnd()>.85) pg.drawCircle({x:x,y:up?y-7:y+7,size:1.1,color:black});
          } }
      }
      if(p<2){ const words=['Di','sì','fe','li','ce','in','ne','sto','ser','biam','me','mo','ria','e','ter','na'];
        let x=110; for(let w=0;w<9;w++){const t=words[(sy*9+w)%words.length]+(w<8?' -':'');pg.drawText(t,{x,y:y0-38,size:9.5,font:fR,color:black});x+=50} }
      if(sy===1&&p===0) pg.drawText('pp',{x:72,y:y0-34,size:12,font:fI,color:black});
    }
  }
  return (await doc.save()).buffer;
}

// ---------- Avvio ----------
async function boot(){
  hydrateIcons();
  const splash=$('#splash'), t0=Date.now(); let gone=false;
  const hide=()=>{ if(gone) return; gone=true; splash.classList.add('out'); setTimeout(()=>{ if(splash.parentNode) splash.parentNode.removeChild(splash); },700); };
  splash.addEventListener('click',hide); setTimeout(hide,7000);
  boot.ready=()=>setTimeout(hide,Math.max(0,3800-(Date.now()-t0)));
  try{ await document.fonts.load('40px "Noto Music"','\u{1D11E}'); await document.fonts.load('italic 600 20px "Bodoni Moda"','Allegro'); }catch(e){}
  if(!window.pdfjsLib||!window.PDFLib){ boot.ready(); $('#loading').insertAdjacentHTML('beforeend','<div style="margin-top:14px">Non riesco a caricare il lettore PDF. Controlla la connessione e riapri.</div>'); return; }
  try{ pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER; }catch(e){}
  await loadAll();
  Anno.init(); Piano.build(); Zoom.init(); UIZoom.init(); Bright.apply(); Clock.init(); AutoSave.init();
  let last=null; try{last=JSON.parse(localStorage.getItem('fpm-last')||'null')}catch(e){}
  const start = (last && ST.scores.find(s=>s.id===last.id)) ? last : {id:[...ST.scores].sort((a,b)=>b.pages-a.pages)[0]?.id, page:0};
  if(start.id) await openScore(start.id,start.page||0);
  renderLibrary(); boot.ready();
  if(ST.settings.firstRun){ if(innerWidth>=900) openSide('library'); setTimeout(()=>toast('Suggerimento: tieni premuto sui bordi dello schermo per mostrare barre e pannelli',4200),900); ST.settings.firstRun=false; saveSettings(); }
}
