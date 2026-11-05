/*
 * Angel Investigation: server del sito.
 * - Serve le pagine statiche in /public
 * - Chat in tempo reale visitatore <-> operatore (Socket.io)
 * - Modulo contatti inviato per email (SMTP) o salvato in locale
 *
 * Privacy: le conversazioni restano solo in memoria e vengono cancellate
 * dopo CHAT_TTL_HOURS di inattività. Nulla viene scritto su disco dalla chat.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const CHAT_TTL_HOURS = Number(process.env.CHAT_TTL_HOURS) || 24;
const MAIL_TO = process.env.MAIL_TO || '';

if (!ADMIN_PASSWORD) {
  console.warn('[!] ADMIN_PASSWORD non impostata: il pannello operatore è disattivato.');
}

/* ---------- Email ---------- */
let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

const dataDir = path.join(__dirname, 'data');

async function deliverMessage(kind, fields) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
  if (mailer && MAIL_TO) {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: MAIL_TO,
      replyTo: fields.email || undefined,
      subject: `[Angel Investigation] ${kind}`,
      text: lines,
    });
    return;
  }
  // Nessun SMTP configurato: salva in locale (cartella esclusa da git).
  fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(
    path.join(dataDir, 'inbox.jsonl'),
    JSON.stringify({ kind, at: new Date().toISOString(), ...fields }) + '\n',
    { mode: 0o600 }
  );
}

/* ---------- Utilità ---------- */
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const isEmail = (v) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v);

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Limite di richieste semplice per IP
const hits = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

/* ---------- HTTP ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
      "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  next();
});

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.post('/api/contatto', async (req, res) => {
  if (rateLimited('form:' + req.ip, 5, 60 * 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Troppe richieste. Riprova più tardi.' });
  }
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // campo trappola anti-spam
  const fields = {
    nome: clean(b.nome, 80),
    email: clean(b.email, 254),
    telefono: clean(b.telefono, 40),
    servizio: clean(b.servizio, 80),
    messaggio: clean(b.messaggio, 4000),
  };
  if (!fields.nome || !isEmail(fields.email) || fields.messaggio.length < 10) {
    return res.status(400).json({ ok: false, error: 'Controlla nome, email e messaggio.' });
  }
  if (b.consenso !== true) {
    return res.status(400).json({ ok: false, error: 'Serve il consenso al trattamento dei dati.' });
  }
  try {
    await deliverMessage('Richiesta dal sito', fields);
    res.json({ ok: true });
  } catch (err) {
    console.error('Invio email fallito:', err.message);
    res.status(500).json({ ok: false, error: 'Invio non riuscito. Riprova o scrivici in chat.' });
  }
});

/* ---------- Chat ---------- */
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });

/** conversations: id -> { name, messages: [{from, text, at}], lastActive, unread } */
const conversations = new Map();
const visitorSockets = new Map(); // id -> count of connected sockets

function summary(id) {
  const c = conversations.get(id);
  const last = c.messages[c.messages.length - 1];
  return {
    id,
    name: c.name,
    lastActive: c.lastActive,
    unread: c.unread,
    online: (visitorSockets.get(id) || 0) > 0,
    preview: last ? last.text.slice(0, 80) : '',
  };
}
const operatorsOnline = () => io.of('/').adapter.rooms.get('operators')?.size || 0;
const broadcastStatus = () => io.emit('status', { operatorOnline: operatorsOnline() > 0 });

// Pulizia delle conversazioni inattive
setInterval(() => {
  const limit = Date.now() - CHAT_TTL_HOURS * 3600 * 1000;
  for (const [id, c] of conversations) {
    if (c.lastActive < limit && !(visitorSockets.get(id) > 0)) {
      conversations.delete(id);
      io.to('operators').emit('conversation:removed', id);
    }
  }
}, 10 * 60 * 1000).unref();

