// ================= Annotazioni =================
const SWATCHES=['#111111','#d23b2f','#1f5fd6','#1d8a4a','#c8962e','#7a4a2a','#8b3fc4','#f4e04d','#ff8a3d','#5fd0e6','#ff6fae','#ffffff'];
const SHAPES=[
  {id:'cresc',n:'Crescendo'},{id:'dim',n:'Diminuendo'},{id:'slurUp',n:'Legatura sopra'},{id:'slurDown',n:'Legatura sotto'},
  {id:'line',n:'Linea'},{id:'arrow',n:'Freccia'},{id:'ellipse',n:'Cerchio'},{id:'rect',n:'Riquadro'},
  {id:'bracketL',n:'Parentesi ['},{id:'bracketR',n:'Parentesi ]'},{id:'wavy',n:'Linea ondulata (trillo)'},{id:'dashed',n:'Linea tratteggiata (8va)'},
  {id:'volta',n:'Casella di volta'},{id:'cut',n:'Taglio (vi-de)'},
];
const Anno = {
  presets:[
    {k:'stamp',g:{c:U(0x1D110),f:'m'},color:'#d23b2f',size:30,alpha:1},
    {k:'shape',shape:'dim',color:'#d23b2f',size:6,alpha:1},
    {k:'pen',color:'#d23b2f',size:5,alpha:1},{k:'pen',color:'#1f5fd6',size:5,alpha:1},{k:'pen',color:'#111111',size:4,alpha:1},
    {k:'pen',color:'#111111',size:14,alpha:1},{k:'pen',color:'#111111',size:8,alpha:1},{k:'pen',color:'#1f5fd6',size:14,alpha:1},
    {k:'hl',color:'#f4e04d',size:30,alpha:.42},{k:'pen',color:'#d23b2f',size:3,alpha:1},{k:'hl',color:'#f4e04d',size:70,alpha:.42},
    {k:'pen',color:'#7a4a2a',size:22,alpha:1},{k:'pen',color:'#d23b2f',size:14,alpha:1},{k:'pen',color:'#d23b2f',size:8,alpha:1},
    {k:'mask',color:'#ffffff',size:40,alpha:1},
  ],
  sel:2, mode:'preset', ruler:false, layers:[{name:'Livello 1',vis:true},{name:'Livello 2',vis:true}], layer:0,
  hist:{}, snapshot:null, live:null, selIdx:[], selBox:null, stampCat:0,

  init(){
    this.layers=this.layers; this.buildBar();
    const c=inkCanvas;
    c.addEventListener('pointerdown',e=>this.down(e));
    c.addEventListener('pointermove',e=>this.move(e));
    c.addEventListener('pointerup',e=>this.up(e));
    c.addEventListener('pointercancel',e=>{this.live=null;this.redraw()});
    inkCanvas.style.pointerEvents='none';
  },
  W(p){return p.size*.00028+.0004},
  get strokes(){ return (ST.ann[ST.page]=ST.ann[ST.page]||[]); },
  set strokes(v){ ST.ann[ST.page]=v; },

  enter(){
    if(!ST.cur) return toast('Apri prima uno spartito');
    ST.annotate=true; this.snapshot=JSON.stringify(ST.ann); this.hist={};
    $('#annobar').classList.add('open'); setBars(ST.bars.top,ST.bars.bottom);
    inkCanvas.style.pointerEvents='auto'; stage.style.cursor='crosshair'; this.buildBar(); updateChrome();
  },
  exit(silent){
    ST.annotate=false; $('#annobar').classList.remove('open'); inkCanvas.style.pointerEvents='none'; stage.style.cursor='';
    this.clearSel(); $('#textEntry')?.remove(); closeLayers(); saveAnn(); setBars(true,true); this.redraw();
    if(!silent) toast('Annotazioni salvate');
  },
  cancel(){ if(this.snapshot){ST.ann=JSON.parse(this.snapshot);saveAnn();} this.exit(true); toast('Modifiche annullate'); },
  pageChanged(){ this.clearSel(); $('#textEntry')?.remove(); updateChrome(); },

  // ---- barra strumenti ----
  buildBar(){
    const bar=$('#annoTools'); if(!bar) return;
    let h=this.presets.map((p,i)=>`<button class="preset${this.mode==='preset'&&this.sel===i?' on':''}" data-p="${i}" aria-label="Strumento ${i+1}"><canvas width="88" height="88"></canvas></button>`).join('');
    const t=(id,icon,label,on,dis)=>`<button class="atool${on?' on':''}${dis?' dis':''}" data-t="${id}" aria-label="${label}" title="${label}">${iconSvg(icon)}</button>`;
    const hs=this.hist[ST.page]||{u:[],r:[]};
    h+=`<span class="sep"></span>`+t('stamps','clef','Segni musicali',false)+t('ruler','ruler','Righello: linee dritte',this.ruler)+t('lasso','lasso','Lazo: seleziona e sposta',this.mode==='lasso')+t('text','text','Testo',this.mode==='text')+t('eraser','eraser','Gomma',this.mode==='eraser')
      +t('clear','trash','Cancella la pagina')+t('undo','undo','Annulla',false,!hs.u.length)+t('redo','redo','Ripeti',false,!hs.r.length)+t('layers','layers','Livelli');
    bar.innerHTML=h;
    bar.querySelectorAll('[data-p]').forEach(b=>this.drawPresetIcon(b.querySelector('canvas'),this.presets[+b.dataset.p]));
    bar.onclick=e=>{
      const p=e.target.closest('[data-p]');
      if(p){const i=+p.dataset.p; if(this.mode==='preset'&&this.sel===i) this.openStyle(p); else {this.mode='preset';this.sel=i;this.clearSel();this.buildBar(); if(this.presets[i].k==='stamp') this.openStamps();} return;}
      const b=e.target.closest('[data-t]'); if(!b) return; const k=b.dataset.t;
      if(k==='ruler'){this.ruler=!this.ruler;toast(this.ruler?'Righello attivo: le linee vengono dritte':'Righello spento')}
      else if(k==='stamps') this.openStamps();
      else if(['lasso','text','eraser'].includes(k)){this.mode=this.mode===k?'preset':k;this.clearSel()}
      else if(k==='clear'){ if(!this.strokes.length) return; this.push(); this.strokes=this.strokes.filter(s=>(s.layer||0)!==this.layer); this.redraw(); saveAnn(); toast('Livello della pagina cancellato · Annulla per ripristinare') }
      else if(k==='undo') this.undo(); else if(k==='redo') this.redo();
      else if(k==='layers') this.openLayers(b);
      this.buildBar();
    };
  },
  drawPresetIcon(c,p){
    const x=c.getContext('2d'); x.clearRect(0,0,88,88);
    if(p.k==='stamp'){ x.globalAlpha=p.alpha; const g=p.g; const b=glyphBox(x,g,60); const s=60*Math.min(1,52/Math.max(b.w,b.h,1)); drawGlyph(x,g,44,44,s,p.color); return; }
    if(p.k==='shape'){ x.globalAlpha=p.alpha; drawShape(x,{shape:p.shape,a:[14,30],b:[74,58],w:5,color:p.color}); return; }
    const w=clamp(this.W(p)*900,2,30);
    x.globalAlpha=p.k==='hl'?Math.max(.55,p.alpha):1; x.strokeStyle=p.color; x.lineWidth=w; x.lineCap=p.k==='hl'?'butt':'round';
    if(p.k==='mask'){x.fillStyle='#3a3326';x.fillRect(10,10,68,68);x.strokeStyle='#fff'}
    x.beginPath(); x.moveTo(18,70); x.lineTo(70,18); x.stroke();
  },

  // ---- disegno ----
  pt(e){ const r=inkCanvas.getBoundingClientRect(); return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height, e.pressure||.5]; },
  push(){ const h=this.hist[ST.page]=this.hist[ST.page]||{u:[],r:[]}; h.u.push(JSON.stringify(this.strokes)); if(h.u.length>60)h.u.shift(); h.r=[]; },
  undo(){ const h=this.hist[ST.page]; if(!h||!h.u.length) return; h.r.push(JSON.stringify(this.strokes)); this.strokes=JSON.parse(h.u.pop()); this.clearSel(); this.redraw(); saveAnn(); this.buildBar(); },
  redo(){ const h=this.hist[ST.page]; if(!h||!h.r.length) return; h.u.push(JSON.stringify(this.strokes)); this.strokes=JSON.parse(h.r.pop()); this.redraw(); saveAnn(); this.buildBar(); },
  down(e){
    if(!ST.annotate) return;
    if(ST.settings.pencilOnly && e.pointerType==='touch'){ this.touchNav={x:e.clientX,y:e.clientY}; return; }
    inkCanvas.setPointerCapture(e.pointerId);
    const p=this.pt(e); const pr=this.presets[this.sel];
    if(this.mode==='eraser'){ this.push(); this.live={t:'erase',hit:false}; this.erase(p); return; }
    if(this.mode==='text'){ this.textAt(p); return; }
    if(this.mode==='lasso'){
      if(this.selBox && p[0]>=this.selBox.x0&&p[0]<=this.selBox.x1&&p[1]>=this.selBox.y0&&p[1]<=this.selBox.y1){ this.push(); this.live={t:'drag',from:p}; return; }
      this.clearSel(); this.live={t:'lasso',pts:[p]}; return;
    }
    if(pr.k==='stamp'){ this.live={t:'stamp',g:pr.g,x:p[0],y:p[1],size:pr.size*.0016,color:pr.color,alpha:pr.alpha,layer:this.layer}; this.redraw(); return; }
    if(pr.k==='shape'){ this.live={t:'shape',shape:pr.shape,a:[p[0],p[1]],b:[p[0],p[1]],w:this.W(pr),color:pr.color,alpha:pr.alpha,layer:this.layer}; return; }
    this.live={t:pr.k,color:pr.k==='mask'?'#ffffff':pr.color,alpha:pr.alpha,w:this.W(pr),pts:[[p[0],p[1]]],layer:this.layer};
  },
  move(e){
    if(this.touchNav) return;
    const L=this.live; if(!L) return;
    const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
    const p=this.pt(e);
    if(L.t==='erase'){ this.erase(p); return; }
    if(L.t==='lasso'){ L.pts.push(p); this.redraw(); return; }
    if(L.t==='drag'){ const dx=p[0]-L.from[0], dy=p[1]-L.from[1]; L.from=p; this.selIdx.forEach(i=>moveStroke(this.strokes[i],dx,dy)); this.selBox.x0+=dx;this.selBox.x1+=dx;this.selBox.y0+=dy;this.selBox.y1+=dy; this.redraw(); return; }
    if(L.t==='stamp'){ L.x=p[0]; L.y=p[1]; this.redraw(); return; }
    if(L.t==='shape'){ L.b=[p[0],p[1]]; this.redraw(); return; }
    if(this.ruler){ L.pts=[L.pts[0],[p[0],p[1]]]; }
    else for(const ev of evs){ const q=this.pt(ev); const last=L.pts[L.pts.length-1]; if(Math.hypot(q[0]-last[0],q[1]-last[1])>.0012) L.pts.push([q[0],q[1]]); }
    this.redraw();
  },
  up(e){
    if(this.touchNav){ const dx=e.clientX-this.touchNav.x; this.touchNav=null; if(Math.abs(dx)>60) dx<0?nextPage():prevPage(); return; }
    const L=this.live; this.live=null; if(!L) return;
    if(L.t==='erase'){ if(!L.hit){ const h=this.hist[ST.page]; h&&h.u.pop(); } saveAnn(); this.buildBar(); return; }
    if(L.t==='lasso'){ this.selectLasso(L.pts); this.redraw(); return; }
    if(L.t==='drag'){ saveAnn(); this.showSelBar(); this.buildBar(); return; }
    if(L.t==='shape' && Math.hypot(L.b[0]-L.a[0],L.b[1]-L.a[1])<.01){ this.redraw(); return; }
    if((L.t==='pen'||L.t==='hl'||L.t==='mask') && L.pts.length===1) L.pts.push([L.pts[0][0]+.0005,L.pts[0][1]+.0005]);
    this.push(); this.strokes.push(L); this.redraw(); saveAnn(); this.buildBar();
  },
  erase(p){
    const r=.014, arr=this.strokes; let changed=false;
    for(let i=arr.length-1;i>=0;i--){ const s=arr[i]; if((s.layer||0)!==this.layer) continue; if(hitStroke(s,p[0],p[1],r)){ arr.splice(i,1); changed=true; } }
    if(changed){ this.live.hit=true; this.redraw(); }
  },
  textAt(p){
    $('#textEntry')?.remove(); const pr=this.presets[this.sel];
    const r=inkCanvas.getBoundingClientRect(); const box=document.createElement('div'); box.id='textEntry';
    box.innerHTML=`<input id="teIn" placeholder="Scrivi… (es. rit., respira)" enterkeyhint="done"><button class="goldBtn sm" id="teOk">${iconSvg('check')}</button>`;
    $('#app').appendChild(box);
    box.style.left=clamp(r.left+p[0]*r.width-10,8,innerWidth-320)+'px'; box.style.top=clamp(r.top+p[1]*r.height-26,70,innerHeight-120)+'px';
    const commit=()=>{const v=$('#teIn').value.trim(); box.remove(); if(!v) return; this.push(); this.strokes.push({t:'text',text:v,x:p[0],y:p[1],size:Math.max(.018,pr.size*.0012),color:pr.k==='mask'?'#111':pr.color,alpha:1,layer:this.layer}); this.redraw(); saveAnn(); this.buildBar(); };
    $('#teOk').onclick=commit; $('#teIn').onkeydown=e=>{if(e.key==='Enter')commit();if(e.key==='Escape')box.remove()}; setTimeout(()=>$('#teIn').focus(),20);
  },
  selectLasso(poly){
    if(poly.length<3) return; const idx=[];
    this.strokes.forEach((s,i)=>{ if((s.layer||0)!==this.layer) return; const pts=strokePts(s); if(pts.some(q=>inPoly(q,poly))) idx.push(i); });
    if(!idx.length){ toast('Niente da selezionare qui'); return; }
    this.selIdx=idx; this.updSelBox(); this.showSelBar();
  },
  updSelBox(){ let x0=1,y0=1,x1=0,y1=0; this.selIdx.forEach(i=>strokePts(this.strokes[i]).forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)})); const pad=.015; this.selBox={x0:x0-pad,y0:y0-pad,x1:x1+pad,y1:y1+pad}; },
  showSelBar(){
    $('#selBar')?.remove(); if(!this.selBox) return; const r=inkCanvas.getBoundingClientRect();
    const b=document.createElement('div'); b.id='selBar'; b.className='pill';
    b.innerHTML=`<button class="ib" data-s="dup" aria-label="Duplica">${iconSvg('copy')}</button><button class="ib" data-s="del" aria-label="Elimina">${iconSvg('trash')}</button><button class="ib" data-s="done" aria-label="Fine">${iconSvg('check')}</button>`;
    $('#app').appendChild(b); b.style.left=clamp(r.left+this.selBox.x0*r.width,8,innerWidth-170)+'px'; b.style.top=clamp(r.top+this.selBox.y0*r.height-60,120,innerHeight-60)+'px';
    b.onclick=e=>{const k=e.target.closest('[data-s]')?.dataset.s; if(!k) return;
      if(k==='del'){this.push();this.strokes=this.strokes.filter((_,i)=>!this.selIdx.includes(i));this.clearSel()}
      if(k==='dup'){this.push();const n=this.selIdx.map(i=>{const c=JSON.parse(JSON.stringify(this.strokes[i]));moveStroke(c,.02,.02);return c});const base=this.strokes.length;this.strokes.push(...n);this.selIdx=n.map((_,i)=>base+i);this.updSelBox();this.showSelBar()}
      if(k==='done') this.clearSel();
      this.redraw(); saveAnn(); this.buildBar(); };
  },
  clearSel(){ this.selIdx=[]; this.selBox=null; $('#selBar')?.remove(); this.redraw&&ST.cur&&this.redraw(); },

  redraw(){
    if(!inkCanvas.width) return; const x=inkCanvas.getContext('2d'); const W=inkCanvas.width,H=inkCanvas.height;
    x.clearRect(0,0,W,H);
    this.paint(x,ST.ann[ST.page]||[],W,H,false);
    const L=this.live;
    if(L && !['erase','lasso','drag'].includes(L.t)) this.paint(x,[L],W,H,true);
    if(L && L.t==='lasso'){ x.save(); x.setLineDash([8,6]); x.strokeStyle='#c8962e'; x.lineWidth=2; x.beginPath(); L.pts.forEach((p,i)=>i?x.lineTo(p[0]*W,p[1]*H):x.moveTo(p[0]*W,p[1]*H)); x.stroke(); x.restore(); }
    if(this.selBox){ const b=this.selBox; x.save(); x.setLineDash([10,6]); x.strokeStyle='#c8962e'; x.lineWidth=2.5; x.strokeRect(b.x0*W,b.y0*H,(b.x1-b.x0)*W,(b.y1-b.y0)*H); x.restore(); }
  },
  paint(x,strokes,W,H,all){
    for(const s of strokes){
      if(!all && this.layers[s.layer||0] && !this.layers[s.layer||0].vis) continue;
      x.save(); x.globalAlpha=s.alpha??1;
      if(s.t==='pen'||s.t==='hl'||s.t==='mask'){
        x.strokeStyle=s.color; x.lineWidth=s.w*W; x.lineCap=s.t==='hl'?'butt':'round'; x.lineJoin='round';
        const P2=s.pts.map(p=>[p[0]*W,p[1]*H]); x.beginPath(); x.moveTo(P2[0][0],P2[0][1]);
        for(let i=1;i<P2.length-1;i++){const mx=(P2[i][0]+P2[i+1][0])/2,my=(P2[i][1]+P2[i+1][1])/2;x.quadraticCurveTo(P2[i][0],P2[i][1],mx,my)}
        const l=P2[P2.length-1]; x.lineTo(l[0],l[1]); x.stroke();
      } else if(s.t==='shape'){ drawShape(x,{shape:s.shape,a:[s.a[0]*W,s.a[1]*H],b:[s.b[0]*W,s.b[1]*H],w:s.w*W,color:s.color}); }
      else if(s.t==='stamp'){ drawGlyph(x,s.g,s.x*W,s.y*H,s.size*W,s.color); }
      else if(s.t==='text'){ x.fillStyle=s.color; x.font=`italic 600 ${s.size*W}px ${css('--f-display')}`; x.textBaseline='middle'; x.fillText(s.text,s.x*W,s.y*H); }
      x.restore();
    }
  },

  // ---- pannelli ----
  openStyle(anchor){
    const pr=this.presets[this.sel];
    if(pr.k==='stamp') return this.openStamps();
    if(pr.k==='shape') return this.openShapes(anchor);
    const hsl=hexToHsl(pr.color);
    const sl=(id,l,min,max,v,suf='')=>`<div class="sl"><span>${l}<em id="${id}v">${v}${suf}</em></span><input type="range" id="${id}" min="${min}" max="${max}" value="${v}" style="--v:${(v-min)/(max-min)*100}%"></div>`;
    const p=popover(anchor,`<h4>Stile pennello</h4><div style="width:300px;display:flex;flex-direction:column;gap:10px">
      <div class="brushPrev"><canvas id="bpC" width="600" height="172"></canvas></div>
      ${sl('bSize','Dimensioni',1,100,pr.size)}
      <div class="swatches" id="bSw">${SWATCHES.map(c=>`<button class="sw${c.toLowerCase()===pr.color.toLowerCase()?' on':''}" style="background:${c}" data-c="${c}" aria-label="Colore ${c}"></button>`).join('')}</div>
      ${sl('bH','Tonalità',0,360,Math.round(hsl[0]),'°')}${sl('bS','Saturazione',0,100,Math.round(hsl[1]),'%')}${sl('bL','Luminosità',0,100,Math.round(hsl[2]),'%')}${sl('bA','Trasparenza',5,100,Math.round(pr.alpha*100),'%')}
      ${switchRow('bMask','Maschera (bianchetto)',pr.k==='mask','Copre segni sbagliati della stampa.')}
      ${switchRow('bHl','Evidenziatore',pr.k==='hl')}
      <div class="popActions"><button id="bDel" aria-label="Elimina strumento">${iconSvg('trash')}</button><button id="bDup" aria-label="Duplica strumento">${iconSvg('copy')}</button></div></div>`,{id:'brushPop'});
    const prev=()=>{const c=$('#bpC');const x=c.getContext('2d');x.clearRect(0,0,600,172);x.globalAlpha=pr.alpha;x.strokeStyle=pr.k==='mask'?'#fff':pr.color;x.lineWidth=clamp(this.W(pr)*1400,2,80);x.lineCap=pr.k==='hl'?'butt':'round';x.beginPath();x.moveTo(90,110);x.bezierCurveTo(220,-10,330,200,510,60);x.stroke()};
    const fromHsl=()=>{pr.color=hslToHex(+$('#bH').value,+$('#bS').value,+$('#bL').value);$$('#bSw .sw').forEach(s=>s.classList.toggle('on',s.dataset.c===pr.color))};
    const bind=(id,fn,suf='')=>{const i=$('#'+id);i.oninput=()=>{i.style.setProperty('--v',(i.value-i.min)/(i.max-i.min)*100+'%');$('#'+id+'v').textContent=i.value+suf;fn(+i.value);prev();this.savePresets()}};
    bind('bSize',v=>pr.size=v); bind('bH',fromHsl,'°'); bind('bS',fromHsl,'%'); bind('bL',fromHsl,'%'); bind('bA',v=>pr.alpha=v/100,'%');
    $('#bSw').onclick=e=>{const s=e.target.closest('[data-c]');if(!s)return;pr.color=s.dataset.c;const h=hexToHsl(pr.color);['bH','bS','bL'].forEach((id,i)=>{const el=$('#'+id);el.value=Math.round(h[i]);el.dispatchEvent(new Event('input'))});prev();this.savePresets()};
    $('#bMask').onclick=()=>{pr.k=pr.k==='mask'?'pen':'mask';$('#bMask').classList.toggle('on',pr.k==='mask');$('#bHl').classList.toggle('on',false);prev();this.savePresets()};
    $('#bHl').onclick=()=>{pr.k=pr.k==='hl'?'pen':'hl';if(pr.k==='hl'&&pr.alpha>.6)pr.alpha=.42;$('#bHl').classList.toggle('on',pr.k==='hl');$('#bMask').classList.toggle('on',false);prev();this.savePresets()};
    $('#bDel').onclick=()=>{if(this.presets.length<2)return;this.presets.splice(this.sel,1);this.sel=Math.max(0,this.sel-1);closeLayers();this.savePresets()};
    $('#bDup').onclick=()=>{this.presets.splice(this.sel+1,0,JSON.parse(JSON.stringify(pr)));this.sel++;closeLayers();this.savePresets()};
    prev();
  },
  savePresets(){ DB.set('presets',this.presets); this.buildBar(); },
  openShapes(anchor){
    const pr=this.presets[this.sel];
    const p=popover(anchor,`<h4>Forme</h4><div class="shapeList">${SHAPES.map(s=>`<button class="shapeRow${s.id===pr.shape?' on':''}" data-sh="${s.id}"><canvas width="120" height="80"></canvas><b>${s.n}</b>${s.id===pr.shape?iconSvg('check'):''}</button>`).join('')}</div>
      <div class="swatches" id="shSw" style="margin-top:12px">${SWATCHES.slice(0,9).map(c=>`<button class="sw${c===pr.color?' on':''}" style="background:${c}" data-c="${c}" aria-label="Colore"></button>`).join('')}</div>
      <div class="sl" style="margin-top:8px"><span>Spessore<em id="shWv">${pr.size}</em></span><input type="range" id="shW" min="1" max="40" value="${pr.size}" style="--v:${pr.size/40*100}%"></div>`,{id:'shapePop'});
    p.querySelectorAll('[data-sh]').forEach(b=>{const c=b.querySelector('canvas');drawShape(c.getContext('2d'),{shape:b.dataset.sh,a:[18,22],b:[102,58],w:4,color:pr.color})});
    p.onclick=e=>{const b=e.target.closest('[data-sh]');if(b){pr.shape=b.dataset.sh;this.savePresets();closeLayers();return}const s=e.target.closest('[data-c]');if(s){pr.color=s.dataset.c;this.savePresets();this.openShapes(anchor)}};
    const w=$('#shW'); w.oninput=()=>{pr.size=+w.value;$('#shWv').textContent=w.value;w.style.setProperty('--v',w.value/40*100+'%');this.savePresets()};
  },
  openLayers(anchor){
    const p=popover(anchor,`<h4>Livelli</h4><div style="min-width:280px">${this.layers.map((l,i)=>`<div class="item" data-l="${i}"><button class="infoBtn" data-v="${i}" aria-label="Mostra o nascondi">${iconSvg(l.vis?'eye':'eyeOff')}</button><div class="tx"><div class="tt">${esc(l.name)}</div><div class="st">${(ST.ann[ST.page]||[]).filter(s=>(s.layer||0)===i).length} segni su questa pagina</div></div>${i===this.layer?`<span style="color:var(--gold)">${iconSvg('check')}</span>`:''}</div>`).join('')}
      <div style="margin-top:12px"><button class="ghostBtn" id="lyNew">${iconSvg('plus')}Nuovo livello</button></div><div class="hint" style="margin-top:10px">Esempio: Livello 1 per il direttore, Livello 2 per le tue note. Nascondi un livello per vedere la pagina pulita.</div></div>`,{id:'layersPop'});
    p.onclick=e=>{const v=e.target.closest('[data-v]');if(v){const l=this.layers[+v.dataset.v];l.vis=!l.vis;this.redraw();this.openLayers(anchor);return}
      const r=e.target.closest('[data-l]');if(r){this.layer=+r.dataset.l;updateChrome();this.openLayers(anchor)}};
    $('#lyNew').onclick=()=>{this.layers.push({name:'Livello '+(this.layers.length+1),vis:true});this.layer=this.layers.length-1;updateChrome();this.openLayers(anchor)};
  },
  openStamps(){
    closeLayers();
    let pr=this.presets[this.sel];
    if(pr.k!=='stamp'){ let i=this.presets.findIndex(p=>p.k==='stamp'); if(i<0){this.presets.unshift({k:'stamp',g:{c:U(0x1D110),f:'m'},color:'#d23b2f',size:30,alpha:1});i=0} this.sel=i; this.mode='preset'; pr=this.presets[i]; this.buildBar(); }
    const p=document.createElement('div'); p.className='pop'; p.id='stampPanel'; layerRoot.appendChild(p);
    const side=()=>{const right=this.stampRight; p.style.left=right?'auto':'max(10px,env(safe-area-inset-left,0px))'; p.style.right=right?'max(10px,env(safe-area-inset-right,0px))':'auto'; p.style.top=($('#annobar').getBoundingClientRect().bottom+8)+'px'};
    const render=()=>{
      const cat=STAMP_CATS[this.stampCat];
      p.innerHTML=`<div class="stampHead"><button class="ib" id="spSide" aria-label="Sposta il pannello">${iconSvg(this.stampRight?'chevLeft':'chevRight')}</button>
        <select id="spCat" aria-label="Categoria">${STAMP_CATS.map((c,i)=>`<option value="${i}"${i===this.stampCat?' selected':''}>${esc(c.name)} (${c.items.length})</option>`).join('')}</select>
        <button class="ib" id="spClose" aria-label="Chiudi">${iconSvg('close')}</button></div>
        <div class="catChips">${STAMP_CATS.map((c,i)=>`<button data-cat="${i}" class="${i===this.stampCat?'on':''}">${esc(c.name)}</button>`).join('')}</div>
        <div class="stampGrid" id="spGrid">${cat.items.map((g,i)=>`<button class="stamp${sameGlyph(g,pr.g)?' on':''}" data-g="${i}" title="${esc(g.n||'')}"><canvas width="120" height="132"></canvas><small>${esc(g.n||'')}</small></button>`).join('')}</div>
        <div class="dots">${STAMP_CATS.map((c,i)=>`<i class="${i===this.stampCat?'on':''}"></i>`).join('')}</div>
        <div class="stampFoot"><div class="sl"><span>Dimensione<em id="spSzv">${pr.size}</em></span><input type="range" id="spSz" min="8" max="90" value="${pr.size}" style="--v:${(pr.size-8)/82*100}%"></div>
          <div class="swatches" id="spSw">${['#111111','#d23b2f','#1f5fd6','#1d8a4a','#c8962e'].map(c=>`<button class="sw${c===pr.color?' on':''}" style="background:${c};width:28px;height:28px" data-c="${c}" aria-label="Colore"></button>`).join('')}</div></div>
        <div class="hint" style="margin-top:8px;font-size:12.5px">Scegli un segno e tocca la pagina dove metterlo. Tieni premuto e trascina per posizionarlo con precisione.</div>`;
      p.querySelectorAll('[data-g]').forEach(b=>{const g=cat.items[+b.dataset.g];const c=b.querySelector('canvas');const x=c.getContext('2d');const bx=glyphBox(x,g,70);const s=70*Math.min(1.3,92/Math.max(bx.w,bx.h,1));drawGlyph(x,g,60,58,s,'#f4ecdc')});
      side();
    };
    p.onclick=e=>{
      if(e.target.closest('#spClose')){p.remove();return}
      if(e.target.closest('#spSide')){this.stampRight=!this.stampRight;render();return}
      const c=e.target.closest('[data-cat]'); if(c){this.stampCat=+c.dataset.cat;render();return}
      const g=e.target.closest('[data-g]'); if(g){pr.g=STAMP_CATS[this.stampCat].items[+g.dataset.g]; pr.g={c:pr.g.c,f:pr.g.f,v:pr.g.v,n:pr.g.n}; this.mode='preset'; this.savePresets(); p.querySelectorAll('.stamp').forEach(s=>s.classList.toggle('on',s===g)); toast('Tocca la pagina per mettere: '+(pr.g.n||pr.g.c||'segno'),1600); return}
      const s=e.target.closest('[data-c]'); if(s){pr.color=s.dataset.c;this.savePresets();p.querySelectorAll('#spSw .sw').forEach(x=>x.classList.toggle('on',x===s))}
    };
    p.onchange=e=>{if(e.target.id==='spCat'){this.stampCat=+e.target.value;render()}};
    p.oninput=e=>{if(e.target.id==='spSz'){pr.size=+e.target.value;$('#spSzv').textContent=pr.size;e.target.style.setProperty('--v',(pr.size-8)/82*100+'%');this.savePresets()}};
    // scorrimento orizzontale tra categorie
    let sx=null; p.addEventListener('pointerdown',e=>{if(e.target.closest('#spGrid'))sx=e.clientX});
    p.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>70){this.stampCat=clamp(this.stampCat+(dx<0?1:-1),0,STAMP_CATS.length-1);render()}});
    render();
  },
};
function sameGlyph(a,b){return a&&b&&a.c===b.c&&a.v===b.v&&a.f===b.f}
function strokePts(s){ if(s.pts) return s.pts; if(s.t==='shape') return [s.a,s.b]; return [[s.x,s.y]]; }
function moveStroke(s,dx,dy){ if(s.pts) s.pts=s.pts.map(p=>[p[0]+dx,p[1]+dy]); else if(s.t==='shape'){s.a=[s.a[0]+dx,s.a[1]+dy];s.b=[s.b[0]+dx,s.b[1]+dy]} else {s.x+=dx;s.y+=dy} }
function hitStroke(s,x,y,r){
  if(s.t==='stamp') return Math.hypot(s.x-x,s.y-y)<Math.max(r,s.size*.5);
  if(s.t==='text') return x>=s.x-r&&x<=s.x+s.size*s.text.length*.55+r&&Math.abs(y-s.y)<s.size*.7+r;
  const pts=strokePts(s);
  for(let i=0;i<pts.length-1;i++) if(segDist(x,y,pts[i],pts[i+1])<r+(s.w||0)/2) return true;
  return pts.length===1 && Math.hypot(pts[0][0]-x,pts[0][1]-y)<r;
}
function segDist(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const l=dx*dx+dy*dy;let t=l?((x-a[0])*dx+(y-a[1])*dy)/l:0;t=clamp(t,0,1);return Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy))}
function inPoly(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))c=!c}return c}
function drawShape(x,s){
  const [ax,ay]=s.a,[bx,by]=s.b; x.save(); x.strokeStyle=s.color; x.fillStyle=s.color; x.lineWidth=Math.max(1,s.w); x.lineCap='round'; x.lineJoin='round';
  const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
  x.beginPath();
  switch(s.shape){
    case 'cresc':{const my=(ay+by)/2,hh=Math.max(Math.abs(by-ay)/2,Math.abs(bx-ax)*.07);x.moveTo(bx,my-hh);x.lineTo(ax,my);x.lineTo(bx,my+hh);break}
    case 'dim':{const my=(ay+by)/2,hh=Math.max(Math.abs(by-ay)/2,(Math.abs(bx-ax))*.07);x.moveTo(ax,my-hh);x.lineTo(bx,my);x.lineTo(ax,my+hh);break}
    case 'slurUp': case 'slurDown':{const up=s.shape==='slurUp'?-1:1;const sg=dx>=0?1:-1;const h=len*.25*up*sg;const mx=(ax+bx)/2,my=(ay+by)/2;x.moveTo(ax,ay);x.quadraticCurveTo(mx+nx*h,my+ny*h,bx,by);break}
    case 'line': x.moveTo(ax,ay);x.lineTo(bx,by);break;
    case 'dashed': x.setLineDash([s.w*3,s.w*3]);x.moveTo(ax,ay);x.lineTo(bx,by);x.lineTo(bx,by+s.w*5);break;
    case 'arrow':{x.moveTo(ax,ay);x.lineTo(bx,by);const a=Math.atan2(dy,dx),hl=Math.max(10,s.w*4);x.moveTo(bx,by);x.lineTo(bx-hl*Math.cos(a-.45),by-hl*Math.sin(a-.45));x.moveTo(bx,by);x.lineTo(bx-hl*Math.cos(a+.45),by-hl*Math.sin(a+.45));break}
    case 'ellipse': x.ellipse((ax+bx)/2,(ay+by)/2,Math.abs(dx)/2||1,Math.abs(dy)/2||1,0,0,7);break;
    case 'rect': x.rect(Math.min(ax,bx),Math.min(ay,by),Math.abs(dx),Math.abs(dy));break;
    case 'bracketL':{const w=Math.max(6,Math.abs(dx)*.4);x.moveTo(ax+w,ay);x.lineTo(ax,ay);x.lineTo(ax,by);x.lineTo(ax+w,by);break}
    case 'bracketR':{const w=Math.max(6,Math.abs(dx)*.4);x.moveTo(bx-w,ay);x.lineTo(bx,ay);x.lineTo(bx,by);x.lineTo(bx-w,by);break}
    case 'wavy':{const n=Math.max(2,Math.round(len/(s.w*7+6)));const st=len/n;x.moveTo(ax,ay);for(let i=0;i<n;i++){const t0=i*st;const cx=ax+dx/len*(t0+st/2)+nx*(i%2?1:-1)*st*.5,cy=ay+dy/len*(t0+st/2)+ny*(i%2?1:-1)*st*.5;x.quadraticCurveTo(cx,cy,ax+dx/len*(t0+st),ay+dy/len*(t0+st))}break}
    case 'volta': x.moveTo(ax,by);x.lineTo(ax,ay);x.lineTo(bx,ay);break;
    case 'cut':{x.arc(ax,ay,Math.max(5,s.w*2.2),0,7);x.moveTo(ax-s.w*4,ay);x.lineTo(ax+s.w*4,ay);x.moveTo(ax,ay-s.w*4);x.lineTo(ax,ay+s.w*4);x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.beginPath();x.arc(bx,by,Math.max(5,s.w*2.2),0,7);x.moveTo(bx-s.w*4,by);x.lineTo(bx+s.w*4,by);x.moveTo(bx,by-s.w*4);x.lineTo(bx,by+s.w*4);break}
  }
  x.stroke(); x.restore();
}
function hexToHsl(hex){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return [h,s*100,l*100]}
function hslToHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return '#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}
