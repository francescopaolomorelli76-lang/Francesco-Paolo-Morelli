// ================= Pianoforte vero (campioni registrati) · tastiera MIDI/Bluetooth · tastiera del computer =================
// Campioni: pianoforte a coda registrato (tonejs-instruments, licenza CC-BY 3.0), uno ogni terza minore,
// trasposti di ±1 semitono: suono reale su tutta la tastiera.
const PianoS = {
  list:(()=>{ const o=[]; const N={C:0,Ds:3,Fs:6,A:9}; for(let oc=1;oc<=7;oc++) for(const k of ['C','Ds','Fs','A']) o.push({midi:12*(oc+1)+N[k],file:k+oc+'.mp3'}); o.push({midi:108,file:'C8.mp3'}); return o; })(),
  buf:new Map(), loading:new Map(), failed:false,
  nearest(m){ let b=this.list[0]; for(const s of this.list) if(Math.abs(s.midi-m)<Math.abs(b.midi-m)) b=s; return b; },
  load(s){
    if(this.buf.has(s.file)) return Promise.resolve(this.buf.get(s.file));
    if(this.loading.has(s.file)) return this.loading.get(s.file);
    const pr=(async()=>{ ac(); const r=await fetch(PIANO_URL+s.file); if(!r.ok) throw new Error('campione mancante'); const ab=await r.arrayBuffer();
      const b=await new Promise((res,rej)=>AC.decodeAudioData(ab,res,rej)); this.buf.set(s.file,b); return b; })();
    pr.catch(()=>{ this.failed=true; this.loading.delete(s.file); }); this.loading.set(s.file,pr); return pr;
  },
  preload(lo=48,hi=84){ for(const s of this.list) if(s.midi>=lo-2&&s.midi<=hi+2) this.load(s).catch(()=>{}); },
  // suona e restituisce la voce (per fermarla al rilascio del tasto); null se il campione non è ancora pronto
  start(m,when,vol=.6){
    ac(); const s=this.nearest(m), b=this.buf.get(s.file); if(!b){ this.load(s).catch(()=>{}); return null; }
    const t=when??AC.currentTime; const src=AC.createBufferSource(); src.buffer=b;
    src.playbackRate.value=Math.pow(2,(m-s.midi)/12)*(Metro.A4/440);
    const g=AC.createGain(); g.gain.setValueAtTime(vol,t); src.connect(g).connect(AC.destination); src.start(t);
    return {src,g};
  },
  stop(v,when,rel=.25){ if(!v) return; const t=Math.max(when??AC.currentTime,AC.currentTime); try{ v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0,t,rel/3); v.src.stop(t+rel*3); }catch(e){} },
  // nota di durata fissa (vocalizzi, ascolto): true se suonata con il pianoforte vero
  note(m,dur,when,vol=.5,stacc){ const v=this.start(m,when,vol); if(!v) return false; this.stop(v,(when??AC.currentTime)+(stacc?Math.min(dur,.14):dur),stacc?.08:.3); return true; },
};

// ---------- MIDI: tastiera collegata via Bluetooth o cavo ----------
const Midi = {
  on:new Map(), ready:false,
  msg(st,a,b){ const c=st&0xf0; if(c===0x90&&b>0) this.noteOn(a,b); else if(c===0x80||(c===0x90&&b===0)) this.noteOff(a); else if(c===0xb0&&a===64) this.pedal(b>=64); },
  sustain:false, held:new Set(),
  pedal(on){ this.sustain=on; if(!on){ for(const n of this.held) if(!this.on.has('k'+n)) this.release(n); this.held.clear(); } },
  voiceOn(n,vel=100){ if(this.voices&&this.voices.has(n)) this.release(n); const v=PianoS.start(n,undefined,.15+vel/127*.65)||synthStart(n,vel); (this.voices=this.voices||new Map()).set(n,v); },
  noteOn(n,vel=100){ this.voiceOn(n,vel); this.on.set('k'+n,1); Piano.light(n,true); Singers.midiOn&&Singers.midiOn(n); },
  noteOff(n){ this.on.delete('k'+n); Piano.light(n,false); Singers.midiOff&&Singers.midiOff(n); if(this.sustain){ this.held.add(n); return; } this.release(n); },
  release(n){ const v=this.voices&&this.voices.get(n); if(!v) return; if(v.osc) synthStop(v); else PianoS.stop(v); this.voices.delete(n); },
  async connect(){
    PianoS.preload(36,96);
    if(window.MozartNative&&MozartNative.app){ try{ const n=await window.webkit.messageHandlers.mozart.postMessage({cmd:'midiBluetooth'}); toast(n>0?`Tastiera MIDI pronta (${n} collegate)`:'Accendi la tastiera Bluetooth e sceglila nella finestra',3200); }catch(e){ toast('MIDI non disponibile'); } return; }
    if(!navigator.requestMIDIAccess){ toast('In questo browser le tastiere MIDI non sono supportate: usa l\'app Mozart per iPad o la tastiera del computer (A W S E D…)',4200); return; }
    try{ const acc=await navigator.requestMIDIAccess(); const hook=()=>acc.inputs.forEach(i=>i.onmidimessage=e=>this.msg(e.data[0],e.data[1],e.data[2])); hook(); acc.onstatechange=hook;
      toast(acc.inputs.size?`Tastiera MIDI collegata (${acc.inputs.size})`:'Nessuna tastiera MIDI trovata: collegala e riprova',3000); }
    catch(e){ toast('Accesso MIDI negato'); }
  },
};
window.MozartMIDI=(a,b,c)=>Midi.msg(a,b,c);
function synthStart(m,vel){ ac(); const f=Metro.A4*Math.pow(2,(m-69)/12), t=AC.currentTime, g=AC.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.3*vel/127+.05,t+.01); g.gain.setTargetAtTime(.1,t+.05,.4); g.connect(AC.destination);
  const osc=AC.createOscillator(); osc.type='triangle'; osc.frequency.value=f; osc.connect(g); osc.start(t); return {osc,g}; }
function synthStop(v){ const t=AC.currentTime; v.g.gain.setTargetAtTime(0,t,.08); v.osc.stop(t+.5); }

// ---------- Tastiera del computer (anche Bluetooth): A W S E D F T G Y H U J K O L P ----------
(function(){
  const map={a:0,w:1,s:2,e:3,d:4,f:5,t:6,g:7,y:8,h:9,u:10,j:11,k:12,o:13,l:14,p:15,';':16,'ò':16};
  const active=()=>$('#pianoSheet')?.classList.contains('open')||(Singers&&Singers.tab==='make'&&$('#mkKeys'));
  const base=()=>$('#mkKeys')&&Singers.tab==='make'?Singers.start-(Singers.start%12):60+Piano.oct*12;
  const down=new Set();
  addEventListener('keydown',e=>{ if(e.metaKey||e.ctrlKey||e.altKey||!active()||e.target.matches('input,textarea')||e.target.isContentEditable) return;
    const k=e.key.toLowerCase(); if(k==='z'||k==='x'){ Piano.oct=clamp(Piano.oct+(k==='x'?1:-1),-3,2); toast('Ottava '+(4+Piano.oct)); e.preventDefault(); e.stopPropagation(); return; }
    if(!(k in map)) return; e.preventDefault(); e.stopPropagation(); if(down.has(k)) return; down.add(k); Midi.noteOn(base()+map[k],100); },true);
  addEventListener('keyup',e=>{ const k=e.key.toLowerCase(); if(!down.has(k)) return; down.delete(k); Midi.noteOff(base()+map[k]); },true);
})();
