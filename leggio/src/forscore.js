// ================= Import backup e archivi forScore (.4sb) =================
// Il formato interno non è documentato: l'importatore prova, in ordine,
// 1) archivio ZIP (PDF + metadati), 2) plist (XML/binaria, anche NSKeyedArchiver) o JSON,
// 3) ricerca dei PDF contenuti nel file, letti a pezzi per non riempire la memoria dell'iPad.
const FS4 = {
  pick(){
    const f=$('#file4sb'); f.value='';
    f.onchange=()=>{ const files=[...f.files]; if(files.length) this.run(files); };
    f.click();
  },
  async run(files){ Conflict.reset();
    const rep={pdfs:0,dups:0,meta:0,setlists:0,matched:0,errors:[],metaOnly:false,diag:[]};
    const metas=[]; const added=[];
    for(const file of files){
      try{ busy(`Leggo “${file.name}”…`); await this.processBlob(file,file.name,0,rep,metas,added); }
      catch(err){ rep.errors.push(file.name+' ('+(err&&err.message||err)+')'); }
    }
    if(!rep.pdfs && !rep.dups) rep.metaOnly=true;
    // Metadati: titolo, compositore, genere, etichette, setlist
    const recs=[], sls=[]; metas.forEach(m=>harvest(m,recs,sls));
    rep.meta=recs.length;
    const byFile=new Map(); recs.forEach(r=>{ const k=normName(r.file); if(!byFile.has(k)) byFile.set(k,r); else Object.assign(byFile.get(k),Object.fromEntries(Object.entries(r).filter(([,v])=>v&&(!Array.isArray(v)||v.length)))); });
    for(const sc of ST.scores){ const r=byFile.get(normName(sc.file||sc.title)); if(!r) continue;
      if(r.title) sc.title=r.title; if(r.composer) sc.composer=r.composer; if(r.genre) sc.genre=r.genre; if(r.key) sc.key=r.key;
      if(r.tags&&r.tags.length) sc.tags=[...new Set([...(sc.tags||[]),...r.tags])];
      rep.matched++; await DB.putScore(sc); }
    for(const s of sls){ const ids=s.files.map(f=>ST.scores.find(sc=>normName(sc.file||sc.title)===normName(f))?.id).filter(Boolean);
      if(!ids.length) continue; const name=s.name||'Setlist forScore'; if(ST.setlists.some(x=>x.name===name&&x.items.join()===ids.join())) continue;
      ST.setlists.push({id:uid(),name,items:ids}); rep.setlists++; }
    saveSetlists(); busy(); renderLibrary();
    if(added[0]) await openScore(added[0]);
    this.report(rep);
  },
  // Riconosce il contenuto dal suo inizio (non dal nome): ZIP, gzip, SQLite, plist, JSON, PDF, o PDF nascosti nel file.
  async processBlob(blob,name,depth,rep,metas,added){
    if(depth>4) return;
    const head=new Uint8Array(await blob.slice(0,32).arrayBuffer()); const txt=new TextDecoder('latin1').decode(head);
    const hex=[...head.subarray(0,8)].map(b=>b.toString(16).padStart(2,'0')).join(' ');
    rep.diag.push(`${'  '.repeat(depth)}${name} · ${(blob.size/1048576).toFixed(2)} MB · inizio: ${hex} “${txt.slice(0,12).replace(/[^\x20-\x7e]/g,'·')}”`);
    if(txt.startsWith('<--4SBV')){ await this.container4sb(blob,depth,rep,metas,added); return; }
    if(txt.startsWith('%PDF')){ await this.addPdf(new Uint8Array(await blob.arrayBuffer()), /\.pdf$/i.test(name)?baseName(name):baseName(name).replace(/\.[^.]*$/,'')+'.pdf', rep, added); return; }
    if(head[0]===0x50&&head[1]===0x4B){
      const entries=await zipEntries(blob);
      if(entries){
        rep.diag.push(`${'  '.repeat(depth)}  ZIP con ${entries.length} file: ${entries.slice(0,25).map(e=>`${e.name} (${(e.size/1024).toFixed(0)} KB${e.method&&e.method!==8&&e.method!==0?', compr. '+e.method:''})`).join(' · ')}${entries.length>25?' …':''}`);
        const skip=e=>/(^|\/)(__MACOSX|\.DS_Store)/.test(e.name)||e.size<=0;
        // prima i metadati piccoli, poi i documenti
        const ord=[...entries].filter(e=>!skip(e)).sort((x,y)=>(/\.pdf$/i.test(x.name)?1:0)-(/\.pdf$/i.test(y.name)?1:0));
        let i=0;
        for(const e of ord){ i++;
          busy(`Leggo ${i}/${ord.length}: ${baseName(e.name)}`);
          let u; try{ u=await e.bytes(); }catch(err){ rep.diag.push(`  non letto ${e.name}: ${err.message}`); continue; }
          await this.processBlob(new Blob([u]), e.name, depth+1, rep, metas, added);
        }
        return;
      }
    }
    if(head[0]===0x1f&&head[1]===0x8b && window.DecompressionStream){
      const out=new Blob([await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()]);
      return this.processBlob(out,name.replace(/\.gz$/i,''),depth+1,rep,metas,added);
    }
    if(txt.startsWith('SQLite format 3')){ await this.sqlite(blob,name,depth,rep,metas,added); return; }
    if(txt.startsWith('bplist')||/^\s*(<\?xml|<plist|<!DOCTYPE plist|\{|\[)/.test(txt)){
      if(blob.size<80e6){ try{ const m=parseMetaBytes(new Uint8Array(await blob.arrayBuffer())); if(m){ metas.push(m); await this.embeddedPdfs(m,rep,added); } return; }catch(err){ rep.diag.push('  metadati non leggibili: '+err.message); } }
    }
    // altrimenti: cerca PDF contenuti nel file
    const found=await scanPdfs(blob,(n)=>busy(`Cerco gli spartiti nel file… ${n} trovati`));
    for(let k=0;k<found.length;k++){ busy(`Importo ${k+1}/${found.length}`); await this.addPdf(found[k].bytes, found[k].name||`${baseName(name).replace(/\.\w+$/,'')} ${k+1}.pdf`, rep, added); }
    if(blob.size<60e6){ const m=scanPlists(new Uint8Array(await blob.arrayBuffer())); metas.push(...m); }
  },
  // Formato vero dei backup forScore: "<--4SBV02-->" poi, per ogni file: lunghezza del nome (16 caratteri),
  // dimensione (16 caratteri), nome, dati compressi gzip. Il file principale "*.4sb" è la libreria (plist);
  // "Brano.pdf|271.png" sono i disegni della pagina 271; "Brano.pdf" (negli archivi) sono gli spartiti.
  async container4sb(blob,depth,rep,metas,added){
    const dec=new TextDecoder(); let p=12, n=0;
    const fs=this.fs={texts:{},imgs:{},files:new Set()};
    while(p+32<=blob.size){
      const hd=dec.decode(await blob.slice(p,p+32).arrayBuffer());
      const nl=parseInt(hd.slice(0,16),10), sz=parseInt(hd.slice(16,32),10);
      if(!(nl>=0)||!(sz>=0)) { rep.diag.push(`  struttura interrotta a ${p}`); break; }
      const name=dec.decode(await blob.slice(p+32,p+32+nl).arrayBuffer());
      let data=blob.slice(p+32+nl,p+32+nl+sz); p=p+32+nl+sz; n++;
      busy(`Leggo ${n}: ${name}`);
      data=await gunzipAll(data);
      rep.diag.push(`  ${name} · ${(data.size/1024).toFixed(0)} KB`);
      const m2=name.match(/^(.+?)\|(\d+)\.png$/i);
      if(m2){ const u=await blobToDataURL(new Blob([data],{type:'image/png'})); (fs.imgs[m2[1]]=fs.imgs[m2[1]]||{})[+m2[2]-1]=u; fs.files.add(m2[1]); continue; }
      const head=new TextDecoder('latin1').decode(new Uint8Array(await data.slice(0,8).arrayBuffer()));
      if(head.startsWith('bplist')){ const m=parseBplist(new Uint8Array(await data.arrayBuffer())); if(m&&typeof m==='object'){ this.flat(m,metas,fs); metas.push(m); } continue; }
      await this.processBlob(data,name,depth+1,rep,metas,added);
    }
    // testi e disegni: subito sugli spartiti già presenti, oppure appena importi il PDF con lo stesso nome
    const pend=(await DB.get('fs4pending'))||{};
    for(const f of fs.files){ const k=normName(f); pend[k]={texts:fs.texts[f]||{},imgs:fs.imgs[f]||{},file:f}; }
    await DB.set('fs4pending',pend);
    rep.fsFiles=[...fs.files]; rep.annFiles=Object.keys(pend).length;
    rep.annApplied=0; for(const sc of ST.scores){ if(await applyForscoreAnn(sc)) rep.annApplied++; }
  },
  // libreria forScore: chiavi "Brano.pdf|title", "Brano.pdf|3|textAnnotations", "&SYS;setlists"…
  flat(m,metas,fs){
    const recs={};
    for(const k in m){
      if(k.startsWith('&SYS;')) continue; const parts=k.split('|'); if(parts.length<2) continue;
      const f=parts[0]; if(!/\.pdf$/i.test(f)) continue; fs.files.add(f);
      const r=recs[f]=recs[f]||{file:f};
      if(parts.length===2){ const fld=parts[1].toLowerCase(), v=m[k];
        if(fld==='title'&&typeof v==='string') r.title=v;
        else if(/^(composer|artist|composers)$/.test(fld)) r.composer=Array.isArray(v)?v.join(', '):String(v||'');
        else if(/^(genre|genres)$/.test(fld)) r.genre=Array.isArray(v)?v.join(', '):String(v||'');
        else if(/^(keywords|labels|tags)$/.test(fld)) r.tags=Array.isArray(v)?v.map(String):String(v||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean);
        else if(fld==='key'&&v!=null&&typeof v!=='object') r.key=String(v); }
      else if(parts.length===3&&parts[2]==='textAnnotations'&&Array.isArray(m[k])){
        const pg=(+parts[1]||1)-1; const list=(fs.texts[f]=fs.texts[f]||{})[pg]=[];
        for(const t of m[k]){ if(!t||typeof t.text!=='string') continue;
          const fsz=+t.fontSize||16; list.push({t:'text',text:t.text.replace(/\s+$/,''),x:+t['origin.x']||0,y:(+t['origin.y']||0)+fsz*.00068,size:fsz/740,align:'l',
            font:/times|georgia|serif/i.test(t.fontFace||'')?'serif':'sans',bold:+t.fontWeight>0,color:fsColor(t.fontColor),alpha:1,layer:0,fs:1}); } }
    }
    const sl=m['&SYS;setlists'];
    metas.push({forscoreFlat:Object.values(recs),setlists:Array.isArray(sl)?sl:[]});
  },
  // PDF salvati come dati dentro plist/NSKeyedArchiver
  async embeddedPdfs(root,rep,added){
    const seen=new Set(); const list=[];
    const walk=(v,hint)=>{ if(!v||typeof v!=='object'||seen.has(v)) return; seen.add(v);
      if(v instanceof Uint8Array){ if(v.length>8&&v[0]===0x25&&v[1]===0x50&&v[2]===0x44&&v[3]===0x46) list.push({u:v,name:hint}); return; }
      if(Array.isArray(v)){ v.forEach(x=>walk(x,hint)); return; }
      const nm=Object.values(v).find(x=>typeof x==='string'&&/\.pdf$/i.test(x))||v.title||v.name||hint;
      for(const k in v) walk(v[k],typeof nm==='string'?nm:hint); };
    walk(root,'');
    for(let i=0;i<list.length;i++){ busy(`Importo ${i+1}/${list.length}`); await this.addPdf(list[i].u, list[i].name?baseName(String(list[i].name)):`forScore ${i+1}.pdf`, rep, added); }
  },
  // Database SQLite (alcune versioni salvano così la libreria): testi → metadati, BLOB → PDF o plist
  async sqlite(blob,name,depth,rep,metas,added){
    if(!window.initSqlJs){ await new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src=SQLJS_URL+'sql-wasm.js'; sc.onload=res; sc.onerror=()=>rej(new Error('lettore SQLite non disponibile')); document.head.appendChild(sc); }); }
    const SQL=await initSqlJs({locateFile:f=>SQLJS_URL+f});
    const db=new SQL.Database(new Uint8Array(await blob.arrayBuffer()));
    const tables=db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.map(r=>r[0])||[];
    rep.diag.push(`  SQLite con tabelle: ${tables.join(', ')}`);
    const rows=[];
    for(const t of tables){ let r; try{ r=db.exec(`SELECT * FROM "${t.replace(/"/g,'""')}"`)[0]; }catch(e){ continue; } if(!r) continue;
      for(const v of r.values){ const o={}; r.columns.forEach((c,k)=>{ let x=v[k]; if(x instanceof Uint8Array && x.length>8 && String.fromCharCode(...x.subarray(0,6)).startsWith('bplist')){ try{ x=parseBplist(x); }catch(e){} } o[c.replace(/^Z/,'').toLowerCase()]=x; }); o.__table=t; rows.push(o); } }
    db.close(); metas.push(rows); await this.embeddedPdfs(rows,rep,added);
  },
  async addPdf(bytes,name,rep,added){
    const buf=bytes.buffer?bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength):bytes;
    try{ const sc=await importPdf(buf,{title:name.replace(/\.pdf$/i,'').replace(/_+/g,' ').trim(),file:name,fromFile:true,tags:['forScore']}); if(!sc){ rep.dups++; return; } added.push(sc.id); rep.pdfs++; }
    catch(e){ rep.errors.push(name); }
  },
  report(r){
    const li=(n,t)=>`<div class="item" style="min-height:48px"><span class="chk" style="border-color:var(--gold);color:var(--gold-hi);font-weight:800;font-size:12px;width:auto;min-width:26px;padding:0 6px;border-radius:13px">${n}</span><div class="tx"><div class="tt" style="font-size:15.5px">${t}</div></div></div>`;
    let h=li(r.pdfs,'spartiti importati')+(r.dups?li(r.dups,'già presenti, saltati'):'')+li(r.matched,'spartiti con titolo, compositore o etichette da forScore')+li(r.setlists,'setlist ricreate');
    if(r.annFiles) h+=li(r.annApplied||0,`spartiti con testi e disegni di forScore applicati`);
    if(r.fsFiles&&r.fsFiles.length){ const have=new Set(ST.scores.map(s=>normName(s.file||s.title))); const miss=r.fsFiles.filter(f=>!have.has(normName(f)));
      if(miss.length) h+=`<div><button class="goldBtn" id="fsPdfs">${iconSvg('file')}Importa ora i PDF mancanti</button></div><div class="hint"><b>Mancano i PDF di:</b> ${miss.map(esc).join(', ')}.<br>Importali (Importa → PDF dai File, dalla cartella di forScore): testi, disegni e titoli di forScore verranno messi <b>automaticamente</b> sulle pagine giuste.</div>`; }
    if(r.errors.length) h+=`<div class="hint" style="color:var(--danger)">Non letti: ${esc(r.errors.slice(0,6).join(', '))}</div>`;
    if(r.metaOnly&&!r.pdfs&&!(r.fsFiles&&r.fsFiles.length)) h+=`<div class="hint"><b>Questo è un backup “solo dati”:</b> forScore ci mette titoli, setlist e impostazioni, ma non i PDF. Per avere anche la musica:<br>1. in forScore crea un <b>Archivio</b> (Strumenti → Backup → Archivio), che contiene anche gli spartiti, e aprilo qui; oppure<br>2. importa i PDF dalla cartella di forScore in File, poi riapri questo .4sb: titoli e setlist verranno abbinati ai PDF con lo stesso nome.</div>`;
    if(r.diag&&r.diag.length) h+=`<details style="margin-top:6px"><summary class="hint" style="cursor:pointer"><b>Dettagli tecnici del file</b> (fai una foto dello schermo e mandala a Claude se qualcosa non è stato importato)</summary><pre id="fsDiag" style="white-space:pre-wrap;font-size:11.5px;line-height:1.45;color:var(--muted);max-height:40vh;overflow:auto;user-select:text;-webkit-user-select:text">${esc(r.diag.join('\n'))}</pre></details>`;
    const m2=modal('Import da forScore',h,`<button class="goldBtn" data-ok>${iconSvg('check')}Fatto</button>`);
    m2.querySelector('[data-ok]').onclick=()=>{closeLayers();openSide('library')};
    const fp=m2.querySelector('#fsPdfs'); if(fp) fp.onclick=()=>{ closeLayers(); Insert.pickPdf('new'); };
  },
};
const baseName=p=>String(p).split(/[\/\\]/).pop();
const normName=p=>baseName(p||'').toLowerCase().replace(/\.pdf$/,'').replace(/[_\s]+/g,' ').trim();

