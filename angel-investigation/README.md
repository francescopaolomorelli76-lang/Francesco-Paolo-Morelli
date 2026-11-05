# Angel Investigation: sito web

Sito dell'agenzia di investigazioni private, con design scuro (nero, rosa, viola),
menu responsive per computer e cellulare, chat riservata in tempo reale e modulo email.

## Avvio

```bash
cd angel-investigation
npm install
ADMIN_PASSWORD="una-password-lunga" npm start
```

- Sito: http://localhost:3000
- Console operatore (per rispondere in chat): http://localhost:3000/operatore

## Configurazione (variabili d'ambiente)

| Variabile | A cosa serve |
|---|---|
| `PORT` | Porta del server (predefinita 3000) |
| `ADMIN_PASSWORD` | Password della console operatore. Senza, la console è disattivata |
| `CHAT_TTL_HOURS` | Dopo quante ore di inattività le chat vengono cancellate (predefinito 24) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Server di posta per inviare le richieste |
| `MAIL_TO` | Indirizzo che riceve le richieste del modulo |
| `MAIL_FROM` | Mittente delle email (predefinito `SMTP_USER`) |

Se SMTP non è configurato, le richieste vengono salvate in `data/inbox.jsonl` (escluso da git).

## Privacy

- La chat è solo in memoria: niente database, niente file. Si cancella alla chiusura o dopo `CHAT_TTL_HOURS`.
- Nessun cookie, nessun tracciamento di terze parti.
- Intestazioni di sicurezza (CSP, no-referrer, anti-iframe), limiti di frequenza su form, chat e login.
- In produzione va servito in HTTPS (per esempio dietro Nginx/Caddy o su Render, Railway, un VPS).

## Da completare

Dati da inserire in `public/index.html` e `public/privacy.html`: telefono, email, indirizzo,
P.IVA, numero di licenza prefettizia e i numeri della sezione "Agenzia" (anni, casi, percentuale).
