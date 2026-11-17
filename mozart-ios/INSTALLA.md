# Installare Mozart su iPad e iPhone

Mozart è un'app vera (Swift + WebKit) che contiene il leggio completo e funziona **senza internet**.
Rispetto al sito nel browser ha in più:

- schermo sempre acceso mentre leggi, niente barre di Safari, niente ricaricamenti a sorpresa;
- **Apri con Mozart**: da File, Mail, WhatsApp o AirDrop tocchi un PDF o un backup forScore `.4sb` → *Condividi* → **Mozart**;
- **Invia** con il foglio di condivisione di iOS (AirDrop tra iPad e iPhone, WhatsApp, Salva in File);
- **lettura del testo stampato** (Vision di Apple) per copiare le sillabe sui righi senza testo in omoritmia;
- microfono per accordatore e registrazioni;
- lettore PDF in un thread separato: le pagine pesanti non bloccano l'app.

Apple permette di installare un'app solo se è **firmata**. Ci sono due strade.

## Strada consigliata: TestFlight (tutto dall'iPad)

Serve l'**Apple Developer Program** (99 $/anno), lo stesso che serve per pubblicarla poi sull'App Store.

1. **Iscrizione**: https://developer.apple.com/programs/enroll/ → Individuo. L'approvazione richiede da poche ore a 1–2 giorni.
2. **Identificativo dell'app**: https://developer.apple.com/account/resources/identifiers → **+** → *App IDs* → *App* → descrizione `Mozart`, Bundle ID *Explicit* `com.morelli.mozart` → Registra.
3. **App su App Store Connect**: https://appstoreconnect.apple.com → **App** → **+** → *Nuova app* → iOS, nome **Mozart** (se occupato: *Mozart Leggio FPM*), lingua Italiano, Bundle ID `com.morelli.mozart`, SKU `mozart`.
4. **Chiave API**: App Store Connect → *Utenti e accesso* → *Integrazioni* → *App Store Connect API* → **+** → nome `Codemagic`, accesso *App Manager* → scarica il file `.p8` (una volta sola) e annota *Issuer ID* e *Key ID*.
5. **Codemagic** (compila sul Mac nel cloud, piano gratuito 500 minuti/mese): https://codemagic.io → accedi con GitHub → *Add application* → repository `Francesco-Paolo-Morelli` → configurazione **codemagic.yaml**.
   - *Team settings → Integrations → Developer Portal → Connect*: nome **`Mozart ASC`**, Issuer ID, Key ID, file `.p8`.
   - *Team settings → Code signing identities → iOS certificates → Generate certificate* (Apple Distribution), poi *iOS provisioning profiles → Fetch profiles* (App Store, `com.morelli.mozart`).
6. **Compila**: *Start new build* → branch `claude/fervent-sagan-xuja93` → workflow **Mozart iOS → TestFlight** (circa 15 minuti).
7. **Installa**: sull'iPad e sull'iPhone installa **TestFlight** dall'App Store. In App Store Connect → Mozart → *TestFlight* → *Test interni* → aggiungi la tua email → apri l'invito → **Installa**.

Ogni nuova versione arriva in TestFlight da sola dopo una nuova compilazione su Codemagic.

## Strada gratuita: Sideloadly (serve un computer)

1. Su GitHub → *Actions* → **Mozart iOS (IPA non firmata)** → ultima esecuzione → *Artifacts* → scarica `Mozart-iPad-iPhone-ipa` (contiene `Mozart.ipa`).
2. Su un Mac o PC installa **Sideloadly** (https://sideloadly.io), collega l'iPad con il cavo, trascina `Mozart.ipa`, accedi con il tuo Apple ID e premi *Start*.
3. Sull'iPad: *Impostazioni → Generali → VPN e gestione dispositivo* → autorizza il tuo Apple ID.

Con un Apple ID gratuito l'app va reinstallata ogni 7 giorni.

## Portare la libreria dal browser all'app

Nel sito: *Attrezzi → Backup → Crea backup*. Nell'app: *Importa → Ripristina da backup*.
