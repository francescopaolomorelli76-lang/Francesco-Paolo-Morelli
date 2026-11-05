# 💥 Manga Vox: traduttore offline in stile fumetto

App per **iPhone e Android** di traduzione simultanea **offline**, pensata per dialoghi veloci tra due persone, con **scanner di testo da foto** e traduzione in tempo reale. Grafica manga/fumetto action.

**Lingue:** 🇮🇹 Italiano · 🇬🇧 Inglese · 🇩🇪 Tedesco · 🇫🇷 Francese · 🇷🇺 Russo · 🇨🇳 Cinese incluse, più **🌍 59 lingue del mondo** scaricabili toccando il paese (spagnolo, portoghese, arabo, giapponese, coreano, hindi, turco, greco, polacco, ucraino, …).

<p>
<img src="docs/screenshots/icon.png" width="120" alt="Icona">
<img src="docs/screenshots/home.png" width="200" alt="Schermata principale">
<img src="docs/screenshots/recording.png" width="200" alt="Pulsante premuto">
<img src="docs/screenshots/setup.png" width="200" alt="Preparazione offline">
</p>

## Come si usa: un solo pulsante

Al centro c'è **un unico grande pulsante 3D**.

**La mia lingua.** Al primo avvio l'app chiede "Che lingua parli?" (preselezionata quella del telefono, per esempio l'italiano). Si cambia quando vuoi dal pulsante giallo in basso **LA MIA LINGUA**. È l'unica lingua da scegliere: quella degli altri l'app la riconosce da sola.

### 🎤 Voce: due pulsanti, traduzione in tempo reale
- 🔵 **LUI/LEI** (sinistra): tieni premuto mentre parla l'altra persona. La prima volta la sua lingua viene **riconosciuta da sola** (✨ AUTO) e da lì resta impostata; si può cambiare o rimettere AUTO dal riquadro sotto il pulsante.
- 🟡 **IO** (destra): tieni premuto e parla nella **tua lingua**.
- Mentre si parla, le parole e la **traduzione compaiono in diretta**; al rilascio la traduzione definitiva arriva subito e viene letta ad alta voce.
- Tocca una nuvoletta per riascoltarla.

### 🌍 Lingue del mondo
Da ⬇ in alto › **LINGUE DEL MONDO**, oppure dal riquadro sotto il pulsante azzurro: cerca o scorri i paesi, **tocca il paese** e l'app scarica la sua lingua per l'offline (circa 30 MB). Da lì la lingua viene riconosciuta in automatico, tradotta e letta; si rimuove tenendola premuta. Se l'app riconosce una lingua non ancora scaricata, propone subito **🌍 SCARICA**.

### 🎛 Audio (icona in alto)
Stato e attivazione di microfono e riconoscimento vocale, **prova microfono** con indicatore, volume del telefono, volume e velocità della voce, lettura ad alta voce sì/no, **prova voce**.

**Voci:** l'app riconosce dal tono se parla un **uomo o una donna** e legge la traduzione con una voce dello stesso genere (si può disattivare). Per ogni lingua si può scegliere la voce, con la qualità indicata (⭐ Premium, Migliorata, Base) e l'ascolto di prova. Le voci più naturali si scaricano gratis sull'iPhone in *Impostazioni › Accessibilità › Contenuto letto › Voci*. La traduzione viene letta sempre dall'altoparlante a volume pieno.

### 📷 Scanner (interruttore in alto)
- **Inquadra e basta**: l'app riconosce la lingua del testo e scrive la traduzione nella **tua lingua** sopra il testo, in tempo reale.
- Il pulsante **SCATTA!** fotografa e traduce tutto il testo, blocco per blocco (tocca un blocco per ascoltarlo).
- Il russo (cirillico) si legge con SCATTA!, non dal vivo.

## Come funziona offline

