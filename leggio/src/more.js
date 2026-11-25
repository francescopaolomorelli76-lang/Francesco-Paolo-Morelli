// ============ Accordi e metronomo · Leggi una parola · Respiro · Timer in tutto schermo · Alleggerisci PDF · Testo e accordi dal web ============

// ---------- Accordi italiani/inglesi: tonalità riconosciuta → tutti gli accordi da inserire ----------
const CHORD_IT=['Do','Re','Mi','Fa','Sol','La','Si'], CHORD_EN=['C','D','E','F','G','A','B'], NAT=[0,2,4,5,7,9,11];
const PC_SH=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'], PC_FL=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const IT_FROM_EN={C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'};
const CH_Q=[ // [suffisso, intervalli, nome]
  ['',[0,4,7],'maggiore'],['m',[0,3,7],'minore'],['7',[0,4,7,10],'settima di dominante'],['maj7',[0,4,7,11],'settima maggiore'],['m7',[0,3,7,10],'minore settima'],
  ['dim',[0,3,6],'diminuito'],['m7♭5',[0,3,6,10],'semidiminuito'],['dim7',[0,3,6,9],'settima diminuita'],['aug',[0,4,8],'aumentato'],
  ['sus4',[0,5,7],'sospeso 4'],['sus2',[0,2,7],'sospeso 2'],['7sus4',[0,5,7,10],'7 sospeso'],['6',[0,4,7,9],'sesta'],['m6',[0,3,7,9],'minore sesta'],
  ['add9',[0,4,7,14],'con nona aggiunta'],['9',[0,4,7,10,14],'nona'],['maj9',[0,4,7,11,14],'nona maggiore'],['m9',[0,3,7,10,14],'minore nona'],['m(maj7)',[0,3,7,11],'minore con settima maggiore']];
