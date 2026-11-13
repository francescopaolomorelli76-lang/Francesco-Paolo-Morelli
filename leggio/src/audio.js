// ================= Metronomo · Tonalità · Accordatore · Pianoforte · Registra =================
let AC=null; const ac=()=>{ if(!AC){ const C=window.AudioContext||window.webkitAudioContext; AC=new C(); } if(AC.state==='suspended') AC.resume(); return AC; };
const NOTE_IT=['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];

const Metro = {
  bpm:92, beats:4, mode:'off', tab:'metro', beat:0, count:0, bars:0, timer:null, next:0, taps:[], autoBars:0, dur:0, A4:440, tone:null, toneNote:null,
  open(anchor){
    this.anchor=anchor||$('[data-act="metro"]');
    const p=popover(this.anchor,`<div class="seg" id="mtTabs" style="justify-content:center;margin-bottom:10px">
      <button data-t="metro">Metronomo</button><button data-t="pitch">Tonalità</button><button data-t="tuner">Accordatore</button></div><div id="mtBody"></div>`,{id:'metroPop'});
    p.querySelector('#mtTabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b){this.tab=b.dataset.t;this.render()}};
    this.render();
  },
  onClose(){ Tuner.stop(); },
  render(){
    $$('#mtTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===this.tab));
    const B=$('#mtBody'); if(!B) return; Tuner.stop();
    if(this.tab==='metro'){
      B.innerHTML=`<div class="dialWrap">
        <div class="dialNum tl" id="mtBeats" title="Tocca per cambiare"><b>${this.beats}</b><small>/${['','uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci','undici','dodici'][this.beats]}</small></div>
        <div class="dialNum tr"><b id="mtBpm">${this.bpm}</b><small>/minuto</small></div>
        <div class="dialNum bl"><b id="mtCount">${this.count}</b><small>#battiti</small></div>
        <div class="dialNum br"><b id="mtBars">${this.bars}</b><small>#battute</small></div>
        <svg viewBox="0 0 300 300" id="mtDial"><circle cx="150" cy="150" r="118" fill="none" stroke="#3a3326" stroke-width="52"/>
          <circle cx="150" cy="150" r="118" fill="none" stroke="#d6a84e" stroke-width="4" stroke-dasharray="2 10" opacity=".5"/>
          <text x="104" y="104" fill="#f4ecdc" font-size="30" text-anchor="middle" dominant-baseline="middle" id="mtPlus" style="cursor:pointer">+</text>
          <text x="80" y="160" fill="#f4ecdc" font-size="34" text-anchor="middle" dominant-baseline="middle" id="mtMinus" style="cursor:pointer">−</text>
          <circle cx="150" cy="150" r="84" fill="#f4ecdc" id="mtTap" style="cursor:pointer"/>
          <text x="150" y="142" fill="#16130e" font-size="22" font-weight="700" text-anchor="middle" style="pointer-events:none">Tocca</text>
          <text x="150" y="168" fill="#8f6a22" font-size="13" text-anchor="middle" style="pointer-events:none">ritmo a mano</text>
          <g id="mtKnob"><circle r="27" fill="#0b0a08" stroke="#d6a84e" stroke-width="2"/><line x1="-9" y1="-14" x2="9" y2="14" stroke="#d6a84e" stroke-width="3" stroke-linecap="round"/></g></svg></div>
        <div class="metroRow"><button id="mtAuto" class="${this.autoBars?'on':''}">Voltapagina: ${this.autoBars?'ogni '+this.autoBars+' batt.':'spento'}</button><button id="mtDur" class="${this.dur?'on':''}">Durata: ${this.dur?this.dur+' min':'spenta'}</button></div>
        <div class="seg" id="mtMode" style="margin-top:10px;justify-content:center">${[['off','Spento'],['audio','Udibile'],['visual','Visibile'],['both','Entrambi']].map(([k,l])=>`<button data-m="${k}" class="${this.mode===k?'on':''}">${l}</button>`).join('')}</div>`;
      this.placeKnob();
      $('#mtBeats').onclick=()=>{this.beats=this.beats%12+1;this.render()};
      $('#mtPlus').onclick=()=>this.setBpm(this.bpm+1); $('#mtMinus').onclick=()=>this.setBpm(this.bpm-1);
      $('#mtTap').onclick=()=>this.tap();
      $('#mtAuto').onclick=()=>{const o=[0,4,8,16,32];this.autoBars=o[(o.indexOf(this.autoBars)+1)%o.length];this.render()};
      $('#mtDur').onclick=()=>{const o=[0,2,3,4,5,8,10];this.dur=o[(o.indexOf(this.dur)+1)%o.length];this.render();this.setupDuration()};
      $('#mtMode').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;this.mode=b.dataset.m;this.render();this.mode==='off'?this.stop():this.start()};
      const dial=$('#mtDial'); let last=null;
      const ang=e=>{const r=dial.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))};
      dial.addEventListener('pointerdown',e=>{if(e.target.closest('#mtTap,#mtPlus,#mtMinus'))return;const r=dial.getBoundingClientRect();const dd=Math.hypot(e.clientX-(r.left+r.width/2),e.clientY-(r.top+r.height/2))/(r.width/300);if(dd<88)return;last=ang(e);dial.setPointerCapture(e.pointerId)});
      dial.addEventListener('pointermove',e=>{if(last==null)return;const a=ang(e);let d=a-last;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;last=a;this._acc=(this._acc||0)+d/(2*Math.PI)*120;const step=Math.trunc(this._acc);if(step){this._acc-=step;this.setBpm(this.bpm+step)}});
      dial.addEventListener('pointerup',()=>last=null);
    } else if(this.tab==='pitch'){
      B.innerHTML=`<div class="noteGrid" id="ptGrid">${NOTE_IT.map((n,i)=>`<button data-n="${i}" class="${this.toneNote===i?'on':''}">${n}</button>`).join('')}</div>
        <div class="sl" style="margin-top:12px"><span>La di riferimento<em id="ptAv">${this.A4} Hz</em></span><input type="range" id="ptA" min="415" max="446" value="${this.A4}" style="--v:${(this.A4-415)/31*100}%"></div>
        <div class="hint" style="font-size:13px">Tocca una nota per darla al coro (diapason). Tocca di nuovo per fermarla.</div>`;
      $('#ptGrid').onclick=e=>{const b=e.target.closest('[data-n]');if(!b)return;const n=+b.dataset.n;if(this.toneNote===n){this.stopTone();}else this.playTone(n);this.render()};
      const a=$('#ptA'); a.oninput=()=>{this.A4=+a.value;$('#ptAv').textContent=a.value+' Hz';a.style.setProperty('--v',(a.value-415)/31*100+'%');if(this.toneNote!=null)this.playTone(this.toneNote)};
    } else {
      B.innerHTML=`<div class="tuner"><div class="note" id="tnNote">–</div><div class="hz" id="tnHz">Canta o suona una nota</div>
        <svg class="gauge" viewBox="0 0 300 120"><path d="M30 110 A120 120 0 0 1 270 110" fill="none" stroke="#3a3326" stroke-width="10" stroke-linecap="round"/>
        <path d="M138 0 L162 0 L156 18 L144 18Z" fill="#7bc47f"/><line id="tnNeedle" x1="150" y1="110" x2="150" y2="10" stroke="#f2d382" stroke-width="4" stroke-linecap="round"/><circle cx="150" cy="110" r="8" fill="#f2d382"/>
        <text x="30" y="100" fill="#a89c83" font-size="13">−50</text><text x="252" y="100" fill="#a89c83" font-size="13">+50</text></svg>
        <button class="goldBtn" id="tnGo">${iconSvg('mic')}Avvia accordatore</button><div class="hint" id="tnMsg" style="font-size:13px;text-align:center"></div></div>`;
      $('#tnGo').onclick=()=>Tuner.start();
    }
  },
  placeKnob(){ const k=$('#mtKnob'); if(!k) return; const a=((this.bpm-20)/280)*2*Math.PI*0.92-Math.PI*0.75; k.setAttribute('transform',`translate(${150+118*Math.cos(a)} ${150+118*Math.sin(a)})`); },
  setBpm(v){ this.bpm=clamp(Math.round(v),20,300); const e=$('#mtBpm'); if(e) e.textContent=this.bpm; this.placeKnob(); this.setupDuration(); },
  tap(){ const t=performance.now(); this.taps=this.taps.filter(x=>t-x<2500); this.taps.push(t); if(this.taps.length>=2){ const iv=(this.taps[this.taps.length-1]-this.taps[0])/(this.taps.length-1); this.setBpm(60000/iv); } click(true,.0); },
  start(){ ac(); this.beat=0; this.count=0; this.bars=0; this.next=AC.currentTime+.08; clearInterval(this.timer); this.timer=setInterval(()=>this.sched(),25); },
  stop(){ clearInterval(this.timer); this.timer=null; },
  sched(){
    while(this.next<AC.currentTime+.12){
      const first=this.beat===0, when=this.next;
      if(this.mode==='audio'||this.mode==='both') click(first,when);
      if(this.mode==='visual'||this.mode==='both'){ const d=Math.max(0,(when-AC.currentTime)*1000); setTimeout(()=>{const f=$('#metroFlash');f.className=first?'accent':'on';setTimeout(()=>f.className='',110)},d); }
      const d2=Math.max(0,(when-AC.currentTime)*1000);
      setTimeout(()=>{ this.count++; if(first){ this.bars++; if(this.autoBars && this.bars>1 && (this.bars-1)%this.autoBars===0) nextPage(); } const a=$('#mtCount'),b=$('#mtBars'); if(a)a.textContent=this.count; if(b)b.textContent=this.bars; },d2);
      this.beat=(this.beat+1)%this.beats; this.next+=60/this.bpm;
    }
  },
  setupDuration(){ clearInterval(this.durT); if(!this.dur||!ST.cur) return; const per=this.dur*60000/Math.max(1,ST.cur.pages); this.durT=setInterval(()=>{ if(ST.page<ST.cur.pages-1) nextPage(); else clearInterval(this.durT); },per); toast(`Le pagine scorrono da sole: una ogni ${Math.round(per/1000)} s`); },
  playTone(n){ ac(); this.stopTone(); const f=this.A4*Math.pow(2,(n-9)/12); const o=AC.createOscillator(), o2=AC.createOscillator(), g=AC.createGain(); o.type='sine'; o2.type='triangle'; o.frequency.value=f; o2.frequency.value=f; const g2=AC.createGain(); g2.gain.value=.25; o2.connect(g2).connect(g); o.connect(g); g.connect(AC.destination); g.gain.setValueAtTime(0,AC.currentTime); g.gain.linearRampToValueAtTime(.25,AC.currentTime+.08); o.start(); o2.start(); this.tone={o,o2,g}; this.toneNote=n; },
  stopTone(){ if(this.tone){ const {o,o2,g}=this.tone; g.gain.linearRampToValueAtTime(0,AC.currentTime+.1); o.stop(AC.currentTime+.12); o2.stop(AC.currentTime+.12); } this.tone=null; this.toneNote=null; },
};
function click(accent,when){ ac(); const t=when||AC.currentTime; const o=AC.createOscillator(), g=AC.createGain(); o.frequency.value=accent?1650:1050; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.6,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+.05); o.connect(g).connect(AC.destination); o.start(t); o.stop(t+.06); }

