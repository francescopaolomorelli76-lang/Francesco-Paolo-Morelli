// ================= Zoom con due dita · Tutto schermo · Luminosità · Invio (AirDrop) =================
const Zoom = {
  z:1, x:0, y:0, ptrs:new Map(), active:false, gestured:false, start:null, lastTap:0,
  apply(){ pageWrap.style.transform = (this.z===1&&!this.x&&!this.y) ? '' : `translate(${this.x}px,${this.y}px) scale(${this.z})`; },
  reset(silent){ if(this.z===1&&!this.x&&!this.y) return; this.z=1; this.x=0; this.y=0; this.apply(); if(!silent) renderPage(0,{noPrefetch:true}); },
  clampPan(){ const r=stage.getBoundingClientRect(); const w=pageWrap.offsetWidth*this.z, h=pageWrap.offsetHeight*this.z;
    const mx=Math.max(0,(w-r.width)/2+40), my=Math.max(0,(h-r.height)/2+40); this.x=clamp(this.x,-mx,mx); this.y=clamp(this.y,-my,my); },
  init(){
    const sharpen=debounce(()=>renderPage(0,{noPrefetch:true}),220);
    stage.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch') return;
      // mentre si disegna: il palmo o un secondo dito arrivati dopo non fanno zoom
      if(ST.annotate&&Anno.live&&(Anno.livePointer!=='touch'||Date.now()-(this.t0||0)>220)) return;
      if(!this.ptrs.size) this.t0=Date.now();
      this.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});
      if(this.ptrs.size===2){
        this.active=true; this.gestured=true; Anno.cancelTouchStroke&&Anno.cancelTouchStroke();
        const [a,b]=[...this.ptrs.values()]; const r=stage.getBoundingClientRect();
        this.start={d:Math.hypot(a.x-b.x,a.y-b.y)||1, z:this.z, mx:(a.x+b.x)/2-r.left-r.width/2, my:(a.y+b.y)/2-r.top-r.height/2, x:this.x, y:this.y};
      }
    },true);
    stage.addEventListener('pointermove',e=>{
      const p=this.ptrs.get(e.pointerId); if(!p) return; const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
      if(this.active && this.ptrs.size>=2){
        const [a,b]=[...this.ptrs.values()]; const r=stage.getBoundingClientRect(); const s=this.start;
        const z=clamp(s.z*Math.hypot(a.x-b.x,a.y-b.y)/s.d,1,5);
        const mx=(a.x+b.x)/2-r.left-r.width/2, my=(a.y+b.y)/2-r.top-r.height/2;
        const px=(s.mx-s.x)/s.z, py=(s.my-s.y)/s.z;   // punto della pagina sotto le dita
        this.z=z; this.x=mx-px*z; this.y=my-py*z; this.clampPan(); this.apply();
      } else if(this.z>1.02 && this.ptrs.size===1 && !(ST.annotate && !Anno.touchNavigates())){
        if(Math.hypot(p.x-p.x0,p.y-p.y0)>6) this.gestured=true;
        this.x+=dx; this.y+=dy; this.clampPan(); this.apply();
      }
    },true);
    const up=e=>{
      if(!this.ptrs.has(e.pointerId)) return; this.ptrs.delete(e.pointerId);
      if(this.active) this.lastPinch=Date.now();
      if(this.active && this.ptrs.size<2){ this.active=false; if(this.z<1.06) this.reset(); else sharpen(); }
      if(!this.ptrs.size){
        // doppio tocco: torna alla pagina intera (o ingrandisce)
        const now=Date.now(); const moved=this.gestured;
        if(!moved && now-this.lastTap<300 && !ST.annotate){ if(this.z>1.02) this.reset(); else { this.z=2.2; const r=stage.getBoundingClientRect(); this.x=-(e.clientX-r.left-r.width/2)*1.2; this.y=-(e.clientY-r.top-r.height/2)*1.2; this.clampPan(); this.apply(); sharpen(); } this.gestured=true; this.lastTap=0; }
        else this.lastTap=moved?0:now;
        setTimeout(()=>{ this.gestured=false; },0);
      }
    };
    stage.addEventListener('pointerup',up,true); stage.addEventListener('pointercancel',up,true);
    // iOS: evita lo zoom di Safari sull'intera pagina
    ['gesturestart','gesturechange'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
  },
};

// ---------- Tutto schermo (iPad: schermo intero vero; iPhone: modalità concerto + app dalla Home) ----------
const FS = {
  standalone(){ return navigator.standalone===true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches; },
  isOn(){ return !!(document.fullscreenElement||document.webkitFullscreenElement) || document.body.classList.contains('immersive'); },
  async toggle(){
    if(this.isOn()){ try{ if(document.fullscreenElement) await document.exitFullscreen(); else if(document.webkitFullscreenElement) document.webkitExitFullscreen(); }catch(e){} this.immersive(false); return; }
    const el=document.documentElement; let ok=false;
    try{ if(el.requestFullscreen){ await el.requestFullscreen({navigationUI:'hide'}); ok=true; } else if(el.webkitRequestFullscreen){ el.webkitRequestFullscreen(); ok=true; } }catch(e){ ok=false; }
    this.immersive(true);
    if(!ok && !this.standalone()) this.tip();
    else toast('Tutto schermo · tieni premuto un bordo per i comandi',2600);
  },
  immersive(on){ document.body.classList.toggle('immersive',on); if(on){ closeSides(); setBars(false,false); } else setBars(true,true); $$('[data-act="fullscreen"]').forEach(b=>b.classList.toggle('on',on)); renderPage(0,{noPrefetch:true}); },
  tip(){
    const iphone=/iPhone|iPod/.test(navigator.userAgent);
    modal('Tutto schermo',`<div class="hint">Ora Mozart mostra solo la musica: tieni premuto un bordo per far tornare comandi e pannelli.</div>
      <div class="hint">${iphone?'Su <b>iPhone</b>':'Per togliere anche le barre di <b>Safari</b>'}: tocca <b>Condividi</b> ${iconSvg('share')} → <b>Aggiungi alla schermata Home</b>, poi apri Mozart dalla sua icona. Si apre a tutto schermo, senza indirizzo e senza barre, su iPhone e su iPad.</div>`,
      `<button class="goldBtn" data-close>${iconSvg('check')}Ho capito</button>`);
    $('.modal .mFoot [data-close]').onclick=closeLayers;
  },
};
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement && document.body.classList.contains('immersive')) FS.immersive(false); });

