/* md.c — driver hardware Mega Drive scritto da zero (VDP, sprite, joypad, PSG, SRAM). */
#include "md.h"

volatile u32 vblank_count;
static u8 vdp_reg1 = 0x34;

void vdp_set_reg(u8 reg, u8 val) { VDP_CTRL = 0x8000 | ((u16)reg << 8) | val; if (reg == 1) vdp_reg1 = val; }
void vdp_vram_addr(u16 a) { VDP_CTRL32 = 0x40000000UL | ((u32)(a & 0x3FFF) << 16) | (a >> 14); }
void vdp_cram_addr(u16 a) { VDP_CTRL32 = 0xC0000000UL | ((u32)(a & 0x3FFF) << 16) | (a >> 14); }
void vdp_vsram_addr(u16 a) { VDP_CTRL32 = 0x40000010UL | ((u32)(a & 0x3FFF) << 16) | (a >> 14); }

void vdp_init(void) {
  static const u8 regs[24] = {
    0x04, /* 0: HInt off */
    0x34, /* 1: display off, VInt on, DMA on, V28 */
    VRAM_PLANE_A >> 10, VRAM_WINDOW >> 10, VRAM_PLANE_B >> 13, VRAM_SAT >> 9,
    0x00, 0x00, 0x00, 0x00, 0xFF,
    0x00, /* 11: scroll piano intero */
    0x81, /* 12: H40 (320 px), no interlace */
    VRAM_HSCROLL >> 10, 0x00, 0x02, /* 15: autoincremento 2 */
    0x01, /* 16: piani 64x32 */
    0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x80 };
  (void)VDP_CTRL;
  for (u8 i = 0; i < 24; i++) vdp_set_reg(i, regs[i]);
  /* azzera VRAM, CRAM, VSRAM */
  vdp_vram_addr(0); for (u16 i = 0; i < 0x8000; i++) VDP_DATA = 0;
  vdp_cram_addr(0); for (u16 i = 0; i < 64; i++) VDP_DATA = 0;
  vdp_vsram_addr(0); for (u16 i = 0; i < 40; i++) VDP_DATA = 0;
}
void vdp_display(u8 on) { vdp_set_reg(1, on ? (vdp_reg1 | 0x40) : (vdp_reg1 & ~0x40)); }

void vdp_wait_vblank(void) { u32 v = vblank_count; while (vblank_count == v) {} }

void vdp_load_tiles(const u32 *data, u16 tile_index, u16 count) {
  vdp_vram_addr(tile_index * 32);
  const u16 *d = (const u16 *)data; u16 n = count * 16;
  while (n--) VDP_DATA = *d++;
}
/* DMA ROM/RAM -> VRAM (molto più veloce, usata in VBlank per i frame degli sprite) */
void vdp_load_tiles_dma(const u32 *data, u16 tile_index, u16 count) {
  u32 src = ((u32)data) >> 1; u16 len = count * 16;
  vdp_set_reg(19, len & 0xFF); vdp_set_reg(20, len >> 8);
  vdp_set_reg(21, src & 0xFF); vdp_set_reg(22, (src >> 8) & 0xFF); vdp_set_reg(23, (src >> 16) & 0x7F);
  u16 a = tile_index * 32;
  VDP_CTRL = 0x4000 | (a & 0x3FFF);
  VDP_CTRL = 0x0080 | (a >> 14);
}
void vdp_load_palette(u8 pal, const u16 *c, u8 count) { vdp_cram_addr(pal * 32); for (u8 i = 0; i < count; i++) VDP_DATA = c[i]; }
void vdp_set_color(u8 idx, u16 col) { vdp_cram_addr(idx * 2); VDP_DATA = col; }
void vdp_fill_plane(u16 plane, u16 attr) { vdp_vram_addr(plane); for (u16 i = 0; i < PLANE_W * PLANE_H; i++) VDP_DATA = attr; }
void vdp_set_tile(u16 plane, u16 x, u16 y, u16 attr) { vdp_vram_addr(plane + ((y & (PLANE_H - 1)) * PLANE_W + (x & (PLANE_W - 1))) * 2); VDP_DATA = attr; }
void vdp_hscroll(s16 a, s16 b) { vdp_vram_addr(VRAM_HSCROLL); VDP_DATA = (u16)a; VDP_DATA = (u16)b; }
void vdp_vscroll(s16 a, s16 b) { vdp_vsram_addr(0); VDP_DATA = (u16)a; VDP_DATA = (u16)b; }

