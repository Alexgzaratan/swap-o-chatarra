// Genera la web estática en dist/ a partir de data/*.json. Sin dependencias.
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const dist = path.join(raiz, 'dist');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(raiz, 'data', f), 'utf8'));
const cfg = leer('config.json');
const motores = leer('motores.json');
const repro = leer('repro.json');
const vehiculos = leer('vehiculos.json');
const vehiculosRepro = leer('vehiculos-repro.json');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const km = (n) => miles(n) + ' km';
const rango = ([a, b], u) => (a === b ? `${miles(a)} ${u}` : `${miles(a)}–${miles(b)} ${u}`);
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const medio = ([a, b]) => (a + b) / 2;
const enlaceKit = cfg.afiliado.enlace_kit_distribucion || '';
const motorDe = (s) => motores.find((m) => m.slug === s);
const reproDe = (s) => repro.find((r) => r.slug === s);
const intervalo = (m) => `${km(m.km)}${m.anos ? ' o ' + m.anos + ' años' : ''}`;
const costeDe = (m) => m.coste || cfg.coste_distribucion;

// --- Preparar los coches: URL de cada versión y comprobaciones ---
function preparar(datos, clave, base, existe) {
  const lista = [];
  for (const v of datos) {
    v.url = `${base}/${slug(v.marca)}/`;
    for (const mo of v.modelos) {
      mo.url = `${v.url}${slug(mo.modelo)}/`;
      const vistos = new Set();
      for (const g of mo.generaciones) for (const x of g.motores) {
        if (!existe(x[clave])) throw new Error(`${clave} desconocido en ${base}: ${x[clave]} (${v.marca} ${g.nombre})`);
        const s = slug(`${g.nombre} ${x.nombre}`);
        if (vistos.has(s)) throw new Error(`Versión repetida: ${v.marca} ${g.nombre} ${x.nombre}`);
        vistos.add(s);
        x.url = `${mo.url}${s}/`;
        lista.push({ v, mo, g, x, coche: `${v.marca} ${g.nombre} ${x.nombre}` });
      }
    }
  }
  return lista;
}
const cochesDist = preparar(vehiculos, 'motor', '/distribucion', motorDe);
const cochesRepro = preparar(vehiculosRepro, 'repro', '/repro', reproDe);
for (const m of motores) if (vehiculos.some((v) => slug(v.marca) === m.slug)) throw new Error(`El slug ${m.slug} choca con una marca`);
for (const r of repro) if (vehiculosRepro.some((v) => slug(v.marca) === r.slug)) throw new Error(`El slug ${r.slug} choca con una marca`);

// --- Piezas visuales ---
const tuerca = '<svg class="tuerca" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 21.1 6.75v10.5L12 22.5 2.9 17.25V6.75z" fill="currentColor"/><circle cx="12" cy="12" r="4.2" fill="var(--asfalto)"/></svg>';

// Reloj de media luna: 0 = recién cambiada, 1 = toca, 1,2 = pasada
function reloj(f, claseExtra = '') {
  const p = (x) => { const a = Math.PI * (1 - x / 1.2); return `${(100 + 80 * Math.cos(a)).toFixed(1)} ${(100 - 80 * Math.sin(a)).toFixed(1)}`; };
  const arco = (a, b, c) => `<path d="M${p(a)} A80 80 0 0 1 ${p(b)}" class="${c}"/>`;
  const giro = (Math.min(Math.max(f, 0), 1.2) / 1.2) * 180 - 90;
  return `<svg class="reloj ${claseExtra}" viewBox="0 0 200 118" role="img" aria-label="Indicador de desgaste de la correa">
${arco(0, 0.84, 'z-bien')}${arco(0.86, 0.99, 'z-pronto')}${arco(1.01, 1.2, 'z-mal')}
<g class="aguja" style="--giro:${giro.toFixed(1)}deg"><path d="M100 100 97 96 100 30 103 96z"/></g>
<circle cx="100" cy="100" r="7" class="eje"/>
</svg>`;
}

