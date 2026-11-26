// ============ Songbook automatico: ricerca → importa → raccolta personale con indice ============
const Songbook = {
  name(){ return (ST.settings.songbook||'Il mio Songbook').trim()||'Il mio Songbook'; },
  get(){ return ST.setlists.find(x=>x.name===this.name()); },
  add(id){ let sl=this.get(); if(!sl){ sl={id:uid(),name:this.name(),items:[]}; ST.setlists.push(sl); } if(!sl.items.includes(id)) sl.items.push(id); saveSetlists(); },
  songs(){ const sl=this.get(); return sl?sl.items.map(id=>ST.scores.find(s=>s.id===id)).filter(Boolean):[]; },
  // un unico PDF: copertina, indice con numeri di pagina e tutte le canzoni, con segnalibri e annotazioni già fatte
  async build(){
    const S=this.songs(); if(!S.length) return toast('Il Songbook è vuoto: importa prima qualche canzone',3000);
    busy('Creo il Songbook…');
    try{ const out=await PDFLib.PDFDocument.create(), F=await out.embedFont(PDFLib.StandardFonts.Helvetica), FB=await out.embedFont(PDFLib.StandardFonts.HelveticaBold), safe=t=>ChordSheet.safe(t);
      const srcs=[]; for(const s of S){ srcs.push(await PDFLib.PDFDocument.load(await getBytes(s),{ignoreEncryption:true})); }
      const perPage=36, idxPages=Math.max(1,Math.ceil(S.length/perPage)); let start=2+idxPages; const starts=srcs.map(d=>{ const p=start; start+=d.getPageCount(); return p; });
      const W=595,H=842, gold=PDFLib.rgb(.84,.66,.31), name=this.name(), date=new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
      const cover=out.addPage([W,H]); cover.drawRectangle({x:0,y:0,width:W,height:H,color:PDFLib.rgb(.043,.039,.031)});
      cover.drawRectangle({x:60,y:H-70,width:W-120,height:1.5,color:gold}); cover.drawRectangle({x:60,y:70,width:W-120,height:1.5,color:gold});
      const cw=(t,f,z)=>f.widthOfTextAtSize(t,z); const c1=safe('SONGBOOK'); cover.drawText(c1,{x:(W-cw(c1,FB,52))/2,y:H/2+40,size:52,font:FB,color:gold});
      const c2=safe(name); cover.drawText(c2,{x:Math.max(40,(W-cw(c2,F,24))/2),y:H/2-10,size:24,font:F,color:PDFLib.rgb(.96,.93,.86)});
      const c3=safe(`${S.length} ${S.length===1?'canzone':'canzoni'}  -  ${date}`); cover.drawText(c3,{x:(W-cw(c3,F,12))/2,y:110,size:12,font:F,color:PDFLib.rgb(.66,.61,.51)});
      for(let ip=0;ip<idxPages;ip++){ const pg=out.addPage([W,H]); pg.drawText('Indice',{x:56,y:H-80,size:26,font:FB,color:PDFLib.rgb(.1,.09,.07)}); pg.drawRectangle({x:56,y:H-92,width:W-112,height:1.2,color:gold}); let y=H-124;
        S.slice(ip*perPage,(ip+1)*perPage).forEach((s,k)=>{ const i=ip*perPage+k; let t=safe(`${i+1}. ${s.title}${s.composer?'  -  '+s.composer:''}`); while(cw(t,F,12)>W-56*2-50&&t.length>8) t=t.slice(0,-4)+'...'; pg.drawText(t,{x:56,y,size:12,font:F,color:PDFLib.rgb(.1,.09,.07)});
          const pn=String(starts[i]); pg.drawText(pn,{x:W-56-cw(pn,FB,12),y,size:12,font:FB,color:PDFLib.rgb(.1,.09,.07)}); y-=18.5; }); }
      const ann={}, bm=[{p:1,name:'Indice'}];
      for(let i=0;i<S.length;i++){ const pages=await out.copyPages(srcs[i],srcs[i].getPageIndices()); pages.forEach(p=>out.addPage(p)); const a=(await DB.get('ann:'+S[i].id))||{}; for(const k in a) ann[+k+starts[i]-1]=a[k]; bm.push({p:starts[i]-1,name:`${i+1}. ${S[i].title}`}); }
      const sc=await addScore((await out.save()).buffer,{title:name,genre:'Songbook',tags:['songbook']}); await DB.set('ann:'+sc.id,ann); sc.bookmarks=bm; await DB.putScore(sc);
      busy(); renderLibrary(); await openScore(sc.id); toast('Songbook creato: indice, segnalibri e tutti gli strumenti di Annota',3600);
    }catch(e){ busy(); toast('Non riesco a creare il Songbook: '+(e.message||e),3800); }
  },
};
Object.assign(PopSong,{
  norm(t){ return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); },
  best(q,rs){ const qt=this.norm(q).split(' ').filter(w=>w.length>1); const sc=r=>{ const h=' '+this.norm(r.title+' '+r.artist)+' '; const ti=this.norm(r.title); return qt.filter(w=>h.includes(' '+w+' ')||h.includes(w)).length/Math.max(1,qt.length)+(ti===this.norm(q)?1:0)+(h.includes(this.norm(q))?.5:0); }; return rs.map((r,i)=>({r,s:sc(r)-i*.001})).sort((a,b)=>b.s-a.s)[0].r; },
  async fetchSong(url){ const html=await this.get(url); const s=this.parse(html,url); if(!s||s.text.trim().length<20) throw new Error('nessun testo'); return s; },
  async importOne(r){ const s=await this.fetchSong(r.url); const t=this.view(s.text), title=s.title||r.title, artist=s.artist||r.artist; const bytes=await ChordSheet.toPdf(t,title+(artist?' - '+artist:''));
    const sc=await addScore(bytes,{title,file:title+(artist?' - '+artist:'')+'.pdf',composer:artist,genre:'Pop',tags:['accordi','pop']}); Songbook.add(sc.id); return sc; },
  async auto(q,m){ q=(q||'').trim(); if(!q) return toast('Scrivi titolo e artista della canzone'); busy('Cerco la canzone…');
    try{ const rs=await this.search(q); if(!rs.length){ busy(); return toast('Nessun brano trovato: prova con altre parole',3200); } const b=this.best(q,rs); busy(`Importo “${b.title}”…`); await this.importOne(b); busy(); renderLibrary(); this.drawBook(m); toast(`Nel Songbook: ${b.title}${b.artist?' – '+b.artist:''}`,3400); }
    catch(e){ busy(); this.fail(e); } },
  drawRes(m){ const B=$('#ppRes',m); if(!this.results.length){ B.innerHTML='<div class="hint">Nessun risultato: prova con un altro titolo.</div>'; return; }
    B.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0"><button class="goldBtn" id="ppSel">${iconSvg('plusDoc')}Importa le selezionate nel Songbook</button><button class="ghostBtn" id="ppAll">Seleziona tutte</button></div>`+this.results.map((r,i)=>`<div class="toolRow ppRow" style="width:100%"><input type="checkbox" data-c="${i}" aria-label="Seleziona"><span style="flex:1;min-width:0"><b>${esc(r.title)}</b><br><small style="color:var(--muted)">${esc(r.artist)}</small></span><button class="ghostBtn" data-i="${i}">Anteprima</button></div>`).join('');
    B.onclick=e=>{ const b=e.target.closest('[data-i]'); if(b){ busy('Scarico testo e accordi…'); this.load(this.results[+b.dataset.i].url,m).then(()=>busy()).catch(err=>{ busy(); this.fail(err); }); } };
    $('#ppAll',B).onclick=()=>$$('[data-c]',B).forEach(c=>c.checked=true);
    $('#ppSel',B).onclick=async()=>{ const sel=$$('[data-c]:checked',B).map(c=>this.results[+c.dataset.c]); if(!sel.length) return toast('Spunta almeno una canzone'); let ok=0; for(let k=0;k<sel.length;k++){ busy(`Importo ${k+1} di ${sel.length}: ${sel[k].title}…`); try{ await this.importOne(sel[k]); ok++; }catch(e){} } busy(); renderLibrary(); this.drawBook(m); toast(`${ok} ${ok===1?'canzone importata':'canzoni importate'} nel Songbook`,3400); }; },
  drawBook(m){ m=m||this.m||$('#popM'); const B=$('#ppBook',m); if(!B) return; const S=Songbook.songs();
    B.innerHTML=`<div class="eyebrow" style="margin-top:14px">Il tuo Songbook</div><div class="field"><label for="ppBN">Nome</label><input id="ppBN" value="${esc(Songbook.name())}"></div>
      ${S.length?`<div class="ppBL">${S.map((s,i)=>`<div class="toolRow" style="width:100%"><span style="flex:none;width:28px;color:var(--gold-hi);font-weight:700">${i+1}</span><span style="flex:1;min-width:0"><b>${esc(s.title)}</b><br><small style="color:var(--muted)">${esc(s.composer||'')}</small></span><button class="ghostBtn" data-o="${s.id}">Apri</button><button class="ghostBtn" data-x="${s.id}" aria-label="Togli dal Songbook">${iconSvg('close')}</button></div>`).join('')}</div>`:'<div class="hint">Vuoto: cerca una canzone qui sopra e si aggiunge da sola.</div>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="goldBtn" id="ppBB" ${S.length?'':'disabled'}>${iconSvg('book')}Crea Songbook unico (copertina e indice)</button></div>
      <div class="hint" style="font-size:12.5px">Le canzoni restano anche separate, nella setlist “${esc(Songbook.name())}”. Il Songbook unico ha segnalibri e si annota come ogni spartito.</div>`;
    $('#ppBN',B).onchange=e=>{ const old=Songbook.get(); const n=e.target.value.trim()||'Il mio Songbook'; if(old) old.name=n; ST.settings.songbook=n; saveSettings(); saveSetlists(); this.drawBook(m); };
    B.onclick=e=>{ const o=e.target.closest('[data-o]'), x=e.target.closest('[data-x]'); if(o){ closeLayers(); openScore(o.dataset.o); } if(x){ const sl=Songbook.get(); if(sl){ sl.items=sl.items.filter(i=>i!==x.dataset.x); saveSetlists(); this.drawBook(m); } } };
    const bb=$('#ppBB',B); if(bb) bb.onclick=()=>{ closeLayers(); Songbook.build(); }; },
});
(function(){ const o0=PopSong.open;
  PopSong.open=function(){ o0.apply(this,arguments); const m=$('#popM'); if(!m) return; const row=$('#ppGo',m).parentNode;
    row.insertAdjacentHTML('afterend',`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button class="goldBtn" id="ppAuto">${iconSvg('wand')}Cerca e importa nel Songbook</button></div><div class="hint" style="font-size:12.5px">Scrivi titolo e artista: Mozart cerca su Accordi e Spartiti, sceglie il brano giusto, lo importa e lo aggiunge al tuo Songbook. Se vuoi scegliere tu, usa “Cerca”.</div><div id="ppBook"></div>`);
    $('#ppAuto',m).onclick=()=>this.auto($('#ppQ',m).value,m);
    this.drawBook(m); }; })();
