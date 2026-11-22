// ================= Figure musicali ridimensionabili · torna indietro sulle pagine · tastiera MIDI/Bluetooth chiara =================

// ---------- Pannello dei segni: si allarga e si allunga con la maniglia, simboli più piccoli, scorre bene ----------
Anno.stampFit=function(p){
  const S=ST.settings; p.style.setProperty('--cell',[46,58,74][S.spDen??0]+'px');
  p.style.width=S.spW?S.spW+'px':''; p.style.height=S.spH?S.spH+'px':'';
  p.classList.toggle('sized',!!S.spH);
  const h=p.querySelector('#spRs'); if(!h) return;
  h.classList.toggle('left',!!this.stampRight);
  h.onpointerdown=e=>{ e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId);
    const r=p.getBoundingClientRect(), x0=e.clientX, y0=e.clientY, w0=r.width, h0=r.height, right=!!this.stampRight;
    const mv=ev=>{ const w=clamp(w0+(ev.clientX-x0)*(right?-1:1),260,innerWidth-16), hh=clamp(h0+(ev.clientY-y0),240,innerHeight-r.top-12); p.style.width=w+'px'; p.style.height=hh+'px'; p.classList.add('sized'); S.spW=Math.round(w); S.spH=Math.round(hh); };
    const up=()=>{ h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); h.removeEventListener('pointercancel',up); saveSettings(); };
    h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up); };
  h.ondblclick=()=>{ delete S.spW; delete S.spH; p.style.width=''; p.style.height=''; p.classList.remove('sized'); saveSettings(); toast('Misura automatica',900); };
  const d=p.querySelector('#spDen'); if(d) d.onclick=()=>{ S.spDen=((S.spDen??0)+1)%3; saveSettings(); this.stampFit(p); toast(['Simboli piccoli','Simboli medi','Simboli grandi'][S.spDen],900); };
};

// ---------- Torna indietro: ogni modifica alle pagine del PDF (correzione, inserimento, Crea…) si può annullare ----------
const PdfUndo = {
  toastEl:null, busyNow:false,
  async has(sc){ return !!(sc&&sc.hasBak); },
  async save(sc){ try{ const cur=await getBytes(sc); const ann=(ST.cur&&ST.cur.id===sc.id)?ST.ann:(await DB.get('ann:'+sc.id))||{};
    await DB.set('bak:'+sc.id,{bytes:cur,ann:JSON.parse(JSON.stringify(ann)),bm:JSON.parse(JSON.stringify(sc.bookmarks||[])),page:ST.page,fix:sc.fix,pfix:sc.pfix,compose:sc.compose}); sc.hasBak=1; }catch(e){} },
  // barretta "Annulla" per qualche secondo dopo la modifica
  offer(msg){ this.toastEl?.remove(); const t=document.createElement('div'); t.id='undoToast'; t.innerHTML=`<span>${esc(msg)}</span><button>↩ Annulla</button>`; $('#app').appendChild(t); this.toastEl=t;
    t.querySelector('button').onclick=()=>{ t.remove(); this.run(); }; setTimeout(()=>t.classList.add('on'),20); setTimeout(()=>{ t.classList.remove('on'); setTimeout(()=>t.remove(),400); },9000); },
  async run(sc){ sc=sc||ST.cur; if(!sc) return; const b=await DB.get('bak:'+sc.id); if(!b) return toast('Non c\'è niente da annullare');
    busy('Torno indietro…'); try{ this.busyNow=true; // la versione attuale diventa il nuovo "indietro": si può anche rifare
      const now=await getBytes(sc), annNow=(ST.cur&&ST.cur.id===sc.id)?JSON.parse(JSON.stringify(ST.ann)):((await DB.get('ann:'+sc.id))||{});
      sc.bookmarks=b.bm||sc.bookmarks; if(b.fix!==undefined) sc.fix=b.fix; if(b.pfix!==undefined) sc.pfix=b.pfix; sc.auto={}; if(b.compose!==undefined) sc.compose=b.compose;
      const page=b.page||0; ST.page=page;
      await _replaceBytes0(sc,b.bytes,b.ann||{}); pageCache.clear(); if(ST.cur&&ST.cur.id===sc.id) await renderPage(0);
      await DB.set('bak:'+sc.id,{bytes:now,ann:annNow,bm:[],page:ST.page}); sc.hasBak=1; await DB.putScore(sc); busy(); renderLibrary(); toast('Fatto: sei tornato a prima della modifica · tocca di nuovo per rifare',3200);
    }catch(e){ busy(); toast('Non riesco a tornare indietro'); } finally{ this.busyNow=false; } },
};
const _replaceBytes0=replaceBytes;
replaceBytes=async function(sc,bytes,ann){ if(!PdfUndo.busyNow) await PdfUndo.save(sc); const r=await _replaceBytes0.apply(this,arguments); if(!PdfUndo.busyNow) PdfUndo.offer('Pagine modificate'); return r; };
// pulsante nel pannello Migliora e nel menu Inserisci
(function(){ const fo=Fix.open; Fix.open=function(el){ fo.apply(this,arguments); const p=$('#fixPop'); if(p&&ST.cur&&ST.cur.hasBak){ const b=document.createElement('button'); b.className='ghostBtn'; b.id='fxUndo'; b.innerHTML=`${iconSvg('undo')}Torna a prima dell'ultima modifica alle pagine`; b.onclick=()=>{ closeLayers(); PdfUndo.run(); }; p.querySelector('div').appendChild(b); } }; })();
(function(){ const io=Insert.open; Insert.open=function(){ io.apply(this,arguments); const c=document.querySelector('.srcCards'); if(c&&ST.cur&&ST.cur.hasBak){ const b=document.createElement('button'); b.className='srcCard'; b.innerHTML=`${iconSvg('undo')}<b>Annulla l'ultima modifica</b><span>Torna alle pagine di prima.</span>`; b.onclick=()=>{ closeLayers(); PdfUndo.run(); }; c.appendChild(b); } }; })();
// anche nel confronto "prima e dopo": sotto i pulsanti c'è già "Usa in lettura" (reversibile); dopo "Correggi per sempre" compare "Annulla" (barretta)

