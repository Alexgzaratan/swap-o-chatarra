(function () {
  var form = document.getElementById('calc');
  if (!form) return;
  var motores = JSON.parse(document.getElementById('datos-motores').textContent);
  var datosV = document.getElementById('datos-vehiculos');
  var vehiculos = datosV ? JSON.parse(datosV.textContent) : [];
  var campoMotor = form.querySelector('#motor');
  var out = document.getElementById('resultado');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function motorPorSlug(slug) { return motores.find(function (x) { return x.slug === slug; }); }

  // --- Selector marca > modelo > generación > motor ---
  var selMarca = form.querySelector('#marca');
  if (selMarca) {
    var selModelo = form.querySelector('#modelo');
    var selGen = form.querySelector('#generacion');
    var selVer = form.querySelector('#version');
    var bloqueUso = document.getElementById('datosUso');
    var aviso = document.getElementById('motorElegido');

    function rellenar(sel, textoVacio, items, etiqueta) {
      sel.innerHTML = '<option value="">' + textoVacio + '</option>' + items.map(function (it, i) {
        return '<option value="' + i + '">' + esc(etiqueta(it)) + '</option>';
      }).join('');
      sel.disabled = !items.length;
      // Si solo hay una opción, se elige sola
      if (items.length === 1) { sel.value = '0'; }
    }
    function vaciar(sel, texto) { sel.innerHTML = '<option value="">' + texto + '</option>'; sel.disabled = true; }

    function marca() { return vehiculos[selMarca.value]; }
    function modelo() { var m = marca(); return m && m.modelos[selModelo.value]; }
    function gen() { var mo = modelo(); return mo && mo.generaciones[selGen.value]; }
    function version() { var g = gen(); return g && g.motores[selVer.value]; }

    function mostrarMotor() {
      var v = version();
      out.innerHTML = '';
      if (!v) { campoMotor.value = ''; aviso.hidden = true; bloqueUso.hidden = true; return; }
      var m = motorPorSlug(v.motor);
      campoMotor.value = m.slug;
      aviso.innerHTML = 'Tu coche lleva el motor <b>' + esc(m.nombre) + '</b><br><small>Códigos de motor: ' + esc(m.codigos) + ' · <a href="/distribucion/' + m.slug + '/">Ver ficha del motor</a></small>';
      aviso.hidden = false;
      bloqueUso.hidden = false;
    }
    function alCambiarGen() {
      var g = gen();
      if (g) rellenar(selVer, 'Elige motor', g.motores, function (x) { return x.nombre; });
      else vaciar(selVer, 'Elige motor');
      mostrarMotor();
    }
    function alCambiarModelo() {
      var mo = modelo();
      if (mo) rellenar(selGen, 'Elige año', mo.generaciones, function (g) { return g.nombre + ' (' + g.anios + ')'; });
      else vaciar(selGen, 'Elige año');
      alCambiarGen();
    }
    function alCambiarMarca() {
      var m = marca();
      if (m) rellenar(selModelo, 'Elige modelo', m.modelos, function (mo) { return mo.modelo; });
      else vaciar(selModelo, 'Elige modelo');
      alCambiarModelo();
    }

    rellenar(selMarca, 'Elige marca', vehiculos, function (v) { return v.marca; });
    selMarca.value = '';
    selModelo.disabled = selGen.disabled = selVer.disabled = true;
    selMarca.addEventListener('change', alCambiarMarca);
    selModelo.addEventListener('change', alCambiarModelo);
    selGen.addEventListener('change', alCambiarGen);
    selVer.addEventListener('change', mostrarMotor);
  }

  // --- Cálculo ---
  function fmtKm(n) { return Math.round(n).toLocaleString('es-ES') + ' km'; }
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

  function calcular(e) {
    if (e) e.preventDefault();
    var m = motorPorSlug(campoMotor.value);
    var kmAct = parseFloat(form.querySelector('#kmActual').value);
    var kmUlt = parseFloat(form.querySelector('#kmUltimo').value || '0');
    var fecha = form.querySelector('#fechaUltimo').value ? new Date(form.querySelector('#fechaUltimo').value) : null;
    var severo = form.querySelector('#severo').checked;
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
    var pctKm = kmRest / intKm;
    var pctT = mesesRest === null ? 1 : mesesRest / (m.anos * 12);
    var pct = Math.min(pctKm, pctT);
    var estado, clase;
    if (kmRest <= 0 || (mesesRest !== null && mesesRest <= 0)) { estado = 'Te toca cambiarla ya'; clase = 'mal'; }
    else if (pct < 0.15) { estado = 'Te toca pronto'; clase = 'pronto'; }
    else { estado = 'Vas bien'; clase = 'bien'; }

    var h = '<div class="estado ' + clase + '">' + estado + '</div><ul class="cifras">';
    h += '<li><b>Por kilómetros:</b> ' + (kmRest > 0 ? 'te quedan ' + fmtKm(kmRest) : 'te has pasado ' + fmtKm(-kmRest)) + ' (intervalo ' + fmtKm(intKm) + (severo ? ', uso severo' : '') + ')</li>';
    if (mesesRest !== null) {
      h += '<li><b>Por tiempo:</b> ' + (mesesRest > 0 ? 'te quedan ' + fmtMeses(mesesRest) : 'te has pasado ' + fmtMeses(-mesesRest)) + ' (máximo ' + m.anos + ' años)</li>';
    } else {
      h += '<li><b>Por tiempo:</b> no hay un límite de años contrastado para este motor. Si la correa tiene más de 5 años, que te la revisen.</li>';
    }
    h += '</ul><p class="nota">Lo que llegue antes, kilómetros o tiempo, manda. Cifras de referencia: confirma siempre con el libro de mantenimiento de tu coche.</p>';
    if (window.ENLACE_KIT) {
      h += '<a class="boton" rel="sponsored nofollow noopener" target="_blank" href="' + window.ENLACE_KIT + '">Ver kits de distribución para tu motor</a>';
    }
    out.innerHTML = h;
  }

  form.addEventListener('submit', calcular);
  form.querySelector('#fechaUltimo').max = new Date().toISOString().slice(0, 10);
})();
