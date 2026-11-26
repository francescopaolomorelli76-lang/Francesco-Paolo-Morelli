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
  - L'ordine dei file JS è in `JS_ORDER`: store, icons, glyphs, app, anno, insert, audio, forscore, features, singers, lyrics, pron, uizoom, textbox, fix, finger, stable, extras, piano, clock, words, shapes, compose, tune, dups, info, native.
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

## Novità del 20 novembre 2026 (`words.js` e correzioni)
- **Stabilità**: la tela di disegno resta sotto i 9 milioni di pixel anche con lo zoom (prima iOS la bloccava: non si scriveva più e l'app si riavviava). Un dito alzato sopra una barra non blocca più la scrittura. Annulla/Ripeti non copia più 60 volte le immagini (GIF, foto).
- **Salvataggio automatico**: ogni minuto mentre si annota e quando l'app va in secondo piano o si chiude.
- **Stile del testo ricordato per spartito** (`TStyle`, in `sc.style`): carattere, colore, grandezza di sillabe (`lyric`), testo libero (`text`), pronuncia (`pron`), traduzione (`tr`), e grandezza dei segni (`stampK`). La grandezza delle sillabe viene dal rigo ed è limitata: niente più testo enorme.
- **Barra del Dito**: mostra sempre carattere e grandezza (es. "Sans grassetto · 14 pt"), nomi dei caratteri (Sans, Serif, Corsivo), 8 colori, A− grandezza A+, Evidenzia, Traslittera, **Traduci**.
- **Parola mancante**: con il Dito si tocca lo spazio vuoto nella riga del testo → si apre la casella sotto la nota più vicina. Riconoscimento delle note più tollerante (modalità "larga" di `detectNotes`).
- **Dito sotto un rigo stampato** (senza annotazioni): si apre la fascia blu per Evidenzia, Traslittera, Traduci.
- **Fascia blu**: frecce su/giù e pulsanti + / − per allargarla e stringerla; Aa per lo stile del testo copiato.
- **Lettura OCR**: tiene la riga di testo con più parole (prima la più alta: un segno sopra faceva perdere la riga) e rilegge ingranditi i pezzi d'inchiostro rimasti senza parola. Vision restituisce anche l'altezza `h`.
- **Traduzione in italiano** (`Translate`): riconosce la lingua, frase intera o singola parola, scritta in rosso corsivo sotto (o sopra) il rigo. Usa internet (Google, poi MyMemory); senza rete un piccolo dizionario latino liturgico.
- **Lazo su testo**: Modifica (apre la barra del Dito), Traduci, Copia sui righi, Evidenzia.
- **Casella T**: menu con Sposta, Evidenzia, Traslittera, Traduci; carattere e grandezza scritti.
- **Evidenziatore**: uno solo nella barra; secondo tocco = pannello con colori fluo, arcobaleno, spessore e trasparenza. Evidenzia automatico con spessore (Sottile, Normale, Largo, Molto largo).
- **Barra strumenti su una riga**; strumento attivo in vetro dorato luminoso; numero di pagina sempre visibile in basso mentre si annota.
- **Orologio con data**; in lettura è al centro in alto e si nasconde quando c'è la barra superiore (non copre più gli Attrezzi).
- **GIF animate**: il livello non viene più ricreato a ogni tocco, quindi le GIF si muovono.
- **Legenda dei colori** nella copia del testo: blu = rigo con il testo, verde = dove copi, grigio = senza testo, riquadro arancio = sillabe selezionate.

## Novità del 21 novembre 2026 (`shapes.js`, suonerie in `clock.js`)
- **App più leggera**: copertina e sigillo non sono più incorporati 7 volte nella pagina ma sono file (`cover.webp`, `fpm_seal.webp`, copiati da `build.py` nell'app e accanto a `leggio/index.html`). La pagina dell'app è passata da 1,75 MB a circa 0,45 MB. Solo l'anteprima di claude.ai li incorpora.
- **Più veloce**: mentre si disegna, le annotazioni già fatte sono un'unica immagine e si ridisegna una volta per fotogramma; il riconoscimento dei righi si fa una volta per pagina (cache di `detectStaves` e `pageGray`).
- **Maniglie d'oro** (`Handles`), per dito e Apple Pencil:
  - legature, forcelle e linee: i due estremi; legature e legature di valore anche la **curva** (maniglia blu al centro, campo `bend`);
  - segni, emoji e GIF: maniglia per ingrandire o rimpicciolire;
  - evidenziatore e penna: maniglie a sinistra e a destra per allungare o accorciare;
  - appena inserito un segno o una forma compaiono maniglie e barretta con −, +, elimina, fatto.
- **Lazo**: prende anche il testo scritto con la T (misura vera del testo con `textBox`).
- **Dito su una riga di sillabe**: due maniglie blu per prendere solo una parte della riga.
- **Fascia blu**: maniglie laterali per leggere, evidenziare, traslitterare o tradurre solo una parte della riga.
- **Evidenziatura automatica** precisa: parte dalla prima lettera e finisce all'ultima.
- **Emoji**: pulsante 😀 nel pannello dei segni → qualsiasi emoji di Apple dalla tastiera, emoji recenti, **Memoji e adesivi** (incollati dalla tastiera emoji), immagini dalle Foto.
- **Sveglia del timer**: 10 suonerie (Accordo di pianoforte, Sveglia classica, Campanello, Carillon, Arpa, Marimba, Campane, Gong, Digitale, Uccellini) o un mp3 caricato (salvato in `alarmFile`); suona finché non si tocca lo schermo, al massimo un minuto.
- Mentre si annota, i bordi non aprono più i pannelli e l'app non scorre più di lato quando si mette a fuoco una casella.

## Novità del 22 novembre 2026 (`tune.js`, `info.js`)
- **Dimensione del testo ricordata**: `TStyle` ha una sola "ultima dimensione" per spartito (`sc.style.last`), usata da sillabe, traslitterazione, traduzione e testo T; partenza 16,7 pt (`TStyle.START=.0152`). Ogni cambio (A−/A+, Aa) la aggiorna.
- **Pannello dei segni**: simboli più piccoli (3 densità, pulsante ▦), maniglia ◢ per allargare e allungare (misura salvata in `settings.spW/spH`, doppio tocco = automatica), scorrimento corretto (il cambio categoria con lo swipe ora richiede un gesto orizzontale deciso).
- **Torna indietro sulle pagine** (`PdfUndo`): `replaceBytes` salva una copia (`bak:<id>`) prima di ogni modifica alle pagine (Migliora "per sempre", Inserisci, Crea, sostituzione); compare per 9 s la barretta "↩ Annulla" e restano i pulsanti in Migliora e in Inserisci pagine. L'annullamento è reversibile (scambia le due versioni).
- **Informazioni dello spartito** (`info.js`): compositore con suggerimenti mentre scrivi (e completamento), scheda con volto disegnato (SVG offline) o foto da Wikipedia se c'è internet, cenni biografici e opere principali (≈65 compositori); "Compositori famosi" = griglia dei volti. Riconoscimento del brano dal titolo (≈100 opere, arie e brani, con compositore, genere, tonalità quando certa e **trama** delle opere italiane); compila da solo i campi vuoti anche all'importazione (`K.autofill`). Trama salvata in `sc.about`.
- **Tastiera MIDI/Bluetooth**: pannello a 3 passi (accendi, abbina, prova) con stato "collegata/non collegata" e nome della tastiera, prova "Ricevuto: Do4 ✓"; pallino verde/rosso sui pulsanti. Lato nativo: comando `midiStatus` e `MozartMIDIDevices(...)` in `MidiBridge.swift` (non compilabile qui: verificare con la build su GitHub).

## Import forScore, doppioni, riconoscimento (23 novembre 2026, `dups.js`, `info.js`)
- **Import forScore guidato**: i dati del backup (titoli, compositori, etichette, setlist, elenco dei file) restano salvati in `fs4meta`. La schermata mostra una barra "N di M PDF già nella libreria", il pulsante **Importa i PDF mancanti…** (selezione multipla da File: salta quelli già presenti e applica titoli, compositori, etichette, setlist, testi e disegni) e l'elenco dei mancanti in una lista a scomparsa. Nome file tollerante: "Carmen (1).pdf" = "Carmen.pdf". Anche dal menu libreria: "Completa l'import di forScore".
- **Doppioni** (`Dups`): trova copie dello stesso spartito (stesso nome file, stesso titolo e pagine, stessa dimensione e pagine); per ogni gruppo resta la copia con più annotazioni/setlist (modificabile); toglie le altre unendo annotazioni mancanti, setlist, etichette e dati. Menu libreria → "Trova spartiti doppi"; barretta "N spartiti doppi · Vedi/Togli" dopo ogni importazione (anche da backup JSON); nel resoconto dell'import forScore compare "Rimuovi i doppioni".
- **Riconoscimento brano**: titolo ufficiale automatico (solo se il titolo scritto è una variante pulita; l'originale resta in `sc.title0`), compositore, genere; **tonalità** automatica per sinfonie e concerti con numero ("Sinfonia n 5" + Beethoven → do minore; anche "Beethoven sinf 9", "quinta sinfonia"), brani con tonalità certa e trama delle opere. Aggiunte ~45 opere e arie del repertorio (Carmen, Manon, Il corsaro, Ernani, Vespri, Puritani, Capuleti, Flauto magico, Clemenza di Tito, Fanciulla del West, Tosti, Lieder…) e 3 compositori (Massenet, Prokofiev, Parker). Titoli ambigui (Ave Maria, Requiem) non si compilano da soli senza il compositore.
- **Volti dei compositori**: tra le Emoticon del pannello dei segni (68 volti, si ridimensionano con le maniglie e finiscono nei PDF condivisi); icona accanto al compositore nell'elenco degli spartiti e nella barra del titolo (`K.badge`, `K.find`).

## Crea: compositore di spartiti semplificato (`compose.js`)
Rifatto il 22 novembre guardando la guida di Sibelius 5 (nuova partitura in 5 passi, inserimento col mouse, inserimento alfabetico, pause che completano le misure).
- **Dove si apre**: Inserisci pagine → "Crea: scrivi le note" (con uno spartito aperto, anche "Modifica lo spartito creato"); libreria → Importa → "Crea"; menu ⋯ della libreria; Modelli.
- **Procedura guidata a 4 passi** (Avanti / Indietro / Fine): 1 Strumenti (modelli: pianoforte, voce e pianoforte, coro SATB, SATB e pianoforte, quartetto d'archi, chitarra, un rigo; oppure strumenti a scelta), 2 Tempo (tempo in chiave, C, misura d'attacco/anacrusi, andamento e metronomo), 3 Tonalità, 4 Titolo/compositore (suggerimenti dall'elenco di `info.js`).
- **Scrivere**: 1 scegli il valore (resta scelto), 2 tocca il rigo (ghost blu; Pencil: tieni premuto e trascina per l'altezza) **oppure** premi Do Re Mi Fa Sol La Si (inserimento alfabetico: ottava più vicina alla nota precedente), ♭ ♮ ♯ valgono per la nota dopo, Pausa scrive una pausa, ⌒ Lega, ◀ ▶ cursore, + Battute (le battute si aggiungono anche da sole).
- **Pause automatiche**: ogni battuta si completa con le pause (battuta vuota = pausa di battuta). Un tocco dopo la fine inserisce le pause che mancano; un tocco su una pausa la sostituisce.
- **Modificare**: tocca una nota (arancio): trascinala su/giù, barretta (Elimina, ▲ ▼, ♯⇄♭, Gambo, In pausa); un valore o una lettera premuti con la nota selezionata la cambiano.
- **Altro** (pannello): note sopra (2ª…8ª), dinamiche, terzina, gambi in giù (voce 2), tastiera pianoforte, impostazioni (stessa procedura guidata), aiuto.
- **Resa**: righi, chiavi, armatura, tempo (anche C), anacrusi, travi automatiche, legature, graffa, nomi degli strumenti, andamento e metronomo, più pagine A4; ascolto con il pianoforte campionato; "Fine" crea il PDF (PNG a 3×) come nuovo spartito, inserito nello spartito aperto o aggiornamento (`sc.compose` per riaprirlo).
- **Note con stanghetta in basso** (`glyphs.js`): nel pannello dei segni, categoria Note, minima…biscroma e punteggiate "↓" (vettori, `noteDn`); il pulsante ⇅ delle maniglie gira un segno in su/in giù (`noteFlip`).

## Pronuncia e traduzione dei versi stampati (22 novembre 2026, `lyr.js`)
- Pulsante libro nella barra annotazioni e riga "Pronuncia e traduzione" in Attrezzi: legge il testo sotto OGNI rigo (coro SATB), un rigo per voce.
- Parole ricostruite: `di - vi - ne` = una parola; spazio senza trattino = parola nuova; trattino a fine rigo continua sul rigo/sistema dopo e sulla pagina dopo (`ST.cur.lyrCarry`). Trattini non letti dall'OCR vengono cercati sull'immagine (`Lyr.dashBetween`).
- Lingua: da testo/compositore/titolo (Fauré -> francese), ricordata per spartito. Anteprima modificabile per ogni voce (si corregge a mano la lettura).
- Francese: pronuncia calcolata sulla parola intera e divisa sulle sillabe stampate (`frPronSyl`): a-mo-ur = a·mu·ur, com-bat-tant = kõ·ba·tã, e muta cantata da sola = ö.
- Scrive pronuncia in blu sotto i versi e traduzione rossa in corsivo (una per voce, o tutte); senza internet usa dizionario offline (`FR_LINES`, Cantique de Jean Racine incluso).
- `readLyrics` ora restituisce anche estremi (`a`,`b`) e `meta` per cercare i trattini.

## Scansiona, scanner a 8 maniglie, tavolozza completa, import dal web (24 novembre 2026)
- `scanlive.js` (Scansiona): nell'app apre lo scanner di iPhone/iPad (VisionKit, comando Swift `scanDocs`); nel browser fotocamera dal vivo con bordi rilevati, scatto automatico, più pagine; in alternativa foto singola/libreria/web. Tutte le entrate "Scansiona/Scatta" aprono questa sezione.
- `scan2.js`: cornice con 4 angoli + 4 maniglie sui lati (area interna colorata), Annulla/Ripeti, 5 toni della pagina, punto nero e bianco. `enhance()` ha `lo`,`hi`,`expo`.
- `fix.js` (Migliora pagina, Prima/Dopo): Annulla/Ripeti su bordi e impostazioni, toni e livelli; i bordi restano modificabili riaprendo.
- `palette.js`: "Tavolozza completa" (117 sfumature + colore libero) aggiunta da sola ai pannelli colore (pennello, evidenziatore, forme, segni, testo).
- Giallo fluo `#f7ff00` primo tra gli evidenziatori (migrazione `fluoY` per chi aveva il giallo vecchio).
- `webimp.js` (Importa dal web): link a PDF/foto/pagina con PDF; nell'app il download passa da Swift (`download`), nel browser dipende dal sito (CORS). Link Drive e Dropbox convertiti.
- Swift: `WebViewController.swift` ha `import VisionKit`, casi `scanDocs` e `download`: da compilare con la build su GitHub (non compilabile qui).

## Ritocchi del 24 novembre 2026 (sera)
- Lazo su testo: nuovo pulsante "Traslittera" (lingua scelta/riconosciuta, francese sillaba per sillaba).
- Pianoforte a schermo: scheda "Pianoforte" in Per Cantanti; avviso che funziona senza MIDI/Bluetooth.
- Info: sinfonie e concerti (K_SYMN, K_CONN, K_VLNN in `info.js`) mostrano anno e breve scheda oltre alla tonalità.
- Apertura: dedica a Francesco De Candia sotto il logo (splash 2,8 s).
- Uscendo da Annota lo zoom torna a pagina intera (`tweaks.js`).
- Tempo ed espressione: le parole si inseriscono come testo (modificabile con Dito ✋ e lazo).

## Velocità e bordi (24 novembre 2026, sera)
- Migliora pagina: meno memoria (`enhance` senza copie inutili, risoluzione 1500 px per la lettura e 1700 per "per sempre", anteprima a 1100 px, tele liberate alla chiusura). Prefetch solo della pagina dopo quando Migliora è attivo. Analisi dei bordi solo quando serve.
- Bordi: il ritaglio è solo manuale (partenza = pagina intera, "Bordi automatici" a richiesta; `fixBox`, flag `cropAuto`). Maniglie con trascinamento relativo, senza saltare né ricrearsi durante il gesto.
- `Fix.check` analizza una sola volta ogni pagina.

## Lingue, accordi, respiro, tutto schermo (25 novembre 2026)
- `langs.js`: tedesco rifatto (ee/ie/ei/eu/äu, h muta, z=ts, st/sp = sht/shp), francese unificato con `frPronSyl` (ail/eil/ill, eccezioni), inglese per musical e pop (dizionario ~300 voci + regole), russo (cirillico: я ю е ё = ia iu ie io, ай/ой/ей, ч, ь, desonorizzazione). Riconoscimento del cirillico in `detectLang`; OCR con rus/deu (Tesseract) e ru-RU (Vision, Swift).
- `more.js`: Accordi e metronomo (tonalità riconosciuta → accordi della tonalità, con settima, sospesi, dominanti secondarie, prestiti; costruttore con basso; tempo "♩ = 90" modificabile), "Leggi una parola" (pronuncia e traduzione senza scrivere), Respiro (7 esercizi animati) in Per Cantanti, timer lavoro/pausa con Pausa/Riprendi e comandi in tutto schermo, tutto schermo istantaneo, alleggerimento dei PDF sopra 18 MB prima dell'import, testo e accordi (pop) → PDF.
- Parole di tempo ed espressione: si inseriscono come testo e si apre subito la modifica. Dedica anche nella stella del copyright; apertura +2 s; barra strumenti più trasparente.

## Canto pop (26 novembre 2026, `more.js` → `PopSong`)
- Cerca su accordiespartiti.it (`/?s=`), apre il brano, estrae il contenuto del `<pre>` (testo e accordi, notazione italiana DO RE MI, 7+ = maj7, /4 = sus4), riconosce le righe di accordi e le allinea; nomi Italiano/Inglese/come sul sito, trasposizione a semitoni, solo testo/solo accordi, importa come PDF (accordi in rosso, genere Pop). Link o testo incollato come alternativa.
- Dal browser il sito non si lascia leggere (niente CORS): serve l'app (Swift `download`, User-Agent da Safari) o il testo incollato.
- Accessi: Attrezzi → Canto pop, Importa → Canto pop, Per Cantanti → Canto pop.

## Sigillo copyright FPM webdesignertech
- `leggio/fpm_seal.png` (1000 px) e `leggio/fpm_seal320.webp` (usato nell'app come `__SEAL__` da `build.py`): il volto FPM dell'icona ricolorato in oro su nero, con la scritta "FPM WEBDESIGNERTECH · © 2026 · MOZART".
- Dove si vede: schermata d'avvio (in basso, con "© 2026 FPM webdesignertech · Tutti i diritti riservati"), finestra Informazioni, piede della libreria (tocco = Informazioni).
- I PDF condivisi hanno nei dati "Producer/Creator: Mozart · © 2026 FPM webdesignertech".

## Compilare l'app iOS (IPA)
- **GitHub Actions**: `.github/workflows/mozart-ios.yml`, con `runs-on: macos-26`.
  - Parte a ogni push su `leggio/**` o `mozart-ios/**` e crea un IPA non firmato.
  - Ultima build riuscita: run 44512350233 (19/11/2026), artefatto "Mozart-iPad-iPhone-ipa".
- **Installazione**: con Sideloadly dal MacBook Air (macOS 12), sull'iPad dell'utente.
- **Codemagic**: `codemagic.yaml`, workflow `mozart-unsigned` e `mozart-testflight` (integrazione "Mozart ASC").
  - La build su Codemagic restava in coda.
  - La chiave API salvata viene rifiutata (errore 401): serve una nuova chiave da Teams → Integrations → Codemagic API.

## Da fare / da verificare
- Provare sull'iPad la lettura del testo a pagina 7 di `appendice_barbiere.pdf` con la nuova lettura OCR (il PDF non è nel repository).
- Provare la traduzione sull'iPad (da questo server i servizi di traduzione non rispondono).
- Se serve TestFlight: nuova chiave Codemagic.

## Regole di lavoro
- Rispondere sempre in italiano.
- Fare commit e push solo su `claude/fervent-sagan-xuja93` e su `gh-pages`.
- Nessun nome di modello nei commit.
- Per i test: script Playwright nella scratchpad, che servono le librerie cdnjs dalle copie locali di `node_modules`.
