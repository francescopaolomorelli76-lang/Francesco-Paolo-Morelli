// ================= Inserisci pagine · Scanner · Riordina =================
const Insert = {
  pos:'after', target:'insert',
  posIndex(){ const n=ST.cur?ST.cur.pages:0; return ({before:ST.page, after:ST.page+1, start:0, end:n})[this.pos]; },
  posLabel(){ return ({before:`prima di p. ${ST.page+1}`, after:`dopo p. ${ST.page+1}`, start:'all\'inizio', end:'alla fine'})[this.pos]; },
  open(){
    if(!ST.cur){ return this.pickPdf('new'); }
    const m2=modal('Inserisci pagine',`
      <div class="hint">In <b>${esc(ST.cur.title)}</b>, ora a pagina <b>${ST.page+1}</b> di ${ST.cur.pages}. Scegli da dove prendere le nuove pagine:</div>
      <div class="srcCards">
        <button class="srcCard hero" data-src="cam">${iconSvg('camera')}<b>Scatta una foto</b><span>Ritaglia la zona, raddrizza e migliora note e dettagli.</span></button>
        <button class="srcCard" data-src="img">${iconSvg('image')}<b>Foto dalla libreria</b><span>Una o più immagini già sull'iPad.</span></button>
        <button class="srcCard" data-src="pdf">${iconSvg('file')}<b>Da un altro PDF</b><span>Tutte le pagine o solo alcune.</span></button>
        <button class="srcCard" data-src="staff">${iconSvg('staff')}<b>Pentagrammata</b><span>Pagina vuota con 12 righi per scrivere a mano.</span></button>
        <button class="srcCard" data-src="blank">${iconSvg('plusDoc')}<b>Pagina bianca</b><span>Per appunti, testi, diteggiature.</span></button>
      </div>
      <div class="field"><label>Dove inserirle</label><div class="seg" id="insPos">
        ${[['before','Prima di questa'],['after','Dopo questa'],['start','All\'inizio'],['end','Alla fine']].map(([k,l])=>`<button data-pos="${k}" class="${this.pos===k?'on':''}">${l}</button>`).join('')}</div></div>`,
      null,{eyebrow:'Spartito aperto'});
    m2.querySelector('#insPos').onclick=e=>{const b=e.target.closest('[data-pos]');if(!b)return;this.pos=b.dataset.pos;m2.querySelectorAll('#insPos button').forEach(x=>x.classList.toggle('on',x===b))};
    m2.querySelector('.srcCards').onclick=e=>{const b=e.target.closest('[data-src]');if(!b)return;const s=b.dataset.src;
      if(s==='cam') this.fromPhoto('insert'); if(s==='img') this.fromPhoto('insert',true); if(s==='pdf') this.pickPdf('insert');
      if(s==='staff') this.addTemplate('staff'); if(s==='blank') this.addTemplate('blank'); };
  },

  // ---- PDF ----
  pickPdf(target){
    this.target=target; const f=$('#filePdf'); f.value='';
    f.onchange=async()=>{ const files=[...f.files]; if(!files.length) return;
      if(target==='new'){ busy('Importo…'); let last=null; for(const file of files){ try{ last=await addScore(await file.arrayBuffer(),{title:file.name.replace(/\.pdf$/i,'').replace(/[_]+/g,' ')}); }catch(e){ toast('“'+file.name+'” non è un PDF leggibile'); } } busy(); renderLibrary(); if(last){ openScore(last.id); toast(files.length>1?files.length+' spartiti importati':'Spartito importato'); } return; }
      this.choosePages(await files[0].arrayBuffer(), files[0].name);
    };
    f.click();
  },
  async choosePages(bytes,name){
    let n=0; try{ const d=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true}); n=d.getPageCount(); }catch(e){ return toast('Questo PDF non si apre'); }
    const m2=modal('Pagine da inserire',`<div class="hint"><b>${esc(name)}</b> ha ${n} pagine. Le inserisco ${this.posLabel()}.</div>
      <div class="field"><label for="pgRange">Quali pagine</label><input id="pgRange" value="1-${n}" placeholder="es. 1-3, 5, 8"></div>`,
      `<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-ok>${iconSvg('plusDoc')}Inserisci</button>`);
    m2.querySelector('[data-no]').onclick=closeLayers;
    m2.querySelector('[data-ok]').onclick=async()=>{
      const idx=parseRange($('#pgRange').value,n); if(!idx.length) return toast('Scrivi pagine valide, es. 1-3, 5');
      closeLayers(); busy('Inserisco '+idx.length+' pagine…');
      try{ await this.insertPages(async(doc,at)=>{ const src=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true}); const pages=await doc.copyPages(src,idx); pages.forEach((p,k)=>doc.insertPage(at+k,p)); return pages.length; }); }
      catch(e){ busy(); toast('Inserimento non riuscito'); }
    };
  },

  // Esegue l'inserimento nel PDF aperto e sposta le annotazioni.
  async insertPages(builder){
    const sc=ST.cur; const at=this.posIndex();
    const doc=await PDFLib.PDFDocument.load(sc.bytes,{ignoreEncryption:true});
    const count=await builder(doc,at);
    const bytes=(await doc.save()).buffer;
    const ann={}; for(const k in ST.ann){ const i=+k; ann[i>=at?i+count:i]=ST.ann[k]; }
    (sc.bookmarks||[]).forEach(b=>{ if(b.p>=at) b.p+=count; });
    ST.page=at; await replaceBytes(sc,bytes,ann); busy(); closeLayers();
    toast(`${count} ${count===1?'pagina inserita':'pagine inserite'} · ora sei a p. ${at+1}`);
  },

  // ---- Modelli ----
  async addTemplate(kind){
    if(!ST.cur) return this.templatesNew();
    busy('Creo la pagina…'); try{ await this.insertPages(async(doc,at)=>{ drawTemplate(doc.insertPage(at,[595,842]),kind); return 1; }); }catch(e){ busy(); toast('Non riuscito'); }
  },
  async templatesNew(){
    const m2=modal('Modelli',`<div class="srcCards">
      <button class="srcCard hero" data-t="staff">${iconSvg('staff')}<b>Pentagrammata</b><span>12 righi per pagina</span></button>
      <button class="srcCard" data-t="piano">${iconSvg('piano')}<b>Pianoforte</b><span>6 sistemi con graffa</span></button>
      <button class="srcCard" data-t="choir">${iconSvg('list')}<b>Coro SATB</b><span>3 sistemi da 4 righi</span></button>
      <button class="srcCard" data-t="blank">${iconSvg('plusDoc')}<b>Bianca</b><span>Per appunti</span></button></div>
      <div class="field"><label for="tplN">Numero di pagine</label><input id="tplN" type="number" min="1" max="50" value="4"></div>`,null,{eyebrow:'Nuovo spartito'});
    m2.querySelector('.srcCards').onclick=async e=>{const b=e.target.closest('[data-t]');if(!b)return;const n=clamp(+$('#tplN').value||1,1,50);closeLayers();busy('Creo lo spartito…');
      const doc=await PDFLib.PDFDocument.create();for(let i=0;i<n;i++)drawTemplate(doc.addPage([595,842]),b.dataset.t);
      const sc=await addScore((await doc.save()).buffer,{title:({staff:'Pentagrammata',piano:'Pianoforte',choir:'Coro SATB',blank:'Appunti'})[b.dataset.t]+' · '+new Date().toLocaleDateString('it-IT'),genre:'Manoscritto'});
      busy();renderLibrary();openScore(sc.id);toast('Pronto: annota con la matita');};
  },

  // ---- Foto → pagina ----
  fromPhoto(target,library){
    this.target=target;
    if(target==='insert' && !ST.cur) this.target='new';
    const f=library?$('#fileImg'):$('#fileCam'); f.value='';
    f.onchange=async()=>{ const files=[...f.files]; if(!files.length) return; Scan.start(files,this.target); };
    f.click();
  },
};
function parseRange(str,n){const out=[];str.split(/[,;\s]+/).forEach(part=>{if(!part)return;const m3=part.match(/^(\d+)\s*-\s*(\d+)$/);if(m3){let a=+m3[1],b=+m3[2];if(a>b)[a,b]=[b,a];for(let i=a;i<=b;i++)if(i>=1&&i<=n)out.push(i-1)}else if(/^\d+$/.test(part)){const i=+part;if(i>=1&&i<=n)out.push(i-1)}});return out}
function drawTemplate(pg,kind){
  const {rgb}=PDFLib; const c=rgb(.15,.15,.15); const L=48,R=595-40;
  const staff=(y)=>{for(let l=0;l<5;l++)pg.drawLine({start:{x:L,y:y-l*7},end:{x:R,y:y-l*7},thickness:.6,color:c})};
  if(kind==='staff'){ for(let i=0;i<12;i++) staff(790-i*62); }
  if(kind==='piano'){ for(let i=0;i<6;i++){const y=785-i*128;staff(y);staff(y-56);pg.drawLine({start:{x:L,y},end:{x:L,y:y-84},thickness:1,color:c});pg.drawLine({start:{x:R,y},end:{x:R,y:y-84},thickness:1,color:c})} }
  if(kind==='choir'){ for(let i=0;i<3;i++){const y=790-i*250;for(let s=0;s<4;s++)staff(y-s*52);pg.drawLine({start:{x:L-6,y},end:{x:L-6,y:y-184},thickness:2.5,color:c})} }
}

