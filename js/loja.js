/* Loja Amo Vacinas — catálogo com preços, pacotes PPV, calendário do bebê,
   busca, cupons e checkout via WhatsApp.
   Preços de referência importados do e-commerce oficial (amovacinasonline.com);
   a equipe confirma valores e disponibilidade no atendimento.
   Segurança: nenhum dado pessoal é armazenado; o carrinho guarda apenas
   ids/quantidades no localStorage e é validado contra o catálogo ao ler;
   todo texto enviado ao WhatsApp passa por encodeURIComponent. */
(function () {
  'use strict';

  var WHATS = '5508007291714';
  var CART_KEY = 'amoCart';
  var MAX_QTY = 10;

  /* ---------- Catálogo (fonte única de verdade) ----------
     pn = preço normal · pc = preço Clube AMO (null = confirmar no atendimento) */
  var CATS = {
    bebes: 'Bebês',
    criancas: 'Crianças',
    adolescentes: 'Adolescentes',
    adultos: 'Adultos',
    idosos: 'Idosos 60+',
    gestantes: 'Gestantes',
  };
  var CATALOG = [
    { id: 'influenza4', nome: 'Influenza quadrivalente', desc: 'Proteção anual contra a gripe para toda a família.', doses: 'Dose anual', pn: 189, pc: 129, cats: ['bebes', 'criancas', 'adolescentes', 'adultos', 'gestantes'] },
    { id: 'influenza-hd', nome: 'Influenza high dose 60+', desc: 'Gripe com dose reforçada, desenvolvida para 60+.', doses: 'Dose anual', pn: null, pc: null, cats: ['idosos'] },
    { id: 'hexavalente', nome: 'Hexavalente acelular', desc: 'Difteria, tétano, coqueluche, pólio, hepatite B e Hib.', doses: '3 doses', pn: 399, pc: 369, cats: ['bebes'] },
    { id: 'pentavalente', nome: 'Pentavalente acelular', desc: 'Difteria, tétano, coqueluche, pólio e Hib.', doses: '2 doses + reforço', pn: 279, pc: 249, cats: ['bebes'] },
    { id: 'rotavirus', nome: 'Rotavírus pentavalente', desc: 'Gastroenterites causadas por rotavírus.', doses: '3 doses (oral)', pn: 399, pc: 379, cats: ['bebes'] },
    { id: 'vsr-beyfortus', nome: 'VSR — Beyfortus', desc: 'Anticorpo monoclonal contra o vírus sincicial respiratório.', doses: 'Dose única', pn: null, pc: null, cats: ['bebes'] },
    { id: 'men-acwy', nome: 'Meningocócica ACWY', desc: 'Meningites dos tipos A, C, W e Y.', doses: '1 a 2 doses', pn: 529, pc: 489, cats: ['bebes', 'criancas', 'adolescentes', 'adultos'] },
    { id: 'men-b', nome: 'Meningocócica B', desc: 'Meningite do tipo B — única disponível no Brasil.', doses: '2 a 4 doses', pn: 849, pc: 829, cats: ['bebes', 'criancas', 'adolescentes'] },
    { id: 'pneumo13', nome: 'Pneumocócica 13V', desc: 'Pneumonias e doenças pneumocócicas (13 sorotipos).', doses: '3 + reforço', pn: null, pc: null, cats: ['bebes', 'adultos', 'idosos'] },
    { id: 'pneumo15', nome: 'Pneumocócica 15V', desc: 'Pneumonias e doenças pneumocócicas (15 sorotipos).', doses: '3 + reforço', pn: 479, pc: 439, cats: ['bebes', 'criancas', 'idosos'] },
    { id: 'pneumo20', nome: 'Pneumocócica 20V', desc: 'Cobertura ampliada: 20 sorotipos pneumocócicos.', doses: '3 + reforço', pn: 729, pc: 699, cats: ['bebes', 'adultos', 'idosos'] },
    { id: 'triplice', nome: 'Tríplice viral', desc: 'Sarampo, caxumba e rubéola.', doses: '2 doses', pn: 169, pc: 139, cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'varicela', nome: 'Varicela', desc: 'Catapora.', doses: '2 doses', pn: 349, pc: 319, cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'qdenga', nome: 'Qdenga — Dengue', desc: 'Vacina tetravalente contra a dengue.', doses: '2 doses', pn: 679, pc: 629, cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'hep-a', nome: 'Hepatite A pediátrica', desc: 'Proteção contra a hepatite A para bebês e crianças.', doses: '2 doses', pn: 199, pc: 179, cats: ['bebes', 'criancas'] },
    { id: 'hep-a-ad', nome: 'Hepatite A adulto', desc: 'Proteção contra a hepatite A para adultos.', doses: '2 doses', pn: 299, pc: 279, cats: ['adultos'] },
    { id: 'hep-b', nome: 'Hepatite B', desc: 'Proteção contra a hepatite B. Primeira dose ao nascer.', doses: 'Conforme esquema', pn: 199, pc: 99, cats: ['bebes', 'adultos'] },
    { id: 'hep-ab', nome: 'Hepatite A + B — Twinrix', desc: 'Proteção combinada contra as hepatites A e B.', doses: '3 doses', pn: 439, pc: 399, cats: ['adolescentes', 'adultos'] },
    { id: 'hpv9', nome: 'HPV nonavalente — Gardasil 9', desc: 'Proteção contra 9 tipos de HPV.', doses: '2 a 3 doses', pn: 1329, pc: 1249, cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'dtpa', nome: 'dTpa', desc: 'Difteria, tétano e coqueluche — reforço adulto e gestante.', doses: '1 dose (reforço)', pn: 299, pc: 239, cats: ['adolescentes', 'adultos', 'gestantes'] },
    { id: 'dtpa-ipv', nome: 'dTpa + IPV', desc: 'Difteria, tétano, coqueluche e poliomielite.', doses: '1 dose (reforço)', pn: null, pc: null, cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'febre-amarela', nome: 'Febre amarela — Stamaril', desc: 'Proteção contra a febre amarela.', doses: 'Dose única', pn: 279, pc: 199, cats: ['criancas', 'adolescentes', 'adultos'] },
    { id: 'zoster', nome: 'Herpes Zóster — Shingrix', desc: 'Herpes zóster (cobreiro) e suas complicações. 50+.', doses: '2 doses', pn: 1259, pc: 1155, cats: ['adultos', 'idosos'] },
    { id: 'vsr-abrysvo', nome: 'VSR — Abrysvo', desc: 'Vírus sincicial respiratório para gestantes e 60+.', doses: 'Dose única', pn: 2299, pc: 2099, cats: ['gestantes', 'idosos'] },
    { id: 'vsr-arexvy', nome: 'VSR — Arexvy', desc: 'Vírus sincicial respiratório para 60+.', doses: '1 a 2 doses', pn: 2099, pc: 1899, cats: ['idosos'] },
    { id: 'rhogan', nome: 'Rhogan', desc: 'Imunoglobulina anti-Rh para gestantes.', doses: 'Conforme indicação', pn: null, pc: null, cats: ['gestantes'] },
  ];

  /* Clube AMO — assinatura anual com preços exclusivos */
  var CLUBE = { id: 'clube-amo', nome: 'Clube AMO (assinatura anual)', desc: 'Preços exclusivos em todas as vacinas e pacotes. Sem renovação automática.', pn: 94.8, pc: 94.8 };

  /* ---------- Pacotes PPV (Plano de Vacinação Programado) ----------
     Pacotes de bebê têm variante de Pneumocócica: 15V ou 20V. */
  var PPV = [
    { id: 'ppv-amor', nome: 'PPV Amor', publico: 'Bebê · 2 a 6 meses', doses: 14, icone: 'assets/mascote-bebe.webp', destaque: null, pneumo: true, itens: ['Hexavalente acelular — 2 doses', 'Rotavírus pentavalente — 3 doses', 'Pneumocócica conjugada — 3 doses', 'Meningocócica B — 2 doses', 'Meningocócica ACWY — 2 doses', 'Pentavalente acelular — 1 dose'], precos: { p15: [6567, 6177], p20: [7317, 6957] } },
    { id: 'ppv-cuidadoso', nome: 'PPV Cuidadoso', publico: 'Bebê · 2 a 9 meses', doses: 16, icone: 'assets/mascote-bebe.webp', destaque: null, pneumo: true, itens: ['Hexavalente acelular — 3 doses', 'Rotavírus pentavalente — 3 doses', 'Pneumocócica conjugada — 3 doses', 'Meningocócica B — 2 doses', 'Meningocócica ACWY — 2 doses', 'Influenza quadrivalente — 1 dose', 'Pentavalente acelular — 2 doses'], precos: { p15: [7224, 6634], p20: [7974, 7414] } },
    { id: 'ppv-atencioso', nome: 'PPV Atencioso', publico: 'Bebê · 12 a 18 meses', doses: 11, icone: 'assets/mascote-heroi-festa.webp', destaque: null, pneumo: true, itens: ['Pneumocócica reforço — 1 dose', 'Meningocócica ACWY — 1 dose', 'Meningocócica B — 1 dose', 'Tríplice viral — 2 doses', 'Hepatite A — 1 dose', 'Varicela — 2 doses', 'Influenza — 2 doses', 'Pentavalente reforço — 2 doses'], precos: { p15: [3859, 3509], p20: [4109, 3769] } },
    { id: 'ppv-vip', nome: 'PPV VIP', publico: 'Bebê · 2 a 18 meses', doses: 27, icone: 'assets/mascote-bebe.webp', destaque: 'Mais completo', pneumo: true, itens: ['Hexavalente acelular — 2 doses', 'Rotavírus pentavalente — 3 doses', 'Pneumocócica conjugada — 4 doses', 'Meningocócica B — 3 doses', 'Meningocócica ACWY — 3 doses', 'Influenza quadrivalente — 3 doses', 'Hepatite A pediátrica — 3 doses', 'Tríplice viral — 2 doses', 'Febre amarela — 1 dose', 'Varicela — 2 doses', 'Pentavalente — 2 doses'], precos: { p15: [11083, 10143], p20: [12083, 11183] } },
    { id: 'ppv-vip-plus', nome: 'PPV VIP Plus', publico: 'Nascimento a 4 anos', doses: 33, icone: 'assets/mascote-heroi-festa.webp', destaque: 'VIP Plus', pneumo: true, itens: ['Hexavalente acelular — 2 doses', 'Rotavírus pentavalente — 3 doses', 'Pneumocócica conjugada — 4 doses', 'Meningocócica B — 3 doses', 'Meningocócica ACWY — 3 doses', 'Influenza quadrivalente — 6 doses', 'Hepatite A pediátrica — 2 doses', 'Febre amarela — 2 doses', 'Varicela — 2 doses', 'dTpa+IPV reforço — 1 dose', 'Hepatite B — 1 dose', 'Pentavalente — 2 doses'], precos: { p15: [12437, 11068], p20: [13437, 12108] } },
    { id: 'ppv-mamae', nome: 'PPV Mamãe Cuidadosa', publico: 'Gestante', doses: 5, icone: 'assets/mascote-gestante.webp', destaque: null, pneumo: false, itens: ['dTpa — 1 dose', 'Influenza quadrivalente — 1 dose', 'Abrysvo VSR — 1 dose'], precos: { fixo: [2787, 2437] } },
    { id: 'ppv-papai', nome: 'PPV Papai Cuidadoso', publico: 'Adulto', doses: 5, icone: 'assets/mascote-adulta.webp', destaque: null, pneumo: false, itens: ['dTpa — 1 dose', 'Influenza quadrivalente — 1 dose', 'Febre amarela Stamaril — 1 dose', 'Hepatite A+B Twinrix — 3 doses'], precos: { fixo: [1355, 1135] } },
    { id: 'ppv-atleta', nome: 'PPV Atleta Saudável', publico: 'Adulto', doses: 15, icone: 'assets/mascote-heroi.webp', destaque: null, pneumo: false, itens: ['dTpa — 1 dose', 'Influenza quadrivalente — 1 dose', 'Febre amarela Stamaril — 1 dose', 'Hepatite A adulto — 2 doses', 'Twinrix Hepatite A+B — 3 doses', 'Tríplice viral — 2 doses', 'Meningocócica B — 2 doses', 'Meningocócica ACWY — 1 dose', 'HPV Gardasil 9 — 3 doses'], precos: { fixo: [6736, 6146] } },
    { id: 'ppv-hpv', nome: 'PPV HPV Nonavalente', publico: 'Combo 3 doses', doses: 3, icone: 'assets/mascote-heroi.webp', destaque: null, pneumo: false, itens: ['Gardasil 9 HPV — 3 doses'], precos: { fixo: [3987, 3747] } },
    { id: 'ppv-senior', nome: 'PPV Mais Amor Sênior VIP', publico: '60+', doses: 9, icone: 'assets/mascote-idoso.webp', destaque: null, pneumo: false, itens: ['Influenza quadrivalente — 1 dose', 'Pneumo 20V — 1 dose', 'Meningocócica ACWY — 1 dose', 'dTpa — 1 dose', 'Febre amarela Stamaril — 1 dose', 'Shingrix Herpes Zóster — 2 doses', 'Arexvy VSR — 1 dose'], precos: { fixo: [7081, 6369] } },
    { id: 'ppv-zoster', nome: 'PPV Combo Zóster', publico: 'Combo 2 doses', doses: 2, icone: 'assets/mascote-idoso.webp', destaque: null, pneumo: false, itens: ['Shingrix Herpes Zóster — 2 doses'], precos: { fixo: [2518, 2310] } },
  ];

  /* ---------- Calendário do bebê (mês a mês) ----------
     PNEUMO = escolha entre Pneumocócica 15V ou 20V. */
  var CALENDARIO = [
    { fase: 'Nascimento', sub: 'Primeira proteção ao nascer', ids: ['hep-b'] },
    { fase: '2 meses', sub: 'Primeiras vacinas importantes do bebê', ids: ['hexavalente', 'PNEUMO', 'rotavirus'] },
    { fase: '3 meses', sub: 'Proteção contra meningites', ids: ['men-b', 'men-acwy'] },
    { fase: '4 meses', sub: 'Continuidade do esquema vacinal', ids: ['pentavalente', 'rotavirus', 'PNEUMO'] },
    { fase: '5 meses', sub: 'Reforço contra meningites', ids: ['men-b', 'men-acwy'] },
    { fase: '6 meses', sub: 'Proteção ampliada nesta fase', ids: ['PNEUMO', 'hexavalente', 'rotavirus', 'influenza4'] },
    { fase: '7 meses', sub: 'Continuidade da proteção contra gripe', ids: ['influenza4'] },
    { fase: '9 meses', sub: 'Proteção contra febre amarela', ids: ['febre-amarela'] },
    { fase: '1 ano', sub: 'Vacinas importantes do primeiro ano', ids: ['hep-a', 'triplice', 'varicela', 'PNEUMO'] },
    { fase: '13 meses', sub: 'Reforços contra meningites', ids: ['men-b', 'men-acwy'] },
    { fase: '15 meses', sub: 'Reforços essenciais', ids: ['pentavalente', 'triplice', 'varicela'] },
    { fase: '18 meses', sub: 'Continuidade Hepatite A', ids: ['hep-a'] },
    { fase: '2 e 3 anos', sub: 'Vacina anual contra gripe', ids: ['influenza4'] },
    { fase: '4 anos', sub: 'Reforços e novas proteções', ids: ['qdenga', 'febre-amarela', 'dtpa-ipv'] },
    { fase: '6 anos', sub: 'Reforço meningocócico', ids: ['men-acwy'] },
    { fase: '9 anos', sub: 'Proteção contra HPV', ids: ['hpv9'] },
  ];

  /* ---------- Cupons ---------- */
  var CUPONS = {
    BEMVINDO10: { tipo: 'percentual', valor: 10, label: '10% de desconto' },
    VALE50: { tipo: 'fixo', valor: 50, label: 'R$ 50,00 de desconto' },
    GESTANTE100: { tipo: 'fixo', valor: 100, label: 'R$ 100,00 de desconto' },
  };

  /* ---------- Índices ---------- */
  var byId = {};
  CATALOG.forEach(function (p) { byId[p.id] = p; });
  byId[CLUBE.id] = CLUBE;
  var ppvById = {};
  PPV.forEach(function (p) { ppvById[p.id] = p; });

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function fmt(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* Resolve um id de carrinho (vacina, clube ou pacote::variante) */
  function resolve(id) {
    if (byId[id]) {
      var p = byId[id];
      return { id: id, nome: p.nome, pn: p.pn, pc: p.pc, isPack: false };
    }
    var parts = id.split('::');
    var pack = ppvById[parts[0]];
    if (!pack) return null;
    if (pack.pneumo) {
      var vari = parts[1] === 'p20' ? 'p20' : 'p15';
      var pr = pack.precos[vari];
      return { id: parts[0] + '::' + vari, nome: pack.nome + ' (Pneumo ' + (vari === 'p20' ? '20V' : '15V') + ')', pn: pr[0], pc: pr[1], isPack: true };
    }
    return { id: parts[0], nome: pack.nome, pn: pack.precos.fixo[0], pc: pack.precos.fixo[1], isPack: true };
  }

  /* ---------- Carrinho (localStorage, validado ao ler) ---------- */
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(function (i) { return i && typeof i.id === 'string' && resolve(i.id); })
        .map(function (i) {
          var q = parseInt(i.qty, 10);
          return { id: i.id, qty: Math.min(Math.max(isNaN(q) ? 1 : q, 1), MAX_QTY) };
        })
        .slice(0, 60);
    } catch (e) { return []; }
  }
  var cart = loadCart();
  var cupom = null; /* nunca persistido */
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* modo privado */ }
  }
  function cartCount() {
    return cart.reduce(function (n, i) { return n + i.qty; }, 0);
  }

  function addToCart(id, btn) {
    if (!resolve(id)) return;
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

  /* ---------- Abas da loja (organização do e-commerce) ---------- */
  var PANELS = ['panelBebe', 'panelPacotes', 'panelAdulto', 'panelGestante', 'panelSenior', 'panelBuscar'];
  $$('.ltab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-panel');
      $$('.ltab').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      PANELS.forEach(function (id) {
        var p = document.getElementById(id);
        if (p) p.hidden = id !== target;
      });
      if (target === 'panelBuscar') {
        var si = $('#lojaSearch');
        if (si) si.focus();
      }
    });
  });

  /* links que abrem uma aba específica do catálogo (ex.: "Ver pacotes PPV") */
  $$('[data-tab-link]').forEach(function (link) {
    link.addEventListener('click', function () {
      var tab = document.querySelector('.ltab[data-panel="' + link.getAttribute('data-tab-link') + '"]');
      if (tab) tab.click();
    });
  });

  /* ---------- Grids por perfil + busca ---------- */
  var grid = $('#lojaGrid');
  var searchTerm = '';

  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function priceBlock(p) {
    var box = document.createElement('div');
    box.className = 'lprod__prices';
    if (p.pn == null) {
      var only = document.createElement('span');
      only.className = 'lprod__consult';
      only.textContent = 'Valor confirmado no atendimento';
      box.appendChild(only);
      return box;
    }
    var main = document.createElement('span');
    main.className = 'lprod__price';
    main.textContent = fmt(p.pn);
    var clube = document.createElement('span');
    clube.className = 'lprod__clube';
    clube.textContent = 'Clube AMO: ' + fmt(p.pc);
    box.appendChild(main);
    box.appendChild(clube);
    return box;
  }

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
    desc.textContent = p.desc + (p.doses ? ' · ' + p.doses : '');

    var foot = document.createElement('div');
    foot.className = 'lprod__foot';
    foot.appendChild(priceBlock(p));
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--primary lprod__add';
    btn.textContent = 'Adicionar';
    btn.setAttribute('aria-label', 'Adicionar ' + p.nome + ' à reserva');
    btn.addEventListener('click', function () { addToCart(p.id, btn); });
    foot.appendChild(btn);

    card.appendChild(tags);
    card.appendChild(h3);
    card.appendChild(desc);
    card.appendChild(foot);
    return card;
  }

  function renderCatGrid(sel, cat) {
    var box = $(sel);
    if (!box) return;
    box.textContent = '';
    CATALOG.forEach(function (p) {
      if (p.cats.indexOf(cat) === -1) return;
      box.appendChild(makeCard(p));
    });
  }

  function renderSearch() {
    if (!grid) return;
    grid.textContent = '';
    var q = norm(searchTerm.trim());
    var shown = 0;
    CATALOG.forEach(function (p) {
      if (q && norm(p.nome + ' ' + p.desc).indexOf(q) === -1) return;
      grid.appendChild(makeCard(p));
      shown++;
    });
    var empty = $('#lojaEmpty');
    if (empty) empty.hidden = shown > 0;
  }

  var searchInput = $('#lojaSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchTerm = searchInput.value.slice(0, 60);
      renderSearch();
    });
  }

  /* ---------- Calendário do bebê (mês a mês) ---------- */
  var calBox = $('#calFases');
  function renderCalendario() {
    if (!calBox) return;
    CALENDARIO.forEach(function (f) {
      var det = document.createElement('details');
      det.className = 'lcal__fase';
      var sum = document.createElement('summary');
      var st = document.createElement('strong');
      st.textContent = f.fase;
      var ss = document.createElement('span');
      ss.textContent = f.sub;
      sum.appendChild(st);
      sum.appendChild(ss);
      det.appendChild(sum);

      var body = document.createElement('div');
      body.className = 'lcal__body';

      var addAllIds = [];
      f.ids.forEach(function (id) {
        if (id === 'PNEUMO') {
          var row = document.createElement('div');
          row.className = 'lcal__vac lcal__vac--choice';
          var info = document.createElement('div');
          var nm = document.createElement('strong');
          nm.textContent = 'Pneumocócica conjugada';
          var pr = document.createElement('small');
          pr.textContent = 'Escolha: 15V ' + fmt(byId.pneumo15.pn) + ' · 20V ' + fmt(byId.pneumo20.pn);
          info.appendChild(nm);
          info.appendChild(pr);
          var btns = document.createElement('div');
          btns.className = 'lcal__choice';
          ['pneumo15', 'pneumo20'].forEach(function (pid) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn--ghost lcal__mini';
            b.textContent = pid === 'pneumo15' ? '+ 15V' : '+ 20V';
            b.setAttribute('aria-label', 'Adicionar ' + byId[pid].nome);
            b.addEventListener('click', function () { addToCart(pid, b); });
            btns.appendChild(b);
          });
          row.appendChild(info);
          row.appendChild(btns);
          body.appendChild(row);
          addAllIds.push('pneumo15');
          return;
        }
        var p = byId[id];
        if (!p) return;
        addAllIds.push(id);
        var row2 = document.createElement('div');
        row2.className = 'lcal__vac';
        var info2 = document.createElement('div');
        var nm2 = document.createElement('strong');
        nm2.textContent = p.nome;
        var pr2 = document.createElement('small');
        pr2.textContent = p.pn == null ? 'Valor no atendimento' : fmt(p.pn) + ' · Clube ' + fmt(p.pc);
        info2.appendChild(nm2);
        info2.appendChild(pr2);
        var b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'btn btn--ghost lcal__mini';
        b2.textContent = '+ Adicionar';
        b2.setAttribute('aria-label', 'Adicionar ' + p.nome);
        b2.addEventListener('click', function () { addToCart(id, b2); });
        row2.appendChild(info2);
        row2.appendChild(b2);
        body.appendChild(row2);
      });

      var all = document.createElement('button');
      all.type = 'button';
      all.className = 'btn btn--primary lcal__all';
      all.textContent = 'Adicionar todas desta fase';
      all.addEventListener('click', function () {
        addAllIds.forEach(function (id) { addToCart(id, null); });
        all.textContent = 'Fase adicionada ✓';
        setTimeout(function () { all.textContent = 'Adicionar todas desta fase'; }, 1200);
      });
      if (addAllIds.length > 1) body.appendChild(all);

      det.appendChild(body);
      calBox.appendChild(det);
    });
  }

  /* ---------- Pacotes PPV ---------- */
  var ppvBox = $('#ppvGrid');
  function renderPPV() {
    if (!ppvBox) return;
    PPV.forEach(function (pack) {
      var card = document.createElement('article');
      card.className = 'ppv' + (pack.destaque ? ' ppv--destaque' : '');

      if (pack.destaque) {
        var flag = document.createElement('span');
        flag.className = 'ppv__flag';
        flag.textContent = pack.destaque;
        card.appendChild(flag);
      }

      var head = document.createElement('div');
      head.className = 'ppv__head';
      var ic = document.createElement('img');
      ic.className = 'ppv__ico';
      ic.src = pack.icone;
      ic.alt = '';
      ic.loading = 'lazy';
      ic.width = 40;
      ic.height = 62;
      var tit = document.createElement('div');
      var h3 = document.createElement('h3');
      h3.textContent = pack.nome;
      var pub = document.createElement('small');
      pub.textContent = pack.publico + ' · ' + pack.doses + ' doses';
      tit.appendChild(h3);
      tit.appendChild(pub);
      head.appendChild(ic);
      head.appendChild(tit);
      card.appendChild(head);

      var ul = document.createElement('ul');
      ul.className = 'ppv__list';
      pack.itens.forEach(function (v) {
        var li = document.createElement('li');
        li.textContent = v;
        ul.appendChild(li);
      });
      card.appendChild(ul);

      var foot = document.createElement('div');
      foot.className = 'ppv__foot';

      var priceN = document.createElement('span');
      priceN.className = 'ppv__price';
      var priceC = document.createElement('span');
      priceC.className = 'ppv__clube';
      var sel = null;

      function updatePrices() {
        var pr = pack.pneumo ? pack.precos[sel.value] : pack.precos.fixo;
        priceN.textContent = fmt(pr[0]);
        priceC.textContent = 'Clube AMO: ' + fmt(pr[1]);
      }

      if (pack.pneumo) {
        var selWrap = document.createElement('label');
        selWrap.className = 'ppv__variant';
        var selTxt = document.createElement('span');
        selTxt.textContent = 'Pneumocócica:';
        sel = document.createElement('select');
        [['p15', 'Pneumo 15V'], ['p20', 'Pneumo 20V']].forEach(function (o) {
          var op = document.createElement('option');
          op.value = o[0];
          op.textContent = o[1];
          sel.appendChild(op);
        });
        sel.addEventListener('change', updatePrices);
        selWrap.appendChild(selTxt);
        selWrap.appendChild(sel);
        foot.appendChild(selWrap);
      }

      var prices = document.createElement('div');
      prices.className = 'ppv__prices';
      prices.appendChild(priceN);
      prices.appendChild(priceC);
      foot.appendChild(prices);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--primary';
      btn.textContent = 'Adicionar pacote';
      btn.setAttribute('aria-label', 'Adicionar pacote ' + pack.nome + ' à reserva');
      btn.addEventListener('click', function () {
        var id = pack.pneumo ? pack.id + '::' + sel.value : pack.id;
        addToCart(id, btn);
      });
      foot.appendChild(btn);

      updatePrices();
      card.appendChild(foot);
      ppvBox.appendChild(card);
    });
  }

  /* ---------- Clube AMO ---------- */
  var clubeBtn = $('#clubeAdd');
  if (clubeBtn) {
    clubeBtn.addEventListener('click', function () { addToCart(CLUBE.id, clubeBtn); });
  }

  /* ---------- Drawer / carrinho ---------- */
  var drawer = $('#cartDrawer');
  var overlay = $('#cartOverlay');
  var fab = $('#cartFab');
  var fabCount = $('#cartCount');
  var itemsBox = $('#cartItems');
  var emptyBox = $('#cartEmpty');
  var formBox = $('#cartFormWrap');
  var totalsBox = $('#cartTotals');

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

  /* ---------- Totais + cupom ---------- */
  function computeTotals() {
    var tn = 0, tc = 0, pend = 0;
    cart.forEach(function (i) {
      var r = resolve(i.id);
      if (!r) return;
      if (r.pn == null) { pend += i.qty; return; }
      tn += r.pn * i.qty;
      tc += r.pc * i.qty;
    });
    var desc = 0;
    if (cupom) {
      desc = cupom.tipo === 'percentual' ? tn * (cupom.valor / 100) : Math.min(cupom.valor, tn);
    }
    return { tn: tn, tc: tc, desc: desc, pend: pend };
  }

  function renderTotals() {
    if (!totalsBox) return;
    totalsBox.textContent = '';
    var t = computeTotals();
    if (t.tn === 0 && t.pend === 0) { totalsBox.hidden = true; return; }
    totalsBox.hidden = false;

    function row(label, value, cls) {
      var r = document.createElement('div');
      r.className = 'ctotal__row' + (cls ? ' ' + cls : '');
      var l = document.createElement('span');
      l.textContent = label;
      var v = document.createElement('strong');
      v.textContent = value;
      r.appendChild(l);
      r.appendChild(v);
      totalsBox.appendChild(r);
    }

    if (t.tn > 0) {
      row('Subtotal', fmt(t.tn));
      if (t.desc > 0 && cupom) row('Cupom ' + cupom.codigo, '− ' + fmt(t.desc), 'ctotal__desc');
      row('Total estimado', fmt(Math.max(t.tn - t.desc, 0)), 'ctotal__main');
      row('Com Clube AMO', fmt(Math.max(t.tc - t.desc, 0)), 'ctotal__clube');
    }
    if (t.pend > 0) {
      var note = document.createElement('p');
      note.className = 'ctotal__pend';
      note.textContent = '+ ' + t.pend + ' item(ns) com valor confirmado no atendimento.';
      totalsBox.appendChild(note);
    }
  }

  var cupomInput = $('#cupomInput');
  var cupomBtn = $('#cupomApply');
  var cupomMsg = $('#cupomMsg');
  if (cupomBtn) {
    cupomBtn.addEventListener('click', function () {
      var code = (cupomInput.value || '').trim().toUpperCase().slice(0, 20);
      if (!code) { cupom = null; cupomMsg.textContent = ''; renderTotals(); return; }
      var c = CUPONS[code];
      if (c) {
        cupom = { codigo: code, tipo: c.tipo, valor: c.valor };
        cupomMsg.textContent = '✓ ' + c.label + ' aplicado.';
        cupomMsg.className = 'cupom__msg cupom__msg--ok';
      } else {
        cupom = null;
        cupomMsg.textContent = 'Cupom inválido ou expirado.';
        cupomMsg.className = 'cupom__msg cupom__msg--err';
      }
      renderTotals();
    });
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
      var r = resolve(i.id);
      if (!r) return;
      var row = document.createElement('div');
      row.className = 'citem';

      var info = document.createElement('div');
      info.className = 'citem__info';
      var nm = document.createElement('strong');
      nm.textContent = r.nome;
      var ds = document.createElement('small');
      ds.textContent = r.pn == null ? 'Valor no atendimento' : fmt(r.pn) + ' · Clube ' + fmt(r.pc);
      info.appendChild(nm);
      info.appendChild(ds);

      var ctr = document.createElement('div');
      ctr.className = 'citem__ctrl';
      var minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−';
      minus.setAttribute('aria-label', 'Diminuir quantidade de ' + r.nome);
      minus.addEventListener('click', function () { setQty(i.id, i.qty - 1); });
      var qty = document.createElement('span');
      qty.textContent = String(i.qty);
      qty.setAttribute('aria-live', 'polite');
      var plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+';
      plus.setAttribute('aria-label', 'Aumentar quantidade de ' + r.nome);
      plus.addEventListener('click', function () { setQty(i.id, Math.min(i.qty + 1, MAX_QTY)); });
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'citem__del'; del.textContent = '✕';
      del.setAttribute('aria-label', 'Remover ' + r.nome);
      del.addEventListener('click', function () { setQty(i.id, 0); });
      ctr.appendChild(minus); ctr.appendChild(qty); ctr.appendChild(plus); ctr.appendChild(del);

      row.appendChild(info);
      row.appendChild(ctr);
      itemsBox.appendChild(row);
    });

    renderTotals();
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
      else if (!unidade) msg = 'Escolha a unidade mais próxima.';
      else if (!consent) msg = 'É preciso aceitar a Política de Privacidade.';
      if (err) { err.textContent = msg; err.hidden = !msg; }
      if (msg) return;

      var t = computeTotals();
      var linhas = [
        'Olá! Quero reservar vacinas pelo site da Amo. 💜',
        '',
        'Nome: ' + nome,
        'WhatsApp: ' + whats,
        'Unidade para atendimento: ' + unidade,
        '',
        'Itens da reserva:',
      ];
      cart.forEach(function (i) {
        var r = resolve(i.id);
        if (!r) return;
        var preco = r.pn == null ? 'valor no atendimento' : fmt(r.pn) + (i.qty > 1 ? ' cada' : '');
        linhas.push('• ' + r.nome + ' (x' + i.qty + ') — ' + preco);
      });
      if (t.tn > 0) {
        linhas.push('');
        if (cupom && t.desc > 0) linhas.push('Cupom ' + cupom.codigo + ': − ' + fmt(t.desc));
        linhas.push('Total estimado: ' + fmt(Math.max(t.tn - t.desc, 0)));
        linhas.push('Com Clube AMO: ' + fmt(Math.max(t.tc - t.desc, 0)));
      }
      linhas.push('');
      linhas.push('Ciente de que valores e disponibilidade são confirmados no atendimento.');

      var ok = $('#cartOk');
      if (ok) ok.hidden = false;
      window.open(
        'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(linhas.join('\n')),
        '_blank',
        'noopener'
      );
    });
  }

  renderCatGrid('#gridAdulto', 'adultos');
  renderCatGrid('#gridGestante', 'gestantes');
  renderCatGrid('#gridSenior', 'idosos');
  renderSearch();
  renderCalendario();
  renderPPV();
  renderCart();
})();
