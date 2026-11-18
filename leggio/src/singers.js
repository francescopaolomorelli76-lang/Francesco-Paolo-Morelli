// ================= Per Cantanti: vocalizzi trasportabili, vocalizzo da tastiera, registrazione =================
// Un vocalizzo è una sequenza di note: n = semitoni dalla tonica, d = durata in battiti.
const vq=(arr,d=1)=>arr.map(n=>({n,d}));
const VOC_BASE=[
  {id:'scala5', name:'Scala di 5 note', syl:'Mi-a / Zi-a', notes:[...vq([0,2,4,5,7,5,4,2],.5),{n:0,d:2}]},
  {id:'arp', name:'Arpeggio 1-3-5-8', syl:'A / No', notes:[...vq([0,4,7,12,7,4],.75),{n:0,d:2}]},
  {id:'terze', name:'Terze 1-3-2-4-3-5', syl:'La-le-li-lo-lu', notes:[...vq([0,4,2,5,4,7,5,2],.5),{n:0,d:2}]},
  {id:'nona', name:'Scala di nona', syl:'A (legato)', notes:[...vq([0,2,4,5,7,9,11,12,14,12,11,9,7,5,4,2],.25),{n:0,d:2}]},
  {id:'stacc', name:'Triade staccata', syl:'Ha-ha-ha', notes:[...vq([0,4,7,4],.5).map(o=>({...o,st:1})),{n:0,d:1,st:1},{n:-12,d:0,rest:1}]},
  {id:'ripet', name:'Nota ribattuta 5 vocali', syl:'Ma-me-mi-mo-mu', notes:[...vq([0,0,0,0],.75),{n:0,d:2}]},
  {id:'ottava', name:'Salto d\'ottava', syl:'Ng-a', notes:[{n:0,d:1},{n:12,d:1.5},{n:11,d:.5},{n:7,d:.5},{n:4,d:.5},{n:0,d:2}]},
  {id:'sirena', name:'Sirena (glissando)', syl:'Ng / U', notes:[...vq([0,2,4,5,7,9,11,12],.18),...vq([11,9,7,5,4,2],.18),{n:0,d:1.5}]},
  {id:'quinta', name:'Quinta discendente', syl:'Mi-ao', notes:[...vq([7,5,4,2],.5),{n:0,d:2}]},
  {id:'rossini', name:'Agilità (scala veloce)', syl:'A', notes:[...vq([0,2,4,5,7,9,11,12,11,9,7,5,4,2],.125),{n:0,d:1.5}]},
];
const VOICES=[['Soprano',60],['Mezzosoprano',57],['Contralto',55],['Tenore',48],['Baritono',45],['Basso',41]]; // MIDI della tonica di partenza
const midiName=m=>NOTE_IT[(m%12+12)%12]+(Math.floor(m/12)-1);
const midiHz=m=>Metro.A4*Math.pow(2,(m-69)/12);

