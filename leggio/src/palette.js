// ============ Tavolozza completa: ogni tonalità e sfumatura, ovunque ci siano i colori rapidi ============
// Si aggiunge da sola ai pannelli colore (pennello, evidenziatore, forme, segni, testo): le caselle hanno data-c come i colori rapidi.
const PAL_IDS=['bSw','hlNeon','shSw','spSw','tbCol'];
function palHex(h,s,l){ s/=100; l/=100; const k=n=>(n+h/30)%12, a=s*Math.min(l,1-l), f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
  return '#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''); }
function palHtml(){
  const L=[92,82,72,62,52,42,32,22,12]; let cells='';
  for(const l of L){ for(let h=0;h<360;h+=30) cells+=`<button type="button" class="pc" style="background:${palHex(h,l>85||l<20?70:88,l)}" data-c="${palHex(h,l>85||l<20?70:88,l)}" aria-label="Colore"></button>`;
    const g=palHex(0,0,l+((100-l)>20?4:0)); cells+=`<button type="button" class="pc" style="background:${g}" data-c="${g}" aria-label="Grigio"></button>`; }
  return `<details class="palFull"><summary>Tavolozza completa</summary><div class="palGrid">${cells}</div>
    <div class="palRow"><label>Tonalità libera <input type="color" class="palIn" value="#d6a84e"></label></div></details>`;
}
function palAugment(root){
  PAL_IDS.forEach(id=>{ const c=(root.id===id?root:root.querySelector&&root.querySelector('#'+id)); if(!c||c.dataset.pal) return; c.dataset.pal='1';
    c.insertAdjacentHTML('beforeend',palHtml());
    const inp=c.querySelector('.palIn'); inp.addEventListener('input',()=>{ const b=document.createElement('button'); b.type='button'; b.dataset.c=inp.value; b.hidden=true; inp.closest('details').appendChild(b); b.click(); b.remove(); });
    c.querySelector('summary').addEventListener('click',e=>e.stopPropagation()); }); }
new MutationObserver(ms=>{ for(const m of ms) for(const n of m.addedNodes) if(n.nodeType===1) palAugment(n); }).observe(document.body,{childList:true,subtree:true});