// ---------------- Scanner ----------------
const Scan = {
  files:[], idx:0, target:'new', src:null, quad:null, rot:0, step:1, out:[],
  mode:'score', p:{contrast:30, bright:0, sharp:45, clean:50, ink:45},
  async start(files,target){ this.files=files; this.idx=0; this.target=target; this.out=[]; await this.load(); this.ui(); },
  async load(){
    const file=this.files[this.idx]; busy('Apro la foto…');
    try{
      const bmp=await createImageBitmap(file);
      const max=2800, s=Math.min(1,max/Math.max(bmp.width,bmp.height));
      const c=document.createElement('canvas'); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
      c.getContext('2d').drawImage(bmp,0,0,c.width,c.height); bmp.close&&bmp.close();
      this.src=c; this.rot=0; this.quad=autoQuad(c); this.step=1;
    }catch(e){ busy(); toast('Non riesco ad aprire questa immagine'); throw e; }
    busy();
  },
  ui(){
    const m2=modal('Scansione',`
      <div class="scanStage" id="scStage"><canvas id="scCanvas"></canvas><div class="scanOverlay" id="scOv"></div><div class="loupe" id="scLoupe"><canvas width="240" height="240"></canvas></div>
        <button class="ghostBtn compare" id="scCmp" hidden>${iconSvg('eye')}Tieni premuto: originale</button></div>
      <div class="scanCtl">
        <div class="scanSteps"><button data-st="1">1 · Ritaglia la zona</button><button data-st="2">2 · Migliora segni e dettagli</button></div>
        <div id="scTools"></div>
      </div>`,
      `<div class="scanQueue" id="scQueue" style="flex:1"></div><button class="ghostBtn" id="scMore">${iconSvg('camera')}Altra foto</button><button class="goldBtn" id="scAdd">${iconSvg('plusDoc')}<span id="scAddL">Aggiungi pagina</span></button>`,
      {full:true,id:'scanModal',sticky:true,eyebrow:this.target==='insert'?`Nuove pagine in “${ST.cur.title}” · ${Insert.posLabel()}`:'Nuovo spartito da foto'});
    m2.querySelector('.scanSteps').onclick=e=>{const b=e.target.closest('[data-st]');if(b)this.go(+b.dataset.st)};
    $('#scMore').onclick=()=>this.more();
    $('#scAdd').onclick=()=>this.commit();
    const cmp=$('#scCmp'); const show=o=>{this.showOrig=o;this.drawResult()};
    cmp.onpointerdown=()=>show(true); cmp.onpointerup=cmp.onpointerleave=()=>show(false);
    this.go(1); this.updQueue();
    this._rs=debounce(()=>this.step===1?this.drawCrop():this.drawResult(),120); addEventListener('resize',this._rs);
  },
  go(st){
    this.step=st; $$('.scanSteps button').forEach(b=>b.classList.toggle('on',+b.dataset.st===st));
    $('#scCmp').hidden=st!==2; $('#scAddL').textContent=st===1?'Avanti: migliora':'Aggiungi pagina';
    const T=$('#scTools');
    if(st===1){
      T.innerHTML=`<div class="seg"><button id="scRot">${iconSvg('rotate')} Ruota</button><button id="scAuto">${iconSvg('wand')} Rileva il foglio</button><button id="scAll">Tutta la foto</button></div>
        <div class="hint" style="font-size:13px">Trascina i quattro angoli d'oro sui bordi della musica: la pagina verrà raddrizzata.</div>`;
      $('#scRot').onclick=()=>{this.rotate();this.drawCrop()}; $('#scAuto').onclick=()=>{this.quad=autoQuad(this.src);this.drawCrop()};
      $('#scAll').onclick=()=>{const w=this.src.width,h=this.src.height;this.quad=[[0,0],[w,0],[w,h],[0,h]];this.drawCrop()};
      this.drawCrop();
    } else {
      const modes=[['score','Partitura B/N'],['gray','Grigi nitidi'],['color','Colore vivo'],['orig','Originale']];
      const sl=(k,l,min,max)=>`<div class="sl"><span>${l}<em id="sv-${k}">${this.p[k]}</em></span><input type="range" id="sp-${k}" min="${min}" max="${max}" value="${this.p[k]}" style="--v:${(this.p[k]-min)/(max-min)*100}%"></div>`;
      T.innerHTML=`<div class="seg" id="scModes">${modes.map(([k,l])=>`<button data-m="${k}" class="${this.mode===k?'on':''}">${l}</button>`).join('')}</div>
        <div class="sliders">${sl('clean','Pulizia sfondo',0,100)}${sl('ink','Intensità segni',0,100)}${sl('sharp','Nitidezza dettagli',0,100)}${sl('contrast','Contrasto',-50,100)}</div>`;
      $('#scModes').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;this.mode=b.dataset.m;$$('#scModes button').forEach(x=>x.classList.toggle('on',x===b));this.process(false)};
      const upd=debounce(()=>this.process(false),90);
      ['clean','ink','sharp','contrast'].forEach(k=>{const i=$('#sp-'+k);i.oninput=()=>{this.p[k]=+i.value;$('#sv-'+k).textContent=i.value;i.style.setProperty('--v',(i.value-i.min)/(i.max-i.min)*100+'%');upd()}});
      this.process(false);
    }
  },
  rotate(){ const s=this.src; const c=document.createElement('canvas'); c.width=s.height; c.height=s.width; const x=c.getContext('2d'); x.translate(c.width,0); x.rotate(Math.PI/2); x.drawImage(s,0,0); this.quad=this.quad.map(([qx,qy])=>[s.height-qy,qx]); this.quad=[this.quad[3],this.quad[0],this.quad[1],this.quad[2]]; this.src=c; },
  fitCanvas(c,w,h){ const st=$('#scStage'); const W=st.clientWidth-24,H=st.clientHeight-24; const s=Math.min(W/w,H/h,1.5); c.style.width=(w*s)+'px'; c.style.height=(h*s)+'px'; return s; },
  drawCrop(){
    const c=$('#scCanvas'); if(!c) return; const s=this.src; const ps=Math.min(1,1400/Math.max(s.width,s.height));
    c.width=Math.round(s.width*ps); c.height=Math.round(s.height*ps); c.getContext('2d').drawImage(s,0,0,c.width,c.height);
    const k=this.fitCanvas(c,c.width,c.height)*ps; this.viewK=k;
    const ov=$('#scOv'); const st=$('#scStage').getBoundingClientRect(), cr=c.getBoundingClientRect(); const ox=cr.left-st.left, oy=cr.top-st.top;
    const P2=()=>this.quad.map(([x,y])=>[ox+x*k,oy+y*k]);
    const draw=()=>{const p=P2();ov.innerHTML=`<svg><path d="M0 0H${st.width}V${st.height}H0Z M${p.map(q=>q.join(' ')).join(' L')} Z" fill="rgba(0,0,0,.55)" fill-rule="evenodd"/><polygon points="${p.map(q=>q.join(',')).join(' ')}" fill="none" stroke="#f2d382" stroke-width="2.5"/></svg>`+p.map((q,i)=>`<div class="handle" data-h="${i}" style="left:${q[0]}px;top:${q[1]}px"></div>`).join('')};
    draw();
    const loupe=$('#scLoupe'), lc=loupe.querySelector('canvas').getContext('2d');
    ov.onpointerdown=e=>{const h=e.target.closest('[data-h]');if(!h)return;const i=+h.dataset.h;h.setPointerCapture(e.pointerId);loupe.classList.add('on');
      const mv=ev=>{const x=clamp((ev.clientX-st.left-ox)/k,0,s.width),y=clamp((ev.clientY-st.top-oy)/k,0,s.height);this.quad[i]=[x,y];
        const p=P2()[i]; h.style.left=p[0]+'px';h.style.top=p[1]+'px'; ov.querySelector('svg').outerHTML; const q=P2(); ov.querySelector('path').setAttribute('d',`M0 0H${st.width}V${st.height}H0Z M${q.map(z=>z.join(' ')).join(' L')} Z`); ov.querySelector('polygon').setAttribute('points',q.map(z=>z.join(',')).join(' '));
        loupe.style.left=clamp(p[0]-60,0,st.width-120)+'px'; loupe.style.top=Math.max(0,p[1]-150)+'px'; lc.fillStyle='#000';lc.fillRect(0,0,240,240); lc.drawImage(s,x-60,y-60,120,120,0,0,240,240); lc.strokeStyle='#f2d382';lc.lineWidth=2;lc.beginPath();lc.moveTo(120,90);lc.lineTo(120,150);lc.moveTo(90,120);lc.lineTo(150,120);lc.stroke();};
      const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);loupe.classList.remove('on')};
      h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);mv(e)};
  },
  process(full){
    const maxSide=full?2400:1100;
    const warped=warpQuad(this.src,this.quad,maxSide);
    this.warped=warped; this.result=this.mode==='orig'?warped:enhance(warped,this.mode,this.p);
    if(!full) this.drawResult(); return this.result;
  },
  drawResult(){
    const c=$('#scCanvas'); if(!c||!this.result) return; $('#scOv').innerHTML='';
    const img=this.showOrig?this.warped:this.result; c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0); this.fitCanvas(c,img.width,img.height);
  },
  async commit(){
    if(this.step===1) return this.go(2);
    busy('Miglioro la pagina…'); await sleep(30);
    const res=this.process(true); const isBW=this.mode==='score';
    const blob=await new Promise(r=>res.toBlob(r,isBW?'image/png':'image/jpeg',isBW?undefined:.9));
    this.out.push({blob,w:res.width,h:res.height,png:isBW,url:URL.createObjectURL(blob)}); busy();
    this.updQueue();
    const left=this.files.length-1-this.idx;
    if(left>0){ this.idx++; await this.load(); this.go(1); toast(`Pagina pronta · ne mancano ${left}`); return; }
    this.askFinish();
  },
  updQueue(){ const q=$('#scQueue'); if(q) q.innerHTML=this.out.map(o=>`<div class="q"><img src="${o.url}" alt=""></div>`).join('')+(this.out.length?`<span class="hint" style="align-self:center">${this.out.length} pronte</span>`:''); },
  askFinish(){
    const n=this.out.length;
    const b=document.createElement('div'); b.className='pop'; b.style.cssText='left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;width:min(420px,calc(100% - 32px))';
    b.innerHTML=`<h4>${n} ${n===1?'pagina pronta':'pagine pronte'}</h4><div class="hint" style="text-align:center;margin-bottom:14px">${this.target==='insert'?`Le inserisco in “${esc(ST.cur.title)}” ${Insert.posLabel()}.`:'Creo un nuovo spartito in libreria.'}</div>
      <div style="display:flex;flex-direction:column;gap:10px"><button class="goldBtn block" id="fnOk">${iconSvg('check')}${this.target==='insert'?'Inserisci nello spartito':'Crea lo spartito'}</button><button class="ghostBtn" id="fnMore">${iconSvg('camera')}Scatta un'altra pagina</button></div>`;
    layerRoot.appendChild(b);
    $('#fnMore').onclick=()=>{b.remove();this.more()};
    $('#fnOk').onclick=()=>{b.remove();this.finish()};
  },
  more(){ const f=$('#fileCam'); f.value=''; f.onchange=async()=>{const files=[...f.files];if(!files.length)return;this.files.push(...files);this.idx=this.files.length-files.length;await this.load();this.go(1)}; f.click(); },
  async finish(){
    if(!this.out.length){ if(this.step===2) await this.commit(); if(!this.out.length) return; }
    busy('Creo le pagine…');
    const build=async(doc,at)=>{ for(let k=0;k<this.out.length;k++){ const o=this.out[k]; const buf=await o.blob.arrayBuffer(); const img=o.png?await doc.embedPng(buf):await doc.embedJpg(buf);
        const W=595, H=Math.round(595*o.h/o.w); const pg=at==null?doc.addPage([W,H]):doc.insertPage(at+k,[W,H]); pg.drawImage(img,{x:0,y:0,width:W,height:H}); } return this.out.length; };
    try{
      if(this.target==='insert' && ST.cur){ await Insert.insertPages(build); }
      else { const doc=await PDFLib.PDFDocument.create(); await build(doc,null); const sc=await addScore((await doc.save()).buffer,{title:'Scansione '+new Date().toLocaleString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),tags:['scansione']}); busy(); closeLayers(); renderLibrary(); await openScore(sc.id); toast('Spartito creato: rinominalo da Informazioni'); }
    }catch(e){ busy(); toast('Non riuscito: riprova'); }
    this.out.forEach(o=>URL.revokeObjectURL(o.url)); this.out=[]; removeEventListener('resize',this._rs);
  },
};

