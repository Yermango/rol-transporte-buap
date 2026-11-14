/* =============================================================================
   NOTIFICACIONES PUSH · ROL OPERATIVO PRO (STU BUAP)
   Cuando alguien registra un cambio en la app, la app deja un aviso en
   operaciones_v6_push/cola. Esta función lo toma, manda la notificación a todos
   los teléfonos y computadoras registrados (menos al que hizo el cambio) y
   borra el aviso de la cola.
   ============================================================================= */
const { onValueCreated } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const RAIZ = "operaciones_v6_push";
const TOKENS_INVALIDOS = /registration-token-not-registered|invalid-registration-token|invalid-argument/;

exports.enviarAvisoDeCambio = onValueCreated(
  { ref: `/${RAIZ}/cola/{avisoId}`, instance: "rutas-operaciones-default-rtdb", region: "us-central1" },
  async (event) => {
    const aviso = event.data.val() || {};
    const db = getDatabase();
    try {
      const snap = await db.ref(`${RAIZ}/tokens`).get();
      const destinos = [];
      snap.forEach((hijo) => {
        const t = hijo.val() && hijo.val().token;
        if (t && t !== aviso.tokenOrigen) destinos.push({ token: t, llave: hijo.key });
      });

      const titulo = String(aviso.titulo || "🔄 Cambio en el rol").slice(0, 120);
      const cuerpo = String(aviso.cuerpo || "").slice(0, 300);
      const enlace = /^https:\/\//.test(aviso.enlace || "") ? aviso.enlace : undefined;

      for (let i = 0; i < destinos.length; i += 500) {
        const lote = destinos.slice(i, i + 500);
        const r = await getMessaging().sendEachForMulticast({
          tokens: lote.map((d) => d.token),
          notification: { title: titulo, body: cuerpo },
          data: { critico: aviso.critico ? "1" : "0" },
          android: {
            priority: "high",
            notification: { channelId: "cambios", sound: "default", defaultVibrateTimings: true }
          },
          webpush: {
            headers: { Urgency: "high" },
            notification: { title: titulo, body: cuerpo, icon: "icon-192.png", requireInteraction: !!aviso.critico },
            fcmOptions: enlace ? { link: enlace } : undefined
          }
        });
        // Equipos que desinstalaron la app o borraron permisos: se quitan de la lista
        await Promise.all(
          r.responses.map((res, j) =>
            !res.success && res.error && TOKENS_INVALIDOS.test(res.error.code)
              ? db.ref(`${RAIZ}/tokens/${lote[j].llave}`).remove()
              : null
          )
        );
      }
    } finally {
      await event.data.ref.remove();
    }
  }
);
