// ================= Crea: scrivi uno spartito da zero (impostazioni, rigo, note, tastiera, dinamiche, ascolto, PDF) =================
const CR_T1=192;                                  // durata di una intera in "tick"
const CR_KEYS={0:'Do maggiore · La minore',1:'Sol maggiore · Mi minore',2:'Re maggiore · Si minore',3:'La maggiore · Fa# minore',4:'Mi maggiore · Do# minore',5:'Si maggiore · Sol# minore',6:'Fa# maggiore · Re# minore',7:'Do# maggiore · La# minore',
  '-1':'Fa maggiore · Re minore','-2':'Sib maggiore · Sol minore','-3':'Mib maggiore · Do minore','-4':'Lab maggiore · Fa minore','-5':'Reb maggiore · Sib minore','-6':'Solb maggiore · Mib minore','-7':'Dob maggiore · Lab minore'};
const CR_TS=['2/4','3/4','4/4','5/4','6/4','2/2','3/2','3/8','6/8','9/8','12/8'];
const CR_CLEFS={treble:{bottom:30,shift:0,k:0,kb:28},bass:{bottom:18,shift:0,k:-2,kb:14},treble8:{bottom:30,shift:-12,k:0,sub:1,kb:21},alto:{bottom:24,shift:0,k:-1,kb:21}};
const CR_INST=[
  {id:'piano',name:'Pianoforte',abbr:'Pno.',staves:['treble','bass']},{id:'voice',name:'Voce',abbr:'Voc.',staves:['treble']},
  {id:'S',name:'Soprano',abbr:'S',staves:['treble']},{id:'A',name:'Contralto',abbr:'A',staves:['treble']},{id:'T',name:'Tenore',abbr:'T',staves:['treble8']},{id:'B',name:'Basso',abbr:'B',staves:['bass']},
  {id:'vln',name:'Violino',abbr:'Vl.',staves:['treble']},{id:'vla',name:'Viola',abbr:'Vla.',staves:['alto']},{id:'vc',name:'Violoncello',abbr:'Vc.',staves:['bass']},
  {id:'gtr',name:'Chitarra',abbr:'Chit.',staves:['treble8']},{id:'fl',name:'Flauto',abbr:'Fl.',staves:['treble']},{id:'org',name:'Organo',abbr:'Org.',staves:['treble','bass']}];
const CR_DYN=['pp','p','mp','mf','f','ff','fp','sf','cresc.','dim.'];
const CR_SHARP=[3,0,4,1,5,2,6], CR_FLAT=[6,2,5,1,4,0,3], CR_SH_POS=[8,5,9,6,3,7,4], CR_FL_POS=[4,7,3,6,2,5,1], CR_LET=[0,2,4,5,7,9,11];
const CR_STEM_UP={2:U(0x1D15E),4:U(0x1D15F),8:U(0x1D160),16:U(0x1D161),32:U(0x1D162)};

