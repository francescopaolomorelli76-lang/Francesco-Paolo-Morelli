// ================= Migliora pagina: raddrizza, ritaglia i bordi e ingrandisce, pulisce, mette a fuoco =================
// Si applica a una sola pagina o a tutto lo spartito; si può rendere permanente nel PDF.

// Angolo dei righi in gradi (si corregge ruotando di -angolo).
function detectSkew(src){
  const w=Math.min(700,src.width), h=Math.round(src.height*w/src.width);
  const t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d',{willReadFrequently:true});
  x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(src,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data; const px=[], py=[];
  // si ignorano i bordi (ombre del dorso, dita): contano le righe lunghe al centro
  const x0=Math.round(w*.08), x1=Math.round(w*.92);
  for(let y=0;y<h;y++) for(let i=x0;i<x1;i++){ const k=(y*w+i)*4; if(d[k]+d[k+1]+d[k+2]<330){ px.push(i-w/2); py.push(y); } }
  if(px.length<200) return 0;
  const step=Math.max(1,Math.floor(px.length/40000));
  const score=a=>{ const tn=Math.tan(a*Math.PI/180), M=h+w; const bins=new Float32Array(M*2); let s=0;
    for(let j=0;j<px.length;j+=step){ bins[Math.round(py[j]-px[j]*tn)+M]++; }
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
// Zona della musica: dai pentagrammi (gruppi di 5 righe lunghe) si allarga a testi, titoli e indicazioni vicine,
// e si ferma ai bordi del foglio, alle ombre del dorso, alle dita e alle scritte lontane (es. "Scansionato con…").
function contentBox(src){
  const w=Math.min(1000,src.width), h=Math.round(src.height*w/src.width);
  const t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d',{willReadFrequently:true});
  x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(src,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data; const g=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) g[i]=(d[i*4]+d[i*4+1]+d[i*4+2])<510?1:0;
  // 1) righe sottili e lunghe (i righi): orizzontali, con bianco poco sopra e poco sotto.
  //    L'ombra del dorso e le dita sono scure "a macchia" e non passano questo filtro.
  const thin=new Uint8Array(w*h), runMin=Math.round(w*.03);
  for(let y=4;y<h-4;y++){ let st=-1;
    for(let i=0;i<=w;i++){ const on=i<w&&g[y*w+i]&&!(g[(y-4)*w+i]&&g[(y+4)*w+i]);
      if(on){ if(st<0) st=i; } else if(st>=0){ if(i-st>=runMin) for(let k=st;k<i;k++) thin[y*w+k]=1; st=-1; } } }
  const colT=new Float32Array(w), rowT=new Float32Array(h);
  for(let y=0;y<h;y++) for(let i=0;i<w;i++) if(thin[y*w+i]){ colT[i]++; rowT[y]++; }
  const cmax=Math.max(...colT); if(cmax<10) return null;
  // 2) larghezza: colonne dove i righi ci sono davvero (media mobile)
  const sm=new Float32Array(w), R0=Math.round(w*.01);
  for(let i=0;i<w;i++){ let s2=0,n=0; for(let k=Math.max(0,i-R0);k<=Math.min(w-1,i+R0);k++){ s2+=colT[k]; n++; } sm[i]=s2/n; }
  let L=0; while(L<w&&sm[L]<cmax*.35) L++; let R=w-1; while(R>0&&sm[R]<cmax*.35) R--;
  if(R-L<w*.3) return null;
  // distanza tipica tra le righe di un rigo
  const lineRows=[]; for(let y=0;y<h;y++) if(rowT[y]>(R-L)*.25) { if(!lineRows.length||y-lineRows[lineRows.length-1]>2) lineRows.push(y); }
  const dif=lineRows.slice(1).map((v,k)=>v-lineRows[k]).filter(v=>v>=4&&v<=30).sort((a,b)=>a-b);
  const gap=dif.length?dif[Math.floor(dif.length/2)]:9;
  L=Math.max(0,Math.round(L-Math.max(gap*1.8,w*.035))); R=Math.min(w-1,Math.round(R+gap*1.2));
  // a destra si allarga finché c'è musica (ultima battuta, numero di pagina), fermandosi al primo vuoto
  { let empty=0; for(let c=R+1;c<Math.min(w,R+w*.08);c++){ let n=0; for(let y=0;y<h;y+=2) if(g[y*w+c]) n++; if(n>h*.01&&n<h*.35){ R=c; empty=0; } else if(++empty>gap*1.5) break; } R=Math.min(w-1,R+Math.round(gap*.8)); }
  // 3) altezza: blocchi di righe con inchiostro dentro la larghezza della musica;
  //    si tengono i blocchi con righi e quelli vicini (titoli, testo, numeri), non le scritte lontane
  const rowInk=new Float32Array(h);
  for(let y=1;y<h-1;y++){ let n=0; for(let k=L;k<=R;k++){ const q=y*w+k; if(g[q]&&(g[q-1]||g[q+1]||g[q-w]||g[q+w])) n++; } rowInk[y]=n/(R-L+1); }
  const edge=y=>(y<h*.06||y>h*.94)&&rowInk[y]>.4;
  const blocks=[]; let cur=null, empty=0;
  for(let y=0;y<h;y++){ const on=!edge(y)&&rowInk[y]>.008;
    if(on){ if(!cur) cur={a:y,b:y}; else cur.b=y; empty=0; }
    else if(cur&&++empty>gap*1.3){ blocks.push(cur); cur=null; empty=0; } }
  if(cur) blocks.push(cur);
  const music=bk=>{ for(let y=bk.a;y<=bk.b;y++) if(rowT[y]>(R-L)*.25) return true; return false; };
  const keep=new Set(); blocks.forEach((bk,j)=>{ if(music(bk)) keep.add(j); });
  if(!keep.size) return null;
  let changed=true; while(changed){ changed=false; blocks.forEach((bk,j)=>{ if(keep.has(j)) return;
    if(blocks.some((o,k)=>keep.has(k)&&(Math.abs(o.a-bk.b)<gap*2.6||Math.abs(bk.a-o.b)<gap*2.6))){ keep.add(j); changed=true; } }); }
  const kept=blocks.filter((_,j)=>keep.has(j));
  let T=Math.min(...kept.map(b=>b.a)), B=Math.max(...kept.map(b=>b.b));
  const pad=gap*1.1; T=Math.max(0,Math.round(T-pad)); B=Math.min(h-1,Math.round(B+pad));
  const box={l:L/w,t:T/h,r:1-R/w,b:1-B/h};
  if(box.l+box.r<.03&&box.t+box.b<.03) return {l:0,t:0,r:0,b:0};
  return box;
}
// pulizia: fuori dalla musica tutto bianco; dentro, via i puntini isolati (polvere, grana della fotocopia)
function cleanCanvas(c,box,despeckle){
  const W=c.width,H=c.height, x=c.getContext('2d',{willReadFrequently:true});
  if(box){ x.fillStyle='#fff'; const L=box.l*W,T=box.t*H,R=W-box.r*W,B=H-box.b*H;
    x.fillRect(0,0,W,T); x.fillRect(0,B,W,H-B); x.fillRect(0,T,L,B-T); x.fillRect(R,T,W-R,B-T); }
  if(!despeckle) return c;
  const im=x.getImageData(0,0,W,H), d=im.data; const N=W*H; const g=new Uint8Array(N);
  for(let i=0;i<N;i++) g[i]=(d[i*4]+d[i*4+1]+d[i*4+2])<450?1:0;
  for(let y=2;y<H-2;y++) for(let i=2;i<W-2;i++){ const k=y*W+i; if(!g[k]) continue;
    // macchiolina più piccola di 3×3 circondata da bianco
    let ring=0; for(let a=-2;a<=2;a++){ ring+=g[(y-2)*W+i+a]+g[(y+2)*W+i+a]; } for(let a=-1;a<=1;a++){ ring+=g[(y+a)*W+i-2]+g[(y+a)*W+i+2]; }
    if(!ring){ for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const q=((y+a)*W+i+b)*4; d[q]=d[q+1]=d[q+2]=255; } } }
  x.putImageData(im,0,0); return c;
}

// il ritaglio dei bordi è sempre deciso dall'utente (riquadro manuale); automatico solo se lo accende lui
function fixBox(f,a){ return f.box||((f.crop&&f.cropAuto&&a)?a.box:null); }
const FIX_DEF={on:false, straighten:true, crop:false, sharpen:true, mode:'gray', clean:28};
function fixOf(sc){ return Object.assign({},FIX_DEF,sc&&sc.fix||{}); }
function fixOfPage(sc,p){ return Object.assign({},fixOf(sc),sc&&sc.pfix&&sc.pfix[p]||{}); }

// Analisi della pagina (inclinazione e zona della musica) a bassa risoluzione, ricordata nello spartito.
async function autoAnalyze(sc,p,pg,needBox){
  sc.auto=sc.auto||{}; const old=sc.auto[p]; if(old&&(!needBox||old.boxDone)) return old;
  const vp1=pg.getViewport({scale:1}); const k=1000/Math.max(vp1.width,vp1.height); const vp=pg.getViewport({scale:k});
  const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); await pg.render({canvasContext:x,viewport:vp}).promise;
  const skew=old?old.skew:detectSkew(c); let box=null;
  // il ritaglio dei bordi si calcola solo quando serve (è la parte più pesante)
  if(needBox){ const r=rotateCanvas(c,skew); try{ box=contentBox(r); }catch(e){}
    if(box&&((1-box.l-box.r)*(1-box.t-box.b)<.35||box.l+box.r>.6||box.t+box.b>.6)) box=null; } // riquadro sbagliato: meglio non ritagliare
  c.width=c.height=1;
  sc.auto[p]={skew,box:box||(old&&old.box)||{l:0,t:0,r:0,b:0},boxDone:!!needBox||!!(old&&old.boxDone)};
  clearTimeout(sc._autoT); sc._autoT=setTimeout(()=>DB.putScore(sc),1500); return sc.auto[p];
}
// Applica le correzioni alla pagina disegnata (la zona da mostrare la decide drawPageTo con il ritaglio).
function fixPage(off,sc,p){
  const f=fixOfPage(sc,p); if(!f.on) return off;
  const a=sc.auto&&sc.auto[p];
  if(f.straighten){ const s=a?a.skew:detectSkew(off); off=rotateCanvas(off,s); }
  if(f.sharpen){
    const lim=1500, k=Math.min(1,lim/Math.max(off.width,off.height));
    let w=off; if(k<1){ w=document.createElement('canvas'); w.width=Math.round(off.width*k); w.height=Math.round(off.height*k); const x=w.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(off,0,0,w.width,w.height); }
    let e=enhance(w,f.mode==='bw'?'score':'gray',{contrast:25,bright:0,sharp:60,clean:f.clean,ink:55,lo:f.lo,hi:f.hi,expo:f.expo});
    e=cleanCanvas(e,fixBox(f,a),f.clean>0);
    if(k<1){ const c=document.createElement('canvas'); c.width=off.width; c.height=off.height; const x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(e,0,0,c.width,c.height); off=c; } else off=e;
  } else { const bb=fixBox(f,a); if(bb) off=cleanCanvas(off,bb,false); }
  return off;
}

const Fix = {
  scope:'all',
  async check(){
    await new Promise(r=>(window.requestIdleCallback||setTimeout)(r,{timeout:1500}));
    const b=$$('[data-act="fix"]'); if(!ST.cur||!pageCanvas.width) return;
    const f=fixOfPage(ST.cur,ST.page); b.forEach(x=>x.classList.toggle('on',f.on));
    if(f.on){ b.forEach(x=>x.classList.remove('pulse')); return; }
    const sc0=ST.cur; sc0._chk=sc0._chk||{}; let r0=sc0._chk[ST.page];
    if(!r0){ const a0=detectSkew(pageCanvas); let box=null; try{ box=contentBox(pageCanvas); }catch(e){} r0=sc0._chk[ST.page]={a:a0,margin:box?Math.max(box.l+box.r,box.t+box.b):0}; }
    const a=r0.a, margin=r0.margin; ST.cur._last={a,margin};
    const bad=Math.abs(a)>=.5||margin>.16;
    b.forEach(x=>x.classList.toggle('pulse',bad));
    if(bad && !this._told){ this._told=true; toast(Math.abs(a)>=.5?`Pagina storta di ${Math.abs(a).toFixed(1).replace('.',',')}°: tocca Migliora per raddrizzarla e ingrandirla`:'Margini molto grandi: tocca Migliora per ritagliare i bordi e ingrandire la musica',3800); }
  },
  open(el){
    if(!ST.cur) return toast('Apri prima uno spartito');
    const sc=ST.cur, p=ST.page; const scopeAll=this.scope==='all';
    const f=scopeAll?fixOf(sc):fixOfPage(sc,p);
    const last=sc._last||{}; const a=sc.auto&&sc.auto[p]?sc.auto[p].skew:(last.a??0);
    const pop=popover(el,`<h4>Migliora pagina</h4><div style="width:310px;display:flex;flex-direction:column;gap:10px">
      <div class="seg" id="fxScope"><button data-s="page" class="${!scopeAll?'on':''}">Questa pagina (${p+1})</button><button data-s="all" class="${scopeAll?'on':''}">Tutto lo spartito</button></div>
      <div class="hint" style="font-size:13px">${Math.abs(a)>=.1?`Pagina storta di <b>${Math.abs(a).toFixed(1).replace('.',',')}°</b>. `:''}${last.margin>.16?'Margini grandi: si può ingrandire la musica.':''}</div>
      ${switchRow('fxOn','Migliora automaticamente',f.on,scopeAll?'Ogni pagina appena la apri.':'Solo questa pagina.')}
      ${switchRow('fxStr','Raddrizza pagina e righi',f.straighten)}
      ${switchRow('fxCrop','Ritaglia i bordi e ingrandisci',f.crop,'Tiene solo la musica: via margini, ombre del dorso, dita e scritte lontane.')}
      ${switchRow('fxSharp','Pulizia e messa a fuoco',f.sharpen,'Sfondo bianco, puntini tolti, note e righi netti.')}
      <div class="seg" id="fxMode"><button data-m="gray" class="${f.mode!=='bw'?'on':''}">Grigi nitidi</button><button data-m="bw" class="${f.mode==='bw'?'on':''}">Bianco e nero</button></div>
      <div class="sl"><span>Intensità della pulizia<em id="fxCv">${f.clean}</em></span><input type="range" id="fxClean" min="0" max="100" value="${f.clean}" style="--v:${f.clean}%"></div>
      <button class="goldBtn block" id="fxBake">${iconSvg('wand')}Prima / dopo e bordi…</button>
      ${!scopeAll&&sc.pfix&&sc.pfix[p]?`<button class="ghostBtn" id="fxReset">Usa le impostazioni di tutto lo spartito</button>`:''}
      <div class="hint" style="font-size:12px">“Per sempre” riscrive le pagine pulite, dritte e ritagliate nel PDF. Le annotazioni si spostano con la musica.</div></div>`,{above:true,id:'fixPop'});
    const apply=()=>{ if(scopeAll){ sc.fix=f; sc.pfix={}; } else { sc.pfix=sc.pfix||{}; sc.pfix[p]=f; }
      DB.putScore(sc); pageCache.clear(); renderPage(0); $$('[data-act="fix"]').forEach(x=>{x.classList.toggle('on',f.on); if(f.on) x.classList.remove('pulse');}); };
    const sw=(id,k)=>{const b=$('#'+id);b.onclick=()=>{f[k]=!f[k]; if(k==='crop') f.cropAuto=f[k];b.classList.toggle('on',f[k]);if(k!=='on'&&!f.on){f.on=true;$('#fxOn').classList.add('on')}apply()}};
    sw('fxOn','on'); sw('fxStr','straighten'); sw('fxCrop','crop'); sw('fxSharp','sharpen');
    $('#fxScope').onclick=e=>{const b=e.target.closest('[data-s]');if(!b)return;this.scope=b.dataset.s;this.open(el)};
    $('#fxMode').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;f.mode=b.dataset.m;$$('#fxMode button').forEach(x=>x.classList.toggle('on',x===b));f.on=true;$('#fxOn').classList.add('on');apply()};
    const cl=$('#fxClean'); const later=debounce(apply,300); cl.oninput=()=>{f.clean=+cl.value;$('#fxCv').textContent=cl.value;cl.style.setProperty('--v',cl.value+'%');f.on=true;$('#fxOn').classList.add('on');later()};
    $('#fxBake').onclick=()=>{ closeLayers(); this.preview(scopeAll,f); };
    const rs=$('#fxReset'); if(rs) rs.onclick=()=>{ delete sc.pfix[p]; DB.putScore(sc); pageCache.clear(); renderPage(0); closeLayers(); };
  },
  // Riscrive nel PDF le pagine corrette: dritte, pulite e ritagliate (la pagina nuova ha la misura della musica).
  async bake(pages){
    const sc=ST.cur;
    try{
      const bytes=await getBytes(sc); const src=await pdfjsLib.getDocument({data:bytes.slice(0)}).promise;
      const doc=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true});
      const list=pages||[...Array(src.numPages).keys()]; const ann=ST.ann;
      for(const i of list){
        busy(`Correggo la pagina ${i+1}${pages?'':' di '+src.numPages}…`); await sleep(10);
        const f=fixOfPage(sc,i); f.on=true;
        const pg=await src.getPage(i+1); const a=await autoAnalyze(sc,i,pg,f.crop&&f.cropAuto); const vp1=pg.getViewport({scale:1});
        const k=Math.min(3,1700/Math.max(vp1.width,vp1.height)); const vp=pg.getViewport({scale:k});
        const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
        const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); await pg.render({canvasContext:x,viewport:vp}).promise;
        sc.pfix=sc.pfix||{}; const keep=sc.pfix[i]; sc.pfix[i]=f; let fixed=fixPage(c,sc,i); if(keep) sc.pfix[i]=keep; else delete sc.pfix[i];
        const bx=fixBox(f,a)||{l:0,t:0,r:0,b:0};
        const cw=Math.max(1,Math.round(fixed.width*(1-bx.l-bx.r))), ch=Math.max(1,Math.round(fixed.height*(1-bx.t-bx.b)));
        const out=document.createElement('canvas'); out.width=cw; out.height=ch; out.getContext('2d').drawImage(fixed,bx.l*fixed.width,bx.t*fixed.height,cw,ch,0,0,cw,ch);
        const bw=f.sharpen&&f.mode==='bw'; const blob=await new Promise(r=>out.toBlob(r,bw?'image/png':'image/jpeg',bw?undefined:.8));
        const img=bw?await doc.embedPng(await blob.arrayBuffer()):await doc.embedJpg(await blob.arrayBuffer());
        const pw=vp1.width*(1-bx.l-bx.r), ph=vp1.height*(1-bx.t-bx.b);
        c.width=c.height=1; if(fixed!==c) fixed.width=fixed.height=1; out.width=out.height=1;
        doc.removePage(i); const np=doc.insertPage(i,[pw,ph]); np.drawImage(img,{x:0,y:0,width:pw,height:ph});
        // le annotazioni seguono il ritaglio
        const sx=1-bx.l-bx.r, sy=1-bx.t-bx.b;
        if(ann[i]&&(sx<1||sy<1)) ann[i]=ann[i].map(s=>{ if(s.t==='img') return s; const q=JSON.parse(JSON.stringify(s)); const X=v=>(v-bx.l)/sx, Y=v=>(v-bx.t)/sy;
          if(q.pts) q.pts=q.pts.map(p2=>[X(p2[0]),Y(p2[1]),p2[2]]).map(p2=>p2[2]==null?[p2[0],p2[1]]:p2); if(q.a){q.a=[X(q.a[0]),Y(q.a[1])];q.b=[X(q.b[0]),Y(q.b[1])];} if(q.x!=null){q.x=X(q.x);q.y=Y(q.y);}
          if(q.w) q.w/=sx; if(q.size) q.size/=sx; return q; });
        if(sc.auto) delete sc.auto[i]; if(sc.pfix) delete sc.pfix[i];
      }
      src.destroy();
      if(!pages){ sc.fix={...fixOf(sc),on:false}; sc.auto={}; sc.pfix={}; }
      await replaceBytes(sc,(await doc.save()).buffer,ann); busy(); toast(pages?'Pagina corretta e salvata nel PDF':'Spartito corretto: pagine dritte, pulite e ingrandite',3200);
    }catch(e){ busy(); toast('Correzione non riuscita: '+(e.message||e)); }
  },
};