io.on('connection', (socket) => {
  const auth = socket.handshake.auth || {};
  const ip = socket.handshake.address;

  /* ----- Operatore ----- */
  if (auth.role === 'operator') {
    if (rateLimited('op:' + ip, 10, 15 * 60 * 1000)) {
      socket.emit('auth:error', 'Troppi tentativi. Riprova tra qualche minuto.');
      return socket.disconnect(true);
    }
    if (!ADMIN_PASSWORD || !safeEqual(auth.password || '', ADMIN_PASSWORD)) {
      socket.emit('auth:error', ADMIN_PASSWORD ? 'Password non valida' : 'Pannello disattivato: imposta ADMIN_PASSWORD sul server');
      return socket.disconnect(true);
    }
    socket.join('operators');
    socket.emit('auth:ok');
    socket.emit('conversations', [...conversations.keys()].map(summary).sort((a, b) => b.lastActive - a.lastActive));
    broadcastStatus();

    socket.on('open', (id) => {
      const c = conversations.get(id);
      if (!c) return;
      c.unread = 0;
      socket.emit('history', { id, messages: c.messages });
      io.to('operators').emit('conversation:update', summary(id));
    });

    socket.on('reply', ({ id, text }) => {
      const c = conversations.get(id);
      text = clean(text, 2000);
      if (!c || !text) return;
      const msg = { from: 'operator', text, at: Date.now() };
      c.messages.push(msg);
      c.lastActive = msg.at;
      io.to('v:' + id).emit('message', msg);
      io.to('operators').emit('message', { id, ...msg });
      io.to('operators').emit('conversation:update', summary(id));
    });

    socket.on('typing', (id) => io.to('v:' + id).emit('typing'));

    socket.on('close', (id) => {
      if (!conversations.has(id)) return;
      io.to('v:' + id).emit('message', { from: 'system', text: 'La conversazione è stata chiusa dall\'operatore. I messaggi sono stati cancellati.', at: Date.now() });
      conversations.delete(id);
      io.to('operators').emit('conversation:removed', id);
    });

    socket.on('disconnect', broadcastStatus);
    return;
  }

  /* ----- Visitatore ----- */
  let id = typeof auth.chatId === 'string' && /^[a-f0-9]{32}$/.test(auth.chatId) ? auth.chatId : null;
  if (!id) id = crypto.randomBytes(16).toString('hex');
  socket.join('v:' + id);
  visitorSockets.set(id, (visitorSockets.get(id) || 0) + 1);

  socket.emit('session', {
    chatId: id,
    messages: conversations.get(id)?.messages || [],
    operatorOnline: operatorsOnline() > 0,
  });
  if (conversations.has(id)) io.to('operators').emit('conversation:update', summary(id));

  socket.on('message', ({ text, name }) => {
    if (rateLimited('msg:' + id, 20, 60 * 1000)) {
      return socket.emit('message', { from: 'system', text: 'Stai scrivendo troppo velocemente. Attendi un momento.', at: Date.now() });
    }
    text = clean(text, 2000);
    if (!text) return;
    let c = conversations.get(id);
    const isNew = !c;
    if (!c) {
      c = { name: clean(name, 60) || 'Visitatore', messages: [], lastActive: Date.now(), unread: 0 };
      conversations.set(id, c);
    } else if (name) {
      c.name = clean(name, 60) || c.name;
    }
    const msg = { from: 'visitor', text, at: Date.now() };
    c.messages.push(msg);
    c.lastActive = msg.at;
    c.unread += 1;
    io.to('v:' + id).emit('message', msg);
    io.to('operators').emit('message', { id, ...msg });
    io.to('operators').emit('conversation:update', summary(id));

    if (isNew && operatorsOnline() === 0) {
      const auto = {
        from: 'system',
        text: 'Al momento nessun operatore è collegato. Lascia la tua email con il modulo qui sotto e ti ricontatteremo in via riservata.',
        at: Date.now(),
      };
      socket.emit('message', auto);
      socket.emit('offline:form');
    }
  });

  socket.on('typing', () => io.to('operators').emit('typing', id));

  socket.on('offline', async ({ email, name }) => {
    email = clean(email, 254);
    if (!isEmail(email) || rateLimited('off:' + id, 3, 60 * 60 * 1000)) return;
    const c = conversations.get(id);
    const transcript = (c?.messages || [])
      .filter((m) => m.from === 'visitor')
      .map((m) => '- ' + m.text)
      .join('\n');
    try {
      await deliverMessage('Messaggio dalla chat (operatore offline)', {
        nome: clean(name, 60) || c?.name || 'Visitatore',
        email,
        messaggio: '\n' + transcript,
      });
      socket.emit('message', { from: 'system', text: 'Grazie. Ti scriveremo all\'indirizzo indicato il prima possibile.', at: Date.now() });
    } catch (err) {
      console.error('Invio email fallito:', err.message);
    }
  });

  socket.on('end', () => {
    conversations.delete(id);
    io.to('operators').emit('conversation:removed', id);
  });

  socket.on('disconnect', () => {
    visitorSockets.set(id, Math.max(0, (visitorSockets.get(id) || 1) - 1));
    if (conversations.has(id)) io.to('operators').emit('conversation:update', summary(id));
  });
});

server.listen(PORT, () => {
  console.log(`Angel Investigation in ascolto su http://localhost:${PORT}`);
});
