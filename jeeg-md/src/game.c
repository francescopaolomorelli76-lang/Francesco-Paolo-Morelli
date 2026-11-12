/* game.c — JEEG ROBOT D'ACCIAIO, Livello 1 per Mega Drive / Genesis.
 * Zona A (circuito, scala umana): Hiroshi, soldati Haniwa, guanti, trasformazione cyborg.
 * Zona B (zona dei giganti): BUILD UP col Big Shooter, Jeeg, Haniwa giganti, boss Haniwa Genjin Doroma. */
#include "game.h"

/* ================= MAPPA VRAM (indici tile) ================= */
#define T_FONT 1      /* 128 tile: bianco 1..64, giallo 65..128 (sfondo scuro) */
#define T_BAR 129     /* 27 tile barre (giallo, rosso, ciano) */
#define T_SOLID 156
#define T_BG 160      /* fondali / schermate */
#define T_MAX 1408

/* ================= DATI LIVELLO ================= */
#define GATE_A 2176
#define WIDTH_A 2240
#define ARENA_X0 1376
#define ARENA_X1 1696
#define WIDTH_B 1728
#define GROUND 200

static const Plat platA[] = {
  { 336, 148, 96, 52, 0 }, { 512, 120, 120, 10, 1 }, { 720, 156, 72, 44, 0 }, { 1136, 128, 144, 10, 1 },
  { 1328, 72, 112, 10, 1 }, { 1488, 160, 168, 40, 0 }, { 1792, 152, 88, 48, 0 }, { 1936, 108, 128, 10, 1 } };
static const Plat platB[] = { { 372, 148, 104, 52, 0 }, { 772, 116, 120, 10, 1 }, { 1012, 152, 88, 48, 0 } };
static const EnemyDef enA[] = {
  { E_SOLDIER, 448, GROUND, 0 }, { E_SOLDIER, 656, GROUND, 0 }, { E_LANCER, 864, GROUND, 0 }, { E_SOLDIER, 1080, GROUND, 0 },
  { E_SOLDIER, 1232, GROUND, 0 }, { E_LANCER, 1384, 72, 0 }, { E_SOLDIER, 1720, GROUND, 1 }, { E_LANCER, 1904, GROUND, 1 },
  { E_SOLDIER, 2016, GROUND, 1 }, { E_SOLDIER, 2096, GROUND, 1 } };
static const EnemyDef enB[] = { { E_GIANT, 272, GROUND, 0 }, { E_GSHOOT, 592, GROUND, 0 }, { E_GIANT, 832, GROUND, 0 }, { E_GIANT, 1092, GROUND, 0 }, { E_GSHOOT, 1172, GROUND, 0 } };
static const ItemDef itA[] = { { IT_HEALTH, 752, 156 }, { IT_HEALTH, 1384, 72 } };
static const ItemDef itB[] = { { IT_ENERGY, 424, 148 }, { IT_HEALTH, 832, 116 }, { IT_ENERGY, 872, 116 }, { IT_ENERGY, 1312, GROUND }, { IT_HEALTH, 1056, 152 } };
#define GLOVES_X 1568
#define GLOVES_Y 160
static const s16 CPX[4] = { 72, 944, 60, 1212 };

/* statistiche delle forme: velocità, salto, gravità (1/16 px per frame), box, raggio d'attacco */
static const s16 F_SPEED[3] = { 54, 64, 44 }, F_JUMP[3] = { 145, 158, 118 }, F_GRAV[3] = { 6, 7, 6 };
static const s16 F_W[3] = { 22, 24, 44 }, F_H[3] = { 68, 74, 118 }, F_REACH[3] = { 29, 34, 56 };
static const u8 F_DMG[3][3] = { { 1, 1, 2 }, { 2, 2, 3 }, { 2, 2, 4 } };

/* ================= STATO GLOBALE ================= */
Player P; Enemy EN[MAX_EN]; Proj PR[MAX_PR]; Fx FXS[MAX_FX]; Item IT[MAX_IT];
u16 joy, joyPrev, joyPress; u32 score; s8 lives; u8 stage, cp, gloves; s16 camX;
static u8 state, demo, god; static u16 stateT, frameNo;
static char msgBuf[41]; static u16 msgT; static s16 shake; static u8 flashT;
static u8 arenaLocked, bossStarted, ambushDone, gateWarn; static u16 buildT; static u8 buildOn;
static u16 kills, playFrames; static u8 pendA, pendB; static u16 winT;
static const Plat *plats; static u8 nplats; static s16 worldW;
static u8 sceneId; static u16 sceneLen; static void (*sceneNext)(void);
static u8 enEnergyTick;
u8 test_flags; /* letto dai test automatici */

static struct { Body b; s16 hp; u8 state, phase, alive, active; u16 at; s16 inv; u8 flash, hitDone, shots, shotT, last, atkHit; u16 deadT; } B;
#define BOSS_HP 70

/* ================= DMA E CACHE DEI FOTOGRAMMI ================= */
typedef struct { const u32 *src; u16 tile, count; } DmaReq;
static DmaReq dq[16]; static u8 ndq; static u16 dmaBytes;
static u8 queue_dma(const u32 *src, u16 tile, u16 count) {
  if (ndq >= 16 || (dmaBytes && dmaBytes + count * 32 > 7200) || count * 32 > 11000) return 0;
  dq[ndq].src = src; dq[ndq].tile = tile; dq[ndq].count = count; ndq++; dmaBytes += count * 32; return 1;
}
static void flush_dma(void) {
  for (u8 i = 0; i < ndq; i++) {
    u32 s = (u32)dq[i].src; u16 cnt = dq[i].count; u16 t = dq[i].tile;
    /* il DMA non può attraversare un confine di 128 KB */
    u32 room = (0x20000UL - (s & 0x1FFFFUL)) >> 5;
    if (room < cnt) { vdp_load_tiles_dma((const u32 *)s, t, (u16)room); s += room << 5; t += room; cnt -= room; }
    if (cnt) vdp_load_tiles_dma((const u32 *)s, t, cnt);
  }
  ndq = 0; dmaBytes = 0;
}
typedef struct { const Frame *f; u16 base, size, used; } Slot;
static Slot slots[8]; static u8 nslots;
static Slot *playerSlot;
static void slots_reset(void) { nslots = 0; }
static Slot *slot_new(u16 base, u16 size) { Slot *s = &slots[nslots++]; s->f = 0; s->base = base; s->size = size; s->used = 0xFFFF; return s; }
/* restituisce la base VRAM del fotogramma (caricandolo se serve) o 0xFFFF */
static u16 slot_get(u8 first, u8 n, const Frame *f) {
  for (u8 i = first; i < first + n; i++) if (slots[i].f == f) { slots[i].used = frameNo; return slots[i].base; }
  for (u8 i = first; i < first + n; i++) {
    Slot *s = &slots[i];
    if (s->used != frameNo && s->size >= f->ntiles) {
      if (!queue_dma(f->tiles, s->base, f->ntiles)) return 0xFFFF;
      s->f = f; s->used = frameNo; return s->base;
    }
  }
  return 0xFFFF;
}
/* fotogrammi statici precaricati */
typedef struct { const Frame *f; u16 base; } Static;
static Static statics[24]; static u8 nstatics; static u16 tNext;
/* aree VRAM libere oltre a quella principale: resto della tabella finestra (righe 4+),
 * metà alta della tabella del piano A (64x32 usa solo 4 KB), spazio prima della tabella sprite */
static u16 poolCur[4], poolEnd[4];
static void pools_reset(void) { poolCur[0] = tNext; poolEnd[0] = T_MAX; poolCur[1] = 1428; poolEnd[1] = 1536; poolCur[2] = 1664; poolEnd[2] = 1792; poolCur[3] = 1920; poolEnd[3] = 1984; }
static u16 alloc_tiles(u16 n) {
  poolCur[0] = tNext > poolCur[0] ? tNext : poolCur[0];
  for (u8 i = 0; i < 4; i++) if (poolEnd[i] - poolCur[i] >= n) { u16 b = poolCur[i]; poolCur[i] += n; if (i == 0) tNext = poolCur[0]; return b; }
  test_flags |= 0x40; return 0xFFFF;
}
static void static_load(const Frame *f) { u16 b = alloc_tiles(f->ntiles); if (b == 0xFFFF) return; statics[nstatics].f = f; statics[nstatics].base = b; nstatics++; vdp_load_tiles(f->tiles, b, f->ntiles); }
static u16 static_base(const Frame *f) { for (u8 i = 0; i < nstatics; i++) if (statics[i].f == f) return statics[i].base; return 0xFFFF; }

static void draw_frame(const Frame *f, u16 base, s16 x, s16 y, s8 face, u8 pal) {
  if (base == 0xFFFF) return;
  for (u8 i = 0; i < f->nparts; i++) {
    const SprPart *p = &f->parts[i];
    s16 sx = face > 0 ? x + p->dx : x - p->dx - p->w * 8;
    spr_add(sx, y + p->dy, p->w, p->h, TILE_ATTR(pal, 0, 0, face < 0, base + p->tile));
  }
}
static void draw_static(const Frame *f, s16 x, s16 y, s8 face, u8 pal) { draw_frame(f, static_base(f), x, y, face, pal); }

