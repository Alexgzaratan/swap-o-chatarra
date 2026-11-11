(function () {
  var form = document.getElementById('calc');
  if (!form) return;
  var motores = JSON.parse(document.getElementById('datos-motores').textContent);
  var datosV = document.getElementById('datos-vehiculos');
  var vehiculos = datosV ? JSON.parse(datosV.textContent) : [];
  var campoMotor = form.querySelector('#motor');
  var out = document.getElementById('resultado');
  var $ = function (s) { return form.querySelector(s); };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function motorPorSlug(slug) { return motores.find(function (x) { return x.slug === slug; }); }

  var cajaSel = document.getElementById('selCoche');
  if (cajaSel) {
    var bloqueUso = document.getElementById('datosUso');
    var aviso = document.getElementById('motorElegido');
    SelectorCoche(cajaSel, vehiculos, function (x) {
      out.innerHTML = '';
      if (!x) { campoMotor.value = ''; aviso.hidden = true; bloqueUso.hidden = true; return; }
      var m = motorPorSlug(x.motor);
      campoMotor.value = m.slug;
      aviso.innerHTML = 'Lleva el motor <b>' + esc(m.nombre) + '</b>. Códigos: ' + esc(m.codigos) + '. <a href="' + x.url + '">Ver la página de tu coche</a>';
      aviso.hidden = false;
      bloqueUso.hidden = false;
      $('#kmActual').focus();
    });
  }

  function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmtKm(n) { return miles(n) + ' km'; }
  function fmtMeses(m) {
    m = Math.round(m);
    var a = Math.floor(Math.abs(m) / 12), r = Math.abs(m) % 12, t = [];
    if (a) t.push(a + (a === 1 ? ' año' : ' años'));
    if (r || !a) t.push(r + (r === 1 ? ' mes' : ' meses'));
    return t.join(' y ');
  }
  function meses(desde, hasta) {
    return (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + (hasta.getDate() - desde.getDate()) / 30;
  }
  function rango(r) { return r[0] === r[1] ? miles(r[0]) + ' €' : miles(r[0]) + '–' + miles(r[1]) + ' €'; }

  // Reloj de media luna: 0 = recién cambiada, 1 = toca, 1,2 = pasada
  function reloj() {
    function p(x) { var a = Math.PI * (1 - x / 1.2); return (100 + 80 * Math.cos(a)).toFixed(1) + ' ' + (100 - 80 * Math.sin(a)).toFixed(1); }
    function arco(a, b, c) { return '<path d="M' + p(a) + ' A80 80 0 0 1 ' + p(b) + '" class="' + c + '"/>'; }
    return '<svg class="reloj" viewBox="0 0 200 118" role="img" aria-label="Desgaste de la correa">' +
      arco(0, 0.84, 'z-bien') + arco(0.86, 0.99, 'z-pronto') + arco(1.01, 1.2, 'z-mal') +
      '<g class="aguja" style="--giro:-90deg"><path d="M100 100 97 96 100 30 103 96z"/></g><circle cx="100" cy="100" r="7" class="eje"/></svg>';
  }

  function calcular(e) {
    if (e) e.preventDefault();
    var m = motorPorSlug(campoMotor.value);
    var kmAct = parseFloat($('#kmActual').value);
    var kmUlt = parseFloat($('#kmUltimo').value || '0');
    var fecha = $('#fechaUltimo').value ? new Date($('#fechaUltimo').value) : null;
    var severo = $('#severo').checked;
    if (!m || isNaN(kmAct) || !fecha) {
      out.innerHTML = '<p class="aviso">Elige tu coche y rellena los kilómetros actuales y la fecha.</p>';
      return;
    }
    if (kmUlt > kmAct) {
      out.innerHTML = '<p class="aviso">Los kilómetros del último cambio no pueden ser mayores que los actuales.</p>';
      return;
    }
    var intKm = severo ? (m.km_severo || m.km * 0.8) : m.km;
    var kmRest = kmUlt + intKm - kmAct;
    var mesesRest = m.anos ? m.anos * 12 - meses(fecha, new Date()) : null;
    var usoKm = 1 - kmRest / intKm;
    var usoT = mesesRest === null ? 0 : 1 - mesesRest / (m.anos * 12);
    var uso = Math.max(usoKm, usoT);
    var estado, clase;
    if (uso >= 1) { estado = 'Te toca cambiarla ya'; clase = 'mal'; }
    else if (uso > 0.85) { estado = 'Te toca pronto'; clase = 'pronto'; }
    else { estado = 'Vas bien'; clase = 'bien'; }

    var h = '<div class="veredicto ' + clase + '">' + reloj() + '<div><p class="estado">' + estado + '</p><ul class="cifras">';
    h += '<li><b>Por kilómetros:</b> ' + (kmRest > 0 ? 'te quedan ' + fmtKm(kmRest) : 'te has pasado ' + fmtKm(-kmRest)) + ' <small>(intervalo ' + fmtKm(intKm) + (severo ? ', uso severo' : '') + ')</small></li>';
    if (mesesRest !== null) {
      h += '<li><b>Por tiempo:</b> ' + (mesesRest > 0 ? 'te quedan ' + fmtMeses(mesesRest) : 'te has pasado ' + fmtMeses(-mesesRest)) + ' <small>(máximo ' + m.anos + ' años)</small></li>';
    } else {
      h += '<li><b>Por tiempo:</b> no hay un límite de años contrastado para este motor. Si la correa tiene más de 5 años, que te la revisen.</li>';
    }
    h += '</ul></div></div>';
    h += '<div class="resultado-coste"><h3>Lo que cuesta cambiarla</h3><div class="coste"><div><span>En taller, con mano de obra</span><b>' + rango(m.coste.taller) + '</b></div>' +
      (m.coste.kit ? '<div><span>Solo el kit con bomba de agua</span><b>' + rango(m.coste.kit) + '</b></div>' : '') + '</div>';
    if (window.ENLACE_KIT) {
      h += '<a class="boton" rel="sponsored nofollow noopener" target="_blank" href="' + window.ENLACE_KIT + '">Ver kits de distribución en ' + esc(window.TIENDA) + '</a>';
    }
    h += '<p class="nota">Manda lo que llegue antes, kilómetros o tiempo. Cifras y precios de referencia: confirma con el libro de mantenimiento y pide presupuesto.</p></div>';
    out.innerHTML = h;
    var aguja = out.querySelector('.aguja');
    var giro = (Math.min(Math.max(uso, 0), 1.2) / 1.2) * 180 - 90;
    requestAnimationFrame(function () { requestAnimationFrame(function () { aguja.style.setProperty('--giro', giro.toFixed(1) + 'deg'); }); });
    out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  form.addEventListener('submit', calcular);
  $('#fechaUltimo').max = new Date().toISOString().slice(0, 10);
})();
