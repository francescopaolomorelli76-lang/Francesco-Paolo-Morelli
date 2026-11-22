// ================= Import forScore guidato (PDF mancanti) · doppioni: trovarli e toglierli =================

// ---------- Import forScore: i dati restano salvati, ogni PDF importato dopo riceve titolo, compositore, etichette, setlist, testi e disegni ----------
Object.assign(FS4,{
  async persistMeta(byFile,sls){
    const old=(await DB.get('fs4meta'))||{recs:{},setlists:[],files:[]}; const recs=old.recs||{};
    for(const [k,r] of byFile) recs[k]={...(recs[k]||{}),...r};
    const files=new Set(old.files||[]); (this.fs&&this.fs.files?[...this.fs.files]:[]).forEach(f=>files.add(f)); byFile.forEach(r=>{ if(r.file) files.add(r.file); });
    const setlists=[...(old.setlists||[])]; for(const s of sls){ const i=setlists.findIndex(x=>x.name===s.name); if(i>=0) setlists[i]=s; else setlists.push(s); }
    await DB.set('fs4meta',{recs,setlists,files:[...files]}); this.meta=null; await this.refreshMiss();
  },
  async loadMeta(){ if(!this.meta) this.meta=(await DB.get('fs4meta'))||{recs:{},setlists:[],files:[]}; return this.meta; },
  async applyMeta(sc){ const m=await this.loadMeta(); const r=m.recs&&m.recs[normName(sc.file||sc.title)]; if(!r) return false;
    if(r.title) sc.title=r.title; if(r.composer) sc.composer=r.composer; if(r.genre) sc.genre=r.genre; if(r.key) sc.key=r.key;
    if(r.tags&&r.tags.length) sc.tags=[...new Set([...(sc.tags||[]),...r.tags])]; sc.fsMeta=1; await DB.putScore(sc); return true; },
  async syncSetlists(){ const m=await this.loadMeta(); let ch=0;
    for(const s of m.setlists||[]){ const ids=(s.files||[]).map(f=>ST.scores.find(sc=>normName(sc.file||sc.title)===normName(f))?.id).filter(Boolean); if(!ids.length) continue; const name=s.name||'Setlist forScore';
      const ex=ST.setlists.find(x=>x.name===name); if(ex){ const merged=[...ids,...ex.items.filter(i=>!ids.includes(i))]; if(merged.join()!==ex.items.join()){ ex.items=merged; ch++; } } else { ST.setlists.push({id:uid(),name,items:ids}); ch++; } }
    if(ch){ saveSetlists(); } return ch; },
  async missing(){ const m=await this.loadMeta(); const have=new Set(ST.scores.map(s=>normName(s.file||s.title))); return (m.files||[]).filter(f=>!have.has(normName(f))); },
  async refreshMiss(){ try{ this.missCount=(await this.missing()).length; }catch(e){ this.missCount=0; } },
  pickMissing(){ const f=$('#filePdf'); f.value=''; f.onchange=()=>{ const fl=[...f.files]; if(fl.length) this.importMissing(fl); }; f.click(); },
  // importa molti PDF insieme (quelli già presenti si saltano da soli) e applica i dati di forScore
  async importMissing(files){
    Conflict.reset(); Conflict.all='skip'; Dups.quiet=true; let ok=0, skip=0; const errs=[];
    for(let i=0;i<files.length;i++){ const f=files[i]; busy(`Importo ${i+1} di ${files.length}: ${f.name}`);
      try{ if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'){ continue; }
        const sc=await importPdf(await f.arrayBuffer(),{title:f.name.replace(/\.pdf$/i,'').replace(/_+/g,' ').trim(),file:f.name,fromFile:true,tags:['forScore']}); if(sc) ok++; else skip++; }
      catch(e){ errs.push(f.name); } await sleep(0); }
    const sl=await this.syncSetlists(); busy(); Dups.quiet=false; await this.refreshMiss(); renderLibrary();
    this.report({pdfs:ok,dups:skip,matched:ok,setlists:sl,errors:errs,fsFiles:(await this.loadMeta()).files||[],resume:true,annApplied:0});
  },
  report(r){
    const li=(n,t)=>`<div class="item" style="min-height:46px"><span class="chk" style="border-color:var(--gold);color:var(--gold-hi);font-weight:800;font-size:12px;width:auto;min-width:26px;padding:0 6px;border-radius:13px">${n}</span><div class="tx"><div class="tt" style="font-size:15.5px">${t}</div></div></div>`;
    (async()=>{
      const miss=await this.missing(), total=((await this.loadMeta()).files||[]).length;
      let h=li(r.pdfs,r.pdfs===1?'spartito importato':'spartiti importati')+(r.dups?li(r.dups,'già presenti, saltati'):'')+li(r.matched,'spartiti con titolo, compositore o etichette da forScore')+li(r.setlists,r.setlists===1?'setlist creata o aggiornata':'setlist create o aggiornate');
      if(r.annFiles||r.resume) h+=li(r.annApplied||0,'spartiti con testi e disegni di forScore applicati');
      if(total&&miss.length){ const done=total-miss.length, pc=Math.round(done/total*100);
        h+=`<div class="fsBox"><b>${miss.length===total?'Questo backup contiene i dati ma non i PDF':'Mancano ancora '+miss.length+' PDF'}</b><div class="fsBar"><i style="width:${pc}%"></i></div><small>${done} di ${total} spartiti già nella libreria</small>
          <button class="goldBtn" id="fsPdfs">${iconSvg('file')}Importa i PDF mancanti…</button>
          <ol class="fsHow"><li>Nell'app <b>File</b> apri la cartella dove hai i PDF (quella di forScore o iCloud).</li><li>Tocca <b>Seleziona</b> in alto, poi <b>Seleziona tutto</b> e <b>Apri</b>.</li><li>Mozart importa solo quelli nuovi e mette titoli, compositori, setlist, testi e disegni di forScore.</li></ol>
          <details><summary>Elenco dei PDF mancanti (${miss.length})</summary><div class="fsList">${miss.slice(0,400).map(f=>`<span>${esc(baseName(f).replace(/\.pdf$/i,''))}</span>`).join('')}${miss.length>400?`<span>… e altri ${miss.length-400}</span>`:''}</div></details></div>`; }
      else if(total) h+=`<div class="fsBox ok"><b>✓ Tutti i PDF di forScore sono nella libreria</b></div>`;
      if(r.errors&&r.errors.length) h+=`<div class="hint" style="color:var(--danger)">Non letti: ${esc(r.errors.slice(0,6).join(', '))}</div>`;
      if(r.metaOnly&&!r.pdfs&&!total) h+=`<div class="hint"><b>Questo è un backup “solo dati”:</b> non ho trovato elenchi di spartiti. In forScore crea un <b>Archivio</b> (Strumenti → Backup → Archivio), che contiene anche gli spartiti, e aprilo qui.</div>`;
      if(r.diag&&r.diag.length) h+=`<details style="margin-top:6px"><summary class="hint" style="cursor:pointer"><b>Dettagli tecnici del file</b></summary><pre id="fsDiag" style="white-space:pre-wrap;font-size:11.5px;line-height:1.45;color:var(--muted);max-height:40vh;overflow:auto;user-select:text;-webkit-user-select:text">${esc(r.diag.join('\n'))}</pre></details>`;
      h+=`<div id="fsDup"></div>`;
      const m2=modal('Import da forScore',h,`<button class="goldBtn" data-ok>${iconSvg('check')}Fatto</button>`,{eyebrow:'Libreria'});
      m2.querySelector('[data-ok]').onclick=()=>{ closeLayers(); openSide('library'); };
      const fp=m2.querySelector('#fsPdfs'); if(fp) fp.onclick=()=>{ closeLayers(); this.pickMissing(); };
      // doppioni nella libreria (anche arrivati dal backup)
      const gs=await Dups.groups(); const box=m2.querySelector('#fsDup'); if(gs.length&&box){ const n=gs.reduce((a,g)=>a+g.length-1,0);
        box.innerHTML=`<div class="fsBox warn"><b>Trovati ${n} ${n===1?'doppione':'doppioni'}</b> (${gs.length} ${gs.length===1?'spartito presente':'spartiti presenti'} più volte)<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="goldBtn" id="fsDupGo">Rimuovi i doppioni</button><button class="ghostBtn" id="fsDupSee">Vedi</button></div></div>`;
        box.querySelector('#fsDupGo').onclick=()=>{ closeLayers(); Dups.removeAll(gs); }; box.querySelector('#fsDupSee').onclick=()=>{ closeLayers(); Dups.open(); }; }
    })();
  },
});
FS4.refreshMiss();
// ogni nuovo spartito riceve i dati di forScore salvati e si controllano i doppioni
(function(){ const a0=addScore; let t=null;
  addScore=async function(){ const sc=await a0.apply(this,arguments); try{ if(await FS4.applyMeta(sc)){ clearTimeout(Dups._sl); Dups._sl=setTimeout(async()=>{ if(await FS4.syncSetlists()) renderLibrary(); FS4.refreshMiss(); },1500); } }catch(e){}
    clearTimeout(t); t=setTimeout(()=>Dups.checkSoon(),3500); return sc; }; })();

