// ================= Migliora pagina: raddrizza pagine e righi storti, mette a fuoco, pulisce lo sfondo =================

// Angolo dei righi (gradi; positivo = salgono verso destra… nel verso dello schermo, ruotare di -angolo).
// Cerca l'inclinazione per cui le righe scure si "impilano" meglio: è quella dei pentagrammi.
function detectSkew(src){
  const w=Math.min(700,src.width), h=Math.round(src.height*w/src.width);
  const t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d',{willReadFrequently:true});
  x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(src,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data; const px=[], py=[];
  for(let y=0;y<h;y++) for(let i=0;i<w;i++){ const k=(y*w+i)*4; if(d[k]+d[k+1]+d[k+2]<330){ px.push(i-w/2); py.push(y); } }
  if(px.length<200) return 0;
  // al massimo ~40.000 punti per restare veloce
  const step=Math.max(1,Math.floor(px.length/40000));
  const score=a=>{ const tn=Math.tan(a*Math.PI/180), M=h+w; const bins=new Float32Array(M*2); let s=0;
    for(let j=0;j<px.length;j+=step){ const b=Math.round(py[j]-px[j]*tn)+M; bins[b]++; }
    for(let j=0;j<bins.length;j++) s+=bins[j]*bins[j]; return s; };
  let best=0, bs=-1;
  for(let a=-6;a<=6.001;a+=.25){ const s=score(a); if(s>bs){bs=s;best=a;} }
  for(let a=best-.25;a<=best+.25;a+=.03){ const s=score(a); if(s>bs){bs=s;best=a;} }
  return Math.abs(best)<.08?0:+best.toFixed(2);
}
function rotateCanvas(src,deg){
  if(!deg) return src;
  const c=document.createElement('canvas'); c.width=src.width; c.height=src.height; const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
  x.translate(c.width/2,c.height/2); x.rotate(-deg*Math.PI/180); x.imageSmoothingQuality='high'; x.drawImage(src,-src.width/2,-src.height/2);
  return c;
}
// Applica raddrizzamento e miglioramento a una pagina già disegnata (in lettura).
const FIX_DEF={on:false, straighten:true, sharpen:true, mode:'gray', clean:28};
function fixOf(sc){ return Object.assign({},FIX_DEF,sc&&sc.fix||{}); }
function fixPage(off,sc,p){
  const f=fixOf(sc); if(!f.on) return off;
  sc.skew=sc.skew||{};
  if(f.straighten){ if(sc.skew[p]==null){ sc.skew[p]=detectSkew(off); DB.putScore(sc); } off=rotateCanvas(off,sc.skew[p]); }
  if(f.sharpen){
    // elaborazione a risoluzione contenuta: veloce e leggera anche su iPhone
    const lim=2400, k=Math.min(1,lim/Math.max(off.width,off.height));
    let w=off; if(k<1){ w=document.createElement('canvas'); w.width=Math.round(off.width*k); w.height=Math.round(off.height*k); const x=w.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(off,0,0,w.width,w.height); }
    const e=enhance(w,f.mode==='bw'?'score':'gray',{contrast:25,bright:0,sharp:60,clean:f.clean,ink:f.mode==='bw'?55:55});
    if(k<1){ const c=document.createElement('canvas'); c.width=off.width; c.height=off.height; const x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(e,0,0,c.width,c.height); off=c; } else off=e;
  }
  return off;
}

const Fix = {
  // dopo ogni pagina: se è storta e il miglioramento è spento, il pulsante si accende per avvisare
  async check(){
    const b=$$('[data-act="fix"]'); if(!ST.cur||!pageCanvas.width) return;
    const f=fixOf(ST.cur); b.forEach(x=>x.classList.toggle('on',f.on));
    if(f.on){ b.forEach(x=>x.classList.remove('pulse')); return; }
    const a=detectSkew(pageCanvas); ST.cur._lastSkew=a;
    b.forEach(x=>x.classList.toggle('pulse',Math.abs(a)>=.5));
    if(Math.abs(a)>=.5 && !this._told){ this._told=true; toast(`Questa pagina è storta di ${Math.abs(a).toFixed(1).replace('.',',')}°: tocca Migliora per raddrizzarla`,3600); }
  },
  open(el){
    if(!ST.cur) return toast('Apri prima uno spartito');
    const sc=ST.cur, f=fixOf(sc); const a=sc.skew&&sc.skew[ST.page]!=null?sc.skew[ST.page]:(sc._lastSkew??detectSkew(pageCanvas));
    const p=popover(el,`<h4>Migliora pagina</h4><div style="width:300px;display:flex;flex-direction:column;gap:10px">
      <div class="hint" style="font-size:13.5px">${Math.abs(a)>=.1?`Questa pagina è storta di <b>${Math.abs(a).toFixed(1).replace('.',',')}°</b>.`:'Questa pagina è dritta.'} Vale per tutte le pagine di questo spartito, mentre leggi.</div>
      ${switchRow('fxOn','Migliora automaticamente',f.on,'Ogni pagina viene raddrizzata e resa nitida appena la apri.')}
      ${switchRow('fxStr','Raddrizza pagine e righi',f.straighten)}
      ${switchRow('fxSharp','Messa a fuoco e pulizia',f.sharpen,'Note e righi più netti, sfondo bianco, niente ombre.')}
      <div class="seg" id="fxMode"><button data-m="gray" class="${f.mode!=='bw'?'on':''}">Grigi nitidi</button><button data-m="bw" class="${f.mode==='bw'?'on':''}">Bianco e nero</button></div>
      <div class="sl"><span>Pulizia sfondo<em id="fxCv">${f.clean}</em></span><input type="range" id="fxClean" min="0" max="100" value="${f.clean}" style="--v:${f.clean}%"></div>
      <button class="goldBtn block" id="fxBake">${iconSvg('wand')}Correggi per sempre nel PDF</button>
      <div class="hint" style="font-size:12px">“Per sempre” riscrive le pagine raddrizzate e pulite nello spartito: utile prima di condividerlo. Le annotazioni restano al loro posto.</div></div>`,{above:true,id:'fixPop'});
    const upd=()=>{ sc.fix=f; DB.putScore(sc); pageCache.clear(); renderPage(0,{noPrefetch:false}); $$('[data-act="fix"]').forEach(x=>{x.classList.toggle('on',f.on); if(f.on) x.classList.remove('pulse');}); };
    const sw=(id,k)=>{const b=$('#'+id);b.onclick=()=>{f[k]=!f[k];b.classList.toggle('on',f[k]);if(k!=='on'&&!f.on){f.on=true;$('#fxOn').classList.add('on')}upd()}};
    sw('fxOn','on'); sw('fxStr','straighten'); sw('fxSharp','sharpen');
    $('#fxMode').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;f.mode=b.dataset.m;$$('#fxMode button').forEach(x=>x.classList.toggle('on',x===b));f.on=true;$('#fxOn').classList.add('on');upd()};
    const cl=$('#fxClean'); const updD=debounce(upd,250); cl.oninput=()=>{f.clean=+cl.value;$('#fxCv').textContent=cl.value;cl.style.setProperty('--v',cl.value+'%');f.on=true;$('#fxOn').classList.add('on');updD()};
    $('#fxBake').onclick=()=>{ closeLayers(); this.bake(); };
  },
  // Riscrive il PDF con le pagine corrette (una immagine nitida per pagina, stessa misura dell'originale).
  async bake(){
    const sc=ST.cur; const f=fixOf(sc); f.on=true; sc.fix=f;
    try{
      const bytes=await getBytes(sc); const src=await pdfjsLib.getDocument({data:bytes.slice(0)}).promise;
      const out=await PDFLib.PDFDocument.create();
      for(let i=0;i<src.numPages;i++){
        busy(`Correggo la pagina ${i+1} di ${src.numPages}…`); await sleep(10);
        const pg=await src.getPage(i+1); const vp1=pg.getViewport({scale:1}); const k=Math.min(3,2200/Math.max(vp1.width,vp1.height));
        const vp=pg.getViewport({scale:k}); const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
        const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); await pg.render({canvasContext:x,viewport:vp}).promise;
        const fixed=fixPage(c,sc,i); const bw=f.sharpen&&f.mode==='bw';
        const blob=await new Promise(r=>fixed.toBlob(r,bw?'image/png':'image/jpeg',bw?undefined:.88));
        const img=bw?await out.embedPng(await blob.arrayBuffer()):await out.embedJpg(await blob.arrayBuffer());
        const np=out.addPage([vp1.width,vp1.height]); np.drawImage(img,{x:0,y:0,width:vp1.width,height:vp1.height});
      }
      src.destroy();
      sc.fix={...f,on:false}; sc.skew={};
      await replaceBytes(sc,(await out.save()).buffer,null); busy(); toast('Spartito corretto: pagine dritte e nitide salvate nel PDF',3200);
    }catch(e){ busy(); toast('Correzione non riuscita: '+(e.message||e)); }
  },
};