/* ================= TESTO / HUD (piano finestra) ================= */
static void put_text(u8 x, u8 y, const char *s, u8 yellow) {
  vdp_vram_addr(VRAM_WINDOW + ((y * 64) + x) * 2);
  while (*s) { char c = *s++; if (c >= 'a' && c <= 'z') c -= 32; if (c < 32 || c > 95) c = 32; VDP_DATA = TILE_ATTR(0, 1, 0, 0, T_FONT + (c - 32) + (yellow ? 64 : 0)); x++; }
}
static void clear_row(u8 y) { vdp_vram_addr(VRAM_WINDOW + y * 128); for (u8 i = 0; i < 40; i++) VDP_DATA = TILE_ATTR(0, 1, 0, 0, T_SOLID); }
static void num_text(char *buf, u32 v, u8 digits) { buf[digits] = 0; for (s8 i = digits - 1; i >= 0; i--) { buf[i] = '0' + (u8)(v % 10); v /= 10; } }
static void put_bar(u8 x, u8 y, s16 v, u8 n, u8 set) { /* v 0..100 su n tile; set 0 giallo 1 rosso 2 ciano */
  vdp_vram_addr(VRAM_WINDOW + ((y * 64) + x) * 2);
  s16 px = (v * (n * 8)) / 100;
  for (u8 i = 0; i < n; i++) { s16 l = px - i * 8; if (l < 0) l = 0; if (l > 8) l = 8; VDP_DATA = TILE_ATTR(0, 1, 0, 0, T_BAR + set * 9 + l); }
}
static u16 tBig, tPor, tIco;
static const char BIGSET[] = "HIROSCYBJEG0123456789x1P";
static void put_big(u8 x, u8 y, const char *str, u8 cyan) {
  for (; *str; str++, x++) {
    u16 t = 0xFFFF; char c = *str;
    if (cyan) { if (c == '1') t = 22; if (c == 'P') t = 23; }
    else { u8 start = (c >= '0' && c <= '9') || c == 'x' ? 11 : 0; for (u8 k = start; k < 22; k++) if (BIGSET[k] == c) { t = k; break; } }
    u16 a0 = t == 0xFFFF ? TILE_ATTR(0, 1, 0, 0, T_SOLID) : TILE_ATTR(0, 1, 0, 0, tBig + t * 2);
    u16 a1 = t == 0xFFFF ? a0 : a0 + 1;
    vdp_vram_addr(VRAM_WINDOW + ((y * 64) + x) * 2); VDP_DATA = a0;
    vdp_vram_addr(VRAM_WINDOW + (((y + 1) * 64) + x) * 2); VDP_DATA = a1;
  }
}
static void put_block(u8 x, u8 y, u8 w, u8 h, u16 base, u8 pal) {
  for (u8 j = 0; j < h; j++) { vdp_vram_addr(VRAM_WINDOW + (((y + j) * 64) + x) * 2); for (u8 i = 0; i < w; i++) VDP_DATA = TILE_ATTR(pal, 1, 0, 0, base + j * w + i); }
}
static void msg(const char *s, u16 frames) { u8 i = 0; while (s[i] && i < 40) { msgBuf[i] = s[i]; i++; } while (i < 40) msgBuf[i++] = ' '; msgBuf[40] = 0; msgT = frames; }
static const char *FORM_NAME[3] = { "HIROSHI", "CYBORG ", "JEEG   " };
static void draw_hud(void) {
  char b[12];
  /* ritratto e nome */
  put_block(0, 0, 4, 4, tPor + (stage == 0 && P.form == FORM_CYBORG ? 16 : 0), 2);
  put_big(5, 0, FORM_NAME[P.form], 0);
  put_block(13, 0, 2, 2, tIco, 2);
  b[0] = 'x'; b[1] = '0'; b[2] = '0' + (lives < 0 ? 0 : lives); b[3] = 0; put_big(15, 0, b, 0);
  put_text(19, 0, "LIVELLO 1-1", 0); put_text(31, 0, "CREDIT 00", 0);
  b[0] = 'C'; b[1] = 'P'; b[2] = '0' + cp; b[3] = '/'; b[4] = '3'; b[5] = ' '; b[6] = 0; put_text(19, 1, b, 1);
  put_text(26, 1, P.form == FORM_JEEG ? (P.beam ? "PROTONICO 35EN" : "GAMMA 15EN    ") : gloves ? (P.form == FORM_HUMAN ? "C:TRASFORMA   " : "C:BUILD UP    ") : "GUANTI: NO    ", 1);
  /* 1P e punteggio */
  put_big(5, 2, "1P", 1); num_text(b, score, 7); put_big(8, 2, b, 0);
  /* destra: boss o messaggi */
  if (B.active && B.alive) {
    put_text(16, 2, "DOROMA       FASE ", 1); b[0] = '0' + B.phase; b[1] = '/'; b[2] = '3'; b[3] = 0; put_text(34, 2, b, 1);
    put_text(16, 3, " ", 0); put_bar(17, 3, (B.hp * 100) / BOSS_HP, 20, 1); put_text(37, 3, "   ", 0);
  } else {
    char t[25];
    for (u8 i = 0; i < 24; i++) t[i] = msgT ? msgBuf[i] : ' '; t[24] = 0; put_text(16, 2, t, 1);
    for (u8 i = 0; i < 24; i++) t[i] = (msgT && i < 16) ? msgBuf[24 + i] : ' '; t[24] = 0; put_text(16, 3, t, 1);
  }
  /* barre: vita (gialla, rossa se bassa) ed energia raggi */
  put_bar(0, 4, P.hp, 16, P.hp > 30 ? 0 : 1);
  put_text(17, 4, "EN", 0); put_bar(19, 4, P.form == FORM_JEEG ? P.en : 0, 10, 2);
  put_text(30, 4, P.form == FORM_JEEG ? "A+B RAGGIO" : "          ", 0);
}

/* ================= SALVATAGGIO SRAM ================= */
static void save_game(void) {
  sram_write(0, 'J'); sram_write(1, 'G'); sram_write(2, cp); sram_write(3, gloves); sram_write(4, (u8)lives);
  sram_write(5, score >> 16); sram_write(6, score >> 8); sram_write(7, score);
}
static u8 save_valid(void) { return sram_read(0) == 'J' && sram_read(1) == 'G' && sram_read(2) < 4; }
static void save_clear(void) { sram_write(0, 0); }

/* ================= CARICAMENTO GRAFICA ================= */
static void load_font(void) {
  /* sfondo scuro (colore 13) al posto della trasparenza, per la finestra HUD */
  vdp_vram_addr(T_FONT * 32);
  const u16 *d = (const u16 *)font_tiles;
  for (u16 i = 0; i < 128 * 16; i++) { u16 w = d[i], o = 0; for (u8 k = 0; k < 4; k++) { u16 n = (w >> (k * 4)) & 15; o |= (n ? n : 13) << (k * 4); } VDP_DATA = o; }
  vdp_load_tiles(bar_tiles, T_BAR, BAR_TILES);
  vdp_vram_addr(T_SOLID * 32); for (u8 i = 0; i < 16; i++) VDP_DATA = 0xDDDD;
}
static void load_image_plane(const Image *im, u16 plane, u16 tbase, u8 pal, u8 repeat) {
  vdp_load_tiles(im->tiles, tbase, im->ntiles);
  for (u16 y = 0; y < im->h && y < PLANE_H; y++) {
    vdp_vram_addr(plane + y * PLANE_W * 2);
    for (u16 x = 0; x < PLANE_W; x++) {
      u16 sx = x; if (sx >= im->w) { if (!repeat) { VDP_DATA = 0; continue; } sx = x % im->w; }
      u16 m = im->map[y * im->w + sx]; u16 t = m & 0x7FF;
      VDP_DATA = t ? ((m & 0x7800) | (tbase + t)) : 0;
    }
  }
}
static u16 tBgA; static s16 colDrawnL, colDrawnR;
static void plane_column(s16 col) {
  const Image *im = stage == 0 ? &img_bgA_A : &img_bgA_B;
  if (col < 0 || col >= im->w) return;
  u16 pc = col & (PLANE_W - 1);
  for (u16 y = 3; y < 28; y++) {
    u16 m = im->map[y * im->w + col]; u16 t = m & 0x7FF;
    vdp_vram_addr(VRAM_PLANE_A + (y * PLANE_W + pc) * 2);
    VDP_DATA = t ? ((m & 0x7800) | (tBgA + t)) : 0;
  }
}
static void stream_columns(void) {
  s16 l = (camX >> 3) - 1, r = (camX >> 3) + 41;
  while (colDrawnR < r) plane_column(++colDrawnR);
  while (colDrawnL > l) plane_column(--colDrawnL);
  if (colDrawnL < l) colDrawnL = l; if (colDrawnR > r + 20) colDrawnR = r;
}

static const Frame *bossLoaded;
static void window_rows(u8 rows) { vdp_set_reg(17, 0); vdp_set_reg(18, rows); }

static void load_stage(u8 s, u8 forBuild) {
  vdp_display(0);
  stage = s; spr_clear(); spr_flush();
  const Image *bgB = s == 0 ? &img_bgB_A : &img_bgB_B; const Image *bgA = s == 0 ? &img_bgA_A : &img_bgA_B;
  vdp_load_palette(0, bgB->pal, 16); vdp_load_palette(1, bgA->pal, 16);
  vdp_load_palette(2, s == 0 ? pal_pA : pal_pB, 16); vdp_load_palette(3, s == 0 ? pal_eA : pal_eB, 16);
  load_font();
  vdp_fill_plane(VRAM_PLANE_A, 0); vdp_fill_plane(VRAM_WINDOW, TILE_ATTR(0, 1, 0, 0, T_SOLID));
  load_image_plane(bgB, VRAM_PLANE_B, T_BG, 0, 1);
  tBgA = T_BG + bgB->ntiles; vdp_load_tiles(bgA->tiles, tBgA, bgA->ntiles);
  tNext = tBgA + bgA->ntiles; nstatics = 0; slots_reset(); bossLoaded = 0; ndq = 0; dmaBytes = 0;
  pools_reset();
  if (s == 0) {
    playerSlot = slot_new(tNext, 96); tNext += 96;
    for (u8 i = 0; i < 3; i++) { slot_new(tNext, 100); tNext += 100; }
    static_load(&spr_gloves_a); static_load(&spr_health_a); static_load(&spr_star0_a); static_load(&spr_star1_a);
    static_load(&spr_spear); static_load(&spr_alert_a); static_load(&spr_flag1_a); static_load(&spr_boom0_a);
  } else {
    playerSlot = slot_new(tNext, 188); tNext += 188;
    if (forBuild) {
      static_load(&spr_shooter0);
      static_load(&spr_jpart_head); static_load(&spr_jpart_torso); static_load(&spr_jpart_armB); static_load(&spr_jpart_armF); static_load(&spr_jpart_legB); static_load(&spr_jpart_legF);
      static_load(&spr_spark); static_load(&spr_star1_b);
    } else {
      slot_new(tNext, 164); tNext += 164; slot_new(tNext, 164); tNext += 164; /* giganti / boss (unito) */
      static_load(&spr_ring0); static_load(&spr_ring1); static_load(&spr_gcore); static_load(&spr_pbeam);
      static_load(&spr_clay); static_load(&spr_orb); static_load(&spr_shock1); static_load(&spr_star1_b);
      static_load(&spr_boom1_b); static_load(&spr_spark); static_load(&spr_alert); static_load(&spr_health_b);
      static_load(&spr_energy_b);
    }
  }
  tBig = alloc_tiles(BIG_GLYPHS * 2); vdp_load_tiles(big_tiles, tBig, BIG_GLYPHS * 2);
  if (s == 0) { tPor = alloc_tiles(32); vdp_load_tiles(raw_por_hiro, tPor, 16); vdp_load_tiles(raw_por_cyb, tPor + 16, 16); tIco = alloc_tiles(4); vdp_load_tiles(raw_ico_hiro, tIco, 4); }
  else { tPor = alloc_tiles(16); vdp_load_tiles(raw_por_jeeg, tPor, 16); tIco = alloc_tiles(4); vdp_load_tiles(raw_ico_jeeg, tIco, 4); }
  if (tNext > T_MAX) test_flags |= 0x40; /* errore: VRAM esaurita */
  window_rows(5);
  plats = s == 0 ? platA : platB; nplats = s == 0 ? sizeof(platA) / sizeof(Plat) : sizeof(platB) / sizeof(Plat);
  worldW = s == 0 ? WIDTH_A : WIDTH_B;
  colDrawnL = (camX >> 3); colDrawnR = colDrawnL - 1; stream_columns(); 
  vdp_hscroll(-camX, -(camX >> 2));
  draw_hud();
  vdp_display(1);
}

