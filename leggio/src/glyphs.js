// Segni musicali. f: m = font musicale (Noto Music), i = corsivo d'espressione, b = grassetto, t = testo, e = emoji.
// v: segno disegnato a vettori (per i segni che in Unicode esistono solo come "combinanti").
const U = cp => String.fromCodePoint(cp);
const m = (c,n)=>({c,f:'m',n});
const it = (c,n)=>({c,f:'i',n:n||c});
const bd = (c,n)=>({c,f:'b',n:n||c});
const vx = (v,n)=>({v,n});
const range = (a,b,names)=>{const o=[];for(let cp=a;cp<=b;cp++)o.push(m(U(cp),names?names[cp-a]:''));return o;};
const P=U(0x1D18F), MZ=U(0x1D190), F=U(0x1D191), S=U(0x1D18D), Z=U(0x1D18E), R=U(0x1D18C);

const STAMP_CATS = [
  {id:'acc', name:'Alterazioni', items:[
    m('♭','bemolle'),m('♯','diesis'),m('♮','bequadro'),m(U(0x1D12B),'doppio bemolle'),m(U(0x1D12A),'doppio diesis'),
    m(U(0x1D133),'¼ tono ♭'),m(U(0x1D132),'¼ tono ♯'),m(U(0x1D12C),'♭ su'),m(U(0x1D12D),'♭ giù'),m(U(0x1D12E),'♮ su'),
    m(U(0x1D12F),'♮ giù'),m(U(0x1D130),'♯ su'),m(U(0x1D131),'♯ giù'),m('(♭)','♭ cortesia'),m('(♯)','♯ cortesia'),m('(♮)','♮ cortesia'),
  ]},
  {id:'dyn', name:'Dinamiche', items:[
    m(P+P+P+P,'pppp'),m(P+P+P,'ppp'),m(P+P,'pp'),m(P,'p'),m(MZ+P,'mp'),m(MZ+F,'mf'),m(F,'f'),m(F+F,'ff'),m(F+F+F,'fff'),m(F+F+F+F,'ffff'),
    m(S+F,'sf'),m(S+F+Z,'sfz'),m(S+F+F+Z,'sffz'),m(S+F+P,'sfp'),m(F+P,'fp'),m(F+Z,'fz'),m(R+F,'rf'),m(R+F+Z,'rfz'),m(P+F,'pf'),m(S+P,'sp'),
    m(U(0x1D192),'crescendo'),m(U(0x1D193),'decrescendo'),vx('hairCresc','forcella <'),vx('hairDim','forcella >'),
    it('cresc.'),it('decresc.'),it('dim.'),it('sub.'),it('subito p'),it('più f'),it('meno f'),it('poco'),it('molto'),it('poco a poco'),it('sempre'),it('niente'),
  ]},
  {id:'art', name:'Articolazioni', items:[
    vx('stacc','staccato'),vx('staccis','staccatissimo'),vx('tenuto','tenuto'),vx('portato','portato'),vx('accent','accento'),
    vx('accStacc','accento + stacc.'),vx('marcato','marcato'),vx('marcStacc','marcato + stacc.'),vx('marcDown','marcato giù'),vx('tenAcc','tenuto + accento'),
    m(U(0x1D110),'corona'),m(U(0x1D111),'corona sotto'),vx('fermSq','corona lunga'),vx('fermTri','corona breve'),m(U(0x1D112),'respiro'),
    m(U(0x1D113),'cesura'),vx('breathV','respiro V'),vx('upBow','arcata su'),vx('downBow','arcata giù'),vx('harmonic','armonico'),
    vx('snapPizz','pizz. Bartók'),bd('+','chiuso'),vx('open','aperto'),vx('thumb','pollice'),m(U(0x1D183),'arpeggio ↑'),
    m(U(0x1D184),'arpeggio ↓'),m(U(0x1D1B1),'glissando ↑'),m(U(0x1D1B2),'glissando ↓'),vx('doit','doit'),vx('fall','caduta'),
    vx('scoop','scoop'),vx('vibrato','vibrato'),
  ]},
  {id:'orn', name:'Abbellimenti', items:[
    m(U(0x1D196),'trillo'),vx('trillLine','trillo ~~~'),vx('mordent','mordente'),vx('prall','mordente sup.'),m(U(0x1D197),'gruppetto'),
    m(U(0x1D198),'gruppetto inv.'),m(U(0x1D199),'gruppetto barrato'),m(U(0x1D19A),'gruppetto su'),m(U(0x1D194),'acciaccatura'),m(U(0x1D195),'appoggiatura'),
    vx('trem1','tremolo 1'),vx('trem2','tremolo 2'),vx('trem3','tremolo 3'),m(U(0x1D16A),'tremolo 2 note'),m(U(0x1D16B),'tremolo 2 note ×2'),
    m(U(0x1D16C),'tremolo 2 note ×3'),...range(0x1D19B,0x1D1A5).map((g,i)=>({...g,n:'tratto '+(i+1)})),
  ]},
  {id:'note', name:'Note', items:[
    m(U(0x1D15C),'breve'),m(U(0x1D15D),'semibreve'),m(U(0x1D15E),'minima'),m(U(0x1D15F),'semiminima'),m(U(0x1D160),'croma'),
    m(U(0x1D161),'semicroma'),m(U(0x1D162),'biscroma'),m(U(0x1D163),'semibiscroma'),m(U(0x1D164),'1/128'),m('♩','semiminima'),
    m('♪','croma'),m('♫','crome'),m('♬','semicrome'),m(U(0x1D15F)+'.','semimin. punt.'),m(U(0x1D15E)+'.','minima punt.'),
    m(U(0x1D160)+'.','croma punt.'),m(U(0x1D158),'testa nera'),m(U(0x1D157),'testa vuota'),m(U(0x1D143),'testa x'),m(U(0x1D144),'testa +'),
    m(U(0x1D145),'testa ⊗'),m(U(0x1D146),'quadrata'),m(U(0x1D147),'quadrata nera'),m(U(0x1D148),'triangolo'),m(U(0x1D149),'triangolo nero'),
    ...range(0x1D14A,0x1D156,['△ sx','▲ sx','△ dx','▲ dx','▽','▼','◸','◤','luna','luna nera','goccia','goccia nera','(testa)']),
    m(U(0x1D159),'testa nulla'),m(U(0x1D15A),'cluster'),m(U(0x1D15B),'cluster nero'),
    bd('3','terzina'),bd('5','quintina'),bd('6','sestina'),
    m('♩ = 60','♩=60'),m('♩ = 72','♩=72'),m('♩ = 92','♩=92'),m('♩ = 120','♩=120'),m(U(0x1D15E)+' = 60','𝅗𝅥=60'),
  ]},
  {id:'rest', name:'Pause', items:[
    m(U(0x1D13B),'semibreve'),m(U(0x1D13C),'minima'),m(U(0x1D13D),'semiminima'),m(U(0x1D13E),'croma'),m(U(0x1D13F),'semicroma'),
    m(U(0x1D140),'biscroma'),m(U(0x1D141),'semibiscroma'),m(U(0x1D142),'1/128'),m(U(0x1D13A),'multipla'),m(U(0x1D129),'più battute'),
    vx('multiRest','pausa lunga'),bd('G.P.','gran pausa'),
  ]},
  {id:'clef', name:'Chiavi e tempi', items:[
    m(U(0x1D11E),'violino'),m(U(0x1D120),'violino 8 basso'),m(U(0x1D11F),'violino 8 alto'),m(U(0x1D121),'do (contralto/tenore)'),m(U(0x1D122),'basso'),
    m(U(0x1D124),'basso 8 basso'),m(U(0x1D123),'basso 8 alto'),m(U(0x1D125),'percussioni'),m(U(0x1D126),'percussioni 2'),m(U(0x1D134),'C'),
    m(U(0x1D135),'C tagliato'),vx('ts:2/4','2/4'),vx('ts:3/4','3/4'),vx('ts:4/4','4/4'),vx('ts:5/4','5/4'),
    vx('ts:6/4','6/4'),vx('ts:2/2','2/2'),vx('ts:3/8','3/8'),vx('ts:6/8','6/8'),vx('ts:9/8','9/8'),
    vx('ts:12/8','12/8'),vx('ts:5/8','5/8'),vx('ts:7/8','7/8'),m(U(0x1D136),'8va'),m(U(0x1D137),'8vb'),
    m(U(0x1D138),'15ma'),m(U(0x1D139),'15mb'),it('8va'),it('8vb'),it('loco'),
  ]},
  {id:'rep', name:'Ripetizioni e struttura', items:[
    m(U(0x1D100),'stanghetta'),m(U(0x1D101),'doppia'),m(U(0x1D102),'finale'),m(U(0x1D103),'finale inversa'),m(U(0x1D104),'tratteggiata'),
    m(U(0x1D105),'corta'),m(U(0x1D106),'ritornello |:'),m(U(0x1D107),'ritornello :|'),m(U(0x1D108),'punti'),m(U(0x1D10B),'segno'),
    m(U(0x1D10C),'coda'),m(U(0x1D109),'dal segno'),m(U(0x1D10A),'da capo'),m(U(0x1D10D),'simile 1'),m(U(0x1D10E),'simile 2'),
    m(U(0x1D10F),'simile 3'),m(U(0x1D114),'graffa'),m(U(0x1D115),'parentesi'),vx('volta1','1ª volta'),vx('volta2','2ª volta'),
    bd('D.C.'),bd('D.S.'),it('D.C. al Fine'),it('D.S. al Coda'),it('Fine'),it('To Coda'),it('V.S.','volti subito'),it('attacca'),
    it('segue'),it('tacet'),...range(0x1D116,0x1D11D,['1 rigo','2 righi','3 righi','4 righi','pentagramma','6 righi','tastiera 6','tastiera 4']),
  ]},
  {id:'tempo', name:'Tempo ed espressione', items:[
    'Largo','Larghetto','Lento','Adagio','Andante','Andantino','Moderato','Allegretto','Allegro','Vivace','Presto','Prestissimo',
    'rit.','rall.','accel.','a tempo','Tempo I','rubato','allarg.','string.','calando','morendo','smorz.','perdendosi','l\'istesso tempo','meno mosso','più mosso',
    'dolce','espress.','cantabile','legato','staccato','marcato','pesante','leggero','sostenuto','tranquillo','agitato','maestoso','con brio','con moto','con fuoco',
    'sotto voce','mezza voce','a piena voce','simile','ten.','sost.',
  ].map(w=>it(w))},
  {id:'choir', name:'Coro e voce', items:[
    bd('S'),bd('A'),bd('T'),bd('B'),bd('S1'),bd('S2'),bd('A1'),bd('A2'),bd('T1'),bd('T2'),bd('B1'),bd('B2'),bd('Bar.'),bd('Msop.'),
    it('Tutti'),it('Solo'),it('Soli'),it('div.'),it('unis.'),it('a cappella'),it('bocca chiusa'),it('a bocca aperta'),it('falsetto'),it('voce di petto'),
    vx('breathV','respira'),bd('//','non respirare'),it('respiro'),it('respiro libero'),m(U(0x1D112),'fiato'),
    {c:'↑',f:'b',n:'cala: alza!'},{c:'↓',f:'b',n:'cresce: abbassa!'},{c:'👓',f:'e',n:'guarda il direttore'},{c:'👁',f:'e',n:'attenzione'},
    {c:'✓',f:'b',n:'ok'},{c:'✗',f:'b',n:'no'},{c:'!',f:'b',n:'attenzione'},{c:'?',f:'b',n:'dubbio'},
    it('Ah'),it('Oh'),it('Uh'),it('ng'),it('[ə]','vocale neutra'),vx('vowelLink','legatura sillabe'),
  ]},
  {id:'instr', name:'Strumenti e pedale', items:[
    m(U(0x1D1AE),'Ped.'),m(U(0x1D1AF),'pedale su *'),m(U(0x1D1B0),'mezzo pedale'),vx('pedLine','linea pedale'),it('una corda'),it('tre corde'),
    it('m.d.'),it('m.s.'),it('pizz.'),it('arco'),it('con sord.'),it('senza sord.'),it('sul pont.'),it('sul tasto'),it('col legno'),it('tremolo'),
    m(U(0x1D1B3),'unghie'),m(U(0x1D1B4),'smorza'),m(U(0x1D1B5),'smorza tutto'),m(U(0x1D1A6),'Hauptstimme'),m(U(0x1D1A7),'Nebenstimme'),m(U(0x1D1A8),'fine Stimme'),
    m(U(0x1D1A9),'grado barrato'),
  ]},
  {id:'num', name:'Diteggiatura e numeri', items:[
    ...'0123456789'.split('').map(d=>bd(d)),...['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'].map(r=>bd(r)),
    bd('1.'),bd('2.'),bd('3.'),it('T','pollice'),bd('p'),bd('i'),bd('m'),bd('a'),
  ]},
  {id:'early', name:'Antica e gregoriana', items:[
    ...range(0x1D1B6,0x1D1C6,['maxima','longa','brevis','semibrevis','semibrevis nera','minima','minima nera','semiminima','semiminima nera','fusa','fusa nera','p. longa perf.','p. longa imperf.','p. brevis','p. semibrevis','p. minima','p. semiminima']),
    ...range(0x1D1C7,0x1D1CE,['tempus perf. 1','tempus perf. 2','tempus perf. 3','tempus imp. 1','tempus imp. 2','tempus imp. 3','tempus imp. 4','tempus imp. 5']),
    ...range(0x1D1CF,0x1D1DD,['croix','do gregoriano','fa gregoriano','b quadrato','virga','podatus','clivis','scandicus','climacus','torculus','porrectus','porrectus flexus','scandicus flexus','torculus resupinus','pes subpunctis']),
    ...range(0x1D1DE,0x1D1EA,['do Kiev','fine Kiev','finale Kiev','recitativo Kiev','intera Kiev','metà Kiev','quarto ↓','quarto ↑','ottavo ↓','ottavo ↑','bemolle Kiev','sori','koron']),
  ]},
  {id:'sym', name:'Simboli', items:[
    {c:'★',f:'b',n:'stella'},{c:'●',f:'b',n:'punto'},{c:'○',f:'b',n:'cerchio'},{c:'◆',f:'b',n:'rombo'},{c:'▲',f:'b',n:'triangolo'},
    {c:'→',f:'b',n:'freccia'},{c:'←',f:'b',n:'freccia'},{c:'⟲',f:'b',n:'torna'},{c:'♡',f:'b',n:'cuore'},{c:'☺',f:'b',n:'sorriso'},
    {c:'⚠',f:'b',n:'pericolo'},{c:'✎',f:'b',n:'nota'},{c:'§',f:'b',n:'sezione'},{c:'¶',f:'b',n:'paragrafo'},{c:'∞',f:'b',n:'a piacere'},
  ]},
];
// Tutti i simboli musicali Unicode, così nessun segno manca.
(function(){
  const all=[]; const skip=new Set([0x1D127,0x1D128]);
  for(let cp=0x1D100;cp<=0x1D1EA;cp++){
    if(skip.has(cp)) continue;
    if((cp>=0x1D165&&cp<=0x1D182&&!(cp>=0x1D16A&&cp<=0x1D16C))||(cp>=0x1D185&&cp<=0x1D18B)||(cp>=0x1D1AA&&cp<=0x1D1AD)) continue; // combinanti: vedi segni vettoriali
    all.push(m(U(cp),'U+'+cp.toString(16).toUpperCase()));
  }
  STAMP_CATS.push({id:'all', name:'Tutti i simboli (Unicode)', items:all});
})();