function barras(etq, serie, st1, u) {
  const max = st1[1];
  return `<div class="comp"><div class="comp-t">${etq}</div>
<div class="fila"><span>De serie</span><div class="pista"><div class="b serie" style="width:${Math.round((serie / max) * 100)}%"></div></div><b>${serie} ${u}</b></div>
<div class="fila"><span>Stage 1</span><div class="pista"><div class="b st1" style="width:${Math.round((medio(st1) / max) * 100)}%"></div></div><b>${rango(st1, u)}</b></div></div>`;
}

const matricula = (texto, sub) => `<div class="matricula"><span class="banda" aria-hidden="true">E</span><div><b>${esc(texto)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
const migas = (pasos) => `<nav class="migas" aria-label="Estás en">${pasos.map(([t, u]) => (u ? `<a href="${u}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join('<i aria-hidden="true">/</i>')}</nav>`;
const fuentesHtml = (fs_) => `<ul class="fuentes">${fs_.map((f) => `<li><a href="${esc(f.url)}" rel="nofollow noopener" target="_blank">${esc(f.titulo)}</a></li>`).join('')}</ul>`;

function bloqueCoste(m) {
  const c = costeDe(m);
  return `<h2>¿Cuánto cuesta cambiarla?</h2>
<div class="coste">
<div><span>En taller, con mano de obra</span><b>${rango(c.taller, '€')}</b></div>
${c.kit ? `<div><span>Solo el kit con bomba de agua</span><b>${rango(c.kit, '€')}</b></div>` : ''}
</div>
<p class="nota">${esc(c.nota)}</p>
${enlaceKit ? `<a class="boton" rel="sponsored nofollow noopener" target="_blank" href="${esc(enlaceKit)}">Ver kits de distribución en ${esc(cfg.afiliado.tienda)}</a>` : ''}`;
}

// --- Plantilla ---
const urls = [];
function pagina({ titulo, descripcion, ruta, cuerpo, scripts = '', ancho = '', rastro }) {
  const url = cfg.url_base + ruta;
  urls.push(ruta);
  const ld = rastro ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: rastro.map(([t, u], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: cfg.url_base + (u || ruta) })) })}</script>` : '';
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(cfg.sitio)}">
<meta name="theme-color" content="#16171a">
${cfg.google_site_verification ? `<meta name="google-site-verification" content="${esc(cfg.google_site_verification)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/barlow-condensed-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/estilos.css">
<script type="speculationrules">{"prerender":[{"where":{"href_matches":"/*"},"eagerness":"moderate"}]}</script>
${ld}
</head>
<body>
<header class="cabecera"><a class="logo" href="/">${tuerca}<span>Swap <em>o</em> Chatarra</span></a><nav><a href="/distribucion/">Distribución</a><a href="/repro/">Repro</a></nav></header>
<main class="${ancho}">
${cuerpo}
</main>
<footer class="pie">
<p class="divulgacion">Algunos enlaces de esta web son de afiliado: si compras a través de ellos, la tienda nos paga una comisión sin que a ti te cueste más.</p>
<p>Los intervalos, precios y potencias son de referencia y pueden variar según año, versión y uso. Confirma siempre con el libro de mantenimiento de tu coche o con tu taller.</p>
<p class="pie-enlaces"><a href="/distribucion/">Distribución</a><a href="/repro/">Repro</a><a href="/aviso-legal/">Aviso legal</a>${cfg.youtube ? `<a href="${esc(cfg.youtube)}" rel="noopener" target="_blank">Canal de YouTube</a>` : ''}</p>
</footer>
${scripts}
${cfg.analitica && cfg.analitica.cloudflare_token ? `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(cfg.analitica.cloudflare_token)}"}'></script>` : ''}
</body>
</html>
`;
  const destino = path.join(dist, ruta, 'index.html');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
}

const datosMotores = `<script id="datos-motores" type="application/json">${JSON.stringify(motores.map((m) => ({ slug: m.slug, nombre: m.nombre, codigos: m.codigos, km: m.km, anos: m.anos, km_severo: m.km_severo, coste: { taller: costeDe(m).taller, kit: costeDe(m).kit || null } })))}</script>
<script>window.ENLACE_KIT=${JSON.stringify(enlaceKit)};window.TIENDA=${JSON.stringify(cfg.afiliado.tienda)};</script>`;
const scriptsCalc = (conSelector) => `${datosMotores}
${conSelector ? `<script id="datos-vehiculos" type="application/json">${JSON.stringify(vehiculos)}</script>\n<script src="/selector.js" defer></script>` : ''}
<script src="/calc.js" defer></script>`;

function calculadora(fijo) {
  const eleccion = fijo
    ? `<input type="hidden" id="motor" name="motor" value="${fijo}">`
    : `<div id="selCoche" class="selector-coche"></div>
