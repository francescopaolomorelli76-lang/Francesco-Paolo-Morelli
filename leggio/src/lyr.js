// ============ Testo cantato: pronuncia + traduzione dei versi stampati sotto OGNI voce ============
// Legge le sillabe sotto ogni rigo (anche coro SATB), ricostruisce le parole:
//   "di - vi - ne" = una parola · spazio senza trattino = un'altra parola · "com-" a fine rigo/pagina continua sul rigo/pagina dopo.
// La pronuncia francese è calcolata sulla PAROLA INTERA e poi divisa sulle sillabe stampate (amour = a·mu·ur).

// ---------- pronuncia francese allineata alle sillabe ----------
const FR_V='aeiouyàâäéèêëîïôöûùüœæ', MUTE='\u0001';
const FR_SPECIAL={et:'è',est:'è',es:'è',les:'lè',des:'dè',mes:'mè',tes:'tè',ses:'sè',ces:'sè',le:'lö',de:'dö',ne:'nö',me:'mö',te:'tö',se:'sö',ce:'sö',je:'žö',que:'kö',
  qui:'ki',un:'ẽ',nous:'nu',vous:'vu',tout:'tu',fils:'fis',dieu:'diö',christ:'krist',sois:'suà',jour:'žur',ciel:'siel',cieux:'siö',yeux:'iö',oui:'uì',
  la:'la',ma:'ma',ta:'ta',sa:'sa',pas:'pa',par:'par',pour:'pur',sur:'sür',sous:'su',dans:'dã',avec:'avèk',mais:'mè',où:'u',ou:'u',à:'a',au:'o',aux:'o',du:'dü',
  son:'sõ',mon:'mõ',ton:'tõ',en:'ã',on:'õ',ai:'è',as:'a',a:'a',il:'il',elle:'èl',ils:'il',tu:'tü',toi:'tua',moi:'mua',lui:'lüi',eux:'ö',coeur:'kör',cœur:'kör',sœur:'sör',
  oeil:'öj',œil:'öj',oeuvre:'övr',œuvre:'övr',amen:'amèn',alleluia:'alelüia'};
