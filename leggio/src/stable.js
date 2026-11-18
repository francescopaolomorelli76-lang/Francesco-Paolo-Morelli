// ================= Stabilità, zoom da pulsanti, conflitti d'importazione, emoticon =================

// ---------- Importazioni: file già presente → sostituisci / tieni entrambi / salta ----------
const Conflict = {
  all:null,
  reset(){ this.all=null; },
  ask(name){
    if(this.all) return Promise.resolve(this.all);
    return new Promise(res=>{
      const p=document.createElement('div'); p.className='modal'; p.style.zIndex=96;
      p.innerHTML=`<div class="mHead"><h3><span class="eyebrow">Già in libreria</span>${esc(name)}</h3></div>
        <div class="mBody"><div class="hint">C'è già uno spartito con questo nome. Cosa faccio?</div>
        <div class="switchRow"><b>Vale per tutti i file di questa importazione</b><button class="switch" id="cfAll" role="switch"></button></div></div>
        <div class="mFoot"><button class="ghostBtn" data-c="skip">Salta</button><button class="ghostBtn" data-c="both">Tieni entrambi</button><button class="goldBtn" data-c="replace">${iconSvg('check')}Sostituisci</button></div>`;
      const sc=document.createElement('div'); sc.className='scrim'; sc.style.zIndex=95;
      document.body.append(sc,p); let all=false;
      p.querySelector('#cfAll').onclick=e=>{ all=!all; e.currentTarget.classList.toggle('on',all); };
      p.querySelector('.mFoot').onclick=e=>{ const b=e.target.closest('[data-c]'); if(!b) return; if(all) this.all=b.dataset.c; p.remove(); sc.remove(); res(b.dataset.c); };
    });
  },
};
// Importa un PDF tenendo conto dei doppioni; sostituendo, le annotazioni restano.
async function importPdf(bytes,meta){
  const ex=ST.scores.find(s=>normName(s.file||s.title)===normName(meta.file||meta.title));
  if(ex){ busy(); const c=await Conflict.ask(ex.title);
    if(c==='skip') return null;
    if(c==='replace'){ await replaceBytes(ex,bytes,null); try{ await applyForscoreAnn(ex); }catch(e){} return ex; } }
  return addScore(bytes,meta);
}

// ---------- Zoom e spostamento da pulsanti e tastiera ----------
const ZoomPad = {
  open(el){
    const p=popover(el,`<div style="display:grid;grid-template-columns:repeat(3,52px);gap:6px;justify-items:center">
      <button class="ib" data-z="out" aria-label="Rimpicciolisci">${iconSvg('minus')}</button><button class="ib" data-m="0,1" aria-label="Su">${iconSvg('up')}</button><button class="ib" data-z="in" aria-label="Ingrandisci">${iconSvg('plus')}</button>
      <button class="ib" data-m="1,0" aria-label="Sinistra">${iconSvg('chevLeft')}</button><button class="ib" data-z="fit" aria-label="Pagina intera" style="font-weight:800;font-size:12px">1:1</button><button class="ib" data-m="-1,0" aria-label="Destra">${iconSvg('chevRight')}</button>
      <span></span><button class="ib" data-m="0,-1" aria-label="Giù">${iconSvg('down')}</button><span></span></div>
      <div class="hint" style="font-size:12px;margin-top:8px;text-align:center">Tastiera: + e − ingrandiscono, frecce spostano</div>`,{above:true,id:'zoomPad'});
    p.onclick=e=>{ const z=e.target.closest('[data-z]'), m=e.target.closest('[data-m]');
      if(z) this.zoom(z.dataset.z==='in'?1.25:z.dataset.z==='out'?1/1.25:0);
      if(m){ const [dx,dy]=m.dataset.m.split(',').map(Number); this.pan(dx,dy); } };
  },
  zoom(f){ if(!f){ Zoom.reset(); return; } Zoom.z=clamp(Zoom.z*f,1,5); if(Zoom.z<1.02){ Zoom.reset(); return; } Zoom.clampPan(); Zoom.apply(); this._r=this._r||debounce(()=>renderPage(0,{noPrefetch:true}),250); this._r(); },
  pan(dx,dy){ if(Zoom.z<=1.02) return; const s=stage.getBoundingClientRect(); Zoom.x+=dx*s.width*.2; Zoom.y+=dy*s.height*.2; Zoom.clampPan(); Zoom.apply(); },
};

// ---------- Emoticon nei segni ----------
(function(){
  const e=(c,n)=>({c,f:'e',n});
  STAMP_CATS.splice(1,0,{id:'emoji',name:'Emoticon',items:[
    e('😊','sorriso'),e('🙂','ok'),e('😮','stupore'),e('🤫','piano!'),e('😴','sveglia'),e('😢','triste'),e('😡','attenzione'),e('😂','ridere'),
    e('👍','bene'),e('👏','bravo'),e('🙏','grazie'),e('✋','stop'),e('👀','guarda'),e('👁','occhio'),e('👂','ascolta'),e('👄','articola'),
    e('🫁','respira'),e('💨','fiato'),e('🎤','solo'),e('🎵','nota'),e('🎶','melodia'),e('🎼','partitura'),e('🎹','pianoforte'),e('🔔','attacco'),
    e('⏱','tempo'),e('🐢','più lento'),e('🐇','più veloce'),e('⬆️','sali'),e('⬇️','scendi'),e('↗️','cresci'),e('↘️','cala'),e('🔁','ripeti'),
    e('⚠️','attenzione'),e('❗','importante'),e('❓','dubbio'),e('✅','fatto'),e('❌','no'),e('⭐','bello'),e('❤️','con amore'),e('🔥','forte'),
    e('💡','idea'),e('✏️','nota'),e('📌','qui'),e('🎯','intonazione'),e('🧘','rilassati'),e('😀','sorridi'),e('🤝','insieme'),e('👑','solista'),
  ]});
})();