/* ================= SCHERMATE A TUTTO SCHERMO ================= */
static const Image *SCREENS[] = { &img_scr_title, &img_scr_hiro, &img_scr_miwa, &img_scr_build, &img_scr_boss, &img_scr_win };
enum { SCR_TITLE, SCR_HIRO, SCR_MIWA, SCR_BUILD, SCR_BOSS, SCR_WIN };
static void show_screen(u8 id) {
  vdp_display(0); spr_clear(); spr_flush();
  const Image *im = SCREENS[id];
  vdp_load_palette(1, im->pal, 16); vdp_load_palette(0, img_bgB_A.pal, 16);
  load_font();
  vdp_fill_plane(VRAM_PLANE_B, 0); vdp_fill_plane(VRAM_WINDOW, TILE_ATTR(0, 1, 0, 0, T_SOLID));
  vdp_hscroll(0, 0);
  load_image_plane(im, VRAM_PLANE_A, T_BG, 1, 0);
  window_rows(0);
  vdp_display(1);
}
static void bottom_text(u8 row, const char *s, u8 yellow) { /* finestra in basso */
  u8 len = 0; while (s[len]) len++;
  clear_row(row); put_text((40 - len) / 2, row, s, yellow);
}
static void scene(u8 id, u16 frames, void (*next)(void)) {
  show_screen(id); sceneId = id; sceneLen = frames; sceneNext = next; state = ST_SCENE; stateT = 0; P.b.vx = 0;
}

/* ================= FISICA ================= */
static u8 overlap(s16 ax0, s16 ay0, s16 ax1, s16 ay1, s16 bx0, s16 by0, s16 bx1, s16 by1) { return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0; }
#define BX0(b) (PX((b).x) - (b).w / 2)
#define BX1(b) (PX((b).x) + (b).w / 2)
#define BY0(b) (PX((b).y) - (b).h)
#define BY1(b) (PX((b).y))
static u8 hitWall, pWall;
static void move_body(Body *b, s16 grav, s16 minX, s16 maxX, u8 dropping, s16 step) {
  s32 prevY = b->y;
  b->x += b->vx; hitWall = 0;
  for (u8 i = 0; i < nplats; i++) {
    const Plat *p = &plats[i]; if (p->oneway) continue;
    if (BX1(*b) > p->x && BX0(*b) < p->x + p->w && BY1(*b) > p->y + 1 && BY0(*b) < p->y + p->h) {
      if (step && PX(b->y) - p->y <= step && b->onGround) { b->y = TOFX(p->y); continue; }
      if (b->vx > 0 || PX(b->x) < p->x + p->w / 2) b->x = TOFX(p->x - b->w / 2); else b->x = TOFX(p->x + p->w + b->w / 2);
      hitWall = 1;
    }
  }
  if (PX(b->x) - b->w / 2 < minX) b->x = TOFX(minX + b->w / 2);
  if (PX(b->x) + b->w / 2 > maxX) b->x = TOFX(maxX - b->w / 2);
  b->vy += grav; if (b->vy > 200) b->vy = 200;
  b->y += b->vy; b->onGround = 0;
  if (PX(b->y) >= GROUND) { b->y = TOFX(GROUND); b->vy = 0; b->onGround = 1; }
  for (u8 i = 0; i < nplats; i++) {
    const Plat *p = &plats[i];
    if (BX1(*b) <= p->x + 2 || BX0(*b) >= p->x + p->w - 2) continue;
    if (p->oneway) {
      if (b->vy >= 0 && PX(prevY) <= p->y && PX(b->y) >= p->y && !dropping) { b->y = TOFX(p->y); b->vy = 0; b->onGround = 1; }
    } else if (BY1(*b) > p->y && BY0(*b) < p->y + p->h) {
      if (b->vy >= 0 && PX(prevY) <= p->y + 8) { b->y = TOFX(p->y); b->vy = 0; b->onGround = 1; }
      else if (b->vy < 0) { b->y = TOFX(p->y + p->h + b->h); b->vy = 0; }
    }
  }
}

/* ================= EFFETTI ================= */
static void fx(u8 kind, s16 x, s16 y, s16 vx, s16 vy, u8 life) {
  for (u8 i = 0; i < MAX_FX; i++) if (!FXS[i].active) { Fx *f = &FXS[i]; f->active = 1; f->kind = kind; f->x = x; f->y = y; f->vx = vx; f->vy = vy; f->life = life; f->t = 0; return; }
}
enum { FX_STAR, FX_BOOM, FX_SPARK };
static void sparks(s16 x, s16 y, u8 n) { for (u8 i = 0; i < n; i++) fx(FX_SPARK, x, y, (s16)((frameNo * 7 + i * 37) % 9) - 4, (s16)((frameNo * 3 + i * 53) % 9) - 6, 14); }

/* ================= GIOCATORE ================= */
static void set_form(u8 f) { P.form = f; P.b.w = F_W[f]; P.b.h = F_H[f]; }
static void player_spawn(s16 x, u8 form) {
  memset(&P, 0, sizeof(P)); P.b.x = TOFX(x); P.b.y = TOFX(GROUND); P.b.face = 1; P.b.onGround = 1;
  set_form(form); P.hp = 100; P.en = 100; P.inv = 90;
}
static void hurt_player(s16 dmg, s16 fromX) {
  if (P.inv > 0 || P.dead || buildOn) return;
  if (god) dmg = 0;
  P.hp -= dmg; if (P.hp < 0) P.hp = 0;
  P.inv = 60; sfx(SFX_HURT); shake = P.form == FORM_JEEG ? 6 : 3;
  s8 dir = PX(P.b.x) < fromX ? -1 : 1;
  if (P.state != 3) { P.state = 2; P.st = 19; P.b.vx = dir * (P.form == FORM_JEEG ? 40 : 60); P.b.vy = -60; P.b.onGround = 0; P.atk = 0; }
  fx(FX_STAR, PX(P.b.x), PX(P.b.y) - P.b.h / 2, 0, 0, 10);
  if (P.hp <= 0) { P.dead = 1; P.deadT = 0; sfx(SFX_DIE); music(MUS_NONE); }
}

/* attacco: 1 pugno, 2 pugno2, 3 calcio, 4 calcio in aria */
static const u8 ATK_DUR[5] = { 0, 14, 14, 22, 25 }, ATK_ON[5] = { 0, 3, 3, 4, 3 }, ATK_OFF[5] = { 0, 8, 8, 13, 20 };
static void start_attack(u8 step) {
  P.comboQ = 0; P.atkHit = 0;
  if (!P.b.onGround) P.atk = 4; else P.atk = 1 + (step % 3);
  P.atkStep = P.atk == 4 ? 0 : step % 3; P.state = 1; P.st = 0; sfx(SFX_PUNCH);
}
static void attack_box(s16 *x0, s16 *y0, s16 *x1, s16 *y1) {
  u8 kick = P.atk >= 3; s16 reach = F_REACH[P.form]; if (kick) reach += reach / 3;
  s16 px = PX(P.b.x), py = PX(P.b.y), w = P.b.w, h = P.b.h;
  if (P.b.face > 0) { *x0 = px + w / 5; *x1 = px + w / 5 + reach + w / 3; } else { *x1 = px - w / 5; *x0 = px - w / 5 - reach - w / 3; }
  *y0 = py - (kick ? (h * 3) / 5 : (h * 5) / 6); *y1 = py - (kick ? h / 10 : (h * 9) / 20);
}
static void damage_enemy(Enemy *e, s16 dmg, s8 dir, u8 heavy, u8 beam);
static void damage_boss(s16 dmg, u8 heavy, u8 beam);
static void melee_hits(void) {
  s16 x0, y0, x1, y1; attack_box(&x0, &y0, &x1, &y1);
  u8 heavy = P.atk >= 3; s16 dmg = heavy ? F_DMG[P.form][2] : F_DMG[P.form][P.atkStep];
  for (u8 i = 0; i < MAX_EN; i++) {
    Enemy *e = &EN[i]; if (!e->alive || (P.atkHit & (1 << (i & 7)))) continue;
    u8 giant = e->type >= E_GIANT; if (giant && P.form != FORM_JEEG) continue;
    if (overlap(x0, y0, x1, y1, BX0(e->b), BY0(e->b), BX1(e->b), BY1(e->b))) { P.atkHit |= 1 << (i & 7); damage_enemy(e, dmg, P.b.face, heavy, 0); sfx(heavy ? SFX_KICK : SFX_PUNCH); }
  }
  if (B.active && B.alive && !(P.atkHit & 0x80) && overlap(x0, y0, x1, y1, BX0(B.b), BY0(B.b), BX1(B.b), BY1(B.b))) { P.atkHit |= 0x80; damage_boss(dmg, heavy, 0); }
}
static void try_transform(void);
static void try_beam(void) {
  if (P.form != FORM_JEEG) { sfx(SFX_DENY); msg(P.form == FORM_HUMAN ? "A+B: I RAGGI SOLO CON JEEG COMPLETO" : "A+B: PRIMA IL BUILD UP (PREMI C)", 120); return; }
  s16 cost = P.beam ? 35 : 15;
  if (P.en < cost) { sfx(SFX_DENY); msg("ENERGIA INSUFFICIENTE PER IL RAGGIO", 120); return; }
  P.en -= cost; P.state = 3; P.beamT = 0; P.b.vx = 0; sfx(P.beam ? SFX_PROTON : SFX_GAMMA); shake = P.beam ? 8 : 4;
  msg(P.beam ? "RAGGIO PROTONICO!" : "RAGGIO GAMMA!", 70);
}
static void beam_rect(s16 *x0, s16 *y0, s16 *x1, s16 *y1, s16 *oy) {
  s16 ox = PX(P.b.x) + P.b.face * 22; *oy = PX(P.b.y) - (P.beam ? 108 : 76);
  s16 len = P.beam ? 330 : 300, half = P.beam ? 22 : 16;
  if (P.b.face > 0) { *x0 = ox; *x1 = ox + len; } else { *x1 = ox; *x0 = ox - len; }
  *y0 = *oy - half; *y1 = *oy + half + (P.beam ? 50 : 0);
}
static void update_beam(void) {
  P.beamT++;
  if (P.beamT > 6 && (P.beamT % 6) == 0) {
    s16 x0, y0, x1, y1, oy; beam_rect(&x0, &y0, &x1, &y1, &oy);
    s16 dmg = P.beam ? 2 : 1;
    for (u8 i = 0; i < MAX_EN; i++) { Enemy *e = &EN[i]; if (e->alive && overlap(x0, y0, x1, y1, BX0(e->b), BY0(e->b), BX1(e->b), BY1(e->b))) damage_enemy(e, dmg, P.b.face, 1, 1); }
    if (B.active && B.alive && overlap(x0, y0, x1, y1, BX0(B.b), BY0(B.b), BX1(B.b), BY1(B.b))) damage_boss(dmg, 1, 1);
    for (u8 i = 0; i < MAX_PR; i++) if (PR[i].active && PX(PR[i].x) > x0 && PX(PR[i].x) < x1 && PX(PR[i].y) > y0 - 10 && PX(PR[i].y) < y1) { PR[i].active = 0; sparks(PX(PR[i].x), PX(PR[i].y), 3); }
  }
  if (P.beamT >= (P.beam ? 57 : 45)) P.state = 0;
}

