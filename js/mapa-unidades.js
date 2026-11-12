/* =====================================================================
   AMO VACINAS — mapa das unidades (Leaflet + OpenStreetMap)

   Substitui o iframe de BUSCA do Google Maps, que devolvia resultados
   diferentes para cada visitante (alguns viam 1 pino, outros viam todos).
   Aqui os pinos são fixos: vêm de js/unidades-geo.json, então todo mundo
   vê exatamente as mesmas unidades.

   Sem chave de API e sem CDN — a biblioteca é servida pelo próprio site.
   ===================================================================== */
(function () {
  'use strict';

  var alvo = document.getElementById('mapaUnidades');
  if (!alvo || typeof L === 'undefined') return;

  var WHATS = '5508000500090';

  /* Cores da paleta do site (css/styles.css :root). Unidade aberta repete
     o gradiente da marca --grad-primary (#7C3AED -> #4F46E5, os mesmos dois
     stops dos botões); "em breve" usa --violet-400. */
  var VIOLET_600 = '#7C3AED';
  var INDIGO_GRAD = '#4F46E5';
  var VIOLET_400 = '#A78BFA';

  var idGrad = 0;
  function pino(corA, corB, tracejado, qtd) {
    var gid = 'amopin' + (++idGrad);
    return L.divIcon({
      className: 'umark',
      html:
        (qtd ? '<b class="umark__n">' + qtd + '</b>' : '') +
        '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="' + corA + '"/>' +
        '<stop offset="100%" stop-color="' + corB + '"/>' +
        '</linearGradient></defs>' +
        '<path d="M12 23s9-6 9-13a9 9 0 1 0-18 0c0 7 9 13 9 13z" fill="url(#' + gid + ')"' +
        (tracejado ? ' stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2"' : ' stroke="#fff" stroke-width="1.6"') +
        '/><circle cx="12" cy="10" r="3.4" fill="#fff"/></svg>',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -26],
    });
  }

  var iconeAberta = pino(VIOLET_600, INDIGO_GRAD, false);
  var iconeBreve = pino(VIOLET_400, VIOLET_400, true);

  function escapa(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function popup(u) {
    var local = u.bairro !== u.cidade
      ? u.bairro + ' - ' + u.cidade + '/' + u.uf
      : u.cidade + '/' + u.uf;

    var destino = encodeURIComponent(('Amo Vacinas ' + u.bairro + ' ' + u.cidade + ' ' + u.uf).replace(/\s+/g, ' '));
    var rota = 'https://www.google.com/maps/dir/?api=1&destination=' + destino;

    var msg = u.breve
      ? 'Olá! Quero ser avisado quando a unidade Amo Vacinas de ' + local + ' for inaugurada.'
      : 'Olá! Tenho interesse na unidade Amo Vacinas ' + local + '. Gostaria de mais informações sobre horários e agendamento.';
    var wa = 'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(msg);

    var html = '<div class="upop">';
    html += '<strong class="upop__nome">' + escapa(u.bairro) + '</strong>';
    if (u.bairro !== u.cidade) {
      html += '<span class="upop__cidade">' + escapa(u.cidade) + '/' + escapa(u.uf) + '</span>';
    } else {
      html += '<span class="upop__cidade">' + escapa(u.uf) + '</span>';
    }
    if (u.breve) html += '<span class="upop__breve">Em breve</span>';
    html += '<div class="upop__acoes">';
    // unidade que ainda não abriu não leva rota: o endereço não existe
    if (!u.breve) {
      html += '<a class="upop__btn upop__btn--rota" href="' + rota + '" target="_blank" rel="noopener">Rota</a>';
    }
    html += '<a class="upop__btn upop__btn--wa" href="' + wa + '" target="_blank" rel="noopener">' +
            (u.breve ? 'Avise-me' : 'WhatsApp') + '</a>';
    html += '</div></div>';
    return html;
  }

  function monta(unidades) {
    var mapa = L.map(alvo, {
      scrollWheelZoom: false,   // não sequestra a rolagem da página
      zoomControl: true,
      attributionControl: true,
    });

    /* Tiles do próprio OpenStreetMap, sem chave. O CARTO passou a exigir API key
       e devolvia o aviso "API KEY REQUIRED" no lugar de cada pedaço do mapa. */
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa);

    var marcadores = [];
    unidades.forEach(function (u) {
      var nome = u.bairro + (u.cidade !== u.bairro ? ' - ' + u.cidade : '') + '/' + u.uf;
      var m = L.marker([u.lat, u.lng], {
        icon: u.breve ? iconeBreve : iconeAberta,
        title: nome,
      }).addTo(mapa);
      m.bindPopup(popup(u));
      m._amo = { nome: nome, icone: m.options.icon, grupo: null };
      // pino de grupo: em vez do balão de uma unidade só, aproxima até separar
      m.on('click', function () {
        if (!m._amo.grupo) return;
        m.closePopup();
        mapa.fitBounds(L.featureGroup(m._amo.grupo).getBounds(), { padding: [70, 70], maxZoom: ZOOM_SEPARA });
      });
      marcadores.push(m);
    });

    /* Unidades da mesma cidade caem uma em cima da outra no zoom do Brasil, e
       quem passa o cursor só enxerga a de cima. Pinos a menos de RAIO px viram
       um só, com a quantidade e o nome de todas; refaz a cada zoom. */
    var RAIO = 30, ZOOM_SEPARA = 16, iconesGrupo = {};
    function agrupa() {
      var separa = mapa.getZoom() >= ZOOM_SEPARA;  // perto o bastante: nunca agrupa
      var pts = marcadores.map(function (m) { return mapa.latLngToLayerPoint(m.getLatLng()); });
      var usado = [];
      marcadores.forEach(function (lider, i) {
        if (usado[i]) return;
        var grupo = [lider];
        for (var j = i + 1; j < marcadores.length && !separa; j++) {
          if (!usado[j] && pts[i].distanceTo(pts[j]) < RAIO) { usado[j] = true; grupo.push(marcadores[j]); }
        }
        var varios = grupo.length > 1;
        grupo.forEach(function (m, k) {
          m._amo.grupo = varios ? grupo : null;
          if (k > 0) { mapa.removeLayer(m); return; }   // só o líder fica visível
          m.options.title = !varios ? m._amo.nome
            : grupo.length + ' unidades' +
              // lista os nomes enquanto cabem num balão; acima disso, só a contagem
              (grupo.length <= 6 ? ': ' + grupo.map(function (g) { return g._amo.nome; }).join(' · ') : ' nesta região') +
              ' (clique para aproximar)';
          m.setIcon(varios
            ? (iconesGrupo[grupo.length] = iconesGrupo[grupo.length] || pino(VIOLET_600, INDIGO_GRAD, false, grupo.length))
            : m._amo.icone);
          if (!mapa.hasLayer(m)) m.addTo(mapa);
          // o setIcon reaproveita o elemento e não reescreve o title
          if (m._icon) { m._icon.title = m.options.title; m._icon.setAttribute('aria-label', m.options.title); }
        });
      });
    }

    if (marcadores.length) {
      mapa.fitBounds(L.featureGroup(marcadores).getBounds(), { padding: [34, 34] });
    } else {
      mapa.setView([-15.78, -47.93], 4);
    }
    mapa.on('zoomend', agrupa);
    agrupa();

    // o mapa só ganha altura depois do CSS: recalcula para não ficar cinza
    setTimeout(function () { mapa.invalidateSize(); }, 250);
    window.addEventListener('resize', function () { mapa.invalidateSize(); });
  }

  /* O JSON é servido com max-age de 1 dia (regra de /js no vercel.json). Sem
     cache-busting, tirar ou mover uma unidade continuaria aparecendo no mapa
     por até 24h para quem já visitou. Reaproveitamos o ?v= do próprio script,
     que já sobe a cada publicação, em vez de um número solto para esquecer. */
  var versao = '';
  var meuSrc = (document.currentScript && document.currentScript.src) ||
    (function () {
      var s = document.querySelector('script[src*="mapa-unidades.js"]');
      return s ? s.src : '';
    })();
  var casa = /[?&]v=([0-9]+)/.exec(meuSrc);
  if (casa) versao = '?v=' + casa[1];

  fetch('js/unidades-geo.json' + versao)
    .then(function (r) { return r.json(); })
    .then(monta)
    .catch(function () {
      // sem o JSON, some com o mapa em vez de deixar uma caixa cinza vazia
      var bloco = alvo.closest('.units__map') || alvo;
      bloco.style.display = 'none';
    });
})();