const Compose = {
  d:null, mode:'input', dur:4, dots:0, rest:false, acc:null, tup:0, voice:1, chord:false, sel:null, cur:null, hist:[], ghost:null, from:'new', targetSc:null, koct:0, Lo:null, playing:null, keysOn:false, dynOn:false,
  // ---------- dati ----------
  fresh(){ return {title:'Senza titolo',sub:'',comp:'',key:0,ts:[4,4],tempo:110,per:4,measures:8,parts:[{...CR_INST[0]}],ev:{}}; },
  cap(){ return Math.round(CR_T1*this.d.ts[0]/this.d.ts[1]); },
  durOf(e){ let t=CR_T1/e.d*(2-1/Math.pow(2,e.dots||0)); if(e.tup) t=t*2/3; return Math.round(t); },
  staffList(){ const out=[]; this.d.parts.forEach((p,pi)=>p.staves.forEach((c,si)=>out.push({pi,si,clef:c}))); return out; },
  evs(gi,m){ const a=((this.d.ev[gi]||[])[m])||[]; let t=0; return a.map((e,i)=>{ const dur=this.durOf(e); const o={e,i,t,dur}; t+=dur; return o; }); },
  total(gi,m){ return this.evs(gi,m).reduce((a,o)=>a+o.dur,0); },
  arr(gi,m){ const d=this.d; d.ev[gi]=d.ev[gi]||[]; while(d.ev[gi].length<=m) d.ev[gi].push([]); return d.ev[gi][m]; },
  snap(){ this.hist.push(JSON.stringify(this.d)); if(this.hist.length>60) this.hist.shift(); },
  undo(){ if(!this.hist.length) return toast('Niente da annullare',1200); this.d=JSON.parse(this.hist.pop()); this.sel=null; this.render(); },
  keyAcc(l){ const k=this.d.key; if(k>0&&CR_SHARP.slice(0,k).includes(l)) return 1; if(k<0&&CR_FLAT.slice(0,-k).includes(l)) return -1; return 0; },
  midi(gi,n){ const cl=CR_CLEFS[this.staffList()[gi].clef]; const l=((n.s%7)+7)%7, oct=Math.floor(n.s/7); return 12*(oct+1)+CR_LET[l]+(n.a==null?this.keyAcc(l):n.a)+cl.shift; },

  // ---------- impaginazione (A4 in punti) ----------
  layout(){
    const d=this.d, sp=8, PW=595, PH=842, ML=70, MR=40, sl=this.staffList(); const off=[]; let y=0;
    sl.forEach((s,i)=>{ if(i>0) y+=(sl[i-1].pi===s.pi)?44:32; off.push(y); y+=4*sp; });
    const sysH=y, kw=Math.abs(d.key)*sp*.95, hdr1=34+kw+26, hdr2=34+kw+8;
    const pages=[{systems:[]}]; let cy=150, m0=0;
    while(m0<d.measures){ const m1=Math.min(m0+d.per,d.measures), hdr=m0===0?hdr1:hdr2;
      if(cy+sysH>PH-46&&pages[pages.length-1].systems.length){ pages.push({systems:[]}); cy=60; }
      pages[pages.length-1].systems.push({y:cy,x0:ML,xm:ML+hdr,w:(PW-MR-ML-hdr)/d.per,m0,m1,first:m0===0}); cy+=sysH+48; m0=m1; }
    return {sp,PW,PH,sl,off,sysH,pages};
  },
  X(s,m,t){ return s.xm+(m-s.m0)*s.w+12+(t/this.cap())*(s.w-22); },
  Y(Lo,sys,gi,step){ const cl=CR_CLEFS[Lo.sl[gi].clef]; return sys.y+Lo.off[gi]+4*Lo.sp-(step-cl.bottom)*Lo.sp/2; },
  midStep(gi){ return CR_CLEFS[this.staffList()[gi].clef].bottom+4; },
  dirOf(gi,e){ if(e.stem) return e.stem; const st=e.notes.map(n=>n.s); return ((Math.max(...st)+Math.min(...st))/2>=this.midStep(gi))?'d':'u'; },

  // ---------- segni ----------
  accDraw(c,x,y,a,sp){ c.save(); c.strokeStyle=c.fillStyle='#111'; c.lineCap='butt';
    if(a===1){ c.lineWidth=sp*.14; [-.2,.2].forEach((dx,i)=>{ c.beginPath(); c.moveTo(x+dx*sp,y-sp*1.25+i*.15*sp); c.lineTo(x+dx*sp,y+sp*1.25+i*.15*sp); c.stroke(); }); c.lineWidth=sp*.32; [-.38,.38].forEach(dy=>{ c.beginPath(); c.moveTo(x-sp*.5,y+dy*sp+sp*.22); c.lineTo(x+sp*.5,y+dy*sp-sp*.22); c.stroke(); }); }
    else if(a===-1){ c.lineWidth=sp*.14; c.beginPath(); c.moveTo(x-sp*.22,y-sp*1.9); c.lineTo(x-sp*.22,y+sp*.45); c.stroke(); c.lineWidth=sp*.22; c.beginPath(); c.moveTo(x-sp*.22,y+sp*.45); c.bezierCurveTo(x+sp*.55,y+sp*.3,x+sp*.6,y-sp*.75,x-sp*.22,y-sp*.15); c.stroke(); }
    else { c.lineWidth=sp*.14; c.beginPath(); c.moveTo(x-sp*.25,y-sp*1.3); c.lineTo(x-sp*.25,y+sp*.5); c.moveTo(x+sp*.25,y-sp*.5); c.lineTo(x+sp*.25,y+sp*1.3); c.stroke(); c.lineWidth=sp*.3; c.beginPath(); c.moveTo(x-sp*.25,y-sp*.3); c.lineTo(x+sp*.25,y-sp*.5); c.moveTo(x-sp*.25,y+sp*.5); c.lineTo(x+sp*.25,y+sp*.3); c.stroke(); }
    c.restore(); },
  head(c,x,y,d,sp,col){ c.save(); c.fillStyle=col; c.beginPath();
    if(d===1){ c.ellipse(x,y,sp*.74,sp*.45,0,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.ellipse(x,y,sp*.3,sp*.4,-.9,0,7); c.fill(); }
    else if(d===2){ c.ellipse(x,y,sp*.62,sp*.43,-.38,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.ellipse(x,y,sp*.46,sp*.2,-.8,0,7); c.fill(); }
    else { c.ellipse(x,y,sp*.62,sp*.43,-.38,0,7); c.fill(); }
    c.restore(); },
  restDraw(c,x,yTop,d,sp,col){ c.save(); c.fillStyle=c.strokeStyle=col; c.lineCap='round'; c.lineJoin='round';
    if(d===1) c.fillRect(x-sp*.7,yTop+sp,sp*1.4,sp*.5); else if(d===2) c.fillRect(x-sp*.7,yTop+sp*1.5,sp*1.4,sp*.5);
    else if(d===4){ c.lineWidth=sp*.42; c.beginPath(); c.moveTo(x-sp*.3,yTop+sp*.5); c.lineTo(x+sp*.35,yTop+sp*1.3); c.lineTo(x-sp*.35,yTop+sp*2.2); c.lineTo(x+sp*.3,yTop+sp*3); c.stroke(); c.lineWidth=sp*.3; c.beginPath(); c.moveTo(x+sp*.3,yTop+sp*3); c.bezierCurveTo(x-sp*.6,yTop+sp*2.8,x-sp*.7,yTop+sp*3.6,x-sp*.1,yTop+sp*3.7); c.stroke(); }
    else { const n=d===8?1:d===16?2:3; c.lineWidth=sp*.26; c.beginPath(); c.moveTo(x+sp*.45,yTop+sp*1.1); c.lineTo(x-sp*.45-(n-1)*sp*.2,yTop+sp*(2.2+n*.55)); c.stroke();
      for(let i=0;i<n;i++){ c.beginPath(); c.arc(x-sp*.15-i*sp*.2,yTop+sp*(1.4+i),sp*.32,0,7); c.fill(); } }
    c.restore(); },
  ledger(c,Lo,sys,gi,x,step,col){ const cl=CR_CLEFS[Lo.sl[gi].clef], sp=Lo.sp; c.strokeStyle=col; c.lineWidth=.8;
    const ln=st=>{ const y=this.Y(Lo,sys,gi,st); c.beginPath(); c.moveTo(x-sp*1.1,y); c.lineTo(x+sp*1.1,y); c.stroke(); };
    for(let st=cl.bottom-2;st>=step;st-=2) ln(st); for(let st=cl.bottom+10;st<=step;st+=2) ln(st); },

  // ---------- disegno di una pagina ----------
  paintPage(c,Lo,p,o={}){
    const d=this.d, sp=Lo.sp, cap=this.cap(), page=Lo.pages[p]; if(!page) return;
    c.fillStyle='#fff'; c.fillRect(0,0,Lo.PW,Lo.PH); c.fillStyle='#111'; c.strokeStyle='#111'; c.textBaseline='alphabetic';
    const serif=css('--f-display'), music=css('--f-music'), sans=css('--f-body');
    if(p===0){ c.textAlign='center'; c.font=`700 24px ${serif}`; c.fillText(d.title||'',Lo.PW/2,64);
      if(d.sub){ c.font=`500 13px ${serif}`; c.fillText(d.sub,Lo.PW/2,86); }
      if(d.comp){ c.textAlign='right'; c.font=`italic 600 12px ${serif}`; c.fillText(d.comp,Lo.PW-40,112); } }
    c.textAlign='center'; c.font=`600 9px ${sans}`; c.fillStyle='#777'; c.fillText(`${p+1}`,Lo.PW/2,Lo.PH-22); c.fillStyle='#111';
    page.systems.forEach((sys,si)=>{
      const xEnd=sys.xm+(sys.m1-sys.m0)*sys.w;
      if(sys.first){ this.head(c,sys.x0+8,sys.y-14,4,5,'#111'); c.lineWidth=1; c.beginPath(); c.moveTo(sys.x0+12,sys.y-14); c.lineTo(sys.x0+12,sys.y-26); c.stroke(); c.textAlign='left'; c.font=`600 11px ${sans}`; c.fillText('= '+d.tempo,sys.x0+22,sys.y-11); }
      Lo.sl.forEach((s,gi)=>{ const yt=sys.y+Lo.off[gi], cl=CR_CLEFS[s.clef];
        c.strokeStyle='#111'; c.lineWidth=.6; for(let l=0;l<5;l++){ c.beginPath(); c.moveTo(sys.x0+4,yt+l*sp); c.lineTo(xEnd,yt+l*sp); c.stroke(); }
        c.textAlign='left'; c.fillStyle='#111'; c.font=`${sp*4.1}px ${music}`; c.fillText(s.clef==='bass'?U(0x1D122):s.clef==='alto'?U(0x1D121):U(0x1D11E),sys.x0+9,yt+(s.clef==='bass'?sp*1.9:s.clef==='alto'?sp*2.9:sp*3.15));
        if(cl.sub){ c.font=`700 ${sp*1.2}px ${serif}`; c.textAlign='center'; c.fillText('8',sys.x0+22,yt+sp*5.6); }
        const k=d.key, pos=(k>0?CR_SH_POS:CR_FL_POS);
        for(let i=0;i<Math.abs(k);i++) this.accDraw(c,sys.x0+38+i*sp*.95,yt+4*sp-(pos[i]+cl.k)*sp/2,k>0?1:-1,sp*.9);
        if(sys.first){ c.textAlign='center'; c.fillStyle='#111'; c.font=`900 ${sp*2.3}px ${serif}`; c.textBaseline='middle'; const tx=sys.xm-14; c.fillText(d.ts[0],tx,yt+sp); c.fillText(d.ts[1],tx,yt+sp*3); c.textBaseline='alphabetic'; }
      });
      const top=sys.y, bot=sys.y+Lo.sysH; c.strokeStyle='#111'; c.lineWidth=1.4; c.beginPath(); c.moveTo(sys.x0+4,top); c.lineTo(sys.x0+4,bot); c.stroke();
      let g0=0; d.parts.forEach(part=>{ const n=part.staves.length, ya=sys.y+Lo.off[g0], yb=sys.y+Lo.off[g0+n-1]+4*sp;
        if(n>1){ const my=(ya+yb)/2; c.lineWidth=2.4; c.beginPath(); c.moveTo(sys.x0-1,ya); c.bezierCurveTo(sys.x0-9,my-14,sys.x0+1,my-5,sys.x0-9,my); c.bezierCurveTo(sys.x0+1,my+5,sys.x0-9,my+14,sys.x0-1,yb); c.stroke(); }
        c.textAlign='right'; c.fillStyle='#111'; c.font=`500 ${sys.first?9.5:9}px ${serif}`; c.fillText(sys.first?part.name:part.abbr,sys.x0-13,(ya+yb)/2+3);
        for(let m=sys.m0;m<sys.m1;m++){ const bx=sys.xm+(m-sys.m0+1)*sys.w, last=m===d.measures-1; c.lineWidth=last?1.2:.8; c.beginPath(); c.moveTo(bx,ya); c.lineTo(bx,yb); c.stroke(); if(last){ c.lineWidth=3; c.beginPath(); c.moveTo(bx-3.5,ya); c.lineTo(bx-3.5,yb); c.stroke(); } }
        g0+=n; });
      c.textAlign='left'; c.font=`600 8px ${sans}`; c.fillStyle='#555'; c.fillText(sys.m0+1,sys.xm+2,sys.y-5); c.fillStyle='#111';
      Lo.sl.forEach((s,gi)=>{ const yt=sys.y+Lo.off[gi], yb=yt+4*sp;
        for(let m=sys.m0;m<sys.m1;m++){
          const list=this.evs(gi,m);
          if(!list.length) this.restDraw(c,sys.xm+(m-sys.m0)*sys.w+sys.w/2,yt,1,sp,o.print?'#111':'#9a9a9a');
          const unit=(d.ts[1]>=8&&d.ts[0]%3===0&&d.ts[0]>3)?CR_T1/8*3:CR_T1/4, groups=[]; let curG=null;
          list.forEach(q=>{ const ok=q.e.type==='n'&&q.e.d>=8; if(ok&&curG&&Math.floor(curG.t0/unit)===Math.floor(q.t/unit)) curG.items.push(q); else if(ok){ curG={t0:q.t,items:[q]}; groups.push(curG); } else curG=null; });
          const grp=new Map(); groups.forEach(g=>{ if(g.items.length<2) return; const forced=g.items.find(q=>q.e.stem); const mid=this.midStep(gi); const avg=g.items.reduce((a,q)=>{ const st=q.e.notes.map(n=>n.s); return a+(Math.max(...st)+Math.min(...st))/2; },0)/g.items.length; g.dir=forced?forced.e.stem:(avg>=mid?'d':'u'); g.items.forEach(q=>grp.set(q.i,g)); });
          const isSel=i=>o.sel&&o.sel.gi===gi&&o.sel.m===m&&o.sel.i===i;
          list.forEach(q=>{ const e=q.e, x=this.X(sys,m,q.t), col=isSel(q.i)?'#e07b2f':'#111';
            if(e.type==='r'){ this.restDraw(c,x,yt,e.d,sp,col); for(let k=0;k<(e.dots||0);k++){ c.fillStyle=col; c.beginPath(); c.arc(x+sp*(.9+k*.5),yt+sp*1.8,sp*.2,0,7); c.fill(); } }
            else { const ys=e.notes.map(n=>this.Y(Lo,sys,gi,n.s)), g=grp.get(q.i), dir=g?g.dir:this.dirOf(gi,e);
              e.notes.forEach((n,ni)=>{ const y=ys[ni]; this.ledger(c,Lo,sys,gi,x,n.s,col); this.head(c,x,y,e.d>=4?4:e.d,sp,col); if(n.a!=null) this.accDraw(c,x-sp*1.45,y,n.a,sp);
                for(let k=0;k<(e.dots||0);k++){ c.fillStyle=col; c.beginPath(); c.arc(x+sp*(1.05+k*.55),y+(((n.s-CR_CLEFS[s.clef].bottom)%2===0)?-sp*.28:0),sp*.18,0,7); c.fill(); } });
              const hi=Math.min(...ys), lo=Math.max(...ys), sx=dir==='u'?x+sp*.58:x-sp*.58; q.sx=sx; q.dir=dir;
              if(e.d>=2){ c.strokeStyle=col; c.fillStyle=col; c.lineWidth=.9;
                let tip=dir==='u'?hi-sp*3.5:lo+sp*3.5; if(!g) tip=dir==='u'?Math.min(tip,yt+2*sp):Math.max(tip,yt+2*sp); q.tip=tip;
                if(!g){ c.beginPath(); c.moveTo(sx,dir==='u'?lo:hi); c.lineTo(sx,tip); c.stroke(); const sg=dir==='u'?1:-1;
                  for(let f=0;f<(e.d>=32?3:e.d>=16?2:e.d>=8?1:0);f++){ const fy=tip-sg*f*sp*.75; c.lineWidth=sp*.3; c.beginPath(); c.moveTo(sx,fy); c.bezierCurveTo(sx+sp*.1,fy+sg*sp*.9,sx+sp*1.3,fy+sg*sp*1.2,sx+sp*.9,fy+sg*sp*2.5); c.stroke(); } } }
              if(e.tie){ const nx=list[q.i+1], x2=nx?this.X(sys,m,nx.t):sys.xm+(m-sys.m0+1)*sys.w-6, dn=dir==='u'; e.notes.forEach((n,ni)=>{ const yy=ys[ni]+(dn?sp*.8:-sp*.8); c.strokeStyle=col; c.lineWidth=.9; c.beginPath(); c.moveTo(x+sp*.4,yy); c.quadraticCurveTo((x+x2)/2,yy+(dn?sp*1.1:-sp*1.1),x2-sp*.4,yy); c.stroke(); }); } }
            if(e.dyn){ c.fillStyle='#111'; c.textAlign='center'; c.font=`italic 800 ${sp*1.9}px ${serif}`; c.fillText(e.dyn,x,yb+sp*3.8); }
          });
          groups.forEach(g=>{ if(g.items.length<2) return; const dir=g.dir, sg=dir==='u'?1:-1, its=g.items;
            const tips=its.map(q=>{ const ys=q.e.notes.map(n=>this.Y(Lo,sys,gi,n.s)); return dir==='u'?Math.min(...ys)-sp*3.5:Math.max(...ys)+sp*3.5; }); const by=dir==='u'?Math.min(...tips):Math.max(...tips);
            c.fillStyle='#111'; c.strokeStyle=isSel(its[0].i)?'#e07b2f':'#111'; c.lineWidth=.9;
            its.forEach(q=>{ const ys=q.e.notes.map(n=>this.Y(Lo,sys,gi,n.s)); const x=this.X(sys,m,q.t), sx=dir==='u'?x+sp*.58:x-sp*.58; c.strokeStyle=isSel(q.i)?'#e07b2f':'#111'; c.beginPath(); c.moveTo(sx,dir==='u'?Math.max(...ys):Math.min(...ys)); c.lineTo(sx,by); c.stroke(); q.sx=sx; });
            const bar=(xa,xb,lvl)=>{ const t=sp*.5, off=lvl*sp*.8; c.fillStyle='#111'; c.fillRect(xa,dir==='u'?by+off:by-off-t,xb-xa,t); };
            for(let lvl=0;lvl<3;lvl++){ const need=8*Math.pow(2,lvl); let i=0; while(i<its.length){ if(its[i].e.d<need){ i++; continue; } let j=i; while(j+1<its.length&&its[j+1].e.d>=need) j++;
                if(j>i) bar(its[i].sx,its[j].sx,lvl); else if(lvl>0){ const nb=its[i+1]&&its[i+1].e.d>=8; bar(nb?its[i].sx:its[i].sx-sp*1.1,nb?its[i].sx+sp*1.1:its[i].sx,lvl); }
                i=j+1; } } });
          let tr=[]; list.forEach(q=>{ if(q.e.tup){ tr.push(q); if(tr.length===3){ const xa=this.X(sys,m,tr[0].t)-sp*.6, xb=this.X(sys,m,tr[2].t)+sp*.6, ty=yt-sp*1.8; c.strokeStyle='#111'; c.lineWidth=.7; c.beginPath(); c.moveTo(xa,ty+sp*.5); c.lineTo(xa,ty); c.lineTo(xb,ty); c.lineTo(xb,ty+sp*.5); c.stroke(); c.textAlign='center'; c.fillStyle='#111'; c.font=`italic 700 ${sp*1.2}px ${serif}`; c.fillText('3',(xa+xb)/2,ty-sp*.3); tr=[]; } } else tr=[]; });
          if(o.cursor&&this.mode==='input'&&o.cursor.gi===gi&&o.cursor.m===m){ const t=o.cursor.i>=list.length?list.reduce((a,q)=>a+q.dur,0):list[o.cursor.i].t; const cx=this.X(sys,m,t)-sp*1.5; c.strokeStyle='#3a7bd5'; c.lineWidth=1.6; c.beginPath(); c.moveTo(cx,yt-sp*1.2); c.lineTo(cx,yb+sp*1.2); c.stroke(); }
        }
        const gh=o.ghost; if(gh&&gh.gi===gi&&gh.p===p&&gh.si===si){ const cl=CR_CLEFS[s.clef], y=this.Y(Lo,sys,gi,gh.step); c.save(); c.globalAlpha=.6;
          if(this.rest) this.restDraw(c,gh.x,yt,this.dur,sp,'#3a7bd5'); else { this.ledger(c,Lo,sys,gi,gh.x,gh.step,'#3a7bd5'); this.head(c,gh.x,y,this.dur>=4?4:this.dur,sp,'#3a7bd5'); if(this.dur>=2){ c.strokeStyle='#3a7bd5'; c.lineWidth=1; c.beginPath(); c.moveTo(gh.x+sp*.58,y); c.lineTo(gh.x+sp*.58,y-sp*3.5); c.stroke(); } }
          c.restore(); void cl; }
      });
    });
  },
};

// ---------- schermata del compositore ----------
Object.assign(Compose,{
  open(from,sc){
    this.from=from||'new'; this.targetSc=sc||null;
    this.d=(from==='edit'&&sc&&sc.compose)?JSON.parse(JSON.stringify(sc.compose)):this.fresh();
    this.hist=[]; this.sel=null; this.cur={gi:0,m:0,i:0}; this.mode='input'; this.keysOn=false; this.dynOn=false; this.koct=0; this.ghost=null;
    closeLayers(); $('#crea')?.remove(); ST.composing=true;
    const el=document.createElement('div'); el.id='crea';
    const dur=[[1,U(0x1D15D)],[2,U(0x1D15E)],[4,U(0x1D15F)],[8,U(0x1D160)],[16,U(0x1D161)],[32,U(0x1D162)]];
    el.innerHTML=`<div class="crTop"><button class="ib" data-a="close" aria-label="Chiudi">${iconSvg('close')}</button><div class="crTtl">Crea spartito</div>
        <button class="ghostBtn" data-a="addm">${iconSvg('plus')}Battute</button><button class="ghostBtn" data-a="set">${iconSvg('wand')}Impostazioni</button><button class="goldBtn" data-a="done">${iconSvg('check')}Fine</button></div>
      <div class="crScroll" id="crScroll"></div><div class="crSel" id="crSel" hidden></div>
      <div class="crDynBar" id="crDyn" hidden>${CR_DYN.map(x=>`<button data-dyn="${x}">${x}</button>`).join('')}</div>
      <div class="crTools" id="crTools">
        <div class="crRow"><button class="crB" data-a="m-sel" aria-label="Seleziona" title="Seleziona e modifica">${iconSvg('hand')}</button><button class="crB" data-a="m-in" aria-label="Scrivi note" title="Scrivi note">${iconSvg('pen')}</button><span class="crSep"></span>
          ${dur.map(([d,g])=>`<button class="crB crN" data-d="${d}" title="1/${d}"><span class="crGl">${g}</span></button>`).join('')}<button class="crB" data-a="dot" title="Punto">•</button><button class="crB" data-a="rest" title="Pausa">Pausa</button><span class="crSep"></span>
          <button class="crB" data-ac="-1" title="Bemolle">♭</button><button class="crB" data-ac="0" title="Bequadro">♮</button><button class="crB" data-ac="1" title="Diesis">♯</button><button class="crB" data-a="tie" title="Legatura di valore">⌒</button><button class="crB" data-a="tup" title="Terzina">3</button><button class="crB" data-a="chord" title="Accordo: aggiunge note allo stesso tempo">Accordo</button>
          <span class="crSep"></span><button class="crB" data-a="dyn" title="Dinamiche"><i>mf</i></button><button class="crB" data-a="keys" title="Tastiera">${iconSvg('piano')}</button></div>
        <div class="crRow"><button class="crB" data-a="prev" title="Indietro">◀</button><button class="crB" data-a="next" title="Avanti">▶</button><button class="crB" data-a="play" title="Ascolta">${iconSvg('play')}</button><span class="crSep"></span>
          <button class="crB" data-a="voice" title="Voce 1 (gambi automatici) / Voce 2 (gambi in giù)">V1</button><button class="crB" data-a="undo" title="Annulla">${iconSvg('undo')}</button><button class="crB" data-a="del" title="Cancella">${iconSvg('trash')}</button><button class="crB" data-a="help" title="Aiuto">?</button></div></div>
      <div class="crKeys" id="crKeys" hidden></div>`;
    $('#app').appendChild(el); hydrateIcons(el);
    el.addEventListener('click',e=>this.click(e));
    this.sc=$('#crScroll'); this.sc.addEventListener('scroll',()=>this.selBar());
    if(from==='edit') this.render(); else { this.render(); this.settings(true); }
    this.tools();
  },
  close(ask){ const go=()=>{ this.stop(); $('#crea')?.remove(); ST.composing=false; closeLayers(); };
    const has=Object.values(this.d.ev).some(a=>a.some(m=>m.length)); if(ask&&has) return confirmBox('Chiudere senza salvare?','Le note scritte andranno perse.','Chiudi',go); go(); },
  render(){
    const Lo=this.Lo=this.layout(); Lo.sl.forEach((s,i)=>this.arr(i,this.d.measures-1));
    const cw=Math.min(this.sc.clientWidth-16,780), dpr=Math.min(window.devicePixelRatio||1,2);
    let cvs=[...this.sc.querySelectorAll('canvas')];
    while(cvs.length>Lo.pages.length) cvs.pop().remove();
    while(cvs.length<Lo.pages.length){ const c=document.createElement('canvas'); c.className='crPage'; c.dataset.p=cvs.length; this.sc.appendChild(c); this.bindPage(c); cvs.push(c); }
    cvs.forEach((c,p)=>{ c.style.width=cw+'px'; c.style.height=cw*Lo.PH/Lo.PW+'px'; const W=Math.round(cw*dpr); if(c.width!==W){ c.width=W; c.height=Math.round(W*Lo.PH/Lo.PW); } this.paintOne(p); });
    this.tools(); this.selBar();
  },
  paintOne(p){ const c=this.sc.querySelector(`canvas[data-p="${p}"]`); if(!c) return; const x=c.getContext('2d'); x.setTransform(c.width/this.Lo.PW,0,0,c.width/this.Lo.PW,0,0); this.paintPage(x,this.Lo,p,{sel:this.sel,cursor:this.cur,ghost:this.ghost}); },
  redraw(){ this.Lo.pages.forEach((_,p)=>this.paintOne(p)); this.selBar(); },
  tools(){ const el=$('#crea'); if(!el) return; const se=this.selEv(); const dur=se?se.e.d:this.dur, dots=se?se.e.dots||0:this.dots, rest=se?se.e.type==='r':this.rest, tup=se?!!se.e.tup:!!this.tup;
    el.querySelectorAll('[data-d]').forEach(b=>b.classList.toggle('on',+b.dataset.d===dur)); const on=(a,v)=>el.querySelector(`[data-a="${a}"]`)?.classList.toggle('on',!!v);
    on('dot',dots>0); on('rest',rest); on('tup',tup); on('chord',this.chord); on('tie',se&&se.e.tie); on('m-sel',this.mode==='select'); on('m-in',this.mode==='input'); on('dyn',this.dynOn); on('keys',this.keysOn); on('play',!!this.playing);
    el.querySelectorAll('[data-ac]').forEach(b=>{ const n=se&&se.e.notes&&se.e.notes[this.sel.ni||0]; b.classList.toggle('on',n?n.a===+b.dataset.ac:this.acc===+b.dataset.ac); });
    el.querySelector('[data-a="voice"]').textContent='V'+(se&&se.e.stem==='d'?2:se?1:this.voice);
    $('#crDyn').hidden=!this.dynOn; $('#crKeys').hidden=!this.keysOn; if(this.keysOn) this.keys(); el.classList.toggle('keysOn',this.keysOn);
  },
  selEv(){ const s=this.sel; if(!s) return null; const e=((this.d.ev[s.gi]||[])[s.m]||[])[s.i]; return e?{e,gi:s.gi,m:s.m,i:s.i}:null; },
  // ---------- barretta della nota selezionata ----------
  selBar(){ const b=$('#crSel'); if(!b) return; const se=this.selEv(); if(!se||this.mode!=='select'){ b.hidden=true; return; }
    const pos=this.screenPos(se.gi,se.m,se.i); if(!pos){ b.hidden=true; return; }
    const note=se.e.type==='n';
    b.innerHTML=`<button data-s="del">Elimina</button>${note?'<button data-s="up">▲</button><button data-s="dn">▼</button><button data-s="acc">♯⇄♭</button><button data-s="stem">⇅ Gambo</button>':''}<button data-s="rest">${note?'In pausa':'In nota'}</button><button data-s="x">✓</button>`; b.hidden=false;
    const w=b.offsetWidth||300, r=$('#crea').getBoundingClientRect(); b.style.left=clamp(pos.x-w/2,r.left+6,r.right-w-6)+'px'; b.style.top=Math.max(r.top+56,pos.y-70)+'px'; },
  screenPos(gi,m,i){ const Lo=this.Lo; for(let p=0;p<Lo.pages.length;p++) for(const sys of Lo.pages[p].systems){ if(m<sys.m0||m>=sys.m1) continue; const q=this.evs(gi,m)[i]; if(!q) return null;
      const c=this.sc.querySelector(`canvas[data-p="${p}"]`); const r=c.getBoundingClientRect(), k=r.width/Lo.PW; const y=q.e.type==='n'?Math.min(...q.e.notes.map(n=>this.Y(Lo,sys,gi,n.s))):sys.y+Lo.off[gi]+16; return {x:r.left+this.X(sys,m,q.t)*k,y:r.top+y*k}; } return null; },
  // ---------- pulsanti ----------
  click(e){ const t=e.target.closest('button'); if(!t) return; const a=t.dataset.a, se=this.selEv();
    if(t.dataset.d){ const d=+t.dataset.d; if(se){ this.edit(se,q=>{ q.d=d; }); } else this.dur=d; this.tools(); return; }
    if(t.dataset.ac!=null){ const v=+t.dataset.ac; if(se&&se.e.type==='n'){ this.edit(se,q=>{ const n=q.notes[this.sel.ni||0]; n.a=n.a===v?null:v; }); } else this.acc=this.acc===v?null:v; this.tools(); return; }
    if(t.dataset.dyn){ const dy=t.dataset.dyn; const tg=se||this.prevEv(); if(!tg) return toast('Tocca una nota o scrivila prima',1800); this.snap(); tg.e.dyn=tg.e.dyn===dy?undefined:dy; this.render(); return; }
    if(t.dataset.s){ this.selAct(t.dataset.s,se); return; }
    ({close:()=>this.close(true),done:()=>this.finish(),set:()=>this.settings(false),addm:()=>this.addMeasures(),help:()=>this.help(),
      'm-sel':()=>{ this.mode='select'; this.ghost=null; this.redraw(); this.tools(); },'m-in':()=>{ this.mode='input'; this.sel=null; this.redraw(); this.tools(); },
      dot:()=>{ if(se) this.edit(se,q=>{ q.dots=q.dots?0:1; }); else this.dots=this.dots?0:1; this.tools(); },
      rest:()=>{ if(se) this.edit(se,q=>this.toRest(q)); else this.rest=!this.rest; this.tools(); },
      tie:()=>{ if(se&&se.e.type==='n') this.edit(se,q=>{ q.tie=!q.tie; }); else toast('Tocca prima la nota da legare alla successiva',2000); },
      tup:()=>{ if(se) this.edit(se,q=>{ q.tup=q.tup?0:3; }); else this.tup=this.tup?0:3; this.tools(); },
      chord:()=>{ this.chord=!this.chord; toast(this.chord?'Accordo: le note nuove si aggiungono a quella selezionata o appena scritta':'Accordo spento',2200); this.tools(); },
      dyn:()=>{ this.dynOn=!this.dynOn; this.tools(); },keys:()=>{ this.keysOn=!this.keysOn; this.tools(); },
      voice:()=>{ if(se&&se.e.type==='n') this.edit(se,q=>{ q.stem=q.stem==='d'?null:'d'; }); else this.voice=this.voice===1?2:1; this.tools(); },
      undo:()=>this.undo(),del:()=>this.del(),play:()=>this.playing?this.stop():this.play(),
      prev:()=>this.moveCur(-1),next:()=>this.moveCur(1)})[a]?.();
  },
  toRest(q){ if(q.type==='r'){ q.type='n'; q.notes=q.notes||[{s:30,a:null}]; } else { q.type='r'; q.notes=[]; q.tie=false; } },
  // modifica un evento controllando che la battuta non diventi troppo lunga
  edit(se,fn){ this.snap(); const copy=JSON.stringify(se.e); fn(se.e); if(this.total(se.gi,se.m)>this.cap()){ Object.assign(se.e,JSON.parse(copy)); this.hist.pop(); toast('La battuta sarebbe troppo lunga',1800); return false; } this.redraw(); this.tools(); return true; },
  selAct(a,se){ if(a==='x'){ this.sel=null; this.redraw(); this.tools(); return; } if(!se) return;
    if(a==='del'){ this.snap(); this.arr(se.gi,se.m).splice(se.i,1); this.sel=null; this.cur={gi:se.gi,m:se.m,i:se.i}; this.render(); return; }
    if(a==='up'||a==='dn'){ this.snap(); const dl=a==='up'?1:-1; se.e.notes.forEach(n=>n.s=clamp(n.s+dl,CR_CLEFS[this.staffList()[se.gi].clef].bottom-9,CR_CLEFS[this.staffList()[se.gi].clef].bottom+17)); this.redraw(); this.sound(se.gi,se.e); return; }
    if(a==='acc'){ this.snap(); const n=se.e.notes[this.sel.ni||0]; n.a=n.a===1?-1:1; this.redraw(); this.tools(); return; }
    if(a==='stem'){ this.edit(se,q=>{ q.stem=q.stem==='d'?'u':'d'; }); return; }
    if(a==='rest'){ this.edit(se,q=>this.toRest(q)); return; } },
  prevEv(){ const c=this.cur; if(!c) return null; const arr=this.arr(c.gi,c.m); if(c.i>0&&arr[c.i-1]) return {e:arr[c.i-1],gi:c.gi,m:c.m,i:c.i-1}; if(c.m>0){ const pa=this.arr(c.gi,c.m-1); if(pa.length) return {e:pa[pa.length-1],gi:c.gi,m:c.m-1,i:pa.length-1}; } return null; },
  del(){ const se=this.selEv(); if(se) return this.selAct('del',se); const pe=this.prevEv(); if(!pe) return toast('Niente da cancellare',1200); this.snap(); this.arr(pe.gi,pe.m).splice(pe.i,1); this.cur={gi:pe.gi,m:pe.m,i:pe.i}; this.render(); },
  moveCur(dl){ const c=this.cur, arr=this.arr(c.gi,c.m); let i=c.i+dl, m=c.m;
    if(i<0){ if(m>0){ m--; i=this.arr(c.gi,m).length; } else i=0; } else if(i>arr.length){ if(m<this.d.measures-1){ m++; i=0; } else i=arr.length; }
    this.cur={gi:c.gi,m,i}; this.sel=null; this.redraw(); this.tools(); },
  addMeasures(){ this.snap(); this.d.measures+=this.d.per; this.render(); toast(`Aggiunte ${this.d.per} battute`,1400); setTimeout(()=>{ this.sc.scrollTop=this.sc.scrollHeight; },30); },
  // ---------- inserimento ----------
  newEv(step,acc){ return {type:this.rest?'r':'n',d:this.dur,dots:this.dots||0,tup:this.tup||0,notes:this.rest?[]:[{s:step,a:acc==null?null:acc}],tie:false,stem:this.voice===2?'d':null}; },
  put(gi,m,idx,step,acc){
    const arr=this.arr(gi,m); this.snap();
    // accordo: aggiunge una nota all'evento precedente al cursore (o a quello selezionato)
    if(this.chord&&!this.rest){ const tg=this.selEv()||this.prevEv(); if(tg&&tg.e.type==='n'&&!tg.e.notes.some(n=>n.s===step)){ tg.e.notes.push({s:step,a:acc==null?null:acc}); tg.e.notes.sort((a,b)=>a.s-b.s); this.render(); this.sound(tg.gi,tg.e); return true; } }
    const ev=this.newEv(step,acc), dur=this.durOf(ev);
    if(this.total(gi,m)+dur>this.cap()){ this.hist.pop(); toast('La battuta è piena: scegli un valore più breve o tocca la battuta dopo',2200); return false; }
    arr.splice(idx,0,ev); this.cur={gi,m,i:idx+1}; this.sel=null;
    if(this.total(gi,m)>=this.cap()&&m<this.d.measures-1) this.cur={gi,m:m+1,i:0};
    this.render(); if(!this.rest) this.sound(gi,ev); return true; },
  sound(gi,e){ try{ if(this.playing) return; const A=ac(); e.notes.forEach(n=>{ const mi=this.midi(gi,n); if(!(typeof PianoS!=='undefined'&&PianoS.note(mi,.7,A.currentTime,.55))) Alarm.tone(440*Math.pow(2,(mi-69)/12),A.currentTime,.6,'triangle',.25); }); }catch(err){} },
  // tastiera: scrive al cursore
  keyIn(semi){ const gi=this.cur.gi, cl=CR_CLEFS[this.staffList()[gi].clef], sharps=this.d.key>=0;
    const oct=Math.floor(semi/12), pc=((semi%12)+12)%12; const W={0:[0,0],1:sharps?[0,1]:[1,-1],2:[1,0],3:sharps?[1,1]:[2,-1],4:[2,0],5:[3,0],6:sharps?[3,1]:[4,-1],7:[4,0],8:sharps?[4,1]:[5,-1],9:[5,0],10:sharps?[5,1]:[6,-1],11:[6,0]}[pc];
    let step=(oct+Math.floor(cl.kb/7))*7+W[0]-(cl.shift/12)*7; if(this.rest){ this.put(gi,this.cur.m,this.cur.i,30,null); return; }
    const ka=this.keyAcc(W[0]), acc=W[1]===ka?null:W[1]; this.put(gi,this.cur.m,this.cur.i,step,acc); },
  keys(){ const K=$('#crKeys'); if(K.dataset.k) return; K.dataset.k=1; const wh=[0,2,4,5,7,9,11], n=15; let h='';
    for(let i=0;i<n;i++){ const oct=Math.floor(i/7), pc=wh[i%7]; h+=`<button class="crKw" data-k="${oct*12+pc}" style="left:${i*100/n}%;width:${100/n}%"></button>`; }
    for(let i=0;i<n-1;i++){ const pc=wh[i%7]; if([0,2,5,7,9].includes(pc)){ const oct=Math.floor(i/7); h+=`<button class="crKb" data-k="${oct*12+pc+1}" style="left:${(i+1)*100/n-2.1}%;width:4.2%"></button>`; } }
    h+=`<div class="crKo"><button data-ko="-1">8va −</button><button data-ko="1">8va +</button></div>`; K.innerHTML=h;
    K.addEventListener('pointerdown',e=>{ const ko=e.target.closest('[data-ko]'); if(ko){ this.koct=clamp(this.koct+(+ko.dataset.ko),-3,3); toast('Ottava della tastiera: '+(this.koct>0?'+':'')+this.koct,1000); return; } const b=e.target.closest('[data-k]'); if(!b) return; e.preventDefault(); this.keyIn(+b.dataset.k+this.koct*12); }); },
  // ---------- tocchi sul foglio ----------
  bindPage(c){
    let st=null;
    c.addEventListener('pointerdown',e=>{ if(this.playing) this.stop(); c.setPointerCapture(e.pointerId); const hit=this.pointAt(c,e); st={x:e.clientX,y:e.clientY,t:e.pointerType,scrollTop:this.sc.scrollTop,scroll:false,hit,drag:null,moved:false};
      if(!hit) return; const ev=this.hitEv(hit);
      if(ev&&(this.mode==='select'||true)){ if(this.mode==='select'||ev){ this.sel={gi:hit.gi,m:hit.m,i:ev.i,ni:ev.ni}; this.mode='select'; if(ev.e.type==='n'){ st.drag={step:ev.e.notes[ev.ni].s,y0:hit.y,ni:ev.ni,snapped:false}; } this.redraw(); this.tools(); return; } }
      if(this.mode==='input'){ this.ghostTo(hit); } else { this.sel=null; this.cur={gi:hit.gi,m:hit.m,i:this.insIdx(hit)}; this.redraw(); this.tools(); } });
    c.addEventListener('pointermove',e=>{ if(!st) return; const dx=e.clientX-st.x, dy=e.clientY-st.y; if(Math.hypot(dx,dy)>5) st.moved=true;
      if(st.drag&&st.hit){ const h=this.pointAt(c,e); if(!h) return; const sel=this.selEv(); if(!sel||sel.e.type!=='n') return; if(!st.drag.snapped){ this.snap(); st.drag.snapped=true; }
        const step=this.stepAt(h); if(step!==sel.e.notes[st.drag.ni].s){ sel.e.notes[st.drag.ni].s=step; this.sel.ni=st.drag.ni; this.paintOne(+c.dataset.p); this.selBar(); } return; }
      if(st.t==='touch'&&st.moved&&!st.ghosting){ st.scroll=true; this.sc.scrollTop=st.scrollTop-dy; this.ghost=null; return; }
      if(this.mode==='input'){ const h=this.pointAt(c,e); if(h){ this.ghostTo(h); } } });
    const up=e=>{ if(!st) return; const s=st; st=null; if(s.scroll) return; if(s.drag){ if(s.drag.snapped) this.sound(this.sel.gi,this.selEv().e); this.redraw(); return; }
      if(this.mode==='input'&&this.ghost&&s.hit){ const h=this.pointAt(c,e)||s.hit; const g=this.ghost; this.ghost=null; this.put(h.gi,h.m,this.insIdx(h),this.stepAt(h),this.acc); } this.ghost=null; };
    c.addEventListener('pointerup',up); c.addEventListener('pointercancel',()=>{ st=null; this.ghost=null; this.redraw(); });
  },
  pointAt(c,e){ const Lo=this.Lo, r=c.getBoundingClientRect(), k=Lo.PW/r.width, x=(e.clientX-r.left)*k, y=(e.clientY-r.top)*k, p=+c.dataset.p, sp=Lo.sp;
    for(let si=0;si<Lo.pages[p].systems.length;si++){ const sys=Lo.pages[p].systems[si]; if(y<sys.y-22||y>sys.y+Lo.sysH+26) continue;
      let best=-1,bd=1e9; Lo.sl.forEach((s,gi)=>{ const dd=Math.abs(y-(sys.y+Lo.off[gi]+2*sp)); if(dd<bd){ bd=dd; best=gi; } });
      let m=sys.m0+Math.floor((x-sys.xm)/sys.w); m=clamp(m,sys.m0,sys.m1-1); return {p,si,sys,gi:best,m,x,y}; } return null; },
  stepAt(h){ const Lo=this.Lo, cl=CR_CLEFS[Lo.sl[h.gi].clef], yb=h.sys.y+Lo.off[h.gi]+4*Lo.sp; return clamp(cl.bottom+Math.round((yb-h.y)/(Lo.sp/2)),cl.bottom-9,cl.bottom+17); },
  grid(){ return Math.max(12,Math.round(CR_T1/this.dur)); },
  insIdx(h){ const t=clamp(Math.round(((h.x-(h.sys.xm+(h.m-h.sys.m0)*h.sys.w+12))/(h.sys.w-22))*this.cap()/this.grid())*this.grid(),0,this.cap()); const list=this.evs(h.gi,h.m); let n=0; list.forEach(q=>{ if(q.t<t) n++; }); return n; },
  hitEv(h){ const Lo=this.Lo, list=this.evs(h.gi,h.m); for(const q of list){ const x=this.X(h.sys,h.m,q.t); if(Math.abs(h.x-x)>9) continue;
      if(q.e.type==='r'){ if(h.y>h.sys.y+Lo.off[h.gi]-4&&h.y<h.sys.y+Lo.off[h.gi]+4*Lo.sp+4) return {i:q.i,e:q.e,ni:0}; continue; }
      for(let ni=0;ni<q.e.notes.length;ni++){ if(Math.abs(h.y-this.Y(Lo,h.sys,h.gi,q.e.notes[ni].s))<Lo.sp*.8) return {i:q.i,e:q.e,ni}; } } return null; },
  ghostTo(h){ const g=this.ghost; this.ghost={gi:h.gi,p:h.p,si:h.si,x:h.x,step:this.stepAt(h)}; this.cur={gi:h.gi,m:h.m,i:this.insIdx(h)}; if(!g||g.step!==this.ghost.step||g.gi!==h.gi) this.paintOne(h.p); else this.paintOne(h.p); },
  // ---------- ascolto ----------
  play(){ this.stop(); try{ const A=ac(); typeof PianoS!=='undefined'&&PianoS.preload&&PianoS.preload(36,96); const spt=60/this.d.tempo/(CR_T1/4), cap=this.cap(), t0=A.currentTime+.15; let end=0;
      this.staffList().forEach((s,gi)=>{ for(let m=0;m<this.d.measures;m++) this.evs(gi,m).forEach(q=>{ if(q.e.type!=='n') return; const when=t0+(m*cap+q.t)*spt, dur=Math.max(.1,q.dur*spt*.95);
        q.e.notes.forEach(n=>{ const mi=this.midi(gi,n); if(!(typeof PianoS!=='undefined'&&PianoS.note(mi,dur,when,.5))) Alarm.tone(440*Math.pow(2,(mi-69)/12),when,dur,'triangle',.22); }); end=Math.max(end,(m*cap+q.t+q.dur)*spt); }); });
      this.playing=setTimeout(()=>{ this.playing=null; this.tools(); },(end+.4)*1000); toast('Ascolto…',1200); }catch(err){ toast('Audio non disponibile'); } this.tools(); },
  stop(){ if(this.playing){ clearTimeout(this.playing); this.playing=null; try{ if(typeof PianoS!=='undefined'&&PianoS.stopAll) PianoS.stopAll(); }catch(e){} this.tools(); } },
  // ---------- impostazioni (come "Quick Start") ----------
  settings(first){
    const d=this.d, sel=new Set(d.parts.map(p=>p.id)); const draft=JSON.parse(JSON.stringify({title:d.title,sub:d.sub,comp:d.comp,key:d.key,ts:d.ts.join('/'),tempo:d.tempo,per:d.per,measures:d.measures}));
    const m2=modal(first?'Nuova composizione':'Impostazioni',`
      <div class="field"><label for="qsT">Titolo</label><input id="qsT" value="${esc(draft.title)}"></div>
      <div class="grid2"><div class="field"><label for="qsS">Sottotitolo</label><input id="qsS" value="${esc(draft.sub)}"></div><div class="field"><label for="qsC">Compositore</label><input id="qsC" value="${esc(draft.comp)}"></div></div>
      <div class="field"><label for="qsK">Tonalità</label><select id="qsK">${Object.entries(CR_KEYS).sort((a,b)=>a[0]-b[0]).map(([k,n])=>`<option value="${k}"${+k===draft.key?' selected':''}>${n}</option>`).join('')}</select></div>
      <div class="grid2"><div class="field"><label for="qsM">Tempo</label><select id="qsM">${CR_TS.map(t=>`<option${t===draft.ts?' selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label for="qsB">Metronomo ♩ =</label><input id="qsB" type="number" min="30" max="240" value="${draft.tempo}"></div></div>
      <div class="grid2"><div class="field"><label for="qsN">Battute totali</label><input id="qsN" type="number" min="1" max="96" value="${draft.measures}"></div><div class="field"><label>Battute per rigo</label><div class="seg" id="qsP">${[2,3,4,5,6].map(n=>`<button data-n="${n}" class="${n===draft.per?'on':''}">${n}</button>`).join('')}</div></div></div>
      <div class="field"><label>Strumenti (puoi sceglierne più di uno)</label><div class="seg" id="qsI">${CR_INST.map(i=>`<button data-ins="${i.id}" class="${sel.has(i.id)?'on':''}">${i.name}</button>`).join('')}</div></div>`,
      `${first?'<button class="ghostBtn" data-no>Annulla</button>':''}<button class="goldBtn" data-ok>${iconSvg('check')}${first?'Crea':'Applica'}</button>`,{eyebrow:'Crea',sticky:first});
    m2.querySelector('#qsP').onclick=e=>{ const b=e.target.closest('[data-n]'); if(!b) return; draft.per=+b.dataset.n; m2.querySelectorAll('#qsP button').forEach(x=>x.classList.toggle('on',x===b)); };
    m2.querySelector('#qsI').onclick=e=>{ const b=e.target.closest('[data-ins]'); if(!b) return; const id=b.dataset.ins; if(sel.has(id)){ if(sel.size>1) sel.delete(id); } else sel.add(id); b.classList.toggle('on',sel.has(id)); };
    const no=m2.querySelector('[data-no]'); if(no) no.onclick=()=>{ closeLayers(); this.close(false); };
    m2.querySelector('[data-ok]').onclick=()=>{ this.snap(); d.title=$('#qsT').value.trim()||'Senza titolo'; d.sub=$('#qsS').value.trim(); d.comp=$('#qsC').value.trim(); d.key=+$('#qsK').value; d.ts=$('#qsM').value.split('/').map(Number);
      d.tempo=clamp(+$('#qsB').value||110,30,240); d.per=draft.per; d.measures=clamp(+$('#qsN').value||8,1,96);
      const old=d.parts.map(p=>p.id).join(), parts=CR_INST.filter(i=>sel.has(i.id)).map(i=>({...i})); if(parts.map(p=>p.id).join()!==old){ const had=Object.values(d.ev).some(a=>a.some(m=>m.length)); if(had&&!first) toast('Strumenti cambiati: le note dei righi tolti sono state cancellate',3200); d.parts=parts; d.ev={}; }
      Object.keys(d.ev).forEach(k=>d.ev[k]=d.ev[k].slice(0,d.measures)); this.cur={gi:0,m:0,i:0}; this.sel=null; closeLayers(); this.render(); };
  },
  help(){ modal('Come si scrive',`<div class="hint" style="font-size:14px;line-height:1.7"><b>✎ Scrivi note</b>: scegli il valore (intera, minima…), tocca il rigo dove vuoi la nota. Con la Apple Pencil o il mouse tieni premuto e trascina in alto o in basso per scegliere l'altezza, poi alza.<br>
    <b>➤ Seleziona</b>: tocca una nota (diventa arancio). Trascinala su e giù, oppure usa la barretta: Elimina, ▲ ▼, ♯⇄♭, ⇅ Gambo (gambo in basso), In pausa.<br>
    <b>♭ ♮ ♯ • 3 ⌒</b>: alterazioni, punto, terzina, legatura di valore; se una nota è selezionata si applicano a lei.<br>
    <b>Accordo</b>: tocca più altezze di seguito per aggiungere note alla stessa figura.<br>
    <b>mf</b>: dinamiche; <b>tastiera</b>: scrivi suonando i tasti (8va ± cambia ottava); <b>V1/V2</b>: V2 scrive con il gambo in giù.<br>
    <b>▶</b> ascolta · <b>Battute</b> ne aggiunge · <b>Fine</b> crea il PDF.</div>`); },
  // ---------- salvataggio ----------
  async toPdf(){ const Lo=this.layout(); const doc=await PDFLib.PDFDocument.create(); doc.setTitle(this.d.title); doc.setAuthor(this.d.comp||''); doc.setProducer('Mozart · © 2026 FPM webdesignertech'); doc.setCreator('Mozart · FPM webdesignertech');
    for(let p=0;p<Lo.pages.length;p++){ busy(`Creo la pagina ${p+1} di ${Lo.pages.length}…`); await sleep(10); const cv=document.createElement('canvas'); cv.width=595*3; cv.height=842*3; const c=cv.getContext('2d'); c.scale(3,3); this.paintPage(c,Lo,p,{print:true});
      const blob=await new Promise(r=>cv.toBlob(r,'image/png')); const img=await doc.embedPng(await blob.arrayBuffer()); doc.addPage([595,842]).drawImage(img,{x:0,y:0,width:595,height:842}); cv.width=cv.height=1; }
    return doc; },
  finish(){ this.stop(); const has=Object.values(this.d.ev).some(a=>a.some(m=>m.length)); if(!has) return toast('Scrivi almeno una nota',2000);
    const ed=this.from==='edit'&&this.targetSc, ins=this.from==='insert'&&ST.cur;
    const m2=modal('Salva lo spartito',`<div class="hint">“${esc(this.d.title)}” · ${this.Lo.pages.length} ${this.Lo.pages.length===1?'pagina':'pagine'}</div><div class="srcCards">
      ${ed?`<button class="srcCard hero" data-f="replace">${iconSvg('check')}<b>Aggiorna lo spartito</b><span>Rifà le pagine con le tue modifiche; le annotazioni restano.</span></button>`:''}
      ${ins?`<button class="srcCard hero" data-f="insert">${iconSvg('plusDoc')}<b>Inserisci in “${esc(ST.cur.title)}”</b><span>${Insert.posLabel()}</span></button>`:''}
      <button class="srcCard${ed||ins?'':' hero'}" data-f="new">${iconSvg('file')}<b>Nuovo spartito</b><span>Si aggiunge alla libreria.</span></button></div>`,null,{eyebrow:'Crea'});
    m2.querySelector('.srcCards').onclick=async e=>{ const b=e.target.closest('[data-f]'); if(!b) return; const k=b.dataset.f; closeLayers(); busy('Creo il PDF…');
      try{ const doc=await this.toPdf(); const bytes=(await doc.save()).buffer; const data=JSON.parse(JSON.stringify(this.d));
        if(k==='insert'){ await Insert.insertPages(async(dd,at)=>{ const src=await PDFLib.PDFDocument.load(bytes); const pgs=await dd.copyPages(src,src.getPageIndices()); pgs.forEach((p,i)=>dd.insertPage(at+i,p)); return pgs.length; }); }
        else if(k==='replace'){ const sc=this.targetSc; sc.compose=data; sc.title=data.title; sc.composer=data.comp; await replaceBytes(sc,bytes,ST.ann); busy(); renderLibrary(); toast('Spartito aggiornato',2400); }
        else { const sc=await addScore(bytes,{title:data.title,composer:data.comp,genre:'Composizione'}); sc.compose=data; await DB.putScore(sc); busy(); renderLibrary(); await openScore(sc.id); toast('Spartito creato: annotalo con la matita',3000); }
        busy(); this.close(false); }catch(err){ busy(); toast('Non riesco a creare il PDF: '+(err.message||err),3600); } };
  },
});