// Restituisce un array con una pronuncia per sillaba. syl = sillabe stampate (senza trattini); open = la parola continua oltre (a fine pagina)
function frPronSyl(syl,open){
  const full=syl.join(''); const w=full.toLowerCase(); const n=w.length; const lowerSyl=syl.map(s=>s.toLowerCase());
  const bounds=[]; let acc=0; for(const s of syl){ bounds.push([acc,acc+s.length]); acc+=s.length; }
  const sylOf=i=>{ for(let k=0;k<bounds.length;k++) if(i>=bounds[k][0]&&i<bounds[k][1]) return k; return bounds.length-1; };
  const starts=new Set(bounds.map(b=>b[0])); const multi=syl.length>1;
  const out=syl.map(()=>'');
  if(!open&&FR_SPECIAL[w]!=null&&!multi){ out[0]=FR_SPECIAL[w]; return out; }
  const V=c=>!!c&&FR_V.includes(c), put=(i,o,all)=>{ if(all){ const a=sylOf(i), b=sylOf(Math.min(n-1,i+all-1)); for(let k=a;k<=b;k++) out[k]+=o; } else out[sylOf(i)]+=o; };
  const nxt=k=>w[k]||'', fin=k=>k>=n&&!open;
  const nasalOk=k=>{ const c=nxt(k); return !c?!open:!(V(c)||c==='n'||c==='m'||c==="'"); };
  let i=0;
  while(i<n){
    const c=w[i], r=w.slice(i), p=w[i-1]||''; let m;
    // vocali doppie (la nota seguente ripete la stessa vocale: "mo-ur" = mu · ur)
    if((m=/^(eau|oeu|œu)/.exec(r))){ put(i,m[1]==='eau'?'o':'ö',m[1].length); i+=m[1].length; continue; }
    if((m=/^(oin)/.exec(r))&&nasalOk(i+3)){ put(i,'uẽ'); i+=3; continue; }
    if((m=/^(ain|aim|ein|eim)/.exec(r))&&nasalOk(i+3)){ put(i,'ẽ'); i+=3; continue; }
    if((m=/^(ou|où)/.exec(r))){ put(i,'u',2); i+=2; continue; }
    if((m=/^(au)/.exec(r))){ put(i,'o',2); i+=2; continue; }
    if((m=/^(eu)/.exec(r))){ put(i,'ö',2); i+=2; continue; }
    if((m=/^(oi|oî)/.exec(r))){ put(i,'uà',2); i+=2; continue; }
    if((m=/^(ai|ei|aî)/.exec(r))){ put(i,'è',2); i+=2; continue; }
    if((m=/^(ui)/.exec(r))){ put(i,'üi',2); i+=2; continue; }
    // vocale + n/m = nasale
    if((m=/^(an|am|en|em)/.exec(r))&&nasalOk(i+2)){ put(i,p==='i'&&m[1]==='en'?'ẽ':'ã'); i+=2; continue; }
    if((m=/^(on|om)/.exec(r))&&nasalOk(i+2)){ put(i,'õ'); i+=2; continue; }
    if((m=/^(in|im|yn|ym|un|um)/.exec(r))&&nasalOk(i+2)){ put(i,m[1][0]==='u'?'ẽ':'ẽ'); i+=2; continue; }
    // e muta finale (-e, -es, -ent verbale): ö solo se canta da sola, altrimenti tace
    if(c==='e'&&fin(i+1)&&i>0){ put(i,MUTE); i++; continue; }
    if(r==='es'&&!open&&i>0&&!V(p)){ put(i,MUTE); i+=2; continue; }
    if(r==='ent'&&!open&&i>0&&starts.has(i)){ put(i,MUTE); i+=3; continue; }
    if(r==='er'&&!open&&n>3&&i>0&&!/(^|')(enfer|hiver|amer|cher|éther|hier|fier|super|mer|fer|ver)$/.test(w)){ put(i,'e'); i+=2; continue; }
    if(r==='ez'&&!open&&i>0){ put(i,'e'); i+=2; continue; }
    if(c==='e'){ const a=nxt(i+1), b=nxt(i+2); const openSyl=multi?starts.has(i+1):(!a||(!V(a)&&V(b))); put(i,openSyl?'ö':'è'); i++; continue; }
    if(c==='é'){ put(i,'e'); i++; continue; } if(c==='è'||c==='ê'||c==='ë'){ put(i,'è'); i++; continue; }
    if(c==='à'||c==='â'||c==='ä'||c==='æ'){ put(i,'a'); i++; continue; }
    if(c==='î'||c==='ï'||c==='y'){ put(i,'i'); i++; continue; }
    if(c==='ô'){ put(i,'o'); i++; continue; } if(c==='œ'){ put(i,'ö'); i++; continue; }
    if(c==='û'||c==='ü'||c==='u'){ put(i,'ü'); i++; continue; } if(c==='ù'){ put(i,'u'); i++; continue; }
    if(c==='a'||c==='i'||c==='o'){ put(i,c); i++; continue; }
    // consonanti
    if(r.startsWith('tion')){ put(i,'siõ'); i+=4; continue; }
    if(/^ch(?=r)/.test(r)){ put(i+1,'k'); i+=2; continue; }
    if(r.startsWith('ch')){ put(i+1,'sc'); i+=2; continue; }
    if(r.startsWith('ph')){ put(i+1,'f'); i+=2; continue; } if(r.startsWith('th')){ put(i+1,'t'); i+=2; continue; }
    if(r.startsWith('gn')){ put(i+1,'gn'); i+=2; continue; }
    if(/^qu/.test(r)){ put(i+1,'k'); i+=2; continue; } if(c==='q'){ put(i,'k'); i++; continue; }
    if(/^gu[eiyéèê]/.test(r)){ put(i+1,'g'); i+=2; continue; }
    if(/^g[eiyéèêî]/.test(r)){ put(i,'ž'); i++; continue; }
    if(c==='g'){ if(fin(i+1)&&/[nl]/.test(p)){ i++; continue; } put(i,'g'); i++; continue; }
    if(c==='j'){ put(i,'ž'); i++; continue; }
    if(/^sc[eiy]/.test(r)){ put(i+1,'s'); i+=2; continue; }
    if(/^c[eiyéèêî]/.test(r)||c==='ç'){ put(i,'s'); i++; continue; }
    if(r.startsWith('cc')){ put(i+1,'k'); i+=2; continue; }
    if(c==='c'){ if(fin(i+1)&&p==='n'){ i++; continue; } put(i,'k'); i++; continue; }
    if(c==='k'){ put(i,'k'); i++; continue; }
    if(r.startsWith('ss')){ put(i+1,'s'); i+=2; continue; }
    if(c==='s'){ if(fin(i+1)||nxt(i+1)==='h'){ i++; continue; } put(i,V(p)&&V(nxt(i+1))?'z':'s'); i++; continue; }
    if(c==='x'){ if(fin(i+1)){ i++; continue; } put(i,'ks'); i++; continue; }
    if(c==='h'){ i++; continue; }
    if(c==='w'){ put(i,'v'); i++; continue; }
    if(c==="'"||c==='’'||c==='-'){ i++; continue; }
    if(/^ill/.test(r)&&i>0&&V(p)){ put(i,'j'); i+=3; continue; }
    if(r==='il'&&!open&&i>0&&V(p)){ put(i,'j'); i+=2; continue; }
    if(/^ill/.test(r)&&i>0){ put(i,'il'); i+=3; continue; }
    if(/^([a-z])\1/.test(r)&&!V(c)){ put(i+1,c==='v'?'v':c); i+=2; continue; }    // doppie: una sola, sulla seconda sillaba
    if(fin(i+1)&&/[tdpzs]/.test(c)&&i>0){ i++; continue; }                      // finali mute
    if(c==='r'||c==='l'||c==='f'||c==='b'||c==='d'||c==='m'||c==='n'||c==='p'||c==='t'||c==='v'||c==='z'){ put(i,c==='z'?'z':c); i++; continue; }
    put(i,c); i++;
  }
  return out.map((o,k)=>{ let s=o; if(s.includes(MUTE)){ const bare=s.split(MUTE).join(''); s=/[aeiouàèéìòùäöüãõẽ]/.test(bare)?bare:bare+'ö'; }
    const f=syl[k]&&syl[k][0]; if(f&&f!==f.toLowerCase()&&s) s=s[0].toUpperCase()+s.slice(1); return s; });
}

// pronuncia sillaba per sillaba per le altre lingue (come "Traslittera" normale)
function pronSyl(syl,lang,open){
  // la punteggiatura attaccata alla sillaba ("Haut,") non conta nella pronuncia ma si rimette dopo
  const P=/[,.;:!?»«()"”“]+/g, tail=syl.map(s=>(String(s).match(/[,.;:!?»«()"”]+$/)||[''])[0]);
  if(tail.some(Boolean)){ const r=pronSyl(syl.map(s=>String(s).replace(P,'')),lang,open); return r.map((x,i)=>x+tail[i]); }
  if(lang==='fr') return frPronSyl(syl,open);
  if(!PRON[lang]) return syl.slice();
  return syl.map(s=>PRON.conv(s,lang));
}

