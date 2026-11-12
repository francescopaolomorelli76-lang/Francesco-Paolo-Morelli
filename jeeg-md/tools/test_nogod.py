"""Partita del bot SENZA invulnerabilità: verifica danni, morti, respawn al checkpoint e SRAM."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from mdrun import MD, symbols
import ctypes as C
S = symbols('build/out.elf'); m = MD(sys.argv[1] if len(sys.argv) > 1 else 'build/jeeg_nogod.bin')
prev_lives = None; deaths = []
for f in range(60 * 60 * 5):
    m.run(1)
    if f % 20: continue
    lives = m.read(S, 'lives', 1); cp = m.read(S, 'cp', 1); tf = m.read(S, 'test_flags', 1)
    if prev_lives is not None and lives < prev_lives:
        x = m.read(S, 'P', 4, True) >> 4
        deaths.append((round(f / 60), cp, x)); print(f'{f/60:6.1f}s  vita persa -> vite={lives}, respawn al checkpoint {cp} (x={x})')
    prev_lives = lives
    if tf & 0x80: print(f'{f/60:6.1f}s  livello completato senza invulnerabilità'); break
    if lives == 0 and m.read(S, 'state', 1) == 4: print(f'{f/60:6.1f}s  GAME OVER (cp {cp})'); break
m.core.retro_get_memory_data.restype = C.c_void_p
p = m.core.retro_get_memory_data(0); n = m.core.retro_get_memory_size(0)
sram = C.string_at(p, min(n, 32)) if p else b''
print('SRAM', n, 'byte, inizio:', sram[:16].hex())
print('flags', hex(m.read(S, 'test_flags', 1)), 'morti', deaths)
