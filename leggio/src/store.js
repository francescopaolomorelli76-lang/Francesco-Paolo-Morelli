// Archivio locale (IndexedDB) con ripiego in memoria.
const DB = {
  db:null, mem:{scores:new Map(), kv:new Map()},
  async open(){
    try{
      this.db = await new Promise((res,rej)=>{
        const r=indexedDB.open('fpm-leggio',1);
        r.onupgradeneeded=()=>{const d=r.result; if(!d.objectStoreNames.contains('scores'))d.createObjectStore('scores',{keyPath:'id'}); if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');};
        r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
        setTimeout(()=>rej(new Error('timeout')),4000);
      });
    }catch(e){ this.db=null; }
  },
  _req(store,mode,fn){
    if(!this.db) return Promise.resolve(undefined);
    return new Promise(res=>{
      try{const t=this.db.transaction(store,mode);const r=fn(t.objectStore(store));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>res(undefined);t.onabort=()=>res(undefined);}catch(e){res(undefined)}
    });
  },
  async allScores(){ if(!this.db) return [...this.mem.scores.values()]; return (await this._req('scores','readonly',s=>s.getAll()))||[]; },
  async putScore(o){ this.mem.scores.set(o.id,o); return this._req('scores','readwrite',s=>s.put(o)); },
  async delScore(id){ this.mem.scores.delete(id); return this._req('scores','readwrite',s=>s.delete(id)); },
  async get(k){ if(!this.db) return this.mem.kv.get(k); return this._req('kv','readonly',s=>s.get(k)); },
  async set(k,v){ this.mem.kv.set(k,v); return this._req('kv','readwrite',s=>s.put(v,k)); },
  async del(k){ this.mem.kv.delete(k); return this._req('kv','readwrite',s=>s.delete(k)); },
};
const uid = ()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
