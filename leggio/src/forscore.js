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
  async run(files){
    const rep={pdfs:0,dups:0,meta:0,setlists:0,matched:0,errors:[],metaOnly:false};
    const metas=[]; const added=[];
    for(const file of files){
      try{
        busy(`Leggo “${file.name}”…`);
        const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
        const txt=String.fromCharCode(...head);
        let entries=null;
        if(head[0]===0x50&&head[1]===0x4B) entries=await zipEntries(file);
        if(entries){
          const pdfE=entries.filter(e=>/\.pdf$/i.test(e.name)&&!/(^|\/)__MACOSX\//.test(e.name));
          for(const e of entries){ if(/\.pdf$/i.test(e.name)||e.size<=0||e.size>40e6) continue; try{ const u=await e.bytes(); const h=String.fromCharCode(...u.subarray(0,16)).trimStart(); if(/^(bplist|<\?xml|<plist|<!DOCTYPE plist|\{|\[)/.test(h)||/\.(plist|json|xml)$/i.test(e.name)){ const m=parseMetaBytes(u); if(m) metas.push(m); } }catch(err){} }
          let i=0; for(const e of pdfE){ i++; busy(`Importo ${i}/${pdfE.length}: ${baseName(e.name)}`); await this.addPdf(await e.bytes(), baseName(e.name), rep, added); }
          if(!pdfE.length) rep.metaOnly=true;
        } else if(txt.startsWith('bplist')||txt.startsWith('<?xml')||txt.startsWith('<plist')||txt.trim().startsWith('{')){
          const m=parseMetaBytes(new Uint8Array(await file.arrayBuffer())); if(m) metas.push(m); rep.metaOnly=true;
        } else {
          const found=await scanPdfs(file,(n)=>busy(`Cerco gli spartiti nel file… ${n} trovati`));
          for(let i=0;i<found.length;i++){ busy(`Importo ${i+1}/${found.length}`); await this.addPdf(found[i].bytes, found[i].name||`${file.name.replace(/\.4sb$/i,'')} ${i+1}`, rep, added); }
          if(file.size<60e6){ const m=scanPlists(new Uint8Array(await file.arrayBuffer())); metas.push(...m); }
          if(!found.length) rep.metaOnly=true;
        }
      }catch(err){ rep.errors.push(file.name); }
    }
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
  async addPdf(bytes,name,rep,added){
    const buf=bytes.buffer?bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength):bytes;
    if(ST.scores.some(s=>normName(s.file||'')===normName(name)&&s.bytes.byteLength===buf.byteLength)){ rep.dups++; return; }
    try{ const sc=await addScore(buf,{title:name.replace(/\.pdf$/i,'').replace(/_+/g,' ').trim(),file:name,fromFile:true,tags:['forScore']}); added.push(sc.id); rep.pdfs++; }
    catch(e){ rep.errors.push(name); }
  },
  report(r){
    const li=(n,t)=>`<div class="item" style="min-height:48px"><span class="chk" style="border-color:var(--gold);color:var(--gold-hi);font-weight:800;font-size:12px;width:auto;min-width:26px;padding:0 6px;border-radius:13px">${n}</span><div class="tx"><div class="tt" style="font-size:15.5px">${t}</div></div></div>`;
    let h=li(r.pdfs,'spartiti importati')+(r.dups?li(r.dups,'già presenti, saltati'):'')+li(r.matched,'spartiti con titolo, compositore o etichette da forScore')+li(r.setlists,'setlist ricreate');
    if(r.errors.length) h+=`<div class="hint" style="color:var(--danger)">Non letti: ${esc(r.errors.slice(0,6).join(', '))}</div>`;
    if(r.metaOnly&&!r.pdfs) h+=`<div class="hint"><b>Questo è un backup “solo dati”:</b> forScore ci mette titoli, setlist e impostazioni, ma non i PDF. Per avere anche la musica:<br>1. in forScore crea un <b>Archivio</b> (Strumenti → Backup → Archivio), che contiene anche gli spartiti, e aprilo qui; oppure<br>2. importa i PDF dalla cartella di forScore in File, poi riapri questo .4sb: titoli e setlist verranno abbinati ai PDF con lo stesso nome.</div>`;
    h+=`<div class="hint" style="font-size:13px">Le annotazioni a mano di forScore restano nel formato privato di forScore e non si possono trasferire. Se il PDF era stato esportato da forScore con le annotazioni, le vedrai già stampate sulla pagina.</div>`;
    const m2=modal('Import da forScore',h,`<button class="goldBtn" data-ok>${iconSvg('check')}Fatto</button>`);
    m2.querySelector('[data-ok]').onclick=()=>{closeLayers();openSide('library')};
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
    out.push({name,size:usize,bytes:async()=>{
      const lh=new DataView(await file.slice(lho,lho+30).arrayBuffer()); const start=lho+30+lh.getUint16(26,true)+lh.getUint16(28,true);
      const blob=file.slice(start,start+csize);
      if(method===0) return new Uint8Array(await blob.arrayBuffer());
      if(method===8){ if(!window.DecompressionStream) throw new Error('deflate non supportato'); const s=blob.stream().pipeThrough(new DecompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); }
      throw new Error('compressione non supportata');
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