<input type="hidden" id="motor" name="motor" value="">
<div id="motorElegido" class="elegido" hidden></div>`;
  return `<form id="calc" class="tarjeta">
${eleccion}
<div id="datosUso"${fijo ? '' : ' hidden'}>
<div class="campos">
<div><label for="kmActual">Kilómetros actuales</label>
<input id="kmActual" name="kmActual" type="number" min="0" step="1000" inputmode="numeric" required placeholder="Ej. 185000"></div>
<div><label for="kmUltimo">Kilómetros en el último cambio</label>
<input id="kmUltimo" name="kmUltimo" type="number" min="0" step="1000" inputmode="numeric" placeholder="0 si nunca se ha cambiado"></div>
<div><label for="fechaUltimo">Fecha del último cambio</label>
<input id="fechaUltimo" name="fechaUltimo" type="date" required>
<p class="ayuda">Si nunca se ha cambiado, pon la fecha de matriculación.</p></div>
</div>
<label class="check"><input id="severo" name="severo" type="checkbox"> Uso severo: mucha ciudad, trayectos cortos, remolque o calor extremo</label>
<button type="submit">Calcular</button>
</div>
<div id="resultado" aria-live="polite"></div>
</form>`;
}

const fichaMotor = (m) => `<table class="datos">
<tr><th>Marcas</th><td>${esc(m.marca)}</td></tr>
<tr><th>Códigos de motor</th><td>${esc(m.codigos)}</td></tr>
<tr><th>Años aproximados</th><td>${esc(m.anios)}</td></tr>
<tr><th>Coches que lo montan</th><td>${esc(m.coches)}</td></tr>
<tr><th>Tipo de distribución</th><td>${esc(m.tipo)}</td></tr>
<tr><th>Intervalo</th><td>${intervalo(m)}</td></tr>
${m.km_severo ? `<tr><th>Uso severo</th><td>${km(m.km_severo)}</td></tr>` : ''}
</table>`;

const rejillaMarcas = (datos) => `<ul class="rejilla-marcas">${datos.map((v) => `<li><a href="${v.url}">${esc(v.marca)}<small>${v.modelos.length} ${v.modelos.length === 1 ? 'modelo' : 'modelos'}</small></a></li>`).join('')}</ul>`;

const avisoLegal = `<div class="tarjeta aviso-ley"><h2>Antes de reprogramar: lo legal</h2>
<p>En España, subir la potencia de un coche es una <b>reforma de importancia</b>: hay que homologarla con un informe técnico, pasar una ITV extraordinaria y actualizar la ficha técnica. Avisa también a tu seguro: si no consta, puede negarse a cubrir un siniestro.</p>
<p>Una repro que anule el filtro de partículas, la EGR o el AdBlue no se puede legalizar.</p>
<p class="nota">Cifras orientativas en CV y Nm según preparadores; cada coche da lo suyo en banco. La ganancia real depende del estado del motor, el combustible y la centralita.</p></div>`;

// --- Construcción ---
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const f of fs.readdirSync(path.join(raiz, 'public'))) fs.copyFileSync(path.join(raiz, 'public', f), path.join(dist, f));

// Portada
pagina({
  titulo: 'Swap o Chatarra: calculadoras de distribución y repro por coche',
  descripcion: 'Calcula cuándo toca cambiar la distribución de tu coche, cuánto cuesta y cuánta potencia gana con una repro Stage 1. Por marca, modelo y motor, con fuentes.',
  ruta: '/',
  ancho: 'ancho',
  cuerpo: `<section class="portada">