// ---------- Tastiera MIDI: pannello chiaro (stato, passi, prova) ----------
Midi.devices=[]; Midi.lastNote=null;
window.MozartMIDIDevices=list=>{ Midi.devices=list||[]; Midi.refreshPanel&&Midi.refreshPanel(); };
Midi.noteName=n=>['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'][n%12]+(Math.floor(n/12)-1);
(function(){ const on0=Midi.noteOn.bind(Midi); Midi.noteOn=function(n,v){ Midi.lastNote=n; Midi.lastAt=Date.now(); Midi.refreshPanel&&Midi.refreshPanel(); return on0(n,v); }; })();
Midi.native=()=>!!(window.MozartNative&&MozartNative.app);
Midi.poll=async function(){ try{ if(this.native()){ const names=await window.webkit.messageHandlers.mozart.postMessage({cmd:'midiStatus'}); this.devices=names||[]; } else if(this.acc){ this.devices=[...this.acc.inputs.values()].map(i=>i.name||'Tastiera MIDI'); } }catch(e){} this.refreshPanel(); };
Midi.refreshPanel=function(){ const p=$('#midiPanel'); if(!p) return; const n=this.devices.length;
  p.querySelector('#mdStatus').className='mdStatus '+(n?'ok':'no'); p.querySelector('#mdStatus').innerHTML=n?`<i></i><div><b>Tastiera collegata</b><small>${this.devices.map(esc).join(' · ')}</small></div>`:`<i></i><div><b>Nessuna tastiera collegata</b><small>Segui i tre passi qui sotto</small></div>`;
  const t=p.querySelector('#mdTest'); if(t){ const fresh=this.lastNote!=null&&Date.now()-this.lastAt<4000; t.className='mdTest'+(fresh?' on':''); t.textContent=fresh?`Ricevuto: ${this.noteName(this.lastNote)} ✓ funziona!`:(n?'Suona un tasto: qui compare la nota':'In attesa di una tastiera…'); }
  $$('.midiDot').forEach(x=>x.classList.toggle('on',n>0)); };
