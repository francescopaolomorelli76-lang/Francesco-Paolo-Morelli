# Backup notturno di Clinia App

Ogni notte una copia di tutte le tabelle del database (pazienti, dottori, ore, prenotazioni, fatture…) viene salvata
in un **repository GitHub privato**. Si tengono gli ultimi 30 giorni.

## Da fare una volta sola (5 minuti)
1. Su GitHub: **New repository** → nome `clinia-backup` → **Private** → Create.
2. Nel nuovo repository: **Add file → Upload files** e carica i due file di questa cartella:
   - `backup_supabase.py` (lascialo nella cartella principale);
   - `workflow-backup.yml`, rinominato `backup.yml`, dentro la cartella `.github/workflows/`
     (scrivi il nome `.github/workflows/backup.yml` quando crei il file con **Add file → Create new file** e incolla il contenuto).
3. **Settings → Secrets and variables → Actions → New repository secret**:
   nome `SUPABASE_TOKEN`, valore il token personale di Supabase che inizia con `sbp_`.
4. **Actions → Clinia · backup notturno → Run workflow** per la prima copia di prova.

## Cosa contiene e cosa no
- Sì: tutte le tabelle dello schema `public` in file JSON, una cartella per giorno, con `_riepilogo.json`.
- No: gli account di accesso (gestiti da Supabase) e i file caricati (contratti, foto): per quelli serve il piano Pro
  oppure un backup dello Storage, da aggiungere quando l'app sarà in uso.

## Ripristino
Si fa con Claude o con il commercialista tecnico: i file JSON si reinseriscono tabella per tabella.
