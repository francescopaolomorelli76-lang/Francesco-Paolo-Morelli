# Pubblicare Manga Vox su Google Play

Tutto si fa dal browser: il Mac non serve. L'app viene compilata su **Codemagic**, come per l'iPhone.

## 0. Prima prova su un telefono Android (consigliato)
L'app Android non è ancora mai stata provata su un telefono vero.
1. Codemagic › **Start new build** › branch `claude/offline-translation-app-32rsjv` › workflow **Android prova (APK)**.
2. Scarica `app-release.apk`, mandalo al telefono Android (WhatsApp, Drive, mail…), aprilo e consenti "Installa app sconosciute".
3. Prova voce, scanner, lingue. Errori o problemi: mandali a Claude prima di pubblicare.

## 1. Account sviluppatore Google Play (25 $ una tantum)
1. https://play.google.com/console/signup con il tuo account Google.
2. Tipo account **Personale**. Servono documento d'identità e verifica del telefono (qualche giorno).
3. **Attenzione:** per i nuovi account personali Google chiede un **test chiuso con almeno 12 tester per 14 giorni consecutivi** prima di poter pubblicare per tutti. Prepara 12 amici con un telefono Android e un account Gmail.

## 2. Chiave di caricamento (una volta sola, da conservare per sempre)
Su un computer con Java (anche il Mac) apri il Terminale:
```bash
keytool -genkey -v -keystore ~/manga-vox-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
Scegli una password e annotala. **Fai una copia di backup del file .jks e della password**: senza, non potrai più aggiornare l'app.

Su Codemagic: **Team settings › Code signing identities › Android keystores › Add keystore**
- File: `manga-vox-upload.jks`
- Keystore password e key password: quelle scelte
- Key alias: `upload`
- **Reference name: `manga_vox_upload`** (esattamente così)

## 3. Compila il pacchetto per lo store
Codemagic › **Start new build** › workflow **Android → Play Store (AAB)** › scarica `app-release.aab`.

## 4. Crea l'app nella Play Console
**Crea app** › Nome: *Manga Vox* · Lingua predefinita: *Italiano* · App · Gratuita.

### Scheda dello store (testi pronti)
- **Nome (max 30):** `Manga Vox: Traduttore Offline`
- **Breve descrizione (max 80):** `Premi, parla, lascia: traduce al volo e lo dice ad alta voce. Anche offline.`
- **Descrizione completa:**

```
💥 MANGA VOX: il traduttore simultaneo in stile fumetto!

Tieni premuto, parla, lascia: Manga Vox traduce al volo e legge la traduzione ad alta voce. Perfetto per viaggi, vacanze e chiacchierate con chi parla un'altra lingua.

🔵🟡 DUE PULSANTI, ZERO COMPLICAZIONI
• Pulsante azzurro: parla l'altra persona. La sua lingua viene riconosciuta da sola.
• Pulsante giallo: parli tu, nella tua lingua.
• Mentre parli vedi le parole e la traduzione in diretta.

✈️ ANCHE OFFLINE
Scarica le lingue una volta e traduci anche in aereo, in montagna o dove il Wi-Fi non arriva.

🌍 59 LINGUE
Italiano, inglese, tedesco, francese, russo e cinese incluse. Tocca un paese e scarichi la sua lingua: spagnolo, portoghese, giapponese, coreano, arabo, turco, greco, polacco e tante altre.

📷 SCANNER DI TESTI
Inquadra menù, cartelli e documenti: la traduzione compare sopra il testo in tempo reale. Oppure scatta una foto e traduci tutto.

🎭 VOCE GIUSTA
Se parla un uomo risponde una voce maschile, se parla una donna una femminile. Scegli tu le voci e regola volume e velocità.

🔒 NIENTE ACCOUNT, NIENTE PUBBLICITÀ
Nessuna registrazione, nessun tracciamento.

Grafica manga, pulsanti 3D e tanta voglia di farsi capire. Buon viaggio!
```

- **Grafica** (cartella `store/play/`):
  - Icona 512×512: `icon-512.png`
  - Immagine in evidenza 1024×500: `feature-graphic.png`
  - Screenshot telefono (almeno 2): `screenshot-1-dialogo.png`, `screenshot-2-scena.png`, `screenshot-3-primo-piano.png`
  - Meglio aggiungere 2–3 screenshot veri dal telefono Android (scanner, lingue del mondo, pannello audio).
- **Categoria:** Viaggi e info locali (o Strumenti).
- **Email di contatto:** la tua email di supporto.

### Contenuti dell'app (moduli obbligatori)
- **Privacy policy:** l'indirizzo della pagina `privacy.html` del sito pubblicato (vedi `website/README.md`). Prima inserisci la tua email nella riga "Contatto" di `PRIVACY.md` / `website/privacy.html`.
- **Accesso all'app:** tutte le funzioni disponibili senza credenziali.
- **Annunci:** l'app non contiene annunci.
- **Classificazione dei contenuti:** compila il questionario (Utility/strumento, nessun contenuto sensibile) → PEGI 3.
- **Pubblico di destinazione:** 13+ (o 18+), non rivolta ai bambini.
- **Sicurezza dei dati:** l'app non raccoglie né condivide dati con i suoi server. Il riconoscimento vocale usa il servizio di Google del telefono: se Google lo richiede, indica che l'audio può essere elaborato dal servizio di sistema solo per la funzione (non salvato, non condiviso). Dati criptati in transito: sì. Eliminazione: non ci sono dati da eliminare.
- **Autorizzazioni:** microfono (traduzione vocale), fotocamera (scanner).

## 5. Test chiuso → Produzione
1. **Test › Test chiuso › Crea versione** › carica `app-release.aab` › note di rilascio: `Prima versione di Manga Vox`.
2. Aggiungi i 12+ tester (lista di email Gmail) e manda loro il link di partecipazione.
3. Dopo 14 giorni con almeno 12 tester attivi: **Richiedi accesso alla produzione**, rispondi alle domande sul test.
4. **Produzione › Crea versione** › stesso AAB (o uno nuovo) › Invia per la revisione (di solito 1–7 giorni).

## Aggiornamenti futuri
Codemagic › **Android → Play Store (AAB)** (il numero di versione cresce da solo) › Play Console › nuova versione › carica l'AAB.
