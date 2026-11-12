# JEEG ROBOT D'ACCIAIO: ROM per Mega Drive / Genesis (Livello 1)

Questa è una **vera ROM** a 16 bit per la console Sega Mega Drive (Genesis). Gira sugli emulatori Mega Drive dei Pandora Box, su RetroArch / Batocera / RetroPie (core Genesis Plus GX o PicoDrive), su BlastEm e su cartuccia flash per la console originale.

| File | Uso |
|---|---|
| `dist/JEEG_LIVELLO1.md` | la ROM da giocare (identica al .bin) |
| `dist/JEEG_LIVELLO1.bin` | stessa ROM con estensione .bin, se il sistema non accetta .md |
| `dist/JEEG_LIVELLO1_DEMO.bin` | versione dimostrativa: il gioco si gioca da solo (modalità attract) |

## Installazione sul Pandora Box

I modelli cambiano molto. Il principio è lo stesso: la ROM va aggiunta come gioco **Mega Drive / MD / Genesis**.

1. Formatta una chiavetta USB in FAT32.
2. Copia `JEEG_LIVELLO1.md` (o il `.bin`) nella cartella che il tuo modello usa per i giochi Mega Drive. Spesso è `md`, `MD` o `genesis` dentro la cartella dei giochi; altri modelli la importano dal menu *Aggiungi giochi / Add games*.
3. Inserisci la chiavetta e importa o aggiorna l'elenco dei giochi. Il gioco compare come *JEEG ROBOT D'ACCIAIO*.

Note:
- I cabinati **Arcade1Up** di serie non permettono di aggiungere giochi. Serve una modifica hardware o software del cabinato, che non è coperta qui.
- Se il Pandora Box elenca solo giochi "arcade" (MAME/FBA) e non ha l'emulatore Mega Drive, la ROM non si può aggiungere. Una ROM arcade nuova (per esempio per la scheda CPS1) richiederebbe un progetto diverso.

## Comandi (joypad Mega Drive a 3 o 6 pulsanti)

| Pulsante | Azione |
|---|---|
| Croce | movimento (↓ + B scende dalle passerelle) |
| **A** | attacco: pugno, pugno, calcio (in aria: calcio volante) |
| **B** | salto (tenuto = più alto) |
| **A + B** insieme | raggio speciale (solo Jeeg): Gamma 15 EN, Protonico 35 EN |
| **C** | trasformazione (dopo i guanti), poi BUILD UP; come Jeeg cambia il tipo di raggio |
| START | inizia / pausa |
| Z (6 pulsanti) | raggio diretto |

Sul Pandora Box i pulsanti A/B/C corrispondono ai primi tre tasti del gioco Mega Drive, secondo la mappatura del modello.

## Cosa c'è nel Livello 1 (tutto verificato in emulatore)

- **Zona A, circuito (scala umana):** Hiroshi umano; soldati Haniwa spadaccini e lancieri, con segnale "!" prima dell'attacco; casse, passerelle e auto da corsa; i **guanti magnetici** sull'auto; checkpoint 1 con bandiera; imboscata dopo la raccolta dei guanti.
- **Trasformazione manuale (C):** schermata "Unione dei guanti" con Hiroshi, poi **forma cyborg** giocabile.
- **BUILD UP (C):** schermata di Miwa "lancia i componenti". In gioco, la testa di Jeeg resta sospesa, il **Big Shooter** passa in volo e torso, braccia e gambe si agganciano uno alla volta con scintille magnetiche. Jeeg atterra, compare la schermata "BUILD UP!" e scatta il checkpoint 2.
- **Zona B, giganti:** Jeeg completo; **Haniwa giganti** corpo a corpo e cannonieri (palle d'argilla a parabola); ricariche di vita ed energia; checkpoint 3.
- **Boss Haniwa Genjin DOROMA** (dal tuo riferimento): schermata WARNING e 3 fasi.
  - Fase 1: colpo d'ascia.
  - Fase 2: sfere di fuoco dalla faccia e onde d'urto.
  - Fase 3: carica (dopo cui Doroma resta stordito e subisce più danni) e salto con doppia onda d'urto.
  - La faccia cambia colore a ogni fase.
- Vita, energia dei raggi a ricarica lenta, 3 vite, respawn all'ultimo checkpoint con i guanti conservati, game over con "continua".
- **Salvataggio su SRAM a batteria:** dal titolo, C = continua dall'ultimo checkpoint.
- Schermata finale con punteggio, nemici e tempo; musica ed effetti originali sul chip sonoro PSG.

## Limiti attuali (onesti)

- Testata con l'emulatore **Genesis Plus GX**, lo stesso tipo usato da molti Pandora Box. **Non ancora provata su un Pandora Box reale né sulla console originale.**
- Audio solo sul chip PSG (3 voci + rumore); la musica FM (YM2612) non c'è ancora.
- La zona A e la zona B sono due tratti separati: dopo il BUILD UP si passa alla zona dei giganti.
- Livelli 2–20 non ancora realizzati (vedi `../jeeg-game/BOSS_RIFERIMENTI.md` per i boss proposti).

## Come è costruita (per sviluppatori)

Il gioco è scritto in C per il 68000, con un motore scritto da zero (nessuna libreria esterna) in `src/md.c`. Contiene il chip video (tile, piani, sprite, finestra HUD, DMA), il joypad a 3/6 pulsanti, il chip sonoro PSG e la SRAM. La grafica nasce dagli stessi disegni della versione HTML5, rasterizzati in pixel art con le palette Mega Drive (9 bit, 4×16 colori).

```
node tools/render_assets.cjs      # disegni → PNG (res/png)
python3 tools/convert.py          # PNG → tile, palette, sprite composti, mappe (build/assets.c)
make                              # → build/jeeg.bin   (serve gcc-m68k-linux-gnu)
make -B OUT=build/jeeg_auto.bin EXTRA=-DAUTOPLAY   # versione demo / test
python3 tools/test_playthrough.py /tmp/out   # partita completa automatica (libretro Genesis Plus GX)
python3 tools/test_respawn.py                # morte forzata → respawn al checkpoint
python3 tools/test_nogod.py                  # partita senza invulnerabilità + SRAM
```

Jeeg Robot d'Acciaio e i suoi personaggi appartengono ai rispettivi titolari. Questo è un fan game per uso privato: per distribuirlo servono le autorizzazioni.