// ---------- traduzione offline (se manca internet) ----------
const FR_LINES=[
  ['verbe égal au très-haut notre unique espérance','Verbo uguale all\'Altissimo, nostra unica speranza,'],
  ['jour éternel de la terre et des cieux','giorno eterno della terra e dei cieli;'],
  ['de la paisible nuit nous rompons le silence','dalla placida notte rompiamo il silenzio,'],
  ['divin sauveur jette sur nous les yeux','divino Salvatore, volgi su di noi lo sguardo!'],
  ['répands sur nous le feu de ta grâce puissante','Spandi su di noi il fuoco della tua grazia potente,'],
  ['que tout l\'enfer fuie au son de ta voix','che tutto l\'inferno fugga al suono della tua voce;'],
  ['dissipe le sommeil d\'une âme languissante','dissipa il sonno di un\'anima languente,'],
  ['qui la conduit à l\'oubli de tes lois','che la conduce a dimenticare le tue leggi!'],
  ['ô christ sois favorable à ce peuple fidèle','O Cristo, sii favorevole a questo popolo fedele,'],
  ['pour te bénir maintenant rassemblé','ora riunito per benedirti;'],
  ['reçois les chants qu\'il offre à ta gloire immortelle','ricevi i canti che offre alla tua gloria immortale,'],
  ['et de tes dons qu\'il retourne comblé','e che torni colmo dei tuoi doni!'],
];
const FR_IT={verbe:'Verbo',égal:'uguale',au:'al',aux:'ai',très:'molto',haut:'alto',notre:'nostra',nos:'nostri',votre:'vostra',unique:'unica',espérance:'speranza',jour:'giorno',éternel:'eterno',
  de:'di',la:'la',le:'il',les:'i',un:'un',une:'una',des:'dei',du:'del',et:'e',terre:'terra',ciel:'cielo',cieux:'cieli',paisible:'placida',nuit:'notte',nous:'noi',vous:'voi',rompons:'rompiamo',
  silence:'silenzio',divin:'divino',sauveur:'Salvatore',jette:'getta',sur:'su',yeux:'occhi',répands:'spandi',feu:'fuoco',ta:'tua',tes:'tue',ton:'tuo',grâce:'grazia',puissante:'potente',que:'che',
  qui:'che',tout:'tutto',tous:'tutti',enfer:'inferno',fuie:'fugga',son:'suono',voix:'voce',dissipe:'dissipa',sommeil:'sonno',âme:'anima',languissante:'languente',conduit:'conduce',oubli:'oblio',
  lois:'leggi',christ:'Cristo',sois:'sii',favorable:'favorevole',ce:'questo',peuple:'popolo',fidèle:'fedele',pour:'per',bénir:'benedire',maintenant:'ora',rassemblé:'riunito',reçois:'ricevi',
  chants:'canti',offre:'offre',gloire:'gloria',immortelle:'immortale',dons:'doni',retourne:'torni',comblé:'colmo',amour:'amore',cœur:'cuore',coeur:'cuore',dieu:'Dio',seigneur:'Signore',
  paix:'pace',joie:'gioia',vie:'vita',mort:'morte',lumière:'luce',chant:'canto',je:'io',tu:'tu',il:'egli',elle:'ella',est:'è',sont:'sono',ne:'non',pas:'non',avec:'con',dans:'in',
  en:'in',à:'a',a:'ha',o:'o',ô:'o',mon:'mio',ma:'mia',mes:'miei',ses:'suoi',sa:'sua',leur:'loro',ai:'ho',vers:'verso',sans:'senza',sous:'sotto',pays:'paese',ami:'amico',mère:'madre',père:'padre'};
