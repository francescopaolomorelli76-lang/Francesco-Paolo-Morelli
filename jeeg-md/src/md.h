/* md.h — hardware Mega Drive: VDP, joypad, PSG, SRAM. Nessuna libreria esterna. */
#ifndef MD_H
#define MD_H
typedef unsigned char u8; typedef signed char s8;
typedef unsigned short u16; typedef signed short s16;
typedef unsigned long u32; typedef signed long s32;

#define VDP_DATA  (*(volatile u16*)0xC00000)
#define VDP_CTRL  (*(volatile u16*)0xC00004)
#define VDP_CTRL32 (*(volatile u32*)0xC00004)
#define PSG_PORT  (*(volatile u8*)0xC00011)

/* mappa VRAM */
#define VRAM_PLANE_A   0xC000
#define VRAM_PLANE_B   0xE000
#define VRAM_WINDOW    0xB000
#define VRAM_SAT       0xF800
#define VRAM_HSCROLL   0xFC00
#define PLANE_W 64
#define PLANE_H 32

#define BTN_UP 0x0001
#define BTN_DOWN 0x0002
#define BTN_LEFT 0x0004
#define BTN_RIGHT 0x0008
#define BTN_B 0x0010
#define BTN_C 0x0020
#define BTN_A 0x0040
#define BTN_START 0x0080
#define BTN_Z 0x0100
#define BTN_Y 0x0200
#define BTN_X 0x0400
#define BTN_MODE 0x0800

#define TILE_ATTR(pal, prio, vf, hf, idx) ((u16)(((prio)<<15)|((pal)<<13)|((vf)<<12)|((hf)<<11)|(idx)))

extern volatile u32 vblank_count;

void vdp_init(void);
void vdp_set_reg(u8 reg, u8 val);
void vdp_wait_vblank(void);
void vdp_vram_addr(u16 addr);
void vdp_cram_addr(u16 addr);
void vdp_vsram_addr(u16 addr);
void vdp_load_tiles(const u32 *data, u16 tile_index, u16 count);
void vdp_load_tiles_dma(const u32 *data, u16 tile_index, u16 count);
void vdp_load_palette(u8 pal, const u16 *colors, u8 count);
void vdp_set_color(u8 idx, u16 col);
void vdp_fill_plane(u16 plane, u16 attr);
void vdp_set_tile(u16 plane, u16 x, u16 y, u16 attr);
void vdp_hscroll(s16 a, s16 b);
void vdp_vscroll(s16 a, s16 b);
void vdp_display(u8 on);

/* sprite hardware (tabella in RAM, inviata a ogni frame) */
void spr_clear(void);
void spr_add(s16 x, s16 y, u8 w, u8 h, u16 attr); /* w,h in tile (1..4) */
void spr_flush(void);
u8 spr_count(void);

u16 pad_read(void);
void psg_tone(u8 ch, u16 period, u8 vol);
void psg_noise(u8 mode, u8 vol);
void psg_silence(void);

void sram_write(u16 off, u8 v);
u8 sram_read(u16 off);

void *memset(void *d, int c, unsigned long n);
void *memcpy(void *d, const void *s, unsigned long n);
#endif
