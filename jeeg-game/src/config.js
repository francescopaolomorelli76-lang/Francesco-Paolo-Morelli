/* JEEG ROBOT D'ACCIAIO — MASTER 1.2
 * config.js — costanti e DATI (separati dal codice di gioco).
 * La campagna completa (20 livelli) proviene da 02_DATI/livelli_20.json.
 */
'use strict';
window.J = window.J || {};

J.VIEW_W = 960;
J.VIEW_H = 540;
J.DT = 1 / 60;
J.SAVE_KEY = 'jeeg_master_1_2_save';
J.BINDINGS_KEY = 'jeeg_master_1_2_bindings';
J.HISCORE_KEY = 'jeeg_master_1_2_hiscore';

/* Da 02_DATI/configurazione_gioco.json */
J.GAME_CONFIG = {
  version: '1.2',
  special_cost: { gamma: 15, proton: 35 },
  playable_forms: ['Hiroshi umano', 'Hiroshi forma intermedia', 'Jeeg completo'],
};

/* Statistiche delle tre forme giocabili (unità = pixel-mondo) */
J.FORMS = {
  human: {
    label: 'HIROSHI', w: 26, h: 76, speed: 235, jump: 640, grav: 1750, hp: 100,
    reach: 30, dmg: [1, 1, 2], zoom: 1,
  },
  cyborg: {
    label: 'CYBORG', w: 30, h: 84, speed: 290, jump: 720, grav: 1800, hp: 100,
    reach: 36, dmg: [2, 2, 3], zoom: 1,
  },
  jeeg: {
    label: 'JEEG', w: 96, h: 300, speed: 430, jump: 1180, grav: 2700, hp: 100,
    reach: 110, dmg: [2, 2, 4], zoom: 0.52,
  },
};

/* Campagna completa: 20 livelli (dati utente). Solo il n.1 è giocabile in questa build. */
J.CAMPAIGN = [
  { n: 1, title: 'Il risveglio dei mostri', env: 'Circuito / periferia', boss: 'Haniwa Genjin Doroma', chapter: 'Yamatai', playable: true, bossRef: 'Doroma: ascia, scudo rotondo, faccia demoniaca sul petto (rif. utente 9)' },
  { n: 2, title: 'Il rapimento di Mayumi', env: 'Quartiere / bosco', boss: 'Mostro Haniwa', chapter: 'Yamatai', bossRef: 'mostro corazzato marrone, cresta rossa, cintura con teschio, coda a frusta (rif. utente 7)' },
  { n: 3, title: "L'inganno di Mimashi", env: 'Caverne', boss: 'Mimashi', chapter: 'Yamatai' },
  { n: 4, title: 'Missili perforanti', env: 'Porto', boss: 'Haniwa gigante', chapter: 'Yamatai', bossRef: 'volto bianco con lunghe corna bionde (rif. utente 3c)' },
  { n: 5, title: 'Il segreto della campana', env: 'Rovine archeologiche', boss: 'Guardiano rovine', chapter: 'Yamatai', bossRef: 'gigante giallo, muso leonino, torace a scheletro, falce (rif. utente 5)' },
  { n: 6, title: 'La valle degli Haniwa', env: 'Canyon', boss: 'Amaso', chapter: 'Yamatai' },
  { n: 7, title: 'S.O.S. Big Shooter', env: 'Cielo / montagne', boss: 'Mostro volante', chapter: 'Yamatai', bossRef: 'mostro dal volto viola con cappello giallo che afferra il Big Shooter (rif. utente 3a)' },
  { n: 8, title: 'Il guerriero Takeru', env: 'Tempio antico', boss: 'Takeru', chapter: 'Yamatai' },
  { n: 9, title: 'Assedio alla Base', env: 'Base Antiatomica', boss: 'Ikima', chapter: 'Yamatai' },
  { n: 10, title: 'La Regina di Yamatai', env: 'Palazzo Himika', boss: 'Regina Himika', chapter: 'Yamatai', bossRef: 'Regina Himika (rif. utente 2 + originale 05)' },
  { n: 11, title: "L'ombra del Drago", env: 'Fortezza sotterranea', boss: "Mostro dell'Imperatore", chapter: 'Impero del Drago', bossRef: 'teschio verde con corno, mantello rosso a pois gialli (rif. utente 3d)' },
  { n: 12, title: 'La città sotto assedio', env: 'Tokyo devastata', boss: 'Robot bestia', chapter: 'Impero del Drago', bossRef: 'testa rossa cornuta, corpo grigio (rif. utente 6)' },
  { n: 13, title: 'La corsa infernale', env: 'Autostrada / tunnel', boss: 'Mecha assalto', chapter: 'Impero del Drago', bossRef: 'mostro rotondo verde a pois (rif. utente 8)' },
  { n: 14, title: 'La minaccia dalle tenebre', env: 'Fabbrica robotica', boss: 'Bestia meccanica', chapter: 'Impero del Drago', bossRef: 'robot grigio cornuto con mazza chiodata (rif. utente 4 + disegno)' },
  { n: 15, title: 'Il cimitero dimensionale', env: 'Dimensione aliena', boss: 'Guardiano dimensionale', chapter: 'Impero del Drago', bossRef: 'mostro scuro avvolto dalle fiamme (rif. utente 3b)' },
  { n: 16, title: 'La rosa nera', env: 'Foresta e rovine', boss: 'Comandante robotico', chapter: 'Impero del Drago', bossRef: 'guerriero cornuto muscoloso con falce (rif. utente 10, disegno)' },
  { n: 17, title: 'Il dilemma di Flora', env: 'Castello del Drago', boss: 'Generale Flora', chapter: 'Impero del Drago' },
  { n: 18, title: 'Il sacrificio di Flora', env: 'Fortezza in fiamme', boss: 'Guardia imperiale', chapter: 'Impero del Drago' },
  { n: 19, title: 'Il palazzo del Drago', env: 'Torre imperiale', boss: 'Guardiano supremo', chapter: 'Impero del Drago' },
  { n: 20, title: 'La battaglia finale', env: 'Sala del trono', boss: 'Imperatore del Drago', chapter: 'Impero del Drago', bossRef: 'Imperatore del Drago (rif. utente 1 + originale 08)' },
];

