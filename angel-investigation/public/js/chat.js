/* Angel Investigation: chat riservata lato visitatore */
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
  const offline = $('chatOffline');
  const fabDot = $('fabDot');
  const statusText = $('chatStatusText');

  const KEY = 'ai_chat_id';
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignora */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch { /* ignora */ } },
  };

  const fmt = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  function addMessage(m) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--' + m.from;
    const p = document.createElement('p');
    p.textContent = m.text; // testo sempre come testo, mai come HTML
    wrap.appendChild(p);
    if (m.from !== 'system') {
      const time = document.createElement('time');
      time.textContent = (m.from === 'operator' ? 'Investigatore · ' : '') + fmt(m.at);
      wrap.appendChild(time);
    }
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function setOnline(on) {
    statusEl.innerHTML = '';
    const dot = document.createElement('i');
    dot.className = 'status-dot' + (on ? ' on' : '');
    statusEl.append(dot, on ? ' Operatore disponibile' : ' Operatore non connesso: lascia un messaggio');
    fabDot.classList.toggle('on', on);
    if (statusText) statusText.textContent = on ? 'Un investigatore è online ora' : 'Lascia un messaggio, ti ricontattiamo';
  }

  // Apertura / chiusura
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;
  function open() {
    chat.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    if (isMobile()) { fab.classList.add('is-hidden'); document.body.classList.add('no-scroll'); }
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

  // Socket.io non disponibile (sito aperto come file statico)
  if (typeof io !== 'function') {
    setOnline(false);
    addMessage({ from: 'system', text: 'Chat temporaneamente non disponibile. Usa il modulo contatti o scrivici per email.' });
    form.addEventListener('submit', (e) => e.preventDefault());
    return;
  }

  const socket = io({ auth: { chatId: store.get(KEY) } });

  socket.on('connect_error', () => setOnline(false));
  socket.on('session', ({ chatId, messages, operatorOnline }) => {
    store.set(KEY, chatId);
    socket.auth.chatId = chatId;
    body.querySelectorAll('.msg:not(:first-child)').forEach((n) => n.remove());
    messages.forEach(addMessage);
    setOnline(operatorOnline);
  });
  socket.on('status', ({ operatorOnline }) => setOnline(operatorOnline));
  socket.on('message', (m) => {
    typingEl.hidden = true;
    addMessage(m);
    if (m.from === 'operator' && chat.hidden) fab.classList.add('has-new');
  });
  socket.on('offline:form', () => { offline.hidden = false; });

  let typingTimer;
  socket.on('typing', () => {
    typingEl.hidden = false;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { typingEl.hidden = true; }, 2500);
  });

  // Invio
  function send() {
    const text = input.value.trim();
    if (!text) return;
    socket.emit('message', { text, name: nameInput.value.trim() });
    input.value = '';
    input.style.height = '';
    nameInput.hidden = true; // il nome si chiede solo al primo messaggio
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });

  let lastTyping = 0;
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    if (Date.now() - lastTyping > 1500) { socket.emit('typing'); lastTyping = Date.now(); }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) { e.preventDefault(); send(); }
  });

  offline.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = offline.email.value.trim();
    if (!offline.checkValidity()) return offline.reportValidity();
    socket.emit('offline', { email, name: nameInput.value.trim() });
    offline.hidden = true;
  });

  // Cancellazione conversazione
  $('chatEnd').addEventListener('click', () => {
    if (!confirm('Vuoi cancellare definitivamente questa conversazione?')) return;
    socket.emit('end');
    store.del(KEY);
    body.querySelectorAll('.msg:not(:first-child)').forEach((n) => n.remove());
    addMessage({ from: 'system', text: 'Conversazione cancellata.' });
    nameInput.hidden = false;
    offline.hidden = true;
    socket.auth.chatId = null;
    socket.disconnect().connect();
  });
})();
