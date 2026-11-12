/* game.h — strutture comuni del gioco (Mega Drive). Coordinate in 1/16 di pixel (FX). */
#ifndef GAME_H
#define GAME_H
#include "md.h"
#include "assets.h"

#define FX 4
#define TOFX(v) ((s32)(v) << FX)
#define PX(v) ((s16)((v) >> FX))

enum { FORM_HUMAN, FORM_CYBORG, FORM_JEEG };
enum { ST_TITLE, ST_INTRO, ST_PLAY, ST_SCENE, ST_GAMEOVER, ST_WIN, ST_PAUSE };
enum { E_SOLDIER, E_LANCER, E_GIANT, E_GSHOOT };
enum { P_SPEAR, P_CLAY, P_ORB, P_SHOCK };
enum { IT_GLOVES, IT_HEALTH, IT_ENERGY };

typedef struct { s16 x, y, w, h; u8 oneway; } Plat;
typedef struct { u8 type; s16 x, y; u8 ambush; } EnemyDef;
typedef struct { u8 type; s16 x, y; } ItemDef;

typedef struct {
  s32 x, y; s16 vx, vy; s16 w, h; s8 face; u8 onGround;
} Body;

typedef struct {
  Body b; u8 form; s16 hp, en; u8 beam; /* 0 gamma 1 proton */
  u8 state; u16 st; u8 atk, atkStep, atkHit, comboQ; s16 inv; u16 animT; u8 jumpT; s16 coyote;
  u16 beamT; u8 dead; u16 deadT;
} Player;

typedef struct {
  Body b; u8 type, alive, state; s16 hp; u16 st, at; s16 home; s16 inv; u8 flash; u8 hitByAtk; u8 hitDone;
  u16 animT; u16 deadT; const Plat *plat; u8 drop;
} Enemy;

typedef struct { u8 active, type; s32 x, y; s16 vx, vy, grav; u16 life; s8 dir; } Proj;
typedef struct { u8 active, kind; s16 x, y, vx, vy; u8 life, t; } Fx;
typedef struct { u8 active, type; s16 x, y; } Item;

#define MAX_EN 12
#define MAX_PR 12
#define MAX_FX 16
#define MAX_IT 8

extern Player P;
extern Enemy EN[MAX_EN];
extern Proj PR[MAX_PR];
extern Fx FXS[MAX_FX];
extern Item IT[MAX_IT];
extern u16 joy, joyPrev, joyPress;
extern u32 score;
extern s8 lives;
extern u8 stage, cp, gloves;
extern s16 camX;

/* audio.c */
void snd_init(void);
void snd_update(void);
void sfx(u8 id);
void music(u8 song);
enum { SFX_PUNCH = 1, SFX_KICK, SFX_JUMP, SFX_HURT, SFX_HIT, SFX_DIE, SFX_PICK, SFX_GLOVES, SFX_CP, SFX_TRANS, SFX_MAGNET, SFX_GAMMA, SFX_PROTON, SFX_DENY, SFX_SELECT, SFX_SLAM, SFX_BOOM, SFX_WARN, SFX_WIN };
enum { MUS_NONE, MUS_TITLE, MUS_STAGE, MUS_BOSS };
#endif
