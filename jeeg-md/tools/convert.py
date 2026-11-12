"""Converte i PNG in dati Mega Drive (build/assets.c / assets.h):
palette a 9 bit, tile 8x8 a 4 bit, sprite composti (meta-sprite), mappe dei piani con tile deduplicati, font 8x8."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = os.path.join(ROOT, 'res/png'); OUTC = os.path.join(ROOT, 'build/assets.c'); OUTH = os.path.join(ROOT, 'build/assets.h')
man = json.load(open(os.path.join(PNG, 'manifest.json')))

def hx(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def snap(c): return tuple(round(v / 255 * 7) for v in c)
def mdword(c): r, g, b = snap(c); return (b << 9) | (g << 5) | (r << 1)
def md_rgb(c): return tuple(v * 36 for v in snap(c))

# palette fisse degli sprite (indice 0 = trasparente)
PALS = {
    'pA': ['#1b1020', '#f5eecd', '#d8cb98', '#d42f28', '#9e1f1c', '#f3c69a', '#d99a6c', '#3a1d14', '#f6e04a', '#c9a224', '#8e90a9', '#686a85', '#58c8cf', '#2f9a3a', '#ffffff'],
    'eA': ['#1b1020', '#f0e7c9', '#cfc29a', '#e2bf72', '#b8913f', '#6b3c8c', '#2e6b57', '#1f4a3c', '#dcd3ea', '#d13447', '#d7dbe4', '#6b4a2a', '#ffe14a', '#ffffff', '#ff8a2a'],
    'pB': ['#1b1020', '#2e3440', '#24342c', '#d9cf3a', '#f2a428', '#c97b17', '#dcd5ec', '#a99fc4', '#d92b2b', '#d9dce6', '#a9aec0', '#353a52', '#ffffff', '#2b48b8', '#88d4ea'],
    'eB': ['#1b1020', '#c7774a', '#8f5535', '#e3a173', '#8a5a34', '#5e3a20', '#c79a62', '#3e2a1e', '#6a4428', '#f0a030', '#d42f28', '#a9c4b8', '#ffffff', '#ffe14a', '#9fd8ff'],
}
HUD_FIXED = ['#2f9a3a', '#1b1020', '#ffe14a', '#ffffff']  # PAL0 indici 12..15

def nearest(pal_rgb, c):
    best, bi = 1e18, 1
    for i, p in enumerate(pal_rgb):
        d = (p[0] - c[0]) ** 2 * 3 + (p[1] - c[1]) ** 2 * 4 + (p[2] - c[2]) ** 2 * 2
        if d < best: best, bi = d, i
    return bi

def index_image(im, pal_rgb, base=1, transparent=True):
    """pal_rgb = colori per gli indici base..; restituisce matrice di indici."""
    im = im.convert('RGBA'); w, h = im.size; px = im.load(); cache = {}
    out = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if transparent and a < 128: continue
            k = (r, g, b)
            if k not in cache: cache[k] = nearest(pal_rgb, k) + base
            out[y][x] = cache[k]
    return out

def tile_bytes(m, tx, ty):
    words = []
    for y in range(8):
        v = 0
        for x in range(8): v = (v << 4) | (m[ty * 8 + y][tx * 8 + x] & 15)
        words.append(v)
    return tuple(words)

def flip_h(t): return tuple(int(('%08x' % w)[::-1], 16) for w in t)
def flip_v(t): return tuple(reversed(t))

C = ['#include "assets.h"', '']
H = ['#ifndef ASSETS_H', '#define ASSETS_H', '#include "md.h"',
     'typedef struct { s16 dx, dy; u8 w, h; u16 tile; } SprPart;',
     'typedef struct { const u32 *tiles; u16 ntiles; u8 nparts; const SprPart *parts; } Frame;',
     'typedef struct { const u32 *tiles; u16 ntiles; const u16 *map; u16 w, h; const u16 *pal; } Image;', '']

def emit_u32(name, words):
    C.append(f'const u32 {name}[{max(1, len(words))}] __attribute__((aligned(2))) = {{')
    for i in range(0, len(words), 8): C.append('  ' + ','.join('0x%08X' % w for w in words[i:i + 8]) + ',')
    if not words: C.append('0')
    C.append('};')

def emit_u16(name, vals):
    C.append(f'const u16 {name}[{max(1, len(vals))}] = {{')
    for i in range(0, len(vals), 16): C.append('  ' + ','.join('0x%04X' % v for v in vals[i:i + 16]) + ',')
    if not vals: C.append('0')
    C.append('};')

# ---------- palette sprite ----------
for k, cols in PALS.items():
    words = [0] + [mdword(hx(c)) for c in cols]
    words += [0] * (16 - len(words)); emit_u16('pal_' + k, words); H.append(f'extern const u16 pal_{k}[16];')

# ---------- sprite ----------
stats = {}
for name, it in man.items():
    if it['bg']: continue
    grp = it['group']; pal = [md_rgb(hx(c)) for c in PALS[grp]]
    im = Image.open(os.path.join(PNG, name + '.png'))
    m = index_image(im, pal)
    w, h = it['w'], it['h']; ax, ay = it['ax'], it['ay']
    xs = [x for y in range(h) for x in range(w) if m[y][x]]; ys = [y for y in range(h) for x in range(w) if m[y][x]]
    if not xs: xs, ys = [0], [0]
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    tw, th = (x1 - x0 + 7) // 8, (y1 - y0 + 7) // 8
    crop = [[0] * (tw * 8) for _ in range(th * 8)]
    for y in range(th * 8):
        for x in range(tw * 8):
            sx, sy = x0 + x, y0 + y
            if sx < w and sy < h: crop[y][x] = m[sy][sx]
    words, parts = [], []
    for cx in range(0, tw, 4):
        for cy in range(0, th, 4):
            pw, ph = min(4, tw - cx), min(4, th - cy)
            # salta blocchi completamente vuoti
            if all(crop[y][x] == 0 for y in range(cy * 8, (cy + ph) * 8) for x in range(cx * 8, (cx + pw) * 8)): continue
            parts.append((x0 + cx * 8 - ax, y0 + cy * 8 - ay, pw, ph, len(words) // 8))
            for i in range(pw):
                for j in range(ph): words += tile_bytes(crop, cx + i, cy + j)
    cname = 'spr_' + name
    emit_u32(cname + '_t', words)
    C.append(f'static const SprPart {cname}_p[{max(1, len(parts))}] = {{' + ','.join('{%d,%d,%d,%d,%d}' % p for p in parts) + '};')
    C.append(f'const Frame {cname} = {{ {cname}_t, {len(words) // 8}, {len(parts)}, {cname}_p }};')
    H.append(f'extern const Frame {cname};')
    stats[name] = (len(words) // 8, len(parts))

# ---------- immagini (piani) ----------
def quantize_bg(im, ncol, transparent, weighted=False):
    rgba = im.convert('RGBA'); rgb = Image.new('RGB', im.size, (0, 0, 0)); rgb.paste(rgba, mask=rgba.split()[3])
    # quantizzazione pesata per colori distinti (radice del conteggio): anche le aree piccole
    # come i volti mantengono il loro colore
    import math
    if not weighted:
        q = rgb.quantize(colors=ncol, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal = q.getpalette()[:ncol * 3]
        cols = [md_rgb((pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2])) for i in range(ncol)]
        uniq = []
        for c in cols:
            if c not in uniq: uniq.append(c)
        return uniq
    cnt = rgb.getcolors(1 << 24) or []
    if transparent:
        alpha = rgba.split()[3]; mask_cnt = {}
        for (r, g, b, a), n in [(c, n) for n, c in (rgba.getcolors(1 << 24) or [])]:
            if a >= 128: mask_cnt[(r, g, b)] = mask_cnt.get((r, g, b), 0) + n
        cnt = [(n, c) for c, n in mask_cnt.items()]
    pix = []
    for n, c in cnt: pix += [c] * max(1, int(math.sqrt(n)))
    side = int(math.ceil(math.sqrt(len(pix)))); sample = Image.new('RGB', (side, side), pix[0] if pix else (0, 0, 0))
    sample.putdata(pix + [pix[0]] * (side * side - len(pix)))
    q = sample.quantize(colors=ncol, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[:ncol * 3]
    cols = [md_rgb((pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2])) for i in range(ncol)]
    # rimuovi duplicati dopo lo snap
    uniq = []
    for c in cols:
        if c not in uniq: uniq.append(c)
    return uniq

def emit_image(name, im, base_pal_index, ncol, transparent, fixed=None, weighted=False):
    cols = quantize_bg(im, ncol, transparent, weighted)
    m = index_image(im, cols, base=1, transparent=transparent)
    w, h = im.size; tw, th = w // 8, h // 8
    tiles, lookup, mp = [tuple([0] * 8)], {tuple([0] * 8): (0, 0, 0)}, []
    for ty in range(th):
        for tx in range(tw):
            t = tile_bytes(m, tx, ty)
            if t in lookup:
                i, hf, vf = lookup[t]
            else:
                i = len(tiles); tiles.append(t); hf = vf = 0
                lookup.setdefault(t, (i, 0, 0)); lookup.setdefault(flip_h(t), (i, 1, 0))
                lookup.setdefault(flip_v(t), (i, 0, 1)); lookup.setdefault(flip_v(flip_h(t)), (i, 1, 1))
            mp.append((vf << 12) | (hf << 11) | i)
    words = [w for t in tiles for w in t]
    palw = [0] + [mdword(c) for c in cols]
    if fixed:
        palw += [0] * (16 - len(fixed) - len(palw)); palw += [mdword(hx(c)) for c in fixed]
    palw += [0] * (16 - len(palw))
    emit_u32(name + '_t', words); emit_u16(name + '_m', mp); emit_u16(name + '_pal', palw[:16])
    C.append(f'const Image {name} = {{ {name}_t, {len(tiles)}, {name}_m, {tw}, {th}, {name}_pal }};')
    H.append(f'extern const Image {name};')
    stats[name] = (len(tiles), tw)

for name, it in man.items():
    if not it['bg']: continue
    im = Image.open(os.path.join(PNG, name + '.png'))
    if name.startswith('bgB'): emit_image('img_' + name, im, 0, 11, False, fixed=HUD_FIXED)
    elif name.startswith('bgA'): emit_image('img_' + name, im, 1, 15, True)
    else: emit_image('img_' + name, im, 1, 15, False, weighted=True)

# ---------- font 8x8 (PAL0: 15 bianco, 14 giallo, 13 ombra) ----------
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 9)
fw = []
for col in (15, 14):
    for ch in range(32, 96):
        img = Image.new('L', (8, 8), 0); d = ImageDraw.Draw(img); tw = d.textlength(chr(ch), font=font); d.text(((8 - tw) / 2, -2), chr(ch), fill=255, font=font)
        px = img.load(); mtx = [[0] * 8 for _ in range(8)]
        for y in range(8):
            for x in range(8):
                if px[x, y] > 110: mtx[y][x] = col
        for y in range(8):
            for x in range(8):
                if mtx[y][x] == col:
                    for dx, dy in ((1, 0), (0, 1), (1, 1)):
                        if x + dx < 8 and y + dy < 8 and mtx[y + dy][x + dx] == 0: mtx[y + dy][x + dx] = 13
        fw += tile_bytes(mtx, 0, 0)
emit_u32('font_tiles', fw); H.append('extern const u32 font_tiles[];'); H.append('#define FONT_TILES 128')
# barre HUD: 9 livelli x 2 colori (12 verde, 14 giallo), bordo 13
bw = []
for col in (12, 14):
    for lv in range(9):
        mtx = [[13 if y in (1, 6) else 0 for x in range(8)] for y in range(8)]
        for y in range(2, 6):
            for x in range(8): mtx[y][x] = col if x < lv else 13
        bw += tile_bytes(mtx, 0, 0)
emit_u32('bar_tiles', bw); H.append('extern const u32 bar_tiles[];')

H.append('#endif')
open(OUTC, 'w').write('\n'.join(C) + '\n'); open(OUTH, 'w').write('\n'.join(H) + '\n')
tot = sum(v[0] for v in stats.values())
print('frames/immagini', len(stats), 'tile totali', tot, 'KB', tot * 32 // 1024)
for k in ('hiro_idle0', 'jeeg_idle0', 'dor_idle0', 'giant_idle0', 'img_bgA_A', 'img_bgA_B', 'img_bgB_A', 'img_bgB_B', 'img_scr_title', 'img_scr_miwa'):
    print(' ', k, stats.get(k))
print('max tile frame sprite:', max((v[0], k) for k, v in stats.items() if not k.startswith('img')))
