# Clinia App · Supabase

© 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.

## Progetto collegato
- Progetto: `iuydwatobtrpzhotcfyd` (regione eu-west-3, Parigi), URL `https://iuydwatobtrpzhotcfyd.supabase.co`
- Schema, dati iniziali, `migrazione-002-clinia-fpm.sql` e `migrazione-003-accrediti-tempo-reale.sql` installati il 10/11/2026; chiave anon pubblica già nell'app (`SUPABASE` in `index.html`)
- Conferma dell'e-mail alla registrazione: attiva (impostazione predefinita di Supabase)
- Da fare quando l'app avrà un indirizzo web: Authentication › URL Configuration › Site URL e Redirect URLs

## Ruoli
- `paziente`, `specialista`: dalla registrazione
- `titolare` (direzione Clinia): `update profiles set ruolo='titolare' where email='…';`
- `admin` (area FPM, solo totali, mai dati dei pazienti): `update profiles set ruolo='admin' where email='fpm@fpmwebdesigntech.it';`

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

## 3. Pagamenti in tempo reale (Stripe di Clinia + Connect)
```
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_SPECIALISTA=price_... FPM_STRIPE_ACCOUNT=acct_... CRON_SECRET=<stringa lunga casuale>
supabase functions deploy pagamenti
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy commissioni-contanti --no-verify-jwt
supabase functions deploy licenza-fpm --no-verify-jwt
```
- `pagamenti`: visite (prezzo + servizio 7/9 €), stanze, abbonamento 49,90 €, carte salvate (specialista e Clinia), collegamento dei conti per gli accrediti.
- `stripe-webhook`: appena un pagamento riesce divide subito: visita allo specialista, servizio a FPM (meno 3 % Progetto Arca e ritenuta), abbonamento a FPM, stanze a Clinia.
- `commissioni-contanti` (cron ogni notte): addebita il servizio delle visite pagate in struttura e accredita FPM.
- `licenza-fpm` (cron `0 6 1 * *`): per 12 mesi addebita a Clinia 300 € e li accredita netti a FPM.
- Ogni accredito a FPM è in `fpm_transfers` (tempo reale); le donazioni da fare in `donazioni`.
