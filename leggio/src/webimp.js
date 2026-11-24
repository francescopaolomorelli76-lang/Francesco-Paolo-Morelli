// ============ Importa dal web: PDF o immagine da un link, oppure scegli un PDF in una pagina web ============
// Nell'app il download passa da iOS (nessun blocco dei siti); nel browser funziona se il sito lo consente.
const WebImport = {
  target:'new',
  fixUrl(u){
    u=String(u).trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u;
    let m=u.match(/drive\.google\.com\/file\/d\/([^/]+)/); if(m) return 'https://drive.google.com/uc?export=download&id='+m[1];
    if(/dropbox\.com\//.test(u)) return u.replace(/[?&]dl=0/,'').replace(/([?&])raw=1/,'$1')+(u.includes('?')?'&':'?')+'dl=1';
    return u;
  },
  open(target){
    this.target=(target==='insert'&&ST.cur)?'insert':'new'; closeLayers();
    const m=modal('Importa dal web',`<div class="hint">Incolla il link di uno spartito: un PDF, una foto oppure una pagina che contiene PDF da scegliere. Funzionano anche i link di Google Drive e Dropbox.</div>
      <div class="field"><label for="wiUrl">Indirizzo</label><div style="display:flex;gap:8px"><input id="wiUrl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://…" style="flex:1"><button class="ghostBtn" id="wiPaste">Incolla</button></div></div>
      <div class="hint" style="font-size:12.5px">Scarica solo spartiti che puoi usare: libero da diritti o tuo. L'indirizzo non viene salvato.</div>
      <div id="wiList"></div>`,
      `<button class="ghostBtn" data-close2>Chiudi</button><button class="goldBtn" id="wiGo">${iconSvg('plusDoc')}Scarica e importa</button>`,{eyebrow:'Web'});
    m.querySelector('[data-close2]').onclick=closeLayers;
    $('#wiPaste').onclick=async()=>{ try{ $('#wiUrl').value=await navigator.clipboard.readText(); }catch(e){ toast('Tieni premuto nel campo e scegli Incolla',2600); $('#wiUrl').focus(); } };
    $('#wiGo').onclick=()=>this.go($('#wiUrl').value);
    $('#wiUrl').addEventListener('keydown',e=>{ if(e.key==='Enter') this.go($('#wiUrl').value); });
  },
  async get(url){
    if(window.MozartNative&&MozartNative.download){ const r=await MozartNative.download(url); const bin=atob(r.data); const u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); return {bytes:u8.buffer,type:r.mime||'',name:r.name||''}; }
    const res=await fetch(url,{mode:'cors'}); if(!res.ok) throw new Error('Il sito ha risposto '+res.status); const cd=res.headers.get('content-disposition')||''; const nm=(cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)||[])[1]||'';
    return {bytes:await res.arrayBuffer(),type:res.headers.get('content-type')||'',name:decodeURIComponent(nm)};
  },
  nameFrom(url,name){ let n=name; if(!n){ try{ n=decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop()||''); }catch(e){ n=''; } } return (n||'Spartito dal web').replace(/\.(pdf|png|jpe?g)$/i,'').replace(/[_+]+/g,' ').trim(); },
  async go(raw){
    const url=this.fixUrl(raw); if(!url) return toast('Incolla un indirizzo');
    busy('Scarico…');
    try{
      const r=await this.get(url); busy(); const head=new Uint8Array(r.bytes.slice(0,8)); const isPdf=String.fromCharCode(...head.slice(0,5))==='%PDF-';
      const isImg=/^image\//.test(r.type)||(head[0]===0xFF&&head[1]===0xD8)||(head[0]===0x89&&head[1]===0x50);
      if(isPdf){ closeLayers(); const title=this.nameFrom(url,r.name);
        if(this.target==='insert'&&ST.cur){ Insert.choosePages(r.bytes,title+'.pdf'); return; }
        busy('Importo…'); const sc=await importPdf(r.bytes,{title,file:title+'.pdf',fromFile:true}); busy(); if(sc){ renderLibrary(); await openScore(sc.id); toast('Spartito importato dal web'); } return; }
      if(isImg){ closeLayers(); const f=new File([r.bytes],this.nameFrom(url,r.name)+'.jpg',{type:r.type||'image/jpeg'}); Scan.start([f],this.target); return; }
      // pagina web: elenco dei PDF e delle immagini trovati
      const html=new TextDecoder().decode(r.bytes); const doc=new DOMParser().parseFromString(html,'text/html'); const seen=new Set(), found=[];
      doc.querySelectorAll('a[href],img[src]').forEach(a=>{ const h=a.getAttribute('href')||a.getAttribute('src'); if(!h) return; let u2; try{ u2=new URL(h,url).href; }catch(e){ return; }
        if(!/\.(pdf|png|jpe?g)(\?|#|$)/i.test(u2)||seen.has(u2)) return; seen.add(u2); found.push({u:u2,t:(a.textContent||a.getAttribute('alt')||'').trim().slice(0,70)||decodeURIComponent(u2.split('/').pop().split('?')[0])}); });
      if(!found.length) return toast('In questa pagina non trovo PDF o immagini: incolla il link diretto al file',4200);
      const L=$('#wiList'); L.innerHTML='<div class="eyebrow" style="margin:10px 0 6px">Trovati nella pagina</div>'+found.slice(0,40).map((x,i)=>`<button class="toolRow" data-i="${i}" style="width:100%;text-align:left">${iconSvg(/\.pdf/i.test(x.u)?'file':'image')}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.t)}</span></button>`).join('');
      L.onclick=e=>{ const b=e.target.closest('[data-i]'); if(!b) return; this.go(found[+b.dataset.i].u); };
    }catch(e){ busy(); toast((window.MozartNative&&MozartNative.download)?'Download non riuscito: controlla l\'indirizzo e la connessione':'Il sito non permette il download dal browser: scaricalo e usa Importa → PDF dai File',5200); }
  },
};
