// ============ Canzoniere: indice delle canzoni di uno spartito, ricerca immediata, estrazione leggera ============
// Il "Primo Canzoniere di Mbutozone" è già indicizzato (nessuna elaborazione). Per gli altri canzonieri con indice si legge solo
// il testo delle ultime pagine (niente OCR, niente scansione dell'intero PDF) e il risultato resta salvato nello spartito.
const Canz = {
  CATS:{I:'Italiani',IV:'Italiani vari',N:'Internazionali',NV:'Internazionali vari'},
  norm(t){ return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); },
  isMbuto(sc){ const n=this.norm((sc.title||'')+' '+(sc.file||'')); return /canzoniere/.test(n)&&/mbuto/.test(n)||(sc.pages===264&&/canzoniere/.test(n)); },
  built(sc){ // indice già pronto: titolo, artista, categoria, pagina (0 = prima pagina del PDF)
    sc.songs=CANZ_DATA.map(r=>({t:r[0],a:r[1],c:r[2],p:r[3]})); sc.songsEnd=261; return sc.songs; },
  async attach(sc,quiet){
    if(!sc||sc.songs||sc.noSongs) return sc&&sc.songs;
    if(this.isMbuto(sc)){ this.built(sc); await DB.putScore(sc); if(!quiet) toast(`Canzoniere riconosciuto: ${sc.songs.length} canzoni. Cercale con la lente in alto o da Attrezzi → Canzoni`,4200); return sc.songs; }
    if(ST.cur===sc&&ST.doc&&sc.pages>=30){ let r=null; try{ r=await this.detect(sc); }catch(e){} if(r&&r.songs.length>=12){ sc.songs=r.songs; sc.songsEnd=r.end; await DB.putScore(sc); if(!quiet) toast(`Trovato l'indice: ${r.songs.length} canzoni. Cercale con la lente in alto`,4200); return sc.songs; } }
    sc.noSongs=1; DB.putScore(sc); return null; },
  // indice generico: solo le ultime pagine, solo se hanno un testo
  async detect(sc){
    const doc=ST.doc, n=doc.numPages, found=[]; let h=0;
    for(let p=n;p>=Math.max(1,n-8);p--){ const pg=await doc.getPage(p); const tc=await pg.getTextContent(); if(/indice|sommario|elenco/i.test(tc.items.slice(0,8).map(i=>i.str).join(' '))){ h=p; break; } }
    if(h) for(let p=h;p<=n;p++){ const pg=await doc.getPage(p); found.push({p,pg,tc:await pg.getTextContent()}); }
    if(!found.length) return null; const raw=[]; const first=found[0].p;
    for(const f of found){ const vp=f.pg.getViewport({scale:1}), W=vp.width; const items=f.tc.items.filter(i=>i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],s:i.str,w:i.width||0}));
      // due colonne: il numero di pagina della colonna di sinistra è l'ultimo oggetto prima della colonna di destra
      const nums=items.filter(i=>/^\d{1,3}$/.test(i.s.trim())&&i.x>W*.4&&i.x<W*.58); const thr=nums.length>=4?Math.max(...nums.map(i=>i.x+i.w))+2:W+1;
      const cols=thr>W?[items]:[items.filter(i=>i.x<thr),items.filter(i=>i.x>=thr)];
      for(const col of cols){ const L=[]; col.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(i=>{ const l=L[L.length-1]; if(l&&Math.abs(l.y-i.y)<3) l.t.push(i); else L.push({y:i.y,t:[i]}); });
        L.forEach(l=>raw.push(l.t.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').replace(/[„‟’]/g,"'").replace(/\s+/g,' ').trim())); } }
    const songs=[]; let cat='', art='';
    for(const t of raw){ if(!t||/^(indice|sommario|torna|primo canzoniere)/i.test(t)) continue; const m=t.match(/^(.*?)\s*(\d{1,3})$/);
      if(/^\d{1,3}$/.test(t)&&songs.length){ if(songs[songs.length-1].pr==null) songs[songs.length-1].pr=+t; continue; } if(!m){ songs.push({t,a:art,c:cat,pr:null}); continue; }
      const name=m[1].trim(), pr=+m[2]; if(name.length>2&&name===name.toUpperCase()&&/[A-ZÀ-Ü]{2}/.test(name)){ if(/^ARTISTI /.test(name)) cat=name; else art=name.toLowerCase().replace(/(^|[\s'-])\S/g,c=>c.toUpperCase()); continue; }
      let tt=name, aa=art; if(/ - /.test(name)&&!art){ const k=name.lastIndexOf(' - '); tt=name.slice(0,k).trim(); aa=name.slice(k+3).trim(); } songs.push({t:tt,a:aa,c:'',pr}); }
    this._dbg={raw,songs}; const S=songs.filter(s=>s.pr!=null&&s.t.length>1); if(S.length<12) return null;
    // numero stampato → pagina del PDF: si prova con 3 scarti e si controlla che il titolo ci sia davvero
    let best=0, ok=-1; for(const off of [0,1,2,-1]){ let hit=0; for(const s of S.slice(0,5)){ const idx=s.pr+off-1; if(idx<0||idx>=n) continue; const pg=await doc.getPage(idx+1); const txt=this.norm((await pg.getTextContent()).items.map(i=>i.str).join(' ')).replace(/ /g,''); if(txt.includes(this.norm(s.t).replace(/ /g,'').slice(0,10))) hit++; } if(hit>ok){ ok=hit; best=off; } }
    if(ok<2) return null; return {songs:S.map(s=>({t:s.t,a:s.a,c:'',p:s.pr+best-1})),end:first-1}; },
  // fine di una canzone = pagina prima della successiva (o dell'indice)
  range(sc,s){ const all=[...new Set(sc.songs.map(x=>x.p))].sort((a,b)=>a-b); const nx=all.find(p=>p>s.p); return [s.p,Math.min((nx!=null?nx-1:(sc.songsEnd!=null?sc.songsEnd:sc.pages)-1),sc.pages-1)]; },
  find(q,list){ const t=this.norm(q).split(' ').filter(Boolean); if(!t.length) return list; return list.filter(s=>{ const h=' '+this.norm(s.t+' '+s.a)+' '; return t.every(w=>h.includes(w)); }); },
  rowHtml(s,sc,showSc){ return `<div class="item czRow" data-p="${s.p}"${sc?` data-s="${sc.id}"`:''}><div class="tx"><div class="tt">${esc(s.t)}</div><div class="st">${esc(s.a||'')}${s.a?' · ':''}pag. ${s.p+1}${showSc?' · '+esc(sc.title):''}</div></div></div>`; },
  open(){
    const sc=ST.cur; if(!sc) return toast('Apri prima uno spartito');
    if(!sc.songs){ this.attach(sc).then(r=>{ if(r) this.open(); else toast('In questo spartito non trovo un indice di canzoni',3200); }); return; }
    const m=modal('Canzoni',`<div class="hint" style="margin-bottom:8px"><b>${esc(sc.title)}</b> · ${sc.songs.length} canzoni. Scrivi titolo o artista: la lista si restringe subito. Tocca per aprire la pagina.</div>
      <label class="search"><svg class="i" data-i="search"></svg><input id="czQ" type="search" placeholder="Cerca titolo o artista" autocapitalize="off" autocorrect="off"></label>
      <div class="seg" id="czC" style="margin:10px 0"><button data-c="" class="on">Tutte</button>${[...new Set(sc.songs.map(s=>s.c).filter(Boolean))].map(c=>`<button data-c="${c}">${this.CATS[c]||c}</button>`).join('')}</div>
      <div id="czL" class="czL"></div>`,null,{eyebrow:'Canzoniere',id:'czM'});
    let cat=''; const draw=()=>{ const q=$('#czQ',m).value; let r=this.find(q,sc.songs.filter(s=>!cat||s.c===cat)); const tot=r.length; r=r.slice(0,80);
      $('#czL',m).innerHTML=r.map(s=>`<div class="item czRow" data-p="${s.p}"><div class="tx"><div class="tt">${esc(s.t)}</div><div class="st">${esc(s.a||'')}${s.a?' · ':''}pag. ${s.p+1}</div></div><button class="ghostBtn czX" data-x="${s.p}" title="Estrai in uno spartito a parte" aria-label="Estrai">${iconSvg('plusDoc')}</button></div>`).join('')+(tot>80?`<div class="hint">… altre ${tot-80}: scrivi più lettere.</div>`:'')||'<div class="empty">Nessuna canzone trovata.</div>'; };
    $('#czQ',m).oninput=debounce(draw,60); $('#czC',m).onclick=e=>{ const b=e.target.closest('[data-c]'); if(!b) return; cat=b.dataset.c; $$('#czC button',m).forEach(x=>x.classList.toggle('on',x===b)); draw(); };
    $('#czL',m).onclick=e=>{ const x=e.target.closest('[data-x]'), r=e.target.closest('[data-p]'); if(x){ e.stopPropagation(); this.extract(sc,sc.songs.find(s=>s.p===+x.dataset.x)); return; } if(r){ closeLayers(); ST.page=+r.dataset.p; renderPage(0); toast('Pagina '+(+r.dataset.p+1),1200); } };
    draw(); setTimeout(()=>$('#czQ',m).focus(),60); },
  // estrae solo le pagine della canzone in uno spartito a parte e la mette nel Songbook
  async extract(sc,s){ if(!s) return; busy(`Estraggo “${s.t}”…`);
    try{ const [a,b]=this.range(sc,s); const src=await PDFLib.PDFDocument.load(await getBytes(sc),{ignoreEncryption:true}); const out=await PDFLib.PDFDocument.create(); const idx=[]; for(let i=a;i<=b;i++) idx.push(i); (await out.copyPages(src,idx)).forEach(p=>out.addPage(p));
      const n=await addScore((await out.save()).buffer,{title:s.t,file:s.t+'.pdf',composer:s.a||'',genre:'Pop',tags:['canzoniere']}); Songbook.add(n.id); busy(); renderLibrary();
      toast(`“${s.t}” estratta (${idx.length} ${idx.length===1?'pagina':'pagine'}) e aggiunta al Songbook`,3400); }
    catch(e){ busy(); toast('Non riesco a estrarla: '+(e.message||e),3400); } },
};
ACTIONS.songs=()=>{ closeSides(); Canz.open(); };
// la lente in alto cerca anche dentro i canzonieri: titolo → pagina, subito
showSearchPop=function(el){
  const p=popover(el,`<label class="search" style="min-width:320px"><svg class="i" data-i="search"></svg><input id="qIn" type="search" placeholder="Cerca spartiti e canzoni" autocapitalize="off" autocorrect="off"></label><div id="qRes" style="margin-top:8px;max-height:56vh;overflow:auto"></div>`,{id:'searchPop'});
  const run=()=>{ const q=$('#qIn').value.trim(), ql=q.toLowerCase();
    const sc=ST.scores.filter(s=>!ql||(s.title+' '+s.composer+' '+(s.tags||[]).join(' ')).toLowerCase().includes(ql)).sort(byTitle).slice(0,20);
    let songs=[]; if(q.length>=2) ST.scores.forEach(s=>{ if(s.songs) Canz.find(q,s.songs).slice(0,25).forEach(x=>songs.push([x,s])); }); songs=songs.slice(0,40);
    $('#qRes').innerHTML=(songs.length?`<div class="eyebrow" style="margin:6px 4px">Canzoni</div>`+songs.map(([x,s])=>Canz.rowHtml(x,s,true)).join(''):'')+(sc.length?`<div class="eyebrow" style="margin:8px 4px 2px">Spartiti</div>`+sc.map(s=>`<div class="item" data-o="${s.id}"><div class="tx"><div class="tt">${esc(s.title)}</div><div class="st">${esc(s.composer)}</div></div></div>`).join(''):'')||'<div class="empty">Nessun risultato.</div>'; };
  $('#qIn').oninput=debounce(run,60); run(); setTimeout(()=>$('#qIn').focus(),30);
  p.onclick=e=>{ const r=e.target.closest('.czRow'); if(r){ closeLayers(); const id=r.dataset.s, pg=+r.dataset.p; if(ST.cur&&ST.cur.id===id){ ST.page=pg; renderPage(0); } else openScore(id,pg); return; } const o=e.target.closest('[data-o]'); if(o){ closeLayers(); openScore(o.dataset.o); } }; };
// riconoscimento automatico all'importazione e all'apertura (leggero: l'indice pronto non costa nulla)
(function(){ const a0=addScore; addScore=async function(){ const sc=await a0.apply(this,arguments); try{ if(Canz.isMbuto(sc)){ Canz.built(sc); await DB.putScore(sc); setTimeout(()=>toast(`Canzoniere riconosciuto: ${sc.songs.length} canzoni. Cercale con la lente in alto`,4200),600); } }catch(e){} return sc; };
  const o0=openScore; openScore=async function(){ const r=await o0.apply(this,arguments); try{ const sc=ST.cur; if(sc&&!sc.songs&&!sc.noSongs&&sc.pages>=30) (window.requestIdleCallback||setTimeout)(()=>Canz.attach(sc,true),{timeout:4000}); }catch(e){} return r; }; })();
