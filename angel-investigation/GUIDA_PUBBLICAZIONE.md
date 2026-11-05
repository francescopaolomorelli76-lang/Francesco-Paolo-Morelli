# Pubblicare Angel Investigation gratis e farlo trovare su Google

## Cosa costa

| Voce | Costo |
|---|---|
| Hosting del sito (Cloudflare Pages) | **0 €**, per sempre, con HTTPS incluso |
| Indirizzo gratuito tipo `angel-investigation.pages.dev` | **0 €** |
| Modulo contatti verso la tua email (FormSubmit) | **0 €** |
| Assistente "Angel" nella chat | **0 €** (funziona nel browser) |
| Google Search Console e Google Business Profile | **0 €** |
| **Dominio professionale** (`angelinvestigation.it` o `.com`) | **circa 5-15 € l'anno** |

Il dominio è l'unica spesa: un dominio professionale gratuito non esiste (i vecchi servizi gratuiti
sono chiusi o inaffidabili). Puoi partire subito con l'indirizzo gratuito `.pages.dev` e aggiungere
il dominio quando vuoi: il sito resta lo stesso.

Nota: la console operatore per rispondere tu in diretta richiede un server sempre acceso, che non è
gratuito. Sull'hosting gratuito la chat è gestita dall'assistente Angel, che porta i clienti alla tua email.

---

## 1. Mettere online il sito (10 minuti, anche da cellulare)

1. Vai su **dash.cloudflare.com** e crea un account gratuito.
2. Menu **Workers e Pages** → **Crea** → scheda **Pages** → **Collega a Git**.
3. Collega GitHub e scegli il repository **francesco-paolo-morelli**.
4. Impostazioni:
   - Ramo di produzione: `claude/offline-translation-app-32rsjv`
   - Preset framework: **Nessuno**
   - Comando di build: *(lascia vuoto)*
   - Directory di output della build: `angel-investigation/public`
5. Nome progetto: `angel-investigation` → **Salva e distribuisci**.

Dopo un minuto il sito è online su `https://angel-investigation.pages.dev`
(se il nome è già preso, Cloudflare propone una variante).
Ogni modifica che salvo su GitHub viene pubblicata da sola.

## 2. Attivare il modulo contatti (una volta sola)

1. Apri il sito online e invia una richiesta di prova dal modulo "Richiesta di consulenza".
2. A **angelinvestigation07@libero.it** arriva un'email da FormSubmit: clicca **Activate Form**
   (controlla anche nella cartella spam).
3. Da quel momento ogni richiesta arriva nella tua casella.

## 3. Il dominio professionale

1. Scegli il nome. Consigli: `angelinvestigation.it` (meglio per l'Italia) o `angelinvestigation.com`.
2. Acquistalo da un registrar, per esempio Register.it, Aruba, OVH o IONOS (.it),
   oppure Cloudflare Registrar (.com, a prezzo di costo). Confronta le offerte: spesso il primo anno costa 1-5 €,
   ma guarda il prezzo del rinnovo.
3. In Cloudflare: progetto **angel-investigation** → **Domini personalizzati** → **Configura un dominio**
   e segui le istruzioni (di solito: cambiare i "nameserver" nel pannello del registrar con quelli che ti dà Cloudflare).
4. **Scrivimi il dominio**: aggiorno io indirizzo canonico, mappa del sito e immagine di anteprima.

## 4. Farsi trovare su Google

### Già fatto nel sito
- Titolo e descrizione con le parole che si cercano ("investigatore privato", "agenzia investigativa", "infedeltà", "bonifiche"...).
- Dati strutturati per Google (agenzia, servizi, domande frequenti).
- Sezione FAQ con le domande più cercate.
- Immagine di anteprima per WhatsApp, Facebook e LinkedIn.
- Sito veloce, sicuro (HTTPS) e perfetto su cellulare: sono fattori di posizionamento.
- `robots.txt` che esclude la pagina operatore.

### Da fare tu (gratis)
1. **Google Search Console** (search.google.com/search-console): aggiungi il dominio, verificalo
   (con Cloudflare bastano due clic) e invia la mappa `sitemap.xml` (la preparo io appena mi dici il dominio). Senza questo passo Google ci mette molto di più a trovarti.
2. **Google Business Profile** (business.google.com): è il passo **più importante** per comparire nelle
   ricerche "investigatore privato + città" e sulla mappa. Puoi scegliere "attività che serve i clienti
   nella loro zona" e **nascondere l'indirizzo**. Google chiede una verifica (video o cartolina).
3. **Recensioni**: chiedi ai clienti soddisfatti una recensione su Google. Più recensioni = più in alto.
4. **Bing Webmaster Tools**: importa tutto da Search Console in un clic.
5. **Directory**: iscrizione gratuita su PagineGialle, Virgilio, Yelp e nelle associazioni di categoria.

### Cosa aspettarsi
- Nessuno può garantire il primo posto su Google: diffida di chi lo promette a pagamento.
- "Investigatore privato" è una ricerca molto contesa. Si sale prima su ricerche più precise, come
  "investigatore privato Napoli" o "bonifica microspie Milano".
- I primi risultati arrivano di solito in **2-6 mesi**, e crescono con recensioni e nuovi contenuti.
- Il prossimo passo più utile è creare **una pagina per ogni città e ogni servizio** in cui lavori:
  dimmi le città e le preparo.
