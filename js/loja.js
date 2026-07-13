/* Loja Amo Vacinas — catálogo, reserva (carrinho) e checkout via WhatsApp.
   Segurança: nenhum dado pessoal é armazenado; o carrinho guarda apenas
   ids/quantidades no localStorage e é validado contra o catálogo ao ler;
   todo texto enviado ao WhatsApp passa por encodeURIComponent. */
(function () {
  'use strict';

  var WHATS = '5508007291714';
  var CART_KEY = 'amoCart';
  var MAX_QTY = 10;

  /* ---------- Catálogo (fonte única de verdade) ---------- */
  var CATS = {
    bebes: 'Bebês',
    criancas: 'Crianças',
    adolescentes: 'Adolescentes',
    adultos: 'Adultos',
    idosos: 'Idosos 60+',
    gestantes: 'Gestantes',
  };
  var CATALOG = [
    { id: 'influenza4', nome: 'Influenza quadrivalente', desc: 'Proteção anual contra a gripe para toda a família.', cats: ['bebes', 'criancas', 'adolescentes', 'adultos', 'gestantes'] },
    { id: 'influenza-hd', nome: 'Influenza high dose 60+', desc: 'Gripe com dose reforçada, desenvolvida para 60+.', cats: ['idosos'] },
    { id: 'hexavalente', nome: 'Hexavalente acelular', desc: 'Difteria, tétano, coqueluche, pólio, hepatite B e Hib.', cats: ['bebes'] },
    { id: 'pentavalente', nome: 'Pentavalente acelular', desc: 'Difteria, tétano, coqueluche, pólio e Hib.', cats: ['bebes'] },
    { id: 'rotavirus', nome: 'Rotavírus pentavalente', desc: 'Gastroenterites causadas por rotavírus.', cats: ['bebes'] },
    { id: 'vsr-beyfortus', nome: 'VSR — Beyfortus', desc: 'Anticorpo monoclonal contra o vírus sincicial respiratório.', cats: ['bebes'] },
    { id: 'men-acwy', nome: 'Meningocócica ACWY', desc: 'Meningites dos tipos A, C, W e Y.', cats: ['bebes', 'criancas', 'adolescentes', 'adultos'] },
    { id: 'men-b', nome: 'Meningocócica B', desc: 'Meningite do tipo B.', cats: ['bebes', 'criancas', 'adolescentes'] },
    { id: 'pneumo13', nome: 'Pneumocócica 13V', desc: 'Pneumonias e doenças pneumocócicas (13 sorotipos).', cats: ['bebes', 'adultos', 'idosos'] },
    { id: 'pneumo15', nome: 'Pneumocócica 15V', desc: 'Pneumonias e doenças pneumocócicas (15 sorotipos).', cats: ['bebes', 'criancas', 'idosos'] },
    { id: 'pneumo20', nome: 'Pneumocócica 20V', desc: 'Cobertura ampliada: 20 sorotipos pneumocócicos.', cats: ['adultos', 'idosos'] },
    { id: 'triplice', nome: 'Tríplice viral', desc: 'Sarampo, caxumba e rubéola.', cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'varicela', nome: 'Varicela', desc: 'Catapora.', cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'hep-a', nome: 'Hepatite A', desc: 'Proteção contra a hepatite A.', cats: ['bebes', 'criancas', 'adultos'] },
    { id: 'hep-b', nome: 'Hepatite B', desc: 'Proteção contra a hepatite B.', cats: ['bebes', 'adultos'] },
    { id: 'hep-ab', nome: 'Hepatite A + B', desc: 'Proteção combinada contra as hepatites A e B.', cats: ['adolescentes', 'adultos'] },
    { id: 'hpv9', nome: 'HPV nonavalente', desc: 'Proteção contra 9 tipos de HPV.', cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'dtpa', nome: 'dTpa', desc: 'Difteria, tétano e coqueluche.', cats: ['adolescentes', 'adultos', 'gestantes'] },
    { id: 'dtpa-ipv', nome: 'dTpa + IPV', desc: 'Difteria, tétano, coqueluche e poliomielite.', cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'febre-amarela', nome: 'Febre amarela', desc: 'Proteção contra a febre amarela.', cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'zoster', nome: 'Herpes Zóster inativada', desc: 'Herpes zóster (cobreiro) e suas complicações.', cats: ['adultos', 'idosos'] },
    { id: 'vsr-abrysvo', nome: 'VSR — Abrysvo', desc: 'Vírus sincicial respiratório para gestantes e 60+.', cats: ['gestantes', 'idosos'] },
    { id: 'vsr-arexvy', nome: 'VSR — Arexvy', desc: 'Vírus sincicial respiratório para 60+.', cats: ['idosos'] },
    { id: 'rhogan', nome: 'Rhogan', desc: 'Imunoglobulina anti-Rh para gestantes.', cats: ['gestantes'] },
  ];
  var byId = {};
  CATALOG.forEach(function (p) { byId[p.id] = p; });

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Carrinho (localStorage, validado ao ler) ---------- */
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(function (i) { return i && byId[i.id]; })
        .map(function (i) {
          var q = parseInt(i.qty, 10);
          return { id: i.id, qty: Math.min(Math.max(isNaN(q) ? 1 : q, 1), MAX_QTY) };
        })
        .slice(0, CATALOG.length);
    } catch (e) { return []; }
  }
  var cart = loadCart();
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* modo privado */ }
  }
  function cartCount() {
    return cart.reduce(function (n, i) { return n + i.qty; }, 0);
  }

  /* ---------- Render do catálogo ---------- */
  var grid = $('#lojaGrid');
  var currentFilter = 'todas';

  function makeCard(p) {
    var card = document.createElement('article');
    card.className = 'lprod';
    card.setAttribute('data-id', p.id);

    var tags = document.createElement('div');
    tags.className = 'lprod__tags';
    p.cats.forEach(function (c) {
      var t = document.createElement('span');
      t.className = 'lprod__tag lprod__tag--' + c;
      t.textContent = CATS[c];
      tags.appendChild(t);
    });

    var h3 = document.createElement('h3');
    h3.textContent = p.nome;
    var desc = document.createElement('p');
    desc.textContent = p.desc;

    var foot = document.createElement('div');
    foot.className = 'lprod__foot';
    var price = document.createElement('span');
    price.className = 'lprod__price';
    price.textContent = 'Valor confirmado no atendimento';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--primary lprod__add';
    btn.textContent = 'Adicionar';
    btn.setAttribute('aria-label', 'Adicionar ' + p.nome + ' à reserva');
    btn.addEventListener('click', function () { addToCart(p.id, btn); });
    foot.appendChild(price);
    foot.appendChild(btn);

    card.appendChild(tags);
    card.appendChild(h3);
    card.appendChild(desc);
    card.appendChild(foot);
    return card;
  }

  function renderGrid() {
    if (!grid) return;
    grid.textContent = '';
    var shown = 0;
    CATALOG.forEach(function (p) {
      if (currentFilter !== 'todas' && p.cats.indexOf(currentFilter) === -1) return;
      grid.appendChild(makeCard(p));
      shown++;
    });
    var empty = $('#lojaEmpty');
    if (empty) empty.hidden = shown > 0;
  }

  /* ---------- Filtros ---------- */
  $$('.fchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      currentFilter = chip.getAttribute('data-cat') || 'todas';
      $$('.fchip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderGrid();
    });
  });

  /* ---------- Drawer / carrinho ---------- */
  var drawer = $('#cartDrawer');
  var overlay = $('#cartOverlay');
  var fab = $('#cartFab');
  var fabCount = $('#cartCount');
  var itemsBox = $('#cartItems');
  var emptyBox = $('#cartEmpty');
  var formBox = $('#cartFormWrap');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    drawer.removeAttribute('aria-hidden');
    var closeBtn = $('#cartClose');
    if (closeBtn) closeBtn.focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    overlay.hidden = true;
    document.body.style.overflow = '';
    drawer.setAttribute('aria-hidden', 'true');
    if (fab) fab.focus();
  }
  if (fab) fab.addEventListener('click', openDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  var closeBtn = $('#cartClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeDrawer();
  });

  function addToCart(id, btn) {
    if (!byId[id]) return;
    var item = cart.filter(function (i) { return i.id === id; })[0];
    if (item) item.qty = Math.min(item.qty + 1, MAX_QTY);
    else cart.push({ id: id, qty: 1 });
    saveCart();
    renderCart();
    if (btn) {
      var old = btn.textContent;
      btn.textContent = 'Adicionado ✓';
      btn.disabled = true;
      setTimeout(function () { btn.textContent = old; btn.disabled = false; }, 900);
    }
  }
  function setQty(id, qty) {
    cart = cart
      .map(function (i) { return i.id === id ? { id: id, qty: qty } : i; })
      .filter(function (i) { return i.qty > 0; });
    saveCart();
    renderCart();
  }

  function renderCart() {
    var n = cartCount();
    if (fabCount) {
      fabCount.textContent = String(n);
      fabCount.hidden = n === 0;
    }
    if (!itemsBox) return;
    itemsBox.textContent = '';
    var has = cart.length > 0;
    if (emptyBox) emptyBox.hidden = has;
    if (formBox) formBox.hidden = !has;

    cart.forEach(function (i) {
      var p = byId[i.id];
      var row = document.createElement('div');
      row.className = 'citem';

      var info = document.createElement('div');
      info.className = 'citem__info';
      var nm = document.createElement('strong');
      nm.textContent = p.nome;
      var ds = document.createElement('small');
      ds.textContent = p.desc;
      info.appendChild(nm);
      info.appendChild(ds);

      var ctr = document.createElement('div');
      ctr.className = 'citem__ctrl';
      var minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−';
      minus.setAttribute('aria-label', 'Diminuir quantidade de ' + p.nome);
      minus.addEventListener('click', function () { setQty(i.id, i.qty - 1); });
      var qty = document.createElement('span');
      qty.textContent = String(i.qty);
      qty.setAttribute('aria-live', 'polite');
      var plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+';
      plus.setAttribute('aria-label', 'Aumentar quantidade de ' + p.nome);
      plus.addEventListener('click', function () { setQty(i.id, Math.min(i.qty + 1, MAX_QTY)); });
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'citem__del'; del.textContent = '✕';
      del.setAttribute('aria-label', 'Remover ' + p.nome);
      del.addEventListener('click', function () { setQty(i.id, 0); });
      ctr.appendChild(minus); ctr.appendChild(qty); ctr.appendChild(plus); ctr.appendChild(del);

      row.appendChild(info);
      row.appendChild(ctr);
      itemsBox.appendChild(row);
    });
  }

  /* ---------- Checkout via WhatsApp (nenhum dado fica no site) ---------- */
  var form = $('#cartForm');
  if (form) {
    var tel = form.elements['whats'];
    if (tel) {
      tel.addEventListener('input', function () {
        var d = tel.value.replace(/\D/g, '').slice(0, 11);
        if (d.length > 6) tel.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
        else if (d.length > 2) tel.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        else if (d.length > 0) tel.value = '(' + d;
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#cartErr');
      var nome = form.elements['nome'].value.trim().slice(0, 80);
      var whats = form.elements['whats'].value.trim();
      var unidade = form.elements['unidade'].value;
      var consent = form.elements['consent'].checked;

      var msg = '';
      if (cart.length === 0) msg = 'Sua reserva está vazia.';
      else if (nome.length < 2) msg = 'Informe seu nome.';
      else if (whats.replace(/\D/g, '').length < 10) msg = 'Informe um WhatsApp válido.';
      else if (!unidade) msg = 'Escolha uma unidade.';
      else if (!consent) msg = 'É preciso aceitar a Política de Privacidade.';
      if (err) { err.textContent = msg; err.hidden = !msg; }
      if (msg) return;

      var linhas = [
        'Olá! Quero reservar vacinas pelo site da Amo. 💜',
        '',
        'Nome: ' + nome,
        'WhatsApp: ' + whats,
        'Unidade: ' + unidade,
        '',
        'Itens da reserva:',
      ];
      cart.forEach(function (i) {
        linhas.push('• ' + byId[i.id].nome + ' (x' + i.qty + ')');
      });
      linhas.push('');
      linhas.push('Ciente de que os valores serão confirmados no atendimento.');

      var ok = $('#cartOk');
      if (ok) ok.hidden = false;
      window.open(
        'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(linhas.join('\n')),
        '_blank',
        'noopener'
      );
    });
  }

  renderGrid();
  renderCart();
})();
