import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from mdrun import MD, symbols
OUT = sys.argv[1]; rom = sys.argv[2] if len(sys.argv) > 2 else 'build/jeeg.bin'
m = MD(rom); m.run(90); m.shot(OUT + '/md_01_title.png')
m.press('START'); m.run(4); m.press(); m.run(60); m.shot(OUT + '/md_02_start.png')
m.press('RIGHT'); m.run(80); m.shot(OUT + '/md_03_walk.png')
m.press('RIGHT', 'A'); m.run(6); m.press('RIGHT'); m.run(3); m.shot(OUT + '/md_04_punch.png')
m.press('B'); m.run(14); m.shot(OUT + '/md_05_jump.png'); m.press(); m.run(30)
