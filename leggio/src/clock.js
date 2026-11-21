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
    // data del giorno: "ven 20 nov"
    const dt=now.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'}).replace(/\./g,'');
    const html=`<span class="ckD">${dt}</span><span class="ckH">${t}</span>${tm}`;
    $$('.clockPill').forEach(el=>{ if(el._h!==html){ el._h=html; el.innerHTML=html; } });
    // l'orologio piccolo in lettura sparisce quando c'è la barra superiore o si annota
    const mc=$('#miniClock'), tb=$('#topbar'); if(mc) mc.classList.toggle('off',!!(ST.annotate||(tb&&!tb.classList.contains('hide'))));
  },
  start(min,kind){ try{ ac(); }catch(e){} Alarm.prepare(); this.end=Date.now()+min*60000; this.kind=kind; this.total=min; this.save(); this.render(); toast(kind==='pausa'?`Pausa di ${min} minuti`:`Lavoro: ${min} minuti`,2000); },
  stop(){ this.end=0; this.kind=''; this.save(); this.render(); },
  save(){ try{ localStorage.setItem('mz-timer',JSON.stringify({end:this.end,kind:this.kind,total:this.total,cycle:this.cycle})); }catch(e){} },
  done(){
    const was=this.kind; this.end=0; this.kind=''; this.save();
    Alarm.ring();
    try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){}
    const next=was==='lavoro'?['pausa',ST.settings.pauseMin||10]:['lavoro',ST.settings.workMin||50];
    const m2=modal(was==='lavoro'?'Tempo scaduto: pausa!':'Fine della pausa',`<div class="hint" style="font-size:16px">${was==='lavoro'?`Sono passati ${this.total} minuti di lavoro.`:'Si riprende.'}</div>`,
      `<button class="ghostBtn" data-no>Chiudi</button><button class="goldBtn" data-go>${next[0]==='pausa'?'☕ Inizia la pausa':'⏱ Riprendi il lavoro'} (${next[1]} min)</button>`);
    m2.querySelector('[data-no]').onclick=()=>{ Alarm.stop(); closeLayers(); }; m2.querySelector('[data-go]').onclick=()=>{ Alarm.stop(); closeLayers(); this.start(next[1],next[0]); };
    m2.addEventListener('pointerdown',()=>Alarm.stop(),{once:true});
    this.render();
  },
  open(el){
    const w=ST.settings.workMin||50, p=ST.settings.pauseMin||10;
    const pop=popover(el,`<h4>Timer</h4><div style="width:280px;display:flex;flex-direction:column;gap:10px">
      ${this.end?`<div style="text-align:center;font-family:var(--f-display);font-size:40px;color:var(--gold-hi)">${this.fmt(this.end-Date.now())}</div><button class="ghostBtn danger" id="ckStop">${iconSvg('stop')}Ferma il timer</button>`:''}
      <button class="goldBtn block" id="ckWork">⏱ Ora di lavoro · ${w} min</button>
      <button class="ghostBtn" id="ckPause">☕ Pausa · ${p} min</button>
      <div class="grid2"><div class="field"><label for="ckW">Lavoro (min)</label><input id="ckW" type="number" min="1" max="240" value="${w}"></div><div class="field"><label for="ckP">Pausa (min)</label><input id="ckP" type="number" min="1" max="120" value="${p}"></div></div>
      <div class="field"><label for="ckSnd">Suoneria della sveglia</label><div style="display:flex;gap:6px"><select id="ckSnd" style="flex:1">${ALARMS.map((a,i)=>`<option value="${i}"${String(ST.settings.alarm??0)===String(i)?' selected':''}>${a.n}</option>`).join('')}<option value="mp3"${ST.settings.alarm==='mp3'?' selected':''}>${ST.settings.alarmName?'🎵 '+esc(ST.settings.alarmName):'🎵 Mio file mp3'}</option></select><button class="ib" id="ckPlay" aria-label="Ascolta">${iconSvg('play')}</button></div></div>
      <button class="ghostBtn" id="ckMp3">${iconSvg('plus')}Carica una suoneria (mp3)</button>
      <div class="hint" style="font-size:12.5px">Allo scadere la sveglia suona finché non tocchi lo schermo (al massimo un minuto) e propone la fase successiva (lavoro → pausa → lavoro).</div></div>`,{id:'ckPop'});
    $('#ckSnd').onchange=e=>{ ST.settings.alarm=e.target.value; saveSettings(); Alarm.stop(); Alarm.preview(); };
    $('#ckPlay').onclick=()=>{ if(Alarm.on) Alarm.stop(); else Alarm.preview(); };
    $('#ckMp3').onclick=()=>{ const f=document.createElement('input'); f.type='file'; f.accept='audio/*,.mp3,.m4a,.wav'; f.onchange=async()=>{ const file=f.files[0]; if(!file) return;
        if(file.size>8e6) return toast('File troppo grande (massimo 8 MB)');
        await DB.set('alarmFile',await blobToDataURL(file)); Alarm.buf=null; ST.settings.alarm='mp3'; ST.settings.alarmName=file.name.replace(/\.[^.]+$/,''); saveSettings(); toast('Suoneria caricata: '+ST.settings.alarmName,2200); closeLayers(); this.open(el); }; f.click(); };
    const read=()=>{ ST.settings.workMin=clamp(+$('#ckW').value||50,1,240); ST.settings.pauseMin=clamp(+$('#ckP').value||10,1,120); saveSettings(); };
    $('#ckW').onchange=read; $('#ckP').onchange=read;
    $('#ckWork').onclick=()=>{ read(); closeLayers(); this.start(ST.settings.workMin,'lavoro'); };
    $('#ckPause').onclick=()=>{ read(); closeLayers(); this.start(ST.settings.pauseMin,'pausa'); };
    const st=$('#ckStop'); if(st) st.onclick=()=>{ this.stop(); closeLayers(); };
  },
};

