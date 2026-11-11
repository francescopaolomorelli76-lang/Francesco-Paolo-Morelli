# Provare Clinia sull'iPhone (app vera, non web)

Come per Manga Vox: **GitHub compila l'app** su un Mac nel cloud, **Sideloadly** la installa sull'iPhone collegato al Mac firmandola con il tuo **Apple ID gratuito**.

> Limiti dell'Apple ID gratuito: l'app funziona **7 giorni**, poi va reinstallata (passi 1 e 4, 2 minuti). Al massimo 3 app installate così (Manga Vox + Clinia stanno insieme).
> Per distribuirla a Marco, agli specialisti e ai pazienti servono l'account **Apple Developer** (99 $ l'anno) e TestFlight / App Store.

## 1. Scarica l'app compilata (Clinia.ipa)
1. Sul Mac apri https://github.com/francescopaolomorelli76-lang/Francesco-Paolo-Morelli/actions ed entra con il tuo account GitHub.
2. A sinistra scegli **"Clinia iPhone (IPA non firmata)"** e clicca l'ultima riga con la ✓ verde.
3. In fondo, sotto **Artifacts**, clicca **Clinia-iPhone-ipa**: si scarica uno zip.
4. Doppio clic sullo zip: compare **Clinia.ipa** (in Download).

Ogni modifica all'app che salvo su GitHub produce da sola una nuova build (circa 10 minuti).

## 2. Sideloadly
Se l'hai già installato per Manga Vox, salta questo passo. Altrimenti: scarica la versione **macOS** da https://sideloadly.io, trascinala in Applicazioni, al primo avvio clic destro › **Apri** › **Apri**.

## 3. Collega l'iPhone
Cavo, sblocca l'iPhone, a "Autorizzare questo computer?" rispondi **Autorizza**. Il nome dell'iPhone compare in Sideloadly in alto (**iDevice**).

## 4. Installa Clinia
1. Trascina **Clinia.ipa** nella finestra di Sideloadly.
2. In **Apple account** scrivi l'email del tuo Apple ID, premi **Start** e inserisci la password (o una **password per app** da https://account.apple.com › Accesso e sicurezza).
3. Aspetta **Done.**

## 5. Sblocca l'app
1. **Impostazioni › Privacy e sicurezza › Modalità sviluppatore** › attiva › riavvia › **Attiva** (se l'hai già fatto per Manga Vox, è già attiva).
2. **Impostazioni › Generali › VPN e gestione dispositivi** › il tuo Apple ID › **Autorizza**.
3. Apri **Clinia**: alla prima apertura rispondi **Consenti** alle notifiche.

## 6. Cosa provare: il giro delle notifiche
Sullo stesso iPhone puoi entrare a turno con i 4 ruoli (Profilo › Impostazioni › Esci); le notifiche restano nella casella di ciascuno.

- [ ] **Paziente**: scegli uno specialista, guarda lo studio in 3D, prenota → "Richiesta inviata".
- [ ] **Specialista**: in Agenda compare "1 richiesta di visita da confermare" e la campanella **Notifiche** → **Conferma**.
- [ ] **Paziente**: notifica "Visita confermata".
- [ ] **Area FPM**: notifica "Richiesta di visita confermata" (solo iniziali del paziente).
- [ ] **Specialista**: dopo la visita, in Agenda › "Visite da chiudere" › **Effettuata** → FPM riceve "Visita effettuata".
- [ ] **Specialista**: prenota uno studio → **Direzione Clinia** riceve "Studio prenotato".

## Come arrivano le notifiche
- **Con l'app aperta o appena chiusa** arrivano subito come notifica dell'iPhone (banner e suono) e restano nella sezione **Notifiche**.
- **Ad app chiusa da tempo** (notifiche "push" da server) servono l'account Apple Developer e il servizio push di Apple: si attivano quando passiamo a TestFlight/App Store. Il database le prepara già (tabella `notifiche`).
