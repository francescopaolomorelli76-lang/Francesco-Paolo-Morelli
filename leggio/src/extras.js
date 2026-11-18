// ================= Evidenziatura automatica · GIF animate · barre che non coprono il rigo · nota senza parola =================

// Le barrette di modifica stanno in basso (o in alto se il rigo è in basso): il rigo resta sempre visibile.
function dockBar(el,refY){
  el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.right='auto';
  const bottomHalf=refY>innerHeight*.55;
  if(bottomHalf){ const ab=$('#annobar'); const t=ab&&ab.classList.contains('open')?ab.getBoundingClientRect().bottom+8:70; el.style.top=t+'px'; el.style.bottom='auto'; }
  else { el.style.top='auto'; el.style.bottom='calc(env(safe-area-inset-bottom,0px) + 14px)'; }
}

// ---------- Evidenzia in automatico (colori fluo) ----------
const AutoHL = {
  pick(anchor,cb){
    $('#hlPick')?.remove(); const p=document.createElement('div'); p.id='hlPick'; p.className='pop';
    p.innerHTML=`<div class="eyebrow" style="margin-bottom:8px">Evidenzia con</div><div class="swatches">${NEON.map(c=>`<button class="sw" style="background:${c};box-shadow:0 0 10px ${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>`;
    document.body.appendChild(p); const r=anchor.getBoundingClientRect(); p.style.position='fixed'; p.style.zIndex=70;
    p.style.left=clamp(r.left,8,innerWidth-330)+'px'; p.style.top=(r.top>innerHeight/2?r.top-p.offsetHeight-8:r.bottom+8)+'px';
    p.onclick=e=>{ const s=e.target.closest('[data-c]'); if(!s) return; p.remove(); cb(s.dataset.c); };
    setTimeout(()=>document.addEventListener('pointerdown',function f(ev){ if(!ev.target.closest('#hlPick')){ p.remove(); document.removeEventListener('pointerdown',f,true); } },true),30);
  },
  // rettangolo (frazioni della pagina) → tratto di evidenziatore
  rect(x0,y0,x1,y1,color){
    const A=Anno, ar=inkCanvas.height/inkCanvas.width, yc=(y0+y1)/2, w=(y1-y0)*ar*1.05;
    A.push(); A.strokes.unshift({t:'hl',color,alpha:.45,w,pts:[[x0,yc],[x1,yc]],layer:A.layer}); A.redraw(); saveAnn(); A.buildBar();
  },
  // zona d'inchiostro dentro una fascia (testo stampato): da dove inizia a dove finisce
  inkSpan(y0,y1){
    const c=pageCanvas, W=c.width, H=c.height, s=Math.min(1,900/W), w=Math.round(W*s), hh=Math.max(1,Math.round((y1-y0)*H*s));
    const t=document.createElement('canvas'); t.width=w; t.height=hh; const x=t.getContext('2d',{willReadFrequently:true}); x.drawImage(c,0,y0*H,W,(y1-y0)*H,0,0,w,hh);
    const d=x.getImageData(0,0,w,hh).data; let a=-1,b=-1;
    for(let i=0;i<w;i++){ let n=0; for(let y=0;y<hh;y++){ const k=(y*w+i)*4; if(d[k]+d[k+1]+d[k+2]<400) n++; } if(n>=1){ if(a<0) a=i; b=i; } }
    return a<0?null:[a/w-.005,b/w+.005];
  },
};

