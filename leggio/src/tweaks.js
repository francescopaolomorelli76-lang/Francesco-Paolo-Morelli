// ============ Ritocchi: uscendo da Annota il foglio torna intero, senza zoom ============
(function(){ const ex=Anno.exit; Anno.exit=function(){ const r=ex.apply(this,arguments); try{ Zoom.reset(); }catch(e){} return r; }; })();