/* ---- sprite ---- */
static u16 sat[80 * 4];
static u8 nspr;
void spr_clear(void) { nspr = 0; }
u8 spr_count(void) { return nspr; }
void spr_add(s16 x, s16 y, u8 w, u8 h, u16 attr) {
  if (nspr >= 80) return;
  if (x <= -32 || x >= 320 || y <= -32 || y >= 224) return;
  u16 *s = &sat[nspr * 4];
  s[0] = (u16)(y + 128) & 0x3FF;
  s[1] = (((w - 1) & 3) << 10) | (((h - 1) & 3) << 8) | (nspr + 1);
  s[2] = attr;
  s[3] = (u16)(x + 128) & 0x1FF;
  nspr++;
}
void spr_flush(void) {
  if (nspr == 0) { sat[0] = 0; sat[1] = 0; sat[2] = 0; sat[3] = 0; nspr = 1; }
  sat[(nspr - 1) * 4 + 1] &= 0xFF00; /* ultimo: link 0 */
  vdp_vram_addr(VRAM_SAT);
  for (u16 i = 0; i < nspr * 4; i++) VDP_DATA = sat[i];
}

/* ---- joypad 3/6 pulsanti, porta 1 ---- */
u16 pad_read(void) {
  volatile u8 *data = (volatile u8 *)0xA10003, *ctrl = (volatile u8 *)0xA10009;
  *ctrl = 0x40;
  *data = 0x40; __asm__ volatile("nop\n nop");
  u8 hi = *data;               /* ? 1 C B R L D U */
  *data = 0x00; __asm__ volatile("nop\n nop");
  u8 lo = *data;               /* ? 0 S A 0 0 D U */
  u16 r = 0;
  if (!(hi & 0x01)) r |= BTN_UP; if (!(hi & 0x02)) r |= BTN_DOWN;
  if (!(hi & 0x04)) r |= BTN_LEFT; if (!(hi & 0x08)) r |= BTN_RIGHT;
  if (!(hi & 0x10)) r |= BTN_B; if (!(hi & 0x20)) r |= BTN_C;
  if (!(lo & 0x10)) r |= BTN_A; if (!(lo & 0x20)) r |= BTN_START;
  /* 6 pulsanti: X Y Z MODE */
  *data = 0x40; *data = 0x00; *data = 0x40; *data = 0x00; __asm__ volatile("nop\n nop");
  u8 c = *data;
  if ((c & 0x0F) == 0) {
    *data = 0x40; __asm__ volatile("nop\n nop"); u8 e = *data;
    if (!(e & 0x01)) r |= BTN_Z; if (!(e & 0x02)) r |= BTN_Y; if (!(e & 0x04)) r |= BTN_X; if (!(e & 0x08)) r |= BTN_MODE;
  }
  *data = 0x40;
  return r;
}

/* ---- PSG SN76489 ---- */
void psg_tone(u8 ch, u16 period, u8 vol) {
  PSG_PORT = 0x80 | (ch << 5) | (period & 0x0F);
  PSG_PORT = (period >> 4) & 0x3F;
  PSG_PORT = 0x90 | (ch << 5) | (vol & 0x0F);
}
void psg_noise(u8 mode, u8 vol) { PSG_PORT = 0xE0 | (mode & 7); PSG_PORT = 0xF0 | (vol & 0x0F); }
void psg_silence(void) { for (u8 c = 0; c < 4; c++) PSG_PORT = 0x9F | (c << 5); }

/* ---- SRAM (byte dispari 0x200001..) ---- */
void sram_write(u16 off, u8 v) { *(volatile u8 *)0xA130F1 = 1; *(volatile u8 *)(0x200001UL + ((u32)off << 1)) = v; *(volatile u8 *)0xA130F1 = 0; }
u8 sram_read(u16 off) { *(volatile u8 *)0xA130F1 = 1; u8 v = *(volatile u8 *)(0x200001UL + ((u32)off << 1)); *(volatile u8 *)0xA130F1 = 0; return v; }

void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }

/* aritmetica 32 bit per 68000 (libgcc del toolchain linux è per 68020) */
u32 __udivsi3(u32 n, u32 d) { u32 q = 0, r = 0; for (s8 i = 31; i >= 0; i--) { r = (r << 1) | ((n >> i) & 1); if (r >= d) { r -= d; q |= 1UL << i; } } return q; }
u32 __umodsi3(u32 n, u32 d) { u32 r = 0; for (s8 i = 31; i >= 0; i--) { r = (r << 1) | ((n >> i) & 1); if (r >= d) r -= d; } return r; }
s32 __divsi3(s32 n, s32 d) { u8 neg = 0; if (n < 0) { n = -n; neg ^= 1; } if (d < 0) { d = -d; neg ^= 1; } s32 q = __udivsi3(n, d); return neg ? -q : q; }
s32 __modsi3(s32 n, s32 d) { u8 neg = n < 0; if (n < 0) n = -n; if (d < 0) d = -d; s32 r = __umodsi3(n, d); return neg ? -r : r; }
