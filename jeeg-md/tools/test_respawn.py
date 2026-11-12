"""Morte forzata (vita=1 scritta in RAM) dopo il checkpoint 1 e i guanti: verifica respawn e stato conservato."""
import sys, os, ctypes as C; sys.path.insert(0, os.path.dirname(__file__))
from mdrun import MD, symbols
S = symbols('build/out.elf'); m = MD('build/jeeg_nogod.bin')
def poke16(name, off, v):
    p = m.core.retro_get_memory_data(2); a = S[name] - 0xFF0000 + off
    buf = (C.c_ubyte * 65536).from_address(p)
    hi, lo = (v >> 8) & 255, v & 255
    buf[a ^ 1] = hi; buf[(a + 1) ^ 1] = lo   # RAM a byte scambiati
hp = lambda: m.read(S, 'P', 2, True) if False else int.from_bytes(m.ram()[S['P'] - 0xFF0000 + 20:S['P'] - 0xFF0000 + 22], 'big', signed=True)
done = False
for f in range(60 * 60):
    m.run(1)
    if f % 10: continue
    if not done and m.read(S, 'test_flags', 1) & 1 and m.read(S, 'cp', 1) >= 1 and m.read(S, 'state', 1) == 2:
        print('prima: vite', m.read(S, 'lives', 1), 'cp', m.read(S, 'cp', 1), 'guanti', m.read(S, 'gloves', 1), 'hp', hp())
        done = True; t0 = f
    if done and m.read(S, 'lives', 1) == 3 and m.read(S, 'state', 1) == 2 and hp() > 1: poke16('P', 20, 1)
    if done and m.read(S, 'lives', 1) == 2:
        m.run(30)
        x = m.read(S, 'P', 4, True) >> 4
        print('dopo: vite', m.read(S, 'lives', 1), 'cp', m.read(S, 'cp', 1), 'guanti', m.read(S, 'gloves', 1), 'hp', hp(), 'x', x, 'forma', m.ram()[S['P'] - 0xFF0000 + 18])
        m.shot('/tmp/claude-0/-home-user-Francesco-Paolo-Morelli/74d59ab9-7d76-5f88-9c6c-350787858967/scratchpad/respawn.png')
        ok = m.read(S, 'gloves', 1) == 1 and x < 1100
        print('PASS' if ok else 'FAIL'); break