<div>
<h1>¿Swap o chatarra?</h1>
<p class="entrada">Mira cuánta vida le queda a tu correa de distribución y cuánto gana tu motor con una repro. Eliges tu coche y sale el dato, con sus fuentes.</p>
<p class="acciones"><a class="boton" href="/distribucion/">Calcular mi distribución</a><a class="boton hueco" href="/repro/">Ver cuánto gana mi motor</a></p>
</div>
${reloj(0.93, 'entrada-reloj')}
</section>
<section class="herramientas">
<a class="herramienta" href="/distribucion/">
<h2>Distribución</h2>
<p>Kilómetros y meses que te quedan antes del cambio, y lo que cuesta hacerlo.</p>
<span class="cuenta">${cochesDist.length} versiones de ${vehiculos.length} marcas</span>
</a>
<a class="herramienta" href="/repro/">
<h2>Repro Stage 1</h2>
<p>Potencia y par de serie frente a una reprogramación, según varios preparadores.</p>
<span class="cuenta">${cochesRepro.length} versiones de ${vehiculosRepro.length} marcas</span>
</a>
</section>
${(() => { const d = cochesDist.filter((c) => c.x.motor === cfg.destacado.motor); return d.length ? `<section><h2>${esc(cfg.destacado.titulo)}</h2><ul class="rejilla-marcas destacados">${d.map((c) => `<li><a href="${c.x.url}">${esc(c.v.marca)} ${esc(c.g.nombre)}<small>${esc(c.x.nombre)}, ${esc(c.g.anios)}</small></a></li>`).join('')}</ul></section>` : ''; })()}
${cfg.youtube ? `<section class="canal tarjeta"><div><h2>El canal</h2><p>Tuercas explica swaps y preparaciones de coches de a pie en vídeos cortos.</p></div><a class="boton hueco" href="${esc(cfg.youtube)}" rel="noopener" target="_blank">Ver el canal en YouTube</a></section>` : ''}`,
});

// Distribución: calculadora
pagina({
  titulo: '¿Cuándo toca cambiar la distribución? Calculadora por coche | Swap o Chatarra',
  descripcion: 'Elige tu coche y calcula cuántos kilómetros y meses le quedan a la correa de distribución, y cuánto cuesta cambiarla.',
  ruta: '/distribucion/',
  scripts: scriptsCalc(true),
  cuerpo: `<h1>¿Cuándo te toca cambiar la distribución?</h1>
<p class="entrada">Elige tu coche, pon tus kilómetros y la fecha del último cambio. Te decimos cuánto te queda y cuánto cuesta.</p>
${calculadora()}
<h2>Por marca</h2>
${rejillaMarcas(vehiculos)}
<h2 id="motores">Por motor</h2>
<ul class="lista-motores">${motores.map((m) => `<li><a href="/distribucion/${m.slug}/"><b>${esc(m.nombre)}</b><small>${esc(m.marca)}, ${esc(m.anios)}</small><span>${intervalo(m)}</span></a></li>`).join('')}</ul>`,
});

// Distribución: una página por motor
for (const m of motores) {
  const r = repro.filter((x) => x.distribucion === m.slug);
  const coches = cochesDist.filter((c) => c.x.motor === m.slug);
  pagina({
    titulo: `Distribución ${m.nombre}: cada cuánto se cambia (${intervalo(m)}) | Swap o Chatarra`,
    descripcion: `Intervalo de cambio de la correa de distribución del ${m.nombre} (${m.marca}): ${intervalo(m)}. Calcula cuánto le queda a la tuya y cuánto cuesta.`,
    ruta: `/distribucion/${m.slug}/`,
    scripts: scriptsCalc(false),
    rastro: [['Distribución', '/distribucion/'], [m.nombre]],
    cuerpo: `${migas([['Distribución', '/distribucion/'], [m.nombre]])}