// Trova il foglio (più chiaro dello sfondo) e propone i 4 angoli.
function autoQuad(c){
  const w=c.width,h=c.height, s=Math.min(1,260/Math.max(w,h)), sw=Math.max(8,Math.round(w*s)), sh=Math.max(8,Math.round(h*s));
  const t=document.createElement('canvas'); t.width=sw; t.height=sh; const x=t.getContext('2d',{willReadFrequently:true}); x.drawImage(c,0,0,sw,sh);
  const d=x.getImageData(0,0,sw,sh).data; const g=new Uint8Array(sw*sh); const hist=new Array(256).fill(0);
  for(let i=0;i<sw*sh;i++){const v=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)|0;g[i]=v;hist[v]++}
  // soglia di Otsu
  let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sB=0,wB=0,best=0,thr=128;const tot=sw*sh;
  for(let i=0;i<256;i++){wB+=hist[i];if(!wB)continue;const wF=tot-wB;if(!wF)break;sB+=i*hist[i];const mB=sB/wB,mF=(sum-sB)/wF;const v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;thr=i}}
  const inset=[[w*.03,h*.03],[w*.97,h*.03],[w*.97,h*.97],[w*.03,h*.97]];
  let cnt=0; const cs=[[1e9,null],[1e9,null],[1e9,null],[1e9,null]];
  for(let yy=1;yy<sh-1;yy++)for(let xx=1;xx<sw-1;xx++){const i=yy*sw+xx;if(g[i]<=thr||g[i-1]<=thr||g[i+1]<=thr||g[i-sw]<=thr||g[i+sw]<=thr)continue;cnt++;
    const sc=[xx+yy,(sw-xx)+yy,(sw-xx)+(sh-yy),xx+(sh-yy)];for(let k=0;k<4;k++)if(sc[k]<cs[k][0])cs[k]=[sc[k],[xx/s,yy/s]]}
  if(cnt<tot*.15||cnt>tot*.97||cs.some(z=>!z[1])) return inset;
  const q=cs.map(z=>z[1]); const area=Math.abs((q[0][0]*q[1][1]-q[1][0]*q[0][1])+(q[1][0]*q[2][1]-q[2][0]*q[1][1])+(q[2][0]*q[3][1]-q[3][0]*q[2][1])+(q[3][0]*q[0][1]-q[0][0]*q[3][1]))/2;
  return area<w*h*.15?inset:q;
}
// Raddrizza il quadrilatero in un rettangolo (omografia + interpolazione bilineare).
function warpQuad(src,q,maxSide){
  const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  let W=Math.max(d(q[0],q[1]),d(q[3],q[2])), H=Math.max(d(q[0],q[3]),d(q[1],q[2]));
  const s=Math.min(1.6,maxSide/Math.max(W,H)); W=Math.max(8,Math.round(W*s)); H=Math.max(8,Math.round(H*s));
  const Hm=homography([[0,0],[W,0],[W,H],[0,H]],q);
  const sw=src.width, sh=src.height; const sd=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,sw,sh).data;
  const out=document.createElement('canvas'); out.width=W; out.height=H; const ox=out.getContext('2d'); const od=ox.createImageData(W,H); const o=od.data;
  const [a,b,c,dd,e,f,g,h]=Hm;
  for(let y=0;y<H;y++){ for(let x=0;x<W;x++){
    const den=g*x+h*y+1; let u=(a*x+b*y+c)/den, v=(dd*x+e*y+f)/den;
    u=clamp(u,0,sw-1.001); v=clamp(v,0,sh-1.001); const x0=u|0,y0=v|0,fx=u-x0,fy=v-y0; const i00=(y0*sw+x0)*4,i10=i00+4,i01=i00+sw*4,i11=i01+4; const k=(y*W+x)*4;
    for(let ch=0;ch<3;ch++) o[k+ch]=(sd[i00+ch]*(1-fx)+sd[i10+ch]*fx)*(1-fy)+(sd[i01+ch]*(1-fx)+sd[i11+ch]*fx)*fy;
    o[k+3]=255; } }
  ox.putImageData(od,0,0); return out;
}
function homography(from,to){
  const A=[],B=[];
  for(let i=0;i<4;i++){const [x,y]=from[i],[u,v]=to[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v)}
  for(let i=0;i<8;i++){let mx=i;for(let r=i+1;r<8;r++)if(Math.abs(A[r][i])>Math.abs(A[mx][i]))mx=r;[A[i],A[mx]]=[A[mx],A[i]];[B[i],B[mx]]=[B[mx],B[i]];
    for(let r=i+1;r<8;r++){const f=A[r][i]/A[i][i];for(let c=i;c<8;c++)A[r][c]-=f*A[i][c];B[r]-=f*B[i]}}
  const X=new Array(8);for(let i=7;i>=0;i--){let s=B[i];for(let c=i+1;c<8;c++)s-=A[i][c]*X[c];X[i]=s/A[i][i]}return X;
}
// Migliora la foto di una partitura: toglie ombre e carta grigia, scurisce e rinforza note, gambi e righi.
function enhance(cv,mode,p){
  const W=cv.width,H=cv.height,N=W*H; const ctx=cv.getContext('2d',{willReadFrequently:true}); const d=ctx.getImageData(0,0,W,H).data;
  const g=new Float32Array(N); for(let i=0;i<N;i++) g[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;
  // 1) sfondo: massimo locale a blocchi (la carta), poi sfocato → divide per togliere ombre e pieghe
  const B=Math.max(8,Math.round(Math.max(W,H)/48)); const bw=Math.ceil(W/B), bh=Math.ceil(H/B); let bg=new Float32Array(bw*bh);
  for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){ const vals=[]; for(let y=by*B;y<Math.min(H,(by+1)*B);y+=2)for(let x=bx*B;x<Math.min(W,(bx+1)*B);x+=2)vals.push(g[y*W+x]); vals.sort((a,b)=>a-b); bg[by*bw+bx]=vals[Math.floor(vals.length*.9)]||255; }
  for(let pass=0;pass<3;pass++){const t=new Float32Array(bw*bh);for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<bw&&yy<bh){s+=bg[yy*bw+xx];n++}}t[y*bw+x]=s/n}bg=t}
  const bgAt=(x,y)=>{const fx=clamp(x/B-.5,0,bw-1.001),fy=clamp(y/B-.5,0,bh-1.001);const x0=fx|0,y0=fy|0,ax=fx-x0,ay=fy-y0;const x1=Math.min(bw-1,x0+1),y1=Math.min(bh-1,y0+1);return (bg[y0*bw+x0]*(1-ax)+bg[y0*bw+x1]*ax)*(1-ay)+(bg[y1*bw+x0]*(1-ax)+bg[y1*bw+x1]*ax)*ay};
  const norm=new Float32Array(N), bgRow=new Float32Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const b=Math.max(30,bgAt(x,y));bgRow[i]=b;norm[i]=clamp(g[i]/b*255,0,255)}
  // 2) nitidezza (maschera di contrasto)
  const sharp=p.sharp/100*1.6; let v=norm;
  if(sharp>0){const bl=boxBlur(norm,W,H,1);v=new Float32Array(N);for(let i=0;i<N;i++)v[i]=clamp(norm[i]+sharp*(norm[i]-bl[i]),0,255)}
  // 3) contrasto e intensità dei segni
  const C=1+p.contrast/100, gam=1+p.ink/100*1.6, clean=p.clean/100;
  const white=255-clean*60; // sopra questa soglia → carta bianca
  for(let i=0;i<N;i++){let t=v[i];t=(t-128)*C+128;t=clamp(t/white,0,1);t=Math.pow(t,gam);v[i]=t*255}
  const out=ctx.createImageData(W,H), o=out.data;
  if(mode==='score'){
    // 4) bianco/nero adattivo + ispessimento leggero per note sottili
    const thr=110+clean*80; let bin=new Uint8Array(N); for(let i=0;i<N;i++) bin[i]=v[i]<thr?1:0;
    if(p.ink>40){const t=new Uint8Array(N);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;t[i]=bin[i]|bin[i-1]|bin[i+1]|bin[i-W]|bin[i+W]}bin=t}
    // togli puntini isolati (polvere, grana della carta)
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(bin[i]&&!(bin[i-1]|bin[i+1]|bin[i-W]|bin[i+W]|bin[i-W-1]|bin[i-W+1]|bin[i+W-1]|bin[i+W+1]))bin[i]=0}
    for(let i=0;i<N;i++){const c=bin[i]?18:255;o[i*4]=o[i*4+1]=o[i*4+2]=c;o[i*4+3]=255}
  } else if(mode==='gray'){
    for(let i=0;i<N;i++){const c=v[i];o[i*4]=o[i*4+1]=o[i*4+2]=c;o[i*4+3]=255}
  } else {
    for(let i=0;i<N;i++){const k=v[i]/Math.max(1,g[i]/bgRow[i]*255);for(let ch=0;ch<3;ch++){let c=d[i*4+ch]/bgRow[i]*255*k;const m4=(d[i*4]+d[i*4+1]+d[i*4+2])/3/bgRow[i]*255*k;c=m4+(c-m4)*1.35;o[i*4+ch]=clamp(c,0,255)}o[i*4+3]=255}
  }
  const res=document.createElement('canvas'); res.width=W; res.height=H; res.getContext('2d').putImageData(out,0,0); return res;
}
function boxBlur(a,W,H,r){const t=new Float32Array(a.length),o=new Float32Array(a.length);
  for(let y=0;y<H;y++){let s=0;for(let x=-r;x<=r;x++)s+=a[y*W+clamp(x,0,W-1)];for(let x=0;x<W;x++){t[y*W+x]=s/(2*r+1);s+=a[y*W+clamp(x+r+1,0,W-1)]-a[y*W+clamp(x-r,0,W-1)]}}
  for(let x=0;x<W;x++){let s=0;for(let y=-r;y<=r;y++)s+=t[clamp(y,0,H-1)*W+x];for(let y=0;y<H;y++){o[y*W+x]=s/(2*r+1);s+=t[clamp(y+r+1,0,H-1)*W+x]-t[clamp(y-r,0,H-1)*W+x]}}return o}