const Singers = {
  tab:'voc', sel:'scala5', start:48, steps:7, dir:'up', bpm:96, chord:true, playing:false, cur:0, saved:[], takes:[],
  midiOn(n){ if(this.rec) this.rec.on.set('m'+n,{m:n,t:performance.now()}); const k=$(`#mkKeys [data-m="${n}"]`); if(k) k.classList.add('dn'); },
  midiOff(n){ const k=$(`#mkKeys [data-m="${n}"]`); if(k) k.classList.remove('dn'); const r=this.rec&&this.rec.on.get('m'+n); if(r){ this.rec.on.delete('m'+n); this.rec.notes.push({m:r.m,t:r.t,e:performance.now()}); this.raw=this.rec.notes; this.drawRoll(true); } },
  async open(){
    PianoS.preload(40,84);
    this.saved=(await DB.get('vocalizzi'))||[];
    try{ const v=localStorage.getItem('mz-voice'); if(v) this.start=+v; }catch(e){}
    const m2=modal('Per Cantanti',`<div class="seg" id="sgTabs"><button data-t="voc">Vocalizzi</button><button data-t="make">Crea il tuo vocalizzo</button><button data-t="rec">Registra performance</button><button data-t="pron">Pronuncia</button></div><div id="sgBody" style="display:flex;flex-direction:column;gap:14px"></div>`,
      null,{eyebrow:'Riscaldamento e studio',onClose:()=>this.stopAll()});
    m2.style.width='min(720px,calc(100% - 16px))';
    $('#sgTabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b){this.stopAll();this.tab=b.dataset.t;this.render()}};
    this.render();
  },
  all(){ return [...VOC_BASE,...this.saved]; },
  stopAll(){ this.playing=false; clearTimeout(this._t); (this._nodes||[]).forEach(n=>{try{n.stop()}catch(e){}}); this._nodes=[]; Metro.stop&&this.recMetro&&Metro.stop(); },
  render(){
    $$('#sgTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===this.tab));
    const B=$('#sgBody'); if(!B) return;
    if(this.tab==='pron'){ closeLayers(); this.tab='voc'; Pron.open(); return; }
    if(this.tab==='voc') this.renderVoc(B); else if(this.tab==='make') this.renderMake(B); else this.renderRec(B);
  },
  // ---------- Vocalizzi ----------
  renderVoc(B){
    const v=this.all().find(x=>x.id===this.sel)||VOC_BASE[0];
    B.innerHTML=`
      <div class="field"><label>Voce (nota di partenza)</label><div class="seg" id="sgVoice">${VOICES.map(([n,mm])=>`<button data-m="${mm}" class="${this.start===mm?'on':''}">${n}</button>`).join('')}</div></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="ghostBtn" data-tr="-1" aria-label="Mezzo tono sotto">${iconSvg('down')}½ tono</button>
        <div style="flex:1;min-width:150px;text-align:center"><div class="eyebrow">Tonalità di partenza</div><div style="font-family:var(--f-display);font-size:34px;font-weight:700;color:var(--gold-hi)" id="sgKey">${midiName(this.start)}</div><div class="hint" id="sgNow">&nbsp;</div></div>
        <button class="ghostBtn" data-tr="1" aria-label="Mezzo tono sopra">${iconSvg('up')}½ tono</button></div>
      <div class="grid2">
        <div class="field"><label>Direzione</label><div class="seg" id="sgDir">${[['up','Sale'],['down','Scende'],['both','Sale e scende']].map(([k,l])=>`<button data-d="${k}" class="${this.dir===k?'on':''}">${l}</button>`).join('')}</div></div>
        <div class="sliders" style="grid-template-columns:1fr">
          <div class="sl"><span>Quanti semitoni<em id="sgStV">${this.steps}</em></span><input type="range" id="sgSt" min="0" max="16" value="${this.steps}" style="--v:${this.steps/16*100}%"></div>
          <div class="sl"><span>Velocità<em id="sgBpV">${this.bpm}</em></span><input type="range" id="sgBp" min="40" max="200" value="${this.bpm}" style="--v:${(this.bpm-40)/160*100}%"></div></div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="goldBtn" id="sgPlay">${iconSvg(this.playing?'stop':'play')}${this.playing?'Ferma':'Suona'}</button>
        ${switchRow('sgChord','Accordo prima di ogni ripetizione',this.chord)}</div>
      <div class="group"><div class="groupHead">Scegli il vocalizzo</div>
        ${this.all().map(x=>`<div class="item${x.id===this.sel?' cur':''}" data-v="${x.id}"><canvas width="160" height="60" data-mini="${x.id}" style="width:80px;height:30px;flex:none"></canvas><div class="tx"><div class="tt">${esc(x.name)}${x.mine?'<span class="tag">MIO</span>':''}</div><div class="st">${esc(x.syl||'')} · ${x.notes.filter(n=>!n.rest).length} note</div></div>${x.mine?`<button class="infoBtn" data-del="${x.id}" aria-label="Elimina">${iconSvg('trash')}</button>`:''}</div>`).join('')}</div>`;
    B.querySelectorAll('[data-mini]').forEach(c=>miniRoll(c,this.all().find(x=>x.id===c.dataset.mini)));
    $('#sgVoice').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;this.start=+b.dataset.m;try{localStorage.setItem('mz-voice',this.start)}catch(err){}this.render()};
    B.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{this.start=clamp(this.start+(+b.dataset.tr),30,84);$('#sgKey').textContent=midiName(this.start);Piano.play&&this.tone(this.start,.6)});
    $('#sgDir').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;this.dir=b.dataset.d;$$('#sgDir button').forEach(x=>x.classList.toggle('on',x===b))};
    const sl=(id,key,lab,min,max)=>{const i=$('#'+id);i.oninput=()=>{this[key]=+i.value;$('#'+lab).textContent=i.value;i.style.setProperty('--v',(i.value-min)/(max-min)*100+'%')}};
    sl('sgSt','steps','sgStV',0,16); sl('sgBp','bpm','sgBpV',40,200);
    $('#sgChord').onclick=()=>{this.chord=!this.chord;$('#sgChord').classList.toggle('on',this.chord)};
    $('#sgPlay').onclick=()=>{ if(this.playing){this.stopAll();this.render();} else this.playVoc(v); };
    B.querySelector('.group').onclick=async e=>{const d=e.target.closest('[data-del]');if(d){e.stopPropagation();this.saved=this.saved.filter(x=>x.id!==d.dataset.del);await DB.set('vocalizzi',this.saved);this.render();return}
      const r=e.target.closest('[data-v]');if(r){this.stopAll();this.sel=r.dataset.v;this.render()}};
  },
  tone(m,dur,when,vol=.32,stacc){ ac(); const pv=PianoS.start(m,when,Math.min(.9,vol*1.9)); if(pv){ PianoS.stop(pv,(when??AC.currentTime)+(stacc?Math.min(dur,.14):dur),stacc?.08:.3); (this._nodes=this._nodes||[]).push(pv.src); return; }
    const t=when??AC.currentTime; const f=midiHz(m); const g=AC.createGain(); const len=stacc?Math.min(dur,.12):dur;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.012); g.gain.setTargetAtTime(vol*.55,t+.05,.2); g.gain.setTargetAtTime(0,t+len*.92,.04); g.connect(AC.destination);
    [[1,'triangle',1],[2,'sine',.3],[3,'sine',.1]].forEach(([k,ty,v])=>{const o=AC.createOscillator(),gg=AC.createGain();o.type=ty;o.frequency.value=f*k;gg.gain.value=v;o.connect(gg).connect(g);o.start(t);o.stop(t+len+.3);(this._nodes=this._nodes||[]).push(o)}); },
  keysList(){ const s=this.start, n=this.steps; const up=[...Array(n+1).keys()].map(i=>s+i);
    if(this.dir==='up') return up; if(this.dir==='down') return up.map(i=>s-(i-s)); return [...up,...up.slice(0,-1).reverse()]; },
  playVoc(v){
    ac(); this.playing=true; this._nodes=[]; const beat=60/this.bpm; let t=AC.currentTime+.15; const keys=this.keysList();
    keys.forEach((k,idx)=>{
      if(this.chord){ [0,4,7].forEach(iv=>this.tone(k+iv-12,beat*1.4,t,.16)); this.tone(k,beat*1.4,t,.18); t+=beat*1.6; }
      const at=t; setTimeout(()=>{ if(!this.playing) return; const e=$('#sgNow'); if(e) e.textContent=`Ora: ${midiName(k)} (${idx+1}/${keys.length})`; },(at-AC.currentTime)*1000);
      v.notes.forEach(nt=>{ if(!nt.rest) this.tone(k+nt.n,nt.d*beat,t,.3,nt.st); t+=nt.d*beat; });
      t+=beat*.6;
    });
    const total=(t-AC.currentTime)*1000; this._t=setTimeout(()=>{this.playing=false;this.render()},total+100);
    this.render();
  },
  // ---------- Crea il tuo vocalizzo (tastiera + metronomo + quantizzazione) ----------
  rec:null, grid:.5,
  renderMake(B){
    B.innerHTML=`<div class="hint">1. Scegli velocità e suddivisione. 2. Premi <b>Registra</b>: dopo 4 colpi di metronomo suona il vocalizzo sulla tastiera. 3. Premi <b>Stop</b>: le note vengono allineate al tempo. 4. Ascolta, dai un nome e salva: lo trovi in Vocalizzi, trasportabile in ogni tonalità.</div>
      <div class="grid2"><div class="sl"><span>Velocità del metronomo<em id="mkBpV">${this.bpm}</em></span><input type="range" id="mkBp" min="40" max="180" value="${this.bpm}" style="--v:${(this.bpm-40)/140*100}%"></div>
        <div class="field"><label>Allinea le note a</label><div class="seg" id="mkGrid">${[[1,'♩ semiminime'],[.5,'♪ crome'],[.25,'𝅘𝅥𝅯 semicrome'],[1/3,'terzine']].map(([g,l])=>`<button data-g="${g}" class="${Math.abs(this.grid-g)<.01?'on':''}">${l}</button>`).join('')}</div></div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="ghostBtn" data-act="midi" style="height:36px">🎹 Tastiera MIDI / Bluetooth</button><span class="hint" style="font-size:12.5px">oppure la tastiera del computer: A W S E D F T G Y H U J K</span></div><div class="keys" id="mkKeys" style="height:140px"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="goldBtn" id="mkRec">${iconSvg('mic')}${this.rec?'Stop':'Registra'}</button><button class="ghostBtn" id="mkPlay">${iconSvg('play')}Ascolta</button><button class="ghostBtn" id="mkClear">${iconSvg('trash')}Ricomincia</button><span class="hint" id="mkInfo"></span></div>
      <canvas id="mkRoll" width="1300" height="220" style="width:100%;height:110px;background:var(--panel-2);border-radius:12px;border:1px solid var(--line)"></canvas>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:180px"><label for="mkName">Nome</label><input id="mkName" placeholder="es. Mio vocalizzo · Ma-me-mi"></div><div class="field" style="flex:1;min-width:140px"><label for="mkSyl">Sillabe</label><input id="mkSyl" placeholder="es. Ma-me-mi-mo-mu"></div></div>
      <div><button class="goldBtn" id="mkSave">${iconSvg('check')}Salva nei vocalizzi</button></div>`;
    this.buildKeys($('#mkKeys'));
    const i=$('#mkBp'); i.oninput=()=>{this.bpm=+i.value;$('#mkBpV').textContent=i.value;i.style.setProperty('--v',(i.value-40)/140*100+'%')};
    $('#mkGrid').onclick=e=>{const b=e.target.closest('[data-g]');if(!b)return;this.grid=+b.dataset.g;$$('#mkGrid button').forEach(x=>x.classList.toggle('on',x===b));if(this.raw)this.quantize()};
    $('#mkRec').onclick=()=>this.rec?this.stopRec():this.startRec();
    $('#mkPlay').onclick=()=>{ if(!this.made||!this.made.notes.length) return toast('Registra prima qualche nota');
      const c=this.chord, st=this.steps, d=this.dir; this.chord=false; this.steps=0; this.dir='up'; this.playVoc(this.made); this.chord=c; this.steps=st; this.dir=d; };
    $('#mkClear').onclick=()=>{this.raw=null;this.made=null;this.drawRoll()};
    $('#mkSave').onclick=async()=>{ if(!this.made||!this.made.notes.length) return toast('Registra prima qualche nota');
      const v={id:'my-'+uid(),mine:true,name:$('#mkName').value.trim()||'Mio vocalizzo',syl:$('#mkSyl').value.trim(),notes:this.made.notes};
      this.saved.push(v); await DB.set('vocalizzi',this.saved); this.sel=v.id; this.tab='voc'; this.render(); toast('Vocalizzo salvato: ora puoi trasportarlo'); };
    this.drawRoll();
  },
  buildKeys(K){
    const whites=['Do','Re','Mi','Fa','Sol','La','Si'], ws=[0,2,4,5,7,9,11], n=14, base=this.start-(this.start%12); let h='';
    for(let i=0;i<n;i++){const o=Math.floor(i/7),w=i%7;h+=`<div class="wk" data-m="${base+o*12+ws[w]}">${whites[w]}${w===0?(Math.floor((base+o*12)/12)-1):''}</div>`}
    K.innerHTML=h; const kw=100/n;
    [0,1,3,4,5].forEach(w=>{for(let o=0;o<2;o++){const i=o*7+w;const d=document.createElement('div');d.className='bk';d.dataset.m=base+o*12+ws[w]+1;d.style.left=`calc(${(i+1)*kw}% - ${kw*.32}%)`;d.style.width=kw*.64+'%';K.appendChild(d)}});
    K.addEventListener('pointerdown',e=>{const k=e.target.closest('[data-m]');if(!k)return;e.preventDefault();k.classList.add('dn');const m=+k.dataset.m;Midi.voiceOn(m,95);(this._held=this._held||new Map()).set(e.pointerId,m);
      if(this.rec) this.rec.on.set(e.pointerId,{m,t:performance.now()});});
    const up=e=>{$$('#mkKeys .dn').forEach(x=>x.classList.remove('dn'));const hm=this._held&&this._held.get(e.pointerId);if(hm!=null){this._held.delete(e.pointerId);Midi.release(hm);}const r=this.rec&&this.rec.on.get(e.pointerId);if(r){this.rec.on.delete(e.pointerId);this.rec.notes.push({m:r.m,t:r.t,e:performance.now()});this.raw=this.rec.notes;this.drawRoll(true)}};
    K.addEventListener('pointerup',up); K.addEventListener('pointercancel',up); K.addEventListener('pointerleave',up);
  },
  startRec(){
    ac(); const beat=60000/this.bpm; this.rec={on:new Map(),notes:[],t0:performance.now()+beat*4}; this.raw=null; this.made=null;
    // metronomo: 4 colpi di attacco, poi continua finché registri
    let i=0; const tick=()=>{ if(!this.rec) return; click(i%4===0); const info=$('#mkInfo'); if(info) info.textContent=i<4?`Attacco: ${4-i}…`:'Suona ora'; i++; this._mt=setTimeout(tick,beat); }; tick();
    const b=$('#mkRec'); if(b) b.innerHTML=iconSvg('stop')+'Stop';
  },
  stopRec(){ clearTimeout(this._mt); const r=this.rec; this.rec=null; const b=$('#mkRec'); if(b) b.innerHTML=iconSvg('mic')+'Registra';
    if(!r||!r.notes.length){ $('#mkInfo').textContent='Nessuna nota registrata'; return; } this.raw=r.notes; this.raw.t0=r.t0; this.quantize(); },
  quantize(){
    const beat=60000/this.bpm, g=this.grid, t0=this.raw.t0??this.raw[0].t; const ns=[...this.raw].sort((a,b)=>a.t-b.t);
    const at=ns.map(n=>({m:n.m,s:Math.max(0,Math.round(((n.t-t0)/beat)/g)*g),len:Math.max(g,Math.round(((n.e-n.t)/beat)/g)*g)}));
    const s0=at[0].s; at.forEach(n=>n.s-=s0);
    const root=at[0].m; const notes=[];
    for(let k=0;k<at.length;k++){ const nx=at[k+1]; let d=nx?Math.max(g,nx.s-at[k].s):Math.max(at[k].len,1); notes.push({n:at[k].m-root,d}); }
    this.made={name:'',notes}; this.drawRoll();
    $('#mkInfo').textContent=`${notes.length} note allineate a ${g===1?'semiminime':g===.5?'crome':g===.25?'semicrome':'terzine'}`;
  },
  drawRoll(raw){ const c=$('#mkRoll'); if(!c) return; const x=c.getContext('2d'); x.clearRect(0,0,c.width,c.height);
    const v=this.made; if(!v){ x.fillStyle='#a89c83'; x.font='28px Manrope'; x.fillText(raw?'Registro…':'Le note registrate appariranno qui',30,120); return; } miniRoll(c,v,true); },
  // ---------- Registra performance ----------
  renderRec(B){
    B.innerHTML=`<div class="hint">Registra la tua esecuzione e inviala su WhatsApp, Messaggi, Mail o con AirDrop.</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="goldBtn" id="prGo">${iconSvg('mic')}${Rec.rec?'Ferma':'Registra'}</button><span class="hint" id="prT"></span></div>
      <canvas id="prVu" width="1200" height="80" style="width:100%;height:40px;border-radius:10px;background:var(--panel-2)"></canvas>
      <div id="prList">${this.takes.map((t,i)=>`<div class="item"><div class="tx"><div class="tt">${esc(t.name)}</div><div class="st">${t.when} · ${t.dur}</div><audio controls src="${t.url}" style="width:100%;margin-top:6px"></audio></div><button class="infoBtn" data-sh="${i}" aria-label="Invia">${iconSvg('share')}</button></div>`).join('')||'<div class="empty">Ancora nessuna registrazione.</div>'}</div>`;
    $('#prGo').onclick=()=>this.toggleRec();
    $('#prList').onclick=e=>{const b=e.target.closest('[data-sh]');if(!b)return;const t=this.takes[+b.dataset.sh];shareFile(t.blob,t.file,t.name)};
  },
  async toggleRec(){
    if(this.mr){ this.mr.stop(); return; }
    let s; try{ s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}); }
    catch(e){ toast('Microfono non disponibile: consenti il microfono a Mozart',3200); return; }
    const type=['audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/aac','audio/webm;codecs=opus','audio/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||'';
    const chunks=[]; this.mr=new MediaRecorder(s,type?{mimeType:type,audioBitsPerSecond:128000}:undefined); const t0=Date.now();
    ac(); const an=AC.createAnalyser(); AC.createMediaStreamSource(s).connect(an); const buf=new Uint8Array(an.fftSize);
    const vu=()=>{ if(!this.mr) return; an.getByteTimeDomainData(buf); let pk=0; for(const v of buf) pk=Math.max(pk,Math.abs(v-128)); const c=$('#prVu'); if(c){const x=c.getContext('2d');x.clearRect(0,0,1200,80);x.fillStyle=pk>120?'#e0624f':'#d6a84e';x.fillRect(0,0,1200*pk/128,80)} const tt=$('#prT'); if(tt){const s2=Math.round((Date.now()-t0)/1000);tt.textContent=`● ${Math.floor(s2/60)}:${String(s2%60).padStart(2,'0')}`} requestAnimationFrame(vu); };
    this.mr.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    this.mr.onstop=()=>{ s.getTracks().forEach(t=>t.stop()); const mime=this.mr.mimeType||type||'audio/mp4'; const blob=new Blob(chunks,{type:mime.split(';')[0]}); const ext=/mp4|aac/.test(mime)?'m4a':'webm';
      const d=Math.round((Date.now()-t0)/1000), now=new Date(); const name=`${ST.cur?ST.cur.title.replace('Esempio · ',''):'Performance'} · ${now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`;
      this.takes.unshift({blob,url:URL.createObjectURL(blob),name,file:`${name.replace(/[\\/:*?"<>|·]+/g,' ').trim()}.${ext}`,when:now.toLocaleDateString('it-IT'),dur:`${Math.floor(d/60)}:${String(d%60).padStart(2,'0')}`});
      this.mr=null; this.render(); toast('Registrazione pronta: tocca Invia per WhatsApp'); };
    this.mr.start(250); this.render(); vu();
  },
};
// Disegno di un vocalizzo come rullo di pianoforte (anteprima).
function miniRoll(c,v,big){
  const x=c.getContext('2d'), W=c.width, H=c.height; x.clearRect(0,0,W,H); if(!v) return; const ns=v.notes.filter(n=>!n.rest); if(!ns.length) return;
  const tot=v.notes.reduce((a,n)=>a+n.d,0)||1, lo=Math.min(...ns.map(n=>n.n)), hi=Math.max(...ns.map(n=>n.n)), rng=Math.max(4,hi-lo);
  let t=0; const pad=big?20:6; x.fillStyle='#d6a84e';
  for(const n of v.notes){ if(!n.rest){ const xx=pad+(t/tot)*(W-pad*2), w=Math.max(3,(n.d/tot)*(W-pad*2)-3), yy=H-pad-((n.n-lo)/rng)*(H-pad*2)-(big?12:5); x.globalAlpha=n.st?.7:1; x.fillRect(xx,yy,w,big?14:6); if(big){x.globalAlpha=1;x.fillStyle='#f4ecdc';x.font='18px Manrope';x.fillText(NOTE_IT[((n.n%12)+12)%12],xx+2,yy-4);x.fillStyle='#d6a84e'} } t+=n.d; }
  x.globalAlpha=1;
}
