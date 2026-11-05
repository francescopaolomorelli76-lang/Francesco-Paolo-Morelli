/* Angel Investigation: console operatore */
(() => {
  const $ = (id) => document.getElementById(id);
  const convs = new Map();
  let current = null;
  let socket = null;

  const fmt = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  function renderList() {
    const ul = $('convs');
    ul.innerHTML = '';
    const items = [...convs.values()].sort((a, b) => b.lastActive - a.lastActive);
    $('empty').hidden = items.length > 0;
    for (const c of items) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      if (c.id === current) b.classList.add('is-active');
      const name = document.createElement('strong');
      const dot = document.createElement('i');
      dot.className = 'status-dot' + (c.online ? ' on' : '');
      name.append(dot, ' ' + c.name);
      if (c.unread && c.id !== current) {
        const u = document.createElement('span');
        u.className = 'op-unread';
        u.textContent = c.unread;
        name.append(u);
      }
      const time = document.createElement('time');
      time.textContent = fmt(c.lastActive);
      const prev = document.createElement('small');
      prev.textContent = c.preview;
      b.append(name, time, prev);
      b.addEventListener('click', () => openConv(c.id));
      li.append(b);
      ul.append(li);
    }
    const totalUnread = items.reduce((n, c) => n + (c.id === current ? 0 : c.unread), 0);
    document.title = (totalUnread ? `(${totalUnread}) ` : '') + 'Console operatore | Angel Investigation';
  }

  function addMsg(m) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--' + m.from;
    const p = document.createElement('p');
    p.textContent = m.text;
    const t = document.createElement('time');
    t.textContent = fmt(m.at);
    wrap.append(p, t);
    $('msgs').append(wrap);
    $('msgs').scrollTop = $('msgs').scrollHeight;
  }

  function showHeader() {
    const c = convs.get(current);
    $('convName').textContent = c ? c.name : 'Seleziona una conversazione';
    $('convState').textContent = c ? (c.online ? 'Online ora' : 'Non connesso') : '';
    $('closeConv').hidden = !c;
    $('replyForm').hidden = !c;
  }

  function openConv(id) {
    current = id;
    $('msgs').innerHTML = '';
    socket.emit('open', id);
    $('app').classList.add('show-chat');
    showHeader();
    renderList();
    $('reply').focus();
  }

  function connect(password) {
    socket = io({ auth: { role: 'operator', password }, reconnection: true });

    socket.on('auth:error', (msg) => {
      $('loginError').textContent = msg;
      socket.close();
    });
    socket.on('connect_error', () => { $('loginError').textContent = 'Server non raggiungibile.'; });
    socket.on('auth:ok', () => {
      $('login').hidden = true;
      $('app').hidden = false;
      try { sessionStorage.setItem('ai_op', password); } catch { /* ignora */ }
    });
    socket.on('conversations', (list) => {
      convs.clear();
      list.forEach((c) => convs.set(c.id, c));
      renderList();
      if (current && convs.has(current)) socket.emit('open', current);
    });
    socket.on('conversation:update', (c) => {
      convs.set(c.id, c);
      if (c.id === current) showHeader();
      renderList();
    });
    socket.on('conversation:removed', (id) => {
      convs.delete(id);
      if (id === current) { current = null; $('msgs').innerHTML = ''; $('app').classList.remove('show-chat'); showHeader(); }
      renderList();
    });
    socket.on('history', ({ id, messages }) => {
      if (id !== current) return;
      $('msgs').innerHTML = '';
      messages.forEach(addMsg);
    });
    socket.on('message', (m) => {
      if (m.id === current) {
        addMsg(m);
        $('typing').hidden = true;
        if (m.from === 'visitor') socket.emit('open', current); // segna come letto
      } else if (m.from === 'visitor') {
        beep();
      }
    });
    let tt;
    socket.on('typing', (id) => {
      if (id !== current) return;
      $('typing').hidden = false;
      clearTimeout(tt);
      tt = setTimeout(() => { $('typing').hidden = true; }, 2500);
    });
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.05;
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15);
    } catch { /* ignora */ }
  }

  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('loginError').textContent = '';
    connect(e.target.password.value);
  });

  const send = () => {
    const text = $('reply').value.trim();
    if (!text || !current) return;
    socket.emit('reply', { id: current, text });
    $('reply').value = '';
  };
  $('replyForm').addEventListener('submit', (e) => { e.preventDefault(); send(); });
  let lastT = 0;
  $('reply').addEventListener('input', () => {
    if (current && Date.now() - lastT > 1500) { socket.emit('typing', current); lastT = Date.now(); }
  });
  $('reply').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  $('closeConv').addEventListener('click', () => {
    if (current && confirm('Chiudere la conversazione e cancellare tutti i messaggi?')) socket.emit('close', current);
  });
  $('back').addEventListener('click', () => { $('app').classList.remove('show-chat'); current = null; showHeader(); renderList(); });

  let saved = null;
  try { saved = sessionStorage.getItem('ai_op'); } catch { /* ignora */ }
  if (saved) connect(saved);
})();
