// Genera la web estática en dist/ a partir de data/*.json. Sin dependencias.
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const dist = path.join(raiz, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, 'data/config.json'), 'utf8'));
const motores = JSON.parse(fs.readFileSync(path.join(raiz, 'data/motores.json'), 'utf8'));

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
<header><a class="logo" href="/">Swap <span>o</span> Chatarra</a></header>
<main>
${cuerpo}
</main>
<footer>
<p class="divulgacion">Algunos enlaces de esta web son de afiliado: si compras a través de ellos, la tienda nos paga una comisión sin que a ti te cueste más.</p>
<p>Los intervalos son de referencia y pueden variar según año, versión y uso. Confirma siempre con el libro de mantenimiento de tu coche o con tu taller. · <a href="/aviso-legal/">Aviso legal</a></p>
</footer>
${conCalc ? `<script id="datos-motores" type="application/json">${JSON.stringify(motores.map(({ slug, nombre, km, anos, km_severo }) => ({ slug, nombre, km, anos, km_severo })))}</script>
<script>window.ENLACE_KIT=${JSON.stringify(enlaceKit)};</script>
<script src="/calc.js" defer></script>` : ''}
</body>
</html>
`;
}

function calculadora(seleccionado) {
  const opciones = motores
    .map((m) => `<option value="${m.slug}"${m.slug === seleccionado ? ' selected' : ''}>${esc(m.nombre)} — ${esc(m.marca)}</option>`)
    .join('');
  return `<form id="calc" class="tarjeta">
<label for="motor">Motor</label>
<select id="motor" name="motor">${opciones}</select>
<label for="kmActual">Kilómetros actuales</label>
<input id="kmActual" name="kmActual" type="number" min="0" step="1000" inputmode="numeric" required placeholder="Ej. 185000">
<label for="kmUltimo">Kilómetros en el último cambio de distribución</label>
<input id="kmUltimo" name="kmUltimo" type="number" min="0" step="1000" inputmode="numeric" placeholder="0 si nunca se ha cambiado">
<label for="fechaUltimo">Fecha del último cambio</label>
<input id="fechaUltimo" name="fechaUltimo" type="date" required>
<p class="ayuda">Si nunca se ha cambiado, pon la fecha de matriculación.</p>
<label class="check"><input id="severo" name="severo" type="checkbox"> Uso severo: mucha ciudad, trayectos cortos, remolque o calor extremo</label>
<button type="submit">Calcular</button>
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
<p class="intro">Elige tu motor, pon tus kilómetros y la fecha del último cambio. Te decimos cuánto te queda antes de jugártela.</p>
${calculadora(motores[0].slug)}
<h2>Motores disponibles</h2>
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
<p>[COMPLETAR: titular de la web, NIF y correo de contacto.]</p>
<h2>Enlaces de afiliado</h2>
<p>Esta web participa en programas de afiliación de tiendas de recambios. Cuando compras a través de un enlace marcado, la tienda nos paga una comisión. El precio para ti es el mismo.</p>
<h2>Información técnica</h2>
<p>Los intervalos de mantenimiento se recopilan de fuentes públicas que se citan en cada página. Son orientativos: el dato válido es el del libro de mantenimiento de tu vehículo.</p>`,
}));

// sitemap y robots
const urls = ['/', ...motores.map((m) => `/distribucion/${m.slug}/`)];
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${cfg.url_base}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cfg.url_base}/sitemap.xml\n`);

console.log(`Web generada: ${urls.length} páginas en dist/`);