function frNorm(t){ return String(t).toLowerCase().replace(/[’]/g,"'").replace(/œ/g,'œ').replace(/[.,;:!?«»"()]/g,' ').replace(/\s+/g,' ').trim(); }
function offlineTranslate(text,lang){
  if(lang!=='fr') throw new Error('Traduzione non riuscita: serve la connessione a internet');
  const q=frNorm(text), qw=q.split(' ').filter(Boolean); if(!qw.length) return '';
  for(const [fr,it] of FR_LINES){ if(fr.includes(q)&&q.length>8){ const fw=fr.split(' '), itw=it.split(' '); if(qw.length>=fw.length*.8) return it; } }
  return qw.map(w=>FR_IT[w]||FR_IT[w.replace(/^[lcdjmnst]'/,'')]||w).join(' ');
}

// ---------- lo strumento ----------
const Lyr = {
  rows:[], lang:'fr', opt:{pron:true,trad:true,all:false},
  // lingua: dal testo, dal compositore o dal titolo; ricordata per ogni spartito
  guess(text){
    const m=ST.cur&&ST.cur.style&&ST.cur.style.lyrLang; if(m) return m;
    const meta=((ST.cur&&(ST.cur.composer+' '+ST.cur.title))||'').toLowerCase();
    let sc={fr:0,la:0,de:0,es:0,en:0,it:0};
    if(/faur[eé]|poulenc|debussy|ravel|bizet|gounod|massenet|berlioz|saint-sa[eë]ns|offenbach|franck|durufl[eé]|messiaen|charpentier|lully|rameau|couperin|cantique|racine|chanson|ave verum|messe/.test(meta)) sc.fr+=3;
    if(/bach|schütz|brahms|schubert|schumann|mendelssohn|wolf|lied|messiah/.test(meta)) sc.de+=2;
    const t=' '+frNorm(text)+' ';
    if(/[éèêëçœûôâîù]/.test(t)) sc.fr+=1.5; if(/ (qu'|l'|d'|j'|n'|s'|c')/.test(t)) sc.fr+=2;
    for(const w of ['le','la','les','des','de','du','et','nous','vous','notre','votre','tes','ses','sur','que','qui','dans','pour','avec','jour','terre','cieux','voix','ton','ta','sois','verbe','amour','dieu','seigneur','sauveur','divin']) if(t.includes(' '+w+' ')) sc.fr+=1;
    let d=null; try{ d=detectLang(text); }catch(e){}
    if(d&&sc[d]!=null) sc[d]+=2;
    const best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0]; return best[1]>=2?(best[0]==='it'?'la':best[0]):'fr';
  },
  // dopo la lettura OCR: cerca i trattini disegnati tra due sillabe (l'OCR spesso non li legge)
  dashBetween(meta,xa,xb){
    try{
      const {cut,band}=meta; const CW=cut.width, CH=cut.height; const sh=(xb-xa)*CW*.08;
      const x0=Math.max(0,Math.floor(xa*CW+sh)), x1=Math.min(CW,Math.ceil(xb*CW-sh)); const w=x1-x0; if(w<4) return false;
      const ya=Math.floor(band[0]*CH), yb=Math.ceil(band[1]*CH); const h=yb-ya; if(h<4) return false;
      const d=cut.getContext('2d',{willReadFrequently:true}).getImageData(x0,ya,w,h).data;
      let ink=0, minY=h, maxY=-1; const cols=new Uint8Array(w);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4]<150){ ink++; cols[x]=1; if(y<minY) minY=y; if(y>maxY) maxY=y; } }
      if(!ink) return false; const cov=cols.reduce((a,b)=>a+b,0)/w;
      return cov>=.5&&(maxY-minY+1)<=Math.max(3,h*.4)&&ink>=w*.8;
    }catch(e){ return false; }
  },
  // unisce in sillabe-token: "di-vi-ne" dentro un unico token si separa; trattini mancanti si cercano sull'immagine
  normTokens(tokens,meta){
    const L=[]; for(const t of tokens){ const raw=String(t.text).replace(/[_]+/g,'').trim(); if(!raw) continue;
      const lead=/^[-–—]/.test(raw), trail=/[-–—]$/.test(raw); const parts=raw.replace(/^[-–—]+|[-–—]+$/g,'').split(/[-–—]+/).filter(Boolean); if(!parts.length) continue;
      const a=t.a!=null?t.a:t.x-.01, b=t.b!=null?t.b:t.x+.01, st=(b-a)/parts.length;
      parts.forEach((p,i)=>L.push({text:p,x:a+st*(i+.5),a:a+st*i,b:a+st*(i+1),lead:i===0&&lead,trail:i<parts.length-1||trail})); }
    L.sort((p,q)=>p.x-q.x);
    if(meta) for(let i=0;i<L.length-1;i++){ if(L[i].trail||L[i+1].lead) continue; if(this.dashBetween(meta,L[i].b,L[i+1].a)) L[i].trail=true; }
    return L;
  },
  // un rigo → stringa modificabile: "di-vi-ne com-bat-tant"
  toStr(r){ let s=''; r.syl.forEach((t,i)=>{ if(i===0&&t.lead) s+='-'; s+=t.text; if(i<r.syl.length-1) s+=t.trail?'-':' '; else if(t.trail) s+='-'; }); return s; },
  fromStr(r,str){
    const syl=[]; const lead=/^\s*-/.test(str); const words=str.trim().replace(/^[-–]+/,'').split(/\s+/).filter(Boolean);
    words.forEach((w,wi)=>{ const trail=/[-–]$/.test(w); const ps=w.replace(/[-–]+$/,'').split(/[-–]+/).filter(Boolean); ps.forEach((p,pi)=>syl.push({text:p,trail:pi<ps.length-1||(trail&&wi===words.length-1)})); });
    if(syl.length) syl[0].lead=lead;
    const old=r.orig; const n=syl.length, m=old.length;
    syl.forEach((t,i)=>{ if(n===m){ t.x=old[i].x; } else if(m){ const f=n>1?i/(n-1):.5; t.x=old[0].x+(old[m-1].x-old[0].x)*f; } else t.x=.1+.8*(i/Math.max(1,n-1)); });
    r.syl=syl;
  },
  // parole di tutta la pagina per voce, con il resto della parola della pagina precedente
  words(vi){
    const rows=this.rows.filter(r=>r.voice===vi&&!r.off).sort((a,b)=>a.sys-b.sys); const words=[]; let cur=null;
    const carry=this.carry&&this.carry[vi]; if(carry){ cur={syl:[{virtual:1,text:carry}],open:true}; words.push(cur); }
    for(const r of rows){ r.syl.forEach((t,i)=>{
      const join=cur&&(cur.open||(i===0&&t.lead));
      if(join){ cur.syl.push({row:r,i,text:t.text}); } else { cur={syl:[{row:r,i,text:t.text}]}; words.push(cur); }
      cur.open=!!t.trail; }); }
    return words;
  },
  pronAll(){
    this.rows.forEach(r=>r.syl.forEach(t=>t.pron=''));
    const voices=[...new Set(this.rows.map(r=>r.voice))];
    for(const vi of voices) for(const w of this.words(vi)){
      const texts=w.syl.map(s=>s.text); const pr=pronSyl(texts,this.lang,w.open);
      w.syl.forEach((s,k)=>{ if(s.row) s.row.syl[s.i].pron=pr[k]; }); }
  },
  async open(){
    if(!ST.cur) return toast('Apri prima uno spartito');
    closeLayers(); busy('Cerco i versi sotto ogni rigo…');
    try{
      const staves=(detectStaves()||[]).filter(s=>s.printed!==false); const rows=[];
      // sistemi: un salto di spazio più grande tra due righi = nuovo sistema
      const gaps=staves.slice(1).map((s,i)=>s.top-staves[i].bottom); const mx=Math.max(0,...gaps), mn=Math.min(...gaps.concat([1]));
      const thr=gaps.length&&mx>mn*1.35?(mx+mn)/2:Infinity; let sys=0, inSys=0;
      for(let i=0;i<staves.length;i++){
        if(i>0&&staves[i].top-staves[i-1].bottom>thr){ sys++; inSys=0; }
        const st=staves[i]; const nextTop=i<staves.length-1?staves[i+1].top:1;
        let tok=[]; try{ tok=await readLyrics({...st,y0:st.bottom+st.gap*.3,y1:Math.min(nextTop-st.gap*.2,st.bottom+st.gap*7),gap:st.gap}); }catch(e){ tok=[]; }
        const meta=tok.meta; const syl=this.normTokens(tok,meta);
        if(syl.length>=1){ const m=meta, H=m&&m.H||1;
          const ly=m?(m.y0+((m.band[0]+m.band[1])/2)*m.cut.height/m.k)/H:st.bottom+st.gap*1.1; const lh=m?((m.band[1]-m.band[0])*m.cut.height/m.k/H):st.gap*1.2;
          rows.push({stave:i,sys,voice:inSys,syl,orig:syl.map(t=>({x:t.x})),ly,lh}); }
        inSys++;
      }
      busy();
      // se un "sistema" ha righi senza testo (pianoforte), le voci contano solo i righi con testo
      const bySys={}; rows.forEach(r=>{ (bySys[r.sys]=bySys[r.sys]||[]).push(r); }); Object.values(bySys).forEach(a=>a.forEach((r,k)=>r.voice=k));
      this.rows=rows; this.carry=(ST.cur.lyrCarry&&ST.cur.lyrCarry[ST.page-1])||null;
      const all=rows.map(r=>r.syl.map(t=>t.text).join(' ')).join(' ');
      this.lang=this.guess(all); this.ui();
      if(!rows.length) toast('Non vedo testo stampato sotto i righi: scrivi le parole qui sotto, oppure usa la fascia blu "Testo sulle note"',5200);
    }catch(err){ busy(); toast((err&&err.message)||'Lettura non riuscita',3600); }
  },
  ui(){
    this.pronAll();
    const rows=this.rows;
    const rowHtml=rows.map((r,k)=>`<div class="lyRow" data-k="${k}"><div class="lyHd"><b>Voce ${r.voice+1}</b><small>sistema ${r.sys+1}</small><label class="lyOff"><input type="checkbox" data-off ${r.off?'':'checked'}> usa</label></div>
      <input class="lyIn" data-in value="${esc(this.toStr(r))}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="lyPr" data-pr>${esc(r.syl.map(t=>t.pron||'·').join(' '))}</div></div>`).join('');
    const body=`<div class="hint" style="margin-bottom:8px">Le parole sono ricostruite così: <b>di - vi - ne</b> (sillabe sulle note) = una parola; uno spazio senza trattino = parola nuova; <b>-</b> a fine rigo continua sul rigo dopo e sulla pagina dopo. Correggi qui sotto se la lettura sbaglia.</div>
      <div class="seg" id="lyL">${Object.entries(PRON.names).map(([k,l])=>`<button data-l="${k}" class="${k===this.lang?'on':''}">${l.split(' ')[0]}</button>`).join('')}</div>
      <div class="lyOpts"><label><input type="checkbox" id="lyP" ${this.opt.pron?'checked':''}> Pronuncia (blu)</label><label><input type="checkbox" id="lyT" ${this.opt.trad?'checked':''}> Traduzione (rosso)</label><label><input type="checkbox" id="lyA" ${this.opt.all?'checked':''}> traduci ogni voce</label></div>
      ${this.carry?`<div class="hint">Dalla pagina prima continua: <b>${esc(Object.values(this.carry).join(' · '))}</b></div>`:''}
      <div id="lyRows">${rowHtml||'<div class="hint">Nessun testo trovato.</div>'}</div>
      <div class="hint" id="lyTr" style="margin-top:8px"></div>`;
    const m=modal('Pronuncia e traduzione',body,`<button class="ghostBtn" data-close>Chiudi</button><button class="goldBtn" id="lyGo">${iconSvg('check')}Scrivi sullo spartito</button>`,{id:'lyrM',full:true,eyebrow:'Testo cantato'});
    const refresh=()=>{ this.pronAll(); m.querySelectorAll('.lyRow').forEach((el,k)=>{ const r=rows[k]; el.querySelector('[data-pr]').textContent=r.syl.map(t=>t.pron||'·').join(' '); }); };
    m.querySelector('#lyL').onclick=e=>{ const x=e.target.closest('[data-l]'); if(!x) return; this.lang=x.dataset.l; if(ST.cur){ ST.cur.style=ST.cur.style||{}; ST.cur.style.lyrLang=this.lang; DB.putScore(ST.cur); } m.querySelectorAll('#lyL button').forEach(y=>y.classList.toggle('on',y===x)); refresh(); };
    m.querySelectorAll('.lyRow').forEach((el,k)=>{ const r=rows[k];
      el.querySelector('[data-in]').oninput=e=>{ this.fromStr(r,e.target.value); refresh(); };
      el.querySelector('[data-off]').onchange=e=>{ r.off=!e.target.checked; el.style.opacity=r.off?.4:1; refresh(); }; });
    m.querySelector('#lyP').onchange=e=>this.opt.pron=e.target.checked; m.querySelector('#lyT').onchange=e=>this.opt.trad=e.target.checked; m.querySelector('#lyA').onchange=e=>this.opt.all=e.target.checked;
    m.querySelector('#lyGo').onclick=()=>this.write(m);
  },
  async write(m){
    const rows=this.rows.filter(r=>!r.off&&r.syl.length); if(!rows.length){ toast('Niente da scrivere'); return; }
    const A=Anno, sz=TStyle.size('pron'), tsz=TStyle.size('tr'); const mem=TStyle.get('tr');
    A.push();
    // via le pronunce già scritte sotto gli stessi versi (si rifà da capo senza doppioni)
    A.strokes=A.strokes.filter(t=>!(t.t==='text'&&(t.pron||t.tr)&&t.lyrAuto));
    if(this.opt.pron) for(const r of rows){ const y=r.ly+r.lh/2+sz*.7;
      r.syl.forEach(t=>{ if(!t.pron) return; A.strokes.push({t:'text',text:t.pron,x:t.x,y,size:sz,align:'c',lyric:1,pron:1,lyrAuto:1,font:'sans',bold:true,color:'#1f5fd6',alpha:1,layer:A.layer||0}); }); }
    A.redraw(); saveAnn(); A.buildBar();
    // resto della parola a fine pagina → ricordato per la pagina dopo
    const carry={}; for(const vi of new Set(rows.map(r=>r.voice))){ const ws=this.words(vi); const last=ws[ws.length-1]; if(last&&last.open){ carry[vi]=(last.syl.map(s=>s.text).join('')); } }
    ST.cur.lyrCarry=ST.cur.lyrCarry||{}; ST.cur.lyrCarry[ST.page]=carry; DB.putScore(ST.cur);
    toast(this.opt.pron?'Pronuncia scritta in blu sotto i versi · con il Dito ✋ la sposti o la correggi':'Fatto',3200);
    if(!this.opt.trad){ closeLayers(); return; }
    // traduzione: una per voce (la prima di ogni sistema) o per tutte
    busy('Traduco…'); const done=[]; let fail=0;
    try{
      for(const r of rows){ if(!this.opt.all&&r.voice>0) continue;
        const ws=this.words(r.voice).filter(w=>w.syl.some(s=>s.row===r)); const txt=ws.map(w=>w.syl.map(s=>s.text).join('')).join(' '); if(!txt) continue;
        let it=''; try{ it=await Translate.text(txt,this.lang); }catch(e){ try{ it=offlineTranslate(txt,this.lang); fail++; }catch(e2){ continue; } }
        if(!it) continue; done.push([txt,it]);
        // frasi sotto le parole, spezzate in gruppi per non uscire dalla riga
        const tw=it.split(/\s+/).filter(Boolean), nW=ws.length, groups=Math.max(1,Math.min(tw.length,Math.round(nW/2)));
        const first=r.syl[0].x, last=r.syl[r.syl.length-1].x; const y=r.ly+r.lh/2+sz*.7+(this.opt.pron?sz*1.25:0)+tsz*.5;
        for(let g=0;g<groups;g++){ const a=Math.round(g*tw.length/groups), b=Math.round((g+1)*tw.length/groups); const wi=Math.min(nW-1,Math.round(g*nW/groups)); const w0=ws[wi].syl.find(s=>s.row===r);
          const x=w0?r.syl[w0.i].x:first+(last-first)*g/groups; A.strokes.push({t:'text',text:tw.slice(a,b).join(' '),x,y,size:tsz,align:'l',font:mem?mem.font:'serif',italic:mem?mem.italic:true,bold:false,color:mem?mem.color:'#d23b2f',alpha:1,tr:1,lyric:1,lyrAuto:1,layer:A.layer||0}); }
      }
    }finally{ busy(); }
    A.redraw(); saveAnn(); A.buildBar();
    closeLayers();
    if(done.length){ const p=popover(null,`<div style="width:330px;max-height:300px;overflow:auto"><div class="eyebrow">Traduzione in italiano</div>${done.map(([a,b])=>`<div style="margin:8px 0"><div class="hint">${esc(a)}</div><div style="color:#ff6b5e;font-style:italic;font-family:var(--f-display)">${esc(b)}</div></div>`).join('')}${fail?'<div class="hint">Senza internet: traduzione approssimata dal dizionario dell\'app.</div>':''}</div>`); }
    else toast('Traduzione non riuscita: serve internet',3000);
  },
};