// Disegno vettoriale dei segni (origine al centro, s = dimensione in px).
const VDRAW = {
  stacc:(c,s)=>{dot(c,0,0,s*.12)},
  staccis:(c,s)=>{c.beginPath();c.moveTo(-s*.12,-s*.3);c.lineTo(s*.12,-s*.3);c.lineTo(0,s*.3);c.closePath();c.fill()},
  tenuto:(c,s)=>{c.fillRect(-s*.38,-s*.05,s*.76,s*.1)},
  portato:(c,s)=>{c.fillRect(-s*.38,-s*.25,s*.76,s*.1);dot(c,0,s*.15,s*.11)},
  accent:(c,s)=>{ln(c,s*.09,[[-s*.4,-s*.22],[s*.4,0],[-s*.4,s*.22]])},
  accStacc:(c,s)=>{ln(c,s*.09,[[-s*.4,-s*.36],[s*.4,-s*.16],[-s*.4,s*.04]]);dot(c,0,s*.3,s*.11)},
  marcato:(c,s)=>{c.beginPath();c.moveTo(-s*.26,s*.32);c.lineTo(0,-s*.34);c.lineTo(s*.26,s*.32);c.lineTo(s*.12,s*.32);c.lineTo(0,-s*.04);c.lineTo(-s*.12,s*.32);c.closePath();c.fill()},
  marcStacc:(c,s)=>{c.save();c.translate(0,-s*.12);VDRAW.marcato(c,s*.8);c.restore();dot(c,0,s*.36,s*.1)},
  marcDown:(c,s)=>{c.save();c.rotate(Math.PI);VDRAW.marcato(c,s);c.restore()},
  tenAcc:(c,s)=>{c.fillRect(-s*.36,s*.22,s*.72,s*.09);ln(c,s*.08,[[-s*.36,-s*.36],[s*.36,-s*.18],[-s*.36,0]])},
  fermSq:(c,s)=>{ln(c,s*.08,[[-s*.45,s*.2],[-s*.45,-s*.25],[s*.45,-s*.25],[s*.45,s*.2]]);dot(c,0,s*.1,s*.1)},
  fermTri:(c,s)=>{ln(c,s*.08,[[-s*.45,s*.2],[0,-s*.3],[s*.45,s*.2]]);dot(c,0,s*.12,s*.1)},
  breathV:(c,s)=>{ln(c,s*.1,[[-s*.22,-s*.3],[0,s*.3],[s*.22,-s*.3]])},
  upBow:(c,s)=>{ln(c,s*.08,[[-s*.25,-s*.35],[0,s*.35],[s*.25,-s*.35]])},
  downBow:(c,s)=>{c.fillRect(-s*.32,-s*.3,s*.64,s*.13);c.fillRect(-s*.32,-s*.3,s*.08,s*.62);c.fillRect(s*.24,-s*.3,s*.08,s*.62)},
  harmonic:(c,s)=>{ring(c,0,0,s*.18,s*.07)},
  snapPizz:(c,s)=>{ring(c,0,s*.08,s*.2,s*.07);ln(c,s*.07,[[0,-s*.38],[0,s*.08]])},
  open:(c,s)=>{ring(c,0,0,s*.2,s*.08)},
  thumb:(c,s)=>{ring(c,0,-s*.08,s*.18,s*.07);ln(c,s*.07,[[0,s*.1],[0,s*.38]])},
  doit:(c,s)=>{curve(c,s*.07,[-s*.35,s*.2],[s*.1,s*.2],[s*.35,-s*.3])},
  fall:(c,s)=>{curve(c,s*.07,[-s*.35,-s*.2],[s*.1,-s*.2],[s*.35,s*.3])},
  scoop:(c,s)=>{curve(c,s*.07,[-s*.35,s*.3],[-s*.2,-s*.1],[s*.35,-s*.15])},
  vibrato:(c,s)=>{wave(c,s,3,s*.09)},
  trillLine:(c,s)=>{c.font=`700 italic ${s*.55}px ${css('--f-display')}`;c.textAlign='left';c.textBaseline='middle';c.fillText('tr',-s*.5,0);c.save();c.translate(s*.2,0);wave(c,s*.6,3,s*.07);c.restore()},
  mordent:(c,s)=>{zig(c,s);ln(c,s*.06,[[0,-s*.38],[0,s*.38]])},
  prall:(c,s)=>{zig(c,s)},
  trem1:(c,s)=>{slash(c,s,1)}, trem2:(c,s)=>{slash(c,s,2)}, trem3:(c,s)=>{slash(c,s,3)},
  multiRest:(c,s)=>{c.fillRect(-s*.45,-s*.12,s*.9,s*.24);c.fillRect(-s*.47,-s*.3,s*.06,s*.6);c.fillRect(s*.41,-s*.3,s*.06,s*.6)},
  hairCresc:(c,s)=>{ln(c,s*.06,[[s*.48,-s*.2],[-s*.48,0],[s*.48,s*.2]])},
  hairDim:(c,s)=>{ln(c,s*.06,[[-s*.48,-s*.2],[s*.48,0],[-s*.48,s*.2]])},
  volta1:(c,s)=>{volta(c,s,'1.')}, volta2:(c,s)=>{volta(c,s,'2.')},
  pedLine:(c,s)=>{ln(c,s*.06,[[-s*.48,-s*.25],[-s*.48,s*.2],[-s*.05,s*.2],[s*.1,-s*.05],[s*.25,s*.2],[s*.48,s*.2],[s*.48,-s*.25]])},
  vowelLink:(c,s)=>{curve(c,s*.06,[-s*.45,-s*.05],[0,s*.35],[s*.45,-s*.05])},
};
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v)}
function dot(c,x,y,r){c.beginPath();c.arc(x,y,r,0,7);c.fill()}
function ring(c,x,y,r,w){c.lineWidth=w;c.beginPath();c.arc(x,y,r,0,7);c.stroke()}
function ln(c,w,pts){c.lineWidth=w;c.lineJoin='miter';c.lineCap='butt';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
function curve(c,w,a,b,d){c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(a[0],a[1]);c.quadraticCurveTo(b[0],b[1],d[0],d[1]);c.stroke()}
function wave(c,s,n,w){c.lineWidth=w;c.lineCap='round';c.beginPath();const L=s*.9,x0=-L/2,step=L/(n*2);c.moveTo(x0,0);for(let i=0;i<n*2;i++){const x=x0+step*i;c.quadraticCurveTo(x+step/2,(i%2?1:-1)*s*.14,x+step,0)}c.stroke()}
function zig(c,s){c.lineWidth=s*.08;c.lineJoin='round';c.beginPath();c.moveTo(-s*.45,s*.08);c.lineTo(-s*.28,-s*.14);c.lineTo(-s*.1,s*.1);c.lineTo(s*.1,-s*.14);c.lineTo(s*.28,s*.1);c.lineTo(s*.45,-s*.12);c.stroke()}
function slash(c,s,n){for(let i=0;i<n;i++){const y=(i-(n-1)/2)*s*.22;c.beginPath();c.moveTo(-s*.3,y+s*.1);c.lineTo(s*.3,y-s*.06);c.lineTo(s*.3,y-s*.16);c.lineTo(-s*.3,y);c.closePath();c.fill()}}
function volta(c,s,t){ln(c,s*.05,[[-s*.45,s*.3],[-s*.45,-s*.25],[s*.48,-s*.25]]);c.font=`700 ${s*.36}px ${css('--f-body')}`;c.textAlign='left';c.textBaseline='middle';c.fillText(t,-s*.36,s*.05)}
function timeSig(c,s,a,b){c.font=`900 ${s*.5}px ${css('--f-display')}`;c.textAlign='center';c.textBaseline='middle';c.fillText(a,0,-s*.21);c.fillText(b,0,s*.23)}

// Disegna un segno centrato in (x,y) con dimensione s.
function drawGlyph(c,g,x,y,s,color){
  c.save();c.translate(x,y);c.fillStyle=color;c.strokeStyle=color;
  if(g.v){
    if(g.v.startsWith('ts:')){const [a,b]=g.v.slice(3).split('/');timeSig(c,s,a,b);}
    else if(VDRAW[g.v]) VDRAW[g.v](c,s);
  } else {
    const fam = g.f==='m'?css('--f-music'):g.f==='i'?css('--f-display'):g.f==='e'?'"Apple Color Emoji","Noto Color Emoji",sans-serif':css('--f-body');
    const style = g.f==='i'?'italic 600':g.f==='b'?'800':'400';
    const sz = g.f==='m'? s : g.f==='i'? s*.42 : s*.5;
    c.font=`${style} ${sz}px ${fam}`;c.textAlign='left';c.textBaseline='alphabetic';
    const mt=c.measureText(g.c);
    const w=(mt.actualBoundingBoxLeft||0)+(mt.actualBoundingBoxRight||mt.width);
    const h=(mt.actualBoundingBoxAscent||sz*.7)+(mt.actualBoundingBoxDescent||0);
    c.fillText(g.c,-(mt.actualBoundingBoxRight||mt.width)+w/2,(mt.actualBoundingBoxAscent||sz*.7)-h/2);
  }
  c.restore();
}
// Misura l'ingombro (per adattare l'anteprima nei riquadri).
function glyphBox(c,g,s){
  if(g.v) return {w:s,h:s};
  const fam = g.f==='m'?css('--f-music'):g.f==='i'?css('--f-display'):css('--f-body');
  const sz = g.f==='m'? s : g.f==='i'? s*.42 : s*.5;
  c.font=`${g.f==='i'?'italic 600':g.f==='b'?'800':'400'} ${sz}px ${fam}`;
  const mt=c.measureText(g.c);
  return {w:(mt.actualBoundingBoxLeft||0)+(mt.actualBoundingBoxRight||mt.width), h:(mt.actualBoundingBoxAscent||sz*.7)+(mt.actualBoundingBoxDescent||0)};
}
