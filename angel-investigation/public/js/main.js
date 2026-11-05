/* Angel Investigation: menu, animazioni, modulo contatti */
(() => {
  const header = document.querySelector('.header');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  // Header trasparente / pieno allo scorrimento
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menu mobile
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    document.body.classList.toggle('no-scroll', open);
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a, button')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  // Voce di menu attiva in base alla sezione visibile
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));

  // Comparsa degli elementi
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); reveal.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 80 + 'ms';
    reveal.observe(el);
  });

  // Contatori
  const counter = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const end = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 1600);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('it-IT') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counter.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => counter.observe(el));

  document.getElementById('year').textContent = new Date().getFullYear();


  // Invio del modulo: prima al server del sito; se il sito è su hosting statico
  // (nessun server), invio tramite FormSubmit direttamente alla casella email.
  const EMAIL = 'angelinvestigation07@libero.it';
  async function sendForm(data) {
    let res;
    try {
      res = await fetch('/api/contatto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch { res = null; }
    if (res && res.headers.get('content-type')?.includes('application/json')) {
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Invio non riuscito.');
      return;
    }
    if (data.website) return; // campo trappola anti-spam
    const r = await fetch('https://formsubmit.co/ajax/' + EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'Richiesta dal sito Angel Investigation',
        _template: 'table',
        _captcha: 'false',
        Nome: data.nome, Email: data.email, Telefono: data.telefono || '-',
        Servizio: data.servizio, Messaggio: data.messaggio,
        _replyto: data.email,
      }),
    }).catch(() => null);
    const out = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok && String(out.success) === 'true') return;
    const msg = String(out.message || '');
    if (/activat/i.test(msg)) {
      throw new Error('Il modulo è in fase di attivazione: il titolare del sito deve confermare la mail di FormSubmit. Nel frattempo scrivici a ' + EMAIL);
    }
    console.warn('FormSubmit:', r && r.status, msg);
    throw new Error('Invio non riuscito' + (msg ? ' (' + msg + ')' : '') + '. Scrivici direttamente a ' + EMAIL);
  }

  // Modulo contatti
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form__status';
    if (!form.checkValidity()) {
      status.textContent = 'Compila nome, email valida, messaggio e consenso privacy.';
      status.classList.add('err');
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.consenso = form.consenso.checked;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = 'Invio in corso…';
    try {
      await sendForm(data);
      form.reset();
      status.textContent = 'Richiesta inviata. Ti ricontatteremo in via riservata entro 24 ore.';
      status.classList.add('ok');
    } catch (err) {
      status.textContent = err.message;
      status.classList.add('err');
    } finally {
      btn.disabled = false;
    }
  });
})();
