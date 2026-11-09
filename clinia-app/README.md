# Clinia App (prototipo)

App per pazienti e professionisti di **Clinia – Via La Martella 5/D, Matera**.
File unico: `index.html` (HTML + CSS + JavaScript, nessuna dipendenza).

## Pazienti
- Avvio con logo, consenso cookie, home "Ciao." con ricerca, specialità e specialisti
- Profilo specialista con prestazioni, prezzi, studio in cui riceve ed esperienza
- Prenotazione: prestazione → giorno → orario → motivo → conferma
- Accesso: login/registrazione, PIN a 4 cifre, Face ID, verifica telefono con codice SMS, consenso dati sanitari, notifiche
- Visite (prossime/passate, disdetta), I miei file, Messaggi (specialisti e reception), Profilo

## Professionisti
- Agenda giornaliera con turni negli studi e visite prenotate
- Prenotazione degli **6 studi** con occupazione in tempo reale, ripetizione settimanale e costo calcolato
- Tariffe: tariffario studi e prezzi delle proprie prestazioni (modificabili)

## Da completare
- **Tariffario ufficiale**: sostituire `TARIFFARIO` e i prezzi in `SERVICES` (ora sono di esempio, `ufficiale:false`)
- Numerazione/tipologia studi (`ROOMS`) e orari (`OPEN`) da confermare con la clinica
- Backend condiviso (account, SMS reali, prenotazioni tra più telefoni): ora i dati restano sul dispositivo
- Pubblicazione su App Store / Play Store (wrapper Flutter o Capacitor)
