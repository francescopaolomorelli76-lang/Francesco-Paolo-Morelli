// ============ Lingue della pronuncia: tedesco, francese, inglese (musical e pop) e russo ============
// Le regole seguono la dizione lirica standard (IPA per cantanti): dittonghi e vocali lunghe come si cantano.
// Fonti di riferimento: Wall, "Diction for Singers"; Moriarty, "Diction"; LaBouff, "Singing and Communicating in English";
// Coffin/Singher per il francese; Cyrillic Diction guides per il russo. Da ricontrollare con un madrelingua prima dell'uso in concerto.

// ---------- Tedesco ----------
RULES.de=function(w){ let s=String(w).toLowerCase().replace(/ß/g,'ss');
  s=s.replace(/tsch/g,'C').replace(/sch/g,'S').replace(/^st/,'sht').replace(/^sp/,'shp').replace(/chs/g,'ks');
  s=s.replace(/ck/g,'K').replace(/qu/g,'Kv').replace(/ph/g,'f').replace(/th/g,'t').replace(/dt/g,'t').replace(/tz/g,'ts').replace(/z/g,'ts');
  s=s.replace(/(a|o|u)ch/g,'$1kh').replace(/^ch/,'K').replace(/ch/g,'ç');
  // dittonghi: ei/ai = "ai", eu/äu = "oi", au = "au"
  s=s.replace(/äu|eu/g,'oi').replace(/ei|ai|ey|ay/g,'ai');
  // vocali lunghe: ie = i lunga; aa/ee/oo si leggono una sola volta; h dopo vocale non si sente
  s=s.replace(/ie/g,'i').replace(/aa/g,'a').replace(/ee/g,'e').replace(/oo/g,'o').replace(/([aeiouäöü])h/g,'$1');
  s=s.replace(/ä/g,'è').replace(/y/g,'ü');
  s=s.replace(/^v/,'f').replace(/v/g,'f').replace(/w/g,'v').replace(/j/g,'i');
  s=s.replace(/ig$/,'iç').replace(/b$/,'p').replace(/d$/,'t').replace(/g$/,'K').replace(/d(?=[st])/g,'t');
  s=s.replace(/ss/g,'s').replace(/([bdfgklmnprt])\1/g,'$1');                 // il tedesco non raddoppia le consonanti
  s=s.replace(/c/g,'K').replace(/k(?!h)/g,'K').replace(/g/g,'G');
  return itOrtho(s); };

// ---------- Francese: lo stesso motore che allinea le sillabe stampate ----------
(function(){ const old=RULES.fr; RULES.fr=function(w){ try{ if(typeof frPronSyl==='function') return frPronSyl([String(w).replace(/’/g,"'")],false)[0]; }catch(e){} return old(w); }; })();

