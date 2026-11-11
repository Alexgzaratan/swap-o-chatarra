(function () {
  var caja = document.getElementById('selRepro');
  if (!caja) return;
  var vehiculos = JSON.parse(document.getElementById('datos-vehiculos-repro').textContent);
  var repro = JSON.parse(document.getElementById('datos-repro').textContent);
  var selMarca = caja.querySelector('#marca'), selModelo = caja.querySelector('#modelo');
  var selGen = caja.querySelector('#generacion'), selVer = caja.querySelector('#version');
  var out = document.getElementById('resultadoRepro');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rango(r, u) { return r[0] === r[1] ? r[0] + ' ' + u : r[0] + '–' + r[1] + ' ' + u; }
  function rellenar(sel, vacio, items, etiqueta) {
    sel.innerHTML = '<option value="">' + vacio + '</option>' + items.map(function (it, i) { return '<option value="' + i + '">' + esc(etiqueta(it)) + '</option>'; }).join('');
    sel.disabled = !items.length;
    if (items.length === 1) sel.value = '0';
  }
  function vaciar(sel, vacio) { sel.innerHTML = '<option value="">' + vacio + '</option>'; sel.disabled = true; }
  function marca() { return vehiculos[selMarca.value]; }
  function modelo() { var m = marca(); return m && m.modelos[selModelo.value]; }
  function gen() { var mo = modelo(); return mo && mo.generaciones[selGen.value]; }
  function version() { var g = gen(); return g && g.motores[selVer.value]; }

  function mostrar() {
    var v = version();
    if (!v) { out.innerHTML = ''; return; }
    var r = repro.find(function (x) { return x.slug === v.repro; });
    var pct = Math.round(((r.cv1[0] + r.cv1[1]) / 2 / r.cv - 1) * 100);
    out.innerHTML = '<div class="elegido">Tu coche lleva el <b>' + esc(r.nombre) + '</b><br><small>Códigos de motor: ' + esc(r.codigos) + '</small></div>' +
      '<table class="tabla-repro"><tr><th></th><th>De serie</th><th>Stage 1</th></tr>' +
      '<tr><th>Potencia</th><td>' + r.cv + ' CV</td><td><b>' + rango(r.cv1, 'CV') + '</b></td></tr>' +
      '<tr><th>Par</th><td>' + r.nm + ' Nm</td><td><b>' + rango(r.nm1, 'Nm') + '</b></td></tr></table>' +
      '<p>Alrededor de un <b>' + pct + ' % más</b> de potencia.</p>' +
      '<a class="boton" href="/repro/' + r.slug + '/">Ver ficha completa y lo que tienes que saber</a>';
  }
  function cGen() { var g = gen(); if (g) rellenar(selVer, 'Elige motor', g.motores, function (x) { return x.nombre; }); else vaciar(selVer, 'Elige motor'); mostrar(); }
  function cModelo() { var mo = modelo(); if (mo) rellenar(selGen, 'Elige año', mo.generaciones, function (g) { return g.nombre + ' (' + g.anios + ')'; }); else vaciar(selGen, 'Elige año'); cGen(); }
  function cMarca() { var m = marca(); if (m) rellenar(selModelo, 'Elige modelo', m.modelos, function (mo) { return mo.modelo; }); else vaciar(selModelo, 'Elige modelo'); cModelo(); }

  rellenar(selMarca, 'Elige marca', vehiculos, function (v) { return v.marca; });
  selMarca.value = '';
  selMarca.addEventListener('change', cMarca);
  selModelo.addEventListener('change', cModelo);
  selGen.addEventListener('change', cGen);
  selVer.addEventListener('change', mostrar);
})();
