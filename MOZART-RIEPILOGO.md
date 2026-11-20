# Mozart leggio — riepilogo per continuare il lavoro

Aggiornato al 20 novembre 2026. Ramo di lavoro: `claude/fervent-sagan-xuja93`.

## Cos'è
**Mozart** è un leggio digitale per iPad e iPhone con marchio **FPM** (FPM web designer), nei colori nero e oro. All'inizio si chiamava "FPM Leggio". La copertina fornita dall'utente è usata come icona, schermata d'avvio e filigrana.

## Dove si trova
- **Codice web**: `leggio/src/*.js`, `style.css` e `body.html`.
- **Compilazione**: `leggio/build.py`.
  - `python3 leggio/build.py`: crea `leggio/index.html` (web-app installabile, librerie da cdnjs).
  - `--artifact FILE`: crea l'anteprima per claude.ai.
  - `--ios mozart-ios/Web`: crea la versione offline per l'app, con le librerie prese da `leggio/vendor` e copiate in `lib/`.
  - L'ordine dei file JS è in `JS_ORDER`: store, icons, glyphs, app, anno, insert, audio, forscore, features, singers, lyrics, pron, uizoom, textbox, fix, finger, stable, extras, piano, clock, native.
- **App iOS nativa**: `mozart-ios/`.
  - Progetto XcodeGen `project.yml`, bundle `com.morelli.mozart`, iOS 15.
  - Usa WKWebView con lo schema `mozart://localhost`.
  - `MidiBridge` gestisce CoreMIDI e il MIDI Bluetooth.
  - Il ponte JS si chiama `mozart` e accetta: fileBegin, fileChunk, fileShare, ocr (Vision), keepAwake, midiBluetooth.
- **Sito pubblicato**: ramo `gh-pages`, cartella `mozart/` (index.html, manifest, icone, copertina, `piano/` con i campioni).
  - Indirizzo: https://francescopaolomorelli76-lang.github.io/Francesco-Paolo-Morelli/mozart/
  - Per aggiornarlo: copia `leggio/index.html` in `mozart/index.html` su gh-pages, poi commit e push.
- **Anteprima claude.ai**: https://claude.ai/artifact/EN8p71SqC12hW9CvGHBJfC

## Librerie
- pdf.js 3.11.174, pdf-lib 1.17.1, sql.js 1.8.0, pako 2.1.0.
- Tesseract.js 5.1.1, per l'OCR nel browser.
- Font: Bodoni Moda, Manrope, Noto Music.
- Pianoforte campionato: 29 mp3 in `leggio/vendor/piano`, licenza CC-BY 3.0 (vedi `CREDITI.txt`).

## Archivio dati
- Database IndexedDB `fpm-leggio`.
- Spartiti in `scores`; i PDF in `pdf:<id>`; le annotazioni in `ann:<id>`.
- Altri dati: presets, settings, setlist, vocalizzi.

## Funzioni già fatte
- **Libreria e lettura**:
  - pressione lunga sui bordi per mostrare barre e pannelli; barre semitrasparenti effetto vetro;
  - schermo intero, zoom a due dita, pulsanti zoom e spostamento (ZoomPad), effetto voltapagina, luminosità.
- **Inserimento pagine**: da un altro PDF, da foto o scansione (ritaglio e miglioramento), da modelli.
- **Annotazioni**:
  - penne; un evidenziatore fluo (con arcobaleno e colori neon nelle impostazioni); correttore;
  - forme; legature e forcelle allungabili trascinandole;
  - tutti i segni musicali, emoticon, GIF (da file o ricerca GIPHY);
  - casella di testo libera, lazo, righello, livelli, annulla/ripeti sempre visibili.
  - Comportamento della barra (come forScore): primo tocco = attiva lo strumento, secondo tocco = impostazioni.
  - Il dito scrive; viene ignorato solo mentre scrive la Apple Pencil (per il palmo).
- **Strumento Dito**:
  - sposta righe e segni con il trascinamento o le frecce;
  - modifica le sillabe; cambia carattere, colore (6), grassetto/corsivo e grandezza;
  - ⏮ ⏭ di nota in nota, "＋ Parola mancante", copia sui righi, evidenzia, traslittera.
- **Testo sulle note e copia testo**:
  - riconosce i pentagrammi e le note;
  - legge il testo stampato con l'OCR;
  - fascia blu = riga con il testo stampato; fascia grigia = riga senza testo, dove copiarlo;
  - copia in omoritmia sui righi mancanti.
  - Il testo copiato ha una grandezza contenuta. Se il tocco non cade vicino a una nota riconosciuta, la sillaba va dove si tocca.
- **Pronuncia e traslitterazione all'italiana**: regole per tedesco, francese, latino, spagnolo e inglese, con riconoscimento della lingua.
- **Migliora**:
  - raddrizza, taglia i bordi, pulisce;
  - confronto prima/dopo con bordi trascinabili;
  - per pagina o per l'intero spartito; "Usa in lettura" oppure "Correggi per sempre".
- **Per Cantanti**: vocalizzi trasponibili, composizione dalla tastiera, registrazione.
- **Pianoforte**: suono reale campionato, tastiere MIDI e Bluetooth, tastiera del computer.
- **Import**:
  - backup forScore `.4sb` (formato `<--4SBV02-->`, dati gzip);
  - finestra per i doppioni: Sostituisci / Tieni entrambi / Salta.
- **Condivisione**: PDF annotato (AirDrop e WhatsApp tramite il pannello Condividi).
- **Orologio e timer** (`clock.js`):
  - ora sempre visibile in alto;
  - timer Lavoro 50 min e Pausa 10 min, modificabili, con avviso sonoro a fine tempo.

## Compilare l'app iOS (IPA)
- **GitHub Actions**: `.github/workflows/mozart-ios.yml`, con `runs-on: macos-26`.
  - Parte a ogni push su `leggio/**` o `mozart-ios/**` e crea un IPA non firmato.
  - Ultima build riuscita: run 44512350233 (19/11/2026), artefatto "Mozart-iPad-iPhone-ipa".
- **Installazione**: con Sideloadly dal MacBook Air (macOS 12), sull'iPad dell'utente.
- **Codemagic**: `codemagic.yaml`, workflow `mozart-unsigned` e `mozart-testflight` (integrazione "Mozart ASC").
  - La build su Codemagic restava in coda.
  - La chiave API salvata viene rifiutata (errore 401): serve una nuova chiave da Teams → Integrations → Codemagic API.

## Da fare / da verificare
- Provare sull'iPad la lettura del testo a pagina 7 di `appendice_barbiere.pdf` (sillabe piccole con trattini e linee).
- Se serve TestFlight: nuova chiave Codemagic.

## Regole di lavoro
- Rispondere sempre in italiano.
- Fare commit e push solo su `claude/fervent-sagan-xuja93` e su `gh-pages`.
- Nessun nome di modello nei commit.
- Per i test: script Playwright nella scratchpad, che servono le librerie cdnjs dalle copie locali di `node_modules`.
