/* =====================================================================
   AMO VACINAS — interações da homepage
   ===================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Voucher bar close ---------- */
  const voucherBar = $('#voucherBar');
  const voucherClose = $('#voucherClose');
  if (voucherClose && voucherBar) {
    voucherClose.addEventListener('click', () => {
      voucherBar.classList.add('is-hidden');
    });
  }

  /* ---------- Header shadow on scroll ---------- */
  const header = $('#siteHeader');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const navToggle = $('#navToggle');
  const mobileMenu = $('#mobileMenu');
  let backdrop = null;

  function openMenu() {
    mobileMenu.classList.remove('is-closing');
    mobileMenu.hidden = false;
    mobileMenu.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'menu-backdrop';
      backdrop.addEventListener('click', closeMenu);
      document.body.appendChild(backdrop);
    }
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
  }
  function closeMenu() {
    if (!mobileMenu.classList.contains('is-open')) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.classList.add('is-closing');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
    document.body.style.overflow = '';
    if (backdrop) backdrop.classList.remove('is-open');
    var done = function () {
      mobileMenu.hidden = true;
      mobileMenu.classList.remove('is-closing');
      mobileMenu.removeEventListener('animationend', done);
      clearTimeout(t);
    };
    mobileMenu.addEventListener('animationend', done);
    var t = setTimeout(done, 420);
  }
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    $$('#mobileMenu a').forEach((a) => a.addEventListener('click', closeMenu));
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeModal();
    }
  });

  /* ---------- Scroll reveal ---------- */
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Video modal ---------- */
  const heroPlay = $('#heroPlay');
  const videoModal = $('#videoModal');
  let lastFocused = null;

  function openModal() {
    if (!videoModal) return;
    lastFocused = document.activeElement;
    videoModal.hidden = false;
    document.body.style.overflow = 'hidden';
    const closeBtn = $('.modal__close', videoModal);
    if (closeBtn) closeBtn.focus();
  }
  function closeModal() {
    if (!videoModal || videoModal.hidden) return;
    videoModal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  if (heroPlay) heroPlay.addEventListener('click', openModal);
  if (videoModal) {
    $$('[data-close]', videoModal).forEach((el) =>
      el.addEventListener('click', closeModal)
    );
  }

  /* ---------- Contact form validation ---------- */
  const form = $('#contactForm');
  if (form) {
    const setError = (name, msg) => {
      const input = form.elements[name];
      const err = $(`.field__error[data-for="${name}"]`, form);
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };

    const validators = {
      nome: (v) => (v.trim().length >= 2 ? '' : 'Informe seu nome.'),
      telefone: (v) =>
        v.replace(/\D/g, '').length >= 10 ? '' : 'Telefone inválido.',
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'E-mail inválido.'),
    };

    // mask phone
    const tel = form.elements['telefone'];
    if (tel) {
      tel.addEventListener('input', () => {
        let d = tel.value.replace(/\D/g, '').slice(0, 11);
        if (d.length > 6)
          tel.value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
        else if (d.length > 2) tel.value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
        else if (d.length > 0) tel.value = `(${d}`;
      });
    }

    // validate on blur
    Object.keys(validators).forEach((name) => {
      const input = form.elements[name];
      if (input)
        input.addEventListener('blur', () =>
          setError(name, validators[name](input.value))
        );
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstInvalid = null;
      Object.keys(validators).forEach((name) => {
        const msg = validators[name](form.elements[name].value);
        setError(name, msg);
        if (msg && !firstInvalid) firstInvalid = form.elements[name];
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // envia direto ao WhatsApp da Amo (nenhum dado fica armazenado no site)
      const assuntos = {
        vacina: 'Agendar uma vacina',
        planos: 'Conhecer os planos',
        unidade: 'Encontrar uma unidade',
        franquia: 'Ser franqueado',
      };
      const linhas = [
        'Olá! Vim pelo site da Amo Vacinas.',
        'Nome: ' + form.elements['nome'].value.trim(),
        'Telefone: ' + form.elements['telefone'].value.trim(),
        'E-mail: ' + form.elements['email'].value.trim(),
      ];
      const assunto = form.elements['assunto'];
      if (assunto && assunto.value)
        linhas.push('Assunto: ' + (assuntos[assunto.value] || assunto.value));
      const ok = $('#contactOk');
      if (ok) ok.hidden = false;
      window.open(
        'https://wa.me/5508007291714?text=' + encodeURIComponent(linhas.join('\n')),
        '_blank',
        'noopener'
      );
    });
  }

  /* ---------- Active nav link on scroll ---------- */
  const sections = $$('main section[id]');
  const navLinks = $$('.nav a');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const navIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((l) =>
              l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`)
            );
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => navIO.observe(s));
  }

  /* ---------- Sub-page image: "enlarge to read" on mobile ---------- */
  (function cvZoom() {
    const img = $('.cv-img');
    const main = $('.cv-main');
    if (!img || !main) return;

    const open = () => window.open(img.currentSrc || img.src, '_blank', 'noopener');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cv-zoom';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> Ampliar para ler';
    btn.addEventListener('click', open);

    const wrap = $('.cv-wrap', main);
    main.insertBefore(btn, wrap || main.firstChild);
    img.addEventListener('click', open);
  })();

  /* ---------- Count-up numbers (stats bands) ---------- */
  (function countUp() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const fmt = (n) => n.toLocaleString('pt-BR');
    const render = (el, val) => {
      el.textContent =
        (el.dataset.prefix || '') + fmt(val) + (el.dataset.suffix || '');
    };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => render(el, +el.dataset.count));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          const el = entry.target;
          const target = +el.dataset.count;
          const t0 = performance.now();
          const dur = 900;
          const tick = (t) => {
            const p = Math.min((t - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
            render(el, Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    els.forEach((el) => io.observe(el));
  })();

  /* ---------- Hero carousel ---------- */
  (function heroCarousel() {
    const track = $('#heroTrack');
    const slider = $('#heroSlider');
    if (!track || !slider) return;

    const slides = Array.from(track.children);
    const n = slides.length;
    if (n <= 1) return;

    // tolerate any image format: if the .png is missing, try other extensions.
    // Also handles the race where the error fired before this listener attached.
    slides.forEach((slide) => {
      const img = slide.querySelector('img');
      if (!img) return;
      const base = (img.getAttribute('src') || '').replace(/\.(jpe?g|png|webp)$/i, '');
      const exts = ['png', 'jpg', 'jpeg', 'webp'];
      let ei = 0;
      const tryNext = () => {
        ei++;
        if (ei < exts.length) img.src = base + '.' + exts[ei];
      };
      img.addEventListener('error', tryNext);
      if (img.complete && img.naturalWidth === 0) tryNext();
    });

    const dotsWrap = $('#heroDots');
    const prevBtn = $('#heroPrev');
    const nextBtn = $('#heroNext');
    const AUTOPLAY = 5500;
    let index = 0;
    let timer = null;
    let moved = false;
    let startX = null;

    // build dots
    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Ir para o banner ' + (i + 1));
      b.addEventListener('click', () => go(i));
      dotsWrap.appendChild(b);
      return b;
    });

    function render() {
      track.style.transform = 'translateX(' + -index * 100 + '%)';
      dots.forEach((d, i) =>
        d.setAttribute('aria-selected', i === index ? 'true' : 'false')
      );
    }
    function go(i) {
      index = (i + n) % n;
      render();
      restart();
    }
    const nextSlide = () => go(index + 1);
    const prevSlide = () => go(index - 1);

    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    function start() {
      if (reduceMotion) return;
      stop();
      timer = setInterval(nextSlide, AUTOPLAY);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function restart() {
      stop();
      start();
    }

    // pause on hover / focus
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', start);

    // keyboard
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { prevSlide(); }
      else if (e.key === 'ArrowRight') { nextSlide(); }
    });

    // swipe / drag (and block navigation when dragged)
    slider.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      moved = false;
    });
    slider.addEventListener('pointermove', (e) => {
      if (startX !== null && Math.abs(e.clientX - startX) > 8) moved = true;
    });
    slider.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 45) (dx < 0 ? nextSlide() : prevSlide());
      startX = null;
    });
    slides.forEach((slide) => {
      slide.addEventListener('click', (e) => {
        if (moved) e.preventDefault();
      });
    });

    // pause when tab hidden
    document.addEventListener('visibilitychange', () =>
      document.hidden ? stop() : start()
    );

    render();
    start();
  })();
})();