Midi.connect=async function(){
  PianoS.preload(36,96);
  const nat=this.native(), web=!!navigator.requestMIDIAccess;
  const m2=modal('Tastiera MIDI',`<div id="mdStatus" class="mdStatus no"></div>
    <div class="mdSteps">
      <div class="mdStep"><b>1</b><div><h5>Accendi la tastiera</h5><p>Metti la tastiera in modalità <b>Bluetooth</b> (di solito tieni premuto il tasto Bluetooth finché la luce lampeggia). Con il cavo: usa l'adattatore USB dell'iPad e salta al passo 3.</p></div></div>
      <div class="mdStep"><b>2</b><div><h5>Abbinala all'iPad</h5><p>Tocca il pulsante qui sotto: si apre la finestra di Apple con l'elenco. Tocca il nome della tua tastiera finché compare <b>Connesso</b>, poi premi <b>Fine</b>.</p>
        ${nat?`<button class="goldBtn" id="mdPair">${iconSvg('wand')}Cerca tastiera Bluetooth</button>`:`<button class="goldBtn" id="mdPair">${iconSvg('wand')}${web?'Collega tastiera MIDI':'Non disponibile in questo browser'}</button>`}</p></div></div>
      <div class="mdStep"><b>3</b><div><h5>Provala</h5><p>Suona un tasto: sotto compare il nome della nota e il pianoforte sullo schermo si accende.</p><div id="mdTest" class="mdTest"></div></div></div></div>
    <div class="hint" style="font-size:12.5px;margin-top:10px">${nat?'Se la tastiera non compare: spegnila e riaccendila, poi riprova il passo 2. Una tastiera abbinata di solito si riconnette da sola quando la accendi.':web?'Questo browser vede solo tastiere MIDI già collegate. Per il Bluetooth usa l\'app Mozart.':'Safari non supporta le tastiere MIDI: usa l\'app Mozart per iPad/iPhone. Intanto puoi suonare con la tastiera del computer: A W S E D F T G Y H U J K.'}</div>`,
    `<button class="ghostBtn" data-close2>Chiudi</button>`,{eyebrow:'Per Cantanti e pianoforte'});
  m2.querySelector('[data-close2]').onclick=()=>{ clearInterval(this._poll); closeLayers(); };
  const x=m2.querySelector('[data-close]'); if(x){ const o=x.onclick; x.onclick=()=>{ clearInterval(this._poll); o&&o(); }; }
  m2.id='midiPanel'; this.refreshPanel();
  $('#mdPair').onclick=async()=>{
    if(nat){ try{ await window.webkit.messageHandlers.mozart.postMessage({cmd:'midiBluetooth'}); }catch(e){ toast('MIDI non disponibile'); } setTimeout(()=>this.poll(),1500); return; }
    if(!web) return; try{ this.acc=await navigator.requestMIDIAccess(); const hook=()=>{ this.acc.inputs.forEach(i=>i.onmidimessage=e=>this.msg(e.data[0],e.data[1],e.data[2])); this.poll(); }; hook(); this.acc.onstatechange=hook; if(!this.acc.inputs.size) toast('Nessuna tastiera trovata: collegala e riprova',3000); }catch(e){ toast('Accesso MIDI negato'); } };
  this.poll(); clearInterval(this._poll); this._poll=setInterval(()=>{ if(!$('#midiPanel')){ clearInterval(this._poll); return; } this.poll(); },2000);
};
// il pallino verde sui pulsanti "Tastiera MIDI" mostra se è collegata
(function(){ const fix=()=>$$('[data-act="midi"]').forEach(b=>{ if(b.dataset.m2) return; b.dataset.m2=1; b.innerHTML='🎹 Collega tastiera (Bluetooth / cavo)<i class="midiDot"></i>'; }); setInterval(fix,1500); fix(); })();
if(Midi.native()) setTimeout(()=>Midi.poll(),1500);
