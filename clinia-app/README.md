# Clinia App (prototipo)

© 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.

App per pazienti e professionisti di **Clinia – Via La Martella 5/D, Matera**.
File unico: `index.html` (HTML + CSS + JavaScript, nessuna dipendenza).

## Accesso
- All'avvio si sceglie: **Paziente** (gratis) o **Specialista** (abbonamento mensile, prezzo di esempio in `SUB`)
- Login o registrazione veloce con **Google** o **Apple** (o e-mail e password), poi codice a 4 cifre e/o Face ID a ogni apertura
- Verifica del telefono con codice a 4 cifre via **WhatsApp** o **SMS** (scade dopo 10 minuti, nuovo invio dopo 30 secondi)
- Lo specialista attiva l'abbonamento con la carta prima di entrare; può disdirlo o riattivarlo dal Profilo

## Modello economico (accrediti in tempo reale)
- Visita con carta: prezzo subito allo specialista; servizio 7 € (o 9 €) a FPM al netto della ritenuta; FPM bonifica ogni mese il 3 % a Progetto Arca
- Pagina **Progetto Arca** (storia e donazioni mese per mese) visibile a pazienti, specialisti, Clinia e FPM
- Abbonamenti 49,90 € a FPM al netto della ritenuta; affitti delle stanze a Clinia
- Primi 12 mesi: 300 € NETTI al mese a FPM con addebito automatico a Clinia il giorno 1 (Clinia versa la ritenuta con F24)
- Specialisti e FPM inseriscono l'IBAN per gli accrediti; area FPM Tech con movimenti, iniziali dei pazienti e specialisti abbonati

## Accessi
- Paziente, Specialista, **Direzione Clinia** (riservato), **Area FPM** (riservato: `fpm@fpmwebdesigntech.it`, password consegnata a parte)

## Titolare (Dott. Marco Morelli)
- Profilo gratuito; sezione **Clinia**: rendiconto (entrate, uscite, saldo), compensi da girare agli specialisti, stanze (nomi, tariffe, foto, vista 3D), spese con ricevuta
- Accesso riservato: login con e-mail `titolare@cliniamatera.it` e password consegnata a parte (nel codice c'è solo l'impronta SHA-256)
- Studi prenotati senza pagamento; incassa affitti degli studi e visite dei suoi pazienti
- Scheda **Clinia**: incassi degli studi, rimborsi da fare, occupazione dei 9 studi

## Pazienti
- Con carta: visita + 7 € di servizio; in struttura: solo la visita (i 7 € li paga lo specialista)
- Foto reali dei 10 specialisti (dal sito Clinia)
- Avvio con logo, consenso cookie, home "Ciao." con ricerca, specialità e specialisti
- Ricerca In studio / Online con suggerimenti, risultati con orari prenotabili subito, mappa della sede
- Filtri: date disponibili, modalità, prestazioni, area, visita i bambini, genere
- Profilo specialista con prestazioni, prezzi, studio in cui riceve ed esperienza
- Prenotazione: prestazione → giorno → orario → motivo → conferma
- Accesso: login/registrazione, PIN a 4 cifre, Face ID, verifica telefono con codice SMS, consenso dati sanitari, notifiche
- Consenso alle statistiche anonime (facoltativo)
- Profilo con foto, informazioni sanitarie, familiari, pagamenti (carte e storico), richieste, preferiti; impostazioni sotto l'ingranaggio
- Visite e file per te o per un familiare (selettore persona); prenotazione con scelta di chi è la visita e del pagamento
- Visite (prossime/passate/cancellate, disdetta), I miei file, Messaggi (specialisti e reception), Profilo

## Specialisti
- Abbonamento 49,90 €/mese → paga gli studi a Clinia → riceve i pagamenti dei pazienti
- Profilo professionale: foto (scatto, caricamento o trascinamento), CV in PDF trascinabile, contatti, PEC, P.IVA, codice fiscale, SDI, social; campi compilati in automatico
- Sezione **Ricavi**: incassi con carta e in struttura, 7 € a carico per le visite in struttura, studi, abbonamento, netto
- Lo studio si paga subito a Clinia con la carta (anche più settimane insieme); annullando un turno pagato si segna il rimborso
- Scheda **Pazienti**: totale delle visite, incassato e da incassare; pagato con carta nell'app = pagato in automatico, pagato in struttura = "Segna pagato"

## Professionisti
- Agenda giornaliera con turni negli studi e visite prenotate
- Prenotazione dei **9 studi (Studio 1–9)** con occupazione in tempo reale, ripetizione settimanale e costo calcolato
- Tariffe: tariffario studi e prezzi delle proprie prestazioni (modificabili)

## Area FPM
- Compenso del mese con ritenuta d'acconto, ricevuta per diritti d'autore precompilata, controlli, documenti PDF, riepilogo fiscale annuale

## Database e pagamenti
- `supabase/`: schema, dati iniziali, funzioni Stripe (vedi `supabase/README.md`)
- `piano-economico.html`: pagamenti consigliati, cosa serve, fatture, stima dei guadagni

## Da completare
- Accesso del titolare e pagamenti: verifica sul server e incasso reale (abbonamenti al gestore dell'app, studi a Clinia)
- Accesso reale con Google (Google Identity) e Apple (Sign in with Apple, obbligatorio su iPhone se c'è Google)
- Invio reale del codice: WhatsApp Business Platform (Meta) con modello di autenticazione approvato, e un fornitore SMS di riserva
- Prezzo dell'abbonamento specialisti (`SUB.price`, ora 49 € di esempio) e addebito reale ricorrente
- Tipologia di ciascuno dei 9 studi
- Pagamenti con carta: collegare un circuito certificato (es. Stripe o Nexi); ora sono simulati e si salvano solo le ultime 4 cifre
- Consulenze online: quali specialisti le offrono (ora 4 di esempio in `SERVICES`, quarto valore `1`)
- **Tariffario ufficiale**: sostituire `TARIFFARIO` e i prezzi in `SERVICES` (ora sono di esempio, `ufficiale:false`)
- Numerazione/tipologia studi (`ROOMS`) e orari (`OPEN`) da confermare con la clinica
- Backend condiviso (account, SMS reali, prenotazioni tra più telefoni): ora i dati restano sul dispositivo
- Pubblicazione su App Store / Play Store (wrapper Flutter o Capacitor)
