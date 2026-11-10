(function () {
  var motores = JSON.parse(document.getElementById('datos-motores').textContent);
  var form = document.getElementById('calc');
  if (!form) return;
  var sel = form.querySelector('#motor');
  var out = document.getElementById('resultado');

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
    var m = motores.find(function (x) { return x.slug === sel.value; });
    var kmAct = parseFloat(form.kmActual.value);
    var kmUlt = parseFloat(form.kmUltimo.value || '0');
    var fecha = form.fechaUltimo.value ? new Date(form.fechaUltimo.value) : null;
    var severo = form.severo.checked;
    if (!m || isNaN(kmAct) || !fecha) {
      out.innerHTML = '<p class="aviso">Rellena el motor, los kilómetros actuales y la fecha.</p>';
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
  var hoy = new Date().toISOString().slice(0, 10);
  form.fechaUltimo.max = hoy;
})();
