# Provare Manga Vox sull'iPhone senza Mac (Codemagic + TestFlight)

L'app viene compilata su un Mac nel cloud (Codemagic) e arriva sull'iPhone tramite **TestFlight**, l'app ufficiale Apple per i test. È la stessa strada usata poi per pubblicare sull'App Store.

## 1. Account Apple Developer (99 $/anno)
1. Vai su https://developer.apple.com/programs/enroll/ ed entra con il tuo Apple ID.
2. Iscriviti come **Individuo**. L'approvazione richiede da poche ore a 1–2 giorni.

## 2. Crea l'app su App Store Connect
1. https://appstoreconnect.apple.com › **App** › **+** › **Nuova app**.
2. Piattaforma **iOS**, nome **Manga Vox** (se è già preso: "Manga Vox Traduttore"), lingua principale **Italiano**.
3. **Bundle ID**: se non è nell'elenco, crealo su https://developer.apple.com/account/resources/identifiers con il valore `com.morelli.mangaVox`.
4. SKU: `mangavox`. Crea.
5. In **Informazioni app** copia l'**Apple ID** (un numero di 10 cifre): servirà al passo 4.

## 3. Chiave API per Codemagic
1. App Store Connect › **Utenti e accesso** › **Integrazioni** › **App Store Connect API** › **+**.
2. Nome `Codemagic`, accesso **App Manager**. Genera.
3. Scarica il file `.p8` (si scarica UNA volta sola) e annota **Issuer ID** e **Key ID**.

## 4. Codemagic
1. Registrati su https://codemagic.io con il tuo account GitHub (il piano gratuito include 500 minuti al mese).
2. **Add application** › GitHub › repository `Francesco-Paolo-Morelli` › tipo **Flutter App**, configurazione **codemagic.yaml**.
3. **Team settings › Integrations › Developer Portal › Connect**: nome `MangaVox ASC`, poi Issuer ID, Key ID e file `.p8`.
4. **Team settings › Code signing identities › iOS certificates › Generate certificate** (tipo *Apple Distribution*), poi **iOS provisioning profiles › Fetch profiles** (tipo *App Store*, bundle `com.morelli.mangaVox`).
5. Nel file `codemagic.yaml` sostituisci `0000000000` con l'Apple ID dell'app (passo 2.5), oppure chiedi a Claude di farlo.

## 5. Compila
Nell'app su Codemagic premi **Start new build**, branch `claude/offline-translation-app-32rsjv`, workflow **iOS → TestFlight**. Ci vogliono circa 20–30 minuti. Se fallisce, scarica il log e incollalo a Claude.

## 6. Installa sull'iPhone
1. App Store Connect › la tua app › **TestFlight**. La prima build passa un controllo automatico (di solito pochi minuti).
2. In **Test interni** crea un gruppo e aggiungi te stesso (la tua email Apple ID).
3. Sull'iPhone installa **TestFlight** dall'App Store, apri l'invito ricevuto via email e premi **Installa**.

Ogni nuova versione arriva in TestFlight da sola dopo una build. Quando sei soddisfatto, dalla stessa build su App Store Connect si invia l'app alla revisione per la pubblicazione.
