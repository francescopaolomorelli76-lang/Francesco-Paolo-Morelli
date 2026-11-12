# Clinia App · Supabase

© 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.

## Progetto collegato
- Progetto: `iuydwatobtrpzhotcfyd` (regione eu-west-3, Parigi), URL `https://iuydwatobtrpzhotcfyd.supabase.co`
- Schema, dati iniziali, `migrazione-002-clinia-fpm.sql` e `migrazione-003-accrediti-tempo-reale.sql`, `migrazione-004-arca-fpm.sql`, `migrazione-005-netti-fpm.sql`, `migrazione-006-pagamenti-fpm.sql` (voce "Pagato" della licenza: automatico, bonifico o contanti con ricevuta), `migrazione-007-studi-ufficiali.sql` (6 studi e tariffario mensile di Clinia Srl), `migrazione-008-tariffe-ore-percentuali.sql` (40 € l’ora, pacchetti prepagati, percentuali ecografo e Tecar), `migrazione-009-richieste-notifiche.sql` (richiesta di visita confermata dallo specialista e notifiche), `migrazione-010-agenda-specialista.sql` (appuntamenti inseriti dallo specialista solo dentro i suoi turni negli studi), `migrazione-011-servizio-agenda.sql` (servizio di 9 € anche sugli appuntamenti in Agenda, addebitato sulla carta dello specialista), `migrazione-012-titolare-non-specialista.sql` (il Dott. Marco Morelli non compare tra gli specialisti), `migrazione-013-cessione-canone.sql` (cessione del software a Clinia al saldo, canone tecnologico 9 € per ora di studio a carico di Clinia, niente servizio a pazienti e specialisti) installati il 10/11/2026; chiave anon pubblica già nell'app (`SUPABASE` in `index.html`)
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
- `pagamenti`: visite (prezzo + servizio 9 €), stanze, abbonamento 50 € (crea in Stripe il prezzo ricorrente da 50 €), carte salvate (specialista e Clinia), collegamento dei conti per gli accrediti.
- `stripe-webhook`: appena un pagamento riesce divide subito: visita allo specialista, servizio a FPM (meno 3 % Progetto Arca e ritenuta), abbonamento a FPM, stanze a Clinia.
- `commissioni-contanti` (cron ogni notte): addebita il servizio delle visite pagate in struttura e accredita FPM.
- `licenza-fpm` (cron `0 6 1 * *`): per 12 mesi addebita a Clinia 300 € e li accredita netti a FPM.
- Ogni accredito a FPM è in `fpm_transfers` (tempo reale). Il 3 % per Progetto Arca non viene trattenuto: è in `donazioni`, FPM lo bonifica e lo segna; tutti gli utenti vedono la storia con `arca_storia()`.

## Importi netti per FPM
Servizio 9 €, abbonamento 50 €, licenza 300 € (12 mesi) arrivano a FPM per intero. La ritenuta d'acconto (lordo = netto / 0,85) è a carico di Clinia e si versa con F24: la funzione registra lordo, ritenuta e netto in `fpm_transfers`.

## Funzione `visita-esito` (migrazione 009)
Lo specialista conferma, rifiuta o segna effettuata una visita. Con la carta il pagamento della visita è solo **autorizzato** alla richiesta (`capture_method: manual`) e viene **addebitato alla conferma**; se lo specialista rifiuta, l'autorizzazione è annullata. Nel webhook Stripe aggiungere l'evento `payment_intent.amount_capturable_updated`. L'autorizzazione di una carta dura 7 giorni: le richieste vanno confermate entro quel tempo.