| Funzione | Tecnologia (tutto sul dispositivo) |
|---|---|
| Voce → testo, in tempo reale | iPhone: **riconoscimento vocale Apple sul dispositivo** (parole mentre parli). Android: riconoscitore di sistema |
| Riconoscimento della lingua dell'interlocutore | **Whisper tiny** (whisper.cpp, ~31 MB, incluso nell'app), solo la prima volta, circa 1 secondo |
| Riconoscimento della lingua | Google ML Kit Language ID + controllo dell'alfabeto (cirillico / ideogrammi) |
| Traduzione | iPhone con iOS 26+: **traduttore Apple** (lo stesso dell'app Traduci, offline, qualità alta). Altrimenti e come riserva: Google ML Kit On-Device Translation (~30 MB per lingua) |
| Testo da foto IT/EN/DE/FR/ZH | Google ML Kit Text Recognition v2, anche dal vivo |
| Testo da foto RU (cirillico) | Android: Tesseract (dati inclusi) · iOS: Apple Vision (iOS 16+). Solo sulla foto, non dal vivo |
| Testo → voce | Sintesi vocale del sistema |

> **Primo avvio:** l'app chiede di scaricare **una volta** le 6 lingue (circa 180 MB, col Wi-Fi; la voce è già inclusa). Basta toccare **SCARICA TUTTO**. Dopo funziona anche in aereo.
> Per la lettura ad alta voce senza rete conviene avere le voci del sistema installate (iPhone: Impostazioni › Accessibilità › Contenuto letto › Voci).

## Struttura del progetto

```
lib/
  main.dart                  Avvio app
  languages.dart             Le 6 lingue; lingua del telefono come "mia lingua"
  services/
    direction.dart           Logica automatica: chi parla → in che lingua tradurre
    speech_service.dart      Registrazione, Whisper (lingua auto), sintesi vocale
    lang_detect.dart         Riconoscimento della lingua del testo
    translator_service.dart  Traduzione offline (ML Kit)
    ocr_service.dart         OCR con lingua automatica (ML Kit + cirillico nativo)
    setup_service.dart       Download unico di voce + lingue
    prefs.dart               Memorizza le lingue
  screens/
    home_screen.dart         Schermata unica: pulsante 3D, modalità voce/scanner
    setup_screen.dart        "Scarica tutto" per l'uso offline
  ui/
    push_button.dart         Il grande pulsante 3D (tieni premuto / lascia)
    manga.dart               Grafica fumetto: retino, linee cinetiche, nuvolette
android/…/MainActivity.kt    OCR russo con Tesseract4Android
ios/Runner/AppDelegate.swift OCR russo con Apple Vision
assets/icon/                 Icona (generate_icon.py la ridisegna)
```

## Compilare

Requisiti: [Flutter](https://docs.flutter.dev/get-started/install) 3.38 o successivo, Android Studio (per Android), Mac con Xcode 16+ e CocoaPods (per iOS).

```bash
flutter pub get
dart run flutter_launcher_icons   # rigenera le icone (già incluse)
flutter run                       # su telefono collegato
flutter test                      # test
```

Requisiti minimi: **Android 7.0 (API 24)** · **iOS 15.6** (lettura del russo da foto: iOS 16).
La fotocamera e il microfono vanno provati su un **telefono vero**: l'emulatore non basta.

## Pubblicare sugli store

### Google Play
1. Crea la chiave di firma (una volta sola, **conservala**):
   ```bash
   keytool -genkey -v -keystore ~/manga-vox-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Crea `android/key.properties` (non viene caricato su git):
   ```properties
   storePassword=…
   keyPassword=…
   keyAlias=upload
   storeFile=/percorso/manga-vox-upload.jks
   ```
3. `flutter build appbundle --release` → carica `build/app/outputs/bundle/release/app-release.aab` su [Play Console](https://play.google.com/console) (account sviluppatore: 25 $ una tantum).
4. Nella scheda *Sicurezza dei dati*: nessun dato raccolto né condiviso (vedi [PRIVACY.md](PRIVACY.md)). Permessi: microfono (solo mentre il pulsante è premuto), fotocamera.

### App Store (iPhone)
1. Serve un account [Apple Developer](https://developer.apple.com/programs/) (99 $/anno) e un Mac.
2. `cd ios && pod install`, poi apri `ios/Runner.xcworkspace` in Xcode → *Signing & Capabilities* → scegli il tuo Team.
   Se `com.morelli.mangaVox` è già preso, cambia il Bundle ID.
3. `flutter build ipa --release` → carica con l'app *Transporter* o da Xcode (*Product › Archive*).
4. Su [App Store Connect](https://appstoreconnect.apple.com): privacy *Data Not Collected*, link alla privacy policy (pubblica il testo di [PRIVACY.md](PRIVACY.md), per esempio su GitHub Pages).

**Testi per lo store (suggeriti)**
- Nome: *Manga Vox: Traduttore Offline*
- Sottotitolo: *Parla, scatta, traduci senza rete*
- Descrizione breve: *Traduttore vocale e scanner di testo offline in stile fumetto: italiano, inglese, tedesco, francese, russo e cinese.*

## Licenze
- Font **Bangers**: SIL Open Font License (`assets/fonts/OFL-Bangers.txt`).
- Dati OCR russi: `tessdata_fast` di Tesseract (Apache 2.0).
- Modelli di traduzione e OCR: Google ML Kit (termini di servizio ML Kit).
- Riconoscimento vocale: whisper.cpp e modelli Whisper (MIT).

> **Nota per chi compila:** il modello vocale (`assets/models/ggml-base-q5_1.bin`) non è nel repository: lo scarica `./scripts/fetch_models.sh`, eseguito in automatico da Codemagic e GitHub Actions. In locale lancialo una volta prima di `flutter run`; se manca, l'app lo scarica al primo avvio.
