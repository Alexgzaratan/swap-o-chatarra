# Swap o Chatarra

Web estática generada con `node build.js` a partir de los JSON de `data/`. Sin dependencias.

- Cloudflare: comando de build `node build.js`, carpeta de salida `dist`.
- `data/motores.json`: motores con correa de distribución (intervalo, nota, fuentes y, si hay precio propio, `coste`).
- `data/vehiculos.json`: coches de la calculadora de distribución. Cada versión apunta a un motor con `motor`.
- `data/repro.json`: versiones de repro (potencia y par de serie y Stage 1).
- `data/vehiculos-repro.json`: coches de la sección Repro. Cada versión apunta con `repro`.
- `data/config.json`: enlace de afiliado (`afiliado.enlace_kit_distribucion`), precio general del cambio (`coste_distribucion`), canal (`youtube`), medición (`analitica.cloudflare_token`) y verificación de Google (`google_site_verification`).

El build crea una página por marca, por modelo y por versión en cada sección, además del sitemap. Falla si un coche apunta a un motor que no existe.

Tipografías: Barlow y Barlow Condensed (licencia SIL OFL 1.1), servidas desde la propia web.
