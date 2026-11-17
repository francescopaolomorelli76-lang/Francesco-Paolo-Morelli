// ================= Testo: copia in omoritmia sui righi senza testo · pronuncia italianizzata =================

// Trova i pentagrammi nella pagina: righe orizzontali scure lunghe, raggruppate a 5 con passo regolare.
function detectStaves(){
  const c=pageCanvas, W=c.width, H=c.height; if(!W) return [];
  const s=Math.min(1,900/W), w=Math.round(W*s), h=Math.round(H*s);
  const t=document.createElement('canvas'); t.width=w; t.height=h; const x=t.getContext('2d',{willReadFrequently:true}); x.drawImage(c,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data; const prof=new Float32Array(h);
  // una riga sottile può cadere a cavallo di due righe di pixel: si guarda il più scuro tra le due
  for(let y=0;y<h;y++){ let run=0,best=0,dark=0; for(let i=0;i<w;i++){ const k=(y*w+i)*4, k2=k+(y<h-1?w*4:0); const v=Math.min(d[k]+d[k+1]+d[k+2],d[k2]+d[k2+1]+d[k2+2]); if(v<470){run++;dark++;if(run>best)best=run}else run=0; } prof[y]=Math.max(best,dark*.8)/w; }
  // righe del pentagramma: profilo alto e massimo locale
  const lines=[]; for(let y=1;y<h-1;y++) if(prof[y]>.38&&prof[y]>=prof[y-1]&&prof[y]>=prof[y+1]){ if(lines.length&&y-lines[lines.length-1]<=2){ continue; } lines.push(y); }
  const staves=[]; let i=0;
  while(i+4<lines.length){
    const g=lines.slice(i,i+5), gaps=g.slice(1).map((v,k)=>v-g[k]); const avg=gaps.reduce((a,b)=>a+b,0)/4;
    if(avg>2&&gaps.every(v=>Math.abs(v-avg)<=Math.max(1.6,avg*.35))){ staves.push({top:g[0]/h,bottom:g[4]/h,gap:avg/h}); i+=5; } else i++;
  }
  // testo stampato sotto il rigo: molte colonne con segni nella fascia delle sillabe (gambi e note isolate ne toccano poche)
  staves.forEach((st,k)=>{ const g=st.gap*h, y0=Math.round(st.bottom*h+g*.45), lim=staves[k+1]?staves[k+1].top*h-g*.3:h, y1=Math.round(Math.min(lim,st.bottom*h+g*3.2)); let cols=0;
    if(y1>y0) for(let i=0;i<w;i++){ for(let y=y0;y<y1;y++){ const q=(y*w+i)*4; if(d[q]+d[q+1]+d[q+2]<540){cols++;break} } }
    st.printed = y1>y0 && cols/w>.12; });
  return staves;
}

const LyricCopy = {
  start(){
    const A=Anno; const src=A.selIdx.map(i=>A.strokes[i]).filter(s=>s.t==='text');
    if(!src.length) return toast('Seleziona con il lazo le sillabe da copiare');
    const staves=detectStaves(); if(!staves.length) return toast('Non trovo i pentagrammi in questa pagina: copia con Duplica e trascina');
    const sy=Math.min(...src.map(s=>s.y));
    // rigo di riferimento: l'ultimo che termina sopra il testo selezionato
    const ref=[...staves].filter(st=>st.bottom<sy+.005).pop()||staves[0];
    this.src=src; this.ref=ref; this.staves=staves; this.picked=new Set();
    this.overlay();
  },
  overlay(){
    $('#lcLayer')?.remove(); const r=inkCanvas.getBoundingClientRect(); const L=document.createElement('div'); L.id='lcLayer';
    L.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:27`;
    L.innerHTML=this.staves.map((st,i)=>{const isRef=st===this.ref; return `<button data-st="${i}" class="lcBand${isRef?' ref':''}${this.picked.has(i)?' on':''}" style="top:${(st.top-st.gap*.6)*100}%;height:${(st.bottom-st.top+st.gap*1.2)*100}%">${isRef?'Testo da qui':this.picked.has(i)?'✓ Copia qui':'Tocca per copiare'}</button>`}).join('')
      +`<div class="lcBar pill"><button class="ghostBtn" data-lc="all">Tutti i righi senza testo</button><button class="goldBtn" data-lc="ok">${iconSvg('check')}Copia</button><button class="ib" data-lc="x" aria-label="Annulla">${iconSvg('close')}</button></div>`;
    $('#app').appendChild(L);
    L.onclick=e=>{ const b=e.target.closest('[data-st]'); if(b){ const i=+b.dataset.st; if(this.staves[i]===this.ref) return; this.picked.has(i)?this.picked.delete(i):this.picked.add(i); this.overlay(); return; }
      const a=e.target.closest('[data-lc]')?.dataset.lc; if(a==='x') L.remove(); if(a==='all'){ this.staves.forEach((st,i)=>{ if(st!==this.ref && !this.hasText(st)) this.picked.add(i); }); this.overlay(); } if(a==='ok') this.apply(); };
  },
  hasText(st){ if(st.printed) return true; const nx=this.staves[this.staves.indexOf(st)+1]; const lim=nx?nx.top:1; return Anno.strokes.some(s=>s.t==='text'&&s.y>st.bottom&&s.y<lim); },
  apply(){
    if(!this.picked.size) return toast('Tocca almeno un rigo dove copiare');
    const A=Anno; A.push(); let n=0;
    for(const i of this.picked){ const st=this.staves[i]; const k=st.gap/this.ref.gap||1; // righi di dimensione diversa: mantiene la distanza proporzionale
      for(const s of this.src){ const c=JSON.parse(JSON.stringify(s)); c.y=st.bottom+(s.y-this.ref.bottom)*k; A.strokes.push(c); n++; } }
    $('#lcLayer')?.remove(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar();
    toast(`Testo copiato su ${this.picked.size} ${this.picked.size===1?'rigo':'righi'} (${n} sillabe) · Annulla per tornare indietro`,3200);
  },
};

// ---------- Pronuncia italianizzata (latino ecclesiastico, tedesco, francese) ----------
const PRON = {
  la(w){ let s=w.toLowerCase();
    s=s.replace(/^mihi$/,'michi').replace(/^nihil$/,'nichil').replace(/ae|æ|oe|œ/g,'e').replace(/j/g,'i').replace(/y/g,'i').replace(/z/g,'dz');
    s=s.replace(/([^stx])ti(?=[aeiou])/g,'$1zi').replace(/^ti(?=[aeiou])/,'zi');
    s=s.replace(/xc(?=[ei])/g,'csc').replace(/x/g,'cs').replace(/ph/g,'f').replace(/th/g,'t').replace(/rh/g,'r');
    s=s.replace(/ch(?=[aou]|$)/g,'c').replace(/h/g,'');
    return s; },
  de(w){ let s=w.toLowerCase();
    s=s.replace(/tsch/g,'c§').replace(/sch(?=[ei])/g,'sc').replace(/sch(?=[aouäöü])/g,'sci').replace(/sch/g,'sh');
    s=s.replace(/^st/,'sht').replace(/^sp/,'shp').replace(/ß/g,'ss').replace(/ck/g,'k').replace(/qu/g,'kv');
    s=s.replace(/ie/g,'ī').replace(/ei|ai/g,'ai').replace(/eu|äu/g,'oi').replace(/ä/g,'è');
    s=s.replace(/([aou])ch/g,'$1kh').replace(/ch/g,'ç').replace(/([aeiouäöü])h/g,'$1').replace(/^h/,'h');
    s=s.replace(/w/g,'§v§').replace(/v/g,'f').replace(/§f§/g,'v').replace(/j/g,'i').replace(/z/g,'z');
    s=s.replace(/k(?=[eiīè])/g,'ch').replace(/g(?=[eiīè])/g,'gh').replace(/c(?=[ei])/g,'z');
    s=s.replace(/ig$/,'iç').replace(/b$/,'p').replace(/d$/,'t').replace(/g$/,'k');
    s=s.replace(/^s(?=[aeiouäöü])/,'ṡ').replace(/c§/g,'c').replace(/ī/g,'i');
    return s; },
  fr(w){ let s=w.toLowerCase();
    s=s.replace(/œu|oeu|eu/g,'ö').replace(/eaux?$/,'o').replace(/eau/g,'o').replace(/au/g,'o').replace(/oi/g,'ua').replace(/ou/g,'Ů').replace(/(?<![aeo])u(?![aeio])/g,'ü').replace(/Ů/g,'u');
    s=s.replace(/(ain|ein|in|im|ym|yn)(?![aeiouyn])/g,'ẽ').replace(/(an|en|am|em)(?![aeiouyn])/g,'ã').replace(/(on|om)(?![aeiouyn])/g,'õ').replace(/(un|um)(?![aeiouyn])/g,'œ̃');
    s=s.replace(/ai|ei|ê|è/g,'è').replace(/é|er$|ez$/g,'é').replace(/ch/g,'sc').replace(/gn/g,'gn').replace(/qu/g,'k');
    s=s.replace(/ç/g,'s').replace(/c(?=[eiy])/g,'s').replace(/g(?=[eiy])/g,'j').replace(/ill/g,'i').replace(/ph/g,'f').replace(/th/g,'t').replace(/h/g,'');
    s=s.replace(/(?<=[aeiouéèü])s(?=[aeiouéèü])/g,'ṡ').replace(/[stdxzp]+$/,'').replace(/([^aeiouéèü])e$/,'$1(e)').replace(/y/g,'i');
    return s; },
  conv(text,lang){ return String(text).replace(/[A-Za-zÀ-ÿßæœ]+/g,w=>{const r=this[lang](w);return w[0]===w[0].toUpperCase()&&w[0]!==w[0].toLowerCase()?r.charAt(0).toUpperCase()+r.slice(1):r}); },
  es(w){ let s=w.toLowerCase();
    s=s.replace(/ll/g,'gl').replace(/ñ/g,'gn').replace(/j/g,'kh').replace(/g(?=[ei])/g,'kh').replace(/gu(?=[ei])/g,'gh').replace(/qu(?=[ei])/g,'k');
    s=s.replace(/c(?=[ei])/g,'θ').replace(/z/g,'θ').replace(/h/g,'').replace(/v/g,'b').replace(/y$/,'i').replace(/[áà]/g,'a').replace(/[éè]/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/[úü]/g,'u');
    return s; },
  en(w){ let s=w.toLowerCase();
    const dict={the:'de',and:'end',you:'iu',your:'ior',are:'ar',love:'lav',heart:'hart',my:'mai',life:'laif',with:'uid',for:'for',ever:'ever',all:'ol',we:'ui',our:'auar',free:'fri',me:'mi',be:'bi',sweet:'suit',night:'nait',light:'lait',song:'song',sing:'sing',come:'kam',home:'hom',lord:'lord',god:'god',holy:'holi',glory:'glori',joy:'gioi'};
    if(dict[s]) return dict[s];
    s=s.replace(/igh/g,'ai').replace(/ee|ea/g,'i').replace(/oo/g,'u').replace(/ou/g,'au').replace(/ow$/,'au').replace(/sh/g,'sc').replace(/ch/g,'c').replace(/th/g,'d').replace(/w/g,'u').replace(/y(?=[aeiou])/g,'i').replace(/y$/,'i').replace(/ph/g,'f').replace(/([^aeiou])e$/,'$1').replace(/ck/g,'k').replace(/j/g,'gi');
    return s; },
  names:{la:'Latino (ecclesiastico)',de:'Tedesco',fr:'Francese',es:'Spagnolo',en:'Inglese'},
};
const Pron = {
  lang:'la',
  // Dalle sillabe selezionate: aggiunge sotto ciascuna la pronuncia all'italiana, in blu.
  fromSelection(){
    const A=Anno; const src=A.selIdx.map(i=>A.strokes[i]).filter(s=>s.t==='text');
    if(!src.length) return toast('Seleziona con il lazo il testo da pronunciare');
    const m2=modal('Pronuncia italianizzata',`<div class="field"><label>Lingua del testo</label><div class="seg" id="prLang">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${this.lang===k?'on':''}">${l}</button>`).join('')}</div></div>
      <div id="prPrev" class="hint" style="font-size:16px;line-height:1.7"></div>
      <div class="hint" style="font-size:12.5px">ṡ = s sonora (come in “rosa”) · sh = “sc” di “scena” · ç = suono di “ich” tedesco · ã õ ẽ = vocali nasali francesi · ü ö = vocali turbate · (e) = e muta.</div>`,
      `<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-ok>${iconSvg('check')}Scrivi sotto il testo</button>`);
    const upd=()=>{$('#prPrev').innerHTML=src.map(s=>`<b>${esc(s.text)}</b> → <span style="color:var(--gold-hi)">${esc(PRON.conv(s.text,this.lang))}</span>`).join(' &nbsp; ')};
    $('#prLang').onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;this.lang=b.dataset.l;$$('#prLang button').forEach(x=>x.classList.toggle('on',x===b));upd()}; upd();
    m2.querySelector('[data-no]').onclick=closeLayers;
    m2.querySelector('[data-ok]').onclick=()=>{ A.push(); src.forEach(s=>A.strokes.push({...JSON.parse(JSON.stringify(s)),text:PRON.conv(s.text,this.lang),y:s.y+s.size*1.15,size:s.size*.8,color:'#1f5fd6',lyric:1,align:s.align||'l',pron:1}));
      closeLayers(); A.clearSel(); A.redraw(); saveAnn(); A.buildBar(); toast('Pronuncia aggiunta sotto il testo'); };
  },
  // Testo libero (anche per partiture scansionate, dove il testo è un'immagine)
  open(){
    const m2=modal('Pronuncia italianizzata',`<div class="field"><label>Lingua</label><div class="seg" id="prLang">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${this.lang===k?'on':''}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="prIn">Testo da cantare</label><textarea id="prIn" placeholder="Scrivi o incolla qui il testo in lingua"></textarea></div>
      <div class="field"><label>Come si legge</label><div id="prOut" style="font-size:19px;line-height:1.6;color:var(--gold-hi);min-height:30px"></div></div>
      <div class="hint" style="font-size:12.5px">ṡ = s sonora · sh = “sc” di “scena” · ç = “ich” tedesco · ã õ ẽ = nasali francesi · ü ö = vocali turbate · (e) = e muta. È una guida: per i casi dubbi fa fede il maestro del coro.</div>`,
      `<button class="goldBtn" data-ok>${iconSvg('text')}Metti sulla pagina</button>`,{eyebrow:'Per Cantanti'});
    const upd=()=>{$('#prOut').textContent=PRON.conv($('#prIn').value,this.lang)};
    $('#prLang').onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;this.lang=b.dataset.l;$$('#prLang button').forEach(x=>x.classList.toggle('on',x===b));upd()};
    $('#prIn').oninput=upd;
    m2.querySelector('[data-ok]').onclick=()=>{ const t=$('#prOut').textContent.trim(); if(!t) return toast('Scrivi prima il testo'); closeLayers(); if(!ST.annotate) Anno.enter(); Anno.mode='text'; Anno.textMode='free'; Anno.buildBar(); Anno.pendingText=t; toast('Tocca la pagina dove scrivere la pronuncia',2600); };
  },
};

// Riconosce la lingua del testo (italiano, latino, francese, tedesco, spagnolo, inglese…).
function detectLang(text){
  const t=' '+String(text).toLowerCase().replace(/[-–—_.,;:!?¡¿"“”()]/g,' ').replace(/\s+/g,' ')+' ';
  const W={
    it:['il','lo','la','di','che','non','per','un','una','sono','mio','mia','amore','cuore','con','del','della','più','ti','mi','si','ha','ho','gli','ciel','io','tu','è'],
    la:['et','in','est','dei','deus','domine','dominus','qui','quae','quod','ad','cum','sanctus','gloria','agnus','pacem','nobis','tuam','tua','mundi','miserere','kyrie','eleison','christe','excelsis','amen','ave','maria','gratia','plena','tecum','benedictus','venit','nomine','spiritu','pater','filii','coeli','caeli','terra','sunt'],
    fr:['le','les','des','je','tu','vous','nous','est','et','une','dans','pour','mon','ma','votre','avec','qui','que','pas','ne','sur','au','aux','du','ce','cette','mes','tes','son','sa','ses','toi','moi','coeur','amour','ciel'],
    de:['der','die','das','und','ich','du','nicht','ist','ein','eine','mein','dein','mit','auf','zu','von','sich','wie','so','herz','liebe','gott','wir','ihr','sie','den','dem','des'],
    es:['el','los','las','y','que','de','en','un','una','mi','tu','con','por','para','es','no','corazón','amor','yo','te','se','del','al','muy','como'],
    en:['the','and','you','your','are','is','of','to','in','my','with','for','we','our','be','me','love','heart','all','this','that','will','shall','thy','thee','lord'],
  };
  const sc={}; for(const k in W){ sc[k]=0; for(const w of W[k]) if(t.includes(' '+w+' ')) sc[k]++; }
  if(/[éèêàçœ]/.test(t)) sc.fr+=2; if(/[äöüß]|sch/.test(t)) sc.de+=2; if(/[ñ¡¿]|[áíóú]/.test(t)) sc.es+=2; if(/[òù]/.test(t)) sc.it+=1;
  if(/\b\w+(ae|um|us|is|orum|ibus)\b/.test(t)) sc.la+=1; if(/\bth|w\w/.test(t)) sc.en+=1;
  const best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
  return best&&best[1]>0?best[0]:null;
}
