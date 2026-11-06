# Sito di Manga Vox

- `index.html`: la pagina completa, pronta per GitHub Pages o qualsiasi hosting statico.
- `manga-vox.html`: la stessa pagina nel formato usato per l'anteprima su claude.ai.
- `icon-256.png`, `favicon-64.png`: icona.
- `trailer.mp4` (quando c'è): il video promozionale, mostrato nella sezione "IL TRAILER".

- `privacy.html`: privacy policy (serve per App Store e Google Play).

Per pubblicarlo gratis in 1 minuto: apri https://app.netlify.com/drop e trascina la cartella `website`.
Ottieni un indirizzo pubblico (per esempio `https://manga-vox.netlify.app`); la privacy policy sarà
`https://manga-vox.netlify.app/privacy.html`.
(GitHub Pages pubblica solo dalla radice o dalla cartella `/docs` di un branch, quindi qui è più comodo Netlify.)

## Funzioni che lavorano sul sito pubblicato (Netlify)

1. **Pubblica**: https://app.netlify.com/drop › trascina la cartella `website` (crea un account gratuito per tenere il sito).
2. **Moduli → tua email** (l'email non compare mai nel sito):
   Netlify › il tuo sito › **Forms** › *Enable form detection* › ripubblica la cartella.
   Poi **Forms › Form notifications › Add notification › Email notification** › scegli i moduli
   `suggerimenti` e `recensioni` › inserisci la tua email.
3. **Recensioni visibili**: ti arrivano via email; quelle che vuoi mostrare vanno in `reviews.json`, così:
   `[{"nome": "Giulia", "stelle": 5, "testo": "Fantastica in Giappone!"}]`
   (o mandale a Claude e le aggiunge lui), poi ripubblica la cartella.
4. **Contatore visite e paesi dei visitatori**: crea un account gratuito su https://www.goatcounter.com
   (codice, per esempio `mangavox`), attiva *Settings › Allow adding visitor counts on your website*,
   poi scrivi il codice in `index.html` alla riga `var GOATCOUNTER = '';` (es. `'mangavox'`).
   Su goatcounter.com vedi visite, paesi e città.
5. **Traduzione**: il pulsante 🌍 apre la pagina tradotta da Google Translate; funziona appena il sito è online.
