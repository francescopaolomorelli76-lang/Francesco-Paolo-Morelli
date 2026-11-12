"""Partita completa automatica della ROM (build con -DAUTOPLAY: bot + invulnerabilità).
Verifica guanti -> cyborg -> BUILD UP -> Jeeg -> boss -> vittoria leggendo la RAM; salva screenshot."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from mdrun import MD, symbols
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
S = symbols('build/out.elf'); m = MD('build/jeeg_auto.bin')
names = {1: 'guanti', 2: 'cyborg', 4: 'jeeg', 8: 'boss', 0x80: 'vittoria', 0x40: 'ERRORE_VRAM'}
seen = 0; shots = 0; last_state = -1; extra = {}
for f in range(60 * 60 * 6):
    m.run(1)
    if f % 30: continue
    tf = m.read(S, 'test_flags', 1); st = m.read(S, 'state', 1); stage = m.read(S, 'stage', 1)
    new = tf & ~seen
    for bit, n in names.items():
        if new & bit: print(f'{f / 60:6.1f}s  evento: {n}'); m.shot(f'{OUT}/rom_{shots:02d}_{n}.png'); shots += 1
    seen |= tf
    if st != last_state: last_state = st
    key = (st, stage, m.read(S, 'buildOn', 1))
    if key not in extra and len(extra) < 12:
        extra[key] = 1; m.shot(f'{OUT}/rom_s{st}_{stage}_{key[2]}.png')
    if f % 1800 == 0:
        px = m.read(S, 'P', 4, True) >> 4
        print(f'{f / 60:6.1f}s  zona={stage} x={px} cp={m.read(S, "cp", 1)} vite={m.read(S, "lives", 1)} punti={m.read(S, "score", 4)}')
    if tf & 0x80:
        m.run(30); m.shot(f'{OUT}/rom_{shots:02d}_finale.png'); break
print('FLAGS', hex(seen), 'OK' if seen & 0x80 and not seen & 0x40 else 'NON COMPLETATO')
