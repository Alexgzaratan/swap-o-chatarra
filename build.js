// Genera la web estática en dist/ a partir de data/*.json. Sin dependencias.
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const dist = path.join(raiz, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, 'data/config.json'), 'utf8'));
const motores = JSON.parse(fs.readFileSync(path.join(raiz, 'data/motores.json'), 'utf8'));
const repro = JSON.parse(fs.readFileSync(path.join(raiz, 'data/repro.json'), 'utf8'));
const vehiculos = JSON.parse(fs.readFileSync(path.join(raiz, 'data/vehiculos.json'), 'utf8'));
// Comprobar que cada vehículo apunta a un motor que existe
for (const v of vehiculos) for (const mo of v.modelos) for (const g of mo.generaciones) for (const x of g.motores) {
  if (!motores.some((m) => m.slug === x.motor)) throw new Error(`Motor desconocido en vehiculos.json: ${x.motor} (${v.marca} ${g.nombre})`);
}
const rango = ([a, b], u) => (a === b ? `${a} ${u}` : `${a}–${b} ${u}`);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const km = (n) => n.toLocaleString('es-ES') + ' km';
const enlaceKit = cfg.afiliado.enlace_kit_distribucion || '';

function pagina({ titulo, descripcion, ruta, cuerpo, conCalc }) {
  const url = cfg.url_base + ruta;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${url}">
<link rel="stylesheet" href="/estilos.css">
</head>
<body>
<header><a class="logo" href="/">Swap <span>o</span> Chatarra</a><nav><a href="/">Distribución</a><a href="/repro/">Repro</a></nav></header>
<main>
${cuerpo}
</main>
<footer>
<p class="divulgacion">Algunos enlaces de esta web son de afiliado: si compras a través de ellos, la tienda nos paga una comisión sin que a ti te cueste más.</p>
<p>Los intervalos y las potencias son de referencia y pueden variar según año, versión y uso. Confirma siempre con el libro de mantenimiento de tu coche o con tu taller. · <a href="/aviso-legal/">Aviso legal</a></p>
</footer>
${conCalc ? `<script id="datos-motores" type="application/json">${JSON.stringify(motores.map(({ slug, nombre, codigos, km, anos, km_severo }) => ({ slug, nombre, codigos, km, anos, km_severo })))}</script>
<script id="datos-vehiculos" type="application/json">${JSON.stringify(vehiculos)}</script>
<script>window.ENLACE_KIT=${JSON.stringify(enlaceKit)};</script>
<script src="/calc.js" defer></script>` : ''}
</body>
</html>
`;
}

function calculadora(fijo) {
  // fijo: slug del motor en las páginas de motor. Sin él, se elige por marca, modelo, generación y motor.
  const eleccion = fijo
    ? `<input type="hidden" id="motor" name="motor" value="${fijo}">`
    : `<div class="pasos">
<div><label for="marca">1. Marca</label><select id="marca"><option value="">Elige marca</option></select></div>
<div><label for="modelo">2. Modelo</label><select id="modelo" disabled><option value="">Elige modelo</option></select></div>
<div><label for="generacion">3. Año / generación</label><select id="generacion" disabled><option value="">Elige año</option></select></div>
<div><label for="version">4. Motor</label><select id="version" disabled><option value="">Elige motor</option></select></div>
</div>
<p class="ayuda">¿No sabes tu motor? Mira la potencia en la ficha técnica (viene en kW: multiplica por 1,36 para pasar a CV) o en el libro de mantenimiento.</p>
<input type="hidden" id="motor" name="motor" value="">
<div id="motorElegido" class="elegido" hidden></div>
<p class="ayuda"><a href="#motores">¿No sale tu coche? Elige directamente el motor de la lista.</a></p>`;
  return `<form id="calc" class="tarjeta">
${eleccion}
<div id="datosUso"${fijo ? '' : ' hidden'}>
<label for="kmActual">Kilómetros actuales</label>
<input id="kmActual" name="kmActual" type="number" min="0" step="1000" inputmode="numeric" required placeholder="Ej. 185000">
<label for="kmUltimo">Kilómetros en el último cambio de distribución</label>
<input id="kmUltimo" name="kmUltimo" type="number" min="0" step="1000" inputmode="numeric" placeholder="0 si nunca se ha cambiado">
<label for="fechaUltimo">Fecha del último cambio</label>
<input id="fechaUltimo" name="fechaUltimo" type="date" required>
<p class="ayuda">Si nunca se ha cambiado, pon la fecha de matriculación.</p>
<label class="check"><input id="severo" name="severo" type="checkbox"> Uso severo: mucha ciudad, trayectos cortos, remolque o calor extremo</label>
<button type="submit">Calcular</button>
</div>
<div id="resultado" aria-live="polite"></div>
</form>`;
}

function escribir(ruta, html) {
  const destino = path.join(dist, ruta, 'index.html');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const f of fs.readdirSync(path.join(raiz, 'public'))) {
  fs.copyFileSync(path.join(raiz, 'public', f), path.join(dist, f));
}

// Portada
const lista = motores
  .map((m) => `<li><a href="/distribucion/${m.slug}/"><b>${esc(m.nombre)}</b><br><small>${esc(m.marca)} · ${esc(m.anios)} · ${km(m.km)}${m.anos ? ' o ' + m.anos + ' años' : ''}</small></a></li>`)
  .join('');
escribir('', pagina({
  titulo: '¿Cuándo toca cambiar la distribución? Calculadora por motor | Swap o Chatarra',
  descripcion: 'Calcula cuántos kilómetros y meses le quedan a la correa de distribución de tu coche según el intervalo de tu motor.',
  ruta: '/',
  conCalc: true,
  cuerpo: `<h1>¿Cuándo te toca cambiar la distribución?</h1>
<p class="intro">Elige tu coche, pon tus kilómetros y la fecha del último cambio. Te decimos cuánto te queda antes de jugártela.</p>
${calculadora()}
<p><a class="boton" href="/repro/">¿Cuánto gana tu motor con una repro?</a></p>
<h2 id="motores">Motores disponibles</h2>
<ul class="lista-motores">${lista}</ul>`,
}));

// Una página por motor
for (const m of motores) {
  const severo = m.km_severo ? `<tr><th>Uso severo</th><td>${km(m.km_severo)}</td></tr>` : '';
  const fuentes = m.fuentes.map((f) => `<li><a href="${esc(f.url)}" rel="nofollow noopener" target="_blank">${esc(f.titulo)}</a></li>`).join('');
  const intervalo = `${km(m.km)}${m.anos ? ' o ' + m.anos + ' años' : ''}`;
  escribir(`distribucion/${m.slug}`, pagina({
    titulo: `Distribución ${m.nombre}: cada cuánto se cambia (${intervalo}) | Swap o Chatarra`,
    descripcion: `Intervalo de cambio de la correa de distribución del ${m.nombre} (${m.marca}): ${intervalo}. Calcula cuánto le queda a la tuya.`,
    ruta: `/distribucion/${m.slug}/`,
    conCalc: true,
    cuerpo: `<p><a href="/">← Todas las calculadoras</a></p>
<h1>Distribución del ${esc(m.nombre)}: ¿cuándo se cambia?</h1>
<p class="intro">Intervalo de referencia: <b>${intervalo}</b>, lo que llegue antes.</p>
${calculadora(m.slug)}
<h2>Datos del motor</h2>
<table>
<tr><th>Marcas</th><td>${esc(m.marca)}</td></tr>
<tr><th>Códigos de motor</th><td>${esc(m.codigos)}</td></tr>
<tr><th>Años aproximados</th><td>${esc(m.anios)}</td></tr>
<tr><th>Coches que lo montan</th><td>${esc(m.coches)}</td></tr>
<tr><th>Tipo de distribución</th><td>${esc(m.tipo)}</td></tr>
<tr><th>Intervalo</th><td>${intervalo}</td></tr>
${severo}
</table>
<h2>Lo que tienes que saber</h2>
<p>${esc(m.nota)}</p>
${(() => { const r = repro.filter((x) => x.distribucion === m.slug); return r.length ? `<h2>¿Y si lo reprogramas?</h2><ul>${r.map((x) => `<li><a href="/repro/${x.slug}/">${esc(x.nombre)}: de ${x.cv} a ${rango(x.cv1, 'CV')}</a></li>`).join('')}</ul>` : ''; })()}
<h2>Fuentes</h2>
<ul>${fuentes}</ul>`,
  }));
}

// Repro: índice y una página por versión
const avisoLegal = `<div class="tarjeta"><h2 style="margin-top:0">Antes de reprogramar: lo legal</h2>
<p>En España, subir la potencia de un coche es una <b>reforma de importancia</b>: hay que homologarla con un informe técnico, pasar una ITV extraordinaria y actualizar la ficha técnica. Avisa también a tu seguro: si no consta, puede negarse a cubrir un siniestro.</p>
<p>Una repro que anule el filtro de partículas, la EGR o el AdBlue no se puede legalizar.</p>
<p class="nota">Cifras orientativas en CV y Nm según preparadores; cada coche da lo suyo en banco. La ganancia real depende del estado del motor, el combustible y la centralita.</p></div>`;
const filas = repro
  .map((x) => `<tr><td><a href="/repro/${x.slug}/">${esc(x.nombre)}</a><br><small>${esc(x.marca)}</small></td><td>${x.cv} CV / ${x.nm} Nm</td><td><b>${rango(x.cv1, 'CV')}</b><br>${rango(x.nm1, 'Nm')}</td></tr>`)
  .join('');
escribir('repro', pagina({
  titulo: 'Repro Stage 1: cuántos CV y Nm gana cada motor | Swap o Chatarra',
  descripcion: 'Potencia y par de serie y tras una reprogramación Stage 1 de los motores más comunes en España, con fuentes y lo que dice la ley.',
  ruta: '/repro/',
  conCalc: false,
  cuerpo: `<h1>¿Cuánto gana tu motor con una repro?</h1>
<p class="intro">Potencia y par de serie frente a una Stage 1 (solo software, sin cambiar piezas), según varios preparadores.</p>
<table><tr><th>Motor</th><th>De serie</th><th>Stage 1</th></tr>${filas}</table>
${avisoLegal}`,
}));
for (const x of repro) {
  const pct = Math.round(((x.cv1[0] + x.cv1[1]) / 2 / x.cv - 1) * 100);
  const fuentes = x.fuentes.map((f) => `<li><a href="${esc(f.url)}" rel="nofollow noopener" target="_blank">${esc(f.titulo)}</a></li>`).join('');
  escribir(`repro/${x.slug}`, pagina({
    titulo: `Repro ${x.nombre}: ${rango(x.cv1, 'CV')} y ${rango(x.nm1, 'Nm')} en Stage 1 | Swap o Chatarra`,
    descripcion: `Cuánto gana el ${x.nombre} (${x.marca}) con una reprogramación Stage 1: de ${x.cv} CV y ${x.nm} Nm a ${rango(x.cv1, 'CV')} y ${rango(x.nm1, 'Nm')}.`,
    ruta: `/repro/${x.slug}/`,
    conCalc: false,
    cuerpo: `<p><a href="/repro/">← Todos los motores</a></p>
<h1>Repro del ${esc(x.nombre)}: ¿cuánto gana?</h1>
<p class="intro">Con una Stage 1 pasa de <b>${x.cv} CV</b> a <b>${rango(x.cv1, 'CV')}</b>, alrededor de un ${pct} % más.</p>
<table>
<tr><th></th><th>De serie</th><th>Stage 1</th></tr>
<tr><th>Potencia</th><td>${x.cv} CV</td><td><b>${rango(x.cv1, 'CV')}</b></td></tr>
<tr><th>Par</th><td>${x.nm} Nm</td><td><b>${rango(x.nm1, 'Nm')}</b></td></tr>
</table>
<h2>Datos del motor</h2>
<table>
<tr><th>Marcas</th><td>${esc(x.marca)}</td></tr>
<tr><th>Combustible</th><td>${esc(x.tipo)}</td></tr>
<tr><th>Códigos de motor</th><td>${esc(x.codigos)}</td></tr>
<tr><th>Años aproximados</th><td>${esc(x.anios)}</td></tr>
<tr><th>Coches que lo montan</th><td>${esc(x.coches)}</td></tr>
</table>
<h2>Lo que tienes que saber</h2>
<p>${esc(x.nota)}</p>
${x.distribucion ? `<p>Antes de meterle más potencia, comprueba la distribución: <a href="/distribucion/${x.distribucion}/">¿cuándo toca cambiarla en este motor?</a></p>` : ''}
${avisoLegal}
<h2>Fuentes</h2>
<ul>${fuentes}</ul>`,
  }));
}

// Aviso legal
escribir('aviso-legal', pagina({
  titulo: 'Aviso legal | Swap o Chatarra',
  descripcion: 'Aviso legal y política de afiliación de Swap o Chatarra.',
  ruta: '/aviso-legal/',
  conCalc: false,
  cuerpo: `<h1>Aviso legal</h1>
<h2>Titular</h2>
<p>Titular de la web: Álex Gutiérrez Gutiérrez<br>NIF: 44918767C${cfg.contacto ? `<br>Contacto: <a href="mailto:${esc(cfg.contacto)}">${esc(cfg.contacto)}</a>` : ''}</p>
<h2>Enlaces de afiliado</h2>
<p>Esta web participa en programas de afiliación de tiendas de recambios. Cuando compras a través de un enlace marcado, la tienda nos paga una comisión. El precio para ti es el mismo.</p>
<h2>Información técnica</h2>
<p>Los intervalos de mantenimiento se recopilan de fuentes públicas que se citan en cada página. Son orientativos: el dato válido es el del libro de mantenimiento de tu vehículo.</p>`,
}));

// sitemap y robots
const urls = ['/', ...motores.map((m) => `/distribucion/${m.slug}/`), '/repro/', ...repro.map((x) => `/repro/${x.slug}/`)];
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${cfg.url_base}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cfg.url_base}/sitemap.xml\n`);

console.log(`Web generada: ${urls.length} páginas en dist/`);
