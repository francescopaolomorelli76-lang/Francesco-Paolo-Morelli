# Clinia App · Supabase

© 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.

## Progetto collegato
- Progetto: `iuydwatobtrpzhotcfyd` (regione eu-west-3, Parigi), URL `https://iuydwatobtrpzhotcfyd.supabase.co`
- Schema e dati iniziali installati il 10/11/2026; chiave anon pubblica già nell'app (`SUPABASE` in `index.html`)
- Conferma dell'e-mail alla registrazione: attiva (impostazione predefinita di Supabase)
- Da fare quando l'app avrà un indirizzo web: Authentication › URL Configuration › Site URL e Redirect URLs

## 1. Database
1. Crea un progetto su supabase.com (regione **UE – Francoforte**).
2. SQL Editor › incolla `schema.sql` › Run. Poi `seed.sql` › Run. Si possono rieseguire.
3. Assegna il ruolo di titolare al Dott. Marco Morelli dopo la sua registrazione:
   `update profiles set ruolo='titolare' where email='titolare@cliniamatera.it';`
   `update specialists set user_id=(select id from auth.users where email='titolare@cliniamatera.it') where id='marco-morelli';`

Cosa garantisce lo schema (provato su PostgreSQL 16, 18 casi):
- mai due prenotazioni nello stesso studio o dello stesso specialista nello stesso orario;
- mai due visite sovrapposte per lo stesso specialista;
- ognuno vede solo i propri dati (paziente, specialista, titolare);
- il paziente non può segnarsi pagato né cambiare il prezzo; le visite con carta risultano pagate solo dopo la conferma di Stripe;
- gli studi prenotati e non pagati si liberano dopo 15 minuti;
- aggiornamento in tempo reale di studi, visite, pagamenti e messaggi.

## 2. App
In `index.html` compila `SUPABASE={url:"https://<progetto>.supabase.co",anonKey:"<chiave anon>"}`.
La chiave anon è pubblica; la chiave **service_role non va mai nell'app**.

## 3. Pagamenti (Stripe Connect)
```
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_SPECIALISTA=price_... STRIPE_PRICE_CLINICA=price_... \
  CLINICA_STRIPE_ACCOUNT=acct_... CRON_SECRET=<stringa lunga casuale>
supabase functions deploy pagamenti
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy commissioni-contanti --no-verify-jwt
```
- `pagamenti`: visite (prezzo allo specialista + 7 € all'app), studi (a Clinia), abbonamenti (49,90 € / 300 €), carta salvata, collegamento conto.
- `stripe-webhook`: aggiorna visite, studi, abbonamenti e movimenti quando Stripe conferma.
- `commissioni-contanti`: ogni notte aggiunge 7 € per ogni visita pagata in struttura alla fattura mensile dello specialista.
