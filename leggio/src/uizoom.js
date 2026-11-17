// ================= Zoom con due dita su pannelli, menu e finestre (anche Per Cantanti) =================
const UIZoom = {
  ptrs:new Map(), start:null,
  sel:'.modal,.side,.pop,#annobar,#pianoSheet,.bar,#textEntry,#selBar,.lcBar',
  apply(z){ ST.settings.uiz=clamp(+z||1,.6,1.8); document.documentElement.style.setProperty('--uiz',ST.settings.uiz.toFixed(3)); },
  init(){
    this.apply(ST.settings.uiz||1);
    const save=debounce(()=>saveSettings(),400);
    document.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||!e.target.closest||!e.target.closest(this.sel)) return;
      this.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.ptrs.size===2){ const [a,b]=[...this.ptrs.values()]; this.start={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:ST.settings.uiz||1}; }
    },true);
    document.addEventListener('pointermove',e=>{
      const p=this.ptrs.get(e.pointerId); if(!p) return; p.x=e.clientX; p.y=e.clientY;
      if(this.ptrs.size>=2&&this.start){ const [a,b]=[...this.ptrs.values()]; this.apply(this.start.z*Math.hypot(a.x-b.x,a.y-b.y)/this.start.d); save(); e.preventDefault(); }
    },{capture:true,passive:false});
    const up=e=>{ this.ptrs.delete(e.pointerId); if(this.ptrs.size<2) this.start=null; };
    document.addEventListener('pointerup',up,true); document.addEventListener('pointercancel',up,true);
    // iPhone/iPad (Safari e app): gesto nativo di pizzico, più fluido
    let g0=null;
    document.addEventListener('gesturestart',e=>{ if(e.target.closest&&e.target.closest(this.sel)) g0=ST.settings.uiz||1; },true);
    document.addEventListener('gesturechange',e=>{ if(g0!=null&&e.scale){ this.apply(g0*e.scale); save(); } },true);
    document.addEventListener('gestureend',()=>{ g0=null; },true);
  },
};