const Tuner = {
  stream:null, raf:0,
  async start(){
    const msg=$('#tnMsg');
    try{ this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false}}); }
    catch(e){ if(msg) msg.textContent='Il microfono non è disponibile qui. Nell\'app installata sull\'iPad consenti il microfono quando richiesto.'; return; }
    ac(); const src=AC.createMediaStreamSource(this.stream); const an=AC.createAnalyser(); an.fftSize=4096; src.connect(an); const buf=new Float32Array(an.fftSize);
    $('#tnGo').hidden=true;
    const loop=()=>{ an.getFloatTimeDomainData(buf); const f=autoCorr(buf,AC.sampleRate);
      if(f>0){ const n=12*Math.log2(f/Metro.A4)+69; const r=Math.round(n); const cents=Math.round((n-r)*100);
        $('#tnNote').textContent=NOTE_IT[(r%12+12)%12]+(Math.floor(r/12)-1); $('#tnHz').textContent=f.toFixed(1)+' Hz · '+(cents>0?'+':'')+cents+' cent';
        $('#tnNeedle').setAttribute('transform',`rotate(${clamp(cents,-50,50)*1.6} 150 110)`); $('#tnNeedle').setAttribute('stroke',Math.abs(cents)<6?'#7bc47f':'#f2d382'); }
      this.raf=requestAnimationFrame(loop); };
    loop();
  },
  stop(){ cancelAnimationFrame(this.raf); if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; } },
};
function autoCorr(b,sr){ let rms=0; for(const v of b) rms+=v*v; rms=Math.sqrt(rms/b.length); if(rms<.012) return -1;
  const N=b.length, c=new Float32Array(N/2); for(let l=0;l<N/2;l++){let s=0;for(let i=0;i<N/2;i++)s+=b[i]*b[i+l];c[l]=s}
  let d=0; while(d<N/2-1&&c[d]>c[d+1]) d++; let mx=-1,mp=-1; for(let i=d;i<N/2;i++) if(c[i]>mx){mx=c[i];mp=i}
  if(mp<=0||mp>=N/2-1) return -1; const x1=c[mp-1],x2=c[mp],x3=c[mp+1]; const a=(x1+x3-2*x2)/2, bb=(x3-x1)/2; const T=a?mp-bb/(2*a):mp; return sr/T; }

