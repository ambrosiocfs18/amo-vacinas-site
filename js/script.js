/* =====================================================================
   AMO VACINAS — interações da homepage
   ===================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Consentimento de cookies ----------
     A tag do Google já sobe com tudo negado (Consent Mode v2, no <head> de
     cada página). Aqui só mostramos a escolha e avisamos o gtag quando ela
     muda — por isso não existe janela em que um cookie seja gravado antes
     do aceite, nem quando o JS demora a carregar. */
  const CONSENT_KEY = 'amoCookieConsent';

  /* O Consent Mode impede cookies NOVOS, mas não remove os já gravados.
     Sem isto, quem aceitou e depois recusou continuaria com _ga/_gcl_au no
     navegador — a revogação não teria efeito prático. */
  function limparCookiesDeMedicao() {
    const dominios = [location.hostname, '.' + location.hostname];
    const raiz = location.hostname.split('.').slice(-2).join('.');
    if (raiz !== location.hostname) dominios.push('.' + raiz);

    document.cookie.split(';').forEach((c) => {
      const nome = c.split('=')[0].trim();
      if (!/^(_ga|_gid|_gcl|_gac)/.test(nome)) return;
      dominios.forEach((d) => {
        document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      });
      document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  }

  function aplicarConsentimento(estado) {
    const v = estado === 'granted' ? 'granted' : 'denied';
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: v,
        ad_user_data: v,
        ad_personalization: v,
        analytics_storage: v,
      });
    }
    if (v === 'denied') limparCookiesDeMedicao();
  }

  const cookieBar = $('#cookieBar');
  if (cookieBar) {
    let escolha = null;
    try { escolha = localStorage.getItem(CONSENT_KEY); } catch (e) {}

    const registrar = (estado) => {
      try { localStorage.setItem(CONSENT_KEY, estado); } catch (e) {}
      aplicarConsentimento(estado);
      cookieBar.classList.remove('is-open');
      cookieBar.hidden = true;
    };

    /* Revela e anima. O reflow forçado (leitura de offsetHeight) faz o
       navegador aplicar o display:block antes da classe, que é o que permite
       a transition rodar. Não usar requestAnimationFrame aqui: ele não
       dispara em aba de segundo plano, e a barra ficaria invisível para quem
       abre o site numa aba que só vê depois. */
    const abrirBarra = () => {
      cookieBar.hidden = false;
      void cookieBar.offsetHeight;
      cookieBar.classList.add('is-open');
    };
    window.__amoAbrirCookieBar = abrirBarra;

    if (escolha === 'granted' || escolha === 'denied') {
      // já decidiu antes: reaplica e não mostra a barra de novo
      aplicarConsentimento(escolha);
    } else {
      abrirBarra();
      const aceitar = $('#cookieAccept', cookieBar);
      const recusar = $('#cookieDeny', cookieBar);
      if (aceitar) aceitar.addEventListener('click', () => registrar('granted'));
      if (recusar) recusar.addEventListener('click', () => registrar('denied'));
    }
  }

  /* Permite rever a decisão depois (botão na política de privacidade) */
  window.AmoCookies = {
    redefinir() {
      try { localStorage.removeItem(CONSENT_KEY); } catch (e) {}
      aplicarConsentimento('denied');
      if (cookieBar) {
        const aceitar = $('#cookieAccept', cookieBar);
        const recusar = $('#cookieDeny', cookieBar);
        const registrar = (estado) => {
          try { localStorage.setItem(CONSENT_KEY, estado); } catch (e) {}
          aplicarConsentimento(estado);
          cookieBar.classList.remove('is-open');
          cookieBar.hidden = true;
        };
        if (aceitar) aceitar.onclick = () => registrar('granted');
        if (recusar) recusar.onclick = () => registrar('denied');
        if (window.__amoAbrirCookieBar) window.__amoAbrirCookieBar();
        else cookieBar.hidden = false;
      }
    },
  };

  const btnRevisar = $('#revisarCookies');
  if (btnRevisar) btnRevisar.addEventListener('click', () => window.AmoCookies.redefinir());

  /* ---------- Envio de leads ao CRM (webhook), sem bloquear o WhatsApp ----------
     Falha silenciosa: se o CRM estiver fora do ar, o cliente ainda fala pelo WhatsApp.
     Envia só o caminho da página (nunca a URL completa) — query string pode carregar
     parâmetros de campanha ou dados de terceiros que não precisam sair daqui. */
  const LEAD_WEBHOOK_URL = 'https://amovacinas-webhook.gkhub.com.br/webhook/cadastro-lead';
  window.AmoLead = {
    send(payload) {
      try {
        fetch(LEAD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({ origem_pagina: window.location.pathname, enviado_em: new Date().toISOString() }, payload)),
          keepalive: true,
        }).catch(() => {});
      } catch (e) {}
    },
  };

  /* ---------- Busca de unidades (unidades.html) — sanfona região > estado > cidade ---------- */
  const unitSearch = $('#unitSearch');
  if (unitSearch) {
    const unitsEmpty = $('#unitsEmpty');
    const regions = $$('.units__region');
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Clicar numa unidade abre o WhatsApp do 0800 com mensagem pronta
    // identificando a unidade escolhida (em vez de ir pro Google Maps).
    /* Os links de rota e WhatsApp já vêm prontos no HTML; isto aqui só os
       reescreve a partir do texto do card, para a lista sobreviver a uma
       regeneração pela planilha sem alguém precisar refazer os hrefs. */
    const WA_UNIDADES = '5508000500090';
    $$('.units__item').forEach((item) => {
      const bairro = $('.units__place strong', item);
      const cidade = $('.units__city', item);
      const uf = $('.units__uf', item);
      const nome = bairro ? bairro.textContent.trim() : '';
      const cid = cidade ? cidade.textContent.trim() : '';
      const sigla = uf ? uf.textContent.trim() : '';

      let local = nome;
      if (cid) local += ' - ' + cid;
      if (sigla) local += '/' + sigla;

      // unidade que ainda não abriu pede outra mensagem: falar em "agendamento"
      // num lugar que não existe confundiria quem clica em "Avise-me"
      const emBreve = item.classList.contains('units__item--breve');

      const wa = $('.units__act--wa', item);
      if (wa) {
        const msg = emBreve
          ? 'Olá! Quero ser avisado quando a unidade Amo Vacinas de ' + local + ' for inaugurada.'
          : 'Olá! Tenho interesse na unidade Amo Vacinas ' + local +
            '. Gostaria de mais informações sobre horários e agendamento.';
        wa.href = 'https://wa.me/' + WA_UNIDADES + '?text=' + encodeURIComponent(msg);
        wa.setAttribute('aria-label', emBreve
          ? 'Avisar quando a unidade ' + local + ' abrir'
          : 'Falar no WhatsApp sobre a unidade ' + local);
      }

      const rota = $('.units__act--rota', item);
      if (rota) {
        const destino = ('Amo Vacinas ' + nome + ' ' + cid + ' ' + sigla).replace(/\s+/g, ' ').trim();
        rota.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destino);
        rota.setAttribute('aria-label', 'Traçar rota até a unidade ' + local);
      }
    });

    unitSearch.addEventListener('input', () => {
      const q = norm(unitSearch.value.trim()).slice(0, 60);
      let shown = 0;
      regions.forEach((region) => {
        let regionShown = 0;
        $$('.units__group', region).forEach((group) => {
          let groupShown = 0;
          $$('li', group).forEach((li) => {
            // data-q agora vive no próprio <li> (o <a> que envolvia o card
            // virou <div> para poder ter os botões de rota e WhatsApp dentro)
            const match = !q || norm(li.getAttribute('data-q') || '').indexOf(q) !== -1;
            li.hidden = !match;
            if (match) groupShown++;
          });
          group.hidden = groupShown === 0;
          group.open = q ? groupShown > 0 : false;
          regionShown += groupShown;
        });
        region.hidden = regionShown === 0;
        region.open = q ? regionShown > 0 : false;
        shown += regionShown;
      });
      if (unitsEmpty) unitsEmpty.hidden = shown > 0;
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
    mobileMenu.scrollTop = 0;
    // padding-top dinâmico: no topo da página o voucher + header cobrem
    // mais que os 90px fixos e escondiam o primeiro item ("Amo")
    const hdr = document.getElementById('siteHeader');
    if (hdr) {
      mobileMenu.style.paddingTop = Math.max(80, hdr.getBoundingClientRect().bottom + 14) + 'px';
    }
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
      $$('.mnav__panel', mobileMenu).forEach((p) => { p.hidden = true; });
      $$('.mnav__trigger', mobileMenu).forEach((b) => b.setAttribute('aria-expanded', 'false'));
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

  /* ---------- Submenu "Serviços" (acordeão mobile) ---------- */
  $$('.mnav__trigger').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.hidden = open;
    });
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

      window.AmoLead.send({
        formulario: 'contato',
        nome: form.elements['nome'].value.trim(),
        telefone: form.elements['telefone'].value.trim(),
        email: form.elements['email'].value.trim(),
        assunto: assunto && assunto.value ? (assuntos[assunto.value] || assunto.value) : '',
      });

      const ok = $('#contactOk');
      if (ok) ok.hidden = false;
      window.open(
        'https://wa.me/5508000500090?text=' + encodeURIComponent(linhas.join('\n')),
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
