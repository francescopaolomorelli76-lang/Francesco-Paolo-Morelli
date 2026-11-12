| JEEG ROBOT D'ACCIAIO - Mega Drive / Genesis homebrew
| Tabella vettori, header ROM, avvio (TMSS), interrupt VBlank.
    .section .text.boot,"ax"
    .globl _start
    .org 0x000
vectors:
    .long 0x00FFFE00          | SP iniziale
    .long _start              | PC iniziale
    .rept 22
    .long _exc
    .endr
    .long _exc                | 24 spurious
    .long _exc                | 25 L1
    .long _exc                | 26 L2 (EXT)
    .long _exc                | 27 L3
    .long _hint               | 28 L4 (HBlank)
    .long _exc                | 29 L5
    .long _vint               | 30 L6 (VBlank)
    .long _exc                | 31 L7
    .rept 32
    .long _exc
    .endr
    .org 0x100
    .ascii "SEGA MEGA DRIVE "
    .org 0x110
    .ascii "(C)FPM  2026.NOV"
    .org 0x120
    .ascii "JEEG ROBOT D'ACCIAIO - FAN GAME"
    .org 0x150
    .ascii "JEEG ROBOT D'ACCIAIO - FAN GAME"
    .org 0x180
    .ascii "GM 00000001-00"
    .word 0x0000
    .ascii "J"
    .org 0x1A0
    .long 0x00000000, 0x003FFFFF
    .long 0x00FF0000, 0x00FFFFFF
    .ascii "RA"
    .word 0xF820
    .long 0x00200001, 0x0020FFFF
    .org 0x1F0
    .ascii "JUE"
    .org 0x200
_start:
    move.w  #0x2700, %sr
    move.b  0xA10001, %d0
    andi.b  #0x0F, %d0
    beq.s   1f
    move.l  #0x53454741, 0xA14000   | 'SEGA' per TMSS
1:  tst.w   0xC00004
    | azzera RAM
    lea     0xFF0000, %a0
    move.w  #0x3FFF, %d1
2:  clr.l   (%a0)+
    dbra    %d1, 2b
    | copia .data
    lea     _data_load, %a0
    lea     _data_start, %a1
    lea     _data_end, %a2
3:  cmpa.l  %a2, %a1
    bcc.s   4f
    move.w  (%a0)+, (%a1)+
    bra.s   3b
4:  move.l  #0x00FFFE00, %sp
    jsr     main
5:  bra.s   5b

_vint:
    movem.l %d0-%d1/%a0-%a1, -(%sp)
    tst.w   0xC00004
    addq.l  #1, vblank_count
    movem.l (%sp)+, %d0-%d1/%a0-%a1
    rte
_hint:
    rte

| moltiplicazione 32 bit per 68000 (stessa logica di libgcc)
    .globl __mulsi3
__mulsi3:
    move.w  4(%sp), %d0
    mulu.w  10(%sp), %d0
    move.w  6(%sp), %d1
    mulu.w  8(%sp), %d1
    add.w   %d1, %d0
    swap    %d0
    clr.w   %d0
    move.w  6(%sp), %d1
    mulu.w  10(%sp), %d1
    add.l   %d1, %d0
    rts

_exc:
    move.w  #0x2700, %sr
6:  bra.s   6b
    .section .note.GNU-stack,"",@progbits