const Piano = {
  oct:0,
  build(){
    const K=$('#keys'); const whites=['Do','Re','Mi','Fa','Sol','La','Si']; const wsemi=[0,2,4,5,7,9,11]; let h=''; const n=14;
    for(let i=0;i<n;i++){ const o=Math.floor(i/7), w=i%7; h+=`<div class="wk" data-s="${o*12+wsemi[w]}">${whites[w]}${w===0?(4+o):''}</div>`; }
    K.innerHTML=h; const kw=100/n;
    [0,1,3,4,5].forEach(w=>{ for(let o=0;o<2;o++){ const i=o*7+w; const d=document.createElement('div'); d.className='bk'; d.dataset.s=o*12+wsemi[w]+1; d.style.left=`calc(${(i+1)*kw}% - ${kw*.32}%)`; d.style.width=kw*.64+'%'; K.appendChild(d);} });
    K.addEventListener('pointerdown',e=>{const k=e.target.closest('[data-s]');if(!k)return;k.classList.add('dn');setTimeout(()=>k.classList.remove('dn'),180);this.play(+k.dataset.s)});
    $('#pianoOct').onclick=e=>{const b=e.target.closest('[data-o]');if(b){this.oct=clamp(this.oct+(+b.dataset.o),-3,2);toast('Ottava '+(4+this.oct))}};
  },
  open(){ $('#pianoSheet').classList.add('open'); }, close(){ $('#pianoSheet').classList.remove('open'); },
  play(semi){ ac(); const f=Metro.A4*Math.pow(2,(semi+this.oct*12-9)/12); const t=AC.currentTime; const g=AC.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.35,t+.008); g.gain.exponentialRampToValueAtTime(.12,t+.3); g.gain.exponentialRampToValueAtTime(.0001,t+1.8); g.connect(AC.destination);
    [[1,'triangle',1],[2,'sine',.35],[3,'sine',.12]].forEach(([m,ty,v])=>{const o=AC.createOscillator(),gg=AC.createGain();o.type=ty;o.frequency.value=f*m;gg.gain.value=v;o.connect(gg).connect(g);o.start(t);o.stop(t+1.9)}); },
};