// ---------- Doppioni ----------
const Dups = {
  quiet:false, seen:'',
  annCount(a){ return Object.values(a||{}).reduce((t,x)=>t+(Array.isArray(x)?x.length:0),0); },
  size(b){ return b>1048576?(b/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1024))+' KB'; },
  // gruppi di spartiti uguali: stesso nome del file, stesso titolo e pagine, o stessa dimensione e pagine
  async groups(){
    const S=ST.scores.filter(s=>!(s.tags||[]).includes('esempio')), par=new Map(S.map(s=>[s.id,s.id]));
    const find=x=>{ while(par.get(x)!==x){ par.set(x,par.get(par.get(x))); x=par.get(x); } return x; }, uni=(a,b)=>{ const ra=find(a), rb=find(b); if(ra!==rb) par.set(ra,rb); };
    const maps=[new Map(),new Map(),new Map()];
    S.forEach(s=>{ const keys=[normName(s.file||s.title), s.size?`${s.size}|${s.pages}`:null, normName(s.title)+'|'+s.pages]; keys.forEach((k,i)=>{ if(!k) return; if(maps[i].has(k)) uni(s.id,maps[i].get(k)); else maps[i].set(k,s.id); }); });
    const by=new Map(); S.forEach(s=>{ const r=find(s.id); (by.get(r)||by.set(r,[]).get(r)).push(s); });
    const out=[];
    for(const list of by.values()){ if(list.length<2) continue; const rows=[];
      for(const s of list){ const a=(ST.cur&&ST.cur.id===s.id)?ST.ann:(await DB.get('ann:'+s.id)); const ann=this.annCount(a); const sl=ST.setlists.filter(x=>x.items.includes(s.id)).length;
        rows.push({sc:s,ann,sl,score:ann*1000+sl*100+(s.size||0)/1e6+(s.composer?5:0)+(s.fsMeta?3:0)-(s.added||0)/1e14}); }
      rows.sort((x,y)=>y.score-x.score); out.push(rows); }
    return out;
  },
  // toglie la copia: annotazioni (solo sulle pagine che nell'altra copia sono vuote), setlist e dati passano alla copia che resta
  async removeCopy(copy,keep){
    const ka=(ST.cur&&ST.cur.id===keep.id)?ST.ann:((await DB.get('ann:'+keep.id))||{}), ca=(ST.cur&&ST.cur.id===copy.id)?ST.ann:((await DB.get('ann:'+copy.id))||{}); let merged=false;
    for(const p in ca){ if(ca[p]&&ca[p].length&&(!ka[p]||!ka[p].length)){ ka[p]=ca[p]; merged=true; } }
    if(merged){ await DB.set('ann:'+keep.id,ka); if(ST.cur&&ST.cur.id===keep.id) ST.ann=ka; }
    ['composer','genre','key','about'].forEach(k=>{ if(!keep[k]&&copy[k]) keep[k]=copy[k]; }); keep.tags=[...new Set([...(keep.tags||[]),...(copy.tags||[])])];
    ST.setlists.forEach(s=>{ if(s.items.includes(copy.id)) s.items=[...new Set(s.items.map(i=>i===copy.id?keep.id:i))]; });
    await DB.putScore(keep); await DB.delScore(copy.id); DB.del('ann:'+copy.id); DB.del('bak:'+copy.id); DB.del('pdf:'+copy.id);
    ST.scores=ST.scores.filter(s=>s.id!==copy.id); if(ST.selected) ST.selected.delete(copy.id);
    if(ST.cur&&ST.cur.id===copy.id){ ST.cur=null; await openScore(keep.id); } },
  async removeAll(gs){ gs=gs||await this.groups(); let n=0; busy('Tolgo i doppioni…');
    try{ for(const rows of gs){ const keep=rows[0].sc; for(const r of rows.slice(1)){ await this.removeCopy(r.sc,keep); n++; } } saveSetlists(); }catch(e){} busy(); renderLibrary(); FS4.refreshMiss(); toast(n?`Tolti ${n} ${n===1?'doppione':'doppioni'}`:'Nessun doppione',2600); },
  async open(){
    const gs=await this.groups(); if(!gs.length) return toast('Non ci sono spartiti doppi 👍',2600);
    const n=gs.reduce((a,g)=>a+g.length-1,0);
    const m2=modal('Spartiti doppi',`<div class="hint">${gs.length} ${gs.length===1?'spartito presente':'spartiti presenti'} più volte. In ogni gruppo resta quello con più annotazioni e setlist; scegli un altro con ● se vuoi.</div>
      <div id="dpL">${gs.map((rows,gi)=>`<div class="dpG" data-g="${gi}"><div class="dpH">${esc(rows[0].sc.title)}<small>${rows.length} copie</small></div>${rows.map((r,ri)=>`<label class="dpR${ri===0?' keep':''}"><input type="radio" name="g${gi}" value="${ri}"${ri===0?' checked':''}><span class="dpT"><b>${esc(r.sc.title)}</b><small>${r.sc.pages} pag. · ${this.size(r.sc.size||0)} · ${r.ann?r.ann+' annotazioni':'senza annotazioni'}${r.sl?' · in '+r.sl+' setlist':''} · aggiunto il ${new Date(r.sc.added||0).toLocaleDateString('it-IT')}</small></span><em>${ri===0?'resta':'si toglie'}</em></label>`).join('')}</div>`).join('')}</div>`,
      `<button class="ghostBtn" data-no>Chiudi</button><button class="goldBtn" data-go>${iconSvg('trash')}Togli ${n} ${n===1?'doppione':'doppioni'}</button>`,{eyebrow:'Libreria'});
    m2.querySelectorAll('.dpG').forEach(g=>g.addEventListener('change',()=>{ g.querySelectorAll('.dpR').forEach(l=>{ const on=l.querySelector('input').checked; l.classList.toggle('keep',on); l.querySelector('em').textContent=on?'resta':'si toglie'; }); }));
    m2.querySelector('[data-no]').onclick=closeLayers;
    m2.querySelector('[data-go]').onclick=()=>{ const sel=gs.map((rows,gi)=>{ const v=+(m2.querySelector(`input[name="g${gi}"]:checked`)?.value||0); const keep=rows[v]; return [keep,...rows.filter((_,i)=>i!==v)]; }); closeLayers(); this.removeAll(sel); };
  },
  async checkSoon(){ if(this.quiet||document.querySelector('.modal')) return; const gs=await this.groups(); if(!gs.length) return; const sig=gs.map(g=>g.map(r=>r.sc.id).join('+')).join('|'); if(sig===this.seen) return; this.seen=sig;
    const n=gs.reduce((a,g)=>a+g.length-1,0); this.offer(`${n} ${n===1?'spartito doppio':'spartiti doppi'}`,gs); },
  offer(msg,gs){ $('#dupToast')?.remove(); const t=document.createElement('div'); t.id='dupToast'; t.className='actToast'; t.innerHTML=`<span>${esc(msg)}</span><button data-a="see">Vedi</button><button data-a="rm">Togli</button>`; $('#app').appendChild(t);
    t.onclick=e=>{ const a=e.target.closest('button')?.dataset.a; if(!a) return; t.remove(); if(a==='see') this.open(); else this.removeAll(gs); }; setTimeout(()=>t.classList.add('on'),20); setTimeout(()=>{ t.classList.remove('on'); setTimeout(()=>t.remove(),400); },12000); },
};
