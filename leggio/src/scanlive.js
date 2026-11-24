// ============ SCANSIONA: come la funzione scanner di iPhone ============
// Nell'app: scanner di sistema (VisionKit): trova il foglio, scatta da solo, raddrizza, più pagine di fila.
// Nel browser: fotocamera dal vivo con rilevamento dei bordi e scatto automatico; altrimenti fotocamera di sistema.
const Scanner = {
  target:'new', shots:[], stream:null, timer:null,
  open(target){
    if(target==='insert'&&!ST.cur) target='new'; this.target=target; closeLayers();
    const native=!!(window.MozartNative&&MozartNative.scanDocs);
    const m=modal('Scansiona',`<div class="hint">Inquadra lo spartito: Mozart trova i bordi, raddrizza la pagina e la migliora. Puoi scattare più pagine di seguito.</div>
      <div class="srcCards">
        <button class="srcCard hero" data-s="live">${iconSvg('camera')}<b>${native?'Scansiona documento':'Apri la fotocamera'}</b><span>${native?'Lo scanner di iPhone e iPad: rileva il foglio, scatta da solo e raddrizza.':'Rileva il foglio, scatta in automatico e continua con la pagina dopo.'}</span></button>
        <button class="srcCard" data-s="shot">${iconSvg('camera')}<b>Una sola foto</b><span>Con la fotocamera di sistema.</span></button>
        <button class="srcCard" data-s="lib">${iconSvg('image')}<b>Dalla libreria foto</b><span>Una o più immagini già sul dispositivo.</span></button>
        <button class="srcCard" data-s="web">${iconSvg('file')}<b>Dal web</b><span>Incolla il link di un PDF o di un'immagine.</span></button></div>`,
      null,{eyebrow:target==='insert'?`Nuove pagine in “${ST.cur.title}”`:'Nuovo spartito'});
    m.querySelector('.srcCards').onclick=e=>{ const b=e.target.closest('[data-s]'); if(!b) return; const s=b.dataset.s; closeLayers();
      if(s==='live') return native?this.native():this.live();
      if(s==='shot') return Insert._photo(this.target,false);
      if(s==='lib') return Insert._photo(this.target,true);
      if(s==='web') return WebImport.open(this.target); };
  },
  async native(){
    busy('Apro lo scanner…');
    try{ const pages=await MozartNative.scanDocs(); busy(); if(!pages||!pages.length) return;
      const files=await Promise.all(pages.map(async(d,i)=>new File([await (await fetch(d)).blob()],`Scansione ${i+1}.jpg`,{type:'image/jpeg'})));
      Scan.start(files,this.target);
    }catch(e){ busy(); toast('Scanner non disponibile: uso la fotocamera',2600); this.live(); }
  },
  async live(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return Insert._photo(this.target,false);
    let stream; try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}},audio:false}); }
    catch(e){ toast('Fotocamera non consentita: uso quella di sistema',2800); return Insert._photo(this.target,false); }
    this.stream=stream; this.shots=[]; this.auto=true; this.last=null; this.still=0; this.cool=0;
    const o=document.createElement('div'); o.id='camLive';
    o.innerHTML=`<video playsinline muted autoplay></video><canvas id="clOv"></canvas>
      <div class="clTop"><button class="ghostBtn" id="clX">Chiudi</button><span id="clN">Inquadra la pagina</span><button class="goldBtn sm" id="clDone">Fine</button></div>
      <div class="clBot"><button id="clAuto" class="clMode on">Auto</button><button id="clShot" aria-label="Scatta"></button><div id="clThumbs"></div></div>`;
    $('#app').appendChild(o); const v=o.querySelector('video'); v.srcObject=stream; try{ await v.play(); }catch(e){}
    const small=document.createElement('canvas'), ov=$('#clOv');
    const tick=()=>{ if(!v.videoWidth) return; const k=Math.min(1,480/Math.max(v.videoWidth,v.videoHeight)); small.width=Math.round(v.videoWidth*k); small.height=Math.round(v.videoHeight*k);
      small.getContext('2d').drawImage(v,0,0,small.width,small.height); const q=autoQuad(small); const full=q.every(([x,y],i)=>Math.abs(x-[small.width*.03,small.width*.97,small.width*.97,small.width*.03][i])<2);
      this.drawQuad(ov,v,q,small,!full);
      if(!full&&this.last&&q.every(([x,y],i)=>Math.hypot(x-this.last[i][0],y-this.last[i][1])<small.width*.02)) this.still++; else this.still=0; this.last=q;
      if(this.auto&&this.still>=4&&Date.now()>this.cool){ this.shoot(v); this.still=0; } };
    this.timer=setInterval(tick,330);
    $('#clShot').onclick=()=>this.shoot(v); $('#clAuto').onclick=e=>{ this.auto=!this.auto; e.currentTarget.classList.toggle('on',this.auto); toast(this.auto?'Scatto automatico: tieni fermo il foglio':'Scatto manuale',1600); };
    $('#clX').onclick=()=>this.stop(); $('#clDone').onclick=()=>this.finish();
  },
  drawQuad(ov,v,q,small,ok){
    const r=v.getBoundingClientRect(); ov.width=r.width; ov.height=r.height; const x=ov.getContext('2d'); x.clearRect(0,0,ov.width,ov.height);
    // il video riempie il riquadro con object-fit: contain
    const s=Math.min(r.width/v.videoWidth,r.height/v.videoHeight), ox=(r.width-v.videoWidth*s)/2, oy=(r.height-v.videoHeight*s)/2, k=v.videoWidth/small.width*s;
    x.beginPath(); q.forEach(([px,py],i)=>{ const X=ox+px*k, Y=oy+py*k; i?x.lineTo(X,Y):x.moveTo(X,Y); }); x.closePath();
    x.fillStyle=ok?'rgba(235,90,70,.28)':'rgba(255,255,255,.06)'; x.fill(); x.strokeStyle=ok?'#f2d382':'rgba(255,255,255,.4)'; x.lineWidth=3; x.stroke(); },
  async shoot(v){
    if(!v.videoWidth) return; this.cool=Date.now()+1800;
    const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight; c.getContext('2d').drawImage(v,0,0);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92)); const f=new File([blob],`Scansione ${this.shots.length+1}.jpg`,{type:'image/jpeg'}); this.shots.push({f,url:URL.createObjectURL(blob)});
    const fl=document.createElement('div'); fl.className='clFlash'; $('#camLive').appendChild(fl); setTimeout(()=>fl.remove(),260);
    $('#clThumbs').innerHTML=this.shots.slice(-3).map(s=>`<img src="${s.url}" alt="">`).join(''); $('#clN').textContent=`${this.shots.length} ${this.shots.length===1?'pagina':'pagine'} · inquadra la prossima`; try{ navigator.vibrate&&navigator.vibrate(20); }catch(e){}
  },
  stop(){ clearInterval(this.timer); if(this.stream) this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; $('#camLive')?.remove(); },
  finish(){ const files=this.shots.map(s=>s.f); this.stop(); if(!files.length) return toast('Scatta almeno una pagina'); Scan.start(files,this.target); },
};
// "Scatta una foto / Scansiona" ovunque apre la sezione Scansiona; il vecchio comportamento resta come _photo
Insert._photo=Insert.fromPhoto;
Insert.fromPhoto=function(target,library){ if(library) return Insert._photo.call(Insert,target,true); return Scanner.open(target); };