// ---- Anteprima prima/dopo con bordi da regolare, poi "Correggi per sempre" ----
Fix.preview=async function(scopeAll,f0){
  const sc=ST.cur, p=ST.page; const f={...fixOfPage(sc,p),...f0,on:true};
  busy('Preparo l\'anteprima…');
  const pg=await ST.doc.getPage(p+1); const a=await autoAnalyze(sc,p,pg,true);
  const vp1=pg.getViewport({scale:1}); const k=1100/Math.max(vp1.width,vp1.height); const vp=pg.getViewport({scale:k});
  const orig=document.createElement('canvas'); orig.width=Math.round(vp.width); orig.height=Math.round(vp.height);
  const ox=orig.getContext('2d'); ox.fillStyle='#fff'; ox.fillRect(0,0,orig.width,orig.height); await pg.render({canvasContext:ox,viewport:vp}).promise;
  busy();
  let box={...(f.box||{l:0,t:0,r:0,b:0})};   // si parte dalla pagina intera: i bordi li decidi tu (o con "Bordi automatici")
  const make=()=>{ // pagina migliorata senza ritaglio (il ritaglio si vede con il riquadro)
    let c=f.straighten?rotateCanvas(orig,a.skew):orig;
    if(f.sharpen) c=enhance(c,f.mode==='bw'?'score':'gray',{contrast:25,bright:0,sharp:60,clean:f.clean,ink:55,lo:f.lo,hi:f.hi,expo:f.expo});
    return c; };
  let after=make(), view='after';
  const m2=modal('Prima e dopo',`
    <div class="scanStage" id="pvStage"><canvas id="pvC"></canvas><div class="scanOverlay" id="pvOv"></div>
      <div class="seg compare" id="pvView"><button data-v="before">Prima</button><button data-v="after" class="on">Dopo</button><button data-v="result">Risultato</button></div></div>
    <div class="scanCtl">
      <div class="hint" style="font-size:13px">Trascina i quattro angoli d'oro per decidere i bordi: tutto quello che è fuori dal riquadro viene tolto e la musica si ingrandisce. Tieni premuto <b>Prima</b> per confrontare.</div>
      <div class="seg"><button id="pvAuto">${iconSvg('wand')} Bordi automatici</button><button id="pvAll">Tutta la pagina</button>
        <button id="pvBw" class="${f.mode==='bw'?'on':''}">Bianco e nero</button><button id="pvStr" class="${f.straighten?'on':''}">Raddrizza</button><button id="pvSh" class="${f.sharpen?'on':''}">Pulizia</button></div>
      <div class="sl"><span>Intensità della pulizia<em id="pvCv">${f.clean}</em></span><input type="range" id="pvClean" min="0" max="100" value="${f.clean}" style="--v:${f.clean}%"></div>
      <div class="eyebrow">Tono della pagina</div><div class="toneRow" id="pvTone">${['#0c0c0c','#4d4d4d','#8e8e8e','#cfcfcf','#fafafa'].map((c,i)=>`<button data-t="${i}" class="${(f.tone??2)===i?'on':''}" style="background:${c}" aria-label="Tono ${i+1} di 5"></button>`).join('')}</div>
      <div class="sl"><span>Punto nero<em id="pvLov">${f.lo||0}</em></span><input type="range" id="pvLo" min="0" max="60" value="${f.lo||0}" style="--v:${(f.lo||0)/60*100}%"></div>
      <div class="sl"><span>Punto bianco<em id="pvHiv">${f.hi==null?100:f.hi}</em></span><input type="range" id="pvHi" min="40" max="100" value="${f.hi==null?100:f.hi}" style="--v:${((f.hi==null?100:f.hi)-40)/60*100}%"></div>
    </div>`,
    `<button class="ib" id="pvUn" aria-label="Annulla l'ultima modifica" title="Annulla">${iconSvg('undo')}</button><button class="ib" id="pvRe" aria-label="Ripeti" title="Ripeti">${iconSvg('redo')}</button><button class="ghostBtn" data-no>Chiudi</button><button class="ghostBtn" id="pvRead">${iconSvg('eye')}Usa in lettura</button><button class="goldBtn" id="pvBake">${iconSvg('check')}Correggi per sempre${scopeAll?': tutto lo spartito':''}</button>`,
    {full:true,id:'scanModal',sticky:true,eyebrow:`${sc.title} · pagina ${p+1}`,onClose:()=>cleanup()});
  m2.querySelector('.mBody').style.cssText='padding:0;flex:1;overflow:hidden;display:flex;flex-direction:column';
  const C=$('#pvC'), ov=$('#pvOv'), stg=$('#pvStage'); let scale=1, offx=0, offy=0;
  const draw=()=>{
    const src=view==='before'?orig:after;
    if(view==='result'){ const cw=Math.round(after.width*(1-box.l-box.r)), ch=Math.round(after.height*(1-box.t-box.b));
      C.width=Math.max(1,cw); C.height=Math.max(1,ch); const x=C.getContext('2d'); x.drawImage(after,box.l*after.width,box.t*after.height,cw,ch,0,0,cw,ch);
      if(f.clean>0) cleanCanvas(C,null,true); }
    else { C.width=src.width; C.height=src.height; C.getContext('2d').drawImage(src,0,0); }
    const W=stg.clientWidth-24, H=stg.clientHeight-24; scale=Math.min(W/C.width,H/C.height);
    C.style.width=C.width*scale+'px'; C.style.height=C.height*scale+'px';
    requestAnimationFrame(overlay);
  };
  const overlay=()=>{
    if(view==='result'){ ov.innerHTML=''; return; }
    const sr=stg.getBoundingClientRect(), cr=C.getBoundingClientRect(); offx=cr.left-sr.left; offy=cr.top-sr.top; const w=cr.width,h=cr.height;
    const place=()=>{ const L=offx+box.l*w, T=offy+box.t*h, R=offx+w-box.r*w, B=offy+h-box.b*h;
      ov.querySelector('#pvDim').setAttribute('d',`M0 0H${sr.width}V${sr.height}H0Z M${L} ${T}H${R}V${B}H${L}Z`); const rc=ov.querySelector('#pvRect'); rc.setAttribute('x',L); rc.setAttribute('y',T); rc.setAttribute('width',R-L); rc.setAttribute('height',B-T);
      const pts={lt:[L,T],rt:[R,T],rb:[R,B],lb:[L,B],t:[(L+R)/2,T],r:[R,(T+B)/2],b:[(L+R)/2,B],l:[L,(T+B)/2]};
      for(const q in pts){ const el=ov.querySelector(`[data-h="${q}"]`); el.style.left=pts[q][0]+'px'; el.style.top=pts[q][1]+'px'; } };
    ov.innerHTML='<svg><path id="pvDim" fill="rgba(0,0,0,.5)" fill-rule="evenodd"/><rect id="pvRect" fill="rgba(235,90,70,.14)" stroke="#f2d382" stroke-width="2.5"/></svg>'
      +['lt','rt','rb','lb'].map(q=>`<div class="handle" data-h="${q}"></div>`).join('')+['t','r','b','l'].map(q=>`<div class="handle edge" data-h="${q}"></div>`).join('');
    place(); overlay.place=place; overlay.w=w; overlay.h=h; };
  // trascinamento relativo: il bordo si sposta di quanto muovi il dito, senza saltare; le maniglie non vengono ricreate durante il gesto
  ov.onpointerdown=e=>{ const hd=e.target.closest('[data-h]'); if(!hd||view==='result') return; e.preventDefault(); const k2=hd.dataset.h; try{ hd.setPointerCapture(e.pointerId); }catch(_){}
    const b0={...box}, sx=e.clientX, sy=e.clientY, w=overlay.w, h=overlay.h, pid=e.pointerId;
    const mv=ev=>{ if(ev.pointerId!==pid) return; ev.preventDefault(); const dx=(ev.clientX-sx)/w, dy=(ev.clientY-sy)/h, mn=.08;
      if(k2.includes('l')) box.l=clamp(b0.l+dx,0,1-box.r-mn); if(k2.includes('r')) box.r=clamp(b0.r-dx,0,1-box.l-mn);
      if(k2.includes('t')) box.t=clamp(b0.t+dy,0,1-box.b-mn); if(k2.includes('b')) box.b=clamp(b0.b-dy,0,1-box.t-mn); overlay.place(); };
    const up=ev=>{ if(ev.pointerId!==pid) return; window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); if(view==='result') draw(); };
    window.addEventListener('pointermove',mv,{passive:false}); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up); };
  const vbtn=$('#pvView');
  vbtn.onclick=e=>{ const b=e.target.closest('[data-v]'); if(!b) return; view=b.dataset.v; vbtn.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); draw(); };
  const pb=vbtn.querySelector('[data-v="before"]'); pb.onpointerdown=()=>{ if(view!=='before'){ pb._back=view; view='before'; draw(); } };
  pb.onpointerup=pb.onpointerleave=()=>{ if(pb._back){ view=pb._back; pb._back=null; draw(); } };
  const redo=()=>{ busy('Aggiorno…'); setTimeout(()=>{ try{ if(after&&after!==orig){ after.width=after.height=1; } }catch(e){} after=make(); busy(); draw(); },20); };
  $('#pvAuto').onclick=()=>{ box={...a.box}; overlay(); if(view==='result') draw(); };
  $('#pvAll').onclick=()=>{ box={l:0,t:0,r:0,b:0}; overlay(); if(view==='result') draw(); };
  const tg=(id,fn)=>{ const b=$('#'+id); b.onclick=()=>{ fn(); b.classList.toggle('on'); redo(); }; };
  tg('pvBw',()=>f.mode=f.mode==='bw'?'gray':'bw'); tg('pvStr',()=>f.straighten=!f.straighten); tg('pvSh',()=>f.sharpen=!f.sharpen);
  const cl=$('#pvClean'), later=debounce(redo,450); cl.oninput=()=>{ f.clean=+cl.value; $('#pvCv').textContent=cl.value; cl.style.setProperty('--v',cl.value+'%'); later(); };
  // Annulla / Ripeti per bordi e impostazioni, tono e livelli
  const EXPO=[1.7,1.3,1,.8,.62], keys=['mode','straighten','sharpen','clean','lo','hi','expo','tone'];
  const state=()=>JSON.stringify({box,f:Object.fromEntries(keys.map(k=>[k,f[k]]))}); const hist=[], fut=[];
  const upUR=()=>{ $('#pvUn').classList.toggle('dis',!hist.length); $('#pvRe').classList.toggle('dis',!fut.length); };
  const snap=()=>{ const t=state(); if(hist[hist.length-1]!==t){ hist.push(t); if(hist.length>80) hist.shift(); } fut.splice(0); upUR(); };
  const sync=()=>{ $('#pvBw').classList.toggle('on',f.mode==='bw'); $('#pvStr').classList.toggle('on',!!f.straighten); $('#pvSh').classList.toggle('on',!!f.sharpen);
    const setS=(id,vid,v,min,max)=>{ const i=$('#'+id); i.value=v; $('#'+vid).textContent=v; i.style.setProperty('--v',(v-min)/(max-min)*100+'%'); };
    setS('pvClean','pvCv',f.clean,0,100); setS('pvLo','pvLov',f.lo||0,0,60); setS('pvHi','pvHiv',f.hi==null?100:f.hi,40,100);
    $$('#pvTone button').forEach(x=>x.classList.toggle('on',+x.dataset.t===(f.tone??2))); };
  const restore=t=>{ const o=JSON.parse(t); box=o.box; keys.forEach(k=>{ f[k]=o.f[k]; }); sync(); redo(); overlay(); };
  $('#pvUn').onclick=()=>{ if(!hist.length) return; fut.push(state()); restore(hist.pop()); upUR(); };
  $('#pvRe').onclick=()=>{ if(!fut.length) return; hist.push(state()); restore(fut.pop()); upUR(); };
  m2.querySelector('.scanCtl').addEventListener('pointerdown',snap,true);
  ov.addEventListener('pointerdown',e=>{ if(e.target.closest('[data-h]')) snap(); },true);
  $('#pvTone').onclick=e=>{ const b=e.target.closest('[data-t]'); if(!b) return; f.tone=+b.dataset.t; f.expo=EXPO[f.tone]; sync(); redo(); };
  const lvl=(id,vid,key,min,max)=>{ const i=$('#'+id), l2=debounce(redo,250); i.oninput=()=>{ f[key]=+i.value; $('#'+vid).textContent=i.value; i.style.setProperty('--v',(i.value-min)/(max-min)*100+'%'); l2(); }; };
  lvl('pvLo','pvLov','lo',0,60); lvl('pvHi','pvHiv','hi',40,100); upUR();
  const save=()=>{ const crop=box.l+box.r+box.t+box.b>0.001; const ff={...f,crop,box:crop?{...box}:undefined};
    if(scopeAll){ const {box:_b,...rest}=ff; sc.fix=rest; sc.pfix={}; sc.pfix[p]=ff; } else { sc.pfix=sc.pfix||{}; sc.pfix[p]=ff; } DB.putScore(sc); };
  const cleanup=()=>{ try{ orig.width=orig.height=1; after.width=after.height=1; C.width=C.height=1; }catch(e){} };
  m2.querySelector('[data-no]').onclick=()=>{ cleanup(); closeLayers(); };
  $('#pvRead').onclick=()=>{ save(); cleanup(); closeLayers(); pageCache.clear(); renderPage(0); toast('Applicato in lettura: puoi renderlo definitivo quando vuoi',2600); };
  $('#pvBake').onclick=()=>{ save(); cleanup(); closeLayers(); Fix.bake(scopeAll?null:[p]); };
  this._rsz=debounce(draw,120); addEventListener('resize',this._rsz);
  setTimeout(draw,30);
};
