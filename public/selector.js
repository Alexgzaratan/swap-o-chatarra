// Selector de coche: buscador + fichas paso a paso (marca > modelo > año > motor).
// Uso: SelectorCoche(contenedor, vehiculos, function (motorElegido|null) {})
window.SelectorCoche = function (caja, vehiculos, alElegir) {
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, ' '); }

  var indice = [];
  vehiculos.forEach(function (v, iv) {
    v.modelos.forEach(function (mo, im) {
      mo.generaciones.forEach(function (g, ig) {
        g.motores.forEach(function (x, ix) {
          indice.push({ ruta: [iv, im, ig, ix], texto: norm(v.marca + ' ' + mo.modelo + ' ' + g.nombre + ' ' + g.anios + ' ' + x.nombre) });
        });
      });
    });
  });

  caja.innerHTML =
    '<div class="sel-busca">' +
    '<label for="buscaCoche" class="titulo-sel">Busca tu coche</label>' +
    '<input id="buscaCoche" type="search" autocomplete="off" placeholder="Ej.: golf 1.9, leon 2010, clio dci">' +
    '<div class="sel-resultados" hidden></div>' +
    '<div class="sel-o">o elígelo paso a paso</div>' +
    '</div>' +
    '<div class="sel-migas"></div>' +
    '<div class="sel-paso"></div>' +
    '<div class="sel-fichas"></div>' +
    '<div class="sel-elegido" hidden></div>';
  var zonaBusca = caja.querySelector('.sel-busca');
  var busca = caja.querySelector('#buscaCoche');
  var resBusca = caja.querySelector('.sel-resultados');
  var migas = caja.querySelector('.sel-migas');
  var paso = caja.querySelector('.sel-paso');
  var fichas = caja.querySelector('.sel-fichas');
  var elegido = caja.querySelector('.sel-elegido');
  var ruta = [];

  function nodos(r) {
    var v = vehiculos[r[0]], mo = v && r.length > 1 ? v.modelos[r[1]] : null;
    var g = mo && r.length > 2 ? mo.generaciones[r[2]] : null;
    var x = g && r.length > 3 ? g.motores[r[3]] : null;
    return { v: v, mo: mo, g: g, x: x };
  }
  function nombreRuta(r) {
    var n = nodos(r);
    return n.v.marca + ' ' + n.g.nombre + ' ' + n.x.nombre + ' (' + n.g.anios + ')';
  }

  function pintar() {
    var n = nodos(ruta);
    // Si un paso solo tiene una opción, se salta solo
    if (ruta.length === 1 && n.v.modelos.length === 1) { ruta.push(0); return pintar(); }
    if (ruta.length === 2 && n.mo.generaciones.length === 1) { ruta.push(0); return pintar(); }
    if (ruta.length === 3 && n.g.motores.length === 1) { ruta.push(0); return pintar(); }

    if (ruta.length === 4) {
      fichas.innerHTML = ''; paso.textContent = ''; migas.innerHTML = '';
      zonaBusca.hidden = true;
      elegido.innerHTML = '<div class="matricula"><span class="banda" aria-hidden="true">E</span><div><b>' + esc(n.v.marca + ' ' + n.g.nombre + ' ' + n.x.nombre) + '</b><small>' + esc(n.g.anios) + '</small></div></div>' +
        '<button type="button" class="cambiar">Cambiar de coche</button>';
      elegido.hidden = false;
      elegido.querySelector('.cambiar').onclick = function () { reiniciar(); busca.focus(); };
      alElegir(n.x);
      return;
    }

    elegido.hidden = true; zonaBusca.hidden = false;
    alElegir(null);

    var m = ['<button type="button" data-n="0">Marcas</button>'];
    if (ruta.length > 0) m.push('<button type="button" data-n="1">' + esc(n.v.marca) + '</button>');
    if (ruta.length > 1) m.push('<button type="button" data-n="2">' + esc(n.mo.modelo) + '</button>');
    if (ruta.length > 2) m.push('<button type="button" data-n="3">' + esc(n.g.nombre) + '</button>');
    migas.innerHTML = ruta.length ? m.join('<span>›</span>') : '';
    Array.prototype.forEach.call(migas.querySelectorAll('button'), function (b) {
      b.onclick = function () { ruta = ruta.slice(0, +b.dataset.n); pintar(); };
    });

    var items, titulo, etiqueta;
    if (ruta.length === 0) { titulo = 'Elige la marca'; items = vehiculos; etiqueta = function (v) { return '<b>' + esc(v.marca) + '</b>'; }; }
    else if (ruta.length === 1) { titulo = '¿Qué ' + n.v.marca + ' es?'; items = n.v.modelos; etiqueta = function (mo) { return '<b>' + esc(mo.modelo) + '</b>'; }; }
    else if (ruta.length === 2) { titulo = '¿De qué año es?'; items = n.mo.generaciones; etiqueta = function (g) { return '<b>' + esc(g.anios) + '</b><small>' + esc(g.nombre) + '</small>'; }; }
    else { titulo = '¿Qué motor lleva?'; items = n.g.motores; etiqueta = function (x) { return '<b>' + esc(x.nombre) + '</b>'; }; }
    paso.textContent = titulo;
    fichas.innerHTML = items.map(function (it, i) { return '<button type="button" class="ficha" style="--i:' + i + '" data-i="' + i + '">' + etiqueta(it) + '</button>'; }).join('');
    Array.prototype.forEach.call(fichas.querySelectorAll('.ficha'), function (b) {
      b.onclick = function () { ruta.push(+b.dataset.i); pintar(); };
    });
    if (ruta.length === 3) {
      fichas.insertAdjacentHTML('beforeend', '<p class="ayuda">¿No sabes cuál es? Mira la potencia en la ficha técnica: viene en kW, multiplica por 1,36 para pasar a CV.</p>');
    }
  }

  function reiniciar() { ruta = []; busca.value = ''; resBusca.hidden = true; pintar(); }

  busca.addEventListener('input', function () {
    var q = norm(busca.value).trim();
    if (q.length < 2) { resBusca.hidden = true; return; }
    var palabras = q.split(' ');
    var hits = indice.filter(function (f) { return palabras.every(function (p) { return f.texto.indexOf(p) !== -1; }); }).slice(0, 8);
    resBusca.innerHTML = hits.length
      ? hits.map(function (f, i) { return '<button type="button" data-i="' + i + '">' + esc(nombreRuta(f.ruta)) + '</button>'; }).join('')
      : '<p class="ayuda">No lo encontramos. Prueba solo con la marca o el modelo, o elígelo paso a paso.</p>';
    resBusca.hidden = false;
    Array.prototype.forEach.call(resBusca.querySelectorAll('button'), function (b) {
      b.onclick = function () { ruta = hits[+b.dataset.i].ruta.slice(); resBusca.hidden = true; busca.value = ''; pintar(); };
    });
  });

  pintar();
  return { reiniciar: reiniciar };
};
