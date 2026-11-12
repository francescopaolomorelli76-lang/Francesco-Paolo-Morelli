/* audio.c — musica ed effetti ORIGINALI sul chip PSG SN76489 (3 toni + rumore).
 * Canale 0 melodia, canale 1 basso, canale 2 effetti, canale 3 rumore (batteria/effetti). */
#include "game.h"

static const u16 period[64] = { 1023, 1023, 1023, 1023, 1023, 1023, 1023, 1023, 1023, 1017, 960, 906, 855, 807, 762, 719, 679, 641, 605, 571, 539, 508, 480, 453, 428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226, 214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113, 107, 101, 95, 90, 85, 80, 76, 71, 67, 64, 60, 57, 53, 50, 48, 45 }; /* note MIDI 36..99 */
static const u8 *song_lead, *song_bass; static u8 song_len_l, song_len_b, song_step, song_tick, song_speed, cur_song;
static u8 sfx_id, sfx_t, noise_t, noise_vol;

static const u8 STAGE_L[32] = { 69, 0, 72, 74, 76, 0, 74, 72, 74, 0, 72, 69, 67, 0, 69, 0, 65, 0, 69, 72, 74, 0, 72, 69, 71, 0, 67, 71, 74, 0, 76, 0 };
static const u8 STAGE_B[16] = { 45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 43, 43, 55, 47 };
static const u8 BOSS_L[32] = { 76, 75, 76, 0, 79, 0, 76, 0, 77, 76, 77, 0, 81, 0, 77, 0, 76, 75, 76, 0, 83, 0, 81, 79, 77, 0, 76, 0, 75, 0, 71, 0 };
static const u8 BOSS_B[16] = { 40, 40, 52, 40, 41, 41, 53, 41, 40, 40, 52, 40, 38, 38, 50, 39 };
static const u8 TITLE_L[32] = { 69, 0, 0, 72, 76, 0, 74, 0, 72, 0, 0, 69, 71, 0, 67, 0, 69, 0, 0, 72, 77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 0, 0 };
static const u8 TITLE_B[16] = { 45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0, 40, 0, 47, 0 };

void snd_init(void) { psg_silence(); }
static u16 per(u8 note) { if (note < 36) note = 36; if (note > 99) note = 99; return period[note - 36]; }

void music(u8 s) {
  if (s == cur_song) return;
  cur_song = s; song_step = 0; song_tick = 0;
  PSG_PORT = 0x9F; PSG_PORT = 0xBF;
  switch (s) {
    case MUS_STAGE: song_lead = STAGE_L; song_bass = STAGE_B; song_speed = 6; break;
    case MUS_BOSS: song_lead = BOSS_L; song_bass = BOSS_B; song_speed = 5; break;
    case MUS_TITLE: song_lead = TITLE_L; song_bass = TITLE_B; song_speed = 8; break;
    default: song_lead = 0; break;
  }
  song_len_l = 32; song_len_b = 16;
}

void sfx(u8 id) { sfx_id = id; sfx_t = 0; }

static void noise(u8 mode, u8 vol, u8 frames) { noise_t = frames; noise_vol = vol; psg_noise(mode, vol); }

void snd_update(void) {
  /* musica */
  if (song_lead) {
    if (song_tick == 0) {
      u8 l = song_lead[song_step % song_len_l], b = song_bass[song_step % song_len_b];
      if (l) psg_tone(0, per(l), 4); else PSG_PORT = 0x9F | (0 << 5);
      if (b) psg_tone(1, per(b - 12 < 36 ? b : b - 12), 5); else PSG_PORT = 0x9F | (1 << 5);
      if (!noise_t && (song_step & 3) == 0) { psg_noise(5, 9); noise_vol = 9; }
      song_step++;
    } else {
      u8 v = 4 + song_tick; if (v > 15) v = 15; PSG_PORT = 0x90 | (0 << 5) | v;
      if (!noise_t) { if (noise_vol < 15) noise_vol += 3; if (noise_vol > 15) noise_vol = 15; PSG_PORT = 0xF0 | noise_vol; }
    }
    if (++song_tick >= song_speed) song_tick = 0;
  }
  /* effetti sul canale 2 + rumore */
  if (sfx_id) {
    u8 t = sfx_t++;
    switch (sfx_id) {
      case SFX_PUNCH: if (t == 0) noise(6, 3, 5); psg_tone(2, 300 + t * 60, 6 + t); if (t > 5) sfx_id = 0; break;
      case SFX_KICK: if (t == 0) noise(5, 2, 8); psg_tone(2, 400 + t * 80, 5 + t); if (t > 7) sfx_id = 0; break;
      case SFX_JUMP: psg_tone(2, 300 - t * 20, 6 + (t >> 1)); if (t > 9) sfx_id = 0; break;
      case SFX_HURT: psg_tone(2, 200 + t * 40, 4 + (t >> 1)); if (t == 0) noise(6, 4, 6); if (t > 12) sfx_id = 0; break;
      case SFX_HIT: if (t == 0) noise(4, 3, 6); psg_tone(2, 150 + t * 30, 6 + t); if (t > 6) sfx_id = 0; break;
      case SFX_DIE: psg_tone(2, 200 + t * 12, 3 + t / 6); if (t > 60) sfx_id = 0; break;
      case SFX_PICK: psg_tone(2, t < 5 ? 160 : 107, 5); if (t > 10) sfx_id = 0; break;
      case SFX_GLOVES: case SFX_CP: case SFX_WIN: { static const u8 arp[8] = { 72, 76, 79, 84, 79, 84, 88, 91 }; psg_tone(2, per(arp[(t >> 2) & 7]), 4); if (t > (sfx_id == SFX_WIN ? 60 : 30)) sfx_id = 0; } break;
      case SFX_TRANS: psg_tone(2, 900 - t * 10, 4); if ((t & 7) == 0) noise(7, 6, 4); if (t > 70) sfx_id = 0; break;
      case SFX_MAGNET: psg_tone(2, 60 + t * 25, 3 + (t >> 1)); if (t == 0) noise(5, 2, 10); if (t > 16) sfx_id = 0; break;
      case SFX_GAMMA: psg_tone(2, 400 - (t & 15) * 12, 3); if (t > 40) sfx_id = 0; break;
      case SFX_PROTON: psg_tone(2, 80 + (t & 7) * 6, 3); if ((t & 3) == 0) noise(4, 7, 3); if (t > 50) sfx_id = 0; break;
      case SFX_DENY: psg_tone(2, 700, 5); if (t > 8) sfx_id = 0; break;
      case SFX_SELECT: psg_tone(2, 120, 6); if (t > 4) sfx_id = 0; break;
      case SFX_SLAM: if (t == 0) noise(6, 0, 18); psg_tone(2, 900, 3 + (t >> 1)); if (t > 18) sfx_id = 0; break;
      case SFX_BOOM: if ((t & 7) == 0) noise(6, t >> 3, 8); if (t > 60) sfx_id = 0; break;
      case SFX_WARN: psg_tone(2, (t & 16) ? 254 : 339, 4); if (t > 50) sfx_id = 0; break;
      default: sfx_id = 0;
    }
    if (!sfx_id) PSG_PORT = 0x9F | (2 << 5);
  }
  if (noise_t) { noise_t--; if (noise_vol < 15) noise_vol++; PSG_PORT = 0xF0 | noise_vol; if (!noise_t && !song_lead) PSG_PORT = 0xFF; }
}