// ---------- Suonerie della sveglia: 10 suoni sintetizzati + un mp3 a scelta ----------
const ALARMS=[
  {n:'Accordo di pianoforte'},{n:'Sveglia classica'},{n:'Campanello'},{n:'Carillon'},{n:'Arpa'},
  {n:'Marimba'},{n:'Campane'},{n:'Gong'},{n:'Digitale'},{n:'Uccellini'}];
const Alarm = {
  on:false, timer:null, until:0, buf:null, src:null,
  // nota singola: frequenza, inizio, durata, forma d'onda, volume
  tone(f,t,d,type='sine',v=.25,attack=.005){ const A=ac(), o=A.createOscillator(), g=A.createGain(); o.type=type; o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+attack); g.gain.exponentialRampToValueAtTime(.0008,t+d); o.connect(g).connect(A.destination); o.start(t); o.stop(t+d+.05); return o; },
  hz(m){ return 440*Math.pow(2,(m-69)/12); },
  // un giro della suoneria scelta (circa 2 secondi)
  cycle(id){ const A=ac(), t=A.currentTime+.03, T=this.tone.bind(this), H=this.hz;
    switch(+id){
      case 0: [72,76,79,84].forEach((m,i)=>{ if(!(typeof PianoS!=='undefined'&&PianoS.note(m,.6,t+i*.18,.6))) T(H(m),t+i*.18,1.2,'triangle',.25); }); break;
      case 1: for(let i=0;i<8;i++){ T(2200,t+i*.12,.08,'square',.12); T(2600,t+i*.12+.04,.06,'square',.08); } break;
      case 2: for(let i=0;i<3;i++){ T(1318,t+i*.5,.45,'sine',.3); T(1046,t+i*.5+.22,.6,'sine',.25); } break;
      case 3: [84,88,91,96,91,88,84,79].forEach((m,i)=>{ T(H(m),t+i*.2,.9,'sine',.18); T(H(m+12),t+i*.2,.5,'sine',.05); }); break;
      case 4: [60,64,67,72,76,79,84,88].forEach((m,i)=>T(H(m),t+i*.09,1.4,'triangle',.18)); break;
      case 5: [72,79,76,84,79,76].forEach((m,i)=>T(H(m),t+i*.16,.35,'sine',.35,.002)); break;
      case 6: [67,64,60,55].forEach((m,i)=>{ T(H(m),t+i*.45,2,'sine',.25); T(H(m)*2.76,t+i*.45,1.2,'sine',.07); }); break;
      case 7: T(110,t,3,'sine',.4,.01); T(110*2.4,t,2.2,'sine',.12,.01); T(110*3.9,t,1.5,'sine',.06,.01); break;
      case 8: for(let r=0;r<2;r++) for(let i=0;i<4;i++) T(1000,t+r*.9+i*.13,.08,'square',.15); break;
      case 9: for(let i=0;i<6;i++){ const s=t+i*.3+Math.random()*.08, o=T(2600+Math.random()*800,s,.18,'sine',.12); o.frequency.exponentialRampToValueAtTime(3800+Math.random()*900,s+.15); } break;
    } },
  async loadMp3(){ if(this.buf) return this.buf; const d=await DB.get('alarmFile'); if(!d) return null;
    const ab=await (await fetch(d)).arrayBuffer(); this.buf=await new Promise((res,rej)=>ac().decodeAudioData(ab,res,rej)); return this.buf; },
  prepare(){ if(ST.settings.alarm==='mp3') this.loadMp3().catch(()=>{}); },
  playOnce(){ const id=ST.settings.alarm??0;
    if(id==='mp3'&&this.buf){ const A=ac(), s=A.createBufferSource(), g=A.createGain(); g.gain.value=.9; s.buffer=this.buf; s.connect(g).connect(A.destination); s.start(); this.src=s; return Math.min(30,this.buf.duration)+.6; }
    this.cycle(id==='mp3'?0:id); return 2.4; },
  async ring(){ this.stop(); this.on=true; this.until=Date.now()+60000; if(ST.settings.alarm==='mp3'){ try{ await this.loadMp3(); }catch(e){} }
    try{ navigator.vibrate&&navigator.vibrate([300,150,300,150,300]); }catch(e){}
    const loop=()=>{ if(!this.on||Date.now()>this.until){ this.stop(); return; } let d=2.4; try{ d=this.playOnce(); }catch(e){} this.timer=setTimeout(loop,d*1000); }; loop(); },
  async preview(){ this.stop(); this.on=true; if(ST.settings.alarm==='mp3'){ try{ await this.loadMp3(); }catch(e){ toast('Non riesco a leggere il file audio'); } } let d=2.4; try{ d=this.playOnce(); }catch(e){} this.timer=setTimeout(()=>this.stop(),Math.min(d,8)*1000); },
  stop(){ this.on=false; clearTimeout(this.timer); try{ this.src&&this.src.stop(); }catch(e){} this.src=null; },
};