// ---------- Luminosità e calore dello schermo ----------
const Bright = {
  apply(){ const s=ST.settings; const d=$('#dimmer'); d.style.background=`rgba(0,0,0,${(100-(s.bright??100))/100*.85})`; $('#warmer').style.background=`rgba(255,150,40,${(s.warm||0)/100*.35})`; },
  open(el){
    const s=ST.settings;
    const p=popover(el,`<h4>Luminosità</h4><div style="width:280px;display:flex;flex-direction:column;gap:10px">
      <div class="sl"><span>Luminosità<em id="brV">${s.bright??100}%</em></span><input type="range" id="brR" min="25" max="100" value="${s.bright??100}" style="--v:${((s.bright??100)-25)/75*100}%"></div>
      <div class="sl"><span>Luce calda (riposa gli occhi)<em id="wmV">${s.warm||0}%</em></span><input type="range" id="wmR" min="0" max="100" value="${s.warm||0}" style="--v:${s.warm||0}%"></div>
      <div class="seg"><button data-b="100">Giorno</button><button data-b="70">Sala</button><button data-b="45">Palco buio</button></div>
      <div class="hint" style="font-size:12.5px">Regola la luce dentro Mozart. La luminosità generale dell'iPhone/iPad si cambia dal Centro di Controllo.</div></div>`,{above:true});
    const bind=(id,key,lab,min,max)=>{const i=$('#'+id);i.oninput=()=>{s[key]=+i.value;$('#'+lab).textContent=i.value+'%';i.style.setProperty('--v',(i.value-min)/(max-min)*100+'%');this.apply();saveSettings()}};
    bind('brR','bright','brV',25,100); bind('wmR','warm','wmV',0,100);
    p.querySelector('.seg').onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;const v=+b.dataset.b;s.bright=v;s.warm=v<60?35:v<90?15:0;saveSettings();this.apply();this.open(el)};
  },
};

// ---------- Invia (AirDrop, Messaggi, WhatsApp, Mail…) ----------
async function buildAnnotatedPdf(sc, ann){
  const doc=await PDFLib.PDFDocument.load(await getBytes(sc),{ignoreEncryption:true}); const pages=doc.getPages();
  for(let i=0;i<pages.length;i++){
    const strokes=ann[i]; if(!strokes||!strokes.length) continue; await preloadAnnImgs(strokes);
    const pg=pages[i]; const {width,height}=pg.getSize(); const k=3;
    const c=document.createElement('canvas'); c.width=Math.round(width*k); c.height=Math.round(height*k);
    Anno.paint(c.getContext('2d'),strokes,c.width,c.height,true);
    const png=await doc.embedPng(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer());
    pg.drawImage(png,{x:0,y:0,width,height});
  }
  return doc.save();
}
async function shareFile(blob,name,title){
  const file=new File([blob],name,{type:blob.type});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title}); return true; }catch(e){ if(e&&e.name==='AbortError') return true; }
  }
  offerDownload(blob,name); return false;
}
function shareScore(){
  if(!ST.cur) return toast('Apri prima uno spartito');
  const sc=ST.cur;
  const m2=modal('Invia spartito',`<div class="hint">Si apre il foglio di condivisione dell'iPhone/iPad: scegli <b>AirDrop</b> e il tuo iPad o iPhone, oppure Messaggi, WhatsApp, Mail.</div>
    <div class="srcCards"><button class="srcCard hero" data-w="ann">${iconSvg('pen')}<b>Con annotazioni</b><span>Segni e note stampati sul PDF</span></button>
    <button class="srcCard" data-w="orig">${iconSvg('file')}<b>PDF originale</b><span>Senza segni</span></button></div>
    <div class="hint" style="font-size:13px">Sull'altro dispositivo: il PDF arriva in File o Download. Apri Mozart → Importa → PDF dai File.</div>`,null,{eyebrow:sc.title});
  m2.querySelector('.srcCards').onclick=async e=>{const b=e.target.closest('[data-w]');if(!b)return;closeLayers();busy('Preparo il PDF…');
    try{ const bytes=b.dataset.w==='ann'?await buildAnnotatedPdf(sc,ST.ann):new Uint8Array(await getBytes(sc)); busy();
      await shareFile(new Blob([bytes],{type:'application/pdf'}),(sc.title||'spartito').replace(/[\\/:*?"<>|]+/g,' ')+(b.dataset.w==='ann'?' (annotato)':'')+'.pdf',sc.title); }
    catch(err){ busy(); toast('Invio non riuscito'); }};
}
