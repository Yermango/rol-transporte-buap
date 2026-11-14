/* ==========================================================================
   SW.JS - ROL OPERATIVO PRO (STU BUAP)
   Objetivo: que la app ABRA AL INSTANTE con cualquier señal y gaste pocos megas.
   - La app (index.html, extras.js) se abre desde el teléfono al momento, sin esperar a internet.
   - En segundo plano pregunta a GitHub si hay versión nueva (si no hay, casi no gasta datos).
   - Fuentes de Google, Firebase y lector de Excel se descargan UNA sola vez y se guardan.
   - Si las fuentes de Google tardan, la app NO se queda en blanco esperándolas.
   - v9: la app ahora es un solo index.html (ya no existe extras.js) y muestra
     las notificaciones push del navegador (PC / iPhone agregado a inicio).
   ========================================================================== */

const CACHE_NAME = "stu-buap-pwa-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20Estrella%20Roja.webp"
];
const ESPERA_MAX_FUENTES_MS = 2500;
const SERVIDORES_GUARDAR_UNA_VEZ = ["fonts.gstatic.com", "cdnjs.cloudflare.com"];

// ---------------------------------------------------------------------------
// Instalación: guarda lo básico (si un archivo falla, los demás se guardan igual)
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSETS.map((a) => cache.add(a).catch(() => {})))
    )
  );
});

// Limpia versiones viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
async function traerConCors(req) {
  try {
    return await fetch(req.url, { mode: "cors", credentials: "omit" });
  } catch (e) {
    return fetch(req);
  }
}

function firmaDeRespuesta(res) {
  if (!res || !res.headers) return "";
  return (
    res.headers.get("etag") ||
    res.headers.get("last-modified") ||
    res.headers.get("content-length") ||
    ""
  );
}

async function avisarVersionNueva(urlTexto) {
  try {
    const u = new URL(urlTexto);
    const esApp = /\/index\.html$/i.test(u.pathname) || /\/$/.test(u.pathname);
    if (!esApp) return;
    const clientes = await self.clients.matchAll({ type: "window" });
    clientes.forEach((c) => c.postMessage({ type: "stu-version-nueva", url: urlTexto }));
  } catch (e) {}
}

// Mantiene vivo el service worker mientras termina el trabajo en segundo plano
function responder(event, manejador) {
  let terminar = function () {};
  event.waitUntil(
    new Promise((res) => {
      terminar = res;
      setTimeout(res, 25000); // seguro: nunca se queda colgado
    })
  );
  event.respondWith(
    manejador(event.request, () => terminar()).catch(() => {
      terminar();
      return Response.error();
    })
  );
}

// ---------------------------------------------------------------------------
// Estrategias
// ---------------------------------------------------------------------------

// 1) La app propia: abre desde el teléfono al instante y se actualiza en segundo plano.
//    Pregunta a GitHub con "no-cache": si no cambió, responde 304 (casi 0 datos).
async function estrategiaApp(req, terminar) {
  const cache = await caches.open(CACHE_NAME);
  let guardado = await cache.match(req.url);
  if (!guardado && req.mode === "navigate") guardado = await cache.match("./index.html");

  const actualizar = fetch(req.url, { cache: "no-cache" })
    .then(async (res) => {
      if (res && res.ok && !res.redirected) {
        const cambio =
          guardado &&
          firmaDeRespuesta(guardado) &&
          firmaDeRespuesta(res) &&
          firmaDeRespuesta(guardado) !== firmaDeRespuesta(res);
        await cache.put(req.url, res.clone());
        if (cambio) avisarVersionNueva(req.url);
      }
      return res;
    })
    .catch(() => null);

  if (guardado) {
    actualizar.then(terminar, terminar);
    return guardado;
  }

  // Primera vez sin copia guardada: se necesita internet
  let res = null;
  try {
    res = await fetch(req);
  } catch (e) {
    res = null;
  }
  terminar();
  return (
    res ||
    new Response("Sin conexión y todavía no hay copia guardada. Abre la app una vez con internet.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    })
  );
}

// 2) Archivos externos que no cambian (Firebase SDK, lector Excel, archivos de fuentes):
//    se descargan una sola vez y de ahí siempre salen del teléfono.
async function estrategiaGuardarUnaVez(req, terminar) {
  const cache = await caches.open(CACHE_NAME);
  const guardado = await cache.match(req.url);
  if (guardado) {
    terminar();
    return guardado;
  }
  const res = await traerConCors(req);
  if (res && res.ok) {
    try {
      await cache.put(req.url, res.clone());
    } catch (e) {}
  }
  terminar();
  return res;
}

// 3) Hoja de estilos de fuentes de Google: NUNCA debe dejar la pantalla en blanco.
//    Si tarda más de 2.5 s, se abre la app con letra normal y se baja en segundo plano.
async function estrategiaFuentesCss(req, terminar) {
  const cache = await caches.open(CACHE_NAME);
  const guardado = await cache.match(req.url);
  if (guardado) {
    terminar();
    return guardado;
  }

  const descarga = traerConCors(req).then(async (res) => {
    if (res && res.ok) {
      try {
        await cache.put(req.url, res.clone());
      } catch (e) {}
    }
    return res;
  });
  descarga.then(terminar, terminar);

  const limite = new Promise((r) => setTimeout(() => r(null), ESPERA_MAX_FUENTES_MS));
  const res = await Promise.race([descarga.catch(() => null), limite]);
  return (
    res ||
    new Response("/* fuentes de Google no disponibles por ahora */", {
      headers: { "Content-Type": "text/css; charset=utf-8" }
    })
  );
}

// ---------------------------------------------------------------------------
// Enrutador
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Datos en vivo de Firebase: nunca se tocan
  if (url.hostname.endsWith("firebaseio.com") || url.hostname.endsWith("firebasedatabase.app")) return;

  if (url.hostname === "fonts.googleapis.com") {
    responder(event, estrategiaFuentesCss);
    return;
  }

  if (
    SERVIDORES_GUARDAR_UNA_VEZ.includes(url.hostname) ||
    (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"))
  ) {
    responder(event, estrategiaGuardarUnaVez);
    return;
  }

  if (url.origin === self.location.origin) {
    responder(event, estrategiaApp);
    return;
  }
  // Cualquier otra cosa externa: red normal
});

// ---------------------------------------------------------------------------
// Notificaciones push del navegador (las manda la Firebase Function)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch (e) {
    datos = { notification: { title: "🔄 Cambio en el rol", body: event.data ? event.data.text() : "" } };
  }
  const n = datos.notification || {};
  const critico = datos.data && datos.data.critico === "1";
  event.waitUntil(
    self.registration.showNotification(n.title || "🔄 Cambio en el rol", {
      body: n.body || "",
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: "stu-cambio-" + Date.now(),
      requireInteraction: critico,
      vibrate: critico ? [400, 200, 400, 200, 600] : [200, 100, 200],
      data: { url: (datos.fcmOptions && datos.fcmOptions.link) || self.registration.scope }
    })
  );
});

// Al tocar la notificación: abre la app (o la trae al frente si ya estaba abierta)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.indexOf(self.registration.scope) === 0);
      if (abierta) return abierta.focus();
      return self.clients.openWindow(destino);
    })
  );
});
