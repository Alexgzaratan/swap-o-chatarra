// Sirve la web desde dist/ y manda las direcciones antiguas al dominio propio.
const DOMINIO = 'swapochatarra.com';
export default {
  async fetch(peticion, env) {
    const url = new URL(peticion.url);
    if (url.hostname !== DOMINIO && (url.hostname.endsWith('.workers.dev') || url.hostname === 'www.' + DOMINIO)) {
      url.hostname = DOMINIO;
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(peticion);
  },
};
