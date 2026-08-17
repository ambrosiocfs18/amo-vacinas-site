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
  function pino(corA, corB, tracejado) {
    var gid = 'amopin' + (++idGrad);
    return L.divIcon({
      className: 'umark',
      html:
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(mapa);

    var marcadores = [];
    unidades.forEach(function (u) {
      var m = L.marker([u.lat, u.lng], {
        icon: u.breve ? iconeBreve : iconeAberta,
        title: u.bairro + (u.cidade !== u.bairro ? ' - ' + u.cidade : '') + '/' + u.uf,
      }).addTo(mapa);
      m.bindPopup(popup(u));
      marcadores.push(m);
    });

    if (marcadores.length) {
      mapa.fitBounds(L.featureGroup(marcadores).getBounds(), { padding: [34, 34] });
    } else {
      mapa.setView([-15.78, -47.93], 4);
    }

    // o mapa só ganha altura depois do CSS: recalcula para não ficar cinza
    setTimeout(function () { mapa.invalidateSize(); }, 250);
    window.addEventListener('resize', function () { mapa.invalidateSize(); });
  }

  fetch('js/unidades-geo.json')
    .then(function (r) { return r.json(); })
    .then(monta)
    .catch(function () {
      // sem o JSON, some com o mapa em vez de deixar uma caixa cinza vazia
      var bloco = alvo.closest('.units__map') || alvo;
      bloco.style.display = 'none';
    });
})();