<h1>Distribución del ${esc(m.nombre)}: ¿cuándo se cambia?</h1>
<p class="entrada">Intervalo de referencia: <b>${intervalo(m)}</b>, lo que llegue antes.</p>
${calculadora(m.slug)}
${bloqueCoste(m)}
<h2>Datos del motor</h2>
${fichaMotor(m)}
<h2>Lo que tienes que saber</h2>
<p>${esc(m.nota)}</p>
${coches.length ? `<h2>Coches con este motor</h2><ul class="enlaces">${coches.map((c) => `<li><a href="${c.x.url}">${esc(c.coche)}</a></li>`).join('')}</ul>` : ''}
${r.length ? `<h2>¿Y si lo reprogramas?</h2><ul class="enlaces">${r.map((x) => `<li><a href="/repro/${x.slug}/">${esc(x.nombre)}: de ${x.cv} a ${rango(x.cv1, 'CV')}</a></li>`).join('')}</ul>` : ''}
<h2>Fuentes</h2>
${fuentesHtml([...m.fuentes, ...costeDe(m).fuentes])}`,
  });
}

// Distribución: marca, modelo y versión
const filaDist = (g, x) => `<tr><td><a href="${x.url}">${esc(g.nombre)} ${esc(x.nombre)}</a><small>${esc(g.anios)}</small></td><td>${intervalo(motorDe(x.motor))}</td></tr>`;
for (const v of vehiculos) {
  pagina({
    titulo: `Distribución ${v.marca}: cada cuánto se cambia por modelo y motor | Swap o Chatarra`,
    descripcion: `Intervalos de cambio de la correa de distribución en ${v.marca}: ${v.modelos.map((m) => m.modelo).join(', ')}.`,
    ruta: v.url,
    rastro: [['Distribución', '/distribucion/'], [v.marca]],
    cuerpo: `${migas([['Distribución', '/distribucion/'], [v.marca]])}
<h1>Distribución ${esc(v.marca)}: ¿cada cuánto se cambia?</h1>
<p class="entrada">Elige tu modelo y tu motor para ver el intervalo y calcular cuánto te queda.</p>
${v.modelos.map((mo) => `<h2><a href="${mo.url}">${esc(v.marca)} ${esc(mo.modelo)}</a></h2>
<table class="versiones">${mo.generaciones.map((g) => g.motores.map((x) => filaDist(g, x)).join('')).join('')}</table>`).join('')}`,
  });
  for (const mo of v.modelos) {
    const r = vehiculosRepro.find((a) => a.marca === v.marca)?.modelos.find((b) => b.modelo === mo.modelo);
    pagina({
      titulo: `Distribución ${v.marca} ${mo.modelo}: cuándo se cambia en cada motor | Swap o Chatarra`,
      descripcion: `Cada cuánto se cambia la correa de distribución del ${v.marca} ${mo.modelo} según generación y motor, y cuánto cuesta.`,
      ruta: mo.url,
      rastro: [['Distribución', '/distribucion/'], [v.marca, v.url], [mo.modelo]],
      cuerpo: `${migas([['Distribución', '/distribucion/'], [v.marca, v.url], [mo.modelo]])}
<h1>Distribución del ${esc(v.marca)} ${esc(mo.modelo)}: ¿cuándo se cambia?</h1>
<p class="entrada">El intervalo depende del motor. Busca tu generación y tu versión.</p>
<table class="versiones"><tr><th>Versión</th><th>Intervalo</th></tr>${mo.generaciones.map((g) => g.motores.map((x) => filaDist(g, x)).join('')).join('')}</table>
${r ? `<p><a class="boton hueco" href="${r.url}">¿Cuánto gana un ${esc(v.marca)} ${esc(mo.modelo)} con una repro?</a></p>` : ''}`,
    });
  }
}
for (const c of cochesDist) {
  const m = motorDe(c.x.motor);
  const otros = cochesDist.filter((o) => o.mo === c.mo && o !== c);
  const rastro = [['Distribución', '/distribucion/'], [c.v.marca, c.v.url], [c.mo.modelo, c.mo.url], [`${c.g.nombre} ${c.x.nombre}`]];
  pagina({
    titulo: `Distribución ${c.coche}: cuándo se cambia y cuánto cuesta | Swap o Chatarra`,
    descripcion: `La correa de distribución del ${c.coche} (${c.g.anios}) se cambia cada ${intervalo(m)}. Calcula cuánto le queda a la tuya y cuánto cuesta el cambio.`,
    ruta: c.x.url,
    scripts: scriptsCalc(false),
    rastro,
    cuerpo: `${migas(rastro)}