// ---- ZIP letto a pezzi (directory centrale, anche zip64; deflate via DecompressionStream) ----
async function zipEntries(file){
  const size=file.size, tailLen=Math.min(size,70000);
  const tail=new DataView(await file.slice(size-tailLen).arrayBuffer());
  let eocd=-1; for(let i=tailLen-22;i>=0;i--) if(tail.getUint32(i,true)===0x06054b50){eocd=i;break}
  if(eocd<0) return null;
  let cdCount=tail.getUint16(eocd+10,true), cdSize=tail.getUint32(eocd+12,true), cdOff=tail.getUint32(eocd+16,true);
  if(cdOff===0xFFFFFFFF||cdCount===0xFFFF){ const loc=eocd-20; if(loc>=0&&tail.getUint32(loc,true)===0x07064b50){ const z64=Number(tail.getBigUint64(loc+8,true)); const zv=new DataView(await file.slice(z64,z64+56).arrayBuffer()); cdCount=Number(zv.getBigUint64(32,true)); cdSize=Number(zv.getBigUint64(40,true)); cdOff=Number(zv.getBigUint64(48,true)); } }
  const cd=new DataView(await file.slice(cdOff,cdOff+cdSize).arrayBuffer()); const out=[]; let p=0; const dec=new TextDecoder();
  for(let n=0;n<cdCount&&p+46<=cd.byteLength;n++){
    if(cd.getUint32(p,true)!==0x02014b50) break;
    const method=cd.getUint16(p+10,true); let csize=cd.getUint32(p+20,true), usize=cd.getUint32(p+24,true);
    const nl=cd.getUint16(p+28,true), el=cd.getUint16(p+30,true), cl=cd.getUint16(p+32,true); let lho=cd.getUint32(p+42,true);
    const name=dec.decode(new Uint8Array(cd.buffer,cd.byteOffset+p+46,nl));
    let q=p+46+nl; const qe=q+el; while(q+4<=qe){ const id=cd.getUint16(q,true), sz=cd.getUint16(q+2,true); if(id===1){ let r=q+4; if(usize===0xFFFFFFFF){usize=Number(cd.getBigUint64(r,true));r+=8} if(csize===0xFFFFFFFF){csize=Number(cd.getBigUint64(r,true));r+=8} if(lho===0xFFFFFFFF){lho=Number(cd.getBigUint64(r,true))} } q+=4+sz; }
    p=qe+cl;
    if(name.endsWith('/')) continue;
    out.push({name,size:usize,method,bytes:async()=>{
      const lh=new DataView(await file.slice(lho,lho+30).arrayBuffer()); const start=lho+30+lh.getUint16(26,true)+lh.getUint16(28,true);
      const blob=file.slice(start,start+csize);
      if(method===0) return new Uint8Array(await blob.arrayBuffer());
      if(method===8){ if(!window.DecompressionStream) throw new Error('deflate non supportato'); const s=blob.stream().pipeThrough(new DecompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); }
      throw new Error('compressione non supportata ('+method+')');
    }});
  }
  return out;
}

