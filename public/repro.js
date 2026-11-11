(function () {
  var caja = document.getElementById('selRepro');
  if (!caja) return;
  var vehiculos = JSON.parse(document.getElementById('datos-vehiculos-repro').textContent);
  var repro = JSON.parse(document.getElementById('datos-repro').textContent);
  var out = document.getElementById('resultadoRepro');
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rango(r, u) { return r[0] === r[1] ? r[0] + ' ' + u : r[0] + '–' + r[1] + ' ' + u; }
  function barra(etq, serie, st1, u) {
    var max = st1[1], ps = Math.round(serie / max * 100), p1 = Math.round((st1[0] + st1[1]) / 2 / max * 100);
    return '<div class="comp"><div class="comp-t">' + etq + '</div>' +
      '<div class="fila"><span>De serie</span><div class="pista"><div class="b serie" style="width:' + ps + '%"></div></div><b>' + serie + ' ' + u + '</b></div>' +
      '<div class="fila"><span>Stage 1</span><div class="pista"><div class="b st1" style="width:' + p1 + '%"></div></div><b>' + rango(st1, u) + '</b></div></div>';
  }
  SelectorCoche(caja, vehiculos, function (x) {
    if (!x) { out.innerHTML = ''; return; }
    var r = repro.find(function (y) { return y.slug === x.repro; });
    var pct = Math.round(((r.cv1[0] + r.cv1[1]) / 2 / r.cv - 1) * 100);
    var dCv = Math.round((r.cv1[0] + r.cv1[1]) / 2 - r.cv), dNm = Math.round((r.nm1[0] + r.nm1[1]) / 2 - r.nm);
    out.innerHTML = '<div class="gana">+' + dCv + ' CV y +' + dNm + ' Nm <small>(alrededor de un ' + pct + ' % más)</small></div>' +
      '<p class="nota">Motor ' + esc(r.nombre) + ' · códigos ' + esc(r.codigos) + '</p>' +
      barra('Potencia', r.cv, r.cv1, 'CV') + barra('Par', r.nm, r.nm1, 'Nm') +
      '<a class="boton" href="/repro/' + r.slug + '/">Ver ficha completa y lo que dice la ley</a>';
  });
})();