// ---------- Inglese (musical, pop) ----------
const EN_DICT={the:'de',a:'e',an:'en',and:'end',or:'or',of:'ov',to:'tu',in:'in',on:'on',at:'et',is:'is',it:'it',its:'its',be:'bi',been:'bin',are:'ar',was:'uoz',were:'uer',am:'em',i:'ai',you:'iu',your:'ior',yours:'iors',he:'hi',she:'sci',we:'ui',they:'dei',them:'dem',their:'der',this:'dis',that:'det',these:'diz',those:'doz',there:'der',here:'hier',where:'uer',what:'uot',when:'uen',why:'uai',who:'hu',how:'hau',which:'uic',my:'mai',me:'mi',mine:'main',our:'auar',us:'as',his:'hiz',her:'her',him:'him',
  love:'lav',heart:'hart',hearts:'harts',life:'laif',night:'nait',light:'lait',day:'dei',days:'deiz',way:'uei',say:'sei',stay:'stei',play:'plei',away:'euei',baby:'beibi',know:'no',show:'sciò',go:'go',going:'going',gonna:'gona',wanna:'uona',gotta:'gota',now:'nau',down:'daun',town:'taun',out:'aut',about:'ebaut',around:'eraund',sound:'saund',found:'faund',ground:'graund',
  dream:'drim',dreams:'drims',believe:'biliv',forever:'forever',tonight:'tunait',together:'tughedher',again:'eghen',because:'bicoz',people:'pipol',through:'tru',thought:'tot',though:'do',tough:'taf',enough:'inaf',rough:'raf',could:'cud',would:'ud',should:'scud',one:'uan',once:'uans',only:'onli',never:'never',ever:'ever',every:'evri',everything:'evritin',something:'samtin',nothing:'natin',anything:'enitin',
  world:'uorld',word:'uord',words:'uords',work:'uork',girl:'gherl',boy:'boi',man:'men',woman:'umen',women:'uimen',mother:'madher',father:'fadher',brother:'bradher',sister:'sister',friend:'frend',friends:'frends',home:'hom',house:'haus',door:'dor',floor:'flor',more:'mor',before:'bifor',
  sing:'sing',song:'song',songs:'songs',music:'miuzic',voice:'vois',sky:'scai',sun:'san',moon:'mun',star:'star',stars:'stars',rain:'rein',sea:'si',ocean:'oscen',river:'river',mountain:'mauntin',fire:'faier',water:'uoter',wind:'uind',
  hold:'hold',keep:'kip',take:'teik',make:'meik',give:'ghiv',live:'liv',lives:'livz',leave:'liv',feel:'fil',feeling:'filing',tell:'tel',call:'col',fall:'fol',all:'ol',tall:'tol',small:'smol',walk:'uok',talk:'tok',
  yes:'ies',no:'no',not:'not',don:'don',dont:'dont',cant:'cant',wont:'uont',will:'uil',can:'chen',may:'mei',must:'mast',shall:'scel',do:'du',does:'daz',did:'did',done:'dan',have:'hev',has:'hez',had:'hed',get:'ghet',got:'ghot',come:'cam',came:'keim',see:'si',saw:'so',seen:'sin',look:'luk',want:'uont',need:'nid',let:'let',put:'put',
  good:'gud',bad:'bed',new:'niu',old:'old',young:'iang',high:'hai',low:'lo',long:'long',free:'fri',true:'tru',real:'ril',sweet:'suit',beautiful:'biutiful',wonderful:'uanderful',amazing:'emeizing',
  christmas:'crismas',jesus:'gisas',lord:'lord',god:'god',heaven:'heven',angel:'einghel',angels:'einghels',holy:'holi',pray:'prei',peace:'pis',joy:'gioi',
  oh:'o',ooh:'u',yeah:'ie',hey:'hei',la:'la',na:'na',mm:'mm',ah:'a',uh:'a',whoa:'uo',
  one:'uan',two:'tu',three:'tri',four:'for',five:'faiv',ten:'ten',first:'ferst',last:'last',time:'taim',times:'taimz',year:'ier',years:'iers',
  rock:'roc',roll:'rol',dance:'dens',dancing:'densing',party:'parti',money:'mani',city:'siti',street:'strit',road:'rod',car:'car',blue:'blu',red:'red',black:'blec',white:'uait',green:'grin',gold:'gold',
  mercy:'mersi',grace:'greis',soul:'sol',spirit:'spirit',save:'seiv',saved:'seivd',lost:'lost',found:'faund',alive:'elaiv',die:'dai',death:'det',cry:'crai',tears:'tiers',smile:'smail',laugh:'laf',kiss:'chis',touch:'tac',eyes:'aiz',eye:'ai',hand:'hend',hands:'hends',face:'feis',mind:'maind',body:'bodi',
  somebody:'sambodi',someone:'samuan',everyone:'evriuan',nobody:'nobodi',without:'uidaut',within:'uidin',into:'intu',onto:'ontu',over:'over',under:'ander',up:'ap',off:'of',if:'if',so:'so',but:'bat',just:'giast',like:'laik',than:'den',then:'den',too:'tu',very:'veri',much:'mac',many:'meni',some:'sam',any:'eni',other:'adher',another:'enadher',own:'on',
  from:'from',with:'uid',for:'for',by:'bai',as:'ez',off:'of','ill':'il',im:'aim',ive:'aiv',youre:'iur',youve:'iuv',youll:'iul',hes:'hiz',shes:'scis',theyre:'der',weve:'uiv',thats:'dets',whats:'uots',lets:'lets'};
