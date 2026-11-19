// ================= Orologio sempre visibile · timer lavoro/pausa (50 + 10 minuti) =================
const Clock = {
  end:0, kind:'', total:0, cycle:true, tick:null,
  init(){
    try{ const s=JSON.parse(localStorage.getItem('mz-timer')||'null'); if(s&&s.end>Date.now()){ Object.assign(this,s); } }catch(e){}
    this.render(); this.tick=setInterval(()=>this.render(),1000);
  },
  fmt(ms){ const s=Math.max(0,Math.round(ms/1000)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; },
  render(){
    const now=new Date(), t=now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
    let tm=''; if(this.end){ const left=this.end-Date.now(); if(left<=0) this.done(); else tm=`<span class="ckT ${this.kind}">${this.kind==='pausa'?'☕':'⏱'} ${this.fmt(left)}</span>`; }
    $$('.clockPill').forEach(el=>el.innerHTML=`<span class="ckH">${t}</span>${tm}`);
  },
  start(min,kind){ this.end=Date.now()+min*60000; this.kind=kind; this.total=min; this.save(); this.render(); toast(kind==='pausa'?`Pausa di ${min} minuti`:`Lavoro: ${min} minuti`,2000); },
  stop(){ this.end=0; this.kind=''; this.save(); this.render(); },
  save(){ try{ localStorage.setItem('mz-timer',JSON.stringify({end:this.end,kind:this.kind,total:this.total,cycle:this.cycle})); }catch(e){} },
  done(){
    const was=this.kind; this.end=0; this.kind=''; this.save();
    try{ ac(); [72,76,79,84].forEach((m,i)=>{ if(!PianoS.note(m,.6,AC.currentTime+i*.18,.6)) Singers.tone(m,.4,AC.currentTime+i*.18,.3); }); }catch(e){}
    try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){}
    const next=was==='lavoro'?['pausa',ST.settings.pauseMin||10]:['lavoro',ST.settings.workMin||50];
    const m2=modal(was==='lavoro'?'Tempo scaduto: pausa!':'Fine della pausa',`<div class="hint" style="font-size:16px">${was==='lavoro'?`Sono passati ${this.total} minuti di lavoro.`:'Si riprende.'}</div>`,
      `<button class="ghostBtn" data-no>Chiudi</button><button class="goldBtn" data-go>${next[0]==='pausa'?'☕ Inizia la pausa':'⏱ Riprendi il lavoro'} (${next[1]} min)</button>`);
    m2.querySelector('[data-no]').onclick=closeLayers; m2.querySelector('[data-go]').onclick=()=>{ closeLayers(); this.start(next[1],next[0]); };
    this.render();
  },
  open(el){
    const w=ST.settings.workMin||50, p=ST.settings.pauseMin||10;
    const pop=popover(el,`<h4>Timer</h4><div style="width:280px;display:flex;flex-direction:column;gap:10px">
      ${this.end?`<div style="text-align:center;font-family:var(--f-display);font-size:40px;color:var(--gold-hi)">${this.fmt(this.end-Date.now())}</div><button class="ghostBtn danger" id="ckStop">${iconSvg('stop')}Ferma il timer</button>`:''}
      <button class="goldBtn block" id="ckWork">⏱ Ora di lavoro · ${w} min</button>
      <button class="ghostBtn" id="ckPause">☕ Pausa · ${p} min</button>
      <div class="grid2"><div class="field"><label for="ckW">Lavoro (min)</label><input id="ckW" type="number" min="1" max="240" value="${w}"></div><div class="field"><label for="ckP">Pausa (min)</label><input id="ckP" type="number" min="1" max="120" value="${p}"></div></div>
      <div class="hint" style="font-size:12.5px">Allo scadere suona un accordo e propone la fase successiva (lavoro → pausa → lavoro).</div></div>`,{id:'ckPop'});
    const read=()=>{ ST.settings.workMin=clamp(+$('#ckW').value||50,1,240); ST.settings.pauseMin=clamp(+$('#ckP').value||10,1,120); saveSettings(); };
    $('#ckW').onchange=read; $('#ckP').onchange=read;
    $('#ckWork').onclick=()=>{ read(); closeLayers(); this.start(ST.settings.workMin,'lavoro'); };
    $('#ckPause').onclick=()=>{ read(); closeLayers(); this.start(ST.settings.pauseMin,'pausa'); };
    const st=$('#ckStop'); if(st) st.onclick=()=>{ this.stop(); closeLayers(); };
  },
};