static u16 bot(void);
static void update_player(void) {
  u8 f = P.form; s16 speed = F_SPEED[f];
  if (P.inv > 0) P.inv--;
  P.animT++;
  if (P.dead) { P.deadT++; P.b.vx = 0; move_body(&P.b, F_GRAV[f], 0, worldW, 0, 0); return; }
  /* risoluzione A / B / A+B (finestra di 4 frame) */
  u8 aAtk = 0, aJump = 0, aBeam = 0;
  u8 pA = joyPress & BTN_A, pB = joyPress & BTN_B;
  if ((joyPress & BTN_Z) || (pA && (pB || pendB)) || (pB && pendA)) { aBeam = 1; pendA = pendB = 0; }
  else { if (pA) pendA = 4; if (pB) pendB = 4; if (pendA && --pendA == 0) aAtk = 1; if (pendB && --pendB == 0) aJump = 1; }
  s8 move = 0; if (joy & BTN_RIGHT) move = 1; if (joy & BTN_LEFT) move = -1;
  if (joyPress & BTN_C) { if (f == FORM_JEEG) { P.beam ^= 1; sfx(SFX_SELECT); msg(P.beam ? "SELEZIONATO RAGGIO PROTONICO (35 EN)" : "SELEZIONATO RAGGIO GAMMA (15 EN)", 90); } else try_transform(); if (state != ST_PLAY) return; }
  if (joyPress & BTN_Y) { if (f == FORM_JEEG) { P.beam ^= 1; sfx(SFX_SELECT); } }

  if (P.state == 2) { if (P.st) P.st--; else P.state = 0; P.b.vx = (P.b.vx * 7) / 8; }
  else if (P.state == 3) { P.b.vx = 0; update_beam(); }
  else if (P.state == 1) {
    P.st++;
    if (aAtk && P.st > ATK_DUR[P.atk] / 3 && P.atk <= 2) P.comboQ = 1;
    if (P.st >= ATK_ON[P.atk] && P.st <= ATK_OFF[P.atk]) melee_hits();
    P.b.vx = P.b.onGround ? (move * speed) / 4 + (P.atk == 3 ? P.b.face * 6 : 0) : (move * speed * 3) / 4;
    if (P.st >= ATK_DUR[P.atk]) { if (P.comboQ && P.b.onGround) start_attack(P.atkStep + 1); else { P.state = 0; P.atk = 0; } }
    if (P.atk == 4 && P.b.onGround) { P.state = 0; P.atk = 0; }
  } else {
    P.b.vx = move * speed; if (move) P.b.face = move;
    if (P.b.onGround) P.coyote = 5; else if (P.coyote > 0) P.coyote--;
    if (aBeam) try_beam();
    else if (aAtk) start_attack(0);
    else if (aJump && P.coyote > 0) { P.b.vy = -F_JUMP[f]; P.b.onGround = 0; P.coyote = 0; P.jumpT = 0; sfx(SFX_JUMP); }
    if (P.jumpT < 255) P.jumpT++;
    if (!(joy & BTN_B) && P.jumpT > 5 && P.b.vy < -(F_JUMP[f] * 9) / 20) P.b.vy = -(F_JUMP[f] * 9) / 20;
  }
  s16 minX = 0, maxX = worldW;
  if (stage == 0) maxX = GATE_A;
  if (arenaLocked) { minX = ARENA_X0; maxX = ARENA_X1; }
  u8 wasGround = P.b.onGround;
  move_body(&P.b, F_GRAV[f], minX, maxX, (joy & BTN_DOWN) && aJump, f == FORM_JEEG ? 60 : 0); pWall = hitWall;
  if (!wasGround && P.b.onGround && f == FORM_JEEG) { shake = 3; sfx(SFX_SLAM); }
  if (stage == 0 && PX(P.b.x) >= GATE_A - P.b.w / 2 - 2 && !gateWarn) { gateWarn = 1; msg(gloves ? "GIGANTI! TRASFORMATI IN JEEG (TASTO C)" : "TROPPO PERICOLOSO: TROVA I GUANTI!", 200); }
  if (PX(P.b.x) < GATE_A - 160) gateWarn = 0;
}