/* ------------------------------------------------------------------
 * LIVELLO 1 — layout dati.
 * Zona umana (zoom 1) 0..2700, cancello dei giganti a 2700,
 * zona Jeeg (zoom 0.52) fino all'arena del boss.
 * ------------------------------------------------------------------ */
J.LEVEL1 = {
  id: 1,
  title: 'IL RISVEGLIO DEI MOSTRI',
  groundY: 460,
  worldW: 8000,
  giantGateX: 2720,
  arena: { x0: 6060, x1: 7900 },
  checkpoints: [
    { id: 0, x: 90, label: 'PARTENZA', form: 'human' },
    { id: 1, x: 1180, label: 'BOX DEL CIRCUITO', form: 'human' },
    { id: 2, x: 2780, label: 'JEEG ASSEMBLATO', form: 'jeeg', auto: true },
    { id: 3, x: 5650, label: 'PRIMA DEL BOSS', form: 'jeeg' },
  ],
  gloves: { x: 1960 },
  /* piattaforme: x, y (bordo superiore), w; oneWay = attraversabile dal basso */
  platforms: [
    { x: 420, y: 395, w: 120, h: 65, kind: 'crate' },
    { x: 640, y: 360, w: 150, h: 14, kind: 'ledge', oneWay: true },
    { x: 900, y: 405, w: 90, h: 55, kind: 'crate' },
    { x: 1420, y: 370, w: 180, h: 14, kind: 'ledge', oneWay: true },
    { x: 1660, y: 300, w: 140, h: 14, kind: 'ledge', oneWay: true },
    { x: 1860, y: 410, w: 210, h: 50, kind: 'car' },
    { x: 2240, y: 400, w: 110, h: 60, kind: 'crate' },
    { x: 2420, y: 345, w: 160, h: 14, kind: 'ledge', oneWay: true },
    /* zona Jeeg: rocce/palazzi distrutti (scala gigante) */
    { x: 3550, y: 330, w: 260, h: 130, kind: 'rubble' },
    { x: 4550, y: 250, w: 300, h: 26, kind: 'girder', oneWay: true },
    { x: 5150, y: 340, w: 220, h: 120, kind: 'rubble' },
  ],
  enemies: [
    { type: 'soldier', x: 560 },
    { type: 'soldier', x: 820 },
    { type: 'lancer', x: 1080 },
    { type: 'soldier', x: 1350 },
    { type: 'soldier', x: 1540 },
    { type: 'lancer', x: 1730, y: 300 },
    { type: 'soldier', x: 2150, ambush: true },
    { type: 'lancer', x: 2380, ambush: true },
    { type: 'soldier', x: 2520, ambush: true },
    { type: 'soldier', x: 2620, ambush: true },
    { type: 'giant', x: 3300 },
    { type: 'giantShooter', x: 4100 },
    { type: 'giant', x: 4700 },
    { type: 'giant', x: 5350 },
    { type: 'giantShooter', x: 5550 },
  ],
  pickups: [
    { type: 'health', x: 940, y: 380 },
    { type: 'health', x: 1730, y: 270 },
    { type: 'energy', x: 3680, y: 280 },
    { type: 'health', x: 4700, y: 200 },
    { type: 'energy', x: 4800, y: 200 },
    { type: 'energy', x: 5900, y: 400 },
    { type: 'health', x: 5260, y: 290 },
  ],
  boss: { x: 7300, hp: 70, name: 'HANIWA GENJIN DOROMA' },
};