const MAJ_SCALE=[0,2,4,5,7,9,11], MIN_SCALE=[0,2,3,5,7,8,10];
const ROMAN_MAJ=['I','ii','iii','IV','V','vi','vii°'], ROMAN_MIN=['i','ii°','III','iv','v','VI','VII'];
const Chords = {
  tonic:0, minor:false, lang:'it', tab:'key', pending:null, root:0, qual:0, bass:-1, note:'q', bpm:90, tname:false,
  flats(){ const fl=this.minor?[2,7,0,5,10,3,8]:[5,10,3,8,1,6]; return fl.includes(this.tonic)&&!(this.minor?false:false); },
  nm(pc,useFlat){ const base=(useFlat?PC_FL:PC_SH)[((pc%12)+12)%12]; return this.lang==='it'?base.replace(/^[A-G]/,m=>IT_FROM_EN[m]):base; },
  // tonalità scritta nello spartito: "Do maggiore", "Mi bemolle minore", "C major", "Am"
  parseKey(str){ if(!str) return null; const t=String(str).trim(); let m=t.match(/^(do|re|mi|fa|sol|la|si)\s*(diesis|bemolle|#|♯|b|♭)?\s*(maggiore|minore|magg|min|m)?/i);
    let name,acc,mode; if(m){ name=IT_FROM_EN&&Object.keys(IT_FROM_EN).find(k=>IT_FROM_EN[k].toLowerCase()===m[1].toLowerCase()); acc=m[2]; mode=m[3]; }
    else{ m=t.match(/^([A-Ga-g])\s*(#|♯|b|♭|sharp|flat)?\s*(major|minor|maj|min|m|M)?/); if(!m) return null; name=m[1].toUpperCase(); acc=m[2]; mode=m[3]; if(mode==='m'||/^min/i.test(mode||'')) mode='minore'; else if(!mode&&m[1]===m[1].toLowerCase()) mode='minore'; }
    if(!name) return null; let pc=NAT['CDEFGAB'.indexOf(name)]; if(acc&&/diesis|#|♯|sharp/i.test(acc)) pc++; if(acc&&/bemolle|♭|flat|^b$/i.test(acc)) pc--; return {tonic:((pc%12)+12)%12,minor:/^(minore|min|m)$/i.test(mode||'')||/^min/i.test(mode||'')}; },
  useFlats(){ const t=this.tonic; return this.minor?[2,7,0,5,10,3,8].includes(t):[5,10,3,8,1,6].includes(t); },
  chordName(root,suf,bass,fl){ return this.nm(root,fl)+suf+(bass!=null&&bass>=0&&bass%12!==root%12?'/'+this.nm(bass,fl):''); },
  notes(root,iv,fl){ return iv.map(i=>this.nm(root+i,fl)).join(' · '); },
  // tutti gli accordi utili della tonalità
  groups(){ const fl=this.useFlats(), sc=(this.minor?MIN_SCALE:MAJ_SCALE).map(i=>(this.tonic+i)%12), rom=this.minor?ROMAN_MIN:ROMAN_MAJ;
    const tri=this.minor?['m','dim','','m','m','','']:['','m','m','','','m','dim'], sev=this.minor?['m7','m7♭5','maj7','m7','m7','maj7','7']:['maj7','m7','m7','maj7','7','m7','m7♭5'];
    const mk=(root,suf,label)=>({n:this.chordName(root,suf,-1,fl),r:label||'',notes:this.notes(root,CH_Q.find(q=>q[0]===suf)[1],fl)});
    const G=[]; G.push({t:'Accordi della tonalità',l:sc.map((r,i)=>mk(r,tri[i],rom[i]))});
    G.push({t:'Con la settima',l:sc.map((r,i)=>mk(r,sev[i],rom[i]+'7'))});
    if(this.minor) G.push({t:'Minore armonico',l:[mk(sc[4],'','V'),mk(sc[4],'7','V7'),mk(sc[6]+1,'dim','vii°'),mk(sc[6]+1,'dim7','vii°7')]});
    else G.push({t:'Sospesi, sesta e nona',l:[mk(sc[0],'sus2','Isus2'),mk(sc[0],'sus4','Isus4'),mk(sc[0],'6','I6'),mk(sc[0],'add9','Iadd9'),mk(sc[3],'add9','IVadd9'),mk(sc[4],'sus4','Vsus4'),mk(sc[4],'7sus4','V7sus4'),mk(sc[4],'9','V9'),mk(sc[0],'maj9','Imaj9'),mk(sc[1],'m9','iim9')]});
    G.push({t:'Dominanti secondarie',l:[1,2,3,4,5].filter(d=>!(this.minor&&d===1)).map(d=>{ const target=sc[d]; return mk((target+7)%12,'7','V7/'+rom[d].replace('°','')); })});
    G.push({t:this.minor?'Prestiti e colore':'Prestiti dal modo minore',l:this.minor?[mk(sc[3],'','IV'),mk(sc[0],'','I (Picardia)'),mk((this.tonic+1)%12,'','♭II napoletano')]:[mk((this.tonic+10)%12,'','♭VII'),mk((this.tonic+8)%12,'','♭VI'),mk((this.tonic+3)%12,'','♭III'),mk(sc[3],'m','iv'),mk(sc[3],'m6','iv6'),mk((this.tonic+1)%12,'','♭II napoletano')]});
    return G; },
  open(tab){
    if(!ST.cur) return toast('Apri prima uno spartito');
    if(tab) this.tab=tab; const pk=this.parseKey(ST.cur.key); if(pk&&!this._set){ this.tonic=pk.tonic; this.minor=pk.minor; }
    const fl=this.useFlats();
    const keyNames=Array.from({length:12},(_,i)=>`<option value="${i}"${i===this.tonic?' selected':''}>${this.nm(i,[1,3,6,8,10].includes(i)?!this.minor?true:[0,5,10,3,8,1].includes(i)&&false:false)}</option>`).join('');
    const m=modal('Accordi e metronomo',`<div class="seg" id="chTab"><button data-t="key" class="${this.tab==='key'?'on':''}">Nella tonalità</button><button data-t="build" class="${this.tab==='build'?'on':''}">Costruisci</button><button data-t="tempo" class="${this.tab==='tempo'?'on':''}">Tempo metronomico</button></div>
      <div id="chBody"></div>`,null,{eyebrow:'Annota',id:'chordM'});
    m.querySelector('#chTab').onclick=e=>{ const b=e.target.closest('[data-t]'); if(b){ this.tab=b.dataset.t; this.draw(m); } };
    this.draw(m);
  },
  draw(m){
    $$('#chTab button',m).forEach(b=>b.classList.toggle('on',b.dataset.t===this.tab)); const B=$('#chBody',m), fl=this.useFlats();
    const langSeg=`<div class="seg" id="chLang"><button data-l="it" class="${this.lang==='it'?'on':''}">Italiano · Do Re Mi</button><button data-l="en" class="${this.lang==='en'?'on':''}">Inglese · C D E</button></div>`;
    const hook=()=>{ const L=$('#chLang',m); if(L) L.onclick=e=>{ const b=e.target.closest('[data-l]'); if(b){ this.lang=b.dataset.l; this.draw(m); } }; };
    const chips=l=>l.map(c=>`<button class="chChip" data-n="${esc(c.n)}" title="${esc(c.notes)}"><b>${esc(c.n)}</b>${c.r?`<small>${esc(c.r)}</small>`:''}</button>`).join('');
    if(this.tab==='key'){
      const found=this.parseKey(ST.cur.key);
      const tonics=Array.from({length:12},(_,i)=>`<option value="${i}"${i===this.tonic?' selected':''}>${this.nm(i,this.useFlats())}</option>`).join('');
      B.innerHTML=`<div class="hint" style="margin:8px 0">${found?`Tonalità dello spartito riconosciuta: <b>${esc(ST.cur.key)}</b>. Puoi cambiarla qui sotto.`:`Nessuna tonalità scritta nello spartito: scegli quella giusta.`}</div>
        ${langSeg}<div class="chKey"><label>Tonalità<select id="chTon">${tonics}</select></label><div class="seg" id="chMode"><button data-m="0" class="${!this.minor?'on':''}">maggiore</button><button data-m="1" class="${this.minor?'on':''}">minore</button></div></div>
        ${this.groups().map(g=>`<div class="chGrp"><div class="eyebrow">${esc(g.t)}</div><div class="chRow">${chips(g.l)}</div></div>`).join('')}
        <div class="hint">Tocca un accordo, poi tocca la pagina dove metterlo. Con il Dito ✋ lo sposti, lo cambi e lo ingrandisci.</div>`;
      B.onclick=e=>{ const c=e.target.closest('.chChip'); if(c) this.pick(c.dataset.n); };
      hook(); $('#chTon',B).onchange=e=>{ this.tonic=+e.target.value; this._set=1; this.draw(m); }; $('#chMode',B).onclick=e=>{ const b=e.target.closest('[data-m]'); if(b){ this.minor=b.dataset.m==='1'; this._set=1; this.draw(m); } };
    } else if(this.tab==='build'){
      const roots=Array.from({length:12},(_,i)=>`<button data-r="${i}" class="${this.root===i?'on':''}">${this.nm(i,fl)}</button>`).join('');
      const q=CH_Q[this.qual]; const name=this.chordName(this.root,q[0],this.bass,fl);
      B.innerHTML=`${langSeg}<div class="eyebrow" style="margin-top:12px">Nota di base</div><div class="seg wrapSeg" id="chRoot">${roots}</div>
        <div class="eyebrow" style="margin-top:12px">Specie</div><div class="seg wrapSeg" id="chQual">${CH_Q.map((x,i)=>`<button data-q="${i}" class="${this.qual===i?'on':''}">${x[0]||'maggiore'}</button>`).join('')}</div>
        <div class="eyebrow" style="margin-top:12px">Basso (rivolto, facoltativo)</div><div class="seg wrapSeg" id="chBass"><button data-b="-1" class="${this.bass<0?'on':''}">nessuno</button>${Array.from({length:12},(_,i)=>`<button data-b="${i}" class="${this.bass===i?'on':''}">${this.nm(i,fl)}</button>`).join('')}</div>
        <div class="chPrev"><div class="chBig">${esc(name)}</div><div class="hint">${esc(q[2])} · ${esc(this.notes(this.root,q[1],fl))}</div><button class="goldBtn" id="chUse">${iconSvg('plus')}Inserisci ${esc(name)}</button></div>`;
      hook(); $('#chRoot',B).onclick=e=>{ const b=e.target.closest('[data-r]'); if(b){ this.root=+b.dataset.r; this.draw(m); } }; $('#chQual',B).onclick=e=>{ const b=e.target.closest('[data-q]'); if(b){ this.qual=+b.dataset.q; this.draw(m); } }; $('#chBass',B).onclick=e=>{ const b=e.target.closest('[data-b]'); if(b){ this.bass=+b.dataset.b; this.draw(m); } };
      $('#chUse',B).onclick=()=>this.pick(name);
    } else {
      const names=[['Largo',40],['Adagio',66],['Andante',76],['Moderato',108],['Allegro',120],['Vivace',156],['Presto',176],['Prestissimo',200]], tn=()=>{ let r='Largo'; for(const [n,b] of names) if(this.bpm>=b) r=n; return r; };
      const notes=[['w','𝅝','semibreve',0x1D15D],['h','𝅗𝅥','minima',0x1D15E],['q','𝅘𝅥','semiminima',0x1D15F],['e','𝅘𝅥𝅮','croma',0x1D160],['qd','𝅘𝅥 .','semiminima puntata',0x1D15F]];
      B.innerHTML=`<div class="hint" style="margin:8px 0">Scrivi l'indicazione del tempo, per esempio <b>semiminima = 90</b>. Poi si modifica sulla pagina come ogni testo.</div>
        <div class="seg" id="tmNote">${notes.map(([k,g,n])=>`<button data-k="${k}" class="${this.note===k?'on':''}" title="${n}"><span class="tmG">${g}</span><small>${n}</small></button>`).join('')}</div>
        <div class="tmBpm"><button class="ghostBtn" data-d="-5">−5</button><button class="ghostBtn" data-d="-1">−1</button><input id="tmN" type="number" inputmode="numeric" min="20" max="300" value="${this.bpm}"><button class="ghostBtn" data-d="1">+1</button><button class="ghostBtn" data-d="5">+5</button></div>
        <label class="swRow"><input type="checkbox" id="tmName" ${this.tname?'checked':''}> Aggiungi il nome del tempo (<b id="tmWord">${tn()}</b>)</label>
        <div class="chPrev"><div class="chBig" id="tmPrev"></div><button class="goldBtn" id="tmUse">${iconSvg('plus')}Inserisci sulla pagina</button></div>`;
      const prev=()=>{ const g=notes.find(x=>x[0]===this.note); $('#tmPrev',B).textContent=`${this.tname?tn()+' ':''}${g[1]} = ${this.bpm}`; $('#tmWord',B).textContent=tn(); };
      prev(); $('#tmNote',B).onclick=e=>{ const b=e.target.closest('[data-k]'); if(b){ this.note=b.dataset.k; $$('#tmNote button',B).forEach(x=>x.classList.toggle('on',x===b)); prev(); } };
      B.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{ this.bpm=clamp(this.bpm+ +b.dataset.d,20,300); $('#tmN',B).value=this.bpm; prev(); });
      $('#tmN',B).oninput=e=>{ this.bpm=clamp(+e.target.value||90,20,300); prev(); }; $('#tmName',B).onchange=e=>{ this.tname=e.target.checked; prev(); };
      $('#tmUse',B).onclick=()=>{ const g=notes.find(x=>x[0]===this.note); this.pick({tempo:true,glyph:g[3],dot:this.note==='qd',text:`= ${this.bpm}`,name:this.tname?tn():''}); };
    }
  },
  // sceglie cosa mettere, poi si tocca la pagina (si possono mettere più accordi di seguito)
  pick(what){ closeLayers(); this.pending=what; if(!ST.annotate) Anno.enter(); Anno.mode='chord'; Anno.clearSel(); Anno.buildBar(); this.dock(); },
  dock(){ $('#chDock')?.remove(); const w=this.pending; if(!w) return; const label=typeof w==='string'?w:`${w.name?w.name+' ':''}♩ ${w.text}`;
    const d=document.createElement('div'); d.id='chDock'; d.className='pill'; d.innerHTML=`<span>Tocca la pagina per mettere <b>${esc(label)}</b></span><button class="ghostBtn" data-a="more">Altri…</button><button class="goldBtn sm" data-a="ok">${iconSvg('check')}Fine</button>`; $('#app').appendChild(d);
    d.onclick=e=>{ const a=e.target.closest('[data-a]')?.dataset.a; if(a==='ok') this.end(); if(a==='more') this.open(); }; },
  end(){ this.pending=null; $('#chDock')?.remove(); if(Anno.mode==='chord'){ Anno.mode='preset'; Anno.buildBar(); } },
  place(p){ const w=this.pending; if(!w) return; const A=Anno; A.push(); const lay=A.layer||0;
    if(typeof w==='string'){ A.strokes.push({t:'text',text:w,x:p[0],y:p[1],size:clamp(TStyle.size('chord')||.018,.012,.04),align:'c',font:'sans',bold:true,color:'#c0392b',alpha:1,layer:lay,chord:1}); }
    else{ const sz=.034; A.strokes.push({t:'stamp',g:{c:String.fromCodePoint(w.glyph)+(w.dot?String.fromCodePoint(0x1D16D):''),f:'m'},x:p[0]-.012,y:p[1],size:sz,color:'#111111',alpha:1,layer:lay});
      A.strokes.push({t:'text',text:(w.name?w.name+'  ':'')+w.text,x:p[0]+.008,y:p[1],size:.019,align:'l',font:'serif',bold:true,color:'#111111',alpha:1,layer:lay,tempo:1}); }
    A.redraw(); saveAnn(); A.buildBar(); },
};

// ---------- Leggi una parola: pronuncia e traduzione senza scrivere sulla pagina ----------
Lyr.peek=async function(p,e){
  if(!ST.cur) return; const st=(detectStaves()||[]).filter(s=>s.printed!==false); let idx=-1;
  for(let i=0;i<st.length;i++){ const nt=i<st.length-1?st[i+1].top:1, y1=Math.min(nt-st[i].gap*.2,st[i].bottom+st[i].gap*7); if(p[1]>=st[i].bottom&&p[1]<=y1+st[i].gap*.5){ idx=i; break; } }
  if(idx<0) return toast('Tocca una parola stampata sotto un rigo',2600);
  busy('Leggo la parola…'); this._pc=this._pc||{};
  try{ const key=ST.cur.id+'|'+ST.page+'|'+idx; let row=this._pc[key];
    if(!row){ const s=st[idx], nextTop=idx<st.length-1?st[idx+1].top:1; const tok=await readLyrics({...s,y0:s.bottom+s.gap*.3,y1:Math.min(nextTop-s.gap*.2,s.bottom+s.gap*7),gap:s.gap}); row=this._pc[key]={syl:this.normTokens(tok,tok.meta)}; }
    busy(); const L=row.syl; if(!L.length) return toast('Non leggo parole qui: prova a toccare più vicino al testo',3000);
    let k=0,bd=9; L.forEach((t,i)=>{ const d=Math.abs(t.x-p[0]); if(d<bd){ bd=d; k=i; } });
    let a=k,b=k; while(a>0&&(L[a-1].trail||L[a].lead)) a--; while(b<L.length-1&&L[b].trail) b++;
    const sy=L.slice(a,b+1), open=L[b].trail&&b===L.length-1, cont=L[a].lead&&a===0;
    const word=sy.map(t=>t.text).join(''), lang=this.lang&&ST.cur.style&&ST.cur.style.lyrLang||this.guess(L.map(t=>t.text).join(' '));
    const pr=pronSyl(sy.map(t=>t.text),lang,open), phrase=L.map(t=>t.text+(t.trail?'':' ')).join('').replace(/\s+/g,' ').trim();
    $('#pkPop')?.remove(); const d=document.createElement('div'); d.id='pkPop'; d.className='pop';
    d.innerHTML=`<div style="width:300px;display:grid;gap:10px"><div class="eyebrow">${esc((PRON.names[lang]||lang).split(' ')[0])}</div>
      <div style="font-family:var(--f-display);font-size:30px;line-height:1.1">${sy.map(t=>esc(t.text)).join('<span style="color:var(--gold)">-</span>')}</div>
      <div style="font-weight:700;color:#5aa0ff;font-size:19px">${pr.map(esc).join(' · ')}</div><div id="pkTr" style="font-family:var(--f-display);font-style:italic;color:#ff6b5e;font-size:19px;min-height:1.3em">…</div>
      ${open?`<div class="hint">La parola continua dopo: tocca anche la parte seguente.</div>`:''}${cont?`<div class="hint">Continua dal rigo prima: tocca anche la parte precedente.</div>`:''}
      <div class="hint" style="font-size:12.5px">Frase del rigo: ${esc(phrase)}</div>
      <div style="display:flex;gap:8px"><button class="ghostBtn" data-a="phr" style="flex:1">Traduci la frase</button><button class="goldBtn sm" data-a="ok">Chiudi</button></div></div>`;
    $('#app').appendChild(d); const r=inkCanvas.getBoundingClientRect(); d.style.position='fixed'; d.style.zIndex=70; d.style.left=clamp(r.left+p[0]*r.width-150,8,innerWidth-320)+'px'; d.style.top=clamp(r.top+p[1]*r.height+26,8,innerHeight-d.offsetHeight-8)+'px';
    const tr=async(txt,el)=>{ el.textContent='…'; try{ el.textContent=await Translate.text(txt,lang); }catch(err){ try{ el.textContent=offlineTranslate(txt,lang); }catch(e2){ el.textContent='Serve internet per tradurre'; } } };
    tr(word,$('#pkTr',d)); d.onclick=ev=>{ const a=ev.target.closest('[data-a]')?.dataset.a; if(a==='ok') d.remove(); if(a==='phr') tr(phrase,$('#pkTr',d)); };
    setTimeout(()=>document.addEventListener('pointerdown',function f(ev){ if(!ev.target.closest('#pkPop')&&!ev.target.closest('#inkCanvas')){ d.remove(); document.removeEventListener('pointerdown',f,true); } },true),50);
  }catch(err){ busy(); toast(err&&err.message||'Lettura non riuscita',3000); }
};

// ---------- Respiro: esercizi con animazione ----------
const RESP=[
  {id:'dia',n:'Respiro diaframmatico',d:'Inspira dal naso lasciando uscire la pancia, trattieni poco, espira lenta.',ph:[['Inspira',4],['Trattieni',2],['Espira',6]]},
  {id:'478',n:'4 · 7 · 8 (rilassante)',d:'Per calmare la tensione prima di cantare.',ph:[['Inspira',4],['Trattieni',7],['Espira',8]]},
  {id:'box',n:'Respiro a quadrato',d:'Quattro tempi uguali: regolare e stabile.',ph:[['Inspira',4],['Trattieni',4],['Espira',4],['Pausa',4]]},
  {id:'sss',n:'Sibilo «sss»',d:'Espira sibilando piano e a lungo: allena il sostegno del fiato.',ph:[['Inspira',4],['Sibila  sss',12]]},
  {id:'brr',n:'Trillo labiale «brrr»',d:'Fai vibrare le labbra con un fiato costante, senza scosse.',ph:[['Inspira',3],['Trillo  brrr',10]]},
  {id:'can',n:'Candela',d:'Soffia come per piegare una fiamma senza spegnerla.',ph:[['Inspira',4],['Soffia piano',9]]},
  {id:'cos',n:'Costole laterali',d:'Mani sui fianchi: senti le costole che si allargano.',ph:[['Inspira ai fianchi',5],['Trattieni',2],['Espira',7]]}];
const Resp = {
  sel:'dia', cycles:6, speed:1, run:false, t0:0, raf:0, snd:false,
  render(B){
    const ex=RESP.find(x=>x.id===this.sel);
    B.innerHTML=`<div class="hint">Scegli un esercizio e segui la sfera: si allarga quando inspiri, resta quando trattieni, si restringe quando espiri.</div>
      <div class="seg wrapSeg" id="rsSel">${RESP.map(x=>`<button data-x="${x.id}" class="${x.id===this.sel?'on':''}">${esc(x.n)}</button>`).join('')}</div>
      <div class="rsStage"><svg id="rsSvg" viewBox="0 0 300 300" aria-hidden="true"><defs><radialGradient id="rsG" cx="45%" cy="40%"><stop offset="0" stop-color="#f2d382"/><stop offset=".7" stop-color="#d6a84e"/><stop offset="1" stop-color="#8f6a22"/></radialGradient></defs>
        <circle cx="150" cy="150" r="128" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="3 7"/><circle id="rsRing" cx="150" cy="150" r="140" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 1000" transform="rotate(-90 150 150)" opacity=".7"/>
        <circle id="rsBall" cx="150" cy="150" r="50" fill="url(#rsG)"/><g id="rsRibs" stroke="#1b1406" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"><path d="M112 140q38 -14 76 0"/><path d="M108 156q42 -14 84 0"/><path d="M112 172q38 -14 76 0"/></g></svg>
        <div class="rsTxt"><b id="rsPh">Pronti</b><span id="rsCnt">${esc(ex.ph.map(p=>p[0].split('  ')[0]+' '+p[1]).join(' · '))}</span><small id="rsCy"></small></div></div>
      <div class="hint" id="rsD">${esc(ex.d)}</div>
      <div class="grid2"><div class="sl"><span>Ripetizioni<em id="rsCV">${this.cycles}</em></span><input type="range" id="rsC" min="2" max="20" value="${this.cycles}" style="--v:${(this.cycles-2)/18*100}%"></div>
        <div class="field"><label>Ritmo</label><div class="seg" id="rsSp">${[[1.35,'Lento'],[1,'Normale'],[.75,'Svelto']].map(([v,n])=>`<button data-v="${v}" class="${this.speed===v?'on':''}">${n}</button>`).join('')}</div></div></div>
      <label class="swRow"><input type="checkbox" id="rsSnd" ${this.snd?'checked':''}> Suono guida (un tono dolce a ogni fase)</label>
      <div style="display:flex;gap:10px"><button class="goldBtn" id="rsGo">${iconSvg(this.run?'stop':'play')}${this.run?'Ferma':'Inizia'}</button></div>`;
    $('#rsSel',B).onclick=e=>{ const b=e.target.closest('[data-x]'); if(b){ this.stop(); this.sel=b.dataset.x; this.render(B); } };
    const c=$('#rsC',B); c.oninput=()=>{ this.cycles=+c.value; $('#rsCV',B).textContent=c.value; c.style.setProperty('--v',(c.value-2)/18*100+'%'); };
    $('#rsSp',B).onclick=e=>{ const b=e.target.closest('[data-v]'); if(b){ this.speed=+b.dataset.v; $$('#rsSp button',B).forEach(x=>x.classList.toggle('on',x===b)); } };
    $('#rsSnd',B).onchange=e=>{ this.snd=e.target.checked; };
    $('#rsGo',B).onclick=()=>this.run?this.stop(B):this.start(B);
  },
  start(B){ this.run=true; this.t0=performance.now(); this.lastPh=-1; $('#rsGo').innerHTML=iconSvg('stop')+'Ferma'; const ex=RESP.find(x=>x.id===this.sel), seq=ex.ph.map(p=>[p[0],p[1]*this.speed]), total=seq.reduce((a,p)=>a+p[1],0);
    let lvl=0; const LV=seq.map(([nm])=>{ const st=lvl; if(/^Inspira/.test(nm)) lvl=1; else if(/^(Espira|Sibila|Trillo|Soffia)/.test(nm)) lvl=0; return [st,lvl]; });
    const step=now=>{ if(!this.run) return; const el=(now-this.t0)/1000, cyc=Math.floor(el/total);
      if(cyc>=this.cycles){ this.stop(); toast('Bravo: esercizio finito',2200); return; }
      let t=el%total, i=0; while(i<seq.length-1&&t>=seq[i][1]){ t-=seq[i][1]; i++; } const [nm,du]=seq[i], f=t/du, name=nm.split('  ')[0];
      const isIn=/^Inspira/.test(nm), isOut=/^(Espira|Sibila|Trillo|Soffia)/.test(nm); const ease=x=>.5-.5*Math.cos(Math.PI*x);
      const [l0,l1]=LV[i]; const lv=l0+(l1-l0)*ease(f), r=50+(112-50)*lv;     // sfera: piena dopo l'inspirazione, piccola dopo l'espirazione
      $('#rsBall').setAttribute('r',r.toFixed(1)); $('#rsRibs').style.transform=`scale(${(r/80).toFixed(3)})`; $('#rsRibs').style.transformOrigin='150px 156px';
      $('#rsPh').textContent=name; $('#rsCnt').textContent=Math.ceil(du-t)+' s'; $('#rsCy').textContent=`Ripetizione ${cyc+1} di ${this.cycles}`;
      $('#rsRing').setAttribute('stroke-dasharray',`${(f*880).toFixed(0)} 1000`);
      const key=cyc*10+i; if(key!==this.lastPh){ this.lastPh=key; if(this.snd) this.tone(isIn?392:isOut?262:330); try{ navigator.vibrate&&navigator.vibrate(15); }catch(e){} }
      this.raf=requestAnimationFrame(step); }; this.raf=requestAnimationFrame(step); },
  tone(f){ try{ ac(); const o=AC.createOscillator(), g=AC.createGain(), t=AC.currentTime; o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.12,t+.08); g.gain.exponentialRampToValueAtTime(.0001,t+1.2); o.connect(g).connect(AC.destination); o.start(t); o.stop(t+1.3); }catch(e){} },
  stop(){ this.run=false; cancelAnimationFrame(this.raf); const b=$('#rsGo'); if(b) b.innerHTML=iconSvg('play')+'Inizia'; const ph=$('#rsPh'); if(ph) ph.textContent='Pronti'; const ball=$('#rsBall'); if(ball) ball.setAttribute('r',50); },
};
(function(){ // scheda "Respiro" dentro Per Cantanti
  const r0=Singers.render, s0=Singers.stopAll, o0=Singers.open;
  Singers.open=async function(){ const r=await o0.apply(this,arguments); const t=$('#sgTabs'); if(t&&!t.querySelector('[data-t="resp"]')){ const b=document.createElement('button'); b.dataset.t='resp'; b.textContent='Respiro'; const p=t.querySelector('[data-t="piano"]'); t.insertBefore(b,p||t.querySelector('[data-t="pron"]')); } return r; };
  Singers.render=function(){ if(this.tab==='resp'){ $$('#sgTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===this.tab)); const B=$('#sgBody'); if(B) Resp.render(B); return; } return r0.apply(this,arguments); };
  Singers.stopAll=function(){ try{ Resp.stop(); }catch(e){} return s0.apply(this,arguments); };
})();

// ---------- Timer lavoro/pausa: pausa e ripresa, anche in tutto schermo ----------
Object.assign(Clock,{ paused:false, left:0,
  pause(){ if(!this.end||this.paused) return; this.left=this.end-Date.now(); this.paused=true; this.end=0; this.render(); toast('Timer in pausa',1400); },
  resume(){ if(!this.paused) return; this.end=Date.now()+this.left; this.paused=false; this.save(); this.render(); toast('Timer ripreso',1400); },
});
(function(){
  const r0=Clock.render, s0=Clock.start, st0=Clock.stop;
  Clock.start=function(){ this.paused=false; return s0.apply(this,arguments); };
  Clock.stop=function(){ this.paused=false; this.left=0; return st0.apply(this,arguments); };
  Clock.render=function(){ r0.apply(this,arguments);
    if(this.paused){ const tm=`<span class="ckT ${this.kind}">⏸ ${this.fmt(this.left)}</span>`; $$('.clockPill').forEach(el=>{ const h=el.innerHTML.replace(/<span class="ckT[^>]*>.*?<\/span>/,''); el.innerHTML=h+tm; el._h=null; }); }
    this.fsTimer(); };
  Clock.fsTimer=function(){ let d=$('#fsTimer'); if(!document.body.classList.contains('immersive')){ if(d) d.hidden=true; return; }
    if(!d){ d=document.createElement('div'); d.id='fsTimer'; d.className='pill'; $('#app').appendChild(d); d.onclick=e=>{ const a=e.target.closest('[data-a]')?.dataset.a; if(!a) return; if(a==='pause') this.pause(); if(a==='resume') this.resume(); if(a==='stop') this.stop(); if(a==='work') this.start(ST.settings.workMin||50,'lavoro'); if(a==='break') this.start(ST.settings.pauseMin||10,'pausa'); this.fsTimer(); }; }
    d.hidden=false; const run=this.end&&!this.paused;
    const html=this.paused?`<button data-a="resume" aria-label="Riprendi">▶ ${this.fmt(this.left)}</button><button data-a="stop" aria-label="Ferma">■</button>`:run?`<button data-a="pause" aria-label="Pausa">⏸ ${this.fmt(this.end-Date.now())}</button><button data-a="stop" aria-label="Ferma">■</button>`:`<button data-a="work">⏱ Lavoro ${ST.settings.workMin||50}</button><button data-a="break">☕ Pausa ${ST.settings.pauseMin||10}</button>`;
    if(d._h!==html){ d._h=html; d.innerHTML=html; } };
  // il pannello del timer ha anche Pausa/Riprendi
  const o0=Clock.open; Clock.open=function(el){ const r=o0.apply(this,arguments); const stop=$('#ckStop'); if(stop&&!$('#ckPz')){ const b=document.createElement('button'); b.className='ghostBtn'; b.id='ckPz'; b.textContent=this.paused?'▶ Riprendi':'⏸ Pausa'; b.onclick=()=>{ this.paused?this.resume():this.pause(); closeLayers(); }; stop.parentNode.insertBefore(b,stop); } return r; };
})();

// ---------- Tutto schermo veloce: si entra subito, la pagina si adatta con la scala e si ridisegna a riposo ----------
FS.immersive=function(on){
  document.body.classList.toggle('immersive',on); if(on){ closeSides(); setBars(false,false); } else setBars(true,true); $$('[data-act="fullscreen"]').forEach(b=>b.classList.toggle('on',on));
  try{ const W=stage.clientWidth, H=stage.clientHeight, w=pageWrap.offsetWidth, h=pageWrap.offsetHeight; if(w&&h&&Zoom.z===1){ const f=Math.min((W-16)/w,(H-16)/h); if(isFinite(f)&&Math.abs(f-1)>.02){ pageWrap.style.transform=`scale(${f.toFixed(4)})`; } } }catch(e){}
  clearTimeout(this._rd); this._rd=setTimeout(()=>{ pageWrap.style.transform=''; renderPage(0,{noPrefetch:true}); },420);
  try{ Clock.fsTimer(); }catch(e){}
};
FS.toggle=async function(){
  if(this.isOn()){ this.immersive(false); try{ if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); else if(document.webkitFullscreenElement) document.webkitExitFullscreen(); }catch(e){} return; }
  const el=document.documentElement; this.immersive(true); let ok=false;       // prima si nascondono le barre (subito), poi si chiede lo schermo intero
  try{ if(el.requestFullscreen){ el.requestFullscreen({navigationUI:'hide'}).catch(()=>{}); ok=true; } else if(el.webkitRequestFullscreen){ el.webkitRequestFullscreen(); ok=true; } }catch(e){ ok=false; }
  if(!ok&&!this.standalone()) this.tip(); else toast('Tutto schermo · tieni premuto un bordo per i comandi',2400);
};

// ---------- PDF troppo pesante: si alleggerisce prima di importarlo ----------
const LIGHT_MIN=18*1048576;
async function lightenPdf(bytes,onProgress){
  const src=await pdfjsLib.getDocument({data:bytes.slice(0)}).promise; const out=await PDFLib.PDFDocument.create(); const n=src.numPages;
  for(let i=1;i<=n;i++){
    const pg=await src.getPage(i); const v1=pg.getViewport({scale:1}); const k=Math.min(2.2,1500/Math.max(v1.width,v1.height)); const vp=pg.getViewport({scale:k});
    const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height); const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:x,viewport:vp}).promise; const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.72)); const img=await out.embedJpg(await blob.arrayBuffer());
    out.addPage([v1.width,v1.height]).drawImage(img,{x:0,y:0,width:v1.width,height:v1.height}); c.width=c.height=1; try{ pg.cleanup(); }catch(e){} if(onProgress) onProgress(i,n); await new Promise(r=>setTimeout(r,0));
  }
  src.destroy(); return (await out.save()).buffer;
}
(function(){ const imp0=importPdf;
  importPdf=async function(bytes,meta){ meta=meta||{};
    if(bytes.byteLength>LIGHT_MIN&&!meta.light&&!(window.Dups&&Dups.quiet)){
      const mb=(bytes.byteLength/1048576).toFixed(0);
      const c=await new Promise(res=>{ busy(); const m=modal('PDF molto pesante',`<div class="hint" style="font-size:16px">“${esc(meta.title||meta.file||'Questo PDF')}” pesa <b>${mb} MB</b>: su iPad rallenta e può far chiudere l'app.<br>Lo <b>alleggerisco</b> prima di importarlo (pagine più leggere, stessa lettura)?</div><div class="hint" style="font-size:13px">Le pagine diventano immagini nitide: il testo non si può più selezionare.</div>`,
        `<button class="ghostBtn" data-no>Importa com'è</button><button class="goldBtn" data-yes>${iconSvg('wand')}Alleggerisci e importa</button>`,{sticky:true}); m.querySelector('[data-no]').onclick=()=>{ closeLayers(); res('no'); }; m.querySelector('[data-yes]').onclick=()=>{ closeLayers(); res('yes'); }; });
      if(c==='yes'){ try{ busy('Alleggerisco il PDF…'); const light=await lightenPdf(bytes,(i,n)=>busy(`Alleggerisco il PDF… pagina ${i} di ${n}`)); busy(); if(light.byteLength<bytes.byteLength*.9){ toast(`Alleggerito: da ${mb} MB a ${(light.byteLength/1048576).toFixed(1)} MB`,3200); bytes=light; meta={...meta,light:1}; } else toast('Era già leggero: lo importo com\'è',2400); }catch(e){ busy(); toast('Non sono riuscito ad alleggerirlo: lo importo com\'è',3000); } }
    }
    return imp0.call(this,bytes,meta); };
})();

// ---------- Testo e accordi (musica pop) → spartito PDF ----------
const CHORD_TOK=/^(?:[A-G]|Do|Re|Mi|Fa|Sol|La|Si)(?:#|b|♯|♭)?(?:maj|min|dim|aug|sus|add|m|M|\+|°|ø|-)?\d*(?:\((?:[#b♯♭+-]?\d+|add\d+|maj\d*)\))?(?:sus\d|add\d+|[#b♯♭+-]\d+|\d+)*(?:\/(?:[A-G]|Do|Re|Mi|Fa|Sol|La|Si)(?:#|b|♯|♭)?)?$/;
const ChordSheet = {
  isChordLine(l){ const t=l.trim().split(/\s+/).filter(Boolean); if(!t.length||t.length>24) return false; const n=t.filter(x=>CHORD_TOK.test(x.replace(/[|()]/g,''))||/^[|%x\-–]+$/.test(x)).length; return n>=Math.max(1,Math.ceil(t.length*.7)); },
  fromHtml(html){ const d=new DOMParser().parseFromString(html,'text/html'); d.querySelectorAll('script,style,noscript,nav,header,footer').forEach(n=>n.parentNode&&n.parentNode.removeChild(n)); const pre=[...d.querySelectorAll('pre')].sort((a,b)=>b.textContent.length-a.textContent.length)[0];
    let txt=pre?pre.textContent:(()=>{ d.querySelectorAll('br').forEach(b=>b.replaceWith('\n')); return d.body?d.body.innerText||d.body.textContent:''; })(); return {text:txt.replace(/\r/g,''),title:(d.title||'').replace(/\s*[|\-–].*$/,'').trim()}; },
  stats(text){ const L=text.split('\n'); const ch=L.filter(l=>this.isChordLine(l)).length; return {lines:L.length,chords:ch}; },
  safe(s){ return String(s).replace(/♯/g,'#').replace(/♭/g,'b').replace(/[^\x20-\x7E -ÿ]/g,'?').replace(/\t/g,'    '); },
  async toPdf(text,title){
    const doc=await PDFLib.PDFDocument.create(); const reg=await doc.embedFont(PDFLib.StandardFonts.Courier), bold=await doc.embedFont(PDFLib.StandardFonts.CourierBold), head=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const lines=this.safe(text).split('\n').map(l=>l.replace(/\s+$/,'')); const W=595, H=842, M=48; const maxLen=Math.max(30,...lines.map(l=>l.length)); const fs=Math.max(7,Math.min(11.5,(W-2*M)/(maxLen*.6))), lh=fs*1.32;
    let page=doc.addPage([W,H]), y=H-M; const t=this.safe(title||'Testo e accordi'); page.drawText(t,{x:M,y:y-14,size:18,font:head,color:PDFLib.rgb(.1,.09,.07)}); y-=34;
    const blank=l=>!l.trim();
    for(let i=0;i<lines.length;i++){ const l=lines[i]; const isCh=this.isChordLine(l); const need=isCh&&i+1<lines.length&&!blank(lines[i+1])?lh*2:lh; if(y-need<M){ page=doc.addPage([W,H]); y=H-M; }
      if(blank(l)){ y-=lh*.6; continue; }
      if(isCh){ page.drawText(l,{x:M,y:y-fs,size:fs,font:bold,color:PDFLib.rgb(.72,.2,.12)}); } else if(/^\s*[\[(]?(strofa|ritornello|bridge|intro|outro|verse|chorus|pre-chorus|solo|coda)[\])]?:?/i.test(l)) page.drawText(l,{x:M,y:y-fs,size:fs,font:bold,color:PDFLib.rgb(.1,.09,.07)}); else page.drawText(l,{x:M,y:y-fs,size:fs,font:reg,color:PDFLib.rgb(.1,.09,.07)});
      y-=lh; }
    return (await doc.save()).buffer; },
  async import(text,title){ const t=(title||'Brano pop').trim(); busy('Creo lo spartito…'); try{ const bytes=await this.toPdf(text,t); const sc=await addScore(bytes,{title:t,file:t+'.pdf',genre:'Pop',tags:['accordi']}); busy(); renderLibrary(); await openScore(sc.id); toast('Testo e accordi importati: puoi annotarli come ogni spartito',3200); }catch(e){ busy(); toast('Non riesco a creare lo spartito: '+(e.message||e),3600); } },
  ask(text,title){ closeLayers(); const st=text?this.stats(text):{lines:0,chords:0};
    const m=modal('Testo e accordi',`<div class="hint">Incolla qui il brano: i nomi degli accordi sopra le parole (Do, Sol7, Am, F#m7/C#…). Mozart li mette in rosso e allinea tutto, pronto da annotare e da suonare.</div>
      <div class="field"><label for="csT">Titolo</label><input id="csT" value="${esc(title||'')}" placeholder="Titolo e artista"></div>
      <div class="field"><label for="csX">Testo con accordi</label><textarea id="csX" rows="12" spellcheck="false" style="font-family:ui-monospace,Menlo,monospace;font-size:14px;white-space:pre">${esc(text||'')}</textarea></div>
      <div class="hint" id="csI">${st.chords?`Trovate ${st.chords} righe di accordi.`:''}</div>`,
      `<button class="ghostBtn" data-no>Annulla</button><button class="goldBtn" data-go>${iconSvg('plusDoc')}Crea lo spartito</button>`,{eyebrow:'Importa'});
    const up=()=>{ const s=this.stats($('#csX').value); $('#csI').textContent=s.chords?`Trovate ${s.chords} righe di accordi su ${s.lines}.`:'Non vedo righe di accordi: va bene lo stesso, si importa come testo.'; }; $('#csX').oninput=up; up();
    m.querySelector('[data-no]').onclick=closeLayers; m.querySelector('[data-go]').onclick=()=>{ const x=$('#csX').value; if(!x.trim()) return toast('Incolla prima il testo'); closeLayers(); this.import(x,$('#csT').value); }; },
};
(function(){ // WebImport: pagine con testo e accordi
  const g0=WebImport.go, o0=WebImport.open;
  WebImport.open=function(){ const r=o0.apply(this,arguments); const f=$('.modal .mFoot'); if(f&&!$('#wiChord')){ const b=document.createElement('button'); b.className='ghostBtn'; b.id='wiChord'; b.textContent='🎸 Testo e accordi'; b.onclick=()=>ChordSheet.ask(''); f.insertBefore(b,f.firstChild); } return r; };
  const get0=WebImport.get; WebImport.go=async function(raw){
    const url=this.fixUrl(raw); if(!url) return toast('Incolla un indirizzo');
    // prova prima: PDF/foto come sempre; se è una pagina con testo e accordi, la propone
    const orig=window.toast; let handled=false;
    try{ busy('Scarico…'); const r=await this.get(url); busy(); const head=new Uint8Array(r.bytes.slice(0,8)); const pdf=String.fromCharCode(...head.slice(0,5))==='%PDF-', img=/^image\//.test(r.type)||(head[0]===0xFF&&head[1]===0xD8)||(head[0]===0x89&&head[1]===0x50);
      if(!pdf&&!img){ const {text,title}=ChordSheet.fromHtml(new TextDecoder().decode(r.bytes)); const s=ChordSheet.stats(text); if(s.chords>=3){ handled=true; ChordSheet.ask(text,title||this.nameFrom(url,r.name)); return; } }
    }catch(e){ busy(); }
    if(!handled) return g0.call(this,raw); };
})();
