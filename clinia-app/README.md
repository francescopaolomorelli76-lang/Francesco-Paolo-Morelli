# Clinia App (prototipo)

App per pazienti e professionisti di **Clinia – Via La Martella 5/D, Matera**.
File unico: `index.html` (HTML + CSS + JavaScript, nessuna dipendenza).

## Accesso
- All'avvio si sceglie: **Paziente** (gratis) o **Specialista** (abbonamento mensile, prezzo di esempio in `SUB`)
- Login o registrazione, poi codice a 4 cifre e/o Face ID a ogni apertura
- Lo specialista attiva l'abbonamento con la carta prima di entrare; può disdirlo o riattivarlo dal Profilo

## Pazienti
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

## Professionisti
- Agenda giornaliera con turni negli studi e visite prenotate
- Prenotazione dei **9 studi (Studio 1–9)** con occupazione in tempo reale, ripetizione settimanale e costo calcolato
- Tariffe: tariffario studi e prezzi delle proprie prestazioni (modificabili)

## Da completare
- Prezzo dell'abbonamento specialisti (`SUB.price`, ora 49 € di esempio) e addebito reale ricorrente
- Tipologia di ciascuno dei 9 studi
- Pagamenti con carta: collegare un circuito certificato (es. Stripe o Nexi); ora sono simulati e si salvano solo le ultime 4 cifre
- Consulenze online: quali specialisti le offrono (ora 4 di esempio in `SERVICES`, quarto valore `1`)
- **Tariffario ufficiale**: sostituire `TARIFFARIO` e i prezzi in `SERVICES` (ora sono di esempio, `ufficiale:false`)
- Numerazione/tipologia studi (`ROOMS`) e orari (`OPEN`) da confermare con la clinica
- Backend condiviso (account, SMS reali, prenotazioni tra più telefoni): ora i dati restano sul dispositivo
- Pubblicazione su App Store / Play Store (wrapper Flutter o Capacitor)
