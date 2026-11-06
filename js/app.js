/* =========================================================
   Saverio – Sgombero e Pulizie · Clean&Clear
   Bolle di sapone, orologio con scopa e mocio, traduzioni,
   mini-giochi e tanta ironia.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- CONFIGURAZIONE (modificabile dal cliente) ---------- */
  const CONFIG = {
    timeZone: "Europe/Rome",
    // Orari di apertura [apertura, chiusura] in ore decimali; null = chiuso
    hours: { week: [8, 19], sat: [8, 13], sun: null }
  };

  /* ---------- utility ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage non disponibile */ } }
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const fmtH = h => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

  /* =========================================================
     SUONI (sintetizzati, nessun file esterno)
     ========================================================= */
  let soundOn = store.get("sav_sound", true);
  let actx = null, lastPop = 0;
  const audio = () => {
    if (!soundOn) return null;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    if (actx.state === "suspended") actx.resume();
    return actx;
  };
  function popSound(pitch = 1) {
    const now = performance.now();
    if (now - lastPop < 45) return;
    lastPop = now;
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = "sine";
    o.frequency.setValueAtTime(380 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1500 * pitch, t + 0.05);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.1);
  }
  function swoosh() {
    const a = audio(); if (!a) return;
    const len = a.sampleRate * 0.5, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    f.type = "bandpass"; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.4);
    g.gain.value = 0.25; src.buffer = buf;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  function fanfare() {
    const a = audio(); if (!a) return;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.12;
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.3);
    });
  }
  /* ---------- MUSICA in loop (Web Audio: loop senza stacchi) ---------- */
  const MUSIC = { url: "audio/saverio-loop.mp3", loopStart: 0.5, loopEnd: 12.141156, volume: 0.35 };
  let musicBuf = null, musicSrc = null, musicGain = null, musicLoading = null;
  function loadMusic(a) {
    if (musicBuf) return Promise.resolve(musicBuf);
    if (!musicLoading) musicLoading = fetch(MUSIC.url).then(r => r.arrayBuffer())
      .then(ab => new Promise((res, rej) => a.decodeAudioData(ab, res, rej)))
      .then(b => (musicBuf = b))
      .catch(e => { musicLoading = null; throw e; });
    return musicLoading;
  }
  function startMusic() {
    const a = audio(); if (!a || musicSrc) return;
    fabBtn.classList.add("loading");
    loadMusic(a).then(buf => {
      fabBtn.classList.remove("loading");
      if (!soundOn || musicSrc) return;
      musicGain = a.createGain();
      musicGain.gain.setValueAtTime(0, a.currentTime);
      musicGain.gain.linearRampToValueAtTime(MUSIC.volume, a.currentTime + 1.2);
      const s = a.createBufferSource();
      s.buffer = buf; s.loop = true; s.loopStart = MUSIC.loopStart; s.loopEnd = Math.min(MUSIC.loopEnd, buf.duration);
      s.connect(musicGain).connect(a.destination);
      s.start(0, MUSIC.loopStart);
      musicSrc = s; renderSound();
    }).catch(() => { fabBtn.classList.remove("loading"); renderSound(); });
  }
  function stopMusic() {
    if (!musicSrc || !actx) return;
    const s = musicSrc, g = musicGain, now = actx.currentTime;
    musicSrc = null;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.35);
    try { s.stop(now + 0.4); } catch { /* già fermo */ }
    renderSound();
  }
  // il player: la testa di Saverio
  const fabBtn = $("#musicBtn"), fabTip = $("#fabTip");
  function renderSound() {
    const playing = !!musicSrc;
    fabBtn.classList.toggle("playing", playing);
    fabBtn.classList.toggle("off", !soundOn);
    fabBtn.setAttribute("aria-pressed", String(playing));
    fabBtn.title = t(soundOn ? "sound_on" : "sound_off");
    fabBtn.setAttribute("aria-label", fabBtn.title);
    $("#fabBadge").textContent = playing ? "♪" : soundOn ? "▶" : "🔇";
    if (playing) fabTip.hidden = true;
  }
  fabBtn.addEventListener("click", () => {
    fabTip.hidden = true;
    if (soundOn && musicSrc) { stopMusic(); soundOn = false; }
    else { soundOn = true; startMusic(); popSound(); }
    store.set("sav_sound", soundOn); renderSound();
  });
  // i browser (e l'iPhone) permettono l'audio solo dopo un tocco: la musica parte al primo tocco
  const firstTouch = e => {
    if (e.target.closest && e.target.closest("#musicBtn")) return;
    ["click", "touchend", "keydown"].forEach(ev => removeEventListener(ev, firstTouch, true));
    if (soundOn) startMusic();
  };
  ["click", "touchend", "keydown"].forEach(ev => addEventListener(ev, firstTouch, true));
  document.addEventListener("visibilitychange", () => {
    if (!actx) return;
    if (document.hidden) actx.suspend(); else if (soundOn) actx.resume();
  });
  setTimeout(() => { if (!musicSrc) { fabTip.hidden = false; setTimeout(() => (fabTip.hidden = true), 7000); } }, 2500);

  /* =========================================================
     TRADUZIONI
     ========================================================= */
  const I18N = window.I18N, COUNTRIES = window.COUNTRIES;
  const RTL = ["ar", "iw", "he", "fa", "ur"];
  let curLang = "it";                       // lingua dei testi "fatti a mano"
  let selLang = store.get("sav_lang", null); // lingua scelta (può essere Google)
  let selCountry = store.get("sav_country", null);
  const t = k => (I18N[curLang] && I18N[curLang][k] !== undefined ? I18N[curLang][k] : I18N.it[k]);

  const hasGoogCookie = () => /(?:^|;\s*)googtrans=/.test(document.cookie);
  function setGoogCookie(val) {
    const exp = val ? "" : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    const v = val || "";
    document.cookie = `googtrans=${v}; path=/${exp}`;
    const host = location.hostname;
    if (host && host.includes(".")) {
      document.cookie = `googtrans=${v}; path=/; domain=${host}${exp}`;
      document.cookie = `googtrans=${v}; path=/; domain=.${host}${exp}`;
    }
  }
  function loadGoogle() {
    window.googleTranslateElementInit = () => {
      try { new window.google.translate.TranslateElement({ pageLanguage: "it", autoDisplay: false }, "gt"); } catch { /* offline */ }
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  }

  function applyTexts() {
    $$("[data-i18n]").forEach(el => { const v = t(el.dataset.i18n); if (typeof v === "string") el.textContent = v; });
    $$("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
    $$("[data-i18n-title]").forEach(el => el.title = t(el.dataset.i18nTitle));
    renderMarquee(); renderReviews(); renderSound(); restartTyping(); resetExcuse(); updateHoursTable(); lastStatusKey = "";
  }

  function setLanguage(code, country) {
    if (!I18N[code] && !(consent && consent.translate)) { showCookie("translate", [code, country]); return; }
    selLang = code; selCountry = country;
    store.set("sav_lang", code); store.set("sav_country", country);
    if (I18N[code]) {
      if (hasGoogCookie()) { setGoogCookie(null); location.reload(); return; }
      curLang = code;
      document.documentElement.lang = code;
      document.documentElement.dir = "ltr";
      applyTexts(); renderLangButton();
    } else {
      setGoogCookie(`/it/${code}`);
      location.reload();
    }
  }

  /* ---------- CONSENSO COOKIE (solo il traduttore Google ne ha bisogno) ---------- */
  let consent = store.get("sav_consent", null), pendingLang = null;
  const cookieBar = $("#cookieBar");
  function showCookie(mode, pending) {
    pendingLang = pending || null;
    cookieBar.dataset.mode = mode;
    $("#cookieText").textContent = t(mode === "translate" ? "cookie_translate_text" : "cookie_text");
    $("#cookieAccept").textContent = t(mode === "translate" ? "cookie_translate_accept" : "cookie_accept");
    cookieBar.hidden = false;
  }
  function saveConsent(translate) {
    consent = { translate, v: 1, date: new Date().toISOString() };
    store.set("sav_consent", consent);
    cookieBar.hidden = true;
  }
  $("#cookieAccept").addEventListener("click", () => {
    saveConsent(true);
    if (pendingLang) { const [c, cc] = pendingLang; pendingLang = null; setLanguage(c, cc); }
  });
  $("#cookieReject").addEventListener("click", () => {
    saveConsent(false); pendingLang = null;
    if (!I18N[selLang]) setLanguage("it", "IT"); // il traduttore era attivo: lo spegniamo
  });
  $("#cookiePrefs").addEventListener("click", () => showCookie("info"));

  function initLanguage() {
    if (!selLang) {
      const nav = (navigator.language || "it").toLowerCase();
      const base = nav.split("-")[0];
      selLang = I18N[base] ? base : "it";
      const region = (nav.split("-")[1] || "").toUpperCase();
      const byRegion = COUNTRIES.find(c => c[0] === region && c[2] === selLang);
      const byLang = COUNTRIES.find(c => c[2] === selLang);
      selCountry = (byRegion || byLang || COUNTRIES[0])[0];
    }
    if (I18N[selLang]) {
      curLang = selLang;
      if (hasGoogCookie()) setGoogCookie(null);
    } else if (!(consent && consent.translate)) {
      // traduttore non autorizzato: si torna all'italiano
      selLang = "it"; selCountry = "IT"; curLang = "it";
      if (hasGoogCookie()) setGoogCookie(null);
    } else {
      curLang = "it";
      if (!hasGoogCookie()) setGoogCookie(`/it/${selLang}`);
      if (RTL.includes(selLang)) document.documentElement.dir = "rtl";
      loadGoogle();
    }
    document.documentElement.lang = I18N[selLang] ? selLang : "it";
    applyTexts(); renderLangButton(); renderLangList("");
  }

  // pannello nazioni
  const langBtn = $("#langBtn"), langPanel = $("#langPanel"), langSearch = $("#langSearch"), langList = $("#langList");
  const flagUrl = cc => `img/flags/${cc.toLowerCase()}.svg`;
  function renderLangButton() {
    const c = COUNTRIES.find(x => x[0] === selCountry) || COUNTRIES.find(x => x[2] === selLang) || COUNTRIES[0];
    $("#langFlag").src = flagUrl(c[0]);
    $("#langFlag").alt = c[1];
    $("#langCode").textContent = (selLang || "it").split("-")[0].toUpperCase();
  }
  function renderLangList(q) {
    q = q.trim().toLowerCase();
    langList.innerHTML = "";
    COUNTRIES.filter(c => !q || c[1].toLowerCase().includes(q) || c[0].toLowerCase() === q || c[2].toLowerCase().startsWith(q))
      .forEach(([cc, name, lang]) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button"; b.setAttribute("role", "option");
        b.innerHTML = `<img src="${flagUrl(cc)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span></span><small>${I18N[lang] ? '<span class="star">★</span> ' : ""}${lang.split("-")[0]}</small>`;
        b.querySelector("span").textContent = name;
        b.addEventListener("click", () => { closeLang(); swoosh(); setLanguage(lang, cc); });
        li.appendChild(b); langList.appendChild(li);
      });
  }
  const openLang = () => { langPanel.hidden = false; langBtn.setAttribute("aria-expanded", "true"); langSearch.value = ""; renderLangList(""); setTimeout(() => langSearch.focus(), 30); };
  const closeLang = () => { langPanel.hidden = true; langBtn.setAttribute("aria-expanded", "false"); };
  langBtn.addEventListener("click", e => { e.stopPropagation(); langPanel.hidden ? openLang() : closeLang(); });
  langSearch.addEventListener("input", () => renderLangList(langSearch.value));
  document.addEventListener("click", e => { if (!langPanel.hidden && !e.target.closest(".lang")) closeLang(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLang(); });

  /* =========================================================
     BOLLE DI SAPONE SEGUENDO IL MOUSE
     ========================================================= */
  const cv = $("#bubbles"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const bubbles = [], drops = [];
  let bubbleCount = store.get("sav_bubbles", 0);
  const MAX = reduced ? 40 : 220;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize(); addEventListener("resize", resize);

  function spawn(x, y, opt = {}) {
    if (bubbles.length >= MAX) bubbles.shift();
    bubbles.push({
      x, y, r: opt.r || rand(6, 22), vx: opt.vx ?? rand(-0.6, 0.6), vy: opt.vy ?? rand(-1.6, -0.5),
      life: 0, max: rand(140, 320), ph: rand(0, Math.PI * 2), hue: rand(0, 360)
    });
    bubbleCount++;
  }
  function pop(b) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      drops.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * rand(1, 2.5), vy: Math.sin(a) * rand(1, 2.5), l: 1 });
    }
    popSound(1 + (20 - b.r) / 30);
  }
  function drawBubble(b) {
    const { x, y, r } = b;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(0.6, `hsla(${b.hue},90%,85%,0.10)`);
    g.addColorStop(0.9, `hsla(${(b.hue + 60) % 360},90%,75%,0.35)`);
    g.addColorStop(1, `hsla(${(b.hue + 140) % 360},90%,70%,0.6)`);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = `hsla(${(b.hue + 200) % 360},80%,60%,0.45)`; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.4, y + r * 0.35, r * 0.07, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fill();
  }
  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.life++; b.ph += 0.05; b.hue = (b.hue + 0.6) % 360;
      b.x += b.vx + Math.sin(b.ph) * 0.4; b.y += b.vy; b.vy -= 0.004;
      if (b.life > b.max || b.y < -40) { if (b.life > b.max) pop(b); bubbles.splice(i, 1); continue; }
      drawBubble(b);
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]; d.x += d.vx; d.y += d.vy; d.vy += 0.08; d.l -= 0.04;
      if (d.l <= 0) { drops.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(127,200,255,${d.l})`; ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  let lx = null, ly = null, acc = 0, mouseX = -999, mouseY = -999;
  addEventListener("pointermove", e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (lx !== null) acc += Math.hypot(e.clientX - lx, e.clientY - ly);
    lx = e.clientX; ly = e.clientY;
    const step = reduced ? 90 : 22;
    while (acc > step) { acc -= step; spawn(e.clientX + rand(-6, 6), e.clientY + rand(-6, 6)); }
  }, { passive: true });
  addEventListener("pointerdown", e => {
    let hit = false;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.r + 26) { pop(b); bubbles.splice(i, 1); hit = true; }
    }
    if (!hit && !e.target.closest("a,button,input,.scrub")) for (let i = 0; i < 6; i++) spawn(e.clientX, e.clientY, { vx: rand(-2, 2), vy: rand(-3, -1) });
  });
  function bubbleBurst(n, from) {
    for (let i = 0; i < n; i++) {
      const x = from ? from.x + rand(-40, 40) : rand(0, W);
      const y = from ? from.y + rand(-40, 40) : H + rand(0, 200);
      spawn(x, y, { r: rand(8, 34), vx: rand(-1.5, 1.5), vy: rand(-4, -1) });
    }
  }

  /* =========================================================
     SAVERIO PARLA (macchina da scrivere) + EASTER EGG
     ========================================================= */
  const speechText = $("#speechText");
  let typeTimer = null, phraseIdx = 0;
  function restartTyping() {
    clearTimeout(typeTimer);
    const phrases = t("phrases");
    let txt = phrases[phraseIdx % phrases.length], i = 0, deleting = false;
    const tick = () => {
      if (!deleting) {
        i++; speechText.textContent = txt.slice(0, i);
        if (i >= txt.length) { deleting = true; typeTimer = setTimeout(tick, 2800); return; }
        typeTimer = setTimeout(tick, reduced ? 5 : 38);
      } else {
        i -= 2; speechText.textContent = txt.slice(0, Math.max(0, i));
        if (i <= 0) { phraseIdx++; txt = phrases[phraseIdx % phrases.length]; deleting = false; typeTimer = setTimeout(tick, 350); return; }
        typeTimer = setTimeout(tick, 18);
      }
    };
    tick();
  }
  const mascot = $("#mascot");
  let clicks = [], waveT;
  mascot.addEventListener("click", () => {
    mascot.classList.remove("jump"); void mascot.offsetWidth; mascot.classList.add("jump", "waving");
    clearTimeout(waveT); waveT = setTimeout(() => mascot.classList.remove("waving"), 2200);
    const r = mascot.getBoundingClientRect();
    bubbleBurst(14, { x: r.left + r.width / 2, y: r.top + r.height * 0.4 });
    popSound(0.8);
    phraseIdx++; restartTyping();
    const now = Date.now();
    clicks = clicks.filter(c => now - c < 3000); clicks.push(now);
    if (clicks.length >= 5) { clicks = []; foamParty(); }
  });
  function foamParty() {
    fanfare(); toast(t("foam_party"), 4000);
    const pi = $("#partyImg"); pi.hidden = true; void pi.offsetWidth; pi.hidden = false;
    setTimeout(() => { pi.hidden = true; }, 3700);
    let n = 0;
    const iv = setInterval(() => { bubbleBurst(25); if (++n > 8) clearInterval(iv); }, 160);
  }

  /* ---------- toast ---------- */
  const toastEl = $("#toast"); let toastT;
  function toast(msg, ms = 2500) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  /* ---------- marquee & recensioni ---------- */
  function renderMarquee() {
    const items = t("marquee");
    $("#marquee").innerHTML = "";
    [...items, ...items].forEach(s => { const sp = document.createElement("span"); sp.textContent = s; $("#marquee").appendChild(sp); });
  }
  function renderReviews() {
    const arts = ["divano", "cantina", "calzino", "germe"], stars = [5, 5, 5, 1];
    const box = $("#reviews"); box.innerHTML = "";
    t("reviews").forEach((r, i) => {
      const d = document.createElement("article"); d.className = "review";
      d.innerHTML = `<div class="review-art"><img src="img/review-${arts[i]}.webp" alt="" loading="lazy"></div><div class="stars">${"★".repeat(stars[i])}${"☆".repeat(5 - stars[i])}</div><h3></h3><p></p>`;
      d.querySelector("h3").textContent = r.who; d.querySelector("p").textContent = `“${r.text}”`;
      box.appendChild(d);
    });
  }

  /* ---------- carte: tocco su mobile ---------- */
  $$(".card").forEach(c => {
    c.addEventListener("click", () => { c.classList.toggle("flipped"); swoosh(); });
    c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.classList.toggle("flipped"); } });
  });

  /* =========================================================
     OROLOGIO CON LANCETTE SIMPATICHE (ora italiana)
     ========================================================= */
  (function buildTicks() {
    const g = $("#ticks"), NS = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const big = i % 5 === 0, rr = big ? 118 : 122;
      if (i % 15 === 0) {
        const tx = document.createElementNS(NS, "text");
        tx.setAttribute("x", 150 + Math.cos(a) * 108); tx.setAttribute("y", 150 + Math.sin(a) * 108 + 8);
        tx.setAttribute("text-anchor", "middle"); tx.setAttribute("class", "tick-num");
        tx.textContent = i === 0 ? "12" : String(i / 5);
        g.appendChild(tx);
        continue;
      }
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", 150 + Math.cos(a) * rr); c.setAttribute("cy", 150 + Math.sin(a) * rr);
      c.setAttribute("r", big ? 6 : 2);
      c.setAttribute("fill", big ? "url(#bub)" : "#c9a24a");
      if (big) { c.setAttribute("stroke", "#7fc8ff"); c.setAttribute("stroke-width", "1"); }
      g.appendChild(c);
    }
  })();

  const hHour = $("#hHour"), hMin = $("#hMin"), hSec = $("#hSec");
  const fmtParts = new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short", hourCycle: "h23" });
  const SLEEP_IMG = pick(["img/saverio-dorme.webp", "img/saverio-dorme-2.webp"]);
  const DAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  let romeCache = { s: -1 }, spin = 0, lastStatusKey = "";
  function romeNow() {
    const now = new Date(), secKey = Math.floor(now.getTime() / 1000);
    if (romeCache.s !== secKey) {
      const p = {}; fmtParts.formatToParts(now).forEach(x => p[x.type] = x.value);
      romeCache = { s: secKey, h: +p.hour, m: +p.minute, sec: +p.second, wd: DAYS[p.weekday], date: now };
    }
    return { ...romeCache, ms: now.getMilliseconds() };
  }
  const easeOutBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function hoursFor(wd) { return wd === 0 ? CONFIG.hours.sun : wd === 6 ? CONFIG.hours.sat : CONFIG.hours.week; }
  function updateHoursTable() {
    const fmt = r => r ? `${fmtH(r[0])} – ${fmtH(r[1])}` : "";
    $("#hWeek").textContent = fmt(CONFIG.hours.week);
    $("#hSat").textContent = fmt(CONFIG.hours.sat);
  }
  function clockFrame() {
    const r = romeNow();
    const frac = r.ms / 1000;
    const sec = r.sec + (reduced ? 0 : Math.min(1, easeOutBack(Math.min(frac / 0.35, 1))));
    const min = r.m + r.sec / 60, hr = (r.h % 12) + min / 60;
    spin *= 0.95;
    hSec.setAttribute("transform", `rotate(${sec * 6 + spin * 3} 150 150)`);
    hMin.setAttribute("transform", `rotate(${min * 6 + spin} 150 150)`);
    hHour.setAttribute("transform", `rotate(${hr * 30 - spin * 0.5} 150 150)`);
    const p2 = n => String(n).padStart(2, "0");
    $("#digital").textContent = `${p2(r.h)}:${p2(r.m)}:${p2(r.sec)}`;

    const key = `${r.wd}-${r.h}-${r.m}-${curLang}`;
    if (key !== lastStatusKey) {
      lastStatusKey = key;
      let dayName = "";
      try { dayName = new Intl.DateTimeFormat(selLang || curLang, { timeZone: CONFIG.timeZone, weekday: "long" }).format(r.date); }
      catch { dayName = new Intl.DateTimeFormat("it", { timeZone: CONFIG.timeZone, weekday: "long" }).format(r.date); }
      $("#dayName").textContent = dayName;
      const range = hoursFor(r.wd), h = r.h + r.m / 60;
      const open = !!range && h >= range[0] && h < range[1];
      const st = $("#openStatus");
      st.className = "status " + (open ? "open" : "closed");
      st.textContent = (open ? "🟢 " : "😴 ") + t(open ? "open_now" : "closed_now");
      const si = $("#statusImg"), want = open ? "img/saverio-saluto.webp" : SLEEP_IMG;
      if (!si.getAttribute("src").endsWith(want)) si.src = want;
      $$(".hours tr").forEach(tr => tr.classList.remove("today"));
      const rowKey = r.wd === 0 ? "sun" : r.wd === 6 ? "sat" : "week";
      const row = $(`.hours tr[data-day="${rowKey}"]`); if (row) row.classList.add("today");
    }
    requestAnimationFrame(clockFrame);
  }
  $("#clock").addEventListener("click", () => { spin = 720; swoosh(); const r = $("#clock").getBoundingClientRect(); bubbleBurst(12, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); });
  requestAnimationFrame(clockFrame);

  /* =========================================================
     GIOCO: STROFINA VIA LO SPORCO
     ========================================================= */
  const dirt = $("#dirt"), dctx = dirt.getContext("2d", { willReadFrequently: true });
  const scrub = $(".scrub");
  let dirtW = 0, dirtDone = false, scrubbing = false, lastPt = null, checkT = null;
  function paintDirt() {
    const r = scrub.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    dirt.width = Math.max(1, Math.round(r.width * dpr)); dirt.height = Math.max(1, Math.round(r.height * dpr));
    dirtW = r.width; dirtDone = false;
    const w = dirt.width, h = dirt.height, s = w / 1000;
    dctx.globalCompositeOperation = "source-over";
    dctx.fillStyle = "rgba(122,96,58,0.93)"; dctx.fillRect(0, 0, w, h);
    const cols = ["rgba(92,70,40,.7)", "rgba(140,115,70,.6)", "rgba(80,90,40,.45)", "rgba(60,45,25,.55)", "rgba(165,140,95,.5)"];
    for (let i = 0; i < 70; i++) {
      dctx.fillStyle = pick(cols); dctx.beginPath();
      const cx = rand(0, w), cy = rand(0, h), rr = rand(10, 70) * s;
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, q = rr * rand(0.6, 1.3); dctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
      dctx.fill();
    }
    for (let i = 0; i < 1600; i++) { dctx.fillStyle = `rgba(${rand(40, 90) | 0},${rand(30, 70) | 0},20,${rand(.2, .6)})`; dctx.fillRect(rand(0, w), rand(0, h), 2 * s + 1, 2 * s + 1); }
    // anello di caffè
    dctx.strokeStyle = "rgba(60,35,15,.55)"; dctx.lineWidth = 7 * s;
    dctx.beginPath(); dctx.arc(w * 0.82, h * 0.3, 60 * s, 0.3, Math.PI * 1.85); dctx.stroke();
    // scritta col dito come sui vetri sporchi
    dctx.font = `700 ${Math.round(80 * s)}px Fredoka, sans-serif`;
    dctx.textAlign = "center"; dctx.fillStyle = "rgba(210,190,150,.55)";
    dctx.save(); dctx.translate(w / 2, h * 0.58); dctx.rotate(-0.06); dctx.fillText(t("game_dirty_word"), 0, 0); dctx.restore();
    // impronta di zampa
    dctx.fillStyle = "rgba(55,40,20,.6)";
    [[0.15, 0.78], [0.2, 0.68], [0.26, 0.76]].forEach(([px, py], i) => {
      const x = w * px, y = h * py; dctx.beginPath(); dctx.ellipse(x, y, 16 * s, 13 * s, 0, 0, Math.PI * 2); dctx.fill();
      [-1, 0, 1].forEach(o => { dctx.beginPath(); dctx.arc(x + o * 13 * s, y - 20 * s, 6 * s, 0, Math.PI * 2); dctx.fill(); });
    });
    updateMeter(0); $("#gameDone").hidden = true; dirt.style.transition = ""; dirt.style.opacity = "1";
  }
  function scrubAt(x, y) {
    const k = dirt.width / dirtW, R = 34 * k;
    const pts = [];
    if (lastPt) {
      const d = Math.hypot(x - lastPt.x, y - lastPt.y), n = Math.max(1, Math.ceil(d / 8));
      for (let i = 1; i <= n; i++) pts.push({ x: lastPt.x + (x - lastPt.x) * i / n, y: lastPt.y + (y - lastPt.y) * i / n });
    } else pts.push({ x, y });
    dctx.globalCompositeOperation = "destination-out";
    pts.forEach(p => {
      const g = dctx.createRadialGradient(p.x * k, p.y * k, 0, p.x * k, p.y * k, R);
      g.addColorStop(0, "rgba(0,0,0,0.9)"); g.addColorStop(0.6, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(p.x * k, p.y * k, R, 0, Math.PI * 2); dctx.fill();
    });
    lastPt = { x, y };
    if (!checkT) checkT = setTimeout(() => { checkT = null; checkClean(); }, 250);
  }
  function checkClean() {
    if (dirtDone) return;
    const { width: w, height: h } = dirt, data = dctx.getImageData(0, 0, w, h).data;
    let clear = 0, tot = 0;
    for (let i = 3; i < data.length; i += 4 * 23) { tot++; if (data[i] < 60) clear++; }
    const pct = Math.min(100, Math.round((clear / tot) * 100 / 0.9));
    updateMeter(pct);
    if (pct >= 100) {
      dirtDone = true;
      dirt.style.transition = "opacity .6s"; dirt.style.opacity = "0";
      $("#gameDone").hidden = false; fanfare();
      const r = scrub.getBoundingClientRect(); bubbleBurst(40, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  }
  function updateMeter(p) { $("#meterFill").style.width = p + "%"; $("#cleanPct").textContent = p + "%"; }
  const local = e => { const r = scrub.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  scrub.addEventListener("pointerdown", e => { scrubbing = true; lastPt = null; scrub.setPointerCapture(e.pointerId); const p = local(e); scrubAt(p.x, p.y); });
  scrub.addEventListener("pointermove", e => {
    const p = local(e);
    if (scrubbing || e.pointerType === "mouse") scrubAt(p.x, p.y); // con il mouse basta passarci sopra
    if (Math.random() < 0.08) popSound(0.6);
  });
  const stop = () => { scrubbing = false; lastPt = null; };
  scrub.addEventListener("pointerup", stop); scrub.addEventListener("pointercancel", stop); scrub.addEventListener("pointerleave", stop);
  $("#resetDirt").addEventListener("click", () => { paintDirt(); swoosh(); });
  const scrubImg = $(".scrub img");
  const initDirt = () => { if (scrub.getBoundingClientRect().width > 0) paintDirt(); };
  scrubImg.complete ? initDirt() : scrubImg.addEventListener("load", initDirt);
  if (document.fonts) document.fonts.ready.then(() => { if (!dirtDone && $("#cleanPct").textContent === "0%") initDirt(); });
  let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { if (Math.abs(scrub.getBoundingClientRect().width - dirtW) > 40) paintDirt(); }, 300); });

  /* =========================================================
     BATUFFOLO DI POLVERE CHE SCAPPA
     ========================================================= */
  const dust = $("#dust");
  let dustCount = store.get("sav_dust", 0), dustRun = null;
  function launchDust() {
    if (dustRun || document.hidden) return schedule();
    dust.hidden = false; dust.classList.remove("poof");
    let x = -70, speed = rand(1.6, 2.6), tt = 0;
    const fromRight = Math.random() < 0.5; if (fromRight) { x = innerWidth + 10; speed = -speed; }
    dust.classList.toggle("left", fromRight);
    const step = () => {
      tt += 0.15;
      const r = dust.getBoundingClientRect();
      const near = Math.hypot(mouseX - (r.left + r.width / 2), mouseY - (r.top + r.height / 2)) < 140;
      x += speed * (near ? 2.8 : 1);
      dust.style.transform = `translate(${x + 80}px, ${-Math.abs(Math.sin(tt)) * (near ? 26 : 12)}px)`;
      if (x > innerWidth + 80 || x < -90) { endDust(); return; }
      dustRun = requestAnimationFrame(step);
    };
    dustRun = requestAnimationFrame(step);
  }
  function endDust() { cancelAnimationFrame(dustRun); dustRun = null; dust.hidden = true; schedule(); }
  function schedule() { setTimeout(launchDust, rand(12000, 26000)); }
  dust.addEventListener("click", e => {
    e.stopPropagation();
    cancelAnimationFrame(dustRun);
    dust.classList.add("poof"); popSound(0.5); swoosh();
    dustCount++; store.set("sav_dust", dustCount); renderStats();
    toast(t("dust_caught"));
    setTimeout(() => { dustRun = null; dust.hidden = true; schedule(); }, 420);
  });
  setTimeout(launchDust, 6000);

  /* ---------- statistiche ---------- */
  function renderStats() {
    $("#statBubbles").textContent = bubbleCount.toLocaleString();
    $("#statDust").textContent = dustCount.toLocaleString();
    const socks = Math.floor(bubbleCount / 137);
    $("#statSocks").textContent = socks.toLocaleString();
    if (socks > lastSocks) { lastSocks = socks; showSock(); }
  }
  /* ---------- calzino spaiato: ogni 137 bolle ne salta fuori uno ---------- */
  let lastSocks = Math.floor(bubbleCount / 137);
  const sockPop = $("#sockPop");
  function showSock() {
    if (!sockPop.hidden) return;
    const right = Math.random() < 0.5;
    sockPop.classList.toggle("from-right", right);
    sockPop.style.top = rand(18, 58) + "vh";
    sockPop.hidden = false;
    popSound(1.4); setTimeout(() => popSound(1.7), 120);
    toast(t("sock_found"), 3200);
    setTimeout(() => { sockPop.hidden = true; }, 3000);
  }
  setInterval(() => { renderStats(); store.set("sav_bubbles", bubbleCount); }, 700);

  /* ---------- generatore di scuse ---------- */
  let lastExcuse = -1;
  function resetExcuse() { $("#excuseText").textContent = "🤔 …"; $("#excuseOutro").hidden = true; }
  $("#excuseBtn").addEventListener("click", e => {
    const list = t("excuses"); let i;
    do { i = Math.floor(Math.random() * list.length); } while (i === lastExcuse && list.length > 1);
    lastExcuse = i;
    const el = $("#excuseText");
    el.textContent = `“${list[i]}”`; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    const ei = $("#excuseImg"); ei.classList.remove("doubt"); void ei.offsetWidth; ei.classList.add("doubt");
    $("#excuseOutro").hidden = false;
    popSound(1.2); bubbleBurst(8, { x: e.clientX, y: e.clientY });
  });

  /* ---------- avvio ---------- */
  $("#year").textContent = new Date().getFullYear();
  initLanguage();
  if (!consent) setTimeout(() => { if (cookieBar.hidden) showCookie("info"); }, 1200);
  renderStats();
})();
