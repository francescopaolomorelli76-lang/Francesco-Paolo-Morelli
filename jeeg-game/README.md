# JEEG ROBOT D'ACCIAIO — MASTER 1.2 · Livello 1 (HTML5)

Action-platform 2D a scorrimento orizzontale. Il Livello 1, "Il risveglio dei mostri", è giocabile dall'inizio alla fine.

## Il file del gioco ("cartuccia")

`dist/JEEG_LIVELLO1.html` è il gioco completo in **un solo file**. Funziona offline e non ha dipendenze né server.

- **RetroMaxi (la tua sala giochi):** il gioco è già inserito nella sezione **FPM Arcade**. Si può anche caricare a mano: Menu (tasto 4) → *Carica gioco HTML5* → scegli il file.
- **Browser / piattaforma web:** apri il file con doppio clic, oppure caricalo su qualsiasi hosting statico (`dist/index.html` è la stessa build).

> **Nota sulla ROM.** RetroMaxi oggi non contiene emulatori (MAME, NES, ecc.). Per questo il gioco è una cartuccia HTML5 che RetroMaxi esegue direttamente. Un vero file ROM per un hardware specifico (MAME/Neo Geo/NES...) sarebbe un altro gioco, riscritto da zero per quei limiti hardware. Si può fare in seguito, scegliendo una console precisa.

## Comandi

| Azione | Tastiera PC | Dentro RetroMaxi | Joypad standard | Joypad in RetroMaxi |
|---|---|---|---|---|
| Movimento | Frecce / WASD | Frecce | Croce / levetta | Croce / levetta |
| **A** attacco (pugno, pugno, calcio) | Z / J / Ctrl | A | 0 | 1 |
| **B** salto (↓+B scende dalle passerelle) | X / K / Alt / Spazio | S | 1 | 0 |
| **A+B** raggio (solo Jeeg) | Z+X insieme, oppure V | A+S, oppure D | A+B, oppure 4/5 | 1+0, oppure 5 |
| Trasformazione (dopo i guanti) | T / Shift | Q | 2 | 2 |
| Selettore raggio Gamma/Protonico | C | W o 1 | 3 / 8 | 3 / 8 |
| START / pausa | Invio / 1 / 5 / Esc | 2 | 9 | 9 |
| Torna alla sala giochi | — | 4 | — | LB |

Il menu *Configura comandi* rimappa ogni pulsante, comprese le tastiere dei cabinati e gli encoder USB. Su smartphone compaiono i pulsanti touch. Il tasto F attiva lo schermo intero, M accende e spegne la musica.

## Stato: completo e da realizzare

**Completo e giocabile (verificato da test automatici):**
- Hiroshi umano: movimento, salto variabile, combo pugno-pugno-calcio, calcio in aria, gravità, piattaforme solide e passerelle.
- Soldati Haniwa in 2 varianti: spadaccino (pattuglia, carica, fendente) e lanciere (tiene la distanza, lancia giavellotti, che si possono respingere a pugni). Ogni attacco è preceduto da un segnale "!".
- Guanti magnetici a terra (sopra l'auto da corsa). L'icona di trasformazione compare **solo dopo** averli raccolti.
- Trasformazione manuale con il pulsante T: cut-in di Hiroshi con i guanti uniti, poi **forma cyborg intermedia** giocabile (elmo giallo, volto rosso).
- Secondo T, **BUILD UP**: il cyborg diventa la testa di Jeeg. Il Big Shooter di Miwa entra in scena (cut-in di Miwa) e lancia torso, braccia e gambe, che si agganciano uno alla volta. Solo a quel punto Jeeg completo è controllabile.
- Jeeg in scala gigante (la camera si allontana): Haniwa giganti in 2 varianti (corpo a corpo e cannone a parabola) e ricariche di vita ed energia.
- Raggio Gamma (anelli arancioni, 15 EN) e Raggio Protonico (fasci bianchi dalla testa, 35 EN) con A+B, energia limitata e selettore nell'HUD.
- Boss **Haniwa corazzato** in 3 fasi: colpo pesante; cannone dalla bocca; carica, salto e onde d'urto. Ogni attacco ha un segnale leggibile. Dopo la carica il boss resta stordito e subisce danni ×1,6.
- 4 checkpoint (partenza, box del circuito, Jeeg assemblato, prima del boss), 3 vite, game over con "continua".
- Salvataggio locale: checkpoint, guanti, punteggio e livelli sbloccati. *Continua* riprende dall'ultimo checkpoint.
- HUD (vita, energia, forma, guanti, checkpoint, vite, punteggio, fase del boss), menu titolo, selezione dei 20 livelli, pausa, schermata finale con statistiche, sblocco del livello 2.
- Musica ed effetti sonori originali, sintetizzati dal codice (nessun audio della serie).

**Segnaposto / da validare:**
- La grafica è vettoriale cel-shaded, disegnata da codice seguendo palette e silhouette delle foto originali (cartella 03). Non sono sprite PNG ricavati dai fotogrammi. Fase 2: sprite PNG separati con scheda tecnica.
- Testa di Jeeg, Big Shooter e Haniwa giganti sono interpretazioni dai riferimenti 01, 15 e 06: **DA VALIDARE** con te.
- Il boss "Haniwa corazzato" non ha un riferimento originale: è un design provvisorio.

**Da realizzare:**
- Livelli 2–20: compaiono nel menu come "in sviluppo"; i dati sono già in `src/config.js`.
- Altri personaggi (Mimashi, Ikima, Amaso, Himika, Takeru, Flora, Imperatore del Drago, Mechadon), scene col Professor Shiba.
- Una ROM nativa per una console specifica (vedi nota sopra).

## Struttura

```
jeeg-game/
  index.html            versione sviluppo (carica i file in src/)
  src/config.js         dati: 20 livelli, forme, layout del Livello 1
  src/input.js          tastiera, gamepad, touch, profilo RetroMaxi, gestione A+B
  src/audio.js          effetti e musica sintetizzati
  src/sprites.js        personaggi cel-shaded (Hiroshi, cyborg, Jeeg, Haniwa, Big Shooter, Miwa)
  src/background.js     fondali a parallasse
  src/entities.js       giocatore, nemici, proiettili, collisioni
  src/boss.js           Haniwa corazzato (3 fasi)
  src/scenes.js         dialoghi, trasformazione, BUILD UP, intro boss, vittoria
  src/game.js           camera, checkpoint, salvataggi, HUD, menu, ciclo a passo fisso 60 Hz
  tools/build.mjs       genera dist/JEEG_LIVELLO1.html (file unico)
  tests/                test Playwright (partita completa, checkpoint, smoke)
  retromaxi/            copia della sala giochi RetroMaxi con il gioco inserito
```

## Build e test

```
node tools/build.mjs                 # crea dist/JEEG_LIVELLO1.html
node tests/smoke.cjs /tmp            # avvio senza errori
node tests/playthrough.cjs /tmp      # partita completa giocata da un bot, con screenshot
node tests/checkpoint.cjs            # morte → respawn al checkpoint, guanti conservati
```

## Licenze

Jeeg Robot d'Acciaio e i suoi personaggi appartengono ai rispettivi titolari dei diritti. Questo è un fan game per uso privato. Per pubblicarlo o distribuirlo servono le autorizzazioni. Il codice, la grafica disegnata da codice e l'audio sintetizzato sono originali di questo progetto.
