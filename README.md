# 💥 Manga Vox: traduttore offline in stile fumetto

App per **iPhone e Android** di traduzione simultanea **offline**, pensata per dialoghi veloci tra due persone, con **scanner di testo da foto** e traduzione in tempo reale. Grafica manga/fumetto action.

**Lingue:** 🇮🇹 Italiano · 🇬🇧 Inglese · 🇩🇪 Tedesco · 🇫🇷 Francese · 🇷🇺 Russo · 🇨🇳 Cinese

<p>
<img src="docs/screenshots/icon.png" width="120" alt="Icona">
<img src="docs/screenshots/home.png" width="200" alt="Schermata principale">
<img src="docs/screenshots/recording.png" width="200" alt="Pulsante premuto">
<img src="docs/screenshots/setup.png" width="200" alt="Preparazione offline">
</p>

## Come si usa: un solo pulsante

Al centro c'è **un unico grande pulsante 3D**.

### 🎤 Voce
- **Tieni premuto** e parla, **lascia**: l'app traduce e legge ad alta voce la traduzione.
- **Non devi scegliere le lingue.** La tua lingua è quella del telefono (chip giallo **IO**). La lingua dell'interlocutore viene riconosciuta da sola (chip azzurro **AUTO**).
  - Se parli nella tua lingua, traduce nella lingua dell'interlocutore.
  - Se parla l'interlocutore (inglese, tedesco, russo…), la riconosce e traduce nella tua lingua.
- Tocca una nuvoletta per riascoltarla.

### 📷 Scanner (interruttore in alto)
- **Tieni premuto** inquadrando un testo: traduzione **dal vivo**.
- **Lascia**: scatta la foto e traduce tutto il testo, blocco per blocco.
- Anche qui la lingua del testo è riconosciuta da sola: un testo straniero viene tradotto nella tua lingua, un testo nella tua lingua nella lingua dell'interlocutore.

## Come funziona offline

| Funzione | Tecnologia (tutto sul dispositivo) |
|---|---|
| Voce → testo, qualsiasi lingua | **Whisper** (whisper.cpp, modello multilingue *base*, ~150 MB) in modalità automatica |
| Riconoscimento della lingua | Google ML Kit Language ID + controllo dell'alfabeto (cirillico / ideogrammi) |
| Traduzione | Google ML Kit On-Device Translation (~30 MB per lingua) |
| Testo da foto IT/EN/DE/FR/ZH | Google ML Kit Text Recognition v2, anche dal vivo |
| Testo da foto RU (cirillico) | Android: Tesseract (dati inclusi) · iOS: Apple Vision (iOS 16+). Solo sulla foto, non dal vivo |
| Testo → voce | Sintesi vocale del sistema |

> **Primo avvio:** l'app chiede di scaricare **una volta** voce + 6 lingue (circa 330 MB, meglio col Wi-Fi). Basta toccare **SCARICA TUTTO**. Dopo funziona anche in aereo.
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