// ---- PDF contenuti nel file: cerca "%PDF-" e chiude all'ultimo "%%EOF" prima del successivo ----
async function scanPdfs(file,progress){
  const CH=8<<20, starts=[]; const sig=[0x25,0x50,0x44,0x46,0x2D];
  for(let off=0;off<file.size;off+=CH){
    const u=new Uint8Array(await file.slice(off,Math.min(file.size,off+CH+4)).arrayBuffer());
    for(let i=0;i+5<=u.length;i++){ if(u[i]===0x25&&u[i+1]===0x50&&u[i+2]===0x44&&u[i+3]===0x46&&u[i+4]===0x2D){ const g=off+i; if(!starts.length||starts[starts.length-1]!==g) starts.push(g); } }
    progress&&progress(starts.length);
  }
  const found=[]; const dec=new TextDecoder('latin1');
  for(let k=0;k<starts.length;k++){
    const s=starts[k], e=k+1<starts.length?starts[k+1]:file.size;
    const tailStart=Math.max(s,e-(4<<20)); const tail=new Uint8Array(await file.slice(tailStart,e).arrayBuffer());
    let end=-1; for(let i=tail.length-5;i>=0;i--) if(tail[i]===0x25&&tail[i+1]===0x25&&tail[i+2]===0x45&&tail[i+3]===0x4F&&tail[i+4]===0x46){end=tailStart+i+5;break}
    if(end<0) continue;
    // PDF incorporato in un altro PDF (allegato): si tiene solo quello esterno
    if(found.length&&s<found[found.length-1].end) continue;
    const bytes=new Uint8Array(await file.slice(s,end).arrayBuffer());
    try{ await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false}); }catch(err){ continue; }
    // nome del file: l'ultima stringa "*.pdf" scritta poco prima dei dati
    const pre=dec.decode(new Uint8Array(await file.slice(Math.max(0,s-2048),s).arrayBuffer()));
    const nm=[...pre.matchAll(/([^\x00-\x1f\/\\"<>|:*?]{1,180}\.pdf)/gi)].pop();
    found.push({bytes,end,name:nm?baseName(nm[1].trim()):''});
  }
  return found;
}
function scanPlists(u8){
  const out=[]; const dec=new TextDecoder('utf-8',{fatal:false});
  // plist XML incorporate
  const s=dec.decode(u8); let i=0;
  while((i=s.indexOf('<plist',i))>=0){ const j=s.indexOf('</plist>',i); if(j<0)break; try{ out.push(parseXmlPlist(s.slice(i,j+8))); }catch(e){} i=j+8; }
  return out;
}
function parseMetaBytes(u8){
  const head=String.fromCharCode(...u8.subarray(0,8));
  if(head.startsWith('bplist00')) return parseBplist(u8);
  const s=new TextDecoder().decode(u8.subarray(0,Math.min(u8.length,64e6)));
  const t=s.trimStart();
  if(t.startsWith('<?xml')||t.startsWith('<plist')||t.startsWith('<!DOCTYPE plist')) return parseXmlPlist(t);
  if(t.startsWith('{')||t.startsWith('[')) return JSON.parse(t);
  const embedded=scanPlists(u8); return embedded.length?embedded:null;
}

// ---- plist binaria (bplist00) ----
function parseBplist(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength), L=u8.length;
  const offSize=u8[L-26], refSize=u8[L-25]; const num=Number(dv.getBigUint64(L-24)), top=Number(dv.getBigUint64(L-16)), tableOff=Number(dv.getBigUint64(L-8));
  const rd=(p,n)=>{let v=0;for(let i=0;i<n;i++)v=v*256+u8[p+i];return v};
  const offs=new Array(num); for(let i=0;i<num;i++) offs[i]=rd(tableOff+i*offSize,offSize);
  const memo=new Map(); let depth=0;
  const lenAt=(p,low)=>{ if(low!==0xF) return [low,p+1]; const t=u8[p+1]&0xF; const n=1<<t; return [rd(p+2,n),p+2+n]; };
  const obj=i=>{
    if(memo.has(i)) return memo.get(i); if(++depth>2000) throw new Error('plist troppo profonda');
    const p=offs[i], b=u8[p], hi=b>>4, low=b&0xF; let v=null;
    if(hi===0) v=low===8?false:low===9?true:null;
    else if(hi===1){ const n=1<<low; v=n===8?Number(dv.getBigInt64(p+1)):rd(p+1,n); }
    else if(hi===2) v=low===2?dv.getFloat32(p+1):dv.getFloat64(p+1);
    else if(hi===3) v=new Date((978307200+dv.getFloat64(p+1))*1000);
    else if(hi===4){ const [n,q]=lenAt(p,low); v=u8.subarray(q,q+n); }
    else if(hi===5){ const [n,q]=lenAt(p,low); v=new TextDecoder('latin1').decode(u8.subarray(q,q+n)); }
    else if(hi===6){ const [n,q]=lenAt(p,low); let s=''; for(let k=0;k<n;k++) s+=String.fromCharCode(dv.getUint16(q+k*2)); v=s; }
    else if(hi===8) v={UID:rd(p+1,low+1)};
    else if(hi===0xA||hi===0xC){ const [n,q]=lenAt(p,low); v=[]; memo.set(i,v); for(let k=0;k<n;k++) v.push(obj(rd(q+k*refSize,refSize))); }
    else if(hi===0xD){ const [n,q]=lenAt(p,low); v={}; memo.set(i,v); for(let k=0;k<n;k++){ const key=obj(rd(q+k*refSize,refSize)); v[String(key)]=obj(rd(q+(n+k)*refSize,refSize)); } }
    depth--; memo.set(i,v); return v;
  };
  return unarchive(obj(top));
}
// ---- plist XML ----
function parseXmlPlist(s){
  const doc=new DOMParser().parseFromString(s,'application/xml'); const root=doc.querySelector('plist>*'); if(!root) return null;
  const conv=el=>{ switch(el.tagName){
    case 'dict':{ const o={}; const ch=[...el.children]; for(let i=0;i<ch.length;i+=2) o[ch[i].textContent]=ch[i+1]?conv(ch[i+1]):null; return o; }
    case 'array': return [...el.children].map(conv);
    case 'string': return el.textContent; case 'integer': return parseInt(el.textContent,10); case 'real': return parseFloat(el.textContent);
    case 'true': return true; case 'false': return false; case 'date': return new Date(el.textContent); default: return null; } };
  return unarchive(conv(root));
}
// NSKeyedArchiver → oggetti semplici
function unarchive(o){
  if(!o||typeof o!=='object'||!Array.isArray(o.$objects)) return o;
  const objs=o.$objects, memo=new Map();
  const res=v=>{
    if(v&&typeof v==='object'&&'UID' in v&&Object.keys(v).length===1) return resIdx(v.UID);
    if(Array.isArray(v)) return v.map(res);
    return v;
  };
  const resIdx=i=>{
    if(memo.has(i)) return memo.get(i); const x=objs[i];
    if(x==='$null') return null;
    if(x&&typeof x==='object'&&!Array.isArray(x)&&!(x instanceof Uint8Array)&&!(x instanceof Date)){
      if('NS.keys' in x){ const d={}; memo.set(i,d); x['NS.keys'].forEach((k,j)=>{ d[String(res(k))]=res(x['NS.objects'][j]); }); return d; }
      if('NS.objects' in x){ const a=[]; memo.set(i,a); x['NS.objects'].forEach(e=>a.push(res(e))); return a; }
      if('NS.string' in x) return x['NS.string'];
      if('NS.relative' in x) return res(x['NS.relative']);
      if('NS.time' in x) return new Date((978307200+x['NS.time'])*1000);
      const d={}; memo.set(i,d); for(const k in x){ if(k==='$class') continue; d[k]=res(x[k]); } return d;
    }
    memo.set(i,x); return x;
  };
  const top=o.$top||{}; const out={}; for(const k in top) out[k]=res(top[k]); return out;
}

// Raccoglie dai metadati: schede degli spartiti (abbinate per nome del file) e setlist.
function harvest(root,recs,sls){
  if(root&&root.forscoreFlat){ recs.push(...root.forscoreFlat);
    for(const s of root.setlists||[]){ if(!s||typeof s!=='object') continue; const name=s.title||s.name||s.Title||''; const arr=Object.values(s).find(v=>Array.isArray(v))||[];
      const files=arr.map(x=>typeof x==='string'?x:(x&&(x.path||x.file||x.filename||Object.values(x).find(v=>typeof v==='string'&&/\.pdf$/i.test(v))))).filter(v=>typeof v==='string'&&/\.pdf$/i.test(v));
      if(files.length) sls.push({name,files}); }
    return; }
  const seen=new Set();
  const pdfRef=d=>{ for(const k of ['path','file','filename','fileName','filePath','relativePath','url','URL','document','name']) if(typeof d[k]==='string'&&/\.pdf$/i.test(d[k])) return d[k];
    for(const k in d) if(typeof d[k]==='string'&&/\.pdf$/i.test(d[k])) return d[k]; return null; };
  const pick=(d,re)=>{ for(const k in d){ if(re.test(k)){ const v=d[k]; if(typeof v==='string'&&v.trim()) return v.trim(); if(Array.isArray(v)){ const s=v.filter(x=>typeof x==='string'); if(s.length) return s.join(', '); } } } return ''; };
  const list=(d,re)=>{ for(const k in d){ if(re.test(k)){ const v=d[k]; if(Array.isArray(v)) return v.map(x=>typeof x==='string'?x:(x&&(x.title||x.name))).filter(Boolean).map(String); if(typeof v==='string'&&v.trim()) return v.split(/[,;]/).map(s=>s.trim()).filter(Boolean); } } return []; };
  const filesIn=arr=>arr.map(x=>typeof x==='string'?(/\.pdf$/i.test(x)?x:null):(x&&typeof x==='object'?pdfRef(x):null)).filter(Boolean);
  const walk=(v,keyHint)=>{
    if(!v||typeof v!=='object'||v instanceof Uint8Array||v instanceof Date||seen.has(v)) return; seen.add(v);
    if(Array.isArray(v)){ v.forEach(x=>walk(x,keyHint)); return; }
    const f=pdfRef(v);
    if(f){ recs.push({file:f,title:pick(v,/^(title|displayTitle|scoreTitle)$/i)||(typeof v.name==='string'&&!/\.pdf$/i.test(v.name)?v.name:''),
      composer:pick(v,/composer|artist|author/i),genre:pick(v,/genre/i),key:pick(v,/^(key|keySignature|tonality)$/i),tags:list(v,/label|tag|keyword/i)}); }
    else {
      for(const k in v){ const a=v[k]; if(Array.isArray(a)&&a.length){ const fl=filesIn(a); const nm=pick(v,/^(title|name)$/i); if(fl.length&&fl.length>=a.length*.6&&(nm||/setlist/i.test(keyHint||''))&&!/^(scores|documents|files|library|all)/i.test(k)){ sls.push({name:nm,files:fl}); } } }
    }
    for(const k in v) walk(v[k],k);
  };
  walk(root,'');
}

// gzip anche annidato (forScore comprime due volte i disegni)
async function gunzipAll(blob){
  for(let i=0;i<4;i++){
    const h=new Uint8Array(await blob.slice(0,2).arrayBuffer());
    if(!(h[0]===0x1f&&h[1]===0x8b)) return blob;
    let out=null;
    if(window.DecompressionStream){ try{ out=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); }catch(e){ out=null; } }
    if(!out){ await loadPako(); out=pako.ungzip(new Uint8Array(await blob.arrayBuffer())).buffer; }
    blob=new Blob([out]);
  }
  return blob;
}
function blobToDataURL(b){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(b); }); }
function fsColor(c){ const m={black:'#111111',red:'#d23b2f',blue:'#1f5fd6',green:'#1d8a4a',orange:'#ff8a3d',purple:'#8b3fc4',yellow:'#c8962e',gray:'#666666',grey:'#666666',white:'#ffffff',brown:'#7a4a2a'}; return m[String(c||'').toLowerCase()]||(/^#/.test(c||'')?c:'#111111'); }
// Mette testi e disegni di forScore sullo spartito con lo stesso nome di file (una volta sola).
async function applyForscoreAnn(sc){
  const pend=(await DB.get('fs4pending'))||{}; const k=normName(sc.file||sc.title); const a=pend[k]; if(!a) return false;
  const ann=(ST.cur&&ST.cur.id===sc.id)?ST.ann:((await DB.get('ann:'+sc.id))||{});
  for(const pg in a.imgs){ if(+pg>=sc.pages) continue; (ann[pg]=ann[pg]||[]).unshift({t:'img',src:a.imgs[pg],layer:0,fs:1}); }
  for(const pg in a.texts){ if(+pg>=sc.pages) continue; (ann[pg]=ann[pg]||[]).push(...a.texts[pg]); }
  await DB.set('ann:'+sc.id,ann); delete pend[k]; await DB.set('fs4pending',pend);
  if(ST.cur&&ST.cur.id===sc.id){ ST.ann=ann; Anno.redraw(); }
  return true;
}

function loadPako(){ if(window.pako) return Promise.resolve(); return new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src=PAKO_URL; sc.onload=res; sc.onerror=()=>rej(new Error('Decompressione non disponibile')); document.head.appendChild(sc); }); }