<h1>Distribución del ${esc(c.coche)}</h1>
<p class="entrada">Lleva el motor ${esc(m.nombre)}. La correa se cambia cada <b>${intervalo(m)}</b>, lo que llegue antes.</p>
${calculadora(m.slug)}
${bloqueCoste(m)}
<h2>Datos del motor</h2>
${fichaMotor(m)}
<h2>Lo que tienes que saber</h2>
<p>${esc(m.nota)}</p>
${otros.length ? `<h2>Otras versiones del ${esc(c.v.marca)} ${esc(c.mo.modelo)}</h2><ul class="enlaces">${otros.map((o) => `<li><a href="${o.x.url}">${esc(o.g.nombre)} ${esc(o.x.nombre)}, ${esc(o.g.anios)}</a></li>`).join('')}</ul>` : ''}
<h2>Fuentes</h2>
${fuentesHtml([...m.fuentes, ...costeDe(m).fuentes])}`,
  });
}

// Repro: índice
pagina({
  titulo: 'Repro Stage 1: cuántos CV y Nm gana tu coche | Swap o Chatarra',
  descripcion: 'Elige tu coche y mira la potencia y el par de serie y tras una reprogramación Stage 1, con fuentes y lo que dice la ley.',
  ruta: '/repro/',
  scripts: `<script id="datos-vehiculos-repro" type="application/json">${JSON.stringify(vehiculosRepro)}</script>
<script id="datos-repro" type="application/json">${JSON.stringify(repro.map(({ slug: s, nombre, codigos, cv, nm, cv1, nm1 }) => ({ slug: s, nombre, codigos, cv, nm, cv1, nm1 })))}</script>
<script src="/selector.js" defer></script>
<script src="/repro.js" defer></script>`,
  cuerpo: `<h1>¿Cuánto gana tu motor con una repro?</h1>
<p class="entrada">Elige tu coche y te decimos cuánta potencia y par gana con una Stage 1: solo software, sin cambiar piezas.</p>
<div class="tarjeta">
<div id="selRepro" class="selector-coche"></div>
<div id="resultadoRepro" aria-live="polite"></div>
</div>
<h2>Por marca</h2>
${rejillaMarcas(vehiculosRepro)}
<h2 id="tabla">Por motor</h2>
<table class="versiones"><tr><th>Motor</th><th>De serie</th><th>Stage 1</th></tr>${repro.map((x) => `<tr><td><a href="/repro/${x.slug}/">${esc(x.nombre)}</a><small>${esc(x.marca)}</small></td><td>${x.cv} CV<br>${x.nm} Nm</td><td><b>${rango(x.cv1, 'CV')}</b><br>${rango(x.nm1, 'Nm')}</td></tr>`).join('')}</table>
${avisoLegal}`,
});

const gana = (x) => `<div class="gana">+${Math.round(medio(x.cv1) - x.cv)} CV y +${Math.round(medio(x.nm1) - x.nm)} Nm <small>alrededor de un ${Math.round((medio(x.cv1) / x.cv - 1) * 100)} % más</small></div>
${barras('Potencia', x.cv, x.cv1, 'CV')}${barras('Par', x.nm, x.nm1, 'Nm')}`;
const fichaRepro = (x) => `<table class="datos">
<tr><th>Marcas</th><td>${esc(x.marca)}</td></tr>
<tr><th>Combustible</th><td>${esc(x.tipo)}</td></tr>
<tr><th>Códigos de motor</th><td>${esc(x.codigos)}</td></tr>
<tr><th>Años aproximados</th><td>${esc(x.anios)}</td></tr>
<tr><th>Coches que lo montan</th><td>${esc(x.coches)}</td></tr>
</table>`;

// Repro: una página por motor
for (const x of repro) {
  const coches = cochesRepro.filter((c) => c.x.repro === x.slug);
  pagina({
    titulo: `Repro ${x.nombre}: ${rango(x.cv1, 'CV')} y ${rango(x.nm1, 'Nm')} en Stage 1 | Swap o Chatarra`,
    descripcion: `Cuánto gana el ${x.nombre} (${x.marca}) con una reprogramación Stage 1: de ${x.cv} CV y ${x.nm} Nm a ${rango(x.cv1, 'CV')} y ${rango(x.nm1, 'Nm')}.`,
    ruta: `/repro/${x.slug}/`,
    rastro: [['Repro', '/repro/'], [x.nombre]],
    cuerpo: `${migas([['Repro', '/repro/'], [x.nombre]])}