RULES.en=function(w){ let s=String(w).toLowerCase().replace(/’/g,"'").replace(/'/g,'');
  if(EN_DICT[s]) return EN_DICT[s];
  // suffissi frequenti
  if(/ation$/.test(s)) s=s.replace(/ation$/,'eiSn'); else if(/tion$/.test(s)) s=s.replace(/tion$/,'Sn'); if(/sion$/.test(s)) s=s.replace(/sion$/,'Jn'); if(/ture$/.test(s)) s=s.replace(/ture$/,'Cer');
  s=s.replace(/ing$/,'ing').replace(/ed$/,m=>'d');
  s=s.replace(/igh/g,'ai').replace(/eigh/g,'ei').replace(/ough$/,'o').replace(/augh/g,'af').replace(/ought/g,'ot');
  s=s.replace(/ai|ay/g,'ei').replace(/oa/g,'o').replace(/ow$/,'au').replace(/ou/g,'au').replace(/ew/g,'iu').replace(/oy|oi/g,'oi').replace(/ee|ea/g,'i').replace(/oo/g,'u').replace(/ie$/,'ai').replace(/ey$/,'i');
  s=s.replace(/wh/g,'u').replace(/kn/g,'n').replace(/wr/g,'r').replace(/gn$/,'n').replace(/mb$/,'m').replace(/ph/g,'f').replace(/gh/g,'').replace(/th/g,'d');
  s=s.replace(/sh/g,'S').replace(/tch|ch/g,'C').replace(/ck/g,'K').replace(/qu/g,'Kv').replace(/dge/g,'J');
  s=s.replace(/([^aeiou])y$/,'$1i').replace(/^y(?=[aeiou])/,'i').replace(/w/g,'u').replace(/j/g,'J');
  s=s.replace(/([aeiou])([^aeiou])e$/,(m,v,c)=>({a:'ei',e:'i',i:'ai',o:'o',u:'iu'})[v]+c);       // vocale lunga con "e" muta: make, time
  s=s.replace(/([^aeiou])e$/,'$1').replace(/er$/,'er').replace(/ar(?![aeiou])/g,'ar').replace(/(ir|ur)(?![aeiou])/g,'er');
  s=s.replace(/g(?=[ei])/g,'J').replace(/c(?=[eiy])/g,'s').replace(/c/g,'K').replace(/k/g,'K').replace(/g/g,'G').replace(/x/g,'ks').replace(/z/g,'z');
  s=s.replace(/Sn$/,'scon').replace(/Jn$/,'gion').replace(/Cer$/,'cer');
  s=s.replace(/([bdfgklmnprstvz])\1/g,'$1');
  return itOrtho(s); };

// ---------- Russo (cirillico) ----------
const RU_C={'б':'b','в':'v','г':'g','д':'d','ж':'ž','з':'z','к':'k','л':'l','м':'m','н':'n','п':'p','р':'r','с':'s','т':'t','ф':'f','х':'h','ц':'ts','ч':'c','ш':'sh','щ':'shch'};
const RU_PLAIN={'а':'a','о':'o','у':'u','э':'e','ы':'ï','и':'i'}, RU_IOT={'я':'ia','ю':'iu','е':'ie','ё':'io'}, RU_DEV={b:'p',v:'f',g:'k',d:'t','ž':'sh',z:'s'};
const RU_VOICELESS='кпстфхцчшщ', RU_VOICED='бвгджз', RU_HARD='жшц';
const RU_EX={'здравствуйте':'zdrastvuiti','здравствуй':'zdrastvui','солнце':'sontse','сердце':'sertse','что':'scto','чтобы':'sctobi','сегодня':'sievodnia','господи':'gospodi','боже':'bozhe'};
// Dittonghi e iotizzate: я ю е ё = ia iu ie io (la consonante davanti si ammorbidisce); ай ой ей уй = ai oi iei ui; ч = "ci" davanti a a/o/u
RULES.ru=function(w){ const ch=[...String(w).toLowerCase()]; let out='';
  const isV=c=>c in RU_PLAIN||c in RU_IOT||c==='й';
  for(let i=0;i<ch.length;i++){ const c=ch[i], p=ch[i-1]||'', n=ch[i+1]||'';
    if(c==='ъ') continue;
    if(c==='ь'){ if(!n||(n in RU_C)) out+="'"; continue; }
    if(c==='й'){ out+=(p in RU_PLAIN||p in RU_IOT)?'i':'j'; continue; }
    if(c in RU_PLAIN){ out+=(c==='и'&&p&&RU_HARD.includes(p))?'ï':RU_PLAIN[c]; continue; }
    if(c in RU_IOT){ if(p&&RU_HARD.includes(p)) out+=({'е':'e','ё':'o','я':'a','ю':'u'})[c]; else out+=RU_IOT[c]; continue; }
    if(c in RU_C){ let o=RU_C[c];
      if(c==='г'&&n==='о'&&/[ео]го$/.test(ch.slice(Math.max(0,i-1)).join(''))) o='v';           // -ого, -его: "g" si dice "v"
      if(c==='ч'&&(n==='а'||n==='о'||n==='у')) o='ci';
      const devoice=!n||(RU_VOICED.includes(c)&&RU_VOICELESS.includes(n)); if(devoice&&RU_DEV[o]) o=RU_DEV[o];  // consonanti sonore: a fine parola o davanti a sorda diventano sorde
      out+=o; continue; }
    out+=c; }
  out=out.replace(/tts/g,'ts').replace(/dts/g,'ts'); if(RU_EX[String(w).toLowerCase()]) return RU_EX[String(w).toLowerCase()];
  return out; };

// ---------- collegamento alle lingue e al riconoscimento ----------
PRON.ru=w=>RULES.ru(w); PRON.names.ru='Russo (cirillico)';
if(typeof TR_NAMES!=='undefined') TR_NAMES.ru='Russo';
PRON.conv=function(text,lang){ return String(text).replace(/[A-Za-zÀ-ÿßæœА-Яа-яЁё]+/g,w=>{ const r=this[lang](w); return w[0]===w[0].toUpperCase()&&w[0]!==w[0].toLowerCase()?r.charAt(0).toUpperCase()+r.slice(1):r; }); };
(function(){ const d0=detectLang; detectLang=function(text){ const t=String(text); const cy=(t.match(/[А-Яа-яЁё]/g)||[]).length, la=(t.match(/[A-Za-zÀ-ÿ]/g)||[]).length; if(cy>=2&&cy>la) return 'ru'; return d0(text); }; })();
const LETTER_RE=/[A-Za-zÀ-ÿЀ-ӿ]/;