/* ================= NEMICI ================= */
static const s16 E_W[4] = { 22, 22, 52, 52 }, E_H[4] = { 68, 68, 112, 112 }, E_HP[4] = { 3, 2, 10, 8 };
static const s16 E_SPD[4] = { 16, 14, 13, 11 }, E_CHASE[4] = { 27, 20, 18, 13 };
static const u16 E_SCORE[4] = { 100, 150, 500, 600 };
static void spawn_enemy(const EnemyDef *d, u8 drop) {
  for (u8 i = 0; i < MAX_EN; i++) if (!EN[i].alive && EN[i].deadT == 0) {
    Enemy *e = &EN[i]; memset(e, 0, sizeof(*e)); 
    e->type = d->type; e->alive = 1; e->b.x = TOFX(d->x); e->b.y = TOFX(drop ? 20 : d->y); e->b.w = E_W[d->type]; e->b.h = E_H[d->type];
    e->b.face = -1; e->hp = E_HP[d->type]; e->home = d->x; e->st = 30 + (i * 17) % 40; e->drop = drop; e->state = drop ? 9 : 0;
    e->plat = 0; if (d->y < GROUND) for (u8 k = 0; k < nplats; k++) if (plats[k].y == d->y && d->x > plats[k].x && d->x < plats[k].x + plats[k].w) e->plat = &plats[k];
    return;
  }
}
static void kill_enemy(Enemy *e, s8 dir) {
  e->alive = 0; e->deadT = 1; e->b.vx = dir * 30; e->b.vy = -60; score += E_SCORE[e->type]; kills++;
  if (e->type >= E_GIANT) { fx(FX_BOOM, PX(e->b.x), PX(e->b.y) - 56, 0, 0, 24); fx(FX_BOOM, PX(e->b.x) - 16, PX(e->b.y) - 90, 0, 0, 30); sfx(SFX_BOOM); shake = 8; }
  else sfx(SFX_HIT);
}
static void damage_enemy(Enemy *e, s16 dmg, s8 dir, u8 heavy, u8 beam) {
  if (e->inv > 0 && !beam) return;
  e->hp -= dmg; e->flash = 6; e->inv = beam ? 0 : 3;
  fx(FX_STAR, PX(e->b.x) - dir * 4, PX(e->b.y) - e->b.h / 2, 0, 0, 8); sfx(SFX_HIT);
  if (e->hp <= 0) { kill_enemy(e, dir); return; }
  u8 giant = e->type >= E_GIANT;
  if (!giant || heavy || e->state != 3) { e->state = 4; e->st = giant ? 13 : 18; e->b.vx = dir * (giant ? (heavy ? 30 : 14) : (heavy ? 60 : 30)); if (heavy && !giant) { e->b.vy = -50; e->b.onGround = 0; } }
}
static void proj(u8 type, s16 x, s16 y, s16 vx, s16 vy, s16 grav, u16 life) {
  for (u8 i = 0; i < MAX_PR; i++) if (!PR[i].active) { Proj *p = &PR[i]; p->active = 1; p->type = type; p->x = TOFX(x); p->y = TOFX(y); p->vx = vx; p->vy = vy; p->grav = grav; p->life = life; p->dir = vx < 0 ? -1 : 1; return; }
}
static void update_enemy(Enemy *e) {
  if (!e->alive) { if (e->deadT) { e->deadT++; e->b.x += e->b.vx; e->b.vy += 6; e->b.y += e->b.vy; if (e->deadT > 40) e->deadT = 0; } return; }
  e->animT++; if (e->flash) e->flash--; if (e->inv > 0) e->inv--;
  s16 ex = PX(e->b.x), px = PX(P.b.x), dx = px - ex, adx = dx < 0 ? -dx : dx;
  u8 giant = e->type >= E_GIANT;
  if (adx > 400) { e->b.vx = 0; return; }
  /* i soldati vengono schiacciati da Jeeg */
  if (!giant && P.form == FORM_JEEG && overlap(BX0(e->b), BY0(e->b), BX1(e->b), BY1(e->b), BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) { kill_enemy(e, dx > 0 ? -1 : 1); return; }
  if (e->st) e->st--; e->at++;
  switch (e->state) {
    case 9: e->b.vx = 0; if (e->b.onGround) e->state = 1; break; /* caduta (imboscata) */
    case 4: e->b.vx = (e->b.vx * 7) / 8; if (!e->st) { e->state = 1; e->st = 24; } break;
    case 0: /* pattuglia */
      if (!e->st) { e->b.face = -e->b.face; e->st = 70 + (e->animT & 63); }
      if (ex - e->home > 70) e->b.face = -1; if (e->home - ex > 70) e->b.face = 1;
      e->b.vx = e->b.face * E_SPD[e->type];
      if (adx < (giant ? 300 : 200) && !P.dead && (giant ? P.form == FORM_JEEG : 1)) { e->state = 1; e->st = 18; }
      break;
    case 1: { /* insegue */
      e->b.face = dx > 0 ? 1 : -1;
      u8 ranged = e->type == E_LANCER || e->type == E_GSHOOT;
      s16 ideal = e->type == E_LANCER ? 150 : e->type == E_GSHOOT ? 220 : giant ? 64 : 30;
      if (ranged) {
        if (adx < ideal - 40) e->b.vx = -e->b.face * E_CHASE[e->type]; else if (adx > ideal + 50) e->b.vx = e->b.face * E_CHASE[e->type]; else e->b.vx = 0;
        if (!e->st && adx < ideal + 160) { e->state = 2; e->at = 0; e->b.vx = 0; }
      } else {
        e->b.vx = adx > ideal ? e->b.face * E_CHASE[e->type] : 0;
        if (adx <= ideal + (giant ? 20 : 8) && !e->st) { e->state = 2; e->at = 0; e->b.vx = 0; }
      }
      break;
    }
    case 2: { /* caricamento (segnale "!") */
      e->b.vx = 0; u16 wt = e->type == E_LANCER ? 27 : giant ? 36 : 24;
      if (e->at >= wt) {
        e->state = 3; e->at = 0; e->hitDone = 0;
        if (e->type == E_LANCER) { proj(P_SPEAR, ex + e->b.face * 18, PX(e->b.y) - 51, e->b.face * 81, -8, 0, 120); sfx(SFX_PUNCH); }
        if (e->type == E_GSHOOT) { s16 vx = (dx * 16) / 54; if (vx > 120) vx = 120; if (vx < -120) vx = -120; proj(P_CLAY, ex + e->b.face * 24, PX(e->b.y) - 95, vx, -75, 3, 200); sfx(SFX_SLAM); }
      }
      break;
    }
    case 3: { /* attacco */
      e->b.vx = 0;
      if (!e->hitDone && (e->type == E_SOLDIER || e->type == E_GIANT) && e->at > 2 && e->at < 12) {
        s16 reach = giant ? 80 : 40; s16 x0 = e->b.face > 0 ? ex : ex - reach, x1 = e->b.face > 0 ? ex + reach : ex;
        if (overlap(x0, BY0(e->b), x1, BY1(e->b) - e->b.h / 5, BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) { e->hitDone = 1; hurt_player(giant ? 20 : 12, ex); }
        if (giant && e->at == 6) { shake = 4; sfx(SFX_SLAM); }
      }
      if (e->at > (giant ? 42 : 27)) { e->state = 1; e->st = giant ? 60 : 45; }
      break;
    }
  }
  s16 mn = 0, mx = worldW; if (e->plat) { mn = e->plat->x + 2; mx = e->plat->x + e->plat->w - 2; }
  move_body(&e->b, giant ? 6 : 6, mn, mx, 0, giant ? 60 : 0);
  if (!P.dead && e->state != 4 && e->state != 9 && overlap(BX0(e->b), BY0(e->b), BX1(e->b), BY1(e->b), BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) hurt_player(giant ? 10 : 6, ex);
}

/* ================= BOSS: HANIWA GENJIN DOROMA ================= */
enum { BS_INTRO, BS_IDLE, BS_WALK, BS_HOP, BS_SLAMW, BS_SLAM, BS_SHOOTW, BS_SHOOT, BS_CHARGEW, BS_CHARGE, BS_STUN, BS_JUMPW, BS_JUMP, BS_ROAR, BS_DYING };
static void boss_reset(void) { memset(&B, 0, sizeof(B)); B.b.x = TOFX(1620); B.b.y = TOFX(GROUND); B.b.w = 70; B.b.h = 140; B.b.face = -1; B.hp = BOSS_HP; B.alive = 1; B.phase = 1; }
static void spawn_shock(s8 dir, s16 x) { proj(P_SHOCK, x, GROUND, dir * 66, 0, 0, 100); }
static void damage_boss(s16 dmg, u8 heavy, u8 beam) {
  if (!B.alive || B.state == BS_INTRO || B.state == BS_ROAR) { sparks(PX(B.b.x), PX(B.b.y) - 70, 3); return; }
  if (B.inv > 0 && !beam) return;
  if (B.state == BS_STUN) dmg += dmg / 2 + 1;
  B.hp -= dmg; B.flash = 6; B.inv = beam ? 0 : 5;
  fx(FX_STAR, PX(B.b.x) - B.b.face * 20, PX(B.b.y) - 80, 0, 0, 10); sfx(SFX_HIT);
  if (B.hp <= 0) { B.hp = 0; B.alive = 0; B.state = BS_DYING; B.deadT = 0; score += 5000; sfx(SFX_BOOM); shake = 12; msg("HANIWA GENJIN DOROMA DISTRUTTO!", 180); for (u8 i = 0; i < MAX_PR; i++) PR[i].active = 0; return; }
  u8 ph = B.hp * 3 > BOSS_HP * 2 ? 1 : B.hp * 3 > BOSS_HP ? 2 : 3;
  if (ph > B.phase) {
    B.phase = ph; B.state = BS_ROAR; B.at = 0; B.b.vx = 0; sfx(SFX_WARN); shake = 10;
    msg(ph == 2 ? "FASE 2: CANNONE DELLA FACCIA!" : "FASE 3: CARICA E ONDE D'URTO!", 150);
    P.b.vx = PX(P.b.x) < PX(B.b.x) ? -60 : 60; P.b.vy = -60; P.b.onGround = 0;
    /* il colore degli occhi indica la fase (cambio palette) */
    vdp_set_color(3 * 16 + 10, ph == 2 ? 0x026E : 0x0A4E);
  }
}
static void boss_choose(void) {
  s16 dx = PX(P.b.x) - PX(B.b.x); s16 dist = dx < 0 ? -dx : dx;
  u8 opts[8], n = 0;
  if (dist < 110) { opts[n++] = BS_SLAMW; opts[n++] = BS_SLAMW; }
  if (B.phase >= 2) opts[n++] = BS_SHOOTW;
  if (B.phase >= 3) { opts[n++] = BS_CHARGEW; opts[n++] = BS_JUMPW; }
  if (dist >= 110) { opts[n++] = BS_WALK; if (B.phase == 1) opts[n++] = BS_HOP; }
  u8 pick = opts[(frameNo * 13 + B.hp) % n];
  if (pick == B.last && n > 1 && pick != BS_SLAMW) pick = opts[(((frameNo * 13 + B.hp) % n) + 1) % n];
  B.last = pick; B.state = pick; B.at = 0;
  if (pick == BS_HOP) { B.b.vy = -110; B.b.vx = -B.b.face * 40; B.b.onGround = 0; }
  if (pick == BS_CHARGEW) sfx(SFX_WARN);
}
static void update_boss(void) {
  if (!B.active) return;
  B.at++; if (B.flash) B.flash--; if (B.inv > 0) B.inv--;
  if (B.state == BS_DYING) { B.deadT++; if ((B.deadT & 7) == 0) { fx(FX_BOOM, PX(B.b.x) - 40 + (B.deadT * 23) % 80, PX(B.b.y) - 20 - (B.deadT * 37) % 120, 0, 0, 22); sfx(SFX_BOOM); } return; }
  s16 bx = PX(B.b.x), dx = PX(P.b.x) - bx;
  s8 turn = dx > 0 ? 1 : -1; u8 fast = B.phase == 3;
  switch (B.state) {
    case BS_INTRO: B.b.vx = 0; if (B.at > 40) { B.state = BS_IDLE; B.at = 0; } break;
    case BS_ROAR: B.b.vx = 0; if (B.at > 66) { B.state = BS_IDLE; B.at = 0; } break;
    case BS_IDLE: B.b.face = turn; B.b.vx = 0; if (B.at > (B.phase == 1 ? 45 : B.phase == 2 ? 33 : 21) && !P.dead) boss_choose(); break;
    case BS_WALK: B.b.face = turn; B.b.vx = turn * (fast ? 23 : 17); if ((dx < 0 ? -dx : dx) < 100 || B.at > 70) { B.state = BS_IDLE; B.at = 18; } break;
    case BS_HOP: if (B.b.onGround && B.at > 10) { B.b.vx = 0; B.state = BS_IDLE; B.at = 0; shake = 4; sfx(SFX_SLAM); } break;
    case BS_SLAMW: B.b.vx = 0; if (B.at >= (fast ? 30 : 45)) { B.state = BS_SLAM; B.at = 0; B.hitDone = 0; } break;
    case BS_SLAM:
      if (B.at == 4) {
        sfx(SFX_SLAM); shake = 10;
        s16 x0 = B.b.face > 0 ? bx : bx - 120, x1 = B.b.face > 0 ? bx + 120 : bx;
        if (overlap(x0, GROUND - 132, x1, GROUND, BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) hurt_player(22, bx);
        if (B.phase >= 2) spawn_shock(B.b.face, bx + B.b.face * 100);
        fx(FX_BOOM, bx + B.b.face * 90, GROUND - 6, 0, 0, 12);
      }
      if (B.at > 45) { B.state = BS_IDLE; B.at = 0; }
      break;
    case BS_SHOOTW: B.b.face = turn; B.b.vx = 0; if (B.at >= 51) { B.state = BS_SHOOT; B.at = 0; B.shots = fast ? 5 : 3; B.shotT = 0; } break;
    case BS_SHOOT:
      if (B.shotT) B.shotT--;
      if (!B.shotT && B.shots) {
        B.shots--; B.shotT = 13;
        s16 spread = (fast ? 5 : 3) - B.shots; s16 tx = PX(P.b.x) + (spread - 2) * 40;
        proj(P_ORB, bx + B.b.face * 20, PX(B.b.y) - 100, ((tx - bx) * 16) / 60, -112, 4, 200); sfx(SFX_SLAM);
      }
      if (!B.shots && !B.shotT) { B.state = BS_IDLE; B.at = 0; }
      break;
    case BS_CHARGEW: B.b.face = turn; B.b.vx = -turn * 4; if (B.at > 51) { B.state = BS_CHARGE; B.at = 0; B.hitDone = 0; } break;
    case BS_CHARGE:
      B.b.vx = B.b.face * 105;
      if (!B.hitDone && overlap(BX0(B.b), BY0(B.b), BX1(B.b), BY1(B.b), BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) { B.hitDone = 1; hurt_player(25, bx); }
      if (bx <= ARENA_X0 + 40 || bx >= ARENA_X1 - 40 || B.at > 130) { B.state = BS_STUN; B.at = 0; B.b.vx = 0; shake = 12; sfx(SFX_SLAM); msg("DOROMA STORDITO: COLPISCILO ORA!", 100); }
      break;
    case BS_STUN: B.b.vx = 0; if (B.at > 84) { B.state = BS_IDLE; B.at = 0; } break;
    case BS_JUMPW: B.b.face = turn; B.b.vx = 0; if (B.at > 36) { B.state = BS_JUMP; B.at = 0; B.b.vy = -160; B.b.vx = (dx * 16) / 64; B.b.onGround = 0; } break;
    case BS_JUMP:
      if (B.b.onGround && B.at > 8) {
        B.state = BS_IDLE; B.at = 0; B.b.vx = 0; sfx(SFX_SLAM); shake = 14;
        spawn_shock(-1, bx - 40); spawn_shock(1, bx + 40);
        if (overlap(bx - 60, GROUND - 50, bx + 60, GROUND, BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) hurt_player(20, bx);
      }
      break;
  }
  move_body(&B.b, 5, ARENA_X0, ARENA_X1, 0, 0);
  if (!P.dead && B.state != BS_INTRO && B.state != BS_CHARGE && overlap(BX0(B.b), BY0(B.b), BX1(B.b), BY1(B.b), BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) hurt_player(12, bx);
}

/* ================= PROIETTILI / OGGETTI / EFFETTI ================= */
static void update_projectiles(void) {
  for (u8 i = 0; i < MAX_PR; i++) {
    Proj *p = &PR[i]; if (!p->active) continue;
    if (p->life) p->life--; else { p->active = 0; continue; }
    p->vy += p->grav; p->x += p->vx; p->y += p->vy;
    s16 x = PX(p->x), y = PX(p->y);
    if (p->type != P_SHOCK && y >= GROUND) { p->active = 0; if (p->type != P_SPEAR) { fx(FX_BOOM, x, GROUND - 8, 0, 0, 12); sfx(SFX_SLAM); } continue; }
    if (x < camX - 40 || x > camX + 360) { p->active = 0; continue; }
    s16 hw = p->type == P_SHOCK ? 12 : p->type == P_SPEAR ? 10 : 9, h0 = p->type == P_SHOCK ? 36 : 8;
    if (overlap(x - hw, y - h0, x + hw, y + (p->type == P_SHOCK ? 0 : 8), BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) {
      static const s16 D[4] = { 10, 14, 15, 18 };
      hurt_player(D[p->type], x - p->dir * 10); if (p->type != P_SHOCK) p->active = 0;
    }
    if (p->type == P_SPEAR && P.state == 1) { s16 x0, y0, x1, y1; attack_box(&x0, &y0, &x1, &y1); if (overlap(x - 10, y - 4, x + 10, y + 4, x0, y0, x1, y1)) { p->active = 0; sparks(x, y, 3); sfx(SFX_PUNCH); } }
  }
}
static void update_items(void) {
  for (u8 i = 0; i < MAX_IT; i++) {
    Item *it = &IT[i]; if (!it->active || P.dead) continue;
    s16 sz = stage ? 14 : 12;
    if (!overlap(it->x - sz, it->y - 28, it->x + sz, it->y, BX0(P.b), BY0(P.b), BX1(P.b), BY1(P.b))) continue;
    it->active = 0;
    if (it->type == IT_GLOVES) {
      gloves = 1; score += 1000; sfx(SFX_GLOVES); save_game(); test_flags |= 1;
      msg("GUANTI! PREMI C PER TRASFORMARTI", 240);
      if (!ambushDone) { ambushDone = 1; for (u8 k = 0; k < sizeof(enA) / sizeof(EnemyDef); k++) if (enA[k].ambush) spawn_enemy(&enA[k], 1); }
    } else if (it->type == IT_HEALTH) { P.hp += 35; if (P.hp > 100) P.hp = 100; score += 50; sfx(SFX_PICK); msg("+VITA", 60); }
    else { P.en += 40; if (P.en > 100) P.en = 100; score += 50; sfx(SFX_PICK); msg("+ENERGIA RAGGI", 60); }
  }
}
static void update_fx(void) { for (u8 i = 0; i < MAX_FX; i++) { Fx *f = &FXS[i]; if (!f->active) continue; f->x += f->vx; f->y += f->vy; if (++f->t >= f->life) f->active = 0; } }

/* ================= SPAWN DI STAGE / CHECKPOINT ================= */
static void spawn_stage_content(u8 fromCp) {
  memset(EN, 0, sizeof(EN)); memset(PR, 0, sizeof(PR)); memset(FXS, 0, sizeof(FXS)); memset(IT, 0, sizeof(IT));
  s16 cx = CPX[fromCp];
  if (stage == 0) {
    for (u8 k = 0; k < sizeof(enA) / sizeof(EnemyDef); k++) if (enA[k].x > cx + 120 && (!enA[k].ambush || gloves)) spawn_enemy(&enA[k], 0);
    ambushDone = gloves;
    u8 n = 0; for (u8 k = 0; k < sizeof(itA) / sizeof(ItemDef); k++) if (itA[k].x > cx) { IT[n].active = 1; IT[n].type = itA[k].type; IT[n].x = itA[k].x; IT[n].y = itA[k].y; n++; }
    if (!gloves) { IT[n].active = 1; IT[n].type = IT_GLOVES; IT[n].x = GLOVES_X; IT[n].y = GLOVES_Y; }
  } else {
    for (u8 k = 0; k < sizeof(enB) / sizeof(EnemyDef); k++) if (enB[k].x > cx + 120) spawn_enemy(&enB[k], 0);
    u8 n = 0; for (u8 k = 0; k < sizeof(itB) / sizeof(ItemDef); k++) if (itB[k].x > cx) { IT[n].active = 1; IT[n].type = itB[k].type; IT[n].x = itB[k].x; IT[n].y = itB[k].y; n++; }
  }
  boss_reset(); arenaLocked = 0; bossStarted = 0; gateWarn = 0;
}
static void update_camera(u8 snap);
static void respawn(void) {
  u8 st = cp >= 2 ? 1 : 0;
  player_spawn(CPX[cp], st ? FORM_JEEG : FORM_HUMAN);
  stage = st; plats = st ? platB : platA; nplats = st ? 3 : sizeof(platA) / sizeof(Plat); worldW = st ? WIDTH_B : WIDTH_A;
  update_camera(1);
  spawn_stage_content(cp);
  load_stage(st, 0);
  state = ST_PLAY; music(MUS_STAGE);
  vdp_set_color(3 * 16 + 10, 0x028E);
}
static void activate_cp(u8 id) {
  if (id <= cp) return;
  cp = id; P.hp += 35; if (P.hp > 100) P.hp = 100; save_game(); sfx(SFX_CP);
  msg(id == 1 ? "CHECKPOINT: BOX DEL CIRCUITO (SALVATO)" : "CHECKPOINT: PRIMA DEL BOSS (SALVATO)", 150);
}

/* ================= TRASFORMAZIONI ================= */
static void after_hiro_scene(void) {
  load_stage(0, 0); set_form(FORM_CYBORG); P.hp = 100; P.state = 0; P.inv = 30; flashT = 12; state = ST_PLAY;
  for (u8 i = 0; i < 12; i++) sparks(PX(P.b.x), PX(P.b.y) - 30, 2);
  msg("FORMA CYBORG! PREMI C PER IL BUILD UP", 220); save_game(); test_flags |= 2;
}
static void after_build_scene(void) {
  /* Jeeg completo controllabile: checkpoint 2 */
  buildOn = 0; cp = 2; player_spawn(CPX[2], FORM_JEEG); P.inv = 30; camX = 0;
  plats = platB; nplats = 3; worldW = WIDTH_B; stage = 1;
  spawn_stage_content(2); load_stage(1, 0); state = ST_PLAY; music(MUS_STAGE); save_game();
  msg("JEEG COMPLETO! CHECKPOINT SALVATO", 180); test_flags |= 4;
}
static void after_miwa_scene(void) {
  /* sequenza di assemblaggio in gioco nella zona dei giganti */
  camX = 0; stage = 1; plats = platB; nplats = 3; worldW = WIDTH_B;
  memset(EN, 0, sizeof(EN)); memset(PR, 0, sizeof(PR)); memset(FXS, 0, sizeof(FXS)); memset(IT, 0, sizeof(IT));
  player_spawn(110, FORM_JEEG); P.b.y = TOFX(172);
  load_stage(1, 1); state = ST_PLAY; buildOn = 1; buildT = 0;
  msg("TESTA DI JEEG! AGGANCIO MAGNETICO...", 400);
}
static void try_transform(void) {
  if (P.dead || P.state == 3) return;
  if (P.form == FORM_HUMAN) {
    if (!gloves) { sfx(SFX_DENY); msg("PRIMA DEVI RACCOGLIERE I GUANTI!", 120); return; }
    if (!P.b.onGround) return;
    sfx(SFX_TRANS); scene(SCR_HIRO, 120, after_hiro_scene);
  } else if (P.form == FORM_CYBORG) {
    if (!P.b.onGround) return;
    sfx(SFX_TRANS); scene(SCR_MIWA, 130, after_miwa_scene);
  }
}

/* sequenza BUILD UP: testa sospesa, Big Shooter, 5 componenti agganciati, atterraggio */
static const u16 PART_T[5] = { 70, 100, 125, 150, 175 };
static const Frame *const PARTS[5] = { &spr_jpart_torso, &spr_jpart_armB, &spr_jpart_armF, &spr_jpart_legB, &spr_jpart_legF };
static s16 shooterX(void) { return buildT < 50 ? 420 - buildT * 4 : buildT < 210 ? 220 - (buildT - 50) / 4 : 180 + (buildT - 210) * 8; }
static void update_build(void) {
  buildT++;
  for (u8 k = 0; k < 5; k++) if (buildT == PART_T[k] + 22) { sfx(SFX_MAGNET); shake = 5; sparks(110, 172 - (k == 0 ? 72 : k < 3 ? 92 : 30), 6); }
  if (buildT == PART_T[0]) sfx(SFX_PUNCH);
  if (buildT > 215) { s16 y = PX(P.b.y) + 6; if (y >= GROUND) { y = GROUND; if (buildT < 300) { shake = 10; sfx(SFX_SLAM); buildT = 300; } } P.b.y = TOFX(y); }
  if (buildT > 340) scene(SCR_BUILD, 110, after_build_scene);
}
static void draw_build(void) {
  s16 fy = PX(P.b.y), fx0 = 110 - camX;
  /* Big Shooter in volo */
  draw_static(&spr_shooter0, shooterX(), 44 + ((buildT >> 3) & 1), 1, 2);
  draw_static(&spr_jpart_head, fx0, fy, 1, 2);
  for (u8 k = 0; k < 5; k++) {
    if (buildT < PART_T[k]) continue;
    s16 tt = buildT - PART_T[k]; s16 x = fx0, y = fy;
    if (tt < 22) { s16 sx = shooterX(), sy = 60; x = sx + ((fx0 - sx) * tt) / 22; y = sy + ((fy - sy) * tt) / 22 - (s16)((tt * (22 - tt)) / 3); }
    draw_static(PARTS[k], x, y, 1, 2);
  }
  if (buildT < 40 && (buildT & 4)) draw_static(&spr_star1_b, fx0, fy - 100, 1, 3);
}

/* ================= CAMERA ================= */
static void update_camera(u8 snap) {
  s16 target = PX(P.b.x) - 128 + P.b.face * 16;
  s16 maxX = worldW - 320; if (stage == 0) { s16 m = GATE_A + 40 - 320; if (m < maxX) maxX = m; }
  if (arenaLocked) target = ARENA_X0;
  if (target < 0) target = 0; if (target > maxX) target = maxX;
  if (snap) camX = target; else { s16 d = target - camX; s16 m = d / 6; if (!m && d) m = d > 0 ? 1 : -1; camX += m; }
}

/* ================= DISEGNO ================= */
static const Frame *player_frame(void) {
  u8 f = P.form; u8 run = (P.animT / (f == FORM_JEEG ? 7 : 5)) % 6, idle = (P.animT >> 5) & 1;
  static const Frame *const HI[16] = { &spr_hiro_idle0, &spr_hiro_idle1, &spr_hiro_run0, &spr_hiro_run1, &spr_hiro_run2, &spr_hiro_run3, &spr_hiro_run4, &spr_hiro_run5, &spr_hiro_jump, &spr_hiro_fall, &spr_hiro_punch, &spr_hiro_punch2, &spr_hiro_kick, &spr_hiro_airkick, &spr_hiro_hurt, &spr_hiro_dead };
  static const Frame *const HG[16] = { &spr_hirog_idle0, &spr_hirog_idle1, &spr_hirog_run0, &spr_hirog_run1, &spr_hirog_run2, &spr_hirog_run3, &spr_hirog_run4, &spr_hirog_run5, &spr_hirog_jump, &spr_hirog_fall, &spr_hirog_punch, &spr_hirog_punch2, &spr_hirog_kick, &spr_hirog_airkick, &spr_hirog_hurt, &spr_hirog_dead };
  static const Frame *const CY[16] = { &spr_cyb_idle0, &spr_cyb_idle1, &spr_cyb_run0, &spr_cyb_run1, &spr_cyb_run2, &spr_cyb_run3, &spr_cyb_run4, &spr_cyb_run5, &spr_cyb_jump, &spr_cyb_fall, &spr_cyb_punch, &spr_cyb_punch2, &spr_cyb_kick, &spr_cyb_airkick, &spr_cyb_hurt, &spr_cyb_dead };
  static const Frame *const JG[16] = { &spr_jeeg_idle0, &spr_jeeg_idle1, &spr_jeeg_run0, &spr_jeeg_run1, &spr_jeeg_run2, &spr_jeeg_run3, &spr_jeeg_run4, &spr_jeeg_run5, &spr_jeeg_jump, &spr_jeeg_fall, &spr_jeeg_punch, &spr_jeeg_punch2, &spr_jeeg_kick, &spr_jeeg_airkick, &spr_jeeg_hurt, &spr_jeeg_dead };
  const Frame *const *T = f == FORM_JEEG ? JG : f == FORM_CYBORG ? CY : gloves ? HG : HI;
  if (P.dead) return T[15];
  if (state == ST_WIN || winT) return f == FORM_JEEG ? &spr_jeeg_cheer : T[0];
  if (P.state == 3) return &spr_jeeg_beam;
  if (P.state == 2) return T[14];
  if (P.state == 1) return T[10 + (P.atk == 1 ? 0 : P.atk == 2 ? 1 : P.atk == 3 ? 2 : 3)];
  if (!P.b.onGround) return P.b.vy < 0 ? T[8] : T[9];
  if (P.b.vx) return T[2 + run];
  return T[idle];
}
static void draw_player(void) {
  if (P.inv > 0 && !P.dead && P.state != 2 && (P.inv & 4)) return;
  const Frame *f = player_frame();
  if (playerSlot->f != f) { if (queue_dma(f->tiles, playerSlot->base, f->ntiles)) playerSlot->f = f; }
  draw_frame(playerSlot->f ? playerSlot->f : f, playerSlot->base, PX(P.b.x) - camX, PX(P.b.y), P.b.face, 2);
}
static void draw_beam(void) {
  if (P.state != 3) return;
  s16 x0, y0, x1, y1, oy; beam_rect(&x0, &y0, &x1, &y1, &oy);
  s16 ox = P.b.face > 0 ? x0 : x1; s8 d = P.b.face;
  s16 grow = P.beamT * 12; s16 len = P.beam ? 330 : 300; if (grow > len) grow = len;
  if (P.beam) {
    for (s16 k = 0; k < grow; k += 32) { draw_static(&spr_pbeam, ox + d * k - camX - (d < 0 ? 32 : 0), oy, 1, 3); draw_static(&spr_pbeam, ox + d * k - camX - (d < 0 ? 32 : 0), oy + 18 + (k >> 3), 1, 3); }
  } else {
    for (s16 k = 0; k < grow; k += 32) draw_static(&spr_gcore, ox + d * k - camX - (d < 0 ? 32 : 0), oy, 1, 3);
    for (s16 k = (P.beamT * 5) % 38; k < grow; k += 38) draw_static((k / 38) & 1 ? &spr_ring1 : &spr_ring0, ox + d * k - camX, oy, 1, 3);
  }
}
static void draw_enemies(void) {
  for (u8 i = 0; i < MAX_EN; i++) {
    Enemy *e = &EN[i]; if (!e->alive && !e->deadT) continue;
    if (!e->alive && (e->deadT & 2)) continue;
    s16 sx = PX(e->b.x) - camX; if (sx < -100 || sx > 420) continue;
    const Frame *f; u8 t = e->type;
    if (t <= E_LANCER) {
      u8 run = (e->animT / 7) & 3;
      static const Frame *const SO[9] = { &spr_sold_idle0, &spr_sold_run0, &spr_sold_run1, &spr_sold_run2, &spr_sold_run3, &spr_sold_windup, &spr_sold_attack, &spr_sold_hurt, &spr_sold_fall };
      static const Frame *const LA[9] = { &spr_lanc_idle0, &spr_lanc_run0, &spr_lanc_run1, &spr_lanc_run2, &spr_lanc_run3, &spr_lanc_windup, &spr_lanc_attack, &spr_lanc_hurt, &spr_lanc_fall };
      const Frame *const *T = t == E_SOLDIER ? SO : LA;
      f = !e->alive || e->state == 4 ? T[7] : e->state == 9 ? T[8] : e->state == 2 ? T[5] : e->state == 3 ? T[6] : e->b.vx ? T[1 + run] : T[0];
    } else {
      u8 run = (e->animT / 9) & 3;
      static const Frame *const GI[7] = { &spr_giant_idle0, &spr_giant_walk0, &spr_giant_walk1, &spr_giant_walk2, &spr_giant_walk3, &spr_giant_windup, &spr_giant_attack };
      static const Frame *const GS[7] = { &spr_gshoot_idle0, &spr_gshoot_walk0, &spr_gshoot_walk1, &spr_gshoot_walk2, &spr_gshoot_walk3, &spr_gshoot_windup, &spr_gshoot_attack };
      const Frame *const *T = t == E_GIANT ? GI : GS;
      f = e->state == 2 ? T[5] : e->state == 3 ? T[6] : e->b.vx ? T[1 + run] : T[0];
    }
    u16 base = stage == 0 ? slot_get(1, 3, f) : slot_get(1, 2, f);
    if (base == 0xFFFF) continue;
    if (e->flash & 2) continue;
    draw_frame(f, base, sx, PX(e->b.y), e->b.face, 3);
    if (e->alive && e->state == 2 && (frameNo & 8)) draw_static(stage ? &spr_alert : &spr_alert_a, sx, PX(e->b.y) - e->b.h - 4, 1, 3);
  }
}
static void draw_boss(void) {
  if (!B.active) return;
  if (B.state == BS_DYING && B.deadT > 120) return;
  if ((B.flash & 2) || (B.state == BS_DYING && (B.deadT & 4))) return;
  static const Frame *const DW[4] = { &spr_dor_walk0, &spr_dor_walk1, &spr_dor_walk2, &spr_dor_walk3 };
  const Frame *f;
  switch (B.state) {
    case BS_SLAMW: case BS_JUMPW: f = &spr_dor_windup; break;
    case BS_SLAM: f = &spr_dor_slam; break;
    case BS_CHARGEW: case BS_CHARGE: f = &spr_dor_charge; break;
    case BS_HOP: case BS_JUMP: f = &spr_dor_jump; break;
    case BS_STUN: case BS_DYING: f = &spr_dor_hurt; break;
    case BS_WALK: f = DW[(B.at / 8) & 3]; break;
    case BS_SHOOTW: case BS_SHOOT: f = (frameNo & 4) ? &spr_dor_idle1 : &spr_dor_idle0; break;
    default: f = (B.at & 32) ? &spr_dor_idle1 : &spr_dor_idle0;
  }
  /* il boss usa entrambi gli slot dei giganti come un'unica area */
  if (bossLoaded != f) { if (queue_dma(f->tiles, slots[1].base, f->ntiles)) { bossLoaded = f; slots[1].f = 0; slots[2].f = 0; } }
  if (!bossLoaded) return;
  draw_frame(bossLoaded, slots[1].base, PX(B.b.x) - camX + ((B.state == BS_STUN) ? ((frameNo & 2) - 1) : 0), PX(B.b.y), B.b.face, 3);
  if ((B.state == BS_SLAMW || B.state == BS_SHOOTW || B.state == BS_CHARGEW || B.state == BS_JUMPW) && (frameNo & 8)) draw_static(&spr_alert, PX(B.b.x) - camX, PX(B.b.y) - 150, 1, 3);
}
static void draw_misc(void) {
  for (u8 i = 0; i < MAX_FX; i++) {
    Fx *f = &FXS[i]; if (!f->active) continue; s16 x = f->x - camX;
    if (f->kind == FX_STAR) draw_static(stage ? &spr_star1_b : (f->t & 2 ? &spr_star1_a : &spr_star0_a), x, f->y, 1, 3);
    else if (f->kind == FX_BOOM) draw_static(stage ? &spr_boom1_b : &spr_boom0_a, x, f->y, 1, 3);
    else if (stage) draw_static(&spr_spark, x, f->y, 1, 3);
    else draw_static(&spr_star0_a, x, f->y, 1, 3);
  }
  for (u8 i = 0; i < MAX_PR; i++) {
    Proj *p = &PR[i]; if (!p->active) continue; s16 x = PX(p->x) - camX, y = PX(p->y);
    const Frame *f = p->type == P_SPEAR ? &spr_spear : p->type == P_CLAY ? &spr_clay : p->type == P_ORB ? &spr_orb : &spr_shock1;
    draw_static(f, x, y, p->dir, 3);
  }
  for (u8 i = 0; i < MAX_IT; i++) {
    Item *it = &IT[i]; if (!it->active) continue; s16 x = it->x - camX; s16 bob = ((frameNo >> 3) & 1);
    const Frame *f = it->type == IT_GLOVES ? &spr_gloves_a : it->type == IT_HEALTH ? (stage ? &spr_health_b : &spr_health_a) : &spr_energy_b;
    draw_static(f, x, it->y - bob, 1, 2);
  }
  /* bandierine dei checkpoint */
  if (stage == 0) draw_static(&spr_flag1_a, CPX[1] - camX, GROUND, 1, 2);
}

/* ================= STATI ================= */
static void start_game(u8 cont) {
  score = 0; lives = 3; cp = 0; gloves = 0; kills = 0; playFrames = 0; winT = 0; buildOn = 0;
  if (cont && save_valid()) { cp = sram_read(2); gloves = sram_read(3); lives = sram_read(4); if (lives < 1 || lives > 9) lives = 3; score = ((u32)sram_read(5) << 16) | ((u16)sram_read(6) << 8) | sram_read(7); }
  respawn();
  if (!cont) { msg("TROVA I GUANTI! A=PUGNO B=SALTO", 300); save_game(); }
  else msg("PARTITA RIPRESA DAL CHECKPOINT", 180);
}
static void go_title(void) {
  show_screen(SCR_TITLE); state = ST_TITLE; stateT = 0; music(MUS_TITLE);
  window_rows(0x80 | 24);
  bottom_text(24, "LIVELLO 1: IL RISVEGLIO DEI MOSTRI", 0);
  bottom_text(25, "START: NUOVA PARTITA", 1);
  bottom_text(26, save_valid() ? "C: CONTINUA DAL CHECKPOINT" : " ", 0);
  bottom_text(27, "FAN GAME NON UFFICIALE - FPM 2026", 0);
}

static void step_play(void) {
  if ((joyPress & BTN_START) && !P.dead && !buildOn && !demo) { state = ST_PAUSE; msg("PAUSA - START PER CONTINUARE", 9999); draw_hud(); return; }
  playFrames++;
  if (msgT && msgT < 9999) msgT--;
  if (buildOn) { update_build(); update_fx(); return; }
  update_player(); if (state != ST_PLAY) return;
  for (u8 i = 0; i < MAX_EN; i++) update_enemy(&EN[i]);
  update_boss(); update_projectiles(); update_items(); update_fx();
  if (P.form == FORM_JEEG && P.state != 3 && P.en < 100 && ++enEnergyTick >= 40) { enEnergyTick = 0; P.en++; }
  /* checkpoint */
  if (stage == 0 && cp < 1 && PX(P.b.x) >= CPX[1]) activate_cp(1);
  if (stage == 1 && cp < 3 && PX(P.b.x) >= CPX[3]) activate_cp(3);
  /* arena del boss */
  if (stage == 1 && !bossStarted && PX(P.b.x) > ARENA_X0 + 60) {
    bossStarted = 1; arenaLocked = 1;
    for (u8 i = 0; i < MAX_EN; i++) EN[i].alive = 0, EN[i].deadT = 0;
    sfx(SFX_WARN); music(MUS_BOSS);
    update_camera(1); scene(SCR_BOSS, 130, 0); test_flags |= 8;
    return;
  }
  /* morte */
  if (P.dead && P.deadT > 100) {
    lives--;
    if (lives <= 0) { lives = 0; save_game(); state = ST_GAMEOVER; stateT = 0; show_screen(SCR_BOSS); window_rows(0x80 | 22); vdp_fill_plane(VRAM_PLANE_A, 0); bottom_text(23, "GAME OVER", 1); bottom_text(25, "START: CONTINUA DAL CHECKPOINT", 0); bottom_text(26, "C: MENU PRINCIPALE", 0); music(MUS_NONE); return; }
    save_game(); respawn(); msg("RESPAWN AL CHECKPOINT", 150); return;
  }
  /* vittoria */
  if (!B.alive && B.active && B.state == BS_DYING && B.deadT > 150 && !winT) {
    winT = 1; sfx(SFX_WIN); music(MUS_NONE);
    save_clear();
    show_screen(SCR_WIN); state = ST_WIN; stateT = 0; window_rows(0x80 | 21);
    char b[12]; bottom_text(21, "HANIWA GENJIN DOROMA SCONFITTO!", 1);
    num_text(b, score + lives * 1000, 7); clear_row(23); put_text(8, 23, "PUNTEGGIO", 0); put_text(19, 23, b, 1);
    num_text(b, kills, 3); clear_row(24); put_text(8, 24, "NEMICI", 0); put_text(19, 24, b, 1);
    num_text(b, playFrames / 60, 4); clear_row(25); put_text(8, 25, "TEMPO (S)", 0); put_text(19, 25, b, 1);
    bottom_text(26, "LIVELLO 2 SBLOCCATO (IN SVILUPPO)", 0); bottom_text(27, "PREMI START", 1);
    test_flags |= 0x80;
    return;
  }
  update_camera(0);
}

static void render_play(void) {
  spr_clear();
  if (buildOn) { draw_misc(); draw_build(); }
  else { draw_misc(); draw_beam(); draw_player(); draw_enemies(); draw_boss(); }
}

/* ================= BOT (demo arcade e test automatici) ================= */
static u16 bot(void) {
  static u16 t; t++;
  u16 j = 0;
  if (state == ST_TITLE) return (t & 32) ? BTN_START : 0;
  if (state == ST_WIN || state == ST_GAMEOVER) return (t & 16) ? BTN_START : 0;
  if (state != ST_PLAY || buildOn) return 0;
  if (P.dead) return 0;
  if (gloves && P.form != FORM_JEEG && P.b.onGround && (P.form == FORM_HUMAN || PX(P.b.x) > 2000)) return (t & 8) ? BTN_C : 0;
  s16 px = PX(P.b.x); s16 reach = P.form == FORM_JEEG ? 90 : 38; s16 best = 999; s8 dir = 1; u8 isBoss = 0;
  for (u8 i = 0; i < MAX_EN; i++) { Enemy *e = &EN[i]; if (!e->alive) continue; s16 d = PX(e->b.x) - px; s16 ad = d < 0 ? -d : d; ad -= e->b.w / 2; if (ad < best && (PX(e->b.y) - PX(P.b.y) < 24 && PX(P.b.y) - PX(e->b.y) < 24)) { best = ad; dir = d < 0 ? -1 : 1; } }
  if (B.active && B.alive) { s16 d = PX(B.b.x) - px; s16 ad = (d < 0 ? -d : d) - 35; if (ad < best) { best = ad; dir = d < 0 ? -1 : 1; isBoss = 1; } }
  if (best < reach) {
    if (dir != P.b.face) j |= dir > 0 ? BTN_RIGHT : BTN_LEFT;
    else if ((t & 7) == 0) j |= BTN_A;
    if (isBoss && best < 30) j = dir > 0 ? BTN_LEFT : BTN_RIGHT;
  } else j |= BTN_RIGHT;
  if (P.form == FORM_JEEG && best < 260 && P.state == 0 && (t % 50) == 0 && P.en >= (P.beam ? 35 : 15)) j = BTN_A | BTN_B;
  if (P.form == FORM_JEEG && isBoss && (t % 200) == 100) j = BTN_C;
  if (pWall && P.b.onGround) j |= (t & 16) ? BTN_B : 0;
  if ((j & BTN_B) && !(j & BTN_A)) j |= BTN_RIGHT;
  return j;
}

/* ================= MAIN ================= */
int main(void) {
  vdp_init(); snd_init();
  __asm__ volatile("move.w #0x2500,%sr");
#ifdef AUTOPLAY
  demo = 1; god = 1;
#endif
#ifdef NOGOD
  god = 0;
#endif
  go_title();
  for (;;) {
    /* --- logica --- */
    u16 pad = pad_read();
    if (demo) pad = bot();
    joyPrev = joy; joy = pad; joyPress = joy & ~joyPrev;
    frameNo++; stateT++;
    switch (state) {
      case ST_TITLE:
        if (stateT > 30 && (joyPress & BTN_START)) { sfx(SFX_CP); start_game(0); }
        else if (stateT > 30 && (joyPress & BTN_C) && save_valid()) { sfx(SFX_CP); start_game(1); }
        break;
      case ST_PLAY: step_play(); break;
      case ST_PAUSE: if (joyPress & BTN_START) { state = ST_PLAY; msgT = 0; } break;
      case ST_SCENE:
        if (stateT >= sceneLen || (stateT > 40 && (joyPress & (BTN_A | BTN_START)) && sceneId != SCR_HIRO && sceneId != SCR_MIWA)) {
          if (sceneNext) sceneNext(); else { load_stage(stage, 0); vdp_set_color(3 * 16 + 10, 0x028E); state = ST_PLAY; B.active = 1; B.state = BS_INTRO; B.at = 0; msg("SCONFIGGI DOROMA! ATTENTO AI SEGNALI !", 200); }
        }
        break;
      case ST_GAMEOVER:
        if (stateT > 60 && (joyPress & BTN_START)) { lives = 3; score = 0; respawn(); }
        else if (stateT > 60 && (joyPress & BTN_C)) go_title();
        break;
      case ST_WIN: if (stateT > 120 && (joyPress & BTN_START)) go_title(); break;
    }
    /* --- disegno --- */
    if (state == ST_PLAY || state == ST_PAUSE) render_play(); else spr_clear();
    vdp_wait_vblank();
    /* --- VBlank: trasferimenti video --- */
    if (state == ST_PLAY || state == ST_PAUSE) {
      flush_dma(); spr_flush();
      s16 sx = 0, sy = 0; if (shake) { sx = (frameNo & 1) ? shake : -shake; sy = (frameNo & 2) ? 1 : -1; shake--; }
      vdp_hscroll(-camX + sx, -(camX >> 2)); vdp_vscroll(sy, 0);
      stream_columns();
      if (flashT) { flashT--; vdp_set_color(0, (flashT & 2) ? 0x0EEE : 0); } else vdp_set_color(0, 0);
      draw_hud();
    } else { ndq = 0; dmaBytes = 0; spr_flush(); }
    snd_update();
  }
}