<h1>Repro del ${esc(x.nombre)}: ¿cuánto gana?</h1>
<div class="tarjeta">${gana(x)}</div>
<h2>Datos del motor</h2>
${fichaRepro(x)}
<h2>Lo que tienes que saber</h2>
<p>${esc(x.nota)}</p>
${x.distribucion ? `<p>Antes de meterle más potencia, comprueba la distribución: <a href="/distribucion/${x.distribucion}/">¿cuándo toca cambiarla en este motor?</a></p>` : ''}
${coches.length ? `<h2>Coches con este motor</h2><ul class="enlaces">${coches.map((c) => `<li><a href="${c.x.url}">${esc(c.coche)}</a></li>`).join('')}</ul>` : ''}
${avisoLegal}
<h2>Fuentes</h2>
${fuentesHtml(x.fuentes)}`,
  });
}

// Repro: marca, modelo y versión
const filaRepro = (g, x) => { const r = reproDe(x.repro); return `<tr><td><a href="${x.url}">${esc(g.nombre)} ${esc(x.nombre)}</a><small>${esc(g.anios)}</small></td><td>${r.cv} CV</td><td><b>${rango(r.cv1, 'CV')}</b></td></tr>`; };
for (const v of vehiculosRepro) {
  pagina({
    titulo: `Repro ${v.marca}: cuánto gana cada modelo con una Stage 1 | Swap o Chatarra`,
    descripcion: `Potencia de serie y tras una reprogramación Stage 1 en ${v.marca}: ${v.modelos.map((m) => m.modelo).join(', ')}.`,
    ruta: v.url,
    rastro: [['Repro', '/repro/'], [v.marca]],
    cuerpo: `${migas([['Repro', '/repro/'], [v.marca]])}
<h1>Repro ${esc(v.marca)}: ¿cuánto gana cada modelo?</h1>
<p class="entrada">Potencia de serie frente a una Stage 1, por modelo y motor.</p>
${v.modelos.map((mo) => `<h2><a href="${mo.url}">${esc(v.marca)} ${esc(mo.modelo)}</a></h2>
<table class="versiones">${mo.generaciones.map((g) => g.motores.map((x) => filaRepro(g, x)).join('')).join('')}</table>`).join('')}
${avisoLegal}`,
  });
  for (const mo of v.modelos) {
    const d = vehiculos.find((a) => a.marca === v.marca)?.modelos.find((b) => b.modelo === mo.modelo);
    pagina({
      titulo: `Repro ${v.marca} ${mo.modelo}: cuánto gana cada motor en Stage 1 | Swap o Chatarra`,
      descripcion: `Cuántos CV y Nm gana el ${v.marca} ${mo.modelo} con una reprogramación Stage 1, por generación y motor.`,
      ruta: mo.url,
      rastro: [['Repro', '/repro/'], [v.marca, v.url], [mo.modelo]],
      cuerpo: `${migas([['Repro', '/repro/'], [v.marca, v.url], [mo.modelo]])}
