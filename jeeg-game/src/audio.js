/* audio.js — effetti sonori e musica ORIGINALI sintetizzati in WebAudio.
 * Nessun brano o campione della serie è incluso (vedi note licenze nel README).
 */
'use strict';
(function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let musicOn = true, musicTimer = null, step = 0, currentSong = null;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
    if (currentSong) startMusic(currentSong);
  }

  function tone(freq, dur, type, vol, slide, dest, when) {
    if (!ctx) return;
    const t = (when || ctx.currentTime);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, filterFreq, dest) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1800;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(dest || sfxGain); src.start();
  }

  const SFX = {
    punch: () => { noise(0.08, 0.35, 2400); tone(180, 0.08, 'square', 0.12, 90); },
    kick: () => { noise(0.12, 0.45, 1600); tone(140, 0.12, 'square', 0.15, 60); },
    whoosh: () => noise(0.09, 0.12, 4000),
    jump: () => tone(300, 0.14, 'square', 0.1, 620),
    land: () => noise(0.06, 0.15, 600),
    hurt: () => { tone(420, 0.18, 'sawtooth', 0.18, 110); noise(0.1, 0.2, 1200); },
    enemyHit: () => { noise(0.07, 0.3, 3000); tone(520, 0.06, 'square', 0.08, 300); },
    enemyDie: () => { noise(0.35, 0.4, 900); tone(220, 0.3, 'sawtooth', 0.12, 50); },
    pickup: () => { tone(660, 0.08, 'square', 0.12); tone(990, 0.14, 'square', 0.12, null, null, ctx && ctx.currentTime + 0.07); },
    gloves: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.13, null, null, ctx && ctx.currentTime + i * 0.09)); },
    checkpoint: () => { [392, 523, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, null, null, ctx && ctx.currentTime + i * 0.1)); },
    transform: () => { tone(110, 1.2, 'sawtooth', 0.18, 880); noise(1.0, 0.18, 5000); },
    magnet: () => { tone(1200, 0.25, 'sine', 0.15, 300); noise(0.15, 0.3, 1500); tone(80, 0.25, 'square', 0.2, 40); },
    shooter: () => noise(1.2, 0.18, 700),
    gamma: () => { tone(220, 0.7, 'sawtooth', 0.2, 440); tone(330, 0.7, 'square', 0.08, 660); },
    proton: () => { tone(1800, 0.9, 'sine', 0.15, 600); tone(900, 0.9, 'sawtooth', 0.1, 1400); noise(0.6, 0.2, 6000); },
    denied: () => tone(140, 0.15, 'square', 0.12, 120),
    select: () => tone(880, 0.06, 'square', 0.1),
    bossWarn: () => { [0, 0.3, 0.6].forEach((d) => tone(440, 0.2, 'square', 0.15, 330, null, ctx && ctx.currentTime + d)); },
    telegraph: () => tone(900, 0.12, 'square', 0.1, 1200),
    slam: () => { noise(0.5, 0.6, 400); tone(60, 0.5, 'sine', 0.4, 30); },
    explode: () => { noise(1.2, 0.7, 700); tone(90, 1.0, 'sawtooth', 0.25, 30); },
    win: () => { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.13, null, null, ctx && ctx.currentTime + i * 0.13)); },
    die: () => { [440, 370, 311, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, null, null, ctx && ctx.currentTime + i * 0.15)); },
  };
  function play(name) { try { if (ctx && SFX[name]) SFX[name](); } catch (e) {} }

  /* Musica originale: progressioni semplici in stile anni '70 (basso + lead) */
  const SONGS = {
    stage: { bpm: 152, bass: [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 43, 43, 55, 47],
      lead: [69, 0, 72, 74, 76, 0, 74, 72, 74, 0, 72, 69, 67, 0, 69, 0, 65, 0, 69, 72, 74, 0, 72, 69, 71, 0, 67, 71, 74, 0, 76, 0] },
    boss: { bpm: 168, bass: [40, 40, 52, 40, 41, 41, 53, 41, 40, 40, 52, 40, 38, 38, 50, 39],
      lead: [76, 75, 76, 0, 79, 0, 76, 0, 77, 76, 77, 0, 81, 0, 77, 0, 76, 75, 76, 0, 83, 0, 81, 79, 77, 0, 76, 0, 75, 0, 71, 0] },
    title: { bpm: 120, bass: [45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0, 40, 0, 47, 0],
      lead: [69, 0, 0, 72, 76, 0, 74, 0, 72, 0, 0, 69, 71, 0, 67, 0, 69, 0, 0, 72, 77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 0, 0] },
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function startMusic(name) {
    currentSong = name;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!ctx || !musicOn || !name) return;
    const s = SONGS[name]; step = 0;
    const stepDur = 60 / s.bpm / 2;
    musicTimer = setInterval(() => {
      if (ctx.state !== 'running') return;
      const b = s.bass[step % s.bass.length];
      if (b) tone(mtof(b), stepDur * 0.9, 'triangle', 0.5, null, musicGain);
      const l = s.lead[step % s.lead.length];
      if (l) tone(mtof(l), stepDur * 1.6, 'square', 0.11, null, musicGain);
      if (step % 4 === 0) noise(0.05, 0.12, 300, musicGain);
      if (step % 4 === 2) noise(0.04, 0.06, 6000, musicGain);
      step++;
    }, stepDur * 1000);
  }
  function stopMusic() { currentSong = null; if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
  function toggleMusic() { musicOn = !musicOn; if (musicOn) startMusic(currentSong || 'stage'); else if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } return musicOn; }

  J.audio = { unlock, play, startMusic, stopMusic, toggleMusic, get musicOn() { return musicOn; } };
})();
