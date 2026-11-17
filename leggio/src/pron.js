// ================= Pronuncia all'italiana: regole per lingua, dittonghi compresi =================
// Ogni lingua trasforma la parola in suoni; poi itOrtho() li scrive con l'ortografia italiana
// (così "k" davanti a e/i diventa "ch", lo "sc" di scena diventa "sc"/"sci", ecc.).
// Segnaposto dei suoni: K=k dura, G=g dura, C=c dolce (ciao), J=g dolce (gioco), S=sc di scena, L=gl di figlio.
const _V='aeiouèéòóöüàùìíúãõẽ';
function itOrtho(s){
  let o='';
  for(let i=0;i<s.length;i++){
    const ch=s[i], n=s[i+1]||'', front=/[eièéì]/.test(n), vow=n!==''&&_V.includes(n);
    if(ch==='K') o+=front?'ch':'c';
    else if(ch==='G') o+=front?'gh':'g';
    else if(ch==='C') o+=front?'c':vow?'ci':"c'";
    else if(ch==='J') o+=front?'g':vow?'gi':"g'";
    else if(ch==='S') o+=front?'sc':vow?'sci':"sc'";
    else if(ch==='L') o+=n==='i'?'gl':vow?'gli':'gl';
    else o+=ch;
  }
  return o;
}
const RULES = {
  // Tedesco
  de(w){ let s=w.toLowerCase();
    s=s.replace(/tsch/g,'C').replace(/sch/g,'S').replace(/^st/,'St').replace(/^sp/,'Sp');
    s=s.replace(/^ch/,'K').replace(/chs/g,'Ks').replace(/(a|o|u|au)ch/g,'$1kh').replace(/ch/g,'ç');
    s=s.replace(/ck/g,'K').replace(/qu/g,'Kv').replace(/ß/g,'ss').replace(/ph/g,'f').replace(/th/g,'t').replace(/dt/g,'t');
    // dittonghi: come si pronunciano in italiano
    s=s.replace(/äu|eu/g,'oi').replace(/ie/g,'i').replace(/ei|ai|ey|ay/g,'ai');
    s=s.replace(/ä/g,'è').replace(/y/g,'ü');
    s=s.replace(/([aeiouèöü])h/g,'$1');                 // h dopo vocale: allunga, non si sente
    s=s.replace(/^v/,'f').replace(/v/g,'f').replace(/w/g,'v').replace(/j/g,'i');
    s=s.replace(/ig$/,'iç').replace(/b$/,'p').replace(/d$/,'t').replace(/g$/,'K').replace(/d(?=[st])/g,'t');
    s=s.replace(/^s(?=[aeiouèöü])/,'ṡ').replace(/([aeiouèöü])s(?=[aeiouèöü])/g,'$1ṡ');
    s=s.replace(/c/g,'K').replace(/k(?!h)/g,'K').replace(/g/g,'G');
    return itOrtho(s); },
  // Francese
  fr(w){ let s=w.toLowerCase().replace(/’/g,"'");
    if(s.length<=1) return s;
    s=s.replace(/ch/g,'S').replace(/ph/g,'f').replace(/th/g,'t').replace(/h/g,'');
    s=s.replace(/([aeiouyéèêàâîôû])s(?=[aeiouyéèêàâîôû])/g,'$1ṡ').replace(/ss/g,'s').replace(/([gj])e(?=[aou])/g,'$1');
    s=s.replace(/eaux?$/,'o').replace(/eau/g,'o').replace(/au/g,'o').replace(/œu|oeu|eu|œ/g,'ö').replace(/oi/g,'Ua').replace(/oy/g,'Uai').replace(/o[uùû]/g,'U');
    // nasali (vocale + n/m non seguita da vocale)
    s=s.replace(/(ain|aim|ein|eim|in|im|yn|ym|un|um)(?![aeiouyéèênm])/g,'ẽ').replace(/(an|am|en|em)(?![aeiouyéèênm])/g,'ã').replace(/(on|om)(?![aeiouyéèênm])/g,'õ');
    s=s.replace(/ai|ei|ê|ë/g,'è');
    if(s.length>4) s=s.replace(/(er|ez)$/,'é'); s=s.replace(/et$/,'è');
    s=s.replace(/([aeiouyèé])ill/g,'$1i');
    s=s.replace(/qu/g,'K').replace(/ç/g,'s').replace(/c(?=[eiyéèê])/g,'s').replace(/c/g,'K');
    s=s.replace(/gu(?=[eiyéèê])/g,'G').replace(/g(?=[eiyéèê])/g,'j').replace(/g(?!n)/g,'G');
    s=s.replace(/u/g,'ü').replace(/U/g,'u').replace(/y/g,'i');
    s=s.replace(/z/g,'ṡ');
    s=s.replace(/[dtsxzpg]+$/,'').replace(/([aeiouéèü])e$/,'$1').replace(/(.)e$/,'$1(e)').replace(/(.)es$/,'$1(e)');
    return itOrtho(s); },
  // Latino ecclesiastico (pronuncia romana): quasi come l'italiano
  la(w){ let s=w.toLowerCase();
    if(s==='mihi') return 'michi'; if(s==='nihil') return 'nichil';
    s=s.replace(/ae|æ|oe|œ/g,'e').replace(/j/g,'i').replace(/y/g,'i').replace(/z/g,'dz');
    s=s.replace(/([^stx])ti(?=[aeiou])/g,'$1zi').replace(/^ti(?=[aeiou])/,'zi');
    s=s.replace(/xc(?=[ei])/g,'cS').replace(/x/g,'cs').replace(/ph/g,'f').replace(/th/g,'t').replace(/rh/g,'r');
    s=s.replace(/ch/g,'K').replace(/h/g,'').replace(/k/g,'K');
    return itOrtho(s); },
  // Spagnolo
  es(w){ let s=w.toLowerCase();
    s=s.replace(/ch/g,'C').replace(/ll/g,'L').replace(/ñ/g,'gn').replace(/qu(?=[eiéí])/g,'K').replace(/gu(?=[eiéí])/g,'G').replace(/gü/g,'Gu');
    s=s.replace(/c(?=[eiéí])/g,'θ').replace(/z/g,'θ').replace(/c/g,'K').replace(/g(?=[eiéí])/g,'X').replace(/j/g,'X').replace(/g/g,'G');
    s=s.replace(/h/g,'').replace(/X/g,'kh').replace(/v/g,'b').replace(/y$/,'i').replace(/^y$/,'i').replace(/x/g,'Ks');
    s=s.replace(/[áà]/g,'a').replace(/[éè]/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/[úü]/g,'u');
    return itOrtho(s); },
  // Inglese (approssimato: la pronuncia inglese ha molte eccezioni)
  en(w){ let s=w.toLowerCase();
    const dict={the:'de',and:'end',you:'iu',your:'ior',are:'ar',love:'lav',heart:'hart',my:'mai',life:'laif',with:'uid',for:'for',ever:'ever',all:'ol',we:'ui',our:'auar',free:'fri',me:'mi',be:'bi',sweet:'suit',night:'nait',light:'lait',song:'song',sing:'sing',come:'kam',home:'hom',lord:'lord',god:'god',holy:'holi',glory:'glori',joy:'giòi',peace:'pis',world:'uorld',heaven:'heven',king:'king',praise:'preis',one:'uan',they:'dei',there:'der',here:'hir',what:'uot',who:'hu',is:'iṡ',of:'ov',to:'tu',in:'in',it:'it',a:'e',i:'ai'};
    if(dict[s]) return dict[s];
    s=s.replace(/igh/g,'ai').replace(/ee|ea/g,'i').replace(/oo/g,'u').replace(/ou/g,'au').replace(/ow$/,'au').replace(/sh/g,'S').replace(/tch|ch/g,'C').replace(/th/g,'d').replace(/ph/g,'f').replace(/ck/g,'K').replace(/qu/g,'Kv');
    s=s.replace(/w/g,'u').replace(/y(?=[aeiou])/g,'i').replace(/y$/,'i').replace(/([^aeiou])e$/,'$1').replace(/j/g,'J').replace(/g(?=[ei])/g,'J').replace(/c(?=[eiy])/g,'s').replace(/c/g,'K').replace(/k/g,'K').replace(/g/g,'G');
    return itOrtho(s); },
};