<h1>Repro del ${esc(v.marca)} ${esc(mo.modelo)}: ¿cuánto gana?</h1>
<p class="entrada">Depende del motor. Busca tu generación y tu versión.</p>
<table class="versiones"><tr><th>Versión</th><th>De serie</th><th>Stage 1</th></tr>${mo.generaciones.map((g) => g.motores.map((x) => filaRepro(g, x)).join('')).join('')}</table>
${d ? `<p><a class="boton hueco" href="${d.url}">¿Cuándo toca la distribución en un ${esc(v.marca)} ${esc(mo.modelo)}?</a></p>` : ''}
${avisoLegal}`,
    });
  }
}
for (const c of cochesRepro) {
  const x = reproDe(c.x.repro);
  const otros = cochesRepro.filter((o) => o.mo === c.mo && o !== c);
  const rastro = [['Repro', '/repro/'], [c.v.marca, c.v.url], [c.mo.modelo, c.mo.url], [`${c.g.nombre} ${c.x.nombre}`]];
  pagina({
    titulo: `Repro ${c.coche}: ${rango(x.cv1, 'CV')} en Stage 1 | Swap o Chatarra`,
    descripcion: `Cuánto gana el ${c.coche} (${c.g.anios}) con una reprogramación Stage 1: de ${x.cv} CV y ${x.nm} Nm a ${rango(x.cv1, 'CV')} y ${rango(x.nm1, 'Nm')}.`,
    ruta: c.x.url,
    rastro,
    cuerpo: `${migas(rastro)}
<h1>Repro del ${esc(c.coche)}</h1>
<p class="entrada">Con una Stage 1 pasa de <b>${x.cv} CV</b> a <b>${rango(x.cv1, 'CV')}</b>, y de ${x.nm} Nm a ${rango(x.nm1, 'Nm')}.</p>
<div class="tarjeta">${gana(x)}</div>
<h2>Datos del motor</h2>
${fichaRepro(x)}
<h2>Lo que tienes que saber</h2>
<p>${esc(x.nota)}</p>
${x.distribucion ? `<p>Antes de meterle más potencia, comprueba la distribución: <a href="/distribucion/${x.distribucion}/">¿cuándo toca cambiarla en este motor?</a></p>` : ''}
${otros.length ? `<h2>Otras versiones del ${esc(c.v.marca)} ${esc(c.mo.modelo)}</h2><ul class="enlaces">${otros.map((o) => `<li><a href="${o.x.url}">${esc(o.g.nombre)} ${esc(o.x.nombre)}, ${esc(o.g.anios)}</a></li>`).join('')}</ul>` : ''}
${avisoLegal}
<h2>Fuentes</h2>
${fuentesHtml(x.fuentes)}`,
  });
}

// Aviso legal
pagina({
  titulo: 'Aviso legal | Swap o Chatarra',
  descripcion: 'Aviso legal y política de afiliación de Swap o Chatarra.',
  ruta: '/aviso-legal/',
  cuerpo: `<h1>Aviso legal</h1>
<h2>Titular</h2>
<p>Titular de la web: Álex Gutiérrez Gutiérrez<br>NIF: 44918767C${cfg.contacto ? `<br>Contacto: <a href="mailto:${esc(cfg.contacto)}">${esc(cfg.contacto)}</a>` : ''}</p>
<h2>Enlaces de afiliado</h2>
<p>Esta web participa en programas de afiliación de tiendas de recambios. Cuando compras a través de un enlace marcado, la tienda nos paga una comisión. El precio para ti es el mismo.</p>
<h2>Información técnica</h2>
<p>Los intervalos de mantenimiento, los precios y las potencias se recopilan de fuentes públicas que se citan en cada página. Son orientativos: el dato válido es el del libro de mantenimiento de tu vehículo.</p>
<h2>Medición de visitas</h2>
<p>Esta web no usa cookies. Si se miden las visitas, se hace con estadísticas anónimas que no identifican a nadie.</p>`,
});

// sitemap y robots
const enMapa = urls.filter((u) => u !== '/aviso-legal/');
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${enMapa.map((u) => `<url><loc>${cfg.url_base}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cfg.url_base}/sitemap.xml\n`);
if (new Set(urls).size !== urls.length) throw new Error('Hay rutas repetidas');

console.log(`Web generada: ${urls.length} páginas en dist/`);