// ---------------- Riordina pagine ----------------
const Reorder = {
  async open(){
    if(!ST.cur) return; const sc=ST.cur; this.items=[...Array(sc.pages).keys()].map(i=>({src:i,rot:0,del:false}));
    const m2=modal('Riordina pagine',`<div class="hint">Sposta, ruota o elimina le pagine. Le annotazioni seguono la loro pagina.</div><div class="pageGrid" id="rgGrid"></div>`,
      `<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-ok>${iconSvg('check')}Applica</button>`,{full:true,eyebrow:sc.title});
    m2.querySelector('[data-no]').onclick=closeLayers; m2.querySelector('[data-ok]').onclick=()=>this.apply();
    this.render();
  },
  render(){
    const g=$('#rgGrid'); g.innerHTML=this.items.map((it2,i)=>`<div class="pg${it2.del?' del':''}" data-i="${i}"><div class="pv"><canvas data-src="${it2.src}" style="transform:rotate(${it2.rot}deg)"></canvas><span class="n">${i+1}</span>${it2.src!==i?`<span class="nw">era ${it2.src+1}</span>`:''}</div>
      <div class="acts"><button data-a="l" aria-label="Sposta prima">${iconSvg('chevLeft')}</button><button data-a="r" aria-label="Ruota">${iconSvg('rotate')}</button><button data-a="d" aria-label="Elimina">${iconSvg(it2.del?'undo':'trash')}</button><button data-a="n" aria-label="Sposta dopo">${iconSvg('chevRight')}</button></div></div>`).join('');
    g.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.closest('[data-i]').dataset.i;const a=b.dataset.a;const L=this.items;
      if(a==='l'&&i>0)[L[i-1],L[i]]=[L[i],L[i-1]]; if(a==='n'&&i<L.length-1)[L[i+1],L[i]]=[L[i],L[i+1]]; if(a==='r')L[i].rot=(L[i].rot+90)%360; if(a==='d')L[i].del=!L[i].del; this.render()};
    const io=new IntersectionObserver(es=>es.forEach(async en=>{if(!en.isIntersecting)return;io.unobserve(en.target);const c=en.target;const pg=await ST.doc.getPage(+c.dataset.src+1);const vp=pg.getViewport({scale:.28});c.width=vp.width;c.height=vp.height;pg.render({canvasContext:c.getContext('2d'),viewport:vp})}));
    g.querySelectorAll('canvas').forEach(c=>io.observe(c));
  },
  async apply(){
    const keep=this.items.filter(i=>!i.del); if(!keep.length) return toast('Deve restare almeno una pagina');
    busy('Riordino…');
    try{
      const sc=ST.cur; const src=await PDFLib.PDFDocument.load(sc.bytes,{ignoreEncryption:true}); const out=await PDFLib.PDFDocument.create();
      const pages=await out.copyPages(src,keep.map(k=>k.src));
      pages.forEach((p,i)=>{ if(keep[i].rot) p.setRotation(PDFLib.degrees((p.getRotation().angle+keep[i].rot)%360)); out.addPage(p); });
      const ann={}; keep.forEach((k,i)=>{ if(ST.ann[k.src] && !k.rot) ann[i]=ST.ann[k.src]; });
      sc.bookmarks=(sc.bookmarks||[]).map(b=>({...b,p:keep.findIndex(k=>k.src===b.p)})).filter(b=>b.p>=0);
      ST.page=0; await replaceBytes(sc,(await out.save()).buffer,ann); busy(); closeLayers(); toast('Pagine riordinate');
    }catch(e){ busy(); toast('Non riuscito'); }
  },
};
