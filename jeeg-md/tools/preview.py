"""Anteprima dei fotogrammi convertiti nella palette Mega Drive (per controllo visivo)."""
import sys, os
sys.argv = [os.path.abspath('tools/convert.py')]
src = open('tools/convert.py').read().split('# ---------- palette sprite ----------')[0]
src = src.replace("os.path.dirname(os.path.dirname(os.path.abspath(__file__)))", repr(os.getcwd()))
exec(src)
names = sys.stdin.read().split()
tiles = []
for n in names:
    it = man[n]; grp = it['group']
    if grp in PALS:
        pal = [md_rgb(hx(c)) for c in PALS[grp]]
    else:
        pal = quantize_bg(Image.open(f'res/png/{n}.png'), 15, False)
    m = index_image(Image.open(f'res/png/{n}.png'), pal)
    im = Image.new('RGB', (it['w'], it['h']), (120, 140, 170)); px = im.load()
    for y in range(it['h']):
        for x in range(it['w']):
            if m[y][x]: px[x, y] = pal[m[y][x] - 1]
    tiles.append(im.resize((it['w'] * 2, it['h'] * 2), Image.NEAREST))
sheet = Image.new('RGB', (1600, 1000), (40, 40, 60)); x = y = 0; rowh = 0
for t in tiles:
    if x + t.width > 1600: x = 0; y += rowh + 4; rowh = 0
    sheet.paste(t, (x, y)); x += t.width + 4; rowh = max(rowh, t.height)
sheet = sheet.crop((0, 0, 1600, min(1000, y + rowh)))
sheet.save(os.environ.get('OUT', '/tmp/preview.png'))
