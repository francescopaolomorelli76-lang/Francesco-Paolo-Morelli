#!/usr/bin/env python3
# Clinia App · backup del database Supabase (tutte le tabelle dello schema public, in JSON).
# Usa la Management API di Supabase con un token personale (sbp_...) letto dalla variabile SUPABASE_TOKEN.
# Uso: SUPABASE_TOKEN=sbp_... python3 backup_supabase.py <cartella_di_destinazione>
# © 2026 FPM WebDesignTech – Francesco Paolo Morelli
import json, os, sys, datetime, urllib.request

PROGETTO = os.environ.get("SUPABASE_PROGETTO", "iuydwatobtrpzhotcfyd")
TOKEN = os.environ.get("SUPABASE_TOKEN", "")
DEST = sys.argv[1] if len(sys.argv) > 1 else "backup"
URL = f"https://api.supabase.com/v1/projects/{PROGETTO}/database/query"

def query(sql):
    req = urllib.request.Request(URL, data=json.dumps({"query": sql}).encode(), method="POST",
        headers={"Authorization": f"Bearer {TOKEN or 'proxy-injected'}", "Content-Type": "application/json", "User-Agent": "clinia-backup"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def main():
    oggi = datetime.date.today().isoformat()
    cartella = os.path.join(DEST, oggi)
    os.makedirs(cartella, exist_ok=True)
    tabelle = [r["table_name"] for r in query(
        "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1")]
    riepilogo = {}
    for t in tabelle:
        dati = query(f'select coalesce(json_agg(x), \'[]\'::json) as righe from public."{t}" x')[0]["righe"]
        with open(os.path.join(cartella, f"{t}.json"), "w", encoding="utf-8") as f:
            json.dump(dati, f, ensure_ascii=False, indent=1)
        riepilogo[t] = len(dati)
    with open(os.path.join(cartella, "_riepilogo.json"), "w", encoding="utf-8") as f:
        json.dump({"data": oggi, "progetto": PROGETTO, "righe_per_tabella": riepilogo}, f, ensure_ascii=False, indent=1)
    # tiene gli ultimi 30 backup
    giorni = sorted(d for d in os.listdir(DEST) if len(d) == 10 and d[4] == "-")
    for vecchio in giorni[:-30]:
        for n in os.listdir(os.path.join(DEST, vecchio)):
            os.remove(os.path.join(DEST, vecchio, n))
        os.rmdir(os.path.join(DEST, vecchio))
    print(f"Backup {oggi}: {len(tabelle)} tabelle, {sum(riepilogo.values())} righe")

if __name__ == "__main__":
    main()
