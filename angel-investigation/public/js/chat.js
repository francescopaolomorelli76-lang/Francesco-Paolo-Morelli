/* Angel Investigation: chat riservata lato visitatore.
 * Risponde prima l'assistente virtuale (bot.js); se un operatore
 * collegato alla console risponde, l'assistente si ferma. */
(() => {
  const $ = (id) => document.getElementById(id);
  const chat = $('chat');
  const fab = $('chatFab');
  const body = $('chatBody');
  const form = $('chatForm');
  const input = $('chatInput');
  const nameInput = $('chatName');
  const statusEl = $('chatStatus');
  const typingEl = $('chatTyping');
  const fabDot = $('fabDot');
  const statusText = $('chatStatusText');
  const bot = window.AngelBot;

  const KEY = 'ai_chat_id';
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignora */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch { /* ignora */ } },
  };

  let turn = 0;            // messaggi inviati dal visitatore
  let finalSent = false;   // l'assistente ha già indicato la mail
  let botActive = true;    // false quando risponde un operatore
  let greeted = false;
  let socket = null;

  const fmt = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const hasEmail = (t) => bot && t.includes(bot.EMAIL);

  function emailActions() {
    const row = document.createElement('div');
    row.className = 'msg__actions';
    const a = document.createElement('a');
    a.className = 'msg__btn';
    a.href = 'mailto:' + bot.EMAIL + '?subject=' + encodeURIComponent('Richiesta di consulenza riservata');
    a.textContent = 'Scrivi una email';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'msg__btn msg__btn--ghost';
    copy.textContent = 'Copia indirizzo';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(bot.EMAIL); copy.textContent = 'Copiato'; }
      catch { copy.textContent = bot.EMAIL; }
    });
    row.append(a, copy);
    return row;
  }

  function addMessage(m) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--' + m.from;
    const p = document.createElement('p');
    p.textContent = m.text; // sempre testo, mai HTML
    wrap.appendChild(p);
    if ((m.from === 'bot') && hasEmail(m.text)) wrap.appendChild(emailActions());
    if (m.from !== 'system') {
      const time = document.createElement('time');
      const who = m.from === 'operator' ? 'Investigatore · ' : m.from === 'bot' ? 'Angel · ' : '';
      time.textContent = who + fmt(m.at || Date.now());
      wrap.appendChild(time);
    }
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function setStatus(operatorOnline) {
    statusEl.innerHTML = '';
    const dot = document.createElement('i');
    dot.className = 'status-dot on';
    statusEl.append(dot, operatorOnline ? ' Investigatore disponibile' : ' Online · risponde subito');
    fabDot.classList.add('on');
    if (statusText) statusText.textContent = 'Assistente disponibile 24 ore su 24';
  }

  // Risposta dell'assistente con breve attesa "sta scrivendo"
  function botSay(msg) {
    typingEl.hidden = false;
    const delay = Math.min(2600, 700 + msg.text.length * 12);
    setTimeout(() => {
      if (!botActive && !msg.greeting) { typingEl.hidden = true; return; }
      typingEl.hidden = true;
      const m = { from: 'bot', text: msg.text, at: Date.now() };
      addMessage(m);
      if (msg.final) finalSent = true;
      if (socket && !msg.greeting) socket.emit('bot', { text: m.text });
    }, delay);
  }

  function greet() {
    if (greeted || !bot) return;
    greeted = true;
    botSay({ ...bot.greeting(), greeting: true });
  }

  // Apertura / chiusura
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;
  function open() {
    chat.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    if (isMobile()) { fab.classList.add('is-hidden'); document.body.classList.add('no-scroll'); }
    if (turn === 0) greet();
    setTimeout(() => input.focus(), 50);
  }
  function close() {
    chat.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('is-hidden');
    document.body.classList.remove('no-scroll');
  }
  fab.addEventListener('click', () => (chat.hidden ? open() : close()));
  $('chatClose').addEventListener('click', close);
  document.querySelectorAll('[data-open-chat]').forEach((b) => b.addEventListener('click', open));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chat.hidden) close(); });

  setStatus(false);

  // Collegamento al server (se disponibile): inoltra i messaggi alla console operatore
  if (typeof io === 'function') {
    socket = io({ auth: { chatId: store.get(KEY) } });
    socket.on('session', ({ chatId, messages, operatorOnline }) => {
      store.set(KEY, chatId);
      socket.auth.chatId = chatId;
      if (messages.length) {
        body.querySelectorAll('.msg:not(:first-child)').forEach((n) => n.remove());
        messages.forEach(addMessage);
        turn = messages.filter((m) => m.from === 'visitor').length;
        finalSent = messages.some((m) => m.from === 'bot' && hasEmail(m.text));
        botActive = !messages.some((m) => m.from === 'operator');
        greeted = true;
        nameInput.hidden = true;
      }
      setStatus(operatorOnline);
    });
    socket.on('status', ({ operatorOnline }) => setStatus(operatorOnline));
    socket.on('message', (m) => {
      if (m.from === 'visitor') return; // già mostrato in locale
      if (m.from === 'operator') botActive = false;
      typingEl.hidden = true;
      addMessage(m);
    });
    let typingTimer;
    socket.on('typing', () => {
      typingEl.textContent = 'L\'investigatore sta scrivendo…';
      typingEl.hidden = false;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { typingEl.hidden = true; typingEl.textContent = 'Angel sta scrivendo…'; }, 2500);
    });
  }

  // Invio
  function send() {
    const text = input.value.trim().slice(0, 2000);
    if (!text) return;
    addMessage({ from: 'visitor', text, at: Date.now() });
    if (socket) socket.emit('message', { text, name: nameInput.value.trim() });
    input.value = '';
    input.style.height = '';
    nameInput.hidden = true; // il nome si chiede solo al primo messaggio
    turn += 1;
    if (botActive && bot) botSay(bot.reply(text, turn, finalSent));
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });

  let lastTyping = 0;
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    if (socket && Date.now() - lastTyping > 1500) { socket.emit('typing'); lastTyping = Date.now(); }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) { e.preventDefault(); send(); }
  });

  // Cancellazione conversazione (doppio tocco per confermare)
  const endBtn = $('chatEnd');
  let armed = null;
  endBtn.addEventListener('click', () => {
    if (!armed) {
      endBtn.classList.add('is-armed');
      endBtn.title = 'Tocca di nuovo per cancellare';
      addMessage({ from: 'system', text: 'Tocca di nuovo il cestino per cancellare la conversazione.' });
      armed = setTimeout(() => { armed = null; endBtn.classList.remove('is-armed'); }, 4000);
      return;
    }
    clearTimeout(armed); armed = null; endBtn.classList.remove('is-armed');
    if (socket) socket.emit('end');
    store.del(KEY);
    body.querySelectorAll('.msg:not(:first-child)').forEach((n) => n.remove());
    addMessage({ from: 'system', text: 'Conversazione cancellata.' });
    turn = 0; finalSent = false; botActive = true; greeted = false;
    nameInput.hidden = false;
    if (socket) { socket.auth.chatId = null; socket.disconnect().connect(); }
    greet();
  });
})();