// Riconoscimento della lingua: parole frequenti + segni tipici (dittonghi, desinenze, accenti).
function detectLang(text){
  const raw=String(text).toLowerCase().replace(/’/g,"'");
  const t=' '+raw.replace(/[-–—_.,;:!?¡¿"“”()]/g,' ').replace(/\s+/g,' ')+' ';
  const W={
    it:['il','lo','di','che','non','per','una','sono','mio','mia','amore','cuore','con','del','della','più','ti','mi','ha','ho','gli','io','è','nel','alla','questo','quel','sempre','oh','ah'],
    la:['et','est','dei','deus','domine','dominus','qui','quae','quod','ad','cum','sanctus','gloria','agnus','pacem','nobis','tuam','tua','mundi','miserere','kyrie','eleison','christe','excelsis','amen','ave','maria','gratia','plena','tecum','benedictus','venit','nomine','spiritu','pater','filii','coeli','caeli','terra','sunt','verum','corpus','natum','virgine','salve','regina','mater','dona','requiem','aeternam','lux','in','de'],
    fr:['le','les','des','de','en','je','vous','nous','est','une','dans','pour','mon','votre','avec','pas','ne','sur','au','aux','du','ce','cette','mes','tes','ses','toi','moi','coeur','cœur','amour','ciel','qui','que','et','la','un','ma','son','sa','leur','tout','tous','mais','où'],
    de:['der','die','das','und','ich','du','nicht','ist','ein','eine','mein','dein','mit','auf','zu','von','sich','wie','herz','liebe','gott','wir','ihr','sie','den','dem','des','im','in','es','so','auch','nur','noch','dich','mich','mir','dir','uns','nacht','herr','schön','schon','aus','zum','zur','bei','nach','über','wenn','wo','was','wer'],
    es:['el','los','las','y','que','de','en','un','una','mi','tu','con','por','para','es','no','corazón','amor','yo','te','se','del','al','muy','como','señor','dios','cielo'],
    en:['the','and','you','your','are','is','of','to','my','with','for','we','our','be','me','love','heart','all','this','that','will','shall','thy','thee','lord','in','it','his','her','o'],
  };
  const sc={}; for(const k in W){ sc[k]=0; for(const w of W[k]) if(t.includes(' '+w+' ')) sc[k]+=2; }
  const F={
    de:[/sch/,/ch\b|cht|chen\b/,/tz/,/ck/,/ß/,/[äöü]/,/ei/,/eu|äu/,/\bw[aeiou]/,/\bz[aeiou]/,/(ung|lich|keit|heit|ig)\b/,/\bge\w{3,}t\b/,/\w{3,}en\b/,/[aeiou]h[^aeiou]/,/(ft|pf|nk|tz)\b|pf/,/\w{2,}es\b.*\w{3,}en\b/],
    fr:[/eau/,/ou/,/oi/,/[éèêëçœ]/,/\b[ldjmtsnq]'/,/x\b/,/(tion|ment|eux|aux|ais|ait|ez|oir|ique|ance|ence|eur|ée)\b/,/\bj[ea]/,/\w(es|ent)\b/],
    la:[/\w(ae|um|us|orum|ibus|amus|unt|ere|is)\b/,/\bqu[aeio]/,/ti[aeiou]/],
    es:[/ñ/,/(ción|mente|ado|ido|amos)\b/,/\bll/,/[áíóú]/,/¡|¿/],
    en:[/\bth/,/\bwh/,/(ing|ight|ould|ness)\b/,/\bw\w/],
    it:[/(zione|mente|ggi|cch|gli|sci)\b/,/[òàùì]\b/,/\b(che|chi|gli)\b/],
  };
  for(const k in F) for(const re of F[k]) if(re.test(t)) sc[k]+=1;
  const best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
  return best&&best[1]>0?best[0]:null;
}