const Rec = {
  rec:null, chunks:[], takes:[],
  open(){
    const m2=modal('Registra',`<div class="hint">Registra la prova e riascoltala subito. Le registrazioni restano finché l'app è aperta.</div>
      <div style="display:flex;gap:10px"><button class="goldBtn" id="rcGo">${iconSvg('mic')}${this.rec?'Ferma':'Inizia a registrare'}</button></div><div id="rcMsg" class="hint"></div>
      <div id="rcList">${this.takes.map((t,i)=>`<div class="item"><div class="tx"><div class="tt">Prova ${i+1}</div><div class="st">${t.when}</div><audio controls src="${t.url}" style="width:100%;margin-top:6px"></audio></div></div>`).join('')}</div>`);
    $('#rcGo').onclick=()=>this.toggle();
  },
  async toggle(){
    if(this.rec){ this.rec.stop(); return; }
    try{ const s=await navigator.mediaDevices.getUserMedia({audio:true}); this.chunks=[]; this.rec=new MediaRecorder(s);
      this.rec.ondataavailable=e=>this.chunks.push(e.data);
      this.rec.onstop=()=>{ s.getTracks().forEach(t=>t.stop()); const b=new Blob(this.chunks,{type:this.rec.mimeType}); this.takes.push({url:URL.createObjectURL(b),when:new Date().toLocaleTimeString('it-IT')}); this.rec=null; this.open(); };
      this.rec.start(); this.open(); toast('Registrazione in corso…');
    }catch(e){ $('#rcMsg').textContent='Il microfono non è disponibile qui. Nell\'app installata sull\'iPad consenti il microfono quando richiesto.'; }
  },
};
