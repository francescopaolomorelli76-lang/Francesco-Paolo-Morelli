# Mozart

App di FPM web designer.

Leggio digitale per iPad (web-app installabile): spartiti PDF, annotazioni, segni musicali, scansione da foto e inserimento pagine. Grafica nero e oro FPM.

## Come si apre sull'iPad
Pubblica la cartella `leggio/` (per esempio con GitHub Pages), apri `index.html` in Safari e scegli **Condividi → Aggiungi alla schermata Home**. Si apre a tutto schermo come un'app. Gli spartiti restano sull'iPad.

## Funzioni
- **Bordi dello schermo**: tieni premuto sul bordo alto (barra comandi), basso (pagine), sinistro (libreria), destro (attrezzi).
- **Libreria**: tutti, recenti, compositori, generi, setlist, etichette; ricerca, selezione multipla, unione di PDF.
- **Lettore**: tocchi ai lati o pedaliera Bluetooth per girare pagina, segnalibri, ritaglio margini, modalità notte.
- **Inserisci pagine** (pulsante d'oro, sempre visibile): da altro PDF (anche solo alcune pagine), da foto, pentagrammata o pagina bianca, prima/dopo la pagina corrente, all'inizio o alla fine. Le annotazioni seguono la loro pagina.
- **Scansione**: rileva il foglio, angoli trascinabili con lente, raddrizzamento prospettico, miglioramento per partiture (toglie ombre, B/N adattivo, nitidezza, intensità dei segni, contrasto).
- **Annota**: penne, evidenziatori, bianchetto, forme (forcelle, legature, parentesi, volte, vi-de), testo, righello, lazo, gomma, livelli, annulla/ripeti, stile pennello (dimensione, colore, tonalità, saturazione, luminosità, trasparenza).
- **Segni musicali**: oltre 300 segni in 15 categorie (alterazioni, dinamiche, articolazioni, abbellimenti, note, pause, chiavi e tempi, ripetizioni, termini, coro e voce, strumenti e pedale, diteggiature, notazione antica, simboli) più tutto il blocco Unicode dei simboli musicali.
- **Metronomo / Tonalità / Accordatore**, pianoforte, registratore, cruscotto, backup, riordina pagine, esportazione PDF annotato.

## Sviluppo
I sorgenti sono in `src/`. Dopo una modifica: `python3 leggio/build.py` rigenera `index.html`.