// ---------- GIF animate sulla pagina ----------
const Gif = {
  layer(){ let L=$('#gifLayer'); if(!L){ L=document.createElement('div'); L.id='gifLayer'; pageWrap.appendChild(L); } ['left','top','width','height'].forEach(k=>L.style[k]=inkCanvas.style[k]); return L; },
  sync(){
    const L=this.layer(), list=(ST.ann[ST.page]||[]).filter(s=>s.t==='gif'&&(!Anno.layers[s.layer||0]||Anno.layers[s.layer||0].vis));
    L.innerHTML=list.map(s=>`<img src="${s.src}" alt="" style="left:${s.x*100}%;top:${s.y*100}%;width:${s.w*100}%;height:${s.h*100}%">`).join('');
  },
  async add(src){
    const im=new Image(); im.src=src; try{ await im.decode(); }catch(e){}
    const ar=(im.naturalHeight||1)/(im.naturalWidth||1), pr=inkCanvas.height/inkCanvas.width, w=.22, h=w*ar/pr;
    if(!ST.annotate) Anno.enter();
    Anno.push(); Anno.strokes.push({t:'gif',src,x:.5-w/2,y:.45-h/2,w,h,layer:Anno.layer}); Anno.redraw(); saveAnn(); Anno.buildBar();
    Anno.mode='hand'; Anno.buildBar(); toast('GIF aggiunta: con il Dito ✋ la sposti e la ridimensioni',3000);
  },
  open(){
    const key=ST.settings.giphyKey||'';
    const m2=modal('GIF animate',`
      <div style="display:flex;gap:8px"><label class="search" style="flex:1"><svg class="i" data-i="search"></svg><input id="gfQ" type="search" placeholder="Cerca: applausi, bravo, respira, coro…" autocomplete="off"></label><button class="goldBtn" id="gfGo">Cerca</button></div>
      <div id="gfRes" class="gifGrid">${key?'':'<div class="hint">Per cercare le GIF su internet serve una chiave gratuita GIPHY (developers.giphy.com → Create an App → API). Incollala qui sotto una volta sola.</div>'}</div>
      <div class="field"><label for="gfKey">Chiave GIPHY</label><input id="gfKey" value="${esc(key)}" placeholder="incolla la chiave API"></div>
      <div><button class="ghostBtn" id="gfFile">${iconSvg('image')}Scegli una GIF dalle Foto o dai File</button></div>`,null,{eyebrow:'Inserisci'});
    hydrateIcons(m2);
    $('#gfKey').onchange=()=>{ ST.settings.giphyKey=$('#gfKey').value.trim(); saveSettings(); };
    const search=async()=>{ const k=($('#gfKey').value||'').trim(); const q=$('#gfQ').value.trim()||'applause'; const R=$('#gfRes');
      if(!k){ R.innerHTML='<div class="hint" style="color:var(--danger)">Manca la chiave GIPHY.</div>'; return; }
      ST.settings.giphyKey=k; saveSettings(); R.innerHTML='<div class="hint">Cerco…</div>';
      try{ const j=await (await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(k)}&q=${encodeURIComponent(q)}&limit=24&rating=g&lang=it`)).json();
        const items=(j.data||[]).map(g=>g.images&&(g.images.fixed_width_downsampled||g.images.fixed_width)).filter(Boolean);
        R.innerHTML=items.length?items.map(it=>`<button data-u="${esc(it.url)}"><img src="${esc(it.url)}" alt="" loading="lazy"></button>`).join(''):'<div class="hint">Nessun risultato.</div>';
      }catch(e){ R.innerHTML='<div class="hint" style="color:var(--danger)">Ricerca non riuscita: controlla la connessione e la chiave.</div>'; } };
    $('#gfGo').onclick=search; $('#gfQ').onkeydown=e=>{ if(e.key==='Enter') search(); };
    $('#gfRes').onclick=async e=>{ const b=e.target.closest('[data-u]'); if(!b) return; busy('Scarico la GIF…');
      try{ const blob=await (await fetch(b.dataset.u)).blob(); const src=await blobToDataURL(blob); busy(); closeLayers(); this.add(src); }catch(err){ busy(); toast('Non riesco a scaricare questa GIF'); } };
    $('#gfFile').onclick=()=>{ const f=$('#fileImg'); f.value=''; f.onchange=async()=>{ const file=f.files[0]; if(!file) return; const src=await blobToDataURL(file); closeLayers(); this.add(src); }; f.click(); };
  },
};
