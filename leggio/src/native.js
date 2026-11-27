// ================= Ponte con l'app nativa Mozart per iPad/iPhone =================
// Nell'app (WKWebView) esiste window.webkit.messageHandlers.mozart: condivisione nativa (AirDrop, WhatsApp, File),
// lettura del testo stampato con Vision di Apple, file aperti da File/AirDrop ("Apri con Mozart").
(function(){
  const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mozart;
  if(!h) return;
  const call = msg => h.postMessage(msg);
  const b64 = async blob => { const u8=new Uint8Array(await blob.arrayBuffer()); let s=''; for(let i=0;i<u8.length;i+=32768) s+=String.fromCharCode.apply(null,u8.subarray(i,i+32768)); return btoa(s); };
  window.MozartNative = {
    app:true,
    // invia un file al foglio di condivisione di iOS, a pezzi per i PDF grandi
    async shareBlob(blob,name){
      const id=Math.random().toString(36).slice(2), CH=3<<20;
      await call({cmd:'fileBegin',id,name});
      for(let o=0;o<blob.size;o+=CH) await call({cmd:'fileChunk',id,data:await b64(blob.slice(o,o+CH))});
      return call({cmd:'fileShare',id});
    },
    async ocr(dataUrl){ return call({cmd:'ocr',image:dataUrl}); },
    // scanner di documenti di iPhone/iPad (VisionKit): restituisce le pagine come immagini JPEG
    async scanDocs(){ return call({cmd:'scanDocs'}); },
    // scarica un file dal web senza i blocchi del browser: {name,mime,data(base64)}
    async download(url){ return call({cmd:'download',url}); },
    keepAwake(on){ return call({cmd:'keepAwake',on:!!on}); },
    mail(to,subject,body){ return call({cmd:"mail",to,subject,body}); },
    setSecure(on){ return call({cmd:"setSecure",on:!!on}); },
    getSecure(){ return call({cmd:"getSecure"}); },
    // file arrivati da fuori: l'app li serve su mozart://localhost/__inbox/...
    async receive(list){
      for(const f of list){
        try{
          busy(`Apro “${f.name}”…`);
          const blob=await (await fetch(f.url)).blob(); const file=new File([blob],f.name,{type:blob.type});
          busy();
          if(/\.pdf$/i.test(f.name)){ const sc=await addScore(await file.arrayBuffer(),{title:f.name.replace(/\.pdf$/i,'').replace(/_+/g,' '),file:f.name,fromFile:true}); renderLibrary(); await openScore(sc.id); toast('Spartito importato'); }
          else if(/\.(png|jpe?g|heic|heif|tiff?)$/i.test(f.name)){ Scan.start([file], ST.cur?'insert':'new'); }
          else await FS4.run([file]);
        }catch(e){ busy(); toast('Non riesco ad aprire '+f.name); }
      }
    },
  };
  // nell'app: condivisione e salvataggi passano dal foglio nativo
  window.shareFile = async (blob,name)=>{ try{ await MozartNative.shareBlob(blob,name); return true; }catch(e){ toast('Condivisione non riuscita'); return false; } };
  window.offerDownload = (blob,name)=>{ MozartNative.shareBlob(blob,name).catch(()=>toast('Salvataggio non riuscito')); };
  document.documentElement.classList.add('in-app');
})();
