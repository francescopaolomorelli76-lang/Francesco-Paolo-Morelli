# CLINIA — Verifica dei 51 moduli e valutazione tecnica

Data: 27 novembre 2026 · Preparata per FPM WebDesignTech · Nessuna funzione nuova è stata implementata: questo è solo il controllo.

**Come leggere la tabella**
- ✅ **1** Già presente e funzionante
- 🟡 **2** Presente ma da migliorare
- 🔴 **3** Presente ma non funzionante (o in contrasto con le specifiche)
- ⬜ **4** Da implementare
- 🔍 **5** Da verificare
- ⏳ **6** In attesa di autorizzazione o configurazione esterna

**Premessa importante.** Oggi l'app funziona in *modalità prova*: i dati restano sul singolo telefono o tablet. Il database Supabase è già pronto (tabelle, regole di accesso, controlli), ma l'app non è ancora collegata. Quindi "funzionante" vuol dire "funziona nella prova sul dispositivo". Il collegamento al database (multiutente vero) è il passo che rende reali molti moduli.

## Tabella di verifica

| N. | Modulo | Stato | Cosa c'è / cosa manca |
|---|---|---|---|
| 01 | Pagamenti e compensi FPM | 🟡 2 | C'è: compenso 1,50 €/ora che parte appena Marco conferma il pacchetto, fisso annuale configurabile, registro incassi con PDF. Manca: la tariffa non è "bloccata" sul pacchetto (se cambi 1,50 il calcolo cambia anche sul passato); addebito automatico SEPA (serve un servizio a pagamento, ⏳); lordo/netto. |
| 02 | Super Admin FPM | 🟡 2 | C'è: area FPM con Entrate, Dottori, Clinia, Messaggi, Incassi, registro attività, reset, credenziali. Manca: diagnostica e modalità manutenzione (vedi 14). |
| 03 | Prenotazione stanze e credito orario | 🟡 2 | C'è: doppia conferma, ore scalate alla conferma, turni ripetuti, avvisi a 4 ore / giorno prima / ore finite; nel database c'è il blocco automatico delle sovrapposizioni. Manca: annulla entro 5 minuti, scelta di giorni singoli o mesi interi. |
| 04 | Controllo automatico degli errori | 🟡 2 | C'è: campi obbligatori, data di nascita non futura, nessuna doppia prenotazione, controllo ore residue. Manca: controlli su codice fiscale/P.IVA, email doppie, importi anomali. |
| 05 | Gestione aziende | 🟡 2 | C'è: sezione Società (tipo, persone, pacchetti). Manca: dati fiscali completi e documenti per azienda. |
| 06 | Reset, backup e ripristino | 🔴 3 | C'è: reset per voce e per dottore, script di backup testato (30 tabelle). **Problema:** il reset "ore" e "tutto" cancella anche i pacchetti, cioè la base dei compensi FPM: la specifica lo vieta. Manca: cestino e ripristino. |
| 07 | Calendario intelligente stanze | 🟡 2 | C'è: prospetto stanze libere/occupate, chiusura stanza, annulla turno. Manca: colori verde/rosso/giallo/grigio, vista giorno/mese, proposta di orari alternativi. |
| 08 | Centro comunicazioni | 🟡 2 | C'è: notifiche interne per ogni operazione, link WhatsApp manuali per Clinia. Manca: email automatiche e notifiche push (vedi 32–34). |
| 09 | Clinia Messenger | 🔴 3 | C'è: chat paziente/dottori/Clinia/FPM, risposta automatica fuori orario. **Problema:** oggi FPM vede tutte le chat, anche dottore–paziente; la specifica dice che FPM non deve vederle (dati sanitari). Manca: conferma di lettura, ricerca, allegati, blocco utente, avviso "per emergenze chiama il 118". |
| 10 | Area paziente | ✅ 1 | Prenotazioni, profilo, consensi, messaggi, visite online, eliminazione account. |
| 11 | Conferme e disdette pazienti | 🟡 2 | C'è: promemoria il giorno prima, avviso disdetta tardiva. Manca: promemoria 2 ore prima, lista d'attesa, segnalazione "non presentato". |
| 12 | Protezione compensi FPM | 🟡 2 | La disdetta del paziente non restituisce ore al dottore (corretto). Da unire al punto 06 e alla tariffa bloccata (01). |
| 13 | Conformità App Store e Google Play | 🟡 2 | C'è: eliminazione account dall'app, consensi. Manca: informativa privacy e termini pubblicati, schede "Privacy" degli store. |
| 14 | Centro diagnostica FPM | ⬜ 4 | Da fare (stato database, errori, ultimo backup). |
| 15 | Sicurezza sanitaria e privacy | 🟡 2 | C'è: consensi, regole di accesso nel database. Manca: testo informativa privacy, termini, registro trattamenti, nomina responsabile (FPM come responsabile del trattamento per Clinia). |
| 16 | Proprietà e controllo tecnico FPM | 🔴 3 | Il contratto copre licenza e proprietà. **Problema:** il repository GitHub è **pubblico**: chiunque vede il codice e 2 password cifrate (attaccabili offline). Va reso privato e le password cambiate. Per gli store: Apple chiede che le app sanitarie siano pubblicate da un'azienda (account di Clinia Srl, FPM come amministratore). |
| 17 | Sicurezza degli accessi | 🟡 2 | C'è: PIN/Face ID sul dispositivo, password cifrate. Manca: accesso vero via database, verifica in due passaggi per FPM e Clinia, registro accessi. |
| 18 | Checklist conformità store | ⬜ 4 | Da fare (lista controlli prima dell'invio). |
| 19 | FPM Store Control Center | ⬜ 4 | Da fare. |
| 20 | Procedura pre-pubblicazione | ⬜ 4 | Da fare (collegata a 18 e 49). |
| 21 | Centro assistenza tecnica FPM | 🟡 2 | C'è chat con FPM; mancano i ticket numerati con stato. |
| 22 | FPM Cost Control | ⬜ 4 | Da fare (elenco costi servizi e scadenze). |
| 23 | Protezione economica FPM | ⬜ 4 | Da fare: registro compensi non cancellabile, solleciti per fisso annuale. |
| 24 | Clinia Business Analytics | 🟡 2 | C'è: entrate/uscite, grafico utile, export CSV. Mancano statistiche occupazione stanze. |
| 25 | FPM Business Analytics | 🟡 2 | C'è: totale ore e compensi per dottore. Mancano grafici per mese/anno. |
| 26 | Suggerimenti intelligenti Clinia | ⬜ 4 | Da fare con regole semplici (senza intelligenza artificiale a pagamento). |
| 27 | Gestione intelligente specialisti | 🟡 2 | C'è avviso a 4 ore; la specifica chiede soglia al 20%. Da decidere. |
| 28 | Configurazione dinamica e abbonamenti | 🟡 2 | Valori principali configurabili (fisso annuale). Abbonamenti spenti come deciso. |
| 29 | Emergenze e continuità operativa | 🟡 2 | L'app si apre anche senza rete (copia locale). Manca piano di emergenza e ripristino. |
| 30 | Codice sorgente, versioni e indipendenza da Claude | 🟡 2 | Il codice è HTML/JS semplice, database in file SQL, build iOS automatica su GitHub: qualsiasi sviluppatore può riprenderlo **senza Claude**. Da migliorare: repo privato, guida tecnica di consegna. |
| 31 | Attrezzature e manutenzione | 🟡 2 | Solo elenco attrezzature delle stanze; mancano scadenze di manutenzione. |
| 32 | Centro email FPM | ⏳ 6 | Serve un servizio di invio email (ci sono piani gratuiti, es. 300/giorno) e i record DNS sul dominio. |
| 33 | Registrazione e verifica email | ⏳ 6 | Si attiva con il collegamento al database (Supabase lo fa gratis). |
| 34 | Notifiche push gratuite | ⏳ 6 | Gratis con Firebase (Android) e Apple Push, ma servono gli account sviluppatore. |
| 35 | Testi ufficiali delle notifiche | 🟡 2 | Testi presenti, da raccogliere in un unico elenco approvato da FPM. |
| 36 | Riepilogo giornaliero FPM | ⏳ 6 | Dipende dal servizio email (32). |
| 37 | Archivio intelligente contratti | 🟡 2 | C'è scansione e salvataggio del contratto firmato. Manca lettura automatica del testo (OCR). |
| 38 | Commercialista virtuale Clinia | 🟡 2 | C'è fattura PDF con logo e numerazione. La fattura elettronica allo SdI richiede un intermediario a pagamento (⏳). |
| 39 | Commercialista virtuale FPM | 🟡 2 | Registro incassi presente. Vedi nota fiscale sotto. |
| 40 | Calcolo ritenuta d'acconto | 🔍 5 | **Da verificare con il commercialista**: se il compenso FPM è per diritti d'autore/licenza software, la ritenuta è 20% sul 75% (cioè 15% effettivo), non 20% pieno. |
| 41 | Centro documentale fiscale | 🟡 2 | PDF ed export presenti; manca un archivio unico per anno. |
| 42 | Assistente contabile intelligente | ⬜ 4 | Da fare con regole semplici. |
| 43 | Monitoraggio fiscale e avvisi P.IVA | 🔍 5 | La soglia 5.000 € vale per le prestazioni occasionali; con i diritti d'autore le regole cambiano. Verificare prima di costruirlo. |
| 44 | Simulatore fiscale FPM | 🟡 2 | Solo stime base. Da fare dopo il 40. |
| 45 | Segreteria digitale | 🟡 2 | Il dottore aggiunge appuntamenti in agenda; manca la prenotazione per conto del paziente da parte della segreteria Clinia. |
| 46 | Assenze degli specialisti | ⬜ 4 | Da fare (ferie, malattia, avviso ai pazienti). |
| 47 | Rimborsi e rettifiche | ⬜ 4 | Da fare (oggi c'è solo "annulla pacchetto"). |
| 48 | Manuale interattivo | ⬜ 4 | Da fare. |
| 49 | Collaudo generale finale | 🟡 2 | Ci sono test automatici sul flusso principale; manca il collaudo con dati fittizi su database di prova. |
| 50 | Cybersecurity e antimalware | ⏳ 6 | Controllo tipo e dimensione file possibile subito; l'antivirus vero (ClamAV) richiede un server. |
| 51 | Anticopia e anti-screenshot | ⏳ 6 | Android: blocco screenshot possibile. iPhone: Apple non permette di bloccarli, si può solo oscurare l'anteprima e rilevare lo screenshot. |

**Riepilogo:** 1 già funzionante · 28 da migliorare · 3 in contrasto con le specifiche (06, 09, 16) · 11 da implementare · 2 da verificare · 6 in attesa di servizi esterni.

## Valutazione tecnica: le 15 domande

**1. Quali funzioni sono già presenti?** Pacchetti ore (mensile, settimanale, a ore, libere) con conferma di Marco; contatore ore; prenotazione stanze con doppia conferma; avvisi di scadenza; compenso FPM 1,50 €/ora e fisso annuale; area Clinia (pacchetti, pagamenti dottori, fatture PDF, entrate/uscite, stanze); area FPM (dottori, approvazioni, foto, registro, reset, credenziali, incassi); chat; notifiche interne; WhatsApp manuale; visite online; eliminazione account; database Supabase pronto con 23 migrazioni; backup testato; build iOS.

**2. Cosa va completato?** Collegamento app ↔ database (è il pezzo che rende tutto multiutente), accesso vero con email, notifiche push ed email, informativa privacy e termini, diagnostica, ticket, rimborsi, assenze, checklist store.

**3. Ci sono funzioni duplicate?** Poche: i calcoli del compenso sono ripetuti in 7 punti (vanno unificati in uno, insieme alla tariffa bloccata); notifiche e chat in parte si sovrappongono. Nessun doppione grave.

**4. Errori di architettura?** Il principale: oggi tutto vive in un unico file e i dati sul dispositivo. Va bene per la prova, non per l'uso reale. Il collegamento al database va fatto a fasi, con un database di prova separato da quello reale.

**5. Vulnerabilità?** Repository pubblico con 2 password cifrate dentro; accesso FPM/Clinia controllato solo sul dispositivo; nessun limite ai tentativi di accesso; file caricati senza controllo antivirus.

**6. Rischi di rifiuto negli store?** Apple: app sanitaria pubblicata da persona fisica (serve account aziendale); manca l'informativa privacy; "app che è solo un sito" (va mostrato che ha funzioni native: notifiche, Face ID). Google: con account personale servono 14 giorni di test chiuso con 12 tester.

**7. Privacy e dati sanitari?** FPM non deve vedere le chat dottore–paziente (oggi le vede: da correggere). Serve la nomina di FPM come responsabile del trattamento da parte di Clinia, l'informativa, il registro trattamenti. Il database è in Europa (Parigi): bene.

**8. Problemi economici o contabili?** (a) Il reset cancella i pacchetti e quindi la base dei compensi FPM. (b) Se cambi 1,50 €, cambia anche il passato. (c) Il registro compensi si può modificare: deve diventare solo aggiunta. (d) La ritenuta va verificata (diritti d'autore = 15% effettivo).

**9. Come ridurre i costi?** Restare sui piani gratuiti: Supabase free (con il "risveglio" automatico già pronto), email con piano gratuito, push gratis (Firebase/Apple), video con Jitsi gratis, build su GitHub gratis. Costi inevitabili: Apple 99 $/anno, Google 25 $ una tantum.

**10. Velocità?** L'app è leggera. Migliorabile: caricare le foto più piccole e il PDF solo quando serve (già fatto), dividere il file unico in parti quando si collega il database.

**11. Semplificare l'esperienza?** Meno schede nell'area FPM (raggruppare reset/registro/credenziali in "Strumenti"); calendario stanze a colori; un pulsante unico "Prenota stanza" per i dottori.

**12. Si può ricompilare senza Claude?** Sì. HTML/JavaScript standard, Capacitor per iPhone/Android, database in file SQL, build automatica su GitHub. Serve solo una guida tecnica di consegna (da scrivere).

**13. Altre funzionalità utili?** Promemoria 2 ore prima per i pazienti; lista d'attesa; firma digitale del contratto in app; esportazione Excel per il commercialista.

**14. Cosa eliminare o modificare?** Modificare: visibilità chat FPM, reset che tocca i pacchetti, tariffa non bloccata. Eliminare: le vecchie voci di abbonamento (già spente) e i resti del vecchio preventivo con 4,99 € e Progetto Arca nella presentazione e nel piano economico.

**15. Miglioramenti consigliati:** vedi la classifica qui sotto.

## Classifica dei suggerimenti

### OBBLIGATORI (prima di andare sugli store)
1. Rendere **privato** il repository GitHub e cambiare le password di FPM e Clinia.
2. Il reset non deve mai cancellare pacchetti, compensi e storico (modulo 06).
3. Tariffa 1,50 € salvata dentro ogni pacchetto, non ricalcolata sul passato (01).
4. FPM non vede le chat dottore–paziente (09).
5. Informativa privacy, termini d'uso e nomina responsabile del trattamento (15).
6. Collegare l'app al database con accesso vero, usando prima un **database di prova separato** (17, 30).
7. Account sviluppatore Apple **intestato a Clinia Srl** (16) ⏳.

### IMPORTANTI
8. Notifiche push gratuite ed email automatiche (32–34).
9. Registro compensi non modificabile + cestino e ripristino (06, 23).
10. Calendario stanze a colori e vista giorno/mese (07).
11. Verifica col commercialista di ritenuta e soglie (40, 43).
12. Checklist store e collaudo con dati finti (18, 20, 49).

### CONSIGLIATI
13. Diagnostica FPM, ticket assistenza, assenze specialisti, rimborsi (14, 21, 46, 47).
14. Promemoria 2 ore prima, lista d'attesa, "non presentato" (11).
15. Guida tecnica di consegna per l'indipendenza da Claude (30).

### FACOLTATIVI
16. Suggerimenti automatici, assistente contabile, simulatore fiscale (26, 42, 44).
17. Lettura automatica contratti (OCR), manuale interattivo (37, 48).
18. Antivirus su server, blocco screenshot Android (50, 51).

## Decisioni che toccano costi, compensi, proprietà, privacy o pubblicazione (da approvare da FPM)

| Decisione | Effetto |
|---|---|
| Repo privato | Gratis. Nessun effetto sulla build. |
| Account Apple a nome Clinia Srl | 99 $/anno a carico di Clinia (già nel contratto); FPM amministratore. |
| Google Play | 25 $ una tantum; con account personale 14 giorni di test chiuso. |
| Email automatiche | Piano gratuito sufficiente all'inizio; serve accesso ai DNS del dominio. |
| Fattura elettronica SdI | Intermediario a pagamento (circa 1–5 €/mese) oppure resta al commercialista. |
| Addebito SEPA automatico | Servizio a pagamento a commissione; in alternativa bonifico manuale. |
| Antivirus file | Richiede un server (costo mensile); in alternativa solo controllo tipo/dimensione. |
| Soglia avviso ore 4h → 20% | Nessun costo, cambia solo quando arriva l'avviso. |
| FPM senza accesso alle chat dottore–paziente | Riduce la visibilità FPM, ma è richiesto dalla privacy sanitaria. |

---

## Aggiornamento del 27 novembre 2026: moduli resi operativi

Tutto quello che segue funziona nell'app (modalità prova sul dispositivo) ed è stato collaudato in automatico, senza errori. Non è stato pubblicato nulla e non è stato attivato nessun servizio a pagamento.

| N. | Cosa è stato fatto | Dove si trova |
|---|---|---|
| 01 | Tariffa 1,50 € **salvata dentro ogni pacchetto**: se un giorno cambia, i pacchetti passati restano com'erano | automatico |
| 02 | Nuova area **Strumenti FPM** (diagnostica, backup, cestino, registro compensi, costi, store, assistenza, configurazione, simulatore, testi) | Profilo FPM → Strumenti FPM |
| 03 | **Annulla entro 5 minuti** (le ore tornano nel contatore); ripetizione per 1, 2, 3 o 6 mesi | Stanze |
| 04 | Controlli su P.IVA, codice fiscale, PEC, codice SDI, e-mail; massimo di ore possibile per pacchetto settimanale/mensile; data contratto non nel futuro | moduli di inserimento |
| 05 | Dati fiscali completi delle società (P.IVA, CF, sede, PEC, SDI, referente) | Clinia → Gestione |
| 06 | Gli azzeramenti **non cancellano più** pacchetti, compensi, pagamenti e incassi (i contatori si chiudono, lo storico resta); **cestino di 30 giorni** con ripristino | Dottori / Strumenti FPM |
| 07 | **Calendario a colori** (verde libera, giallo in parte, rosso piena, grigio chiusa), vista mese e giorno; **alternative libere** quando una stanza è occupata | Clinia → Stanze; prenotazione stanza |
| 08 | **Avviso a tutti** i professionisti dall'app + pulsanti WhatsApp | Clinia → Gestione |
| 09 | **FPM non legge più le chat tra pazienti e struttura**; ricerca nei messaggi, "letto", allegati (foto/PDF), blocco utente, avviso "per emergenze chiama il 112" | Messaggi |
| 11 | Promemoria **2 ore prima**; **lista d'attesa** con avviso automatico alla disdetta; **paziente non presentato** | Visite, Agenda, Clinia → Gestione |
| 13/15 | **Informativa privacy** e **termini d'uso** in bozza, visibili da tutti i profili | Profilo |
| 14 | Diagnostica: stato app, errori raccolti, accessi, **collaudo automatico** (10 controlli) | Strumenti FPM → Diagnostica |
| 17 | Blocco di 5 minuti dopo **5 password sbagliate**; registro accessi | automatico |
| 18/19/20 | **Checklist store** (15 punti), stato Apple/Google con versione, **procedura prima di ogni pubblicazione** | Strumenti FPM → Store |
| 21 | **Assistenza tecnica con ticket numerati** e stato (aperto, in lavorazione, risolto) | Profilo → Assistenza tecnica FPM |
| 22 | **Costi dei servizi** con scadenze e avviso 30 giorni prima | Strumenti FPM → Costi |
| 23 | **Registro compensi** che si può solo aggiungere (compensi, storni, rettifiche), grafico per mese, CSV per il commercialista, promemoria del fisso annuale il 1° e il 20 dicembre dal 2027 | Strumenti FPM → Registro compensi |
| 24 | Statistiche Clinia: occupazione per stanza e per giorno, ore per professionista | Clinia → Gestione |
| 25 | Compensi FPM per mese e per anno | Strumenti FPM → Registro compensi |
| 26/42 | **Suggerimenti e scadenze** (rinnovi, stanze poco usate, giorno meno pieno, lista d'attesa, F24, fatture non incassate, manutenzioni) con regole semplici, senza intelligenza artificiale a pagamento | Clinia → Gestione |
| 27 | Soglia di avviso configurabile: 4 ore **oppure** il 20 % del pacchetto | Strumenti FPM → Configurazione |
| 28/29 | **Modalità manutenzione** con avviso; **backup completo** scaricabile e ripristino da file | Strumenti FPM |
| 31 | **Attrezzature** con scadenza della manutenzione e avviso 7 giorni prima | Clinia → Gestione |
| 35 | **Testi ufficiali delle notifiche** da approvare uno per uno | Strumenti FPM → Testi notifiche |
| 36 | **Riepilogo giornaliero** per FPM (nell'app; per e-mail quando attiviamo il servizio) | Notifiche FPM |
| 37/41 | **Archivio contratti** con ricerca; registro compensi per anno | Clinia → Gestione; Strumenti FPM |
| 44 | **Simulatore fiscale** con i due regimi (diritti d'autore / occasionale), segnato come stima | Strumenti FPM → Simulatore |
| 45 | **Segreteria**: Clinia prenota la visita per conto del paziente (telefono o reception) | Clinia → Gestione |
| 46 | **Assenze** degli specialisti: avviso ai pazienti già prenotati e a Clinia | Agenda dottore; Clinia → Gestione |
| 47 | **Rettifiche ore** (con doppia conferma, finiscono nel registro compensi) e **rimborsi** ai pazienti | Clinia → Gestione |
| 48 | **Guida all'uso** diversa per paziente, dottore, Clinia e FPM | Profilo → Guida all'uso |
| 49 | Collaudo automatico nell'app + collaudo con browser di prova | Strumenti FPM → Diagnostica |
| 50 | Solo foto (JPG, PNG, HEIC) e PDF, massimo 15 MB; file pericolosi rifiutati | automatico |
| 51 | L'app si **oscura** quando va in secondo piano (anteprima nel multitasking) | automatico |

### Punti delicati lasciati per ultimi: servono la tua approvazione

| # | Cosa | Perché è delicato | Costo |
|---|---|---|---|
| A | Rendere **privato** il repository GitHub | Lo fai tu da GitHub (Settings → Danger Zone → Change visibility). *Password già cambiate e protette con PBKDF2 (300.000 passaggi) il 27/11.* | gratis |
| B | Applicare online la **migrazione 024** (backup fatto il 27/11; l'applicazione automatica è stata fermata dal sistema di permessi: serve il tuo ok esplicito) (privacy chat, tariffa bloccata, registro compensi nel database) | Cambia il database reale | gratis |
| C | **Collegare l'app al database** con accesso vero, prima su un database di prova separato | Cambia l'architettura | gratis (piano free) |
| D | **Notifiche push** (Firebase/Apple) ed **e-mail automatiche** (moduli 32, 33, 34, 36) | Servono account e record DNS sul dominio | gratis nei limiti dei piani |
| E | **Account Apple a nome di Clinia Srl** e account Google Play (moduli 16, 19) | Proprietà e pubblicazione | 99 $/anno + 25 $ una tantum, a carico di Clinia |
| F | **Ritenuta d'acconto e soglie** (moduli 40, 43) | Regime fiscale da confermare col commercialista | — |
| G | Approvare **informativa privacy e termini** (moduli 13, 15) | Testo legale: meglio farlo rivedere | eventuale consulente |
| H | **Fattura elettronica SdI** (38), **addebito SEPA** (01), **antivirus su server** (50), **blocco screenshot Android** (51, richiede una nuova build) | Servizi a pagamento o modifica dell'app nativa | da preventivare |
| I | **Verifica in due passaggi** per FPM e Clinia (17) | Funziona solo con il database collegato (punto C) | gratis |
| L | **Lettura automatica dei contratti (OCR)** (37) | Servizio esterno | da valutare |


### Fatto in autonomia il 27/11 (seconda parte)
- Password di FPM e Clinia cambiate; impronte più robuste (PBKDF2). Le vecchie password non funzionano più.
- Backup completo del database online (37 tabelle) prima di qualsiasi modifica.
- Preventivo `piano-economico.html` riscritto sul modello attuale (1,50 €/ora + fisso annuale, niente abbonamenti, niente Arca).
- Anteprima dell'app aggiornata (versione 48).
