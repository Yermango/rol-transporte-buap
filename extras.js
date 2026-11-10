/* ==========================================================================
   EXTRAS.JS - ROL OPERATIVO PRO (STU BUAP)
   - Forzado de formato móvil Android + Pantalla Completa
   - Lectura automática de teléfonos G3 (Personal) y H3 (Trabajo) con prioridad a Trabajo (H)
   - Lector Dual de Excel para "rol" (Formato 1: Bloques HR | Formato 2: Tabular Órdenes 24h)
   - Rediseño compacto de tarjetas en "Activas" (Teléfono y WhatsApp mini para ver bien la ruta)
   - Avisos rojos persistentes por cada cambio (ruta, horario, operador, unidad y motivo) que se quitan a mano
   - Conexión ligera a Firebase (sin bucles, junta ráfagas de cambios) y diagnóstico de consumo de datos
   - Aviso de "versión nueva disponible" (trabaja junto con sw.js v8)
   - Corrección de sincronización: los cambios de operador/unidad (Todas las vueltas y Flota) ahora sí se reflejan
   - "Fallas detectadas en rol" (🔎 arriba a la derecha): taller, bajas, claves que no existen, unidades repetidas, rol vs datos, Zacachimalpa
   - "Iniciales (Smart)" (🚌 arriba a la derecha): sube el Monitor de Smart, sugiere quién hace las rutas INICIAL y revisa sus fallas
   - Taller y unidades sin operador: solo hace caso a la hoja Taller (hoy o última fecha, sin status = lista) y a Unidades Faltantes de DATOS OP
   - 🔧 "Taller y unidades sin operador": ver qué lee la app, actualizar SOLO taller sin borrar los cambios del día, y avisos si falla la lectura
   - Letras en la columna UNIDAD de DATOS OP (B, I, C, P, Pr, V, T), editables desde ⚙️ = estado del operador, ya no son guardias · Vueltas redondas con circuitos CU–Camino Real/Tlaxcalancingo y CU–Cuautlancingo/Bachillerato
   - Tablero v2: primero lo que falta cubrir y quién llega a tiempo, quién está libre, vueltas CU–CU2 que se pueden quitar
   - Tablero v3: fila con todas las horas del día (24 h), tocar a un operador para marcar Falta/Préstamo/etc.
   - Flota con colores por estado y días en taller · Pendientes con rutas, horas y vacíos detallados
   - Tiempos de ruta reales: se leen de la hoja RUTAS (tiempo real/Smart, km y vacíos) y se usan en choques, quién llega y disponibilidad
   - Cambios tipo BusUp: buscar, marcar viajes con casillas, elegir vehículo y conductor con buscador, Asignar (celular y escritorio)
   ========================================================================== */

(function () {
    "use strict";

    // =========================================================================
    // 1. FORZAR FORMATO DE TELÉFONO MÓVIL Y ESTILOS COMPACTOS EN "ACTIVAS"
    // =========================================================================
    function enforceMobileViewportAndStyles() {
        // Forzar etiqueta viewport móvil estricta
        let vp = document.querySelector('meta[name="viewport"]');
        if (!vp) {
            vp = document.createElement("meta");
            vp.name = "viewport";
            document.head.appendChild(vp);
        }
        vp.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover"
        );

        // Asegurar que no arranque en modo escritorio a menos que el usuario lo pida
        if (localStorage.getItem("stu_force_pc_view") !== "1") {
            document.body.classList.remove("pc-view");
            document.body.classList.add("mobile-forced");
        }

        if (document.getElementById("stu-extras-styles")) return;
        const style = document.createElement("style");
        style.id = "stu-extras-styles";
        style.textContent = `
            /* Bloqueo de formato móvil limpio en Android APK / WebView */
            body.mobile-forced .shell {
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 auto !important;
            }

            /* Botón de pantalla completa en la barra superior */
            .fullscreen-btn-top {
                background: rgba(255, 255, 255, 0.18);
                border: 1px solid rgba(255, 255, 255, 0.28);
                border-radius: 10px;
                padding: 6px;
                cursor: pointer;
                color: #FFFFFF;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 38px;
                min-height: 38px;
            }
            .fullscreen-btn-top svg {
                width: 19px;
                height: 19px;
                pointer-events: none;
            }
            .fullscreen-btn-top:active {
                transform: scale(0.93);
            }

            /* REDISEÑO COMPACTO DE TARJETAS EN "ACTIVAS" PARA VER BIEN LA RUTA */
            .trip {
                margin: 0 10px !important;
                padding: 10px 10px !important;
                gap: 8px !important;
                align-items: center !important;
            }
            .trip-time {
                font-size: 15.5px !important;
                font-weight: 800 !important;
                width: 44px !important;
                flex-shrink: 0 !important;
                line-height: 1.1 !important;
            }
            .trip-main {
                flex: 1 1 auto !important;
                min-width: 0 !important;
                overflow: hidden !important;
            }
            .trip-route {
                font-size: 15px !important;
                font-weight: 800 !important;
                line-height: 1.22 !important;
                color: var(--ink);
                word-break: break-word !important;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 4px;
            }
            .trip-sub {
                font-size: 12.5px !important;
                margin-top: 4px !important;
                display: flex !important;
                align-items: center !important;
                flex-wrap: wrap !important;
                gap: 4px !important;
                line-height: 1.25 !important;
            }
            .trip-sub .unit {
                font-size: 12px !important;
                padding: 2px 6px !important;
                border-radius: 5px !important;
                flex-shrink: 0;
            }
            .trip-op-name {
                font-weight: 700;
                color: var(--ink);
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .trip.trip-damaged .trip-op-name {
                color: #FFFFFF !important;
            }

            /* Mini barra de contacto (Teléfono + WhatsApp compactos junto al operador) */
            .mini-contact-group {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                margin-left: 2px;
                flex-shrink: 0;
            }
            .mini-contact-btn {
                border: none;
                border-radius: 7px;
                width: 26px !important;
                height: 26px !important;
                min-width: 26px !important;
                min-height: 26px !important;
                padding: 0 !important;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.12s;
            }
            .mini-contact-btn:active {
                transform: scale(0.9);
            }
            .mini-contact-btn svg {
                width: 14px !important;
                height: 14px !important;
                pointer-events: none;
            }
            .mini-contact-btn.call-btn {
                color: #00509d;
                background: #DBEAFE;
                border: 1px solid #BFDBFE;
            }
            .mini-contact-btn.msg-btn {
                color: #15803D;
                background: #DCFCE7;
                border: 1px solid #BBF7D0;
            }
            .mini-contact-btn.no-phone {
                opacity: 0.42;
                background: var(--surface-2);
                color: var(--ink-soft);
                border: 1px dashed var(--line);
            }

            /* Botones de estado de la derecha más compactos para no robar ancho a la ruta */
            .trip-actions {
                display: flex !important;
                align-items: center !important;
                gap: 3px !important;
                flex: 0 0 auto !important;
            }
            .trip-actions .icon-btn {
                min-width: 33px !important;
                min-height: 33px !important;
                width: 33px !important;
                height: 33px !important;
                padding: 5px !important;
                border-radius: 8px !important;
            }
            .trip-actions .icon-btn svg {
                width: 17px !important;
                height: 17px !important;
            }
            .trip-actions .icon-btn.hide-btn svg {
                width: 15px !important;
                height: 15px !important;
            }
            .tag-foranea {
                font-size: 10px !important;
                padding: 1px 5px !important;
                margin-left: 2px !important;
            }
            .punt-badge {
                font-size: 10.5px !important;
                padding: 1px 5px !important;
            }
        `;
        document.head.appendChild(style);
    }

    function injectFullscreenButton() {
        const rightBar = document.querySelector(".appbar-right");
        if (!rightBar || document.getElementById("btnFullscreenApp")) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "btnFullscreenApp";
        btn.className = "fullscreen-btn-top";
        btn.title = "Pantalla Completa";
        btn.setAttribute("aria-label", "Pantalla Completa");
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        btn.onclick = function () {
            toggleAppFullscreen();
        };
        rightBar.insertBefore(btn, rightBar.firstChild);
    }

    window.toggleAppFullscreen = function () {
        const docEl = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
            else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    window.cambiarModoPantalla = function (modo) {
        if (modo === "pc") {
            localStorage.setItem("stu_force_pc_view", "1");
            document.body.classList.remove("mobile-forced");
            document.body.classList.add("pc-view");
        } else {
            localStorage.setItem("stu_force_pc_view", "0");
            document.body.classList.remove("pc-view");
            document.body.classList.add("mobile-forced");
        }
        if (typeof window.render === "function") window.render();
        if (typeof window.closeSheet === "function") window.closeSheet();
    };

    // =========================================================================
    // 2. NORMALIZACIÓN Y EXTRACCIÓN AUTOMÁTICA DE TELÉFONOS (G3 Y H3 ABAJO)
    // =========================================================================
    function normTextKey(str) {
        if (!str) return "";
        return String(str)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Limpiador universal de teléfonos (soporta números de Excel, espacios, guiones, +52 o varios números en una celda)
    window.cleanPhone10 = function (val) {
        if (val === null || val === undefined) return "";
        let str = "";
        if (typeof val === "number") {
            if (!isFinite(val) || val <= 0) return "";
            str = String(Math.trunc(val));
        } else {
            str = String(val).trim();
        }
        if (!str || /^(s\/n|sin|no|n\/a|ninguno|0|-+|null|undefined)$/i.test(str)) return "";

        // Si hay dos teléfonos en la misma celda separados por /, -, coma o salto
        let parts = str.split(/[\/,;|\n]+/);
        for (let p of parts) {
            let d = p.replace(/\D/g, "");
            if (d.length === 12 && d.startsWith("52")) d = d.slice(2);
            if (d.length === 13 && d.startsWith("521")) d = d.slice(3);
            if (d.length === 10) return d;
            if (d.length > 10) return d.slice(-10);
        }

        let allDigits = str.replace(/\D/g, "");
        if (allDigits.length === 12 && allDigits.startsWith("52")) allDigits = allDigits.slice(2);
        if (allDigits.length === 13 && allDigits.startsWith("521")) allDigits = allDigits.slice(3);
        if (allDigits.length >= 10) return allDigits.slice(-10);
        return "";
    };

    // Buscador inteligente de metadatos del operador (cruza por Nombre, Nombre sin acentos, Clave/Nómina o Unidad)
    window.getOpMeta = function (opName, claveHint, unitHint) {
        const empty = {
            puntualidad: null,
            telPersonal: "",
            telEmpresa: "",
            tel: "",
            esTurismo: false,
            esBaja: false,
            clave: "",
            rutasSabidas: ""
        };
        if (!store) return empty;
        const metaDB = store.operadoresMeta || {};

        let foundMeta = null;

        // 1) Búsqueda directa por llave del nombre
        if (opName && opName !== "Sin asignar" && opName !== "VACIO") {
            let kExact = fbKey(opName);
            let kNorm = fbKey(normTextKey(opName));
            if (metaDB[kExact]) foundMeta = metaDB[kExact];
            else if (metaDB[opName]) foundMeta = metaDB[opName];
            else if (metaDB[kNorm]) foundMeta = metaDB[kNorm];
        }

        // 2) Búsqueda por Clave / Nómina si se proporcionó o si opName es numérico
        if (!foundMeta) {
            let possibleClave = claveHint || (opName && /^\d+$/.test(String(opName).trim()) ? String(opName).trim() : "");
            if (possibleClave) {
                let kClave = "CLAVE_" + fbKey(possibleClave);
                if (metaDB[kClave]) foundMeta = metaDB[kClave];
                else if (store.operadoresDB && store.operadoresDB[fbKey(possibleClave)]) {
                    let mappedName = store.operadoresDB[fbKey(possibleClave)];
                    foundMeta = metaDB[fbKey(mappedName)] || metaDB[fbKey(normTextKey(mappedName))] || null;
                }
            }
        }

        // 3) Búsqueda flexible comparando nombres normalizados (sin acentos) en operadoresMeta
        if (!foundMeta && opName && opName !== "Sin asignar" && opName !== "VACIO") {
            let targetNorm = normTextKey(opName);
            if (targetNorm) {
                for (let key in metaDB) {
                    if (key.startsWith("CLAVE_") || key.startsWith("UNIT_")) continue;
                    let item = metaDB[key];
                    let itemNorm = normTextKey(item?.nombreOriginal || key);
                    if (itemNorm === targetNorm) {
                        foundMeta = item;
                        break;
                    }
                }
            }
        }

        // 4) Búsqueda de respaldo por Unidad si la corrida tiene unidad
        if (!foundMeta && unitHint) {
            let kUnit = "UNIT_" + fbKey(unitHint);
            if (metaDB[kUnit]) foundMeta = metaDB[kUnit];
        }

        let meta = foundMeta || {};
        let reason = typeof getReasonForEntity === "function" ? getReasonForEntity(opName) : "";
        let rLow = String(reason || "").toLowerCase();
        let nLow = String(opName || "").toLowerCase();

        let punt =
            meta.puntualidad !== undefined && meta.puntualidad !== null && meta.puntualidad !== ""
                ? Number(meta.puntualidad)
                : null;
        let esTurismo = Boolean(meta.esTurismo) || rLow.includes("turismo") || nLow.includes("turismo");
        let esBaja =
            Boolean(meta.esBaja) ||
            (punt !== null && punt <= 0) ||
            rLow.includes("baja") ||
            nLow.includes("baja");

        let telPersonal = window.cleanPhone10(meta.telPersonal || "");
        let telEmpresa = window.cleanPhone10(meta.telEmpresa || "");
        let telFallback = window.cleanPhone10(meta.tel || "");

        if (!telPersonal && !telEmpresa && telFallback) {
            telEmpresa = telFallback;
        }

        // REGLA ESTRICTA DE PRIORIDAD:
        // 1. Si tiene ambos (Trabajo H y Personal G) -> SIEMPRE priorizar Trabajo (Columna H)
        // 2. Si solo tiene Trabajo (H) -> usar Trabajo (H)
        // 3. Si solo tiene Personal (G) -> usar Personal (G)
        let telPrioritario = telEmpresa ? telEmpresa : telPersonal;

        return {
            puntualidad: punt,
            telPersonal: telPersonal,
            telEmpresa: telEmpresa,
            tel: telPrioritario,
            tipoTelActivo: telEmpresa ? "Trabajo (H)" : (telPersonal ? "Personal (G)" : ""),
            esTurismo: esTurismo,
            esBaja: esBaja,
            clave: meta.clave || "",
            rutasSabidas: meta.rutasSabidas || (store.knownRoutes && store.knownRoutes[fbKey(opName)]) || ""
        };
    };

    // CONTACTO AUTOMÁTICO CON PRIORIDAD DIRECTA AL TELÉFONO DE TRABAJO (COLUMNA H)
    window.contactarOperador = function (event, mode, opName, tripTime, routeName, unitNum, claveHint) {
        if (event) event.stopPropagation();
        if (!opName || opName === "Sin asignar" || opName === "VACIO") {
            if (typeof showAggressiveToast === "function") {
                showAggressiveToast("Esta corrida aún no tiene operador asignado.");
            }
            return;
        }

        let meta = window.getOpMeta(opName, claveHint, unitNum);
        // Priorizar siempre el teléfono de Trabajo (Columna H) sobre el Personal (Columna G)
        let telElegido = meta.telEmpresa || meta.telPersonal || meta.tel || "";

        if (!telElegido) {
            // Solo si no existe ni en H ni en G en el Excel, permite registrarlo
            window.abrirModalEditarTelefonos(opName, mode, tripTime, routeName, unitNum);
            return;
        }

        // Ejecuta la llamada o el WhatsApp de inmediato sin preguntar cuál de los dos números usar
        ejecutarContactoDirecto(mode, telElegido, opName, tripTime, routeName, unitNum);
    };

    // =========================================================================
    // 3. CATÁLOGO DE RUTAS Y LECTOR DUAL DE EXCEL ("DATOS" Y DOS FORMATOS "ROL")
    // =========================================================================
    const CATALOGO_RUTAS_BUAP = {
        "0101": { o: "Bachillerato", d: "CU" },
        "0102": { o: "CU", d: "Bachillerato" },
        "0201": { o: "Camino Real", d: "CU" },
        "0202": { o: "CU", d: "Camino Real" },
        "0301": { o: "CU", d: "Héroes" },
        "0302": { o: "Héroes", d: "CU" },
        "0401": { o: "Cholula", d: "Preparatoria Lázaro Cárdenas" },
        "0402": { o: "Preparatoria Lázaro Cárdenas", d: "Cholula" },
        "0501": { o: "CAPU", d: "CU" },
        "0502": { o: "CU", d: "CAPU" },
        "0601": { o: "Área de la Salud", d: "Entronque" },
        "0602": { o: "Entronque", d: "Área de la Salud" },
        "0701": { o: "Área de la Salud", d: "Cholula" },
        "0702": { o: "Cholula", d: "Área de la Salud" },
        "0801": { o: "CU", d: "Área de la Salud" },
        "0802": { o: "Área de la Salud", d: "CU" },
        "0901": { o: "CU", d: "Centro" },
        "0902": { o: "Centro", d: "CU" },
        "1001": { o: "CU", d: "Complejo Cultural" },
        "1002": { o: "Complejo Cultural", d: "CU" },
        "1101": { o: "San Ramón", d: "CU" },
        "1102": { o: "CU", d: "San Ramón" },
        "1201": { o: "Maravillas", d: "CU" },
        "1202": { o: "CU", d: "Maravillas" },
        "1301": { o: "Xonacatepec", d: "CU" },
        "1302": { o: "CU", d: "Xonacatepec" },
        "1401": { o: "Amalucan", d: "CU" },
        "1402": { o: "CU", d: "Amalucan" },
        "1501": { o: "San Bartolo", d: "CU" },
        "1502": { o: "CU", d: "San Bartolo" },
        "1601": { o: "Loma Bella", d: "CU" },
        "1602": { o: "CU", d: "Loma Bella" },
        "1701": { o: "Agua Santa", d: "CU" },
        "1702": { o: "CU", d: "Agua Santa" },
        "1801": { o: "CU2", d: "CU" },
        "1802": { o: "CU", d: "CU2" },
        "1901": { o: "CU", d: "Tecamachalco" },
        "1902": { o: "Tecamachalco", d: "CU" },
        "2001": { o: "CU", d: "Atlixco" },
        "2002": { o: "Atlixco", d: "CU" },
        "2101": { o: "CU", d: "San Martín" },
        "2102": { o: "San Martín", d: "CU" },
        "2201": { o: "CU", d: "Chiapa" },
        "2202": { o: "Chiapa", d: "CU" },
        "2301": { o: "CU", d: "Acajete" },
        "2302": { o: "Acajete", d: "CU" }
    };

    function normalizarCodigoRuta(rawCode) {
        if (rawCode === null || rawCode === undefined) return "";
        let s = String(rawCode).trim();
        if (!s) return "";
        if (/^\d+$/.test(s) && s.length === 3) {
            return "0" + s;
        }
        return s;
    }

    function separarOrigenDestinoTexto(descRuta, fallbackCode) {
        if (!descRuta) {
            let code = normalizarCodigoRuta(fallbackCode);
            if (CATALOGO_RUTAS_BUAP[code]) return CATALOGO_RUTAS_BUAP[code];
            return { o: code ? "Ruta " + code : "Desconocido", d: "CU" };
        }
        let clean = String(descRuta).trim();
        // Quitar prefijo de código tipo "0101 - " o "0501-"
        clean = clean.replace(/^\d{3,4}\s*-\s*/i, "").trim();

        if (/\s+a\s+/i.test(clean)) {
            let parts = clean.split(/\s+a\s+/i);
            return {
                o: parts[0].trim() || "Desconocido",
                d: parts.slice(1).join(" a ").trim() || "Desconocido"
            };
        }
        if (clean.includes("/")) {
            let parts = clean.split("/");
            return {
                o: parts[0].trim() || "Desconocido",
                d: parts.slice(1).join("/").trim() || "Desconocido"
            };
        }
        if (clean.includes("-")) {
            let parts = clean.split("-");
            return {
                o: parts[0].trim() || "Desconocido",
                d: parts.slice(1).join("-").trim() || "Desconocido"
            };
        }
        return { o: clean, d: "CU" };
    }

    function parseExcelTime(hrVal) {
        if (hrVal === null || hrVal === undefined || hrVal === "") return null;
        if (typeof hrVal === "number" && hrVal >= 0) {
            let totalMins = Math.round((hrVal - Math.floor(hrVal)) * 24 * 60);
            if (hrVal >= 1 && totalMins === 0) return null;
            let hh = Math.floor(totalMins / 60) % 24;
            let mm = totalMins % 60;
            return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
        }
        let s = String(hrVal).trim();
        if (s.includes(":")) {
            let parts = s.split(":");
            let h = parseInt(parts[0], 10);
            let m = parseInt(parts[1], 10);
            if (!isNaN(h) && !isNaN(m)) {
                return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
            }
        }
        return null;
    }

    function parseExcelDateLabel(val, fallbackSheetName) {
        if (val === null || val === undefined || String(val).trim() === "") {
            return fallbackSheetName || "Hoy";
        }
        if (typeof val === "number" && val > 35000 && val < 65000) {
            let utcDays = Math.floor(val - 25569);
            let d = new Date(utcDays * 86400 * 1000);
            let yyyy = d.getUTCFullYear();
            let mm = String(d.getUTCMonth() + 1).padStart(2, "0");
            let dd = String(d.getUTCDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        }
        return String(val).trim().replace(/\//g, "-");
    }

    function resolverNombreOperadorPorClaveOUnidad(claveRaw, unidadRaw) {
        let claveStr = claveRaw !== null && claveRaw !== undefined ? String(claveRaw).trim() : "";
        let unitStr = unidadRaw !== null && unidadRaw !== undefined ? String(unidadRaw).trim() : "";
        let safeClave = fbKey(claveStr);

        if (safeClave && store.operadoresDB && store.operadoresDB[safeClave]) {
            return store.operadoresDB[safeClave];
        }
        if (claveStr && store.operadoresMeta && store.operadoresMeta["CLAVE_" + safeClave]) {
            return store.operadoresMeta["CLAVE_" + safeClave].nombreOriginal || claveStr;
        }
        if (unitStr && store.operadoresMeta && store.operadoresMeta["UNIT_" + fbKey(unitStr)]) {
            return store.operadoresMeta["UNIT_" + fbKey(unitStr)].nombreOriginal || "";
        }
        if (unitStr && Array.isArray(store.globalFleet)) {
            let foundF = store.globalFleet.find(g => g && String(g.u) === unitStr && g.n);
            if (foundF) return foundF.n;
        }
        return claveStr || "";
    }

    // LECTOR DUAL DE ARCHIVOS EXCEL DE "ROL" (SOPORTA FORMATO 1 Y FORMATO 2)
    window.parseWorkbook = function (arrayBuffer) {
        const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        const grids = {};
        const hrCounts = {};
        let opSheetName = null;

        // Mapa dinámico de rutas por si viene Hoja2 (Formato 2)
        const routeCatalogMap = Object.assign({}, CATALOGO_RUTAS_BUAP);

        wb.SheetNames.forEach(function (name) {
            const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
            grids[name] = grid;
            let cnt = 0;
            grid.forEach(function (row) {
                (row || []).forEach(function (v) {
                    if (String(v || "").trim().toUpperCase() === "HR") cnt++;
                });
            });
            hrCounts[name] = cnt;
            if (!opSheetName && /operador/i.test(name)) opSheetName = name;

            // Detectar si esta hoja tiene el catálogo de rutas (Ej: Hoja2 con "Ruta" y "ID RUTA")
            for (let r = 0; r < Math.min(grid.length, 15); r++) {
                let row = grid[r] || [];
                let rowUp = row.map(c => String(c || "").toUpperCase().trim());
                let idxIdRuta = rowUp.findIndex(h => h === "ID RUTA" || h === "IDRUTA" || h === "CLAVE RUTA");
                let idxDescRuta = rowUp.findIndex(h => h === "RUTA" || h === "DESCRIPCION" || h === "NOMBRE RUTA");
                if (idxIdRuta !== -1 && idxDescRuta !== -1) {
                    for (let rr = r + 1; rr < grid.length; rr++) {
                        let rRow = grid[rr] || [];
                        let idVal = normalizarCodigoRuta(rRow[idxIdRuta]);
                        let descVal = rRow[idxDescRuta];
                        if (idVal && descVal) {
                            routeCatalogMap[idVal] = separarOrigenDestinoTexto(descVal, idVal);
                        }
                    }
                    break;
                }
            }
        });

        // Respaldo de operadores dentro del mismo Excel si aún no se ha subido "datos"
        const claveToName = {};
        const unidadToName = {};
        if (opSheetName) {
            const opGrid = grids[opSheetName];
            for (let i = 1; i < opGrid.length; i++) {
                let row = opGrid[i] || [];
                let unidad = row[0], clave = row[1], nombre = row[2];
                let nm = nombre ? String(nombre).replace(/\s+/g, " ").trim() : null;
                let unidadNum = unidad != null && !isNaN(Number(unidad)) ? String(Math.round(Number(unidad))) : null;
                let claveNum = clave != null && !isNaN(Number(clave)) ? String(Math.round(Number(clave))) : null;
                let finalName = nm || (claveNum && store.operadoresDB && store.operadoresDB[claveNum] ? store.operadoresDB[claveNum] : null);
                if (claveNum != null && finalName) claveToName[claveNum] = finalName;
                if (unidadNum != null && finalName) unidadToName[unidadNum] = finalName;
            }
        }

        const days = [];

        // =====================================================================
        // INTENTO A: DETECTAR FORMATO 2 (TABULAR "Plantilla_Ordenes_Servicio")
        // =====================================================================
        wb.SheetNames.forEach(function (name) {
            const grid = grids[name];
            if (!grid || grid.length < 2) return;

            let headerRowIdx = -1;
            let colRutaCliente = -1, colRutaId = -1, colFecha = -1, colHora = -1, colOpNomina = -1, colUnidadEcon = -1;

            for (let r = 0; r < Math.min(grid.length, 15); r++) {
                let row = (grid[r] || []).map(c => normTextKey(c));
                let hasHora = row.some(h => h === "HORA" || h === "HR SALIDA" || h === "HORARIO");
                let hasRuta = row.some(h => h.includes("RUTA CLIENTE") || h === "RUTA ID" || h === "RUTA");
                let hasOpOrUnit = row.some(h => h.includes("OPERADOR") || h.includes("NOMINA") || h.includes("UNIDAD") || h.includes("ECONOMICO"));

                if (hasHora && hasRuta && hasOpOrUnit) {
                    headerRowIdx = r;
                    colRutaCliente = row.findIndex(h => h.includes("RUTA CLIENTE"));
                    colRutaId = row.findIndex(h => h.includes("RUTA ID") || h === "RUTA");
                    colFecha = row.findIndex(h => h.includes("FECHA") || h === "DIA");
                    colHora = row.findIndex(h => h === "HORA" || h.includes("HORA"));
                    colOpNomina = row.findIndex(h => h.includes("OPERADOR") || h.includes("NOMINA") || h === "CLAVE");
                    colUnidadEcon = row.findIndex(h => h.includes("UNIDAD") || h.includes("ECONOMICO") || h === "AUTOBUS");
                    break;
                }
            }

            if (headerRowIdx !== -1 && colHora !== -1) {
                const groupedByDate = {};

                // Si un viaje viene SIN fecha, toma la fecha que más se repite en la hoja
                // (antes se iba a un "día" fantasma con el nombre de la hoja y se perdía del rol).
                const conteoFechas = {};
                if (colFecha !== -1) {
                    for (let rf = headerRowIdx + 1; rf < grid.length; rf++) {
                        const vf = (grid[rf] || [])[colFecha];
                        if (vf !== null && vf !== undefined && String(vf).trim() !== "") {
                            const kf = parseExcelDateLabel(vf, name);
                            conteoFechas[kf] = (conteoFechas[kf] || 0) + 1;
                        }
                    }
                }
                const fechaMasComun =
                    Object.keys(conteoFechas).sort((x, y) => conteoFechas[y] - conteoFechas[x])[0] || name;
                for (let rr = headerRowIdx + 1; rr < grid.length; rr++) {
                    const row = grid[rr] || [];
                    const hStr = parseExcelTime(row[colHora]);
                    if (!hStr) continue;

                    const rawRouteVal =
                        colRutaCliente !== -1 && row[colRutaCliente] !== null && row[colRutaCliente] !== undefined
                            ? row[colRutaCliente]
                            : colRutaId !== -1
                            ? row[colRutaId]
                            : "";
                    const codeRuta = normalizarCodigoRuta(rawRouteVal);
                    let odObj = routeCatalogMap[codeRuta];
                    if (!odObj) {
                        odObj = separarOrigenDestinoTexto(String(rawRouteVal || ""), codeRuta);
                    }

                    let rawBus = colUnidadEcon !== -1 ? row[colUnidadEcon] : null;
                    let busStr =
                        typeof rawBus === "number"
                            ? String(Math.round(rawBus))
                            : rawBus !== null && rawBus !== undefined
                            ? String(rawBus).trim()
                            : "";

                    let rawClave = colOpNomina !== -1 ? row[colOpNomina] : null;
                    let claveStr =
                        typeof rawClave === "number"
                            ? String(Math.round(rawClave))
                            : rawClave !== null && rawClave !== undefined
                            ? String(rawClave).trim()
                            : "";
                    let safeClave = claveStr ? fbKey(claveStr) : "";

                    let opName =
                        resolverNombreOperadorPorClaveOUnidad(claveStr, busStr) ||
                        claveToName[claveStr] ||
                        unidadToName[busStr] ||
                        claveStr ||
                        "";

                    const celdaFecha = colFecha !== -1 ? row[colFecha] : null;
                    const fechaVacia = celdaFecha === null || celdaFecha === undefined || String(celdaFecha).trim() === "";
                    let dateKey = colFecha === -1 ? name : fechaVacia ? fechaMasComun : parseExcelDateLabel(celdaFecha, name);
                    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];

                    groupedByDate[dateKey].push({
                        id: "f2_" + fbKey(dateKey) + "_" + rr,
                        o: odObj.o || "Desconocido",
                        d: odObj.d || "Desconocido",
                        h: hStr,
                        u: busStr,
                        k: safeClave,
                        n: opName
                    });
                }

                Object.keys(groupedByDate).forEach(dKey => {
                    let list = groupedByDate[dKey];
                    if (list.length > 0) {
                        list.sort((a, b) => a.h.localeCompare(b.h));
                        days.push({ key: dKey, trips: list });
                    }
                });
            }
        });

        // Si ya encontró corridas con el Formato 2, las devuelve directamente
        if (days.length > 0) {
            return { days: days, fleet: [] };
        }

        // =====================================================================
        // INTENTO B: FORMATO 1 (CLÁSICO POR BLOQUES "HR" CON DIAGONAL "/")
        // =====================================================================
        wb.SheetNames.forEach(function (name) {
            if ((hrCounts[name] || 0) < 1) return;
            const grid = grids[name];
            const hrCells = [];
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < (grid[r] || []).length; c++) {
                    if (String(grid[r][c] || "").trim().toUpperCase() === "HR") {
                        hrCells.push([r, c]);
                    }
                }
            }
            const records = [];
            hrCells.forEach(function (hc) {
                const r = hc[0], c = hc[1];
                function getVal(ro, co) {
                    for (let i = ro - 1; i >= Math.max(ro - 8, 0); i--) {
                        for (let j = co - 3; j < co + 7; j++) {
                            if (grid[i] && typeof grid[i][j] === "string" && grid[i][j].includes("/")) {
                                return grid[i][j];
                            }
                        }
                    }
                    return null;
                }
                const label = getVal(r, c);
                const od = label ? label.split("/") : ["Bloque " + c, ""];
                let rr = r + 1;
                while (rr < grid.length) {
                    const hrVal = grid[rr] ? grid[rr][c] : null;
                    const busVal = grid[rr] ? grid[rr][c + 1] : null;
                    const claveVal = grid[rr] ? grid[rr][c + 2] : null;
                    if (hrVal == null && busVal == null) break;

                    const hStr = parseExcelTime(hrVal);
                    if (hStr != null) {
                        const busNum =
                            typeof busVal === "number"
                                ? String(Math.round(busVal))
                                : busVal
                                ? String(busVal).trim()
                                : "";
                        const claveNum2 =
                            typeof claveVal === "number"
                                ? String(Math.round(claveVal))
                                : claveVal
                                ? String(claveVal).trim()
                                : "";
                        const safeClave = claveNum2 ? fbKey(claveNum2) : "";

                        let nameOp =
                            resolverNombreOperadorPorClaveOUnidad(claveNum2, busNum) ||
                            claveToName[claveNum2] ||
                            unidadToName[busNum] ||
                            claveNum2 ||
                            "";

                        records.push({
                            id: "u" + r + "_" + c + "_" + rr,
                            o: (od[0] || "").trim() || "Desconocido",
                            d: (od[1] || "").trim() || "Desconocido",
                            h: hStr || "00:00",
                            u: busNum,
                            k: safeClave,
                            n: nameOp
                        });
                    }
                    rr++;
                }
            });
            if (records.length) {
                records.sort((a, b) => a.h.localeCompare(b.h));
                days.push({ key: name, trips: records });
            }
        });

        return { days: days, fleet: [] };
    };

    // SOBRESCRIBIR HANDLEEXCEL PARA LEER G3 Y H3 ABAJO CON PRECISIÓN Y GUARDAR EN NUBE
    window.handleExcel = async function (file, type, inputEl) {
        if (!file) return;
        let msgBox = document.getElementById("uploadMsg");
        if (msgBox) {
            msgBox.innerHTML = `<span style="color:var(--pend)">Procesando ${file.name} y sincronizando...</span>`;
        }
        try {
            await ensureXLSXLoaded();
        } catch (err) {
            if (msgBox) msgBox.innerHTML = `<span style="color:var(--bad)">${err.message}</span>`;
            if (inputEl) inputEl.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            try {
                const backupHistory = typeof getGlobalHistory === "function" ? [...getGlobalHistory()] : [];
                const wb = XLSX.read(e.target.result, { type: "array" });

                if (type === "seguimiento") {
                    store.operadoresDB = {};
                    store.operadoresMeta = {};
                    store.knownRoutes = store.knownRoutes || {};
                    store.tallerDB = {};
                    store.globalFleet = [];
                    store.unassignedReasons = {};

                    if (store.state) {
                        Object.keys(store.state).forEach(day => {
                            store.state[day].unitOverride = {};
                            store.state[day].opOverride = {};
                            store.state[day].tripUnitOverride = {};
                            store.state[day].tripOpOverride = {};
                        });
                    }

                    let opSheetName =
                        wb.SheetNames.find(n => /OP|DATOS|PLANTILLA|PERSONAL|SEGUIMIENTO/i.test(n)) ||
                        wb.SheetNames[0];

                    let countConTelefono = 0;

                    if (opSheetName) {
                        const sheetObj = wb.Sheets[opSheetName];
                        const rawData = XLSX.utils.sheet_to_json(sheetObj, { header: 1, defval: null });

                        let hRow = -1;
                        for (let r = 0; r < Math.min(rawData.length, 25); r++) {
                            if (
                                (rawData[r] || []).some(c =>
                                    /NOMBRE OPERADOR|NOMBRE|OPERADOR/i.test(String(c || ""))
                                )
                            ) {
                                hRow = r;
                                break;
                            }
                        }
                        if (hRow === -1) hRow = 1; // Por defecto fila 2 es encabezado y fila 3 (índice 2 = G3/H3) son datos

                        const headers = (rawData[hRow] || []).map(h => String(h || "").toUpperCase().trim());
                        let colNombre = headers.findIndex(
                            h => h.includes("NOMBRE OPERADOR") || h === "NOMBRE" || h.includes("OPERADOR")
                        );
                        let colClave = headers.findIndex(
                            h => h.includes("CLAVE") || h === "ID" || h.includes("NOMINA") || h.includes("NÓMINA")
                        );
                        let colUnidad = headers.findIndex(
                            h => h.includes("UNIDAD") || h === "ECON" || h.includes("AUTOBUS") || h.includes("ECONÓMICO")
                        );
                        let colPuntHeader = headers.findIndex(
                            h => h.includes("PUNTUALIDAD") || h.includes("CALIF")
                        );
                        let colRutas = headers.findIndex(
                            h => h.includes("RUTA") || h.includes("CONOCE") || h.includes("DOMINA")
                        );

                        // Si no encontró encabezado estándar, asumir columnas clásicas de plantilla
                        if (colNombre === -1) colNombre = 2;
                        if (colClave === -1) colClave = 1;
                        if (colUnidad === -1) colUnidad = 0;

                        const COL_G_PERSONAL = 6; // Celda G3 hacia abajo (Teléfono Personal)
                        const COL_H_TRABAJO  = 7; // Celda H3 hacia abajo (Teléfono del Trabajo / Empresa)
                        const COL_AS_PUNT    = 44; // Columna AS (Puntualidad)

                        // Empezar desde fila 3 de Excel (índice 2) o justo debajo del encabezado
                        const startRowIdx = Math.max(hRow + 1, 2);

                        for (let i = startRowIdx; i < rawData.length; i++) {
                            const row = rawData[i] || [];
                            const rawName = row[colNombre];
                            if (!rawName || String(rawName).trim() === "") continue;
                            const opName = String(rawName).replace(/\s+/g, " ").trim();
                            if (/^(NOMBRE|NOMBRE OPERADOR|OPERADOR|TOTAL)$/i.test(opName)) continue;

                            let opClave =
                                colClave !== -1 && row[colClave] != null ? String(row[colClave]).trim() : "";
                            if (opClave && !isNaN(Number(opClave))) {
                                opClave = String(Math.round(Number(opClave)));
                            }

                            let opUnit =
                                colUnidad !== -1 && row[colUnidad] != null ? String(row[colUnidad]).trim() : "";
                            if (opUnit && !isNaN(Number(opUnit))) {
                                opUnit = String(Math.round(Number(opUnit)));
                            }

                            // Letra en lugar de unidad (B, I, C, P, Pr, T): es un ESTADO del operador, no una unidad
                            const letraEstado = opUnit && !/^\d+$/.test(opUnit) ? stuLetraNorm(opUnit) : "";
                            const codigoEstado = stuCodigoEstadoOperador(opUnit);
                            if (codigoEstado) {
                                opUnit = "";
                            } else if (opUnit && !/^\d+$/.test(opUnit)) {
                                // Letra que no está en la lista (ej. "V"): no es una unidad; el operador queda como estaba y se avisa
                                (window._stuLetrasDesconocidas = window._stuLetrasDesconocidas || []).push({ letra: opUnit, nombre: opName });
                                opUnit = "";
                            }

                            // Lectura directa de celda G(i+1) y H(i+1) (G3 y H3 hacia abajo)
                            const cellG = sheetObj[XLSX.utils.encode_cell({ r: i, c: COL_G_PERSONAL })];
                            const cellH = sheetObj[XLSX.utils.encode_cell({ r: i, c: COL_H_TRABAJO })];

                            const rawTelG =
                                cellG && cellG.v !== undefined && cellG.v !== null
                                    ? cellG.v
                                    : cellG && cellG.w
                                    ? cellG.w
                                    : row[COL_G_PERSONAL];
                            const rawTelH =
                                cellH && cellH.v !== undefined && cellH.v !== null
                                    ? cellH.v
                                    : cellH && cellH.w
                                    ? cellH.w
                                    : row[COL_H_TRABAJO];

                            const telPersonal = window.cleanPhone10(rawTelG);
                            const telTrabajo  = window.cleanPhone10(rawTelH);
                            // Prioridad estricta: Trabajo (H) sobre Personal (G)
                            const telPrioritario = telTrabajo ? telTrabajo : telPersonal;
                            if (telPrioritario) countConTelefono++;

                            // Puntualidad en columna AS
                            const cellAS = sheetObj[XLSX.utils.encode_cell({ r: i, c: COL_AS_PUNT })];
                            const rawPunt =
                                cellAS && cellAS.v !== undefined && String(cellAS.v).trim() !== ""
                                    ? cellAS.v
                                    : row[COL_AS_PUNT] !== undefined &&
                                      row[COL_AS_PUNT] !== null &&
                                      String(row[COL_AS_PUNT]).trim() !== ""
                                    ? row[COL_AS_PUNT]
                                    : colPuntHeader !== -1
                                    ? row[colPuntHeader]
                                    : null;

                            let puntualidad = null;
                            if (rawPunt !== null && rawPunt !== undefined && String(rawPunt).trim() !== "") {
                                let numP = Number(String(rawPunt).replace(/[^0-9.-]/g, ""));
                                if (!isNaN(numP)) {
                                    if (numP > 10 && numP <= 100) numP = Math.round((numP / 10) * 10) / 10;
                                    puntualidad = numP;
                                }
                            }

                            // Rutas que conoce el operador
                            let rutasSabidas = "";
                            if (colRutas !== -1 && row[colRutas]) {
                                rutasSabidas = String(row[colRutas]).trim();
                            }

                            const rowJoined = row.map(c => String(c || "")).join(" ").toUpperCase();
                            const esTurismo = /TURISMO/i.test(rowJoined) || codigoEstado === "Apoyo Turismo";
                            const esBaja =
                                /\bBAJA\b/i.test(rowJoined) || (puntualidad !== null && puntualidad === 0) || codigoEstado === "Baja";

                            const safeClave = fbKey(opClave || opName);
                            const safeOpKey = fbKey(opName);
                            const safeNormKey = fbKey(normTextKey(opName));

                            store.operadoresDB[safeClave] = opName;
                            if (rutasSabidas) {
                                store.knownRoutes[safeOpKey] = rutasSabidas;
                            }

                            const metaRecord = {
                                nombreOriginal: opName,
                                clave: opClave || "",
                                u: opUnit || "",
                                puntualidad: puntualidad,
                                telPersonal: telPersonal,
                                telEmpresa: telTrabajo,
                                tel: telPrioritario,
                                rutasSabidas: rutasSabidas,
                                letra: letraEstado,
                                esTurismo: esTurismo,
                                esBaja: esBaja
                            };

                            // Guardar indexado por Nombre, Nombre sin acentos, Clave y Unidad para cruce instantáneo
                            store.operadoresMeta[safeOpKey] = metaRecord;
                            if (safeNormKey && safeNormKey !== safeOpKey) {
                                store.operadoresMeta[safeNormKey] = metaRecord;
                            }
                            if (opClave) {
                                store.operadoresMeta["CLAVE_" + fbKey(opClave)] = metaRecord;
                            }
                            if (opUnit) {
                                store.operadoresMeta["UNIT_" + fbKey(opUnit)] = metaRecord;
                            }

                            if (esTurismo) {
                                setReasonForEntity(safeOpKey, "Apoyo Turismo");
                            } else if (esBaja) {
                                setReasonForEntity(safeOpKey, "Baja");
                            } else if (codigoEstado) {
                                setReasonForEntity(safeOpKey, codigoEstado);
                            } else if (/\bAPOYO\b/i.test(rowJoined)) {
                                setReasonForEntity(safeOpKey, "Apoyo");
                            }

                            if (!esTurismo && !esBaja && !codigoEstado && (opUnit || opName)) {
                                store.globalFleet.push({
                                    u: opUnit || "",
                                    k: safeClave,
                                    n: opName,
                                    estatus: "Activa"
                                });
                            }
                        }
                    }

                    // Lectura de Hoja de Taller
                    wb.SheetNames.forEach(sheetName => {
                        if (/TALLER|MANTENIMIENTO|DETENID|FALLA|SINIESTRO|PARQUE|FLOTA|UNIDAD/i.test(sheetName)) {
                            const fData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
                                header: 1,
                                defval: null
                            });
                            const isDedicatedTallerSheet = /TALLER|MANTENIMIENTO|DETENID|FALLA|SINIESTRO/i.test(
                                sheetName
                            );
                            const hRow = fData.findIndex(row =>
                                (row || []).some(c => /UNIDAD|ECON|AUTOBUS|CARRO|NO\./i.test(String(c || "")))
                            );

                            let colUnidad = -1, colMotivo = -1, colEstado = -1;
                            if (hRow !== -1) {
                                const headers = (fData[hRow] || []).map(h => String(h || "").toUpperCase());
                                colUnidad = headers.findIndex(h => /UNIDAD|ECON|AUTOBUS|CARRO|NUM/.test(h));
                                colMotivo = headers.findIndex(h =>
                                    /MOTIVO|FALLA|CAUSA|TRABAJO|OBSERV|REPARACION|DETALLE/.test(h)
                                );
                                colEstado = headers.findIndex(h => /ESTADO|ESTATUS|SITUACION/.test(h));
                            }

                            const startRow = hRow !== -1 ? hRow + 1 : 0;
                            for (let r = startRow; r < fData.length; r++) {
                                const row = fData[r] || [];
                                let foundUnit = null;

                                if (colUnidad !== -1 && row[colUnidad] != null) {
                                    let cand = String(row[colUnidad]).replace(/\D/g, "");
                                    if (FLOTA_SET.has(cand)) foundUnit = cand;
                                }
                                if (!foundUnit) {
                                    for (let c = 0; c < Math.min(row.length, 10); c++) {
                                        let cand = String(row[c] || "").replace(/^U-/i, "").trim();
                                        if (FLOTA_SET.has(cand)) {
                                            foundUnit = cand;
                                            break;
                                        }
                                    }
                                }

                                if (foundUnit) {
                                    const mot =
                                        colMotivo !== -1 && row[colMotivo] != null
                                            ? String(row[colMotivo]).trim()
                                            : "";
                                    const est =
                                        colEstado !== -1 && row[colEstado] != null
                                            ? String(row[colEstado]).trim()
                                            : "";
                                    const rowStr = row.map(x => String(x || "")).join(" ");

                                    if (isDedicatedTallerSheet) {
                                        if (!/\b(LIBERAD[AO]|OPERANDO|EN RUTA|ACTIVA)\b/i.test(est)) {
                                            const finalMot = mot || est || "Taller";
                                            store.tallerDB[foundUnit] = finalMot;
                                            setReasonForEntity(foundUnit, "Taller");
                                        }
                                    } else if (/TALLER|SINIESTRO|FALLA|DETENID|CORRALON|MOTOR|CAJA/i.test(rowStr)) {
                                        const finalMot = mot || est || "Taller";
                                        store.tallerDB[foundUnit] = finalMot;
                                        setReasonForEntity(foundUnit, "Taller");
                                    }
                                }
                            }
                        }
                    });

                    // Si ya hay días del rol cargados, actualizar nombres de operadores que estaban como clave numérica
                    if (store.days) {
                        Object.keys(store.days).forEach(dKey => {
                            let dTrips = (store.days[dKey] && store.days[dKey].trips) || [];
                            dTrips.forEach(t => {
                                if (t.k && store.operadoresDB[fbKey(t.k)]) {
                                    t.n = store.operadoresDB[fbKey(t.k)];
                                } else if (t.n && /^\d+$/.test(String(t.n).trim())) {
                                    let resolved = resolverNombreOperadorPorClaveOUnidad(t.n, t.u);
                                    if (resolved) t.n = resolved;
                                }
                            });
                        });
                    }

                    store.globalHistory = backupHistory;
                    const countTaller = Object.keys(store.tallerDB || {}).length;
                    const countActivos = Object.values(store.operadoresDB || {}).filter(op =>
                        isOperadorActivo(op)
                    ).length;

                    window.render();
                    saveStore(err => {
                        if (!err && msgBox) {
                            msgBox.innerHTML = `<span style="color:var(--done)">✅ ¡Datos cargados! ${countActivos} operadores activos, ${countConTelefono} con teléfono (G3/H3) y ${countTaller} unidades en Taller.</span>`;
                            setTimeout(closeSheet, 1600);
                        }
                    });
                } else {
                    const result = window.parseWorkbook(e.target.result);
                    if (!result.days.length) {
                        throw new Error(
                            "No se detectaron corridas en el archivo (se aceptan bloques HR o Plantilla 24h)."
                        );
                    }

                    store.days = {};
                    result.days.forEach(function (d) {
                        const safeDayKey = fbKey(d.key);
                        store.days[safeDayKey] = { label: d.key, trips: d.trips, fleet: [] };
                        const oldUnitChanges =
                            store.state && store.state[safeDayKey] && store.state[safeDayKey].unitChanges
                                ? store.state[safeDayKey].unitChanges
                                : [];
                        store.state[safeDayKey] = {
                            trips: {},
                            unitOverride: {},
                            tripUnitOverride: {},
                            unitChanges: oldUnitChanges,
                            opOverride: {},
                            tripOpOverride: {},
                            resolvedOverlaps: [],
                            resolvedMissing: []
                        };
                    });
                    store.currentDay = fbKey(result.days[0].key);
                    store.globalHistory = backupHistory;

                    window.render();
                    saveStore(err => {
                        if (!err && msgBox) {
                            msgBox.innerHTML = `<span style="color:var(--done)">✅ ¡Rol cargado (${result.days[0].trips.length} corridas) y sincronizado en la nube!</span>`;
                            setTimeout(closeSheet, 1500);
                        }
                    });
                }
            } catch (err) {
                if (msgBox) msgBox.innerHTML = `<span style="color:var(--bad)">Error: ${err.message}</span>`;
            }
            if (inputEl) inputEl.value = "";
        };
        reader.readAsArrayBuffer(file);
    };

    // =========================================================================
    // 4. SOBRESCRIBIR WINDOW.RENDER CON DISEÑO COMPACTO DE TELÉFONO Y WHATSAPP
    // =========================================================================
    window.render = function () {
        if (!store.days || !store.days[store.currentDay]) {
            document.getElementById("dayLabel").innerHTML = "Sin datos cargados <span>▼</span>";
            document.getElementById("btnOrigen").innerHTML =
                ICO.pin + "<span>" + (activeOrigin ? activeOrigin : "Origen") + "</span>";
            document.getElementById("btnDestino").innerHTML =
                ICO.flag + "<span>" + (activeDest ? activeDest : "Destino") + "</span>";
            if (activeView === "flota") {
                renderFlota();
                return;
            }
            if (activeView === "tablero") {
                renderTablero();
                return;
            }
            document.getElementById("list").innerHTML = `
              <div style="text-align:center;padding:45px 20px;color:var(--ink-soft);">
                <div style="font-size:40px;margin-bottom:10px;">🚍</div>
                <b style="font-size:16px;color:var(--ink);">Sincronizando rol operativo...</b>
                <p style="font-size:14px;">Toca el botón para descargar los datos de la nube o sube tus archivos Excel desde ⚙️ arriba a la derecha.</p>
                <button type="button" class="btn-primary" style="background:var(--accent);max-width:280px;margin:12px auto;" onclick="forzarSincronizacionNube()">🔄 Sincronizar desde la Nube</button>
              </div>`;
            return;
        }

        document.getElementById("dayLabel").innerHTML =
            (store.days[store.currentDay].label || store.currentDay) + " <span>▼</span>";
        document.getElementById("btnOrigen").innerHTML =
            ICO.pin + "<span>" + (activeOrigin ? activeOrigin : "Origen") + "</span>";
        document.getElementById("btnOrigen").classList.toggle("active", !!activeOrigin);
        document.getElementById("btnDestino").innerHTML =
            ICO.flag + "<span>" + (activeDest ? activeDest : "Destino") + "</span>";
        document.getElementById("btnDestino").classList.toggle("active", !!activeDest);

        globalCollisions = obtenerEmpalmesRender();
        actualizarBadgePendientes();

        if (activeView === "flota") {
            renderFlota();
            return;
        }
        if (activeView === "tablero") {
            renderTablero();
            return;
        }

        const trips = store.days[store.currentDay].trips || [];
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const nowTime = new Date().getTime();
        const visible = [];

        const sortedTrips = [...trips];
        const ds = getDayState();

        const baselineOp = {};
        if (store.globalFleet) {
            store.globalFleet.forEach(g => {
                if (g && g.u && g.n) baselineOp[String(g.u)] = g.n;
            });
        }

        sortedTrips.forEach(t => {
            const state = getTripState(t.id);
            let isHidden = !!state.hidden;
            if (state.status === "formado" && state.formadoAt && nowTime - state.formadoAt > 300000) {
                isHidden = true;
            }

            let skip = false;
            const fOrigin = normLoc(t.o);
            const fDest = normLoc(t.d);

            if (activeOrigin && fOrigin !== activeOrigin) skip = true;
            if (activeDest && fDest !== activeDest) skip = true;
            if (onlyForaneas && !isForaneaTrip(t)) skip = true;

            const asg = resolveTripAssignment(t, ds, baselineOp);
            const finalUnit = asg.unit;
            let finalOp = asg.op;

            // Si finalOp quedó como número de nómina/clave y ya existe en operadoresDB, mostrar el nombre real
            if (finalOp && /^\d+$/.test(finalOp)) {
                const resolvedName = resolverNombreOperadorPorClaveOUnidad(finalOp, finalUnit);
                if (resolvedName) finalOp = resolvedName;
            }

            const isDamagedUnit = isUnidadEnTallerOInhabil(finalUnit);
            const isDamagedOp = Boolean(finalOp && !isOperadorActivo(finalOp));

            if (showRevisar) {
                if (
                    !finalUnit ||
                    !finalOp ||
                    isDamagedUnit ||
                    isDamagedOp ||
                    globalCollisions.some(c => c.t2Id === t.id)
                ) {
                    // conservar
                } else {
                    skip = true;
                }
            }

            if (searchTerm) {
                const motU = getMotivoUnidad(finalUnit);
                const hay = (
                    t.o +
                    " a " +
                    t.d +
                    " " +
                    (finalOp || "") +
                    " " +
                    (finalUnit || "") +
                    " " +
                    (t.k || "") +
                    " " +
                    motU
                ).toLowerCase();
                if (hay.indexOf(searchTerm) === -1) skip = true;
            }

            if (skip) return;
            if (activeView === "activas" && isHidden) return;
            if (activeView === "ocultas" && !isHidden) return;

            t._finalUnit = finalUnit;
            t._finalOp = finalOp;
            t._isDamagedU = isDamagedUnit;
            t._isDamagedOp = isDamagedOp;
            visible.push(t);
        });

        if (!visible.length) {
            document.getElementById("list").innerHTML =
                "<div style='text-align:center;padding:40px;color:gray;font-weight:600;'>No hay corridas con este filtro</div>";
            return;
        }

        const groupedTrips = {};
        visible.forEach(t => {
            const h = t.h.slice(0, 2);
            if (!groupedTrips[h]) groupedTrips[h] = [];
            groupedTrips[h].push(t);
        });

        const sortedHours = Object.keys(groupedTrips);
        if (activeView === "ocultas") sortedHours.sort((a, b) => Number(b) - Number(a));
        else sortedHours.sort((a, b) => Number(a) - Number(b));

        let html = "";
        for (const hour of sortedHours) {
            const tripsInHour = groupedTrips[hour];
            if (activeView === "ocultas") tripsInHour.sort((a, b) => b.h.localeCompare(a.h));
            else tripsInHour.sort((a, b) => a.h.localeCompare(b.h));

            const actionBtn =
                activeView === "ocultas"
                    ? `<button type="button" class="hour-toggle restore-btn-block" onclick="restaurarBloque('${hour}')">Restaurar bloque</button>`
                    : `<button type="button" class="hour-toggle" onclick="ocultarBloque('${hour}')">Ocultar bloque</button>`;

            html += `<div class="hour-section"><div class="hour-head"><span class="h mono">${hour}:00</span><span class="c">${tripsInHour.length} salida(s)</span>${actionBtn}</div><div class="trip-grid">`;

            tripsInHour.forEach(t => {
                const state = getTripState(t.id);
                const opName = t._finalOp || "Sin asignar";
                const unitName = t._finalUnit || "S/U";
                const routeLabel = formatRouteName(t.o, t.d);
                const foraneaBadge = isForaneaTrip(t) ? `<span class="tag-foranea">FORÁNEA</span>` : "";

                const isCollision = globalCollisions.some(c => c.t2Id === t.id);
                const isMissingUnit = !t._finalUnit;
                const isMissingOp = !t._finalOp;

                const hm = t.h.split(":");
                const diff = +hm[0] * 60 + +hm[1] - nowMin;
                let urgencyClass = "";
                if (state.status !== "formado" && diff >= 0) {
                    if (diff <= 10) urgencyClass = "urgency-10";
                    else if (diff <= 20) urgencyClass = "urgency-20";
                    else if (diff <= 30) urgencyClass = "urgency-30";
                }

                const extraClasses = `${urgencyClass} ${
                    t._isDamagedU || t._isDamagedOp ? "trip-damaged" : ""
                } ${isCollision ? "trip-collision" : ""} ${
                    isMissingUnit || isMissingOp ? "trip-nounit" : ""
                }`;

                let reasonStr = "";
                if (t._isDamagedU) {
                    reasonStr = `Taller: ${getMotivoUnidad(t._finalUnit) || "Detenida"}`;
                } else if (t._isDamagedOp) {
                    const mOp = window.getOpMeta(t._finalOp, t.k, t._finalUnit);
                    if (mOp.esTurismo) reasonStr = "Apoyo Turismo (No activo)";
                    else if (mOp.puntualidad === 0) reasonStr = "Puntualidad 0 / Baja";
                    else reasonStr = getReasonForEntity(t._finalOp) || "Inactivo";
                }

                const attrK = String(t.k !== null && t.k !== undefined ? t.k : "").replace(/"/g, "&quot;");
                const attrU = String(t._finalUnit || "").replace(/"/g, "&quot;");
                const attrN = String(opName || "").replace(/"/g, "&quot;");
                const attrOrigU = String(t.u || "").replace(/"/g, "&quot;");

                const opMeta = window.getOpMeta(t._finalOp, t.k, t._finalUnit);
                const hasTel = Boolean(opMeta && opMeta.tel);
                const safeOpCall = opName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const safeRouteCall = routeLabel.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const safeClaveCall = String(t.k || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const titleTel = hasTel
                    ? `${opMeta.tipoTelActivo}: ${opMeta.tel}`
                    : "Sin teléfono en G3/H3 (Toca para agregar)";

                // Mini botones de Teléfono y WhatsApp compactos integrados en la fila del operador
                const miniContactHtml =
                    activeView !== "ocultas"
                        ? `<span class="mini-contact-group">
                            <button type="button" class="mini-contact-btn call-btn ${hasTel ? "" : "no-phone"}" title="Llamar (${titleTel})" onclick="contactarOperador(event, 'call', '${safeOpCall}', '${t.h}', '${safeRouteCall}', '${t._finalUnit}', '${safeClaveCall}')">${ICO.phone}</button>
                            <button type="button" class="mini-contact-btn msg-btn ${hasTel ? "" : "no-phone"}" title="WhatsApp (${titleTel})" onclick="contactarOperador(event, 'msg', '${safeOpCall}', '${t.h}', '${safeRouteCall}', '${t._finalUnit}', '${safeClaveCall}')">${ICO.msg}</button>
                           </span>`
                        : "";

                html += `
                  <div class="trip status-${state.status} ${extraClasses}" onclick="tapTrip(event, this)" data-id="${t.id}" data-k="${attrK}" data-origu="${attrOrigU}" data-u="${attrU}" data-n="${attrN}" data-time="${t.h}" data-status="${state.status}">
                    <div class="trip-time mono">${t.h}</div>
                    <div class="trip-main">
                      <div class="trip-route">${routeLabel}${foraneaBadge}</div>
                      <div class="trip-sub">
                        <span class="unit">${unitName}</span>
                        <span class="trip-op-name">${opName}</span>
                        ${t._finalOp ? renderPuntualidadBadge(t._finalOp) : ""}
                        ${miniContactHtml}
                        ${reasonStr ? `<b style="font-size:10.5px; margin-left:2px;">[${reasonStr}]</b>` : ""}
                        ${isCollision ? `<span class="collision-warn">¡EMPALME!</span>` : ""}
                        ${(isMissingUnit || isMissingOp) && !reasonStr ? `<span style="color:var(--bad); font-weight:bold; font-size:10.5px;">(Falta asignar)</span>` : ""}
                      </div>
                    </div>
                    <div class="trip-actions">
                      ${
                          activeView === "ocultas"
                              ? `<button type="button" class="icon-btn restore-btn" aria-label="Restaurar" onclick="toggleStatus('${t.id}', 'restore', event)">${ICO.restore}</button>`
                              : `<button type="button" class="icon-btn hide-btn" aria-label="Ocultar" onclick="toggleStatus('${t.id}', 'hide', event)">${ICO.hide}</button>
                                 <button type="button" class="icon-btn terminal-btn ${state.status === "en_terminal" ? "on" : ""}" aria-label="En Terminal" onclick="toggleStatus('${t.id}', 'en_terminal', event)">${ICO.terminal}</button>
                                 <button type="button" class="icon-btn formado-btn ${state.status === "formado" ? "on" : ""}" aria-label="Formado" onclick="toggleStatus('${t.id}', 'formado', event)">${ICO.formado}</button>`
                      }
                    </div>
                  </div>`;
            });
            html += `</div></div>`;
        }
        document.getElementById("list").innerHTML = html;
        if (typeof actualizarUrgenciaVisual === "function") actualizarUrgenciaVisual();
    };

    // =========================================================================
    // 5. PANEL DE CONFIGURACIÓN MEJORADO (ESTADO DE TELÉFONOS G3/H3 Y MODO VISTA)
    // =========================================================================
    window.abrirConfiguracion = function () {
        const trips = store.days?.[store.currentDay]?.trips || [];
        const totalHist = typeof getGlobalHistory === "function" ? getGlobalHistory().length : 0;
        const totalTaller = Object.keys(store.tallerDB || {}).length;
        const totalOpsActivos = Object.values(store.operadoresDB || {}).filter(op =>
            isOperadorActivo(op)
        ).length;

        let opsConTel = 0;
        Object.values(store.operadoresDB || {}).forEach(opName => {
            let m = window.getOpMeta(opName);
            if (m.tel) opsConTel++;
        });

        const isPcMode = document.body.classList.contains("pc-view");

        openSheet(`<h2>⚙️ Configuración y Nube</h2>
          <div style="background:var(--surface-2);padding:12px;border-radius:12px;font-size:13px;line-height:1.75;margin-bottom:12px">
            <b>Estado de Nube:</b> ${isConnectedToFirebase ? "🟢 Conectado en Tiempo Real" : "🟠 Modo Caché Local"}<br>
            <b>Fecha activa:</b> ${store.currentDay || "—"} (${trips.length} viajes)<br>
            <b>Operadores Activos:</b> ${totalOpsActivos} (${opsConTel} con teléfono G3/H3 automático)<br>
            <b>Unidades en Taller detectadas:</b> ${totalTaller} de ${FLOTA_FIJA.length}<br>
            <b>Historial Histórico:</b> ${totalHist} registro(s)
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            <button type="button" class="btn-outline" style="margin:0;padding:10px;font-size:13px;${!isPcMode ? "background:var(--accent);color:#fff;" : ""}" onclick="cambiarModoPantalla('mobile')">📱 Formato Teléfono</button>
            <button type="button" class="btn-outline" style="margin:0;padding:10px;font-size:13px;${isPcMode ? "background:var(--accent);color:#fff;" : ""}" onclick="cambiarModoPantalla('pc')">🖥️ Formato Escritorio</button>
          </div>

          <button type="button" class="btn-primary" style="background:var(--accent);margin-top:0;margin-bottom:12px;padding:12px;" onclick="closeSheet(); forzarSincronizacionNube();">🔄 Sincronizar Datos desde la Nube</button>

          <div style="background:var(--surface-2); padding:14px; border-radius:12px; margin-bottom:10px;">
            <strong style="display:block;margin-bottom:4px;">1. Subir Archivo: "datos" (Plantilla y Flota)</strong>
            <span style="font-size:12px;color:var(--ink-soft);">Carga automáticamente los teléfonos de <b>G3 (Personal)</b> y <b>H3 (Trabajo - Prioritario)</b>, Puntualidad (Col AS) y Taller.</span>
            <button type="button" class="btn-outline" onclick="document.getElementById('fileSeguimiento').click()">📂 Seleccionar Excel "datos"</button>
          </div>

          <div style="background:var(--surface-2); padding:14px; border-radius:12px; margin-bottom:10px;">
            <strong style="display:block;margin-bottom:4px;">2. Subir Archivo: "rol" (Acepta los 2 Formatos)</strong>
            <span style="font-size:12px;color:var(--ink-soft);">Compatible con el <b>Formato Clásico (Bloques HR)</b> y con el <b>Formato Nuevo (Plantilla Órdenes 24h)</b>.</span>
            <button type="button" class="btn-outline" onclick="document.getElementById('fileAsignacion').click()">📂 Seleccionar Excel "rol"</button>
          </div>

          <button type="button" class="btn-outline" style="margin:0 0 10px 0;" onclick="verTallerLeido()">🔧 Taller y unidades sin operador</button>
          <button type="button" class="btn-outline" style="margin:0 0 10px 0;" onclick="verInicialesSmart()">🚌 Iniciales (Smart)</button>
          <button type="button" class="btn-outline" style="margin:0 0 10px 0;" onclick="verFallasRol()">🔎 Fallas detectadas en rol</button>
          <button type="button" class="btn-outline" style="margin:0 0 10px 0;" onclick="stuVerTiempos()">⏱️ Tiempos de ruta (hoja RUTAS)</button>
          <button type="button" class="btn-outline" style="margin:0 0 10px 0;" onclick="stuEditarLetras()">🔤 Letras de estado (B, I, C, P, Pr, V)</button>
          <button type="button" class="btn-outline" style="margin:0 0 10px 0;" onclick="verConsumoDatos()">📊 ¿Qué gasta mis datos?</button>

          <div style="font-size:11px;color:var(--ink-soft);text-align:center;margin:0 0 8px;">Versión de la app: ${STU_VERSION}</div>
          <div id="uploadMsg" style="margin-top:10px;font-size:13.5px;font-weight:800;color:var(--accent);text-align:center;"></div>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cerrar</button>`);
    };

    // =========================================================================
    // 6. AVISOS ROJOS PERSISTENTES DE CAMBIOS (SE QUITAN A MANO, UNO POR UNO)
    //    - Cada cambio de ruta / horario / operador / unidad aparece como tarjeta roja.
    //    - No desaparece sola: hay que tocar "Entendido" en cada una.
    //    - Cada celular/computadora lleva su propia lista de avisos leídos.
    //    - Los cambios que haces tú en ESTE equipo ya se consideran leídos.
    // =========================================================================
    const ALERTAS_HORAS_VIGENCIA = 12;   // Solo se muestran cambios de las últimas 12 horas
    const ALERTAS_MAX_VISIBLES = 30;     // Máximo de tarjetas mostradas a la vez
    const ALERTAS_STORAGE_KEY = "stu_alertas_vistas_v1";

    let alertasVistasSet = null;
    let alertasUltimaFirma = null;

    function cargarAlertasVistas() {
        if (alertasVistasSet) return alertasVistasSet;
        let arr = [];
        try {
            const raw = JSON.parse(localStorage.getItem(ALERTAS_STORAGE_KEY) || "[]");
            if (Array.isArray(raw)) arr = raw;
        } catch (e) {
            arr = [];
        }
        alertasVistasSet = new Set(arr);
        return alertasVistasSet;
    }

    function guardarAlertasVistas() {
        try {
            const arr = Array.from(cargarAlertasVistas()).slice(-500);
            localStorage.setItem(ALERTAS_STORAGE_KEY, JSON.stringify(arr));
        } catch (e) {}
    }

    function marcarAlertaVista(id) {
        if (!id) return;
        cargarAlertasVistas().add(String(id));
        guardarAlertasVistas();
    }

    function escHtml(v) {
        return String(v === null || v === undefined ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function nombreOperadorAviso(v) {
        const s = String(v || "").trim();
        if (!s || s === "VACIO" || s === "—") return "Sin asignar";
        return s;
    }

    function nombreUnidadAviso(v) {
        const s = String(v || "").trim();
        if (!s || s === "VACIO" || s === "S/U" || s === "—") return "S/U";
        return /^U-/i.test(s) ? s : "U-" + s;
    }

    function horaDelAviso(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    function obtenerAlertasPendientes() {
        const hist = Array.isArray(store.globalHistory) ? store.globalHistory : [];
        const vistas = cargarAlertasVistas();
        const limite = Date.now() - ALERTAS_HORAS_VIGENCIA * 3600 * 1000;
        const out = [];
        (hist || []).forEach(h => {
            if (!h || !h.id) return;
            if (vistas.has(String(h.id))) return;
            const ts = Number(h.changeAt) || Date.parse(h.time) || 0;
            if (!ts || ts < limite) return;
            out.push({ h: h, ts: ts });
        });
        out.sort((a, b) => b.ts - a.ts);
        return out;
    }

    function inyectarEstilosAlertas() {
        if (document.getElementById("stu-extras-alert-styles")) return;
        const st = document.createElement("style");
        st.id = "stu-extras-alert-styles";
        st.textContent = `
            #stuAlertDock { margin: 0 10px; }
            #stuAlertDock:empty { display: none; }
            .stu-alert-head {
                background: #7F1020;
                color: #FFFFFF;
                font-weight: 800;
                font-size: 13px;
                padding: 8px 12px;
                border-radius: 10px;
                margin: 8px 0 6px 0;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .stu-alert-card {
                background: #D81A32;
                color: #FFFFFF;
                border-radius: 12px;
                padding: 10px 12px;
                margin-bottom: 8px;
                box-shadow: 0 4px 12px rgba(216, 26, 50, 0.35);
                font-size: 13px;
                line-height: 1.4;
            }
            .stu-alert-top {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                align-items: flex-start;
            }
            .stu-alert-route {
                font-weight: 800;
                font-size: 14.5px;
                word-break: break-word;
            }
            .stu-alert-time {
                font-weight: 700;
                font-size: 11.5px;
                opacity: 0.9;
                white-space: nowrap;
            }
            .stu-alert-line { margin-top: 3px; word-break: break-word; }
            .stu-alert-line b { font-weight: 800; }
            .stu-alert-motivo {
                margin-top: 5px;
                background: rgba(0, 0, 0, 0.18);
                border-radius: 8px;
                padding: 4px 8px;
                font-weight: 700;
            }
            .stu-alert-btn {
                margin-top: 8px;
                width: 100%;
                border: none;
                border-radius: 9px;
                padding: 9px 10px;
                background: #FFFFFF;
                color: #B01229;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
            }
            .stu-alert-btn:active { transform: scale(0.98); }
            .stu-alert-more {
                font-size: 12px;
                font-weight: 700;
                color: var(--ink-soft);
                text-align: center;
                margin: 0 0 8px 0;
            }
        `;
        document.head.appendChild(st);
    }

    function asegurarContenedorAlertas() {
        let dock = document.getElementById("stuAlertDock");
        if (dock) return dock;
        const list = document.getElementById("list");
        if (!list || !list.parentNode) return null;
        dock = document.createElement("div");
        dock.id = "stuAlertDock";
        list.parentNode.insertBefore(dock, list);
        dock.addEventListener("click", function (ev) {
            const btn = ev.target && ev.target.closest ? ev.target.closest("[data-alerta-id]") : null;
            if (!btn) return;
            ev.stopPropagation();
            marcarAlertaVista(btn.getAttribute("data-alerta-id"));
            window.actualizarAvisosRojos();
        });
        return dock;
    }

    window.actualizarAvisosRojos = function () {
        inyectarEstilosAlertas();
        const dock = asegurarContenedorAlertas();
        if (!dock) return;

        const pendientes = obtenerAlertasPendientes();
        const visibles = pendientes.slice(0, ALERTAS_MAX_VISIBLES);
        const firma = visibles.map(p => p.h.id).join("|") + "#" + pendientes.length;
        if (firma === alertasUltimaFirma) return;
        alertasUltimaFirma = firma;

        if (!visibles.length) {
            dock.innerHTML = "";
            return;
        }

        let html = `<div class="stu-alert-head">🚨 ${pendientes.length} cambio(s) sin leer. Toca "Entendido" en cada uno.</div>`;
        visibles.forEach(p => {
            const h = p.h;
            const ruta = escHtml(h.route || "Cambio");
            const horario = h.tripTime && h.tripTime !== "—" && h.tripTime !== "N/A" ? " · " + escHtml(h.tripTime) : "";
            html += `
              <div class="stu-alert-card">
                <div class="stu-alert-top">
                  <div class="stu-alert-route">${ruta}${horario}</div>
                  <div class="stu-alert-time">${escHtml(horaDelAviso(p.ts))}</div>
                </div>
                <div class="stu-alert-line"><b>Operador:</b> ${escHtml(nombreOperadorAviso(h.oldOp))} ➜ <b>${escHtml(nombreOperadorAviso(h.newOp || h.nombre))}</b></div>
                <div class="stu-alert-line"><b>Unidad:</b> ${escHtml(nombreUnidadAviso(h.oldUnit))} ➜ <b>${escHtml(nombreUnidadAviso(h.newUnit))}</b></div>
                ${h.scope ? `<div class="stu-alert-line"><b>Aplica a:</b> ${escHtml(h.scope)}</div>` : ""}
                <div class="stu-alert-motivo">Motivo: ${escHtml(h.reason || "Cambio operativo")}</div>
                <button type="button" class="stu-alert-btn" data-alerta-id="${escHtml(h.id)}">Entendido ✕</button>
              </div>`;
        });
        if (pendientes.length > visibles.length) {
            html += `<div class="stu-alert-more">Hay ${pendientes.length - visibles.length} aviso(s) más. Aparecerán al quitar estos.</div>`;
        }
        dock.innerHTML = html;
    };

    // Los cambios hechos en este mismo equipo cuentan como ya leídos
    function enlazarRegistroDeCambiosLocales() {
        if (typeof window.registrarEnHistorial !== "function") return;
        if (window.registrarEnHistorial._stuEnvuelta) return;
        const original = window.registrarEnHistorial;
        const envuelta = function () {
            const rec = original.apply(this, arguments);
            try {
                if (rec && rec.id) marcarAlertaVista(rec.id);
            } catch (e) {}
            return rec;
        };
        envuelta._stuEnvuelta = true;
        window.registrarEnHistorial = envuelta;
    }

    // Cada vez que la app se redibuja (cambio local, cambio de la nube, reloj) se actualizan los avisos
    function enlazarRenderConAvisos() {
        if (window.render && window.render._stuConAvisos) return;
        const renderBase = window.render;
        const renderConAvisos = function () {
            if (typeof renderBase === "function") renderBase.apply(this, arguments);
            try {
                window.actualizarAvisosRojos();
                programarActualizacionFallas();
            } catch (e) {
                console.error("Avisos rojos:", e);
            }
        };
        renderConAvisos._stuConAvisos = true;
        window.render = renderConAvisos;
    }

    // =========================================================================
    // 6B. CORRECCIÓN DE SINCRONIZACIÓN: LOS CAMBIOS DE OPERADOR / UNIDAD SÍ SE REFLEJAN
    //     Problema que había: al guardar "Todas las vueltas del día", el operador nuevo
    //     se guardaba con la clave del operador, pero la pantalla solo lo buscaba por
    //     unidad o por nombre. Resultado: avisaba el cambio pero no se veía.
    //     Orden de prioridad corregido (de mayor a menor):
    //       1) Cambio "solo este horario"  2) Cambio de operador (todas sus vueltas)
    //       3) Cambio hecho desde Flota (por unidad)  4) Lo planeado en el rol
    // =========================================================================
    window.resolveTripAssignment = function (t, ds, baselineOp) {
        const ovU = (ds && ds.unitOverride) || {};
        const ovO = (ds && ds.opOverride) || {};
        const tU = (ds && ds.tripUnitOverride) || {};
        const tO = (ds && ds.tripOpOverride) || {};

        const kOp = fbKey(t.k || t.n || "");
        const kU = fbKey(t.u || "");
        const overU = tU[t.id] || ovU[kOp] || ovU[t.k || t.n] || ovU[kU] || ovU[t.u];
        const finalUnit = overU === "VACIO" ? "" : overU || t.u || "";

        const baseOp = (baselineOp && baselineOp[String(finalUnit)]) || t.n || "";

        const kClave = t.k ? fbKey(t.k) : "";
        const kNombre = t.n ? fbKey(t.n) : "";
        const overOp =
            tO[t.id] ||
            (kClave && ovO[kClave]) ||
            (t.k && ovO[t.k]) ||
            (kNombre && ovO[kNombre]) ||
            (t.n && ovO[t.n]) ||
            ovO[fbKey(finalUnit)] ||
            ovO[finalUnit];
        const finalOp = overOp === "VACIO" ? "" : overOp || baseOp || "";

        return { unit: String(finalUnit || ""), op: String(finalOp || "") };
    };

    // Al editar desde Flota, el cambio debe impactar TODAS las vueltas planeadas de esa
    // unidad / ese operador (así lo dice el propio historial). Para que no lo tape un
    // cambio viejo, se limpian los cambios anteriores que chocan, antes de guardar.
    function instalarEnvolturaFlota() {
        if (typeof window.guardarFlotaDedicado !== "function") return;
        if (window.guardarFlotaDedicado._stuEnvuelta) return;
        const original = window.guardarFlotaDedicado;

        const nueva = function () {
            let huboLimpiezaPorViaje = false;
            try {
                const ctx = window._flotaCtx || {};
                const elU = document.getElementById("modalU");
                const elOp = document.getElementById("modalOp");
                const unidades = new Set();
                const operadores = new Set();
                const claves = new Set();

                [ctx.origU, elU && elU.value].forEach(v => {
                    if (v && v !== "VACIO") unidades.add(String(v));
                });
                [ctx.origOp, elOp && String(elOp.value || "").trim()].forEach(v => {
                    if (v && v !== "VACIO") operadores.add(String(v));
                });
                if (ctx.origK) claves.add(fbKey(ctx.origK));
                Object.keys(store.operadoresDB || {}).forEach(k => {
                    if (operadores.has(store.operadoresDB[k])) claves.add(fbKey(k));
                });

                const ds = getDayState();
                const trips = (store.days && store.days[store.currentDay] && store.days[store.currentDay].trips) || [];
                trips.forEach(t => {
                    const planeado =
                        (t.u && unidades.has(String(t.u))) ||
                        (t.n && operadores.has(String(t.n))) ||
                        (t.k && claves.has(fbKey(t.k)));
                    if (!planeado) return;

                    if (ds.tripUnitOverride && ds.tripUnitOverride[t.id] !== undefined) {
                        delete ds.tripUnitOverride[t.id];
                        huboLimpiezaPorViaje = true;
                    }
                    if (ds.tripOpOverride && ds.tripOpOverride[t.id] !== undefined) {
                        delete ds.tripOpOverride[t.id];
                        huboLimpiezaPorViaje = true;
                    }
                    if (t.k) {
                        delete ds.opOverride[fbKey(t.k)];
                        delete ds.opOverride[t.k];
                    }
                    if (t.n) {
                        delete ds.opOverride[fbKey(t.n)];
                        delete ds.opOverride[t.n];
                    }
                });
            } catch (e) {
                console.error("Limpieza previa de Flota:", e);
            }

            const resultado = original.apply(this, arguments);

            if (huboLimpiezaPorViaje) {
                try {
                    const dsFinal = getDayState();
                    const dKey = fbKey(store.currentDay);
                    savePatch({
                        [`state/${dKey}/tripUnitOverride`]: dsFinal.tripUnitOverride,
                        [`state/${dKey}/tripOpOverride`]: dsFinal.tripOpOverride
                    });
                } catch (e) {
                    console.error("Guardado de limpieza de Flota:", e);
                }
            }
            return resultado;
        };
        nueva._stuEnvuelta = true;
        window.guardarFlotaDedicado = nueva;
    }
    instalarEnvolturaFlota();

    // =========================================================================
    // 6C. FALLAS DETECTADAS EN ROL (AUDITORÍA AUTOMÁTICA DEL DÍA)
    //     Compara el rol del día contra los DATOS de operadores y la flota, y avisa:
    //       🔴 Críticas: unidad en taller/falla, operador baja/turismo/falta/permiso,
    //          unidad que no existe en la flota, viajes sin unidad o sin operador.
    //       🟠 Revisar: el rol trae un operador distinto al que datos tiene para esa unidad,
    //          operador con más de una unidad en el día, unidad con más de un
    //          operador (la asignación es de todo el día), operador/clave que no existe
    //          en datos, y Zacachimalpa (revisión especial).
    //       🔵 Datos: el rol trae una unidad/operador distinto al de datos, y datos repetidos.
    // =========================================================================
    const AUDIT_ZACA_REGEX = /zacach/i;
    const AUDIT_SEV_ORDEN = { alta: 0, media: 1, info: 2 };

    function auditEtiquetaViaje(t) {
        return { id: t.id, h: t.h || "", k: t.k || "", ruta: formatRouteName(t.o, t.d), zaca: AUDIT_ZACA_REGEX.test(String(t.o || "") + " " + String(t.d || "")) };
    }

    window.auditarRol = function () {
        const dia = store.days && store.days[store.currentDay];
        const trips = dia && Array.isArray(dia.trips) ? dia.trips : [];
        const ds = getDayState();
        const baselineOp = {};
        (store.globalFleet || []).forEach(g => {
            if (g && g.u && g.n) baselineOp[String(g.u)] = g.n;
        });
        const ignoradasSet = new Set(Array.isArray(ds.auditIgnored) ? ds.auditIgnored : Object.values(ds.auditIgnored || {}));
        const opsDB = store.operadoresDB || {};
        const nombresDB = new Set(Object.values(opsDB));
        const datosCargados = Object.keys(opsDB).length > 0;

        const mapa = {};
        function agregar(tipo, entidad, sev, titulo, detalle, viaje) {
            const id = tipo + "|" + entidad;
            if (!mapa[id]) mapa[id] = { id: id, tipo: tipo, sev: sev, titulo: titulo, detalle: detalle, viajes: [], zaca: false };
            if (viaje) {
                mapa[id].viajes.push(viaje);
                if (viaje.zaca) mapa[id].zaca = true;
            }
            return mapa[id];
        }

        const unidadesDeOp = {};
        const opsDeUnidad = {};
        const parejas = {};
        const zacaViajes = [];

        trips.forEach(t => {
            const asg = resolveTripAssignment(t, ds, baselineOp);
            const u = String(asg.unit || "");
            const op = String(asg.op || "");
            const v = auditEtiquetaViaje(t);
            v.u = u;
            v.op = op;
            if (v.zaca) zacaViajes.push({ v: v, t: t });

            if (!u) agregar("sin_unidad", "dia", "alta", "Viajes sin unidad asignada", "Hay viajes sin ninguna unidad.", v);
            if (!op) agregar("sin_operador", "dia", "alta", "Viajes sin operador asignado", "Hay viajes sin ningún operador.", v);

            // La nómina (clave) del rol NO existe en datos: la app "adivina" al operador por la unidad
            if (datosCargados && t.k && !opsDB[fbKey(t.k)] && asg.op === String(t.n || "")) {
                agregar(
                    "clave_inexistente",
                    String(t.k),
                    "alta",
                    `La clave ${t.k} no existe en datos`,
                    `El rol trae la nómina ${t.k}, pero no está en los datos de operadores.` + (op ? ` La app está mostrando a ${op}${u ? " (por la unidad U-" + u + ")" : ""}.` : ""),
                    v
                );
            }

            // El rol dice un operador, pero en DATOS esa unidad es de otro (y la app muestra el de datos)
            const planU = String(t.u || "");
            const planOp = String(t.n || "");
            if (datosCargados && planU && planOp && baselineOp[planU] && baselineOp[planU] !== planOp && asg.unit === planU && asg.op === baselineOp[planU]) {
                agregar(
                    "rol_vs_datos",
                    planOp + "||" + planU,
                    "media",
                    `Rol: ${planOp} en U-${planU}`,
                    `El rol trae a ${planOp} en la U-${planU}, pero en datos esa unidad es de ${baselineOp[planU]}. La app está mostrando a ${baselineOp[planU]}.`,
                    v
                );
            }

            if (u && store.datosRegla === "v2" && (store.unidadesFaltantes || []).map(String).includes(u) && !isUnidadEnTallerOInhabil(u)) {
                agregar("unidad_faltante_en_rol", u, "media", `U-${u} no tiene operador en datos`, "Está en Unidades Faltantes de datos, pero el rol la usa.", v);
            }
            if (u) {
                if (isUnidadEnTallerOInhabil(u)) {
                    const mot = getMotivoUnidad(u) || "No disponible";
                    agregar("unidad_no_disp", u, "alta", `U-${u} no disponible`, `Motivo: ${mot}. No debería tener viajes.`, v);
                }
                if (!FLOTA_SET.has(u)) {
                    agregar("unidad_inexistente", u, "alta", `U-${u} no existe en la flota`, "Revisa si está mal escrita (la flota va de la 8002 a la 8127).", v);
                }
                if (!unidadesDeOp[op || "∅"]) unidadesDeOp[op || "∅"] = {};
                if (op) {
                    unidadesDeOp[op][u] = (unidadesDeOp[op][u] || 0) + 1;
                    if (!opsDeUnidad[u]) opsDeUnidad[u] = {};
                    opsDeUnidad[u][op] = (opsDeUnidad[u][op] || 0) + 1;
                    parejas[op + "||" + u] = { op: op, u: u, viajes: (parejas[op + "||" + u] ? parejas[op + "||" + u].viajes : []).concat([v]) };
                }
            }

            if (op) {
                if (!isOperadorActivo(op)) {
                    const m = getOpMeta(op);
                    let motivo = "No disponible";
                    if (m.esTurismo) motivo = "Apoyo de Turismo";
                    else if (m.esBaja || (m.puntualidad !== null && m.puntualidad <= 0)) motivo = "Baja / puntualidad 0";
                    else motivo = getReasonForEntity(op) || motivo;
                    agregar("op_no_disp", op, "alta", `${op} no disponible`, `Motivo: ${motivo}. No debería tener viajes.`, v);
                }
                if (datosCargados && !nombresDB.has(op)) {
                    const det = t.k ? `La clave ${t.k} no existe en los datos de operadores.` : "Este operador no está en los datos de operadores.";
                    agregar("op_fuera_datos", op, "media", `${op} no está en datos`, det, v);
                }
            }
        });

        // La asignación es de todo el día: un operador = una unidad, una unidad = un operador
        Object.keys(unidadesDeOp).forEach(op => {
            if (op === "∅") return;
            const us = Object.keys(unidadesDeOp[op]);
            if (us.length > 1) {
                const det = us.map(x => `U-${x} (${unidadesDeOp[op][x]} viajes)`).join(" y ");
                const f = agregar("op_varias_unidades", op, "media", `${op} usa ${us.length} unidades`, `En el día aparece en: ${det}.`, null);
                trips.forEach(t => {
                    const a = resolveTripAssignment(t, ds, baselineOp);
                    if (a.op === op) {
                        const v = auditEtiquetaViaje(t);
                        v.u = a.unit;
                        v.op = a.op;
                        f.viajes.push(v);
                        if (v.zaca) f.zaca = true;
                    }
                });
            }
        });
        Object.keys(opsDeUnidad).forEach(u => {
            const ops = Object.keys(opsDeUnidad[u]);
            if (ops.length > 1) {
                const det = ops.map(x => `${x} (${opsDeUnidad[u][x]} viajes)`).join(" y ");
                const f = agregar("unidad_varios_ops", u, "media", `U-${u} la manejan ${ops.length} operadores`, `En el día aparece con: ${det}.`, null);
                trips.forEach(t => {
                    const a = resolveTripAssignment(t, ds, baselineOp);
                    if (a.unit === u) {
                        const v = auditEtiquetaViaje(t);
                        v.u = a.unit;
                        v.op = a.op;
                        f.viajes.push(v);
                        if (v.zaca) f.zaca = true;
                    }
                });
            }
        });

        // Rol del día contra datos (unidad planeada de cada operador)
        if (datosCargados) {
            Object.keys(parejas).forEach(key => {
                const p = parejas[key];
                const meta = (store.operadoresMeta && (store.operadoresMeta[fbKey(p.op)] || store.operadoresMeta[p.op])) || {};
                const unidadDatos = String(meta.u || "");
                const opDatos = baselineOp[p.u] || "";
                const partes = [];
                if (unidadDatos && unidadDatos !== p.u) partes.push(`En datos ${p.op} tiene la U-${unidadDatos}; hoy va en la U-${p.u}.`);
                if (opDatos && opDatos !== p.op) partes.push(`En datos la U-${p.u} es de ${opDatos}; hoy la lleva ${p.op}.`);
                if (partes.length) {
                    const f = agregar("distinta_datos", key, "info", `${p.op} en U-${p.u}`, partes.join(" "), null);
                    p.viajes.forEach(v => {
                        f.viajes.push(v);
                        if (v.zaca) f.zaca = true;
                    });
                }
            });

            // Datos mal capturados: mismo nombre con dos claves, o una unidad con dos operadores
            const clavesPorNombre = {};
            Object.keys(opsDB).forEach(k => {
                const n = opsDB[k];
                if (!clavesPorNombre[n]) clavesPorNombre[n] = [];
                clavesPorNombre[n].push(k);
            });
            Object.keys(clavesPorNombre).forEach(n => {
                if (clavesPorNombre[n].length > 1) {
                    agregar("datos_nombre_repetido", n, "info", `${n} está repetido en datos`, `Aparece con ${clavesPorNombre[n].length} claves: ${clavesPorNombre[n].join(", ")}.`, null);
                }
            });
            const nombresPorUnidad = {};
            (store.globalFleet || []).forEach(g => {
                if (g && g.u && g.n) {
                    if (!nombresPorUnidad[g.u]) nombresPorUnidad[g.u] = new Set();
                    nombresPorUnidad[g.u].add(g.n);
                }
            });
            Object.keys(nombresPorUnidad).forEach(u => {
                if (nombresPorUnidad[u].size > 1) {
                    agregar("datos_unidad_repetida", u, "info", `U-${u} está con varios operadores en datos`, `En datos aparece con: ${Array.from(nombresPorUnidad[u]).join(", ")}.`, null);
                }
            });
        }

        // Zacachimalpa: revisión especial
        if (zacaViajes.length) {
            const porHoraYSentido = {};
            const porSentido = {};
            zacaViajes.forEach(z => {
                const sentido = normLoc(z.t.o) + " ➜ " + normLoc(z.t.d);
                const clave = z.v.h + "|" + sentido;
                if (!porHoraYSentido[clave]) porHoraYSentido[clave] = [];
                porHoraYSentido[clave].push(z.v);
                porSentido[sentido] = (porSentido[sentido] || 0) + 1;
            });
            Object.keys(porHoraYSentido).forEach(clave => {
                if (porHoraYSentido[clave].length > 1) {
                    const partes = clave.split("|");
                    const f = agregar("zaca_horario_repetido", clave, "media", `Zacachimalpa: horario repetido ${partes[0]}`, `Hay ${porHoraYSentido[clave].length} viajes ${partes[1]} a la misma hora.`, null);
                    porHoraYSentido[clave].forEach(v => f.viajes.push(v));
                    f.zaca = true;
                }
            });
            const sentidos = Object.keys(porSentido);
            if (sentidos.length === 1) {
                const f = agregar("zaca_un_sentido", "dia", "media", "Zacachimalpa: solo hay un sentido", `Todos los viajes son ${sentidos[0]}; no hay viajes en sentido contrario.`, null);
                zacaViajes.forEach(z => f.viajes.push(z.v));
                f.zaca = true;
            } else if (sentidos.length >= 2) {
                const cuentas = sentidos.map(s => porSentido[s]);
                if (Math.max.apply(null, cuentas) !== Math.min.apply(null, cuentas)) {
                    const det = sentidos.map(s => `${s}: ${porSentido[s]}`).join(" · ");
                    const f = agregar("zaca_desbalance", "dia", "media", "Zacachimalpa: salidas y regresos no cuadran", det, null);
                    zacaViajes.forEach(z => f.viajes.push(z.v));
                    f.zaca = true;
                }
            }
        }

        Object.keys(mapa).forEach(id => {
            const f = mapa[id];
            if (f.tipo === "unidad_faltante_en_rol") {
                const ops = Array.from(new Set(f.viajes.map(v => v.op).filter(Boolean)));
                f.detalle = "Está en Unidades Faltantes de datos (sin operador), pero el rol la usa" + (ops.length ? " con: " + ops.join(", ") : "") + ".";
            }
        });

        let fallas = Object.keys(mapa).map(k => mapa[k]);
        fallas.forEach(f => f.viajes.sort((a, b) => String(a.h).localeCompare(String(b.h))));
        const cantIgnoradas = fallas.filter(f => ignoradasSet.has(f.id)).length;
        fallas = fallas.filter(f => !ignoradasSet.has(f.id));
        fallas.sort((a, b) => {
            return (AUDIT_SEV_ORDEN[a.sev] - AUDIT_SEV_ORDEN[b.sev]) || ((b.zaca ? 1 : 0) - (a.zaca ? 1 : 0)) || (b.viajes.length - a.viajes.length);
        });

        zacaViajes.sort((a, b) => String(a.v.h).localeCompare(String(b.v.h)));
        return {
            fallas: fallas,
            ignoradas: cantIgnoradas,
            zaca: zacaViajes.map(z => z.v),
            datosCargados: datosCargados,
            totalViajes: trips.length
        };
    };

    function inyectarEstilosFallas() {
        if (document.getElementById("stu-extras-audit-styles")) return;
        const st = document.createElement("style");
        st.id = "stu-extras-audit-styles";
        st.textContent = `
            #btnFallasRol { position: relative; font-size: 18px; line-height: 1; }
            #btnFallasRol .stu-fallas-badge {
                position: absolute; top: -4px; right: -4px; min-width: 17px; height: 17px; padding: 0 4px;
                border-radius: 9px; background: #D81A32; color: #fff; font-size: 10.5px; font-weight: 800;
                display: none; align-items: center; justify-content: center; box-sizing: border-box;
            }
            .stu-falla { border-radius: 12px; padding: 11px 12px; margin-bottom: 10px; background: var(--surface-2); border-left: 5px solid #888; }
            .stu-falla.alta { border-left-color: #D81A32; }
            .stu-falla.media { border-left-color: #E8890C; }
            .stu-falla.info { border-left-color: #00509d; }
            .stu-falla-titulo { font-weight: 800; font-size: 14px; word-break: break-word; }
            .stu-falla-det { font-size: 12.5px; color: var(--ink-soft); margin-top: 3px; line-height: 1.4; }
            .stu-falla-horas { font-size: 12px; margin-top: 6px; font-weight: 700; word-break: break-word; }
            .stu-falla-acc { display: flex; gap: 8px; margin-top: 9px; }
            .stu-falla-acc button { flex: 1; margin: 0; padding: 9px 8px; font-size: 13px; border-radius: 9px; }
            .stu-tag-zaca { background: #6a1b9a; color: #fff; border-radius: 6px; padding: 1px 6px; font-size: 10.5px; font-weight: 800; margin-left: 6px; }
            .stu-chip-sev { display: inline-block; border-radius: 8px; padding: 3px 8px; font-size: 12px; font-weight: 800; margin: 0 6px 6px 0; }
        `;
        document.head.appendChild(st);
    }

    function injectFallasButton() {
        const rightBar = document.querySelector(".appbar-right");
        if (!rightBar || document.getElementById("btnFallasRol")) return;
        inyectarEstilosFallas();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "btnFallasRol";
        btn.className = "fullscreen-btn-top";
        btn.title = "Fallas detectadas en rol";
        btn.setAttribute("aria-label", "Fallas detectadas en rol");
        btn.innerHTML = `🔎<span class="stu-fallas-badge">0</span>`;
        btn.onclick = function () {
            window.verFallasRol();
        };
        rightBar.insertBefore(btn, rightBar.firstChild);
    }

    let fallasTimer = null;
    function programarActualizacionFallas() {
        if (fallasTimer) return;
        fallasTimer = setTimeout(function () {
            fallasTimer = null;
            try {
                const btn = document.getElementById("btnFallasRol");
                if (!btn) return;
                const r = window.auditarRol();
                const n = r.fallas.filter(f => f.sev !== "info").length;
                const b = btn.querySelector(".stu-fallas-badge");
                if (b) {
                    b.textContent = n > 99 ? "99+" : String(n);
                    b.style.display = n > 0 ? "flex" : "none";
                }
            } catch (e) {
                console.error("Fallas en rol:", e);
            }
        }, 700);
    }

    function horasDeFalla(f) {
        const horas = f.viajes.map(v => v.h).filter(Boolean);
        const unicas = Array.from(new Set(horas));
        const lista = unicas.slice(0, 8).join(", ");
        return unicas.length > 8 ? `${lista} y ${unicas.length - 8} más` : lista;
    }

    window.verFallasRol = function () {
        inyectarEstilosFallas();
        const r = window.auditarRol();
        window._auditUltimo = r;
        const nAlta = r.fallas.filter(f => f.sev === "alta").length;
        const nMedia = r.fallas.filter(f => f.sev === "media").length;
        const nInfo = r.fallas.filter(f => f.sev === "info").length;

        let html = `<h2>🔎 Fallas detectadas en rol</h2>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">Día: <b>${escHtml(store.currentDay)}</b> · ${r.totalViajes} viajes revisados</div>
          ${stuResumenTallerHtml()}
          <div>
            <span class="stu-chip-sev" style="background:#fde7ea;color:#B01229;">🔴 ${nAlta} críticas</span>
            <span class="stu-chip-sev" style="background:#fff0dc;color:#9a5a00;">🟠 ${nMedia} por revisar</span>
            <span class="stu-chip-sev" style="background:#e3eefb;color:#00509d;">🔵 ${nInfo} de datos</span>
          </div>`;

        if (!r.totalViajes) {
            html += `<div style="padding:14px;background:var(--surface-2);border-radius:12px;font-size:13.5px;">No hay rol cargado para revisar.</div>`;
        } else if (!r.datosCargados) {
            html += `<div style="padding:10px 12px;background:#fff4d6;color:#7a5b00;border-radius:12px;font-size:12.5px;margin-bottom:10px;">Aún no hay datos de operadores cargados: las revisiones contra datos se omiten. Sube tu archivo de datos para revisar claves, bajas y unidades.</div>`;
        }

        if (r.totalViajes && !r.fallas.length) {
            html += `<div style="padding:14px;background:var(--done-bg);color:var(--done);border-radius:12px;font-weight:800;font-size:14px;">✅ No se detectaron fallas en el rol de hoy.</div>`;
        }

        r.fallas.forEach((f, i) => {
            const horas = horasDeFalla(f);
            const etiqueta = f.sev === "alta" ? "🔴" : f.sev === "media" ? "🟠" : "🔵";
            html += `<div class="stu-falla ${f.sev}">
                <div class="stu-falla-titulo">${etiqueta} ${escHtml(f.titulo)}${f.zaca ? `<span class="stu-tag-zaca">ZACACHIMALPA</span>` : ""}</div>
                <div class="stu-falla-det">${escHtml(f.detalle)}</div>
                ${horas ? `<div class="stu-falla-horas">Horarios: ${escHtml(horas)}</div>` : ""}
                <div class="stu-falla-acc">
                  ${f.viajes.length ? `<button type="button" class="btn-outline" onclick="auditCorregir(${i})">Corregir</button>` : ""}
                  <button type="button" class="btn-outline" style="color:var(--ink-soft);border-color:var(--ink-faint);" onclick="auditIgnorar(${i})">Ignorar hoy</button>
                </div>
              </div>`;
        });

        if (r.zaca.length) {
            const filas = r.zaca
                .map(v => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--line);">
                    <b>${escHtml(v.h)}</b><span style="flex:1;">${escHtml(v.ruta)}</span><span>${v.u ? "U-" + escHtml(v.u) : "S/U"} · ${escHtml(v.op || "Sin op.")}</span></div>`)
                .join("");
            html += `<details style="margin:6px 0 12px;background:var(--surface-2);border-radius:12px;padding:10px 12px;">
                <summary style="font-weight:800;font-size:13.5px;cursor:pointer;">Zacachimalpa: ${r.zaca.length} viajes para revisar a mano</summary>
                <div style="margin-top:8px;">${filas}</div></details>`;
        }

        if (r.ignoradas) {
            html += `<button type="button" class="btn-outline" style="margin:4px 0 8px;" onclick="auditRestaurar()">Mostrar de nuevo las ${r.ignoradas} ignoradas</button>`;
        }
        html += `<button type="button" class="btn-outline" onclick="closeSheet()">Cerrar</button>`;
        openSheet(html);
    };

    window.auditCorregir = function (i) {
        const r = window._auditUltimo;
        const f = r && r.fallas[i];
        if (!f || !f.viajes.length) return;
        const v = f.viajes[0];
        if (typeof window.abrirModalDesdePendientes === "function") {
            window.abrirModalDesdePendientes(v.id, v.u || "", v.op || "", v.k || "");
        }
    };

    window.auditIgnorar = function (i) {
        const r = window._auditUltimo;
        const f = r && r.fallas[i];
        if (!f) return;
        const ds = getDayState();
        ds.auditIgnored = Array.isArray(ds.auditIgnored) ? ds.auditIgnored : Object.values(ds.auditIgnored || {});
        if (!ds.auditIgnored.includes(f.id)) ds.auditIgnored.push(f.id);
        savePatch({ [`state/${fbKey(store.currentDay)}/auditIgnored`]: ds.auditIgnored });
        window.verFallasRol();
        programarActualizacionFallas();
    };

    window.auditRestaurar = function () {
        const ds = getDayState();
        ds.auditIgnored = [];
        savePatch({ [`state/${fbKey(store.currentDay)}/auditIgnored`]: [] });
        window.verFallasRol();
        programarActualizacionFallas();
    };

    // =========================================================================
    // 6D. INICIALES (SMART): RUTAS "INICIAL" SIN OPERADOR + FALLAS DEL ROL DE SMART
    //     - Se sube el Excel "Monitor" que programa tu jefe en Smart.
    //     - Las filas INICIAL casi nunca traen operador/unidad. Aquí se sugiere quién
    //       las hace, en este orden de confianza:
    //         1) Tu rol de la app (misma ruta y hora parecida)
    //         2) Quien maneja esa misma unidad en otros viajes de Smart
    //         3) Quien hace esa misma ruta a otras horas
    //       Siempre descartando a quien ya está ocupado en otro viaje a esa hora.
    //     - También revisa el rol de Smart: operador baja/no existe en datos, unidad en
    //       taller, traslapes del mismo operador o unidad, un operador con varias unidades.
    //     - El archivo se guarda en ESTE equipo (no se sube a la nube, no gasta datos).
    // =========================================================================
    const SMART_KEY = "stu_smart_v1";
    const SMART_STOP = new Set(["ENTRADA", "SALIDA", "ADMINISTRATIVA", "12X12", "ALIMENTADORA", "CENTRAL"]);
    const SMART_TOLERANCIA_ROL_MIN = 15;
    const SMART_TRASLAPE_MIN = 5;
    let smartDatos = null;

    function smartNorm(s) {
        return String(s === null || s === undefined ? "" : s)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z0-9 ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function smartTokens(s) {
        return smartNorm(s).split(" ").filter(w => w.length >= 4 && !SMART_STOP.has(w));
    }

    // Convierte la celda de fecha (número de Excel, fecha o texto) en "minutos" comparables
    function smartEpoch(v) {
        if (v === null || v === undefined || v === "") return null;
        if (v instanceof Date) {
            return Math.round((Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes()) / 86400000 + 25569) * 1440);
        }
        if (typeof v === "number") return Math.round(v * 1440);
        const txt = String(v).trim();
        let m = txt.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})/);
        if (m) return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 86400000 + 25569) * 1440);
        m = txt.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})[ T](\d{1,2}):(\d{2})/);
        if (m) return Math.round((Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) / 86400000 + 25569) * 1440);
        return null;
    }

    function smartMinDia(e) {
        return ((e % 1440) + 1440) % 1440;
    }

    function smartHHMM(e) {
        const mm = smartMinDia(e);
        return String(Math.floor(mm / 60)).padStart(2, "0") + ":" + String(mm % 60).padStart(2, "0");
    }

    function smartFechaTexto(e) {
        try {
            return new Date((Math.floor(e / 1440) - 25569) * 86400000).toISOString().slice(0, 10);
        } catch (err) {
            return "";
        }
    }

    // Nombres de Smart ("Nombre Apellido Apellido") contra datos, sin importar orden o acentos
    function smartMismoNombre(aN, bN) {
        if (!aN || !bN) return false;
        if (aN === bN) return true;
        const ta = aN.split(" ").filter(w => w.length >= 2);
        const tb = bN.split(" ").filter(w => w.length >= 2);
        if (!ta.length || !tb.length) return false;
        let inter = 0;
        ta.forEach(a => {
            if (tb.some(b => b === a || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))))) inter++;
        });
        return inter >= 2 && inter >= Math.min(ta.length, tb.length);
    }

    function smartGuardar() {
        try {
            if (!smartDatos) {
                localStorage.removeItem(SMART_KEY);
                return;
            }
            const compacto = {
                v: 1,
                nombre: smartDatos.nombre,
                fecha: smartDatos.fecha,
                ignoradas: smartDatos.ignoradas || [],
                filas: smartDatos.filas.map(f => [f.est, f.no, f.cta, f.ruta, f.ini, f.fin, f.mod, f.op, f.veh, f.vehTxt])
            };
            localStorage.setItem(SMART_KEY, JSON.stringify(compacto));
        } catch (e) {}
    }

    function smartFila(a) {
        const op = String(a[7] || "").replace(/\s+/g, " ").trim();
        return {
            est: a[0], no: a[1], cta: a[2], ruta: a[3], rutaN: smartNorm(a[3]), ini: a[4], fin: a[5], mod: a[6],
            op: op, opN: smartNorm(op), veh: a[8] || "", vehTxt: a[9] || ""
        };
    }

    function smartCargarGuardado() {
        try {
            const raw = JSON.parse(localStorage.getItem(SMART_KEY) || "null");
            if (raw && Array.isArray(raw.filas)) {
                smartDatos = { nombre: raw.nombre || "Rol de Smart", fecha: raw.fecha || "", ignoradas: raw.ignoradas || [], filas: raw.filas.map(smartFila) };
            }
        } catch (e) {
            smartDatos = null;
        }
    }

    // Lee la tabla del Excel (lista de renglones) y la convierte en filas limpias
    window.smartCargarDesdeTabla = function (grid, nombreArchivo) {
        let h = -1;
        for (let r = 0; r < Math.min(grid.length, 15); r++) {
            if ((grid[r] || []).some(c => smartNorm(c) === "FECHA INICIAL")) {
                h = r;
                break;
            }
        }
        if (h < 0) throw new Error("No encontré las columnas del Monitor de Smart (Fecha Inicial, Operador, Vehículo).");
        const head = grid[h].map(smartNorm);
        const col = re => head.findIndex(x => re.test(x));
        const cNo = col(/^NO$/);
        const cRuta = col(/^RUTA$/);
        const cFi = col(/^FECHA INICIAL$/);
        const cFf = col(/^FECHA FINAL$/);
        const cMod = col(/^MODELO$/);
        const cOp = col(/^OPERADOR$/);
        const cVeh = col(/^VEHICULO$/);
        const cCta = col(/^CUENTA$/);
        const cEst = cNo > 0 ? cNo - 1 : 0;
        if (cRuta < 0 || cFi < 0 || cOp < 0 || cVeh < 0) throw new Error("Faltan columnas en el archivo (Ruta, Fecha Inicial, Operador o Vehículo).");

        const filas = [];
        for (let r = h + 1; r < grid.length; r++) {
            const row = grid[r] || [];
            const ruta = row[cRuta];
            if (ruta === null || ruta === undefined || String(ruta).trim() === "") continue;
            const ini = smartEpoch(row[cFi]);
            if (ini === null) continue;
            let fin = cFf >= 0 ? smartEpoch(row[cFf]) : null;
            if (fin === null || fin < ini) fin = ini + 60;
            const vehTxt = String(row[cVeh] === null || row[cVeh] === undefined ? "" : row[cVeh]).trim();
            const mv = vehTxt.match(/^(\d+)\s*-/);
            filas.push(
                smartFila([
                    String(row[cEst] || "").trim().toUpperCase(),
                    cNo >= 0 ? row[cNo] : "",
                    cCta >= 0 ? String(row[cCta] || "").trim() : "",
                    String(ruta).trim(),
                    ini,
                    fin,
                    cMod >= 0 ? String(row[cMod] || "").trim().toUpperCase() : "",
                    String(row[cOp] || ""),
                    mv ? mv[1] : "",
                    vehTxt
                ])
            );
        }
        if (!filas.length) throw new Error("El archivo no trae viajes legibles.");
        smartDatos = { nombre: nombreArchivo || "Rol de Smart", fecha: smartFechaTexto(filas[0].ini), ignoradas: [], filas: filas };
        smartGuardar();
        return smartDatos;
    };

    function smartMotivoOp(nombre) {
        const m = getOpMeta(nombre);
        if (m.esTurismo) return "Apoyo de Turismo";
        if (m.esBaja || (m.puntualidad !== null && m.puntualidad <= 0)) return "Baja / puntualidad 0";
        return getReasonForEntity(nombre) || "No disponible";
    }

    function smartSolapa(a, b) {
        return Math.min(a.fin, b.fin) - Math.max(a.ini, b.ini) > SMART_TRASLAPE_MIN;
    }

    function smartAnalizar() {
        const d = smartDatos;
        if (!d) return null;
        const filas = d.filas.filter(f => f.est !== "CANCELADA");
        const canceladas = d.filas.length - filas.length;
        const ignoradas = new Set(d.ignoradas || []);
        const opsDB = store.operadoresDB || {};
        const datosCargados = Object.keys(opsDB).length > 0;
        const datosNombres = Array.from(new Set(Object.values(opsDB))).map(n => ({ n: n, nN: smartNorm(n) }));

        // ¿Cómo se llama este operador en datos y está disponible?
        const cacheEstado = {};
        function estadoOp(opN) {
            if (!datosCargados) return { enDatos: null };
            if (cacheEstado[opN]) return cacheEstado[opN];
            let hallados = datosNombres.filter(x => x.nN === opN);
            if (!hallados.length) hallados = datosNombres.filter(x => smartMismoNombre(opN, x.nN));
            const unicos = Array.from(new Set(hallados.map(x => x.n)));
            let r;
            if (!unicos.length) r = { enDatos: false };
            else if (unicos.length > 1) r = { enDatos: true, ambiguo: true, activo: true };
            else {
                const nombre = unicos[0];
                const meta = (store.operadoresMeta && (store.operadoresMeta[fbKey(nombre)] || store.operadoresMeta[nombre])) || {};
                const activo = isOperadorActivo(nombre);
                r = { enDatos: true, nombre: nombre, activo: activo, motivo: activo ? "" : smartMotivoOp(nombre), unidadDatos: String(meta.u || "") };
            }
            cacheEstado[opN] = r;
            return r;
        }

        function unidadHabitual(opN) {
            const cuenta = {};
            filas.forEach(f => {
                if (f.veh && f.opN && smartMismoNombre(f.opN, opN)) cuenta[f.veh] = (cuenta[f.veh] || 0) + 1;
            });
            const ks = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
            return ks[0] || "";
        }

        function ocupado(opN, fila) {
            return filas.find(x => x !== fila && x.opN && smartMismoNombre(x.opN, opN) && smartSolapa(x, fila)) || null;
        }

        // ---- 1) Viajes de TU rol (app) parecidos a la ruta INICIAL ----
        function candidatosRol(fila) {
            const dia = store.days && store.days[store.currentDay];
            const trips = dia && Array.isArray(dia.trips) ? dia.trips : [];
            if (!trips.length) return [];
            const ds = getDayState();
            const baselineOp = {};
            (store.globalFleet || []).forEach(g => {
                if (g && g.u && g.n) baselineOp[String(g.u)] = g.n;
            });
            const sig = smartTokens(fila.ruta);
            if (!sig.length) return [];
            const minFila = smartMinDia(fila.ini);
            const out = [];
            trips.forEach(t => {
                const tk = smartTokens(String(t.o || "") + " " + String(t.d || ""));
                const inter = sig.filter(x => tk.includes(x)).length;
                if (!inter) return;
                // La ruta debe parecerse de verdad (mitad o más de las palabras en común),
                // para no ligar rutas distintas que comparten una sola palabra (ej. "San Martín")
                const union = new Set(sig.concat(tk)).size;
                if (inter / union < 0.5) return;
                const dt = Math.abs(hhmmToMins(t.h) - minFila);
                if (dt > SMART_TOLERANCIA_ROL_MIN) return;
                const asg = resolveTripAssignment(t, ds, baselineOp);
                if (!asg.op) return;
                out.push({ op: asg.op, unidad: asg.unit, dt: dt, inter: inter, h: t.h, ruta: formatRouteName(t.o, t.d) });
            });
            out.sort((a, b) => b.inter - a.inter || a.dt - b.dt);
            return out;
        }

        // ---- INICIALES ----
        const iniciales = [];
        filas
            .filter(f => f.est === "INICIAL")
            .sort((a, b) => a.ini - b.ini)
            .forEach(f => {
                const cand = [];
                if (f.op) {
                    cand.push({ op: f.op, opN: f.opN, unidad: f.veh || unidadHabitual(f.opN), fuente: "smart", conf: "alta", motivo: "Smart ya trae operador" });
                } else {
                    candidatosRol(f).forEach(c => {
                        cand.push({ op: c.op, opN: smartNorm(c.op), unidad: c.unidad, fuente: "rol", conf: c.dt <= 5 ? "alta" : "media", motivo: `En tu rol: ${c.ruta} a las ${c.h}` });
                    });
                    if (f.veh) {
                        filas.filter(x => x !== f && x.veh === f.veh && x.op).forEach(x => {
                            cand.push({ op: x.op, opN: x.opN, unidad: f.veh, fuente: "vehiculo", conf: "media", motivo: `Maneja la U-${f.veh} a las ${smartHHMM(x.ini)}` });
                        });
                    }
                    filas.filter(x => x !== f && x.rutaN === f.rutaN && x.op).forEach(x => {
                        cand.push({ op: x.op, opN: x.opN, unidad: x.veh || "", fuente: "ruta", conf: "baja", motivo: `Hace esta misma ruta a las ${smartHHMM(x.ini)}` });
                    });
                }

                const vistos = [];
                const libres = [];
                const ocupados = [];
                cand.forEach(c => {
                    if (vistos.some(v => smartMismoNombre(v, c.opN))) return;
                    vistos.push(c.opN);
                    const otro = c.fuente === "smart" ? null : ocupado(c.opN, f);
                    if (otro) ocupados.push({ op: c.op, motivo: `${c.op} está en otro viaje a esa hora (${smartHHMM(otro.ini)}–${smartHHMM(otro.fin)}, ${otro.ruta})` });
                    else libres.push(c);
                });

                const sug = libres[0] || null;
                const alertas = [];
                let sev = "info";
                if (sug) {
                    const est = estadoOp(sug.opN);
                    if (est.enDatos === false) {
                        alertas.push({ s: "media", t: `${sug.op} no está en datos` });
                        sev = "media";
                    } else if (est.enDatos && est.activo === false) {
                        alertas.push({ s: "alta", t: `${est.nombre} no disponible (${est.motivo})` });
                        sev = "alta";
                    }
                    const uni = f.veh || sug.unidad;
                    if (uni && isUnidadEnTallerOInhabil(uni)) {
                        alertas.push({ s: "alta", t: `U-${uni} no disponible (${getMotivoUnidad(uni) || "taller"})` });
                        sev = "alta";
                    }
                } else {
                    sev = "media";
                }
                iniciales.push({ fila: f, sug: sug, alts: libres.slice(1, 3), ocupados: ocupados.slice(0, 2), alertas: alertas, sev: sev, zaca: AUDIT_ZACA_REGEX.test(f.ruta) });
            });

        // ---- FALLAS DEL ROL DE SMART ----
        const mapa = {};
        function agregar(tipo, entidad, sev, titulo, detalle, fila) {
            const id = "smart|" + tipo + "|" + entidad;
            if (!mapa[id]) mapa[id] = { id: id, tipo: tipo, sev: sev, titulo: titulo, detalle: detalle, filas: [], zaca: false };
            if (fila) {
                mapa[id].filas.push(fila);
                if (AUDIT_ZACA_REGEX.test(fila.ruta)) mapa[id].zaca = true;
            }
            return mapa[id];
        }

        const porOp = {};
        const porVeh = {};
        filas.forEach(f => {
            if (f.est !== "INICIAL") {
                if (!f.op) agregar("sin_operador", "dia", "alta", "Viajes sin operador en Smart", "Hay viajes programados sin ningún operador.", f);
                if (!f.veh) agregar("sin_unidad", "dia", "alta", "Viajes sin unidad en Smart", "Hay viajes programados sin ninguna unidad.", f);
            }
            if (f.op) {
                const est = estadoOp(f.opN);
                if (est.enDatos === false) agregar("op_fuera_datos", f.opN, "media", `${f.op} no está en datos`, "El nombre no coincide con ningún operador de los datos. Revisa si está escrito distinto o si no existe.", f);
                else if (est.enDatos && est.activo === false) agregar("op_no_disp", f.opN, "alta", `${est.nombre} no disponible`, `Motivo: ${est.motivo}. No debería tener viajes.`, f);
                if (!porOp[f.opN]) porOp[f.opN] = [];
                porOp[f.opN].push(f);
            }
            if (f.veh) {
                if (isUnidadEnTallerOInhabil(f.veh)) agregar("unidad_no_disp", f.veh, "alta", `U-${f.veh} no disponible`, `Motivo: ${getMotivoUnidad(f.veh) || "Taller"}. No debería tener viajes.`, f);
                if (!porVeh[f.veh]) porVeh[f.veh] = [];
                porVeh[f.veh].push(f);
            }
        });

        // Todo el día: un operador = una unidad, una unidad = un operador. Y no puede estar en dos viajes a la vez.
        Object.keys(porOp).forEach(k => {
            const lista = porOp[k].slice().sort((a, b) => a.ini - b.ini);
            const vehs = {};
            lista.forEach(f => {
                if (f.veh) vehs[f.veh] = (vehs[f.veh] || 0) + 1;
            });
            const vs = Object.keys(vehs);
            if (vs.length > 1) {
                const f0 = agregar("op_varias_unidades", k, "media", `${lista[0].op} usa ${vs.length} unidades`, "En el día aparece en: " + vs.map(v => `U-${v} (${vehs[v]})`).join(" y ") + ".", null);
                lista.forEach(f => f0.filas.push(f));
            }
            for (let i = 0; i < lista.length - 1; i++) {
                if (smartSolapa(lista[i], lista[i + 1])) {
                    const f1 = agregar("op_traslape", k, "alta", `${lista[i].op} en dos viajes a la vez`, "Sus horarios se encimen: no puede estar en los dos.", null);
                    if (!f1.filas.includes(lista[i])) f1.filas.push(lista[i]);
                    f1.filas.push(lista[i + 1]);
                }
            }
        });
        Object.keys(porVeh).forEach(k => {
            const lista = porVeh[k].slice().sort((a, b) => a.ini - b.ini);
            const ops = {};
            lista.forEach(f => {
                if (f.op) ops[f.opN] = f.op;
            });
            const os = Object.keys(ops);
            if (os.length > 1) {
                const f0 = agregar("unidad_varios_ops", k, "media", `U-${k} la manejan ${os.length} operadores`, "En el día aparece con: " + os.map(o => ops[o]).join(" y ") + ".", null);
                lista.forEach(f => f0.filas.push(f));
            }
            for (let i = 0; i < lista.length - 1; i++) {
                if (smartSolapa(lista[i], lista[i + 1])) {
                    const f1 = agregar("unidad_traslape", k, "alta", `U-${k} en dos viajes a la vez`, "Sus horarios se encimen: la unidad no puede estar en los dos.", null);
                    if (!f1.filas.includes(lista[i])) f1.filas.push(lista[i]);
                    f1.filas.push(lista[i + 1]);
                }
            }
        });

        // Smart contra datos: unidad que datos tiene para el operador
        if (datosCargados) {
            Object.keys(porOp).forEach(k => {
                const est = estadoOp(k);
                if (!est.enDatos || !est.unidadDatos) return;
                const distintas = porOp[k].filter(f => f.veh && f.veh !== est.unidadDatos);
                if (distintas.length) {
                    const f0 = agregar("distinta_datos", k, "info", `${est.nombre} en otra unidad que datos`, `En datos tiene la U-${est.unidadDatos}; en Smart va en: ` + Array.from(new Set(distintas.map(f => "U-" + f.veh))).join(", ") + ".", null);
                    distintas.forEach(f => f0.filas.push(f));
                }
            });
        }

        let fallas = Object.keys(mapa).map(k => mapa[k]);
        fallas.forEach(f => f.filas.sort((a, b) => a.ini - b.ini));
        const cantIgnoradas = fallas.filter(f => ignoradas.has(f.id)).length;
        fallas = fallas.filter(f => !ignoradas.has(f.id));
        fallas.sort((a, b) => (AUDIT_SEV_ORDEN[a.sev] - AUDIT_SEV_ORDEN[b.sev]) || ((b.zaca ? 1 : 0) - (a.zaca ? 1 : 0)) || (b.filas.length - a.filas.length));

        return { iniciales: iniciales, fallas: fallas, ignoradas: cantIgnoradas, canceladas: canceladas, total: filas.length, datosCargados: datosCargados };
    }
    window.smartAnalizar = smartAnalizar;

    function smartHorasTexto(filas) {
        const hs = Array.from(new Set(filas.map(f => smartHHMM(f.ini))));
        const l = hs.slice(0, 8).join(", ");
        return hs.length > 8 ? `${l} y ${hs.length - 8} más` : l;
    }

    window.verInicialesSmart = function (mensaje) {
        inyectarEstilosFallas();
        let html = `<h2>🚌 Iniciales (Smart)</h2>
          <input type="file" id="smartFileInput" accept=".xlsx,.xls" style="display:none" onchange="smartCargarArchivo(this)">
          <button type="button" class="btn-outline" style="margin:0 0 8px 0;" onclick="document.getElementById('smartFileInput').click()">📂 ${smartDatos ? "Cambiar" : "Subir"} rol de Smart (Excel)</button>
          <div id="smartMsg" style="font-size:12.5px;margin-bottom:8px;${mensaje ? "padding:9px 11px;border-radius:10px;background:#fde7ea;color:#B01229;font-weight:700;" : ""}">${mensaje ? escHtml(mensaje) : ""}</div>`;

        if (!smartDatos) {
            html += `<div style="padding:13px;background:var(--surface-2);border-radius:12px;font-size:13px;line-height:1.5;">
                Sube el Excel <b>Monitor</b> de Smart. Aquí verás las rutas <b>INICIAL</b> (las que no muestran quién las hace) con el operador y la unidad sugeridos según tu rol, y las fallas del rol de Smart.</div>
              <button type="button" class="btn-outline" style="margin-top:10px;" onclick="closeSheet()">Cerrar</button>`;
            openSheet(html);
            return;
        }

        const a = smartAnalizar();
        window._smartUltimo = a;
        const sinSug = a.iniciales.filter(x => !x.sug).length;
        const nAlta = a.fallas.filter(f => f.sev === "alta").length + a.iniciales.filter(x => x.sev === "alta").length;
        const nMedia = a.fallas.filter(f => f.sev === "media").length;
        const dia = store.days && store.days[store.currentDay] ? store.currentDay : "(sin rol cargado)";
        html += `<div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;line-height:1.5;">
              Archivo: <b>${escHtml(smartDatos.nombre)}</b> · Fecha Smart: <b>${escHtml(smartDatos.fecha)}</b><br>
              Rol de la app usado para comparar: <b>${escHtml(dia)}</b> · ${a.total} viajes${a.canceladas ? ` · ${a.canceladas} canceladas (no se revisan)` : ""}</div>
            <div>
              <span class="stu-chip-sev" style="background:#e3eefb;color:#00509d;">🚌 ${a.iniciales.length} iniciales</span>
              <span class="stu-chip-sev" style="background:#fff0dc;color:#9a5a00;">❔ ${sinSug} sin operador sugerido</span>
              <span class="stu-chip-sev" style="background:#fde7ea;color:#B01229;">🔴 ${nAlta} críticas</span>
              <span class="stu-chip-sev" style="background:#fff0dc;color:#9a5a00;">🟠 ${nMedia} por revisar</span>
            </div>`;
        if (!a.datosCargados) {
            html += `<div style="padding:10px 12px;background:#fff4d6;color:#7a5b00;border-radius:12px;font-size:12.5px;margin:6px 0;">Aún no hay datos de operadores cargados: no se puede revisar bajas ni nombres. Sube tu archivo de datos.</div>`;
        }

        html += `<h3 style="margin:12px 0 6px;">Rutas iniciales</h3>`;
        a.iniciales.forEach(x => {
            const f = x.fila;
            const smartTrae = [f.op ? escHtml(f.op) : "sin operador", f.veh ? "U-" + escHtml(f.veh) : "sin unidad"].join(" · ");
            let sugHtml;
            if (x.sug) {
                const uni = f.veh || x.sug.unidad;
                const confTxt = x.sug.conf === "alta" ? "confianza alta" : x.sug.conf === "media" ? "confianza media" : "confianza baja";
                sugHtml = `<div class="stu-falla-det"><b style="color:var(--ink);">Lo haría: ${escHtml(x.sug.op)}${uni ? " (U-" + escHtml(uni) + ")" : ""}</b><br>${escHtml(x.sug.motivo)} · ${confTxt}</div>`;
                if (x.alts.length) sugHtml += `<div class="stu-falla-det">Otras opciones: ${x.alts.map(c => escHtml(c.op) + " (" + escHtml(c.motivo) + ")").join("; ")}</div>`;
            } else {
                sugHtml = `<div class="stu-falla-det"><b style="color:#9a5a00;">No encontré a nadie libre para esta ruta.</b></div>`;
            }
            if (x.ocupados.length) sugHtml += `<div class="stu-falla-det">${x.ocupados.map(o => "⛔ " + escHtml(o.motivo)).join("<br>")}</div>`;
            const alertasHtml = x.alertas.map(al => `<div class="stu-falla-det" style="color:${al.s === "alta" ? "#B01229" : "#9a5a00"};font-weight:800;">${al.s === "alta" ? "🔴" : "🟠"} ${escHtml(al.t)}</div>`).join("");
            html += `<div class="stu-falla ${x.sev}">
                <div class="stu-falla-titulo">${smartHHMM(f.ini)}–${smartHHMM(f.fin)} · ${escHtml(f.ruta)}${x.zaca ? `<span class="stu-tag-zaca">ZACACHIMALPA</span>` : ""}</div>
                <div class="stu-falla-det">${escHtml(f.cta)} · Smart trae: ${smartTrae}</div>
                ${sugHtml}${alertasHtml}
              </div>`;
        });
        if (!a.iniciales.length) html += `<div style="padding:12px;background:var(--surface-2);border-radius:12px;font-size:13px;">Este archivo no trae rutas INICIAL.</div>`;

        html += `<h3 style="margin:14px 0 6px;">Fallas en el rol de Smart</h3>`;
        if (!a.fallas.length) html += `<div style="padding:13px;background:var(--done-bg);color:var(--done);border-radius:12px;font-weight:800;font-size:14px;">✅ No se detectaron fallas en Smart.</div>`;
        a.fallas.forEach((f, i) => {
            const etiqueta = f.sev === "alta" ? "🔴" : f.sev === "media" ? "🟠" : "🔵";
            const horas = smartHorasTexto(f.filas);
            html += `<div class="stu-falla ${f.sev}">
                <div class="stu-falla-titulo">${etiqueta} ${escHtml(f.titulo)}${f.zaca ? `<span class="stu-tag-zaca">ZACACHIMALPA</span>` : ""}</div>
                <div class="stu-falla-det">${escHtml(f.detalle)}</div>
                ${horas ? `<div class="stu-falla-horas">Horarios: ${escHtml(horas)}</div>` : ""}
                <div class="stu-falla-acc"><button type="button" class="btn-outline" style="color:var(--ink-soft);border-color:var(--ink-faint);" onclick="smartIgnorar(${i})">Ignorar</button></div>
              </div>`;
        });

        if (a.ignoradas) html += `<button type="button" class="btn-outline" style="margin:4px 0 8px;" onclick="smartRestaurar()">Mostrar de nuevo las ${a.ignoradas} ignoradas</button>`;
        html += `<button type="button" class="btn-outline" style="margin-top:6px;color:var(--ink-soft);border-color:var(--ink-faint);" onclick="smartBorrar()">🗑 Quitar este rol de Smart</button>
                 <button type="button" class="btn-outline" style="margin-top:8px;" onclick="closeSheet()">Cerrar</button>`;
        openSheet(html);
    };

    window.smartCargarArchivo = async function (input) {
        const archivo = input && input.files && input.files[0];
        if (!archivo) return;
        const msg = document.getElementById("smartMsg");
        if (msg) msg.textContent = "Leyendo archivo...";
        try {
            const X = (await ensureXLSXLoaded()) || window.XLSX;
            const buf = await archivo.arrayBuffer();
            const wb = X.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const grid = X.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
            window.smartCargarDesdeTabla(grid, archivo.name);
            window.verInicialesSmart();
        } catch (e) {
            window.verInicialesSmart("No pude leer el archivo: " + (e && e.message ? e.message : e));
        }
    };

    window.smartIgnorar = function (i) {
        const a = window._smartUltimo;
        const f = a && a.fallas[i];
        if (!f || !smartDatos) return;
        smartDatos.ignoradas = smartDatos.ignoradas || [];
        if (!smartDatos.ignoradas.includes(f.id)) smartDatos.ignoradas.push(f.id);
        smartGuardar();
        window.verInicialesSmart();
    };

    window.smartRestaurar = function () {
        if (!smartDatos) return;
        smartDatos.ignoradas = [];
        smartGuardar();
        window.verInicialesSmart();
    };

    window.smartBorrar = function () {
        smartDatos = null;
        smartGuardar();
        window.verInicialesSmart();
    };

    function injectInicialesSmartButton() {
        const rightBar = document.querySelector(".appbar-right");
        if (!rightBar || document.getElementById("btnInicialesSmart")) return;
        inyectarEstilosFallas();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "btnInicialesSmart";
        btn.className = "fullscreen-btn-top";
        btn.title = "Iniciales (Smart)";
        btn.setAttribute("aria-label", "Iniciales (Smart)");
        btn.style.fontSize = "18px";
        btn.innerHTML = "🚌";
        btn.onclick = function () {
            window.verInicialesSmart();
        };
        rightBar.insertBefore(btn, rightBar.firstChild);
    }

    smartCargarGuardado();

    // =========================================================================
    // 6E. TALLER Y UNIDADES SIN OPERADOR: SOLO HACE CASO A LA HOJA "TALLER" Y A "DATOS OP"
    //     - TALLER: toma las unidades de la fecha de HOY; si hoy no hay, de la ÚLTIMA fecha agregada.
    //       Se usa el último estatus del día. Sin estatus (o "LISTO") = la unidad ya está lista.
    //       Ya no se leen las hojas Siniestros ni Parque Vehicular, ni fechas anteriores.
    //     - SIN OPERADOR: la lista "Unidades Faltantes" (columna U de DATOS OP) manda.
    //       En "Unidades Libres en Patio" solo salen las de esa lista que no estén en
    //       taller y a las que hoy nadie les haya asignado operador.
    //     Se aplica cada vez que subes el archivo de datos (Seguimiento).
    // =========================================================================
    const STU_ESTATUS_LISTO = /^(LISTO|LISTA|UNIDAD LISTA|LIBERAD[AO]|ENTREGAD[AO])\b/;

    function stuSerialDia(v) {
        if (v === null || v === undefined || v === "") return null;
        if (v instanceof Date) return Math.floor(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()) / 86400000 + 25569);
        if (typeof v === "number") return v > 30000 && v < 90000 ? Math.floor(v) : null;
        const t = String(v).trim();
        let m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (m) return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 + 25569);
        m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (m) return Math.floor(Date.UTC(+m[3], +m[2] - 1, +m[1]) / 86400000 + 25569);
        return null;
    }

    function stuDiaTexto(serial) {
        return new Date((serial - 25569) * 86400000).toISOString().slice(0, 10);
    }

    function stuDiaCorto(txt) {
        const p = String(txt || "").split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}` : String(txt || "");
    }

    function stuHoySerial() {
        const d = new Date();
        return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 25569);
    }

    function stuValorVacio(v) {
        return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    }

    // Texto del estatus: puede ser una palabra (DIAGNÓSTICO) o una fecha de entrega estimada
    function stuEstatusTexto(v) {
        if (typeof v === "number" || v instanceof Date) {
            const serial = v instanceof Date ? null : v;
            if (serial !== null && serial > 30000 && serial < 90000) {
                const dia = stuDiaTexto(Math.floor(serial));
                const mins = Math.round((serial - Math.floor(serial)) * 1440);
                const hh = String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0");
                return `Entrega estimada ${stuDiaCorto(dia)} ${hh}`;
            }
            return String(v);
        }
        const t = String(v).trim();
        const m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        return m ? `Entrega estimada ${stuDiaCorto(m[1])} ${m[2]}` : t;
    }

    // Lee del archivo de datos: unidades en taller (hoja Taller) y unidades faltantes (DATOS OP, col. U)
    window.stuExtraerTallerYFaltantes = function (wb, X, hoySerialPrueba) {
        const out = { taller: {}, tallerEncontrado: false, tallerFecha: "", tallerFilasDia: 0, listas: [], faltantes: [], faltantesEncontradas: false, avisos: [] };
        const leer = nombre => X.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: null });

        // ---------- TALLER ----------
        const nomTaller = wb.SheetNames.find(n => /^TALLER$/i.test(String(n).trim())) || wb.SheetNames.find(n => /TALLER/i.test(String(n)));
        if (nomTaller) {
            const grid = leer(nomTaller);
            let h = -1;
            for (let r = 0; r < Math.min(grid.length, 10); r++) {
                if ((grid[r] || []).some(c => smartNorm(c) === "UNIDAD")) {
                    h = r;
                    break;
                }
            }
            if (h < 0) {
                out.avisos.push(`En la hoja "${nomTaller}" no encontré la columna UNIDAD; no se cambió el taller.`);
            } else {
                const head = grid[h].map(smartNorm);
                const cU = head.indexOf("UNIDAD");
                let cFecha = head.findIndex(x => ["COLUMNA1", "FECHA", "DIA", "FECHA REPORTE", "FECHA DE REPORTE", "FECHA DE CORTE"].includes(x));
                if (cFecha < 0) {
                    const cand = cU + 1;
                    const celdas = grid.slice(h + 1, h + 40).map(r => (r || [])[cand]).filter(v => !stuValorVacio(v));
                    if (celdas.length && celdas.filter(v => stuSerialDia(v) !== null).length / celdas.length > 0.6) cFecha = cand;
                }
                const cEst = [];
                head.forEach((x, i) => {
                    if (x.includes("ESTATUS")) cEst.push(i);
                });
                const cFalla = head.findIndex(x => x.startsWith("FALLA"));
                if (cFecha < 0) {
                    out.avisos.push(`En la hoja "${nomTaller}" no encontré la columna de fecha; no se cambió el taller.`);
                } else if (!cEst.length) {
                    out.avisos.push(`En la hoja "${nomTaller}" no encontré la columna de estatus; no se cambió el taller.`);
                } else {
                    const filas = [];
                    for (let r = h + 1; r < grid.length; r++) {
                        const row = grid[r] || [];
                        const u = String(row[cU] === null || row[cU] === undefined ? "" : row[cU]).replace(/\D/g, "");
                        if (!u || !FLOTA_SET.has(u)) continue;
                        const dia = stuSerialDia(row[cFecha]);
                        if (dia === null) continue;
                        let est = null;
                        for (let i = cEst.length - 1; i >= 0; i--) {
                            if (!stuValorVacio(row[cEst[i]])) {
                                est = row[cEst[i]];
                                break;
                            }
                        }
                        filas.push({ u: u, dia: dia, est: est, falla: cFalla >= 0 && !stuValorVacio(row[cFalla]) ? String(row[cFalla]).replace(/\s+/g, " ").trim() : "" });
                    }
                    if (!filas.length) {
                        out.avisos.push(`La hoja "${nomTaller}" no trae unidades con fecha; no se cambió el taller.`);
                    } else {
                        const hoy = hoySerialPrueba || stuHoySerial();
                        const dias = Array.from(new Set(filas.map(f => f.dia)));
                        const usar = dias.includes(hoy) ? hoy : Math.max.apply(null, dias);
                        const delDia = {};
                        filas.filter(f => f.dia === usar).forEach(f => {
                            delDia[f.u] = f;
                        });
                        out.tallerEncontrado = true;
                        out.tallerFecha = stuDiaTexto(usar);
                        out.tallerFilasDia = Object.keys(delDia).length;
                        Object.keys(delDia).forEach(u => {
                            const f = delDia[u];
                            if (stuValorVacio(f.est)) {
                                out.listas.push(u);
                                return;
                            }
                            const texto = stuEstatusTexto(f.est);
                            if (STU_ESTATUS_LISTO.test(smartNorm(texto))) {
                                out.listas.push(u);
                                return;
                            }
                            out.taller[u] = texto + (f.falla ? " · " + f.falla.slice(0, 40) : "");
                        });

                        // ¿Desde qué día está en taller? Se cuentan los días seguidos (de la hoja) en que aparece sin estar lista
                        const porDia = {};
                        filas.forEach(f => {
                            if (!porDia[f.dia]) porDia[f.dia] = {};
                            porDia[f.dia][f.u] = f;
                        });
                        const diasAtras = dias.filter(d => d <= usar).sort((a, b) => b - a);
                        out.tallerDesde = {};
                        Object.keys(out.taller).forEach(u => {
                            let desde = usar;
                            for (let i = 1; i < diasAtras.length; i++) {
                                const fila = porDia[diasAtras[i]][u];
                                if (!fila || stuValorVacio(fila.est) || STU_ESTATUS_LISTO.test(smartNorm(stuEstatusTexto(fila.est)))) break;
                                desde = diasAtras[i];
                            }
                            out.tallerDesde[u] = stuDiaTexto(desde);
                        });
                        if (usar !== hoy) out.avisos.push(`No hay lista de taller de hoy; se usó la última fecha agregada (${stuDiaCorto(out.tallerFecha)}).`);
                    }
                }
            }
        } else {
            out.avisos.push('No encontré la hoja "Taller"; no se cambió el taller.');
        }

        // ---------- UNIDADES FALTANTES (DATOS OP, columna "Unidades Faltantes") ----------
        for (let s = 0; s < wb.SheetNames.length && !out.faltantesEncontradas; s++) {
            const nombre = wb.SheetNames[s];
            const grid = leer(nombre);
            for (let r = 0; r < Math.min(grid.length, 10) && !out.faltantesEncontradas; r++) {
                const row = grid[r] || [];
                const c = row.findIndex(x => smartNorm(x) === "UNIDADES FALTANTES");
                if (c < 0) continue;
                out.faltantesEncontradas = true;
                const vistos = new Set();
                for (let i = r + 1; i < grid.length; i++) {
                    const v = (grid[i] || [])[c];
                    if (stuValorVacio(v)) continue;
                    const u = typeof v === "number" ? String(Math.round(v)) : String(v).replace(/\D/g, "");
                    if (u && FLOTA_SET.has(u) && !vistos.has(u)) {
                        vistos.add(u);
                        out.faltantes.push(u);
                    }
                }
            }
        }
        if (!out.faltantesEncontradas) out.avisos.push('No encontré la columna "Unidades Faltantes"; las unidades libres se calculan como antes.');
        return out;
    };

    function stuAplicarTallerYFaltantes(p) {
        const previo = window._stuTallerPrevio;
        window._stuTallerPrevio = null;
        if (!p.tallerEncontrado && previo) {
            // No se pudo leer la hoja Taller: se conserva la lista anterior (nunca la lectura vieja de varias hojas)
            store.tallerDB = previo.tallerDB;
            store.tallerFecha = previo.fecha;
            store.tallerDesde = previo.desde || {};
            Object.keys(store.unassignedReasons || {}).forEach(k => {
                if (FLOTA_SET.has(k) && store.unassignedReasons[k] === "Taller") delete store.unassignedReasons[k];
            });
            Object.keys(previo.tallerDB || {}).forEach(u => {
                if (FLOTA_SET.has(u)) setReasonForEntity(u, "Taller");
            });
        }
        if (p.tallerEncontrado) {
            store.tallerDB = p.taller;
            store.tallerFecha = p.tallerFecha;
            store.tallerDesde = p.tallerDesde || {};
            // Quitar la marca "Taller" que dejó el lector anterior en unidades de otras hojas o fechas
            Object.keys(store.unassignedReasons || {}).forEach(k => {
                if (FLOTA_SET.has(k) && store.unassignedReasons[k] === "Taller") delete store.unassignedReasons[k];
            });
            Object.keys(p.taller).forEach(u => setReasonForEntity(u, "Taller"));
        }
        if (p.tiempos) stuAplicarTiempos(p.tiempos);
        if (p.faltantesEncontradas) {
            store.unidadesFaltantes = p.faltantes;
            store.datosRegla = "v2";
        }
        window.render();
    }

    function stuMostrarResumenDatos(p) {
        const box = document.getElementById("uploadMsg");
        if (!box) return;
        const partes = [];
        if (p.tallerEncontrado) {
            const ut = Object.keys(p.taller).sort();
            partes.push(`Taller (lista del ${stuDiaCorto(p.tallerFecha)}): <b>${ut.length}</b> en taller${ut.length ? " (" + ut.map(u => "U-" + u).join(", ") + ")" : ""}` + (p.listas.length ? `, ya listas: ${p.listas.map(u => "U-" + u).join(", ")}` : ""));
        }
        if (p.faltantesEncontradas) partes.push(`Sin operador según datos: <b>${p.faltantes.length}</b> unidades`);
        if (p.tiempos && p.tiempos.n) partes.push(`Tiempos de ruta: <b>${p.tiempos.n}</b> rutas (hoja ${escHtml(p.tiempos.hoja)})`);
        else if (p.tiempos && p.tiempos.aviso) p.avisos.push(p.tiempos.aviso);
        const activos = Object.values(store.operadoresDB || {}).filter(op => isOperadorActivo(op)).length;
        let html = `<span style="color:var(--done)">✅ ¡Sincronizado en la nube! ${partes.join(" · ")}${partes.length ? " · " : ""}${activos} operadores activos.</span>`;
        if (p.avisos.length) html += `<br><span style="color:var(--bad);font-size:12.5px;font-weight:700;">⚠️ ${p.avisos.map(escHtml).join("<br>⚠️ ")}</span>`;
        const raras = window._stuLetrasDesconocidas || [];
        if (raras.length) {
            html += `<br><span style="color:var(--pend);font-size:12.5px;font-weight:700;">🔤 Letra que no conozco en la columna UNIDAD: ${raras.map(r => escHtml(r.letra) + " (" + escHtml(r.nombre) + ")").join(", ")}. Se dejaron como operadores activos. Si significan algo, agrégalas en ⚙️ ➜ Letras de estado.</span>`;
        }
        box.innerHTML = html;
    }

    function stuResumenTallerHtml() {
        if (store.datosRegla !== "v2") return "";
        const nT = Object.keys(store.tallerDB || {}).length;
        const nF = (store.unidadesFaltantes || []).length;
        return `<div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">🔧 Taller: lista del ${escHtml(stuDiaCorto(store.tallerFecha))} (${nT} en taller) · 🚌 Sin operador según datos: ${nF}</div>`;
    }

    // ----- Versión visible (para comprobar que el teléfono ya tiene el archivo nuevo) -----
    const STU_VERSION = "Cambios tipo BusUp · Tiempos v1 · Tablero v3";

    // ----- Actualizar SOLO taller y unidades faltantes (sin tocar operadores ni los cambios del día) -----
    window.stuActualizarSoloTaller = async function (input) {
        const archivo = input && input.files && input.files[0];
        if (!archivo) return;
        const aviso = (html, color) => {
            const box = document.getElementById("tallerMsg");
            if (box) box.innerHTML = `<div style="margin:8px 0;padding:9px 11px;border-radius:10px;font-size:12.5px;font-weight:700;background:${color === "rojo" ? "#fde7ea" : "#e6f6ec"};color:${color === "rojo" ? "#B01229" : "#17703a"};">${html}</div>`;
        };
        aviso("Leyendo archivo...", "verde");
        try {
            const X = (await ensureXLSXLoaded()) || window.XLSX;
            const wb = X.read(new Uint8Array(await archivo.arrayBuffer()), { type: "array" });
            const p = window.stuExtraerTallerYFaltantes(wb, X);
            if (!p.tallerEncontrado && !p.faltantesEncontradas) {
                aviso("No encontré la hoja Taller ni la columna Unidades Faltantes en ese archivo. No se cambió nada.<br>" + p.avisos.map(escHtml).join("<br>"), "rojo");
                return;
            }
            window._stuTallerPrevio = null;
            stuAplicarTallerYFaltantes(p);
            savePatch({
                tallerDB: store.tallerDB || {},
                tallerFecha: store.tallerFecha || "",
                tallerDesde: store.tallerDesde || {},
                unidadesFaltantes: store.unidadesFaltantes || [],
                datosRegla: store.datosRegla || "",
                unassignedReasons: store.unassignedReasons || {}
            });
            window.verTallerLeido(`✅ Listo. Taller (lista del ${escHtml(stuDiaCorto(p.tallerFecha))}): <b>${Object.keys(p.taller).length}</b> en taller` + (p.listas.length ? `, ${p.listas.length} ya listas (${p.listas.map(u => "U-" + u).join(", ")})` : "") + `.` + (p.avisos.length ? "<br>" + p.avisos.map(escHtml).join("<br>") : ""));
        } catch (e) {
            aviso("No pude leer el archivo: " + escHtml(e && e.message ? e.message : e), "rojo");
        }
        input.value = "";
    };

    // ----- Cuántos días lleva una unidad en taller (según la hoja Taller) -----
    function stuDiasTaller(u) {
        const desde = store.tallerDesde && store.tallerDesde[String(u)];
        if (!desde) return "";
        const s = stuSerialDia(desde);
        if (s === null) return "";
        const n = stuHoySerial() - s + 1;
        if (n <= 1) return "1er día";
        return n + " días";
    }
    window.stuDiasTaller = stuDiasTaller;

    // ----- Pantalla: qué taller y qué unidades sin operador está usando la app -----
    window.verTallerLeido = function (mensajeHtml) {
        inyectarEstilosFallas();
        const taller = store.tallerDB || {};
        const unidades = Object.keys(taller).sort();
        const falt = (store.unidadesFaltantes || []).map(String);
        const reglaActiva = store.datosRegla === "v2";

        // ¿El rol de hoy usa alguna unidad en taller?
        const usoEnRol = {};
        try {
            const dia = store.days && store.days[store.currentDay];
            const trips = dia && Array.isArray(dia.trips) ? dia.trips : [];
            const ds = getDayState();
            const baselineOp = {};
            (store.globalFleet || []).forEach(g => {
                if (g && g.u && g.n) baselineOp[String(g.u)] = g.n;
            });
            trips.forEach(t => {
                const a = resolveTripAssignment(t, ds, baselineOp);
                if (a.unit && taller[a.unit] !== undefined) usoEnRol[a.unit] = (usoEnRol[a.unit] || 0) + 1;
            });
        } catch (e) {}

        let html = `<h2>🔧 Taller y unidades sin operador</h2>
          <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:8px;">Versión de la app: <b>${escHtml(STU_VERSION)}</b></div>`;
        if (mensajeHtml) html += `<div style="margin:0 0 8px;padding:9px 11px;border-radius:10px;font-size:12.5px;font-weight:700;background:#e6f6ec;color:#17703a;">${mensajeHtml}</div>`;
        if (!reglaActiva) {
            html += `<div style="padding:10px 12px;background:#fff4d6;color:#7a5b00;border-radius:12px;font-size:12.5px;margin-bottom:8px;">Todavía no se ha cargado el archivo de datos con la regla nueva (hoja Taller por fecha y Unidades Faltantes). Usa el botón de abajo.</div>`;
        }
        html += `<input type="file" id="tallerFileInput" accept=".xlsx,.xls" style="display:none" onchange="stuActualizarSoloTaller(this)">
          <button type="button" class="btn-outline" style="margin:0 0 4px 0;" onclick="document.getElementById('tallerFileInput').click()">📂 Actualizar solo Taller y Faltantes</button>
          <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:6px;">Sube tu archivo de datos (Seguimiento). Solo cambia el taller y las unidades sin operador: <b>no borra</b> los cambios del día ni toca a los operadores.</div>
          <div id="tallerMsg"></div>
          <h3 style="margin:12px 0 6px;">En taller${store.tallerFecha ? " (lista del " + escHtml(stuDiaCorto(store.tallerFecha)) + ")" : ""}: ${unidades.length}</h3>`;
        if (!unidades.length) html += `<div style="padding:11px;background:var(--surface-2);border-radius:12px;font-size:13px;">Ninguna unidad en taller.</div>`;
        unidades.forEach(u => {
            const usa = usoEnRol[u];
            html += `<div class="stu-falla ${usa ? "alta" : "info"}"><div class="stu-falla-titulo">🔧 U-${escHtml(u)}${stuDiasTaller(u) ? ` <span class="stu-dias-taller">${escHtml(stuDiasTaller(u))}</span>` : ""}</div>
                <div class="stu-falla-det">${escHtml(String(taller[u]))}</div>
                ${usa ? `<div class="stu-falla-det" style="color:#B01229;font-weight:800;">⚠️ El rol de hoy la usa en ${usa} viaje(s)</div>` : ""}</div>`;
        });
        html += `<h3 style="margin:12px 0 6px;">Sin operador según datos (Unidades Faltantes): ${falt.length}</h3>`;
        html += falt.length
            ? `<div>${falt.map(u => `<span style="display:inline-block;background:var(--surface-2);font-weight:800;font-size:12.5px;padding:5px 9px;border-radius:7px;margin:3px;">U-${escHtml(u)}${taller[u] !== undefined ? " 🔧" : ""}</span>`).join("")}</div>`
            : `<div style="padding:11px;background:var(--surface-2);border-radius:12px;font-size:13px;">${reglaActiva ? "Ninguna." : "Aún sin leer."}</div>`;
        html += `<button type="button" class="btn-outline" style="margin-top:12px;" onclick="closeSheet()">Cerrar</button>`;
        openSheet(html);
    };

    // Datos que agregó extras.js (taller por fecha, días en taller, faltantes, letras). Con soloVacios = true
    // solo rellena lo que falte (se usa al abrir la app, para leer la copia guardada en el teléfono).
    function stuCamposExtra(raw, soloVacios) {
        const poner = (k, v) => {
            if (soloVacios && store[k] !== undefined && store[k] !== null && store[k] !== "" && !(typeof store[k] === "object" && !Object.keys(store[k]).length)) return;
            store[k] = v;
        };
        poner("unidadesFaltantes", Array.isArray(raw.unidadesFaltantes) ? raw.unidadesFaltantes : Object.values(raw.unidadesFaltantes || {}));
        poner("tallerFecha", raw.tallerFecha || "");
        poner("tallerDesde", raw.tallerDesde && typeof raw.tallerDesde === "object" ? raw.tallerDesde : {});
        poner("datosRegla", raw.datosRegla || "");
        poner("codigosEstado", raw.codigosEstado && typeof raw.codigosEstado === "object" ? raw.codigosEstado : null);
        poner("tiemposRutas", raw.tiemposRutas && typeof raw.tiemposRutas === "object" ? raw.tiemposRutas : {});
        poner("tiemposVel", raw.tiemposVel && typeof raw.tiemposVel === "object" ? raw.tiemposVel : null);
        poner("tiemposManual", raw.tiemposManual && typeof raw.tiemposManual === "object" ? raw.tiemposManual : {});
        poner("tiemposPreferencia", raw.tiemposPreferencia || "real");
        stuTiemposVer++;
        stuSincronizarEstadosCriticos();
    }

    function stuRestaurarDeCopiaLocal() {
        try {
            const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
            if (raw && typeof raw === "object") stuCamposExtra(raw, true);
        } catch (e) {}
    }

    // --- Enganches: se leen Taller y Faltantes al subir el archivo de datos, y se guardan en la nube ---
    (function instalarReglasTallerYFaltantes() {
        if (typeof window.handleExcel === "function" && !window.handleExcel._stu) {
            const originalHandle = window.handleExcel;
            const nuevoHandle = async function (file, type, inputEl) {
                if (type === "seguimiento" && file) {
                    window._stuDatosPendientes = null;
                    window._stuTallerPrevio = { tallerDB: JSON.parse(JSON.stringify(store.tallerDB || {})), fecha: store.tallerFecha || "", desde: JSON.parse(JSON.stringify(store.tallerDesde || {})) };
                    window._stuLetrasDesconocidas = [];
                    try {
                        const X = (await ensureXLSXLoaded()) || window.XLSX;
                        const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
                        window._stuDatosPendientes = window.stuExtraerTallerYFaltantes(wb, X);
                        try {
                            window._stuDatosPendientes.tiempos = window.stuLeerTiemposRutas(wb, X);
                        } catch (e) {
                            console.error("Lectura de tiempos de ruta:", e);
                        }
                    } catch (e) {
                        console.error("Lectura de Taller/Faltantes:", e);
                        window._stuDatosPendientes = {
                            taller: {}, tallerEncontrado: false, tallerFecha: "", listas: [], faltantes: [], faltantesEncontradas: false,
                            avisos: ["No pude leer Taller / Unidades Faltantes (" + (e && e.message ? e.message : e) + "). Se conservó la lista de taller anterior."]
                        };
                    }
                }
                return originalHandle.apply(this, arguments);
            };
            nuevoHandle._stu = true;
            window.handleExcel = nuevoHandle;
        }

        if (typeof window.saveStore === "function" && !window.saveStore._stu) {
            const originalSave = window.saveStore;
            const nuevoSave = function (onComplete) {
                const p = window._stuDatosPendientes;
                let cb = onComplete;
                if (p) {
                    window._stuDatosPendientes = null;
                    try {
                        stuAplicarTallerYFaltantes(p);
                    } catch (e) {
                        console.error("Aplicar Taller/Faltantes:", e);
                    }
                    cb = function (err) {
                        if (typeof onComplete === "function") onComplete(err);
                        if (!err) {
                            try {
                                stuMostrarResumenDatos(p);
                            } catch (e) {}
                        }
                    };
                }
                return originalSave.call(this, cb);
            };
            nuevoSave._stu = true;
            window.saveStore = nuevoSave;
        }

        // Para que el taller, la fecha y la lista de faltantes no se pierdan al recargar o al bajar de la nube
        if (typeof window.normalizeStoreStructure === "function" && !window.normalizeStoreStructure._stu) {
            const originalNorm = window.normalizeStoreStructure;
            const nuevoNorm = function (raw) {
                const r = originalNorm.apply(this, arguments);
                if (raw && typeof raw === "object") stuCamposExtra(raw, false);
                return r;
            };
            nuevoNorm._stu = true;
            window.normalizeStoreStructure = nuevoNorm;
        }

        // "Unidades Libres en Patio": solo las de la lista Unidades Faltantes, sin taller y sin operador hoy
        if (typeof window.calcularEstadoFlotaYVentanas === "function" && !window.calcularEstadoFlotaYVentanas._stu) {
            const originalCalc = window.calcularEstadoFlotaYVentanas;
            const nuevoCalc = function () {
                const r = originalCalc.apply(this, arguments);
                try {
                    if (store.datosRegla === "v2") {
                        const falt = new Set((store.unidadesFaltantes || []).map(String));
                        r.freeUnits = FLOTA_FIJA.filter(f => {
                            const u = String(f.u);
                            return falt.has(u) && !isUnidadEnTallerOInhabil(u) && !(r.unitToOp && r.unitToOp[u]);
                        });
                    }
                } catch (e) {
                    console.error("Unidades libres:", e);
                }
                return r;
            };
            nuevoCalc._stu = true;
            window.calcularEstadoFlotaYVentanas = nuevoCalc;
        }
    })();

    // =========================================================================
    // 6F. ESTADOS POR LETRA (B, I, C, P, Pr) Y VUELTAS REDONDAS (FLOTA)
    //     ESTADOS: si en la columna UNIDAD de DATOS OP un operador trae una letra en lugar de
    //       un número, es un estado: B = Baja · I = Incapacidad · C = Capacitación ·
    //       P = Préstamo · Pr = Permiso · V = Vacaciones · T = Turismo. No cuentan como guardias.
    //       Las letras se editan en ⚙️ ➜ "Letras de estado" (se guardan en la nube para todos).
    //     VUELTAS: además de ida y vuelta por la misma ruta (A➜B y B➜A), cuentan como 1 vuelta
    //       redonda, si el operador las hace una tras otra:
    //         CU➜Camino Real + Tlaxcalancingo➜CU
    //         CU➜Cuautlancingo + Bachillerato (5 de Mayo)➜CU
    //         CU➜Bachillerato (5 de Mayo) + Cuautlancingo➜CU
    // =========================================================================
    // Letras por defecto. Se pueden editar en ⚙️ ➜ "Letras de estado" y se guardan en la nube para todos.
    const CODIGOS_ESTADO_DEFAULT = { B: "Baja", I: "Incapacidad", C: "Capacitación", P: "Préstamo", PR: "Permiso", V: "Vacaciones", T: "Apoyo Turismo" };
    const CODIGOS_ESTADO_OPERADOR = CODIGOS_ESTADO_DEFAULT; // (nombre anterior, se deja por compatibilidad)
    const STU_PALABRAS_ESTADO = {
        BAJA: "Baja", INCAPACIDAD: "Incapacidad", CAPACITACION: "Capacitación", PRESTAMO: "Préstamo",
        PERMISO: "Permiso", VACACIONES: "Vacaciones", TURISMO: "Apoyo Turismo"
    };

    function stuLetraNorm(valor) {
        return String(valor === null || valor === undefined ? "" : valor)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[.\s]/g, "")
            .toUpperCase();
    }

    // Lista de letras vigente: la que editaste (store.codigosEstado) o la de fábrica
    function stuCodigosEstado() {
        const c = store && store.codigosEstado;
        if (c && typeof c === "object" && Object.keys(c).length) return c;
        return CODIGOS_ESTADO_DEFAULT;
    }
    window.stuCodigosEstado = stuCodigosEstado;

    // Todos los estados de letra cuentan como "no disponible": no salen como guardias ni como libres
    function stuSincronizarEstadosCriticos() {
        const valores = ["Capacitación", "Préstamo", "Vacaciones"].concat(Object.values(stuCodigosEstado()));
        valores.forEach(m => {
            if (m && !ESTADOS_CRITICOS.includes(m)) ESTADOS_CRITICOS.push(m);
        });
    }
    stuSincronizarEstadosCriticos();
    window.stuSincronizarEstadosCriticos = stuSincronizarEstadosCriticos;

    function stuCodigoEstadoOperador(valor) {
        const k = stuLetraNorm(valor);
        if (!k || /^\d+$/.test(k)) return "";
        const mapa = stuCodigosEstado();
        if (mapa[k]) return mapa[k];
        if (STU_PALABRAS_ESTADO[k]) return STU_PALABRAS_ESTADO[k];
        return "";
    }
    window.stuCodigoEstadoOperador = stuCodigoEstadoOperador;

    // Vuelve a aplicar las letras a los operadores ya cargados (sin volver a subir el Excel)
    function stuAplicarLetrasAOperadores(estadosAnteriores) {
        const meta = store.operadoresMeta || {};
        const vistos = new Set();
        let aplicados = 0;
        Object.keys(meta).forEach(k => {
            const rec = meta[k];
            if (!rec || !rec.letra || !rec.nombreOriginal || vistos.has(rec.nombreOriginal)) return;
            vistos.add(rec.nombreOriginal);
            const llave = fbKey(rec.nombreOriginal);
            const nuevo = stuCodigoEstadoOperador(rec.letra);
            const actual = getReasonForEntity(llave);
            if (nuevo) {
                setReasonForEntity(llave, nuevo);
                aplicados++;
            } else if (actual && (estadosAnteriores || []).includes(actual)) {
                setReasonForEntity(llave, null); // la letra ya no existe: vuelve a estar activo
            }
        });
        return aplicados;
    }

    function stuConteoLetras() {
        const meta = store.operadoresMeta || {};
        const vistos = new Set();
        const cuenta = {};
        Object.keys(meta).forEach(k => {
            const rec = meta[k];
            if (!rec || !rec.letra || !rec.nombreOriginal || vistos.has(rec.nombreOriginal)) return;
            vistos.add(rec.nombreOriginal);
            cuenta[rec.letra] = (cuenta[rec.letra] || 0) + 1;
        });
        return cuenta;
    }

    // ----- Pantalla para editar las letras -----
    window.stuEditarLetras = function (mensajeHtml) {
        const mapa = stuCodigosEstado();
        const cuenta = stuConteoLetras();
        const hayLetrasGuardadas = Object.keys(cuenta).length > 0;
        const filas = Object.keys(mapa)
            .map(l => ({ l: l, e: mapa[l] }))
            .concat(Object.keys(cuenta).filter(l => !mapa[l]).map(l => ({ l: l, e: "", nueva: true })));
        window._stuLetrasEdit = filas;

        const filasHtml = filas
            .map((f, i) => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                <input id="stuLetra_${i}" class="input-field" style="margin:0;width:64px;min-height:42px;padding:8px;text-align:center;text-transform:uppercase;" maxlength="3" value="${escHtml(f.l)}">
                <input id="stuEstado_${i}" class="input-field" style="margin:0;flex:1;min-height:42px;padding:8px;" list="stuEstadosLista" placeholder="${f.nueva ? "¿Qué significa?" : "Estado"}" value="${escHtml(f.e)}">
                <span style="font-size:11.5px;color:var(--ink-soft);width:46px;text-align:center;">${cuenta[f.l] ? cuenta[f.l] + " op." : ""}</span>
                <button type="button" class="icon-btn" style="min-width:36px;min-height:36px;" aria-label="Quitar" onclick="stuQuitarLetra(${i})">✕</button>
              </div>`)
            .join("");

        openSheet(`<h2>🔤 Letras de estado del operador</h2>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;line-height:1.45;">
            Si en la columna <b>UNIDAD</b> de DATOS OP un operador trae una de estas letras en lugar del número de unidad,
            la app lo toma con ese estado: <b>no cuenta como guardia ni como disponible</b>.
          </div>
          ${mensajeHtml ? `<div style="margin:0 0 10px;padding:9px 11px;border-radius:10px;font-size:12.5px;font-weight:700;background:#e6f6ec;color:#17703a;">${mensajeHtml}</div>` : ""}
          ${!hayLetrasGuardadas ? `<div style="margin:0 0 10px;padding:9px 11px;border-radius:10px;font-size:12px;background:#fff4d6;color:#7a5b00;">Para que los cambios se apliquen al momento, sube una vez tu archivo de datos con esta versión. Después ya no hace falta.</div>` : ""}
          <div style="display:flex;gap:6px;font-size:11.5px;font-weight:800;color:var(--ink-soft);margin-bottom:4px;"><span style="width:64px;text-align:center;">Letra</span><span style="flex:1;">Significa</span></div>
          <div id="stuLetrasFilas">${filasHtml}</div>
          <datalist id="stuEstadosLista">${["Baja", "Incapacidad", "Capacitación", "Préstamo", "Permiso", "Vacaciones", "Apoyo Turismo", "Falta"].map(e => `<option value="${e}">`).join("")}</datalist>
          <button type="button" class="btn-outline" style="margin-top:6px;" onclick="stuAgregarLetra()">➕ Agregar letra</button>
          <div id="stuLetrasMsg" style="font-size:12.5px;font-weight:700;color:var(--bad);margin-top:8px;"></div>
          <button type="button" class="btn-primary" style="background:var(--accent);" onclick="stuGuardarLetras()">Guardar para todos</button>
          <button type="button" class="btn-outline" style="color:var(--ink-soft);border-color:var(--ink-faint);" onclick="stuRestaurarLetras()">Volver a las de fábrica</button>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cerrar</button>`);
    };

    function stuLeerFilasLetras() {
        return (window._stuLetrasEdit || []).map((f, i) => {
            const elL = document.getElementById("stuLetra_" + i);
            const elE = document.getElementById("stuEstado_" + i);
            return { l: elL ? elL.value : f.l, e: elE ? elE.value : f.e, quitada: f.quitada };
        });
    }

    window.stuAgregarLetra = function () {
        const filas = stuLeerFilasLetras();
        filas.push({ l: "", e: "" });
        window._stuLetrasEdit = filas;
        stuRedibujarFilasLetras();
    };

    window.stuQuitarLetra = function (i) {
        const filas = stuLeerFilasLetras();
        filas.splice(i, 1);
        window._stuLetrasEdit = filas;
        stuRedibujarFilasLetras();
    };

    function stuRedibujarFilasLetras() {
        const cuenta = stuConteoLetras();
        const cont = document.getElementById("stuLetrasFilas");
        if (!cont) return;
        cont.innerHTML = (window._stuLetrasEdit || [])
            .map((f, i) => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                <input id="stuLetra_${i}" class="input-field" style="margin:0;width:64px;min-height:42px;padding:8px;text-align:center;text-transform:uppercase;" maxlength="3" value="${escHtml(f.l)}">
                <input id="stuEstado_${i}" class="input-field" style="margin:0;flex:1;min-height:42px;padding:8px;" list="stuEstadosLista" placeholder="Estado" value="${escHtml(f.e)}">
                <span style="font-size:11.5px;color:var(--ink-soft);width:46px;text-align:center;">${cuenta[stuLetraNorm(f.l)] ? cuenta[stuLetraNorm(f.l)] + " op." : ""}</span>
                <button type="button" class="icon-btn" style="min-width:36px;min-height:36px;" aria-label="Quitar" onclick="stuQuitarLetra(${i})">✕</button>
              </div>`)
            .join("");
    }

    function stuGuardarMapaLetras(nuevoMapa, mensaje) {
        const anteriores = Object.values(stuCodigosEstado());
        store.codigosEstado = nuevoMapa;
        stuSincronizarEstadosCriticos();
        const n = stuAplicarLetrasAOperadores(anteriores);
        savePatch({ codigosEstado: nuevoMapa || {}, unassignedReasons: store.unassignedReasons || {} });
        window.render();
        window.stuEditarLetras(`✅ ${mensaje} Se aplicó a ${n} operador(es).`);
    }

    window.stuGuardarLetras = function () {
        const filas = stuLeerFilasLetras();
        const nuevo = {};
        const msg = document.getElementById("stuLetrasMsg");
        for (const f of filas) {
            const l = stuLetraNorm(f.l);
            const e = String(f.e || "").replace(/\s+/g, " ").trim();
            if (!l && !e) continue;
            if (!l || /\d/.test(l)) {
                if (msg) msg.textContent = `La letra "${f.l}" no es válida: usa solo letras (sin números).`;
                return;
            }
            if (!e) {
                if (msg) msg.textContent = `Escribe qué significa la letra ${l}.`;
                return;
            }
            if (nuevo[l]) {
                if (msg) msg.textContent = `La letra ${l} está repetida.`;
                return;
            }
            nuevo[l] = e.charAt(0).toUpperCase() + e.slice(1);
        }
        if (!Object.keys(nuevo).length) {
            if (msg) msg.textContent = "Deja al menos una letra.";
            return;
        }
        stuGuardarMapaLetras(nuevo, "Letras guardadas para todos los equipos.");
    };

    window.stuRestaurarLetras = function () {
        stuGuardarMapaLetras(Object.assign({}, CODIGOS_ESTADO_DEFAULT), "Se restauraron las letras de fábrica.");
    };

    // CU (sin confundir con CU2 / Ecocampus): acepta "CU", "C.U." y "Ciudad Universitaria"
    function stuEsCU(n) {
        const s = String(n || "").replace(/\./g, "").replace(/\s+/g, " ").trim();
        return s === "CU" || s === "CIUDAD UNIVERSITARIA";
    }

    function stuGrupoVuelta(loc) {
        const n = String(normLoc(loc)).normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (stuEsCU(n)) return "CU";
        if (/CAMINO REAL/.test(n)) return "CAMINO_REAL";
        if (/TLAXCALANCINGO/.test(n)) return "TLAXCALANCINGO";
        if (/CUAU?TLANCINGO/.test(n)) return "CUAUTLANCINGO";
        if (/BACHILLER/.test(n)) return "BACHILLER";
        return n;
    }

    // [destino de la ida, origen del regreso]: la ida sale de CU y el regreso llega a CU
    const STU_CIRCUITOS_REDONDOS = [
        ["CAMINO_REAL", "TLAXCALANCINGO"],
        ["CUAUTLANCINGO", "BACHILLER"],
        ["BACHILLER", "CUAUTLANCINGO"]
    ];

    window.stuEsVueltaRedonda = function (cur, next) {
        if (!cur || !next) return false;
        if (normLoc(cur.o) === normLoc(next.d) && normLoc(cur.d) === normLoc(next.o)) return true; // ida y vuelta normal
        if (stuGrupoVuelta(cur.o) !== "CU" || stuGrupoVuelta(next.d) !== "CU") return false;
        const gIda = stuGrupoVuelta(cur.d);
        const gRegreso = stuGrupoVuelta(next.o);
        return STU_CIRCUITOS_REDONDOS.some(par => par[0] === gIda && par[1] === gRegreso);
    };

    window.stuContarVueltas = function (viajes) {
        const v = (viajes || []).slice().sort((a, b) => String(a.h).localeCompare(String(b.h)));
        let vueltas = 0;
        let i = 0;
        while (i < v.length) {
            if (v[i + 1] && window.stuEsVueltaRedonda(v[i], v[i + 1])) {
                vueltas++;
                i += 2;
                continue;
            }
            vueltas++;
            i++;
        }
        return vueltas;
    };

    // Pestaña Flota (copia de la de index.html; lo único distinto es cómo cuenta las vueltas)
    window.renderFlota = function renderFlota() {
        let ds = getDayState();
        let opsMap = {}; if(store.operadoresDB) Object.keys(store.operadoresDB).forEach(k => opsMap[store.operadoresDB[k]] = k);
        let baselineOp = {}; if(store.globalFleet) { store.globalFleet.forEach(g => { if(g && g.u && g.n) baselineOp[String(g.u)] = g.n; }); }

        let allTrips = (store.days[store.currentDay] && store.days[store.currentDay].trips) ? store.days[store.currentDay].trips : [];
        let opsTrips = {};
        (allTrips || []).forEach(t => {
            let asg = resolveTripAssignment(t, ds, baselineOp);
            if(asg.op) { 
                if(!opsTrips[asg.op]) opsTrips[asg.op] = []; 
                opsTrips[asg.op].push(t); 
            }
        });

        // Vueltas redondas: ahora también cuentan los circuitos CU–Camino Real + Tlaxcalancingo–CU, etc.
        function getVueltas(opName) {
            if (!opName) return 0;
            return window.stuContarVueltas(opsTrips[opName] || []);
        }

        let unitToOp = {}; let opToUnit = {};
        FLOTA_FIJA.forEach(f => {
            let u = String(f.u);
            if (isUnidadEnTallerOInhabil(u)) return;
            let defaultOp = baselineOp[u] || "";
            let overVal = ds.opOverride[fbKey(u)] !== undefined ? ds.opOverride[fbKey(u)] : ds.opOverride[u];
            let op = overVal !== undefined ? (overVal==="VACIO"?"":overVal) : defaultOp;
            if(op && isOperadorActivo(op)) { unitToOp[u] = op; opToUnit[op] = u; }
        });

        if(ds.unitOverride) {
            Object.keys(ds.unitOverride).forEach(opKey => {
                let u = ds.unitOverride[opKey];
                let actualOpName = store.operadoresDB[opKey] || opKey;
                if (u === "VACIO") {
                    if(opToUnit[actualOpName]) {
                        let oldU = opToUnit[actualOpName];
                        if(unitToOp[oldU] === actualOpName) delete unitToOp[oldU];
                        delete opToUnit[actualOpName];
                    }
                } else if (u && !isUnidadEnTallerOInhabil(u) && isOperadorActivo(actualOpName)) {
                    if(opToUnit[actualOpName]) {
                        let oldU = opToUnit[actualOpName];
                        if(unitToOp[oldU] === actualOpName) delete unitToOp[oldU];
                    }
                    unitToOp[u] = actualOpName; opToUnit[actualOpName] = u;
                }
            });
        }

        let rows = []; let processedUnits = new Set(); let processedOps = new Set();

        FLOTA_FIJA.forEach(f => {
            let u = String(f.u);
            if(!processedUnits.has(u)) {
                let op = unitToOp[u];
                if(op) { rows.push({ u: u, k: opsMap[op]||f.k||"", n: op }); processedUnits.add(u); processedOps.add(op); }
                else { rows.push({ u: u, k: "", n: "" }); processedUnits.add(u); }
            }
        });

        Object.keys(store.operadoresDB || {}).forEach(clave => {
            let opName = store.operadoresDB[clave];
            if(opName && !processedOps.has(opName)) { rows.push({ u: "", k: clave, n: opName }); processedOps.add(opName); }
        });

        rows.forEach(r => {
            let uReason = getMotivoUnidad(r.u);
            let opMeta = getOpMeta(r.n);
            let opReason = getReasonForEntity(r.n) || getReasonForEntity(r.k);
            r.v = getVueltas(r.n);
            r.p = opMeta.puntualidad !== null ? opMeta.puntualidad : -1;
            r.sortWeight = 1; 
            let opLow = (opReason || "").toLowerCase();
            let nLow = (r.n || "").toLowerCase();
            let isTurismo = opMeta.esTurismo;
            let isBaja = opMeta.esBaja || (opMeta.puntualidad !== null && opMeta.puntualidad === 0);
            let isApoyo = !isTurismo && (opLow.includes("apoyo") || nLow.includes("apoyo"));

            if (isTurismo) {
                r.st = "🚌 Apoyo Turismo (No activo)";
                r.cat = "row-gray";
                r.sortWeight = 3;
            } else if (isBaja) {
                r.st = opMeta.puntualidad === 0 ? "⛔ Puntualidad 0 (No contemplado)" : "⛔ Baja";
                r.cat = "row-baja";
                r.sortWeight = 3;
            } else if(r.u && r.n) {
                r.st = "Asignado"; r.cat = "row-ok";
                if(isApoyo) { r.cat = "row-gray"; r.st = "Asignado (Apoyo)"; } 
                if(uReason) { r.st = `🔧 ${stuDiasTaller(r.u) ? stuDiasTaller(r.u) + " · " : ""}Taller: ${uReason}`; r.cat = "row-bad"; }
                else if(opReason && !isApoyo) { r.st = `⚠️ Operador: ${opReason}`; r.cat = stuClaseEstado(opReason) || "row-bad"; }
            } else if(r.u && !r.n) {
                if(uReason) { r.st = `🔧 ${stuDiasTaller(r.u) ? stuDiasTaller(r.u) + " · " : ""}En Taller (${uReason})`; r.cat = "row-bad"; }
                else { r.st = "Disponible (Sin Op)"; r.cat = "row-disp"; }
            } else if(!r.u && r.n) {
                if (isApoyo) {
                    r.st = opReason || "Apoyo"; r.cat = "row-gray"; r.sortWeight = 2; 
                } else if(opReason && ESTADOS_CRITICOS.includes(opReason)) {
                    r.st = `${stuEmojiEstado(opReason)} ${opReason}`; r.cat = stuClaseEstado(opReason) || "row-bad";
                } else {
                    r.st = "Habilitado (Sin unidad)"; r.cat = "row-warn";
                }
            }
        });

        if(searchTerm) {
            let st = searchTerm.toLowerCase();
            rows = rows.filter(x => ((x.u||"")+" "+(x.n||"")+" "+(x.k||"")+" "+(x.st||"")).toLowerCase().includes(st));
        }
    
        if(showRevisar) {
            rows = rows.filter(r => r.cat === "row-bad" || r.cat === "row-warn" || r.cat === "row-disp");
        }

        rows.sort((a,b) => {
            if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
            let valA = a[flotaSortCol] ?? ""; let valB = b[flotaSortCol] ?? "";
            if(flotaSortCol === 'u' || flotaSortCol === 'k' || flotaSortCol === 'v' || flotaSortCol === 'p') return (Number(valA) - Number(valB)) * flotaSortDir;
            return String(valA).localeCompare(String(valB)) * flotaSortDir;
        });

        let trs = rows.map(r => {
            let safeU = encodeURIComponent(r.u || '');
            let safeK = encodeURIComponent(r.k || '');
            let safeN = encodeURIComponent(r.n || '');
            return `
            <tr class="${r.cat}" onclick="abrirModalFlotaDedicado(decodeURIComponent('${safeU}'), decodeURIComponent('${safeK}'), decodeURIComponent('${safeN}'))">
                <td class="mono" style="font-weight:800;">${r.u ? 'U-'+r.u : '---'}</td>
                <td class="mono">${r.k || '---'}</td>
                <td><b>${r.n || '---'}</b></td>
                <td style="text-align:center;">${r.n ? (renderPuntualidadBadge(r.n) || '—') : '—'}</td>
                <td style="text-align:center; font-weight:800; color:var(--accent); font-size:14px;">${r.v}</td>
                <td>${r.st}</td>
            </tr>`;
        }).join('');

        let html = `
        <div style="padding: 0 12px 14px;">
            <div class="table-container">
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th class="${flotaSortCol==='u'?'th-active':''}" onclick="sortFlota('u')">Unidad <span class="sort-arrow">${flotaSortDir===1?'↑':'↓'}</span></th>
                            <th class="${flotaSortCol==='k'?'th-active':''}" onclick="sortFlota('k')">Clave <span class="sort-arrow">${flotaSortDir===1?'↑':'↓'}</span></th>
                            <th class="${flotaSortCol==='n'?'th-active':''}" onclick="sortFlota('n')">Operador <span class="sort-arrow">${flotaSortDir===1?'↑':'↓'}</span></th>
                            <th class="${flotaSortCol==='p'?'th-active':''}" onclick="sortFlota('p')" style="text-align:center;">Punt. AS <span class="sort-arrow">${flotaSortDir===1?'↑':'↓'}</span></th>
                            <th class="${flotaSortCol==='v'?'th-active':''}" onclick="sortFlota('v')" style="text-align:center;">Vueltas <span class="sort-arrow">${flotaSortDir===1?'↑':'↓'}</span></th>
                            <th class="${flotaSortCol==='st'?'th-active':''}" onclick="sortFlota('st')">Disponibilidad <span class="sort-arrow">${flotaSortDir===1?'↑':'↓'}</span></th>
                        </tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>
        </div>`;

        document.getElementById("list").innerHTML = html || "<div style='text-align:center;padding:40px;color:gray;'>Flota vacía o sin coincidencias.</div>";
    };

    // =========================================================================
    // 6G. TABLERO v2: MÁS FÁCIL DE LEER EN EL TELÉFONO
    //     Responde en orden lo que se necesita en andén:
    //       1) ¿Qué viajes faltan por cubrir en las próximas 2 horas y quién llega a tiempo?
    //       2) ¿Quién está libre, dónde está y hasta qué hora?
    //       3) ¿Qué vuelta CU–CU2 se puede quitar para liberar a alguien?
    //       4) Foráneas próximas, unidades en patio y en taller (se abren al tocarlas)
    //     Se actualiza solo cada minuto cuando estás viendo "Ahora".
    // =========================================================================
    const TAB_VENTANA_MIN = 120;      // Viajes por cubrir: de 10 min antes a 2 horas después
    const TAB_MAX_SUGERENCIAS = 10;   // A cuántos viajes con problema se les busca quién cubre
    const TAB_MAX_CU2 = 15;
    window._stuTabAbiertos = window._stuTabAbiertos || { cubrir: true, libres: true };

    function inyectarEstilosTablero() {
        if (document.getElementById("stu-extras-tablero-styles")) return;
        const st = document.createElement("style");
        st.id = "stu-extras-tablero-styles";
        st.textContent = `
            .tb-wrap { padding: 0 12px 20px; display: flex; flex-direction: column; gap: 10px; }
            .tb-hora { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
            .tb-hora-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .tb-hora-txt { font-size: 12.5px; color: var(--ink-soft); font-weight: 700; line-height: 1.3; }
            .tb-hora-txt b { display: block; font-size: 20px; color: var(--accent); font-weight: 800; }
            .tb-hora input[type=time] { border: 1.5px solid var(--line); border-radius: 10px; padding: 7px 8px; font-size: 15px; font-weight: 700; background: var(--surface-2); color: var(--ink); font-family: inherit; }
            .tb-chips { display: flex; gap: 6px; overflow-x: auto; margin-top: 8px; scrollbar-width: none; }
            .tb-chips::-webkit-scrollbar { display: none; }
            .tb-chip { flex: 0 0 auto; border: 1px solid var(--line); background: var(--surface-2); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; color: var(--ink); cursor: pointer; font-family: inherit; }
            .tb-chip.on { background: var(--accent); color: #fff; border-color: var(--accent); }
            .tb-chip-h { display: flex; flex-direction: column; align-items: center; line-height: 1.1; padding: 5px 11px; border-radius: 12px; font-family: "IBM Plex Mono", monospace; }
            .tb-chip-h small { font-size: 10px; font-weight: 600; opacity: 0.75; font-family: "IBM Plex Sans", sans-serif; }
            .tb-chip-h.actual { border: 2px solid var(--accent); }
            .tb-sel-hora { border: 1.5px solid var(--line); border-radius: 10px; padding: 8px 10px; font-size: 16px; font-weight: 800; background: var(--surface-2); color: var(--ink); font-family: "IBM Plex Mono", monospace; appearance: auto; }
            .stu-dias-taller { display: inline-block; background: #7F1020; color: #fff; font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; margin-left: 4px; vertical-align: middle; }

            .tb-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
            .tb-kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 9px 4px; text-align: center; cursor: pointer; font-family: inherit; color: var(--ink); }
            .tb-kpi:active { transform: scale(0.96); }
            .tb-kpi b { display: block; font-size: 22px; font-family: "IBM Plex Mono", monospace; line-height: 1.1; }
            .tb-kpi span { display: block; font-size: 11px; font-weight: 700; color: var(--ink-soft); line-height: 1.2; margin-top: 3px; }
            .tb-kpi.rojo b { color: var(--bad); }
            .tb-kpi.rojo.alerta { background: var(--bad-bg); border-color: var(--bad); }
            .tb-kpi.verde b { color: var(--done); }
            .tb-kpi.azul b { color: var(--accent); }
            .tb-kpi.gris b { color: var(--ink-soft); }

            details.tb-sec { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
            details.tb-sec > summary { list-style: none; cursor: pointer; padding: 12px 14px; font-weight: 800; font-size: 15px; display: flex; align-items: center; gap: 8px; color: var(--ink); }
            details.tb-sec > summary::-webkit-details-marker { display: none; }
            details.tb-sec > summary::after { content: "▾"; font-size: 14px; color: var(--ink-faint); transition: transform 0.15s; }
            details.tb-sec[open] > summary::after { transform: rotate(180deg); }
            .tb-n { margin-left: auto; background: var(--surface-2); border-radius: 999px; padding: 2px 9px; font-size: 12.5px; font-family: "IBM Plex Mono", monospace; }
            .tb-n.rojo { background: var(--bad); color: #fff; }
            .tb-body { padding: 0 12px 12px; }
            .tb-ayuda { font-size: 12px; color: var(--ink-soft); margin: -4px 2px 10px; line-height: 1.4; }
            .tb-sub { font-size: 11.5px; font-weight: 800; color: var(--ink-soft); margin: 12px 2px 4px; text-transform: uppercase; letter-spacing: 0.3px; }
            .tb-vacio { text-align: center; color: var(--ink-soft); font-size: 13px; padding: 12px; background: var(--surface-2); border-radius: 10px; }
            .tb-vacio.bien { background: var(--done-bg); color: var(--done); font-weight: 800; }

            .tb-item { border: 1px solid var(--line); border-radius: 12px; padding: 10px; margin-bottom: 8px; background: var(--surface); }
            .tb-item.prob { border-left: 5px solid var(--bad); }
            .tb-fila { display: flex; align-items: center; gap: 8px; }
            .tb-h { font-family: "IBM Plex Mono", monospace; font-weight: 800; font-size: 15px; width: 46px; flex-shrink: 0; }
            .tb-ruta { font-weight: 800; font-size: 14px; flex: 1; min-width: 0; word-break: break-word; }
            .tb-quien-txt { font-size: 12.5px; color: var(--ink-soft); margin-top: 3px; }
            .tb-falta { display: inline-block; background: var(--bad-bg); color: var(--bad); font-size: 11.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; margin: 5px 4px 0 0; }
            .tb-sug { margin-top: 8px; background: var(--done-bg); color: #14532d; border-radius: 10px; padding: 8px 10px; font-size: 12.5px; line-height: 1.4; }
            .tb-sug b { color: #14532d; }
            .tb-sug.nadie { background: var(--pend-bg); color: var(--pend); font-weight: 700; }
            .tb-btn { border: none; background: var(--accent); color: #fff; font-weight: 800; font-size: 13px; border-radius: 9px; padding: 9px 12px; cursor: pointer; flex-shrink: 0; font-family: inherit; }
            .tb-btn:active { transform: scale(0.95); }

            .tb-libre { display: flex; align-items: center; gap: 8px; padding: 9px 2px; border-bottom: 1px solid var(--line); }
            .tb-libre:last-child { border-bottom: none; }
            .tb-min { font-family: "IBM Plex Mono", monospace; font-weight: 800; font-size: 12.5px; border-radius: 8px; padding: 5px 6px; flex-shrink: 0; min-width: 62px; text-align: center; }
            .tb-min.v { background: var(--done-bg); color: var(--done); }
            .tb-min.n { background: var(--pend-bg); color: var(--pend); }
            .tb-min.g { background: #e0f2fe; color: #0369a1; }
            .tb-min.r { background: var(--surface-2); color: var(--ink-soft); }
            .tb-quien { flex: 1; min-width: 0; }
            .tb-quien b { font-size: 14px; }
            .tb-quien small { display: block; color: var(--ink-soft); font-size: 12px; margin-top: 1px; line-height: 1.3; }
            .tb-u { font-family: "IBM Plex Mono", monospace; font-weight: 800; font-size: 12px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px; padding: 2px 6px; flex-shrink: 0; }

            .tb-pills { display: flex; flex-wrap: wrap; gap: 5px; }
            .tb-pill { font-weight: 800; font-size: 12.5px; padding: 5px 9px; border-radius: 7px; }
            .tb-pill.ok { background: var(--done-bg); color: var(--done); }
            .tb-pill.mal { background: var(--bad-bg); color: var(--bad); }
            .tb-estado { font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
            .tb-estado.pend { background: var(--pend-bg); color: var(--pend); }
            .tb-estado.term { background: #e0f2fe; color: var(--accent); }
            .tb-estado.form { background: var(--done-bg); color: var(--done); }

            /* Barra superior: que quepan todos los botones en teléfonos angostos */
            @media (max-width: 480px) {
                .native-appbar { padding-left: 12px !important; padding-right: 12px !important; gap: 6px !important; }
                .appbar-title { font-size: 16px !important; }
                .appbar-right { gap: 5px !important; }
                .clock { font-size: 16px !important; padding: 5px 7px !important; }
                .fullscreen-btn-top, .icon-btn-top { min-width: 34px !important; min-height: 34px !important; padding: 5px !important; }
                .icon-btn-top svg { width: 19px !important; height: 19px !important; }
            }
        `;
        document.head.appendChild(st);
    }

    function tabTexto(v) {
        return String(v === null || v === undefined ? "" : v);
    }

    function tabCoincide(texto) {
        if (!searchTerm) return true;
        return tabTexto(texto).toLowerCase().indexOf(searchTerm) !== -1;
    }

    function tabBaseline() {
        const b = {};
        (store.globalFleet || []).forEach(g => {
            if (g && g.u && g.n) b[String(g.u)] = g.n;
        });
        return b;
    }

    function tabRefMin() {
        const d = new Date();
        const nowMin = d.getHours() * 60 + d.getMinutes();
        return dashSelectedBlock === "LIVE" ? nowMin : hhmmToMins(dashSelectedBlock);
    }

    function tabAttr(v) {
        return encodeURIComponent(tabTexto(v)).replace(/'/g, "%27");
    }

    // Botón "Cubrir": abre la ventana de cambio con las sugerencias completas
    function tabBotonCubrir(t, a, texto) {
        return `<button type="button" class="tb-btn" onclick="event.stopPropagation(); abrirModalDesdePendientes(decodeURIComponent('${tabAttr(t.id)}'), decodeURIComponent('${tabAttr(a.unit)}'), decodeURIComponent('${tabAttr(a.op)}'), decodeURIComponent('${tabAttr(t.k || t.n || "")}'))">${texto || "Cubrir"}</button>`;
    }

    // ---- 1) Viajes con problema en las próximas 2 horas ----
    function tabViajesPorCubrir(trips, ds, base, refMin) {
        const out = [];
        trips.forEach(t => {
            const tm = hhmmToMins(t.h);
            if (tm < refMin - 10 || tm > refMin + TAB_VENTANA_MIN) return;
            const st = getTripState(t.id);
            if (st.hidden || st.status === "formado") return;
            if (ds.resolvedMissing && ds.resolvedMissing.includes(t.id)) return;

            const a = resolveTripAssignment(t, ds, base);
            const motivos = [];
            if (!a.unit) motivos.push("Sin unidad");
            else if (isUnidadEnTallerOInhabil(a.unit)) motivos.push(`U-${a.unit} en taller`);
            if (!a.op) motivos.push("Sin operador");
            else if (!isOperadorActivo(a.op)) motivos.push(`${a.op}: ${getReasonForEntity(a.op) || "no disponible"}`);
            const choque = (globalCollisions || []).find(c => c.t2Id === t.id);
            if (choque) motivos.push(`No le da tiempo (empalme ${choque.empalme} min)`);
            if (!motivos.length) return;

            const textoBusqueda = `${t.h} ${t.o} a ${t.d} ${a.op} ${a.unit} ${t.k || ""} ${motivos.join(" ")}`;
            if (!tabCoincide(textoBusqueda)) return;
            out.push({ t: t, a: a, motivos: motivos, tm: tm });
        });
        out.sort((x, y) => x.tm - y.tm);
        return out;
    }

    function tabHtmlPorCubrir(lista, refMin) {
        if (!lista.length) {
            return `<div class="tb-vacio bien">✅ Todo cubierto en las próximas 2 horas.</div>`;
        }
        return lista
            .map((p, i) => {
                const t = p.t;
                const ruta = escHtml(formatRouteName(t.o, t.d));
                const faltaMin = p.tm - refMin;
                const cuando = faltaMin < 0 ? `ya debió salir` : faltaMin === 0 ? `sale ahora` : `sale en ${faltaMin} min`;
                const quien = `${p.a.unit ? "U-" + escHtml(p.a.unit) : "S/U"} · ${escHtml(p.a.op || "Sin operador")}`;
                const motivos = p.motivos.map(m => `<span class="tb-falta">${escHtml(m)}</span>`).join("");

                let sugHtml = "";
                if (i < TAB_MAX_SUGERENCIAS) {
                    let cands = [];
                    try {
                        cands = recomendarCandidatosParaViaje(t) || [];
                    } catch (e) {
                        cands = [];
                    }
                    if (cands.length) {
                        const c = cands[0];
                        const extra = cands.length > 1 ? ` · ${cands.length - 1} opción(es) más al tocar Cubrir` : "";
                        sugHtml = `<div class="tb-sug">✅ <b>Llega a tiempo: ${escHtml(c.op)}${c.unit ? " (U-" + escHtml(c.unit) + ")" : ""}</b><br>${escHtml(c.windowText)}${extra}</div>`;
                    } else {
                        sugHtml = `<div class="tb-sug nadie">⚠️ Nadie llega a tiempo. Revisa si puedes quitar una vuelta CU–CU2 (más abajo).</div>`;
                    }
                }

                return `<div class="tb-item prob">
                    <div class="tb-fila">
                      <span class="tb-h">${escHtml(t.h)}</span>
                      <div class="tb-ruta">${ruta}<div class="tb-quien-txt">${quien} · ${cuando}</div></div>
                      ${tabBotonCubrir(t, p.a)}
                    </div>
                    <div>${motivos}</div>
                    ${sugHtml}
                  </div>`;
            })
            .join("");
    }

    // ---- 2) Quién está libre ----
    function tabFilaLibre(w, tipo) {
        let etiqueta, clase, detalle;
        const ubic = escHtml(w.ubicacion || "");
        if (tipo === "guardia") {
            etiqueta = "Guardia";
            clase = "g";
            detalle = "Sin vueltas hoy: puede cubrir lo que sea";
        } else if (tipo === "termino") {
            etiqueta = "Terminó";
            clase = "r";
            detalle = `Terminó su rol en ${ubic} a las ${escHtml(w.winFrom)}`;
        } else if (tipo === "ruta") {
            etiqueta = escHtml(w.winFrom);
            clase = "r";
            detalle = `${ubic} · siguiente: ${escHtml(w.proxima)}`;
        } else {
            const m = Math.max(0, Math.round(w.freeMins));
            etiqueta = m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
            clase = m >= 60 ? "v" : "n";
            detalle =
                w.winFrom === "05:00" && !w.isGuardia
                    ? `Aún no inicia · primera salida ${escHtml(w.winTo)} en ${ubic}`
                    : `En ${ubic} · libre hasta ${escHtml(w.winTo)}`;
        }
        return `<div class="tb-libre" style="cursor:pointer;" onclick="stuCambiarEstadoOp(decodeURIComponent('${tabAttr(w.nombre)}'))">
            <span class="tb-min ${clase}">${etiqueta}</span>
            <div class="tb-quien"><b>${escHtml(w.nombre)}</b> ${renderPuntualidadBadge(w.nombre)}<small>${detalle}</small></div>
            <span class="tb-u">${w.unidad ? "U-" + escHtml(w.unidad) : "S/U"}</span>
          </div>`;
    }

    function tabHtmlLibres(opWindows) {
        const vis = opWindows.filter(w => tabCoincide(`${w.nombre} ${w.unidad} ${w.ubicacion}`));
        const guardias = vis.filter(w => w.freeNow && (!w.trips || !w.trips.length));
        const terminaron = vis.filter(w => w.freeNow && w.trips && w.trips.length && w.freeMins >= 800);
        const conTiempo = vis
            .filter(w => w.freeNow && w.trips && w.trips.length && w.freeMins < 800)
            .sort((a, b) => b.freeMins - a.freeMins);
        const enRuta = vis.filter(w => !w.freeNow).sort((a, b) => hhmmToMins(a.winFrom) - hhmmToMins(b.winFrom));

        let html = `<div class="tb-ayuda">El número de la izquierda es cuánto tiempo tienen libre antes de su siguiente salida (verde = más de 1 hora). <b>Toca a un operador</b> para marcar Falta, Préstamo, Permiso, etc.</div>`;
        if (!guardias.length && !conTiempo.length && !terminaron.length) {
            html += `<div class="tb-vacio">Nadie está libre a esta hora.</div>`;
        }
        if (guardias.length) html += `<div class="tb-sub">🛡️ Guardias (${guardias.length})</div>` + guardias.map(w => tabFilaLibre(w, "guardia")).join("");
        if (conTiempo.length) html += `<div class="tb-sub">🟢 Con tiempo libre (${conTiempo.length})</div>` + conTiempo.map(w => tabFilaLibre(w, "libre")).join("");
        if (terminaron.length) html += `<div class="tb-sub">🏁 Ya terminaron su rol (${terminaron.length})</div>` + terminaron.map(w => tabFilaLibre(w, "termino")).join("");
        if (enRuta.length) {
            html += `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:800;color:var(--ink-soft);padding:6px 2px;">🚌 En ruta o sin tiempo (${enRuta.length}) · toca para ver a qué hora llegan</summary>${enRuta
                .map(w => tabFilaLibre(w, "ruta"))
                .join("")}</details>`;
        }
        html += stuHtmlMarcadosHoy();
        return { html: html, total: guardias.length + conTiempo.length + terminaron.length };
    }

    // ---- 3) Vueltas CU–CU2 que se pueden quitar para liberar a alguien ----
    function tabVueltasCU2(trips, ds, base, refMin) {
        const porOp = {};
        trips.forEach(t => {
            const a = resolveTripAssignment(t, ds, base);
            if (!a.op) return;
            if (!porOp[a.op]) porOp[a.op] = [];
            porOp[a.op].push({ t: t, a: a });
        });
        const out = [];
        Object.keys(porOp).forEach(op => {
            const lista = porOp[op].sort((x, y) => x.t.h.localeCompare(y.t.h));
            for (let i = 0; i < lista.length; i++) {
                const cur = lista[i];
                const t = cur.t;
                const tm = hhmmToMins(t.h);
                if (tm < refMin || tm > refMin + TAB_VENTANA_MIN) continue;
                if (isForaneaTrip(t)) continue;
                const st = getTripState(t.id);
                if (st.hidden || st.status === "formado") continue;

                // Si la siguiente es el regreso (CU2➜CU después de CU➜CU2), se quitan las dos
                let fin = i;
                const sig = lista[i + 1];
                if (sig && !isForaneaTrip(sig.t) && normLoc(sig.t.o) === normLoc(t.d) && normLoc(sig.t.d) === normLoc(t.o)) fin = i + 1;

                const ant = lista[i - 1];
                const libreDesde = ant ? Math.max(refMin, hhmmToMins(ant.t.h) + getTripDuration(ant.t)) : Math.max(refMin, tm - 30);
                const dondeQueda = ant ? normLoc(ant.t.d) : normLoc(t.o);
                const despues = lista[fin + 1];
                const libreHasta = despues ? hhmmToMins(despues.t.h) : null;
                const minutos = libreHasta !== null ? libreHasta - libreDesde : null;

                const textoBusqueda = `${t.h} ${t.o} a ${t.d} ${op} ${cur.a.unit}`;
                if (tabCoincide(textoBusqueda)) {
                    out.push({
                        t: t,
                        a: cur.a,
                        par: fin > i ? lista[fin].t : null,
                        tm: tm,
                        donde: dondeQueda,
                        desde: minsToHhmm(libreDesde),
                        hasta: libreHasta !== null ? minsToHhmm(libreHasta) : "fin de turno",
                        minutos: minutos
                    });
                }
                i = fin; // no repetir el regreso como otra opción
            }
        });
        out.sort((x, y) => x.tm - y.tm);
        return out.slice(0, TAB_MAX_CU2);
    }

    function tabHtmlCU2(lista) {
        if (!lista.length) return `<div class="tb-vacio">No hay vueltas CU–CU2 en las próximas 2 horas.</div>`;
        return (
            `<div class="tb-ayuda">Si te falta alguien, quitar una de estas vueltas libera al operador. Toca "Usar" para reasignarlo desde el viaje.</div>` +
            lista
                .map(v => {
                    const rutaTxt = v.par
                        ? `${escHtml(formatRouteName(v.t.o, v.t.d))} y regreso ${escHtml(v.par.h)}`
                        : escHtml(formatRouteName(v.t.o, v.t.d));
                    const tiempo = v.minutos !== null ? `${v.minutos} min libres` : "libre el resto del turno";
                    return `<div class="tb-item">
                        <div class="tb-fila">
                          <span class="tb-h">${escHtml(v.t.h)}</span>
                          <div class="tb-ruta">${rutaTxt}<div class="tb-quien-txt">${v.a.unit ? "U-" + escHtml(v.a.unit) : "S/U"} · ${escHtml(v.a.op)}</div></div>
                          ${tabBotonCubrir(v.t, v.a, "Usar")}
                        </div>
                        <div class="tb-sug" style="background:#e0f2fe;color:#0c4a6e;">Si la quitas: queda en <b style="color:#0c4a6e;">${escHtml(v.donde)}</b> de ${escHtml(v.desde)} a ${escHtml(v.hasta)} (${tiempo})</div>
                      </div>`;
                })
                .join("")
        );
    }

    // ---- 4) Foráneas próximas (60 min) ----
    function tabHtmlForaneas(trips, ds, base, refMin) {
        const lista = trips
            .filter(t => {
                const tm = hhmmToMins(t.h);
                return tm >= refMin - 5 && tm <= refMin + 60 && isForaneaTrip(t);
            })
            .map(t => ({ t: t, a: resolveTripAssignment(t, ds, base), st: getTripState(t.id) }))
            .filter(x => tabCoincide(`${x.t.h} ${x.t.o} a ${x.t.d} ${x.a.op} ${x.a.unit}`))
            .sort((x, y) => x.t.h.localeCompare(y.t.h));
        if (!lista.length) return { html: `<div class="tb-vacio">No hay foráneas en la próxima hora.</div>`, total: 0 };
        const html = lista
            .map(x => {
                const mal = !x.a.unit || !x.a.op || isUnidadEnTallerOInhabil(x.a.unit) || (x.a.op && !isOperadorActivo(x.a.op));
                const estado =
                    x.st.status === "formado"
                        ? `<span class="tb-estado form">Formado</span>`
                        : x.st.status === "en_terminal"
                        ? `<span class="tb-estado term">En terminal</span>`
                        : `<span class="tb-estado pend">Pendiente</span>`;
                return `<div class="tb-item ${mal ? "prob" : ""}" style="cursor:pointer;" onclick="abrirModalDesdePendientes(decodeURIComponent('${tabAttr(x.t.id)}'), decodeURIComponent('${tabAttr(x.a.unit)}'), decodeURIComponent('${tabAttr(x.a.op)}'), decodeURIComponent('${tabAttr(x.t.k || x.t.n || "")}'))">
                    <div class="tb-fila">
                      <span class="tb-h">${escHtml(x.t.h)}</span>
                      <div class="tb-ruta">${escHtml(formatRouteName(x.t.o, x.t.d))}<div class="tb-quien-txt">${x.a.unit ? "U-" + escHtml(x.a.unit) : "🚨 S/U"} · ${escHtml(x.a.op || "🚨 Sin operador")}</div></div>
                      ${estado}
                    </div>
                  </div>`;
            })
            .join("");
        return { html: html, total: lista.length };
    }

    function tabSeccion(id, icono, titulo, n, nRojo, cuerpo) {
        const abierto = window._stuTabAbiertos[id] ? " open" : "";
        return `<details class="tb-sec" id="tbSec_${id}" data-sec="${id}"${abierto}>
            <summary>${icono} ${titulo}<span class="tb-n ${nRojo && n > 0 ? "rojo" : ""}">${n}</span></summary>
            <div class="tb-body">${cuerpo}</div>
          </details>`;
    }

    window.stuTabHora = function (valor) {
        dashSelectedBlock = valor ? valor : "LIVE";
        window.renderTablero();
    };

    window.stuTabIr = function (id) {
        window._stuTabAbiertos[id] = true;
        const el = document.getElementById("tbSec_" + id);
        if (!el) return;
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Recordar qué secciones dejaste abiertas aunque la pantalla se actualice
    document.addEventListener(
        "toggle",
        function (ev) {
            const el = ev.target;
            if (el && el.classList && el.classList.contains("tb-sec") && el.dataset.sec) {
                window._stuTabAbiertos[el.dataset.sec] = el.open;
            }
        },
        true
    );

    window.renderTablero = function () {
        inyectarEstilosTablero();
        inyectarEstilosEstados();
        const lista = document.getElementById("list");
        if (!lista) return;

        const dia = store.days && store.days[store.currentDay];
        const trips = dia && Array.isArray(dia.trips) ? dia.trips : [];
        if (!trips.length) {
            lista.innerHTML = `<div class="tb-wrap"><div class="tb-vacio" style="padding:30px 14px;">Aún no hay rol cargado. Súbelo desde ⚙️ arriba a la derecha.</div></div>`;
            return;
        }

        const ds = getDayState();
        const base = tabBaseline();
        const refMin = tabRefMin();
        const enVivo = dashSelectedBlock === "LIVE";

        const estado = calcularEstadoFlotaYVentanas(refMin);
        const porCubrir = tabViajesPorCubrir(trips, ds, base, refMin);
        const libres = tabHtmlLibres(estado.opWindows || []);
        const cu2 = tabVueltasCU2(trips, ds, base, refMin);
        const foraneas = tabHtmlForaneas(trips, ds, base, refMin);
        const patio = (estado.freeUnits || []).filter(f => tabCoincide("U-" + f.u));
        const taller = (estado.tallerUnits || []).filter(t => tabCoincide("U-" + t.u + " " + t.motivo));

        // Una casilla por cada hora del día que tiene salidas (formato 24 h), con cuántas salidas hay
        const salidasPorHora = {};
        trips.forEach(t => {
            const hh = String(t.h || "").slice(0, 2);
            if (/^\d\d$/.test(hh)) salidasPorHora[hh] = (salidasPorHora[hh] || 0) + 1;
        });
        const horaVista = String(minsToHhmm(refMin)).slice(0, 2);
        const chips =
            `<button type="button" class="tb-chip ${enVivo ? "on" : ""}" onclick="stuTabHora('')">Ahora</button>` +
            Object.keys(salidasPorHora)
                .sort()
                .map(hh => {
                    const on = !enVivo && horaVista === hh;
                    const actual = enVivo && horaVista === hh;
                    return `<button type="button" class="tb-chip tb-chip-h ${on ? "on" : ""} ${actual ? "actual" : ""}" data-h="${hh}" onclick="stuTabHora('${hh}:00')">${hh}:00<small>${salidasPorHora[hh]} sal.</small></button>`;
                })
                .join("");
        let opcionesHora = "";
        for (let m = 0; m < 1440; m += 15) {
            const v = minsToHhmm(m);
            opcionesHora += `<option value="${v}" ${Math.floor(refMin / 15) * 15 === m ? "selected" : ""}>${v}</option>`;
        }

        const html = `<div class="tb-wrap">
            <div class="tb-hora">
              <div class="tb-hora-top">
                <div class="tb-hora-txt">${enVivo ? "Así va la operación ahora" : "Así estará la operación a las"}<b class="mono">${minsToHhmm(refMin)}</b></div>
                <select class="tb-sel-hora" onchange="stuTabHora(this.value)" aria-label="Ver otra hora">${opcionesHora}</select>
              </div>
              <div class="tb-chips" id="tbChipsHoras">${chips}</div>
            </div>

            <div class="tb-kpis">
              <button type="button" class="tb-kpi rojo ${porCubrir.length ? "alerta" : ""}" onclick="stuTabIr('cubrir')"><b>${porCubrir.length}</b><span>Por cubrir</span></button>
              <button type="button" class="tb-kpi verde" onclick="stuTabIr('libres')"><b>${libres.total}</b><span>Operadores libres</span></button>
              <button type="button" class="tb-kpi azul" onclick="stuTabIr('patio')"><b>${patio.length}</b><span>Unidades en patio</span></button>
              <button type="button" class="tb-kpi gris" onclick="stuTabIr('taller')"><b>${taller.length}</b><span>En taller</span></button>
            </div>

            ${tabSeccion("cubrir", "🚨", "Por cubrir (próximas 2 h)", porCubrir.length, true,
                `<div class="tb-ayuda">Viajes sin unidad, sin operador, con unidad en taller o que no le da tiempo. Abajo de cada uno: quién sí llega a tiempo.</div>` + tabHtmlPorCubrir(porCubrir, refMin))}
            ${tabSeccion("libres", "🟢", "¿Quién está libre?", libres.total, false, libres.html)}
            ${tabSeccion("cu2", "🚎", "Vueltas CU–CU2 que puedes quitar", cu2.length, false, tabHtmlCU2(cu2))}
            ${tabSeccion("foraneas", "🛣️", "Foráneas en la próxima hora", foraneas.total, false, foraneas.html)}
            ${tabSeccion("patio", "🚌", "Unidades en patio (sin operador)", patio.length, false,
                patio.length ? `<div class="tb-pills">${patio.map(f => `<span class="tb-pill ok">U-${escHtml(f.u)}</span>`).join("")}</div>` : `<div class="tb-vacio">Todas las unidades disponibles tienen operador.</div>`)}
            ${tabSeccion("taller", "🔧", "Unidades en taller", taller.length, false,
                taller.length ? `<div class="tb-pills">${taller.map(t => `<span class="tb-pill mal">U-${escHtml(t.u)}${stuDiasTaller(t.u) ? " · " + escHtml(stuDiasTaller(t.u)) : ""} · ${escHtml(t.motivo)}</span>`).join("")}</div>` : `<div class="tb-vacio">Ninguna unidad en taller.</div>`)}
          </div>`;

        lista.innerHTML = html;
        try {
            const fila = document.getElementById("tbChipsHoras");
            const chip = fila && (fila.querySelector(".tb-chip-h.on") || fila.querySelector(".tb-chip-h.actual"));
            if (fila && chip) fila.scrollLeft = Math.max(0, chip.offsetLeft - fila.clientWidth / 2 + chip.offsetWidth / 2);
        } catch (e) {}
    };

    // Actualizar el tablero cada minuto cuando se ve "Ahora" (sin interrumpir si hay una ventana abierta)
    setInterval(function () {
        try {
            if (document.hidden) return;
            if (activeView !== "tablero" || dashSelectedBlock !== "LIVE") return;
            const ov = document.getElementById("overlay");
            if (ov && ov.classList.contains("show")) return;
            window.renderTablero();
        } catch (e) {}
    }, 60000);

    // =========================================================================
    // 6H. ESTADO DEL OPERADOR CON COLORES, MARCAR FALTAS DESDE EL TABLERO,
    //     CONFLICTOS DETALLADOS EN PENDIENTES Y FORMATO 24 HORAS
    //     Colores: Falta = rojo · Incapacidad = morado · Préstamo = amarillo ·
    //              Vacaciones = verde · Permiso = café
    // =========================================================================
    const STU_ESTADOS_COLOR = {
        "Falta": { clase: "row-est-falta", emoji: "🔴", bg: "#FDE2E4", fg: "#B01229" },
        "Incapacidad": { clase: "row-est-incap", emoji: "🟣", bg: "#EEE2FB", fg: "#6B21A8" },
        "Préstamo": { clase: "row-est-prest", emoji: "🟡", bg: "#FEF3B4", fg: "#7A5A00" },
        "Vacaciones": { clase: "row-est-vac", emoji: "🟢", bg: "#D9F5E1", fg: "#166534" },
        "Permiso": { clase: "row-est-perm", emoji: "🟤", bg: "#EADCCB", fg: "#6B4226" }
    };
    const STU_ESTADOS_MARCAR = ["Falta", "Préstamo", "Permiso", "Incapacidad", "Vacaciones", "Capacitación", "Apoyo", "Baja"];

    function stuClaseEstado(estado) {
        const c = STU_ESTADOS_COLOR[estado];
        return c ? c.clase : "";
    }
    function stuEmojiEstado(estado) {
        const c = STU_ESTADOS_COLOR[estado];
        return c ? c.emoji : "⛔";
    }
    function stuBadgeEstado(estado) {
        const c = STU_ESTADOS_COLOR[estado] || { bg: "#E2E8F0", fg: "#334155" };
        return `<span style="display:inline-block;background:${c.bg};color:${c.fg};font-weight:800;font-size:11.5px;padding:2px 8px;border-radius:6px;">${escHtml(estado)}</span>`;
    }
    window.stuClaseEstado = stuClaseEstado;

    function inyectarEstilosEstados() {
        if (document.getElementById("stu-extras-estados-styles")) return;
        const st = document.createElement("style");
        st.id = "stu-extras-estados-styles";
        st.textContent = Object.keys(STU_ESTADOS_COLOR)
            .map(k => {
                const c = STU_ESTADOS_COLOR[k];
                return `.excel-table tr.${c.clase} { background: ${c.bg}; color: ${c.fg}; font-weight: 700; }
                        .excel-table tr.${c.clase} td { color: ${c.fg}; }`;
            })
            .join("\n") + `
            .stu-est-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
            .stu-est-btn { border: 2px solid var(--line); background: var(--surface); border-radius: 12px; padding: 12px 8px; font-size: 14.5px; font-weight: 800; cursor: pointer; font-family: inherit; color: var(--ink); }
            .stu-est-btn.sel { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(0,80,157,0.2); }
            .stu-conf-viaje { border-radius: 10px; padding: 9px 10px; font-size: 13px; line-height: 1.4; }
            .stu-conf-viaje .lbl { display: block; font-size: 11px; font-weight: 800; margin-bottom: 2px; }
            .stu-conf-viaje .ruta { font-weight: 800; font-size: 14px; color: var(--ink); word-break: break-word; }
        `;
        document.head.appendChild(st);
    }

    // ----- Cambiar el estado de un operador (tocando su nombre en el Tablero) -----
    window.stuCambiarEstadoOp = function (nombre) {
        if (!nombre) return;
        inyectarEstilosEstados();
        const actual = getReasonForEntity(nombre) || "";
        const m = getOpMeta(nombre);
        const safe = tabAttr(nombre);
        const botones = ["Disponible"].concat(STU_ESTADOS_MARCAR)
            .map(e => {
                const c = STU_ESTADOS_COLOR[e];
                const sel = (e === "Disponible" && !actual) || e === actual;
                const estilo = c ? `background:${c.bg};color:${c.fg};` : e === "Disponible" ? "background:var(--done-bg);color:var(--done);" : "";
                return `<button type="button" class="stu-est-btn ${sel ? "sel" : ""}" style="${estilo}" onclick="stuGuardarEstadoOp(decodeURIComponent('${safe}'), '${e}')">${e === "Disponible" ? "✅ Disponible" : (c ? c.emoji + " " : "") + e}</button>`;
            })
            .join("");
        openSheet(`<h2>¿Cómo está ${escHtml(nombre)}?</h2>
          <div style="font-size:13px;color:var(--ink-soft);">${m.clave ? "Clave " + escHtml(m.clave) + " · " : ""}Ahora: ${actual ? stuBadgeEstado(actual) : "<b>Disponible</b>"}</div>
          <div class="stu-est-grid">${botones}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">Si no está disponible, sus viajes de hoy aparecen en <b>Por cubrir</b> y ya no sale como guardia. El cambio llega a todos los teléfonos y queda en el Historial.</div>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cancelar</button>`);
    };

    window.stuGuardarEstadoOp = function (nombre, estado) {
        const anterior = getReasonForEntity(nombre) || "Disponible";
        const nuevo = estado === "Disponible" ? "" : estado;
        setReasonForEntity(fbKey(nombre), nuevo || null);
        stuSincronizarEstadosCriticos();
        const rec = registrarEnHistorial({
            tripTime: "Todo el día",
            route: "Estado de operador",
            scope: `${anterior} ➜ ${estado}`,
            oldOp: nombre,
            newOp: nuevo ? `${nombre} (${estado})` : nombre,
            reason: estado,
            type: "Estado"
        });
        const ds = getDayState();
        closeSheet();
        window.render();
        savePatch({
            unassignedReasons: store.unassignedReasons || {},
            [`state/${fbKey(store.currentDay)}/unitChanges`]: ds.unitChanges,
            globalHistory: store.globalHistory
        });
        return rec;
    };

    // Lista de operadores marcados hoy (para poder regresarlos a "Disponible")
    function stuHtmlMarcadosHoy() {
        const nombres = Array.from(new Set(Object.values(store.operadoresDB || {}).filter(Boolean)));
        const marcados = [];
        let bajas = 0;
        nombres.forEach(n => {
            const r = getReasonForEntity(n);
            if (!r) return;
            if (r === "Baja" || r === "Apoyo Turismo") {
                bajas++;
                return;
            }
            if (!ESTADOS_CRITICOS.includes(r)) return;
            if (!tabCoincide(n + " " + r)) return;
            marcados.push({ n: n, r: r });
        });
        if (!marcados.length && !bajas) return "";
        marcados.sort((a, b) => a.r.localeCompare(b.r) || a.n.localeCompare(b.n));
        const filas = marcados
            .map(x => `<div class="tb-libre" style="cursor:pointer;" onclick="stuCambiarEstadoOp(decodeURIComponent('${tabAttr(x.n)}'))">
                <span style="min-width:62px;text-align:center;">${stuBadgeEstado(x.r)}</span>
                <div class="tb-quien"><b>${escHtml(x.n)}</b><small>Toca para cambiar</small></div>
              </div>`)
            .join("");
        return `<details class="tb-sec-int" style="margin-top:10px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:800;color:var(--ink-soft);padding:6px 2px;">⛔ No disponibles hoy (${marcados.length})${bajas ? ` · ${bajas} baja(s)/turismo` : ""}</summary>${filas || `<div class="tb-vacio">Nadie marcado hoy.</div>`}</details>`;
    }

    // ----- Pendientes: conflictos explicados con rutas, horas y traslado en vacío -----
    function stuTarjetaEmpalme(c) {
        const ds = getDayState();
        const base = tabBaseline();
        const a1 = resolveTripAssignment(c.t1, ds, base);
        const a2 = resolveTripAssignment(c.t2, ds, base);
        const esUnidad = String(c.entity || "").indexOf("U-") === 0;
        const ini1 = hhmmToMins(c.t1.h);
        const dur1 = getTripDuration(c.t1);
        const llega1 = ini1 + dur1;
        const hayVacio = normLoc(c.t1.d) !== normLoc(c.t2.o);
        const vacio = hayVacio ? getEmptyTravelTime(c.t1.d, c.t2.o) : 0;
        const listo = llega1 + vacio;
        const ruta1 = `${escHtml(c.t1.o)} ➜ ${escHtml(c.t1.d)}`;
        const ruta2 = `${escHtml(c.t2.o)} ➜ ${escHtml(c.t2.d)}`;
        const quien = (a, t) => `${a.unit ? "U-" + escHtml(a.unit) : "S/U"} · ${escHtml(a.op || "Sin operador")}`;

        let explica = `Sale a las <b>${escHtml(c.t1.h)}</b> de ${escHtml(c.t1.o)} y llega a <b>${escHtml(c.t1.d)}</b> como a las <b>${minsToHhmm(llega1)}</b>.`;
        if (hayVacio) explica += ` Luego tiene que ir <b>en vacío</b> de ${escHtml(c.t1.d)} a ${escHtml(c.t2.o)} (≈${vacio} min) y queda listo a las <b>${minsToHhmm(listo)}</b>.`;
        explica += ` Pero su siguiente viaje sale a las <b>${escHtml(c.t2.h)}</b> de ${escHtml(c.t2.o)}: <b style="color:var(--bad);">le faltan ${c.empalme} min</b>.`;

        let cands = [];
        try {
            cands = recomendarCandidatosParaViaje(c.t2).slice(0, 3);
        } catch (e) {}
        const sug = cands.length
            ? cands.map(x => `<div style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 10px;">
                  <b style="color:var(--accent);font-size:13px;">${escHtml(x.op)} ${x.unit ? "(U-" + escHtml(x.unit) + ")" : ""}</b>
                  <div style="font-size:11.5px;color:var(--ink-soft);margin-top:2px;">${escHtml(x.windowText)}</div>
                </div>`).join("")
            : `<div style="font-size:12px;color:var(--bad);padding:6px;text-align:center;">Nadie libre llega a tiempo para el viaje de las ${escHtml(c.t2.h)}</div>`;

        return `<div style="background:var(--surface);border:1px solid #eadbc8;border-left:5px solid var(--pend);border-radius:12px;padding:12px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
              <div><span style="font-size:11px;font-weight:800;color:var(--ink-soft);display:block;">${esUnidad ? "🚌 MISMA UNIDAD EN DOS VIAJES" : "👤 MISMO OPERADOR EN DOS VIAJES"}</span>
                <b style="color:var(--pend);font-size:15px;">${escHtml(c.entity)}</b></div>
              <span style="background:var(--bad-bg);color:var(--bad);font-size:12px;padding:4px 8px;border-radius:6px;font-weight:800;white-space:nowrap;">Faltan ${c.empalme} min</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
              <div class="stu-conf-viaje" style="background:var(--surface-2);">
                <span class="lbl" style="color:var(--ink-soft);">VIAJE 1 · sale ${escHtml(c.t1.h)} · llega ≈${minsToHhmm(llega1)}</span>
                <span class="ruta">${ruta1}</span><br><span style="color:var(--ink-soft);">${quien(a1)}</span>
              </div>
              ${hayVacio ? `<div style="font-size:12px;font-weight:700;color:var(--pend);padding:0 6px;">↓ Vacío ${escHtml(c.t1.d)} ➜ ${escHtml(c.t2.o)} (≈${vacio} min) · listo ≈${minsToHhmm(listo)}</div>` : ""}
              <div class="stu-conf-viaje" style="background:#fae3e6;">
                <span class="lbl" style="color:var(--bad);">VIAJE 2 (NO LE DA TIEMPO) · sale ${escHtml(c.t2.h)}</span>
                <span class="ruta">${ruta2}</span><br><span style="color:var(--bad);">${quien(a2)}</span>
              </div>
            </div>
            <div style="font-size:12.5px;line-height:1.45;margin-bottom:8px;">${explica}</div>
            <div style="font-size:11px;color:var(--ink-soft);margin-bottom:8px;line-height:1.4;">⏱️ Viaje 1: ${escHtml(stuTextoFuenteViaje(c.t1.o, c.t1.d))}${hayVacio ? `<br>⏱️ Vacío: ${escHtml(stuTextoFuenteVacio(c.t1.d, c.t2.o))}` : ""}</div>
            <div style="margin-bottom:10px;background:#fcfdfd;padding:8px;border-radius:8px;border:1px dashed var(--line);">
              <strong style="display:block;margin-bottom:6px;font-size:12px;">Quién puede hacer el viaje de las ${escHtml(c.t2.h)}:</strong>
              <div style="display:flex;flex-direction:column;gap:6px;">${sug}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn-outline" style="flex:2;border-color:var(--pend);color:var(--pend);padding:10px;margin:0;border-radius:8px;font-size:14px;" onclick="resolverEmpalmeRuta(decodeURIComponent('${tabAttr(c.entity)}'), decodeURIComponent('${tabAttr(c.t2.h)}'))">Cubrir viaje ${escHtml(c.t2.h)}</button>
              <button type="button" class="btn-outline" style="flex:1;border-color:var(--ink-faint);color:var(--ink-soft);padding:10px;margin:0;border-radius:8px;font-size:14px;" onclick="ignorarEmpalme(decodeURIComponent('${tabAttr(c.id)}'), 'pendientes')">✓ Resuelto</button>
            </div>
          </div>`;
    }

    (function instalarPendientesDetallados() {
        if (typeof window.actualizarBadgePendientes !== "function" || window.actualizarBadgePendientes._stu) return;
        const original = window.actualizarBadgePendientes;
        const nueva = function () {
            const r = original.apply(this, arguments);
            try {
                const n = (globalCollisions || []).length;
                if (n && Array.isArray(globalAlertsData)) {
                    inyectarEstilosEstados();
                    globalAlertsData.splice(0, n, ...globalCollisions.map(stuTarjetaEmpalme));
                }
            } catch (e) {
                console.error("Pendientes detallados:", e);
            }
            return r;
        };
        nueva._stu = true;
        window.actualizarBadgePendientes = nueva;
    })();

    // ----- Disponibilidad con selector de hora en 24 h -----
    window.verDisponibilidad = function (customTimeStr) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const refMin = customTimeStr ? hhmmToMins(customTimeStr) : nowMin;
        const { opWindows } = calcularEstadoFlotaYVentanas(refMin);
        opWindows.sort((a, b) => {
            if (a.freeNow !== b.freeNow) return a.freeNow ? -1 : 1;
            if (a.isGuardia !== b.isGuardia) return a.isGuardia ? -1 : 1;
            return b.freeMins - a.freeMins;
        });
        let opciones = "";
        for (let m = 0; m < 1440; m += 15) {
            const v = minsToHhmm(m);
            opciones += `<option value="${v}" ${Math.floor(refMin / 15) * 15 === m ? "selected" : ""}>${v}</option>`;
        }
        const html = opWindows
            .map(r => `<div class="avail-row" style="cursor:pointer;" onclick="stuCambiarEstadoOp(decodeURIComponent('${tabAttr(r.nombre)}'))">
                <div class="avail-top"><span class="avail-name">${escHtml(r.nombre)} ${renderPuntualidadBadge(r.nombre)}</span><span class="avail-unit">${r.unidad ? "U-" + escHtml(r.unidad) : "S/U"}</span></div>
                <span class="avail-status ${r.badge}">${r.statusLabel}</span>
                <div class="avail-detail" style="margin-bottom:5px;font-size:13.5px;"><b>Ventana:</b> de <b>${r.winFrom}</b> a <b>${r.winTo}</b> · ${r.detail}</div>
                <div class="avail-next" style="font-size:12.5px;color:var(--ink-soft);">Siguiente salida: ${r.proxima}</div>
              </div>`)
            .join("");
        openSheet(`<h2>⏱ Disponibilidad</h2>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;background:var(--surface-2);padding:8px 10px;border-radius:12px;flex-wrap:wrap;">
            <label style="font-size:13px;font-weight:800;">Ver a las:</label>
            <select class="tb-sel-hora" onchange="verDisponibilidad(this.value)">${opciones}</select>
            <button type="button" class="hour-toggle" onclick="verDisponibilidad()">Ahora</button>
          </div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">Toca a un operador para marcar Falta, Préstamo, Permiso, etc.</div>
          <div style="max-height:58vh;overflow-y:auto;">${html || '<p style="text-align:center;color:gray;padding:20px;">No hay operadores activos registrados.</p>'}</div>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cerrar</button>`);
    };

    // ----- Fechas con hora siempre en formato 24 h (Historial y Excel del historial) -----
    (function forzarFormato24h() {
        if (Date.prototype.toLocaleString._stu24) return;
        const original = Date.prototype.toLocaleString;
        const nueva = function (locales, opciones) {
            if (opciones === undefined) {
                return original.call(this, locales || "es-MX", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
                });
            }
            return original.call(this, locales, opciones);
        };
        nueva._stu24 = true;
        Date.prototype.toLocaleString = nueva;
    })();

    // =========================================================================
    // 6I. TIEMPOS DE RUTA CALCULADOS CON LA HOJA "RUTAS" (KM Y TIEMPOS REALES)
    //     Se lee al subir el archivo de datos (STU Germán). Para cada ruta:
    //       Tiempo del viaje = Tiempo Ruta Real  ➜ si no hay, Tiempo Smart ➜ si no hay, km ÷ velocidad promedio
    //     Vacíos (de donde termina un viaje a donde empieza el siguiente):
    //       1) Si existe la ruta de A a B en la hoja, se usa su tiempo (es el mismo camino, sin pasaje)
    //       2) De X a CU: "Tiempo Vacío Real a CU" de la ruta CU - X; si no hay, km a CU ÷ velocidad en vacío
    //       3) De CU a X: "KM Real (P.I desde CU)" ÷ velocidad en vacío
    //       4) De X a Y: pasando por CU (X ➜ CU ➜ Y)
    //     Las velocidades promedio salen de tus propios datos (rutas con km y tiempo real).
    //     Si una ruta no aparece, se queda con el tiempo fijo de antes (40 min CU–CU2, 55 min las demás).
    //     Cualquier tiempo se puede corregir a mano en ⚙️ ➜ "Tiempos de ruta".
    // =========================================================================
    const STU_VEL_LLENO_DEFAULT = 21;  // km/h, si la hoja no trae suficientes datos
    const STU_VEL_VACIO_DEFAULT = 26;
    const stuTiempoOriginalRuta = typeof window.getTravelTime === "function" ? window.getTravelTime : function () { return 55; };
    const stuVacioOriginal = typeof window.getEmptyTravelTime === "function" ? window.getEmptyTravelTime : function () { return 55; };
    let stuTiemposVer = 0;
    let stuMemoTiempos = { ver: -1, viaje: {}, vacio: {} };

    // Nombres de lugar comparables entre el rol, Smart y la hoja RUTAS
    function stuLugarNorm(s) {
        let n = String(s === null || s === undefined ? "" : s)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toUpperCase()
            .replace(/\./g, "")
            .replace(/[^A-Z0-9 ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        n = n.replace(/^RUTA /, "");
        if (/ECOCAMPUS/.test(n)) return "CU2";
        if (n === "C U" || n === "CIUDAD UNIVERSITARIA") return "CU";
        if (/^COMPLEJO CULTURAL/.test(n)) return "CCU";
        n = n.replace(/\bPREPA\b/g, "PREPARATORIA").replace(/\bBACHILLER\b/g, "BACHILLERATO");
        n = n.replace(/\bSN\b/g, "SAN").replace(/^CIUDAD JUDICIAL/, "CD JUDICIAL");
        n = n.replace(/^AREA DE LA SALUD \d+$/, "AREA DE LA SALUD");
        n = n.replace(/^CUATLANCINGO$/, "CUAUTLANCINGO");
        return n;
    }
    window.stuLugarNorm = stuLugarNorm;

    function stuNumero(v, minimo) {
        if (v === null || v === undefined || v instanceof Date) return null;
        const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").replace(/[^0-9.]/g, ""));
        if (!isFinite(n) || n <= (minimo || 0)) return null;
        return n;
    }

    function stuMediana(arr) {
        const a = arr.filter(x => isFinite(x) && x > 0).sort((x, y) => x - y);
        if (!a.length) return null;
        const m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    }

    // Lee la hoja RUTAS del archivo de datos
    window.stuLeerTiemposRutas = function (wb, X) {
        const out = { rutas: {}, vel: { lleno: STU_VEL_LLENO_DEFAULT, vacio: STU_VEL_VACIO_DEFAULT }, n: 0, hoja: "", aviso: "" };
        const nombre = wb.SheetNames.find(n => /^RUTAS?$/i.test(String(n).trim()));
        if (!nombre) {
            out.aviso = 'No encontré la hoja "RUTAS"; los tiempos de ruta no cambiaron.';
            return out;
        }
        out.hoja = nombre;
        const grid = X.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: null });
        let h = -1;
        for (let r = 0; r < Math.min(grid.length, 10); r++) {
            const fila = (grid[r] || []).map(smartNorm);
            if (fila.includes("RUTA") && fila.some(x => x.indexOf("KMS LLENO") === 0)) {
                h = r;
                break;
            }
        }
        if (h < 0) {
            out.aviso = 'En la hoja "RUTAS" no encontré las columnas RUTA y Kms Lleno; los tiempos de ruta no cambiaron.';
            return out;
        }
        const head = grid[h].map(smartNorm);
        const col = f => head.findIndex(f);
        const c = {
            ruta: col(x => x === "RUTA"),
            kmLleno: col(x => x.indexOf("KMS LLENO") === 0),
            kmVac: col(x => x.indexOf("KMS VAC") === 0),
            smart: col(x => x.indexOf("TIEMPO RUTA") === 0 && x.indexOf("SMART") !== -1),
            real: col(x => x.indexOf("TIEMPO RUTA") === 0 && x.indexOf("REAL") !== -1),
            vacCU: col(x => x.indexOf("TIEMPO VACIO REAL A CU") === 0),
            kmReal: col(x => x === "KM REAL RUTA"),
            kmPI: col(x => x.indexOf("DESDE CU") !== -1 && x.indexOf("KM") === 0),
            kmCU: col(x => x === "KM REAL A CU")
        };
        const v = (row, i, min) => (i >= 0 ? stuNumero(row[i], min) : null);

        const velLleno = [];
        const velVacio = [];
        for (let r = h + 1; r < grid.length; r++) {
            const row = grid[r] || [];
            const nombreRuta = String(row[c.ruta] || "").trim();
            const partes = nombreRuta.split(/\s*-\s*/);
            if (partes.length < 2) continue;
            const o = stuLugarNorm(partes[0]);
            const d = stuLugarNorm(partes.slice(1).join(" "));
            if (!o || !d) continue;
            const rec = {
                ruta: nombreRuta.replace(/\s+/g, " "),
                o: o,
                d: d,
                km: v(row, c.kmReal, 1) || v(row, c.kmLleno, 1),
                kmVac: v(row, c.kmVac, 1),
                real: v(row, c.real, 3),
                smart: v(row, c.smart, 3),
                vacCU: v(row, c.vacCU, 1),
                kmPI: v(row, c.kmPI, 1),
                kmCU: v(row, c.kmCU, 1)
            };
            const k = o + "|" + d;
            const previo = out.rutas[k];
            // Si la ruta está repetida, se queda la que trae más datos medidos
            const puntos = x => (x.real ? 4 : 0) + (x.smart ? 2 : 0) + (x.km ? 1 : 0) + (x.vacCU ? 1 : 0) + (x.kmPI ? 1 : 0);
            if (!previo || puntos(rec) > puntos(previo)) out.rutas[k] = rec;
            if (rec.km && rec.real) velLleno.push((rec.km / rec.real) * 60);
            if (rec.kmCU && rec.vacCU) velVacio.push((rec.kmCU / rec.vacCU) * 60);
        }
        out.n = Object.keys(out.rutas).length;
        const vl = stuMediana(velLleno);
        const vv = stuMediana(velVacio);
        if (vl && velLleno.length >= 3) out.vel.lleno = Math.round(vl * 10) / 10;
        if (vv && velVacio.length >= 3) out.vel.vacio = Math.round(vv * 10) / 10;
        if (!out.n) out.aviso = 'La hoja "RUTAS" no trae rutas legibles; los tiempos de ruta no cambiaron.';
        return out;
    };

    function stuAplicarTiempos(t) {
        if (!t || !t.n) return false;
        store.tiemposRutas = t.rutas;
        store.tiemposVel = t.vel;
        stuTiemposVer++;
        return true;
    }

    function stuTablaTiempos() {
        return store.tiemposRutas && typeof store.tiemposRutas === "object" ? store.tiemposRutas : {};
    }

    function stuVel() {
        const v = store.tiemposVel || {};
        return { lleno: Number(v.lleno) || STU_VEL_LLENO_DEFAULT, vacio: Number(v.vacio) || STU_VEL_VACIO_DEFAULT };
    }

    function stuUsarSmart() {
        return store.tiemposPreferencia === "smart";
    }

    // Busca la ruta del rol en la hoja (exacta, y si no, por parecido sin ambigüedad)
    function stuBuscarRuta(o, d) {
        const tabla = stuTablaTiempos();
        const no = stuLugarNorm(o);
        const nd = stuLugarNorm(d);
        if (!no || !nd) return null;
        const exacta = tabla[no + "|" + nd];
        if (exacta) return { k: no + "|" + nd, r: exacta };
        const parecido = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.indexOf(b) === 0 || b.indexOf(a) === 0));
        const cands = Object.keys(tabla).filter(k => parecido(tabla[k].o, no) && parecido(tabla[k].d, nd));
        if (cands.length === 1) return { k: cands[0], r: tabla[cands[0]] };
        return null;
    }

    function stuRedondear(min) {
        return Math.max(1, Math.round(min));
    }

    // Tiempo del viaje con pasaje: { min, fuente, ruta }
    function stuTiempoViaje(o, d) {
        if (stuMemoTiempos.ver !== stuTiemposVer) stuMemoTiempos = { ver: stuTiemposVer, viaje: {}, vacio: {} };
        const key = stuLugarNorm(o) + "|" + stuLugarNorm(d);
        if (stuMemoTiempos.viaje[key] !== undefined) return stuMemoTiempos.viaje[key];

        let res = null;
        const manual = store.tiemposManual && store.tiemposManual[fbKey(key)];
        if (manual && Number(manual) > 0) {
            res = { min: Number(manual), fuente: "a mano" };
        } else {
            const hall = stuBuscarRuta(o, d);
            if (hall) {
                const r = hall.r;
                const primero = stuUsarSmart() ? [["smart", "Smart"], ["real", "real"]] : [["real", "real"], ["smart", "Smart"]];
                for (const p of primero) {
                    if (r[p[0]]) {
                        res = { min: stuRedondear(r[p[0]]), fuente: p[1], ruta: r.ruta };
                        break;
                    }
                }
                if (!res && r.km) res = { min: stuRedondear((r.km / stuVel().lleno) * 60), fuente: `por km (${r.km} km)`, ruta: r.ruta };
            }
        }
        stuMemoTiempos.viaje[key] = res;
        return res;
    }

    // Tiempo en vacío de A a B: { min, fuente }
    function stuTiempoVacio(a, b) {
        if (stuMemoTiempos.ver !== stuTiemposVer) stuMemoTiempos = { ver: stuTiemposVer, viaje: {}, vacio: {} };
        const na = stuLugarNorm(a);
        const nb = stuLugarNorm(b);
        const key = na + "|" + nb;
        if (stuMemoTiempos.vacio[key] !== undefined) return stuMemoTiempos.vacio[key];
        let res = null;
        const vel = stuVel().vacio;
        if (!na || !nb) res = null;
        else if (na === nb) res = { min: 0, fuente: "mismo lugar" };
        else if (nb === "CU") {
            // De X a CU: primero el vacío real medido; luego el camino de la ruta X - CU; luego por km
            const salida = stuBuscarRuta("CU", a);
            const directo = stuTiempoViaje(a, "CU");
            const entrada = stuBuscarRuta(a, "CU");
            if (salida && salida.r.vacCU) res = { min: stuRedondear(salida.r.vacCU), fuente: "vacío real a CU" };
            else if (directo) res = { min: directo.min, fuente: "mismo camino que la ruta " + (directo.ruta || na + " - CU") };
            else if (salida && salida.r.kmCU) res = { min: stuRedondear((salida.r.kmCU / vel) * 60), fuente: `por km a CU (${salida.r.kmCU} km)` };
            else if (entrada && entrada.r.kmPI) res = { min: stuRedondear((entrada.r.kmPI / vel) * 60), fuente: `por km (${entrada.r.kmPI} km)` };
        } else if (na === "CU") {
            // De CU a X: el camino de la ruta CU - X; si no hay, km de CU al punto de inicio
            const directo = stuTiempoViaje("CU", b);
            const entrada = stuBuscarRuta(b, "CU");
            if (directo) res = { min: directo.min, fuente: "mismo camino que la ruta " + (directo.ruta || "CU - " + nb) };
            else if (entrada && entrada.r.kmPI) res = { min: stuRedondear((entrada.r.kmPI / vel) * 60), fuente: `por km de CU al punto de inicio (${entrada.r.kmPI} km)` };
        } else {
            const directo = stuTiempoViaje(a, b);
            if (directo) res = { min: directo.min, fuente: "mismo camino que la ruta " + (directo.ruta || na + " - " + nb) };
            else {
                const ida = stuTiempoVacio(a, "CU");
                const vuelta = stuTiempoVacio("CU", b);
                if (ida && vuelta) res = { min: ida.min + vuelta.min, fuente: "pasando por CU" };
            }
        }
        stuMemoTiempos.vacio[key] = res;
        return res;
    }
    window.stuTiempoViaje = stuTiempoViaje;
    window.stuTiempoVacio = stuTiempoVacio;

    // Reemplazo de los tiempos fijos que usa toda la app (choques, quién llega, disponibilidad, tablero)
    window.getTripDuration = function (trip) {
        if (!trip) return 0;
        const t = stuTiempoViaje(trip.o, trip.d);
        return t ? t.min : stuTiempoOriginalRuta(trip.o, trip.d);
    };
    window.getEmptyTravelTime = function (dest1, orig2) {
        if (!dest1 || !orig2) return 0;
        const t = stuTiempoVacio(dest1, orig2);
        return t ? t.min : stuVacioOriginal(dest1, orig2);
    };

    function stuTextoFuenteViaje(o, d) {
        const t = stuTiempoViaje(o, d);
        return t ? `${t.min} min (${t.fuente})` : `${stuTiempoOriginalRuta(o, d)} min (fijo, la ruta no está en la hoja)`;
    }
    function stuTextoFuenteVacio(a, b) {
        const t = stuTiempoVacio(a, b);
        return t ? `${t.min} min (${t.fuente})` : `${stuVacioOriginal(a, b)} min (fijo)`;
    }
    window.stuTextoFuenteViaje = stuTextoFuenteViaje;
    window.stuTextoFuenteVacio = stuTextoFuenteVacio;

    // ----- Pantalla: ver y corregir los tiempos de las rutas del rol de hoy -----
    window.stuVerTiempos = function (mensajeHtml) {
        const dia = store.days && store.days[store.currentDay];
        const trips = dia && Array.isArray(dia.trips) ? dia.trips : [];
        const rutas = {};
        trips.forEach(t => {
            const k = stuLugarNorm(t.o) + "|" + stuLugarNorm(t.d);
            if (!rutas[k]) rutas[k] = { o: t.o, d: t.d, n: 0 };
            rutas[k].n++;
        });
        const lista = Object.keys(rutas)
            .map(k => {
                const r = rutas[k];
                const t = stuTiempoViaje(r.o, r.d);
                return { k: k, o: r.o, d: r.d, n: r.n, t: t };
            })
            .sort((x, y) => (x.t ? 1 : 0) - (y.t ? 1 : 0) || y.n - x.n);
        window._stuTiemposLista = lista;
        const sinDato = lista.filter(x => !x.t).length;
        const nTabla = Object.keys(stuTablaTiempos()).length;
        const vel = stuVel();

        const filas = lista
            .map((x, i) => {
                const manual = store.tiemposManual && store.tiemposManual[fbKey(x.k)];
                const fuente = x.t ? x.t.fuente : "sin dato: usa el fijo de " + stuTiempoOriginalRuta(x.o, x.d) + " min";
                return `<div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-bottom:1px solid var(--line);${x.t ? "" : "background:#fff4d6;border-radius:8px;padding-left:6px;"}">
                    <div style="flex:1;min-width:0;"><b style="font-size:13.5px;">${escHtml(x.o)} ➜ ${escHtml(x.d)}</b>
                      <div style="font-size:11.5px;color:var(--ink-soft);">${x.n} salida(s) · ${escHtml(fuente)}</div></div>
                    <input type="number" inputmode="numeric" min="1" max="300" id="stuTmin_${i}" value="${manual ? escHtml(manual) : ""}" placeholder="${x.t ? x.t.min : stuTiempoOriginalRuta(x.o, x.d)}" style="width:64px;padding:8px;border:1.5px solid ${manual ? "var(--accent)" : "var(--line)"};border-radius:9px;font-size:15px;font-weight:800;text-align:center;font-family:inherit;">
                    <span style="font-size:11px;color:var(--ink-soft);">min</span>
                  </div>`;
            })
            .join("");

        openSheet(`<h2>⏱️ Tiempos de ruta</h2>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;line-height:1.45;">
            Con estos tiempos la app calcula los choques, quién llega a tiempo y la disponibilidad.
            Salen de la hoja <b>RUTAS</b> de tu archivo de datos (${nTabla} rutas leídas).
            Velocidad promedio que salió de tus datos: <b>${vel.lleno} km/h</b> con pasaje y <b>${vel.vacio} km/h</b> en vacío.
          </div>
          ${mensajeHtml ? `<div style="margin:0 0 8px;padding:9px 11px;border-radius:10px;font-size:12.5px;font-weight:700;background:#e6f6ec;color:#17703a;">${mensajeHtml}</div>` : ""}
          ${!nTabla ? `<div style="margin:0 0 8px;padding:9px 11px;border-radius:10px;font-size:12.5px;background:#fff4d6;color:#7a5b00;">Aún no se han leído los tiempos. Sube tu archivo de datos (STU Germán) con el botón de abajo o desde ⚙️.</div>` : ""}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <button type="button" class="btn-outline" style="margin:0;padding:10px;font-size:13px;${!stuUsarSmart() ? "background:var(--accent);color:#fff;" : ""}" onclick="stuPreferenciaTiempo('real')">Usar tiempo Real</button>
            <button type="button" class="btn-outline" style="margin:0;padding:10px;font-size:13px;${stuUsarSmart() ? "background:var(--accent);color:#fff;" : ""}" onclick="stuPreferenciaTiempo('smart')">Usar tiempo Smart</button>
          </div>
          <input type="file" id="stuTiemposFile" accept=".xlsx,.xls" style="display:none" onchange="stuSubirSoloTiempos(this)">
          <button type="button" class="btn-outline" style="margin:0 0 4px 0;" onclick="document.getElementById('stuTiemposFile').click()">📂 Actualizar solo tiempos (hoja RUTAS)</button>
          <div id="stuTiemposMsg" style="font-size:12.5px;font-weight:700;margin:4px 0;"></div>
          <h3 style="margin:12px 0 4px;">Rutas del rol de hoy: ${lista.length}${sinDato ? ` · <span style="color:var(--pend);">${sinDato} sin dato</span>` : ""}</h3>
          <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:6px;">Escribe minutos solo si quieres cambiar el tiempo de una ruta. Vacío = se usa el calculado (el número gris).</div>
          <div style="max-height:46vh;overflow-y:auto;">${filas || `<div style="padding:12px;text-align:center;color:var(--ink-soft);">No hay rol cargado.</div>`}</div>
          <button type="button" class="btn-primary" style="background:var(--accent);" onclick="stuGuardarTiemposManual()">Guardar para todos</button>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cerrar</button>`);
    };

    window.stuPreferenciaTiempo = function (pref) {
        store.tiemposPreferencia = pref === "smart" ? "smart" : "real";
        stuTiemposVer++;
        savePatch({ tiemposPreferencia: store.tiemposPreferencia });
        window.render();
        window.stuVerTiempos(`✅ Ahora se usa el tiempo ${pref === "smart" ? "de Smart" : "Real"} cuando la ruta lo tiene.`);
    };

    window.stuGuardarTiemposManual = function () {
        const lista = window._stuTiemposLista || [];
        const manual = Object.assign({}, store.tiemposManual || {});
        let cambios = 0;
        lista.forEach((x, i) => {
            const el = document.getElementById("stuTmin_" + i);
            if (!el) return;
            const v = Number(el.value);
            const k = fbKey(x.k);
            if (el.value === "" || !v) {
                if (manual[k] !== undefined) {
                    delete manual[k];
                    cambios++;
                }
            } else if (v > 0 && v <= 300 && Number(manual[k]) !== v) {
                manual[k] = Math.round(v);
                cambios++;
            }
        });
        store.tiemposManual = manual;
        stuTiemposVer++;
        savePatch({ tiemposManual: manual });
        window.render();
        window.stuVerTiempos(cambios ? `✅ ${cambios} tiempo(s) guardado(s) para todos.` : "No hubo cambios.");
    };

    window.stuSubirSoloTiempos = async function (input) {
        const archivo = input && input.files && input.files[0];
        if (!archivo) return;
        const msg = document.getElementById("stuTiemposMsg");
        if (msg) msg.textContent = "Leyendo archivo...";
        try {
            const X = (await ensureXLSXLoaded()) || window.XLSX;
            const wb = X.read(new Uint8Array(await archivo.arrayBuffer()), { type: "array" });
            const t = window.stuLeerTiemposRutas(wb, X);
            if (!stuAplicarTiempos(t)) {
                if (msg) {
                    msg.style.color = "var(--bad)";
                    msg.textContent = t.aviso || "No se pudieron leer los tiempos.";
                }
                return;
            }
            savePatch({ tiemposRutas: store.tiemposRutas, tiemposVel: store.tiemposVel });
            window.render();
            window.stuVerTiempos(`✅ Se leyeron ${t.n} rutas de la hoja ${escHtml(t.hoja)}.`);
        } catch (e) {
            if (msg) {
                msg.style.color = "var(--bad)";
                msg.textContent = "No pude leer el archivo: " + (e && e.message ? e.message : e);
            }
        }
        input.value = "";
    };

    // =========================================================================
    // 6J. CAMBIOS "TIPO BUSUP": BUSCAR ➜ MARCAR VIAJES ➜ ELEGIR UNIDAD Y OPERADOR ➜ ASIGNAR
    //     1) Buscas una unidad, un operador o una ruta.
    //     2) Marcas con casillas los viajes que cambian (o "Seleccionar todos").
    //     3) Eliges el vehículo y/o el conductor nuevos en listas con buscador.
    //     4) Eliges el motivo y tocas "Asignar". Sale "Asignación exitosa".
    //     Se abre al tocar un viaje, desde Pendientes/Tablero ("Cubrir") y con el botón 🔁 Cambio.
    //     En computadora se ve como tabla ancha; en celular como lista con casillas grandes.
    // =========================================================================
    const ASG = { sel: new Set(), u: null, op: null, motivo: "", filtro: "", baseId: "", ref: 0, ocupacion: null };
    const ASG_MOTIVOS = ["Falta", "Permiso", "Siniestro", "Falla mecánica", "Sin diésel", "Apoyo", "Enroque", "Operación", "Programación"];

    function inyectarEstilosAsignador() {
        if (document.getElementById("stu-extras-asg-styles")) return;
        const st = document.createElement("style");
        st.id = "stu-extras-asg-styles";
        st.textContent = `
            #sheet.stu-ancho { max-width: 1120px; }
            .asg-paso { font-size: 13px; font-weight: 800; color: var(--accent); margin: 14px 0 6px; display: flex; align-items: center; gap: 6px; }
            .asg-paso .num { background: var(--accent); color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
            .asg-buscar { width: 100%; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: 12px; font-size: 16px; font-weight: 600; background: var(--surface-2); color: var(--ink); font-family: inherit; outline: none; }
            .asg-buscar:focus { border-color: var(--accent); background: var(--surface); }
            .asg-tabla { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
            .asg-cab, .asg-row { display: grid; grid-template-columns: 34px 52px 1fr; gap: 4px 8px; align-items: center; padding: 9px 10px; }
            .asg-cab { background: var(--surface-2); font-size: 12px; font-weight: 800; color: var(--ink-soft); border-bottom: 1px solid var(--line); }
            .asg-cab .col-extra { display: none; }
            .asg-row { border-bottom: 1px solid var(--line); cursor: pointer; font-size: 13.5px; }
            .asg-row:last-child { border-bottom: none; }
            .asg-row.sel { background: #EBF5FF; }
            .asg-row.pasado { opacity: 0.55; }
            .asg-row input, .asg-cab input { width: 20px; height: 20px; accent-color: var(--accent); margin: 0; }
            .asg-h { font-family: "IBM Plex Mono", monospace; font-weight: 800; }
            .asg-info b { font-weight: 800; }
            .asg-info small { display: block; color: var(--ink-soft); font-size: 12px; margin-top: 2px; }
            .asg-row .col-extra { display: none; }
            .asg-lista-scroll { max-height: 34vh; overflow-y: auto; }
            .asg-sel-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
            .asg-label { font-size: 12px; font-weight: 700; color: var(--ink-soft); margin-bottom: 4px; display: block; }
            .asg-combo { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: 12px; background: var(--surface); font-size: 15px; font-weight: 700; color: var(--ink); cursor: pointer; font-family: inherit; text-align: left; min-height: 48px; }
            .asg-combo.elegido { border-color: var(--accent); background: #EBF5FF; color: var(--accent); }
            .asg-panel { border: 1.5px solid var(--accent); border-radius: 12px; margin-top: 6px; background: var(--surface); overflow: hidden; }
            .asg-panel input { width: 100%; border: none; border-bottom: 1px solid var(--line); padding: 11px 12px; font-size: 16px; outline: none; font-family: inherit; background: var(--surface-2); color: var(--ink); }
            .asg-opciones { max-height: 230px; overflow-y: auto; }
            .asg-op { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line); cursor: pointer; font-size: 14px; }
            .asg-op:last-child { border-bottom: none; }
            .asg-op:hover, .asg-op:active { background: #EBF5FF; }
            .asg-op small { color: var(--ink-soft); font-size: 11.5px; }
            .asg-tag { font-size: 10.5px; font-weight: 800; padding: 2px 6px; border-radius: 5px; white-space: nowrap; }
            .asg-tag.libre { background: var(--done-bg); color: var(--done); }
            .asg-tag.guardia { background: #e0f2fe; color: #0369a1; }
            .asg-tag.taller { background: var(--bad-bg); color: var(--bad); }
            .asg-tag.uso { background: var(--surface-2); color: var(--ink-soft); }
            .asg-aviso { border-radius: 10px; padding: 9px 11px; font-size: 12.5px; font-weight: 700; margin-top: 10px; line-height: 1.45; }
            .asg-aviso.mal { background: var(--bad-bg); color: var(--bad); }
            .asg-aviso.ojo { background: var(--pend-bg); color: var(--pend); }
            .asg-aviso.ok { background: var(--done-bg); color: var(--done); }
            .asg-sug { display: flex; justify-content: space-between; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; margin-bottom: 6px; font-size: 13px; cursor: pointer; }
            .asg-exito { text-align: center; padding: 18px 6px 4px; }
            .asg-exito .ok { width: 64px; height: 64px; border-radius: 50%; background: var(--done-bg); color: var(--done); font-size: 34px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }

            @media (min-width: 760px) {
                .asg-cab, .asg-row { grid-template-columns: 34px 60px minmax(150px, 1.4fr) 90px minmax(150px, 1.2fr) 70px 90px; }
                .asg-cab .col-extra, .asg-row .col-extra { display: block; }
                .asg-info small { display: none; }
                .asg-sel-grid { grid-template-columns: 1fr 1fr; }
                .asg-lista-scroll { max-height: 40vh; }
            }
            body.pc-view .asg-cab, body.pc-view .asg-row { grid-template-columns: 34px 60px minmax(150px, 1.4fr) 90px minmax(150px, 1.2fr) 70px 90px; }
            body.pc-view .asg-cab .col-extra, body.pc-view .asg-row .col-extra { display: block; }
            body.pc-view .asg-info small { display: none; }
            body.pc-view .asg-sel-grid { grid-template-columns: 1fr 1fr; }
        `;
        document.head.appendChild(st);
    }

    // La hoja de abajo vuelve a su tamaño normal cada vez que se abre otra ventana
    (function instalarAnchoDeHoja() {
        if (typeof window.openSheet !== "function" || window.openSheet._stuAncho) return;
        const original = window.openSheet;
        const nueva = function () {
            const sh = document.getElementById("sheet");
            if (sh) sh.classList.remove("stu-ancho");
            return original.apply(this, arguments);
        };
        nueva._stuAncho = true;
        window.openSheet = nueva;
    })();

    function asgTrips() {
        const dia = store.days && store.days[store.currentDay];
        return dia && Array.isArray(dia.trips) ? dia.trips : [];
    }

    function asgAsignacion(t) {
        return resolveTripAssignment(t, getDayState(), tabBaseline());
    }

    function asgAhora() {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    }

    // ----- Abrir la pantalla -----
    window.stuAbrirAsignador = function (opciones) {
        inyectarEstilosAsignador();
        const o = opciones || {};
        const trips = asgTrips();
        ASG.sel = new Set();
        ASG.u = null;
        ASG.op = null;
        ASG.motivo = "";
        ASG.baseId = o.tripId || "";
        const base = ASG.baseId ? trips.find(t => String(t.id) === String(ASG.baseId)) : null;
        ASG.ref = base ? hhmmToMins(base.h) : asgAhora();
        try {
            ASG.ocupacion = calcularEstadoFlotaYVentanas(ASG.ref);
        } catch (e) {
            ASG.ocupacion = { opWindows: [], unitToOp: {} };
        }

        if (base) {
            const a = asgAsignacion(base);
            ASG.filtro = a.op || a.unit || "";
            ASG.sel.add(String(base.id)); // solo el viaje tocado; con un toque se agregan sus siguientes
        } else {
            ASG.filtro = o.filtro || "";
        }

        const motivos = ASG_MOTIVOS.map(m => `<button type="button" class="reason-chip" data-mot="${escHtml(m)}" onclick="stuAsgMotivo(this)">${escHtml(m)}</button>`).join("");
        const titulo = base ? `${escHtml(base.h)} · ${escHtml(base.o)} a ${escHtml(base.d)}` : "Busca una unidad, un operador o una ruta";

        openSheet(`<h2 style="margin-bottom:4px;">🔁 Cambio de unidad u operador</h2>
          <div style="font-size:13px;color:var(--ink-soft);">${titulo}</div>

          <div class="asg-paso"><span class="num">1</span> Busca unidad, operador o ruta</div>
          <input id="asgBuscar" class="asg-buscar" type="text" inputmode="search" autocomplete="off" placeholder="Ej. 8095, Erick, CU a CU2" value="${escHtml(ASG.filtro)}" oninput="stuAsgFiltrar(this.value)">

          <div class="asg-paso"><span class="num">2</span> Marca los viajes que cambian <span id="asgCuenta" style="margin-left:auto;color:var(--ink-soft);font-weight:700;"></span></div>
          <div id="asgLista"></div>

          <div class="asg-paso"><span class="num">3</span> Elige la unidad y/o el operador nuevos</div>
          <div class="asg-sel-grid">
            <div>
              <span class="asg-label">Vehículo</span>
              <button type="button" class="asg-combo" id="asgComboU" onclick="stuAsgAbrirLista('U')"></button>
              <div class="asg-panel" id="asgPanelU" style="display:none;">
                <input id="asgBuscarU" type="text" inputmode="search" autocomplete="off" placeholder="Escribe el número, ej. 809" oninput="stuAsgListaU()">
                <div class="asg-opciones" id="asgOpcionesU"></div>
              </div>
            </div>
            <div>
              <span class="asg-label">Conductor</span>
              <button type="button" class="asg-combo" id="asgComboOp" onclick="stuAsgAbrirLista('Op')"></button>
              <div class="asg-panel" id="asgPanelOp" style="display:none;">
                <input id="asgBuscarOp" type="text" autocomplete="off" placeholder="Escribe el nombre o la clave" oninput="stuAsgListaOp()">
                <div class="asg-opciones" id="asgOpcionesOp"></div>
              </div>
            </div>
          </div>
          <div id="asgSugerencias"></div>

          <div class="asg-paso"><span class="num">4</span> Motivo</div>
          <div class="reason-grid" style="margin-top:0;">${motivos}</div>

          <div id="asgAviso"></div>
          <button type="button" class="btn-primary" id="asgBtnAsignar" style="background:var(--done);" onclick="stuAsgAsignar(false)">Asignar</button>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cancelar</button>`);
        const sh = document.getElementById("sheet");
        if (sh) sh.classList.add("stu-ancho");
        stuAsgPintarTodo();
    };

    function stuAsgPintarTodo() {
        stuAsgLista();
        stuAsgCombos();
        stuAsgSugerencias();
        stuAsgRevisar();
    }

    window.stuAsgFiltrar = function (v) {
        ASG.filtro = String(v || "");
        stuAsgLista();
    };

    function asgCoincide(t, a, q) {
        if (!q) return false;
        const qn = smartNorm(q);
        if (/^\d+$/.test(qn)) {
            return String(a.unit || "").indexOf(qn) === 0 || String(t.u || "").indexOf(qn) === 0 || String(t.k || "") === qn;
        }
        const texto = smartNorm(`${a.op} ${t.o} A ${t.d} ${t.h}`);
        return qn.split(" ").every(p => texto.indexOf(p) !== -1);
    }

    function stuAsgLista() {
        const cont = document.getElementById("asgLista");
        if (!cont) return;
        const trips = asgTrips();
        const q = ASG.filtro.trim();
        const ahora = asgAhora();
        const filas = [];
        trips.forEach(t => {
            const a = asgAsignacion(t);
            const sel = ASG.sel.has(String(t.id));
            if (sel || asgCoincide(t, a, q)) filas.push({ t: t, a: a, sel: sel });
        });
        filas.sort((x, y) => x.t.h.localeCompare(y.t.h));
        const visibles = filas.slice(0, 250);
        const todos = visibles.length > 0 && visibles.every(f => f.sel);

        let html;
        if (!visibles.length) {
            html = `<div class="tb-vacio">${q ? "No encontré viajes con esa búsqueda." : "Escribe arriba una unidad, un operador o una ruta para ver sus viajes."}</div>`;
        } else {
            html = `<div class="asg-tabla">
                <label class="asg-cab"><input type="checkbox" ${todos ? "checked" : ""} onchange="stuAsgTodos(this.checked)">
                  <span>Hora</span><span>Ruta <span style="font-weight:600;">(${visibles.length})</span></span>
                  <span class="col-extra">Unidad</span><span class="col-extra">Operador</span><span class="col-extra">Llega</span><span class="col-extra">Estado</span></label>
                <div class="asg-lista-scroll">` +
                visibles
                    .map(f => {
                        const t = f.t;
                        const st = getTripState(t.id);
                        const estado = st.status === "formado" ? "✅ Formado" : st.status === "en_terminal" ? "🏠 Terminal" : "⏳ Pendiente";
                        const llega = minsToHhmm(hhmmToMins(t.h) + getTripDuration(t));
                        const pasado = hhmmToMins(t.h) < ahora - 5;
                        return `<label class="asg-row ${f.sel ? "sel" : ""} ${pasado ? "pasado" : ""}">
                            <input type="checkbox" ${f.sel ? "checked" : ""} onchange="stuAsgMarcar(decodeURIComponent('${tabAttr(t.id)}'), this.checked)">
                            <span class="asg-h">${escHtml(t.h)}</span>
                            <span class="asg-info"><b>${escHtml(t.o)} a ${escHtml(t.d)}</b><small>${f.a.unit ? "U-" + escHtml(f.a.unit) : "S/U"} · ${escHtml(f.a.op || "Sin operador")} · llega ${llega}</small></span>
                            <span class="col-extra asg-h">${f.a.unit ? "U-" + escHtml(f.a.unit) : "S/U"}</span>
                            <span class="col-extra">${escHtml(f.a.op || "Sin operador")}</span>
                            <span class="col-extra asg-h">${llega}</span>
                            <span class="col-extra" style="font-size:12px;">${estado}</span>
                          </label>`;
                    })
                    .join("") +
                `</div></div>`;
        }
        // Atajo: marcar también los siguientes viajes del mismo operador
        const base = ASG.baseId ? trips.find(t => String(t.id) === String(ASG.baseId)) : null;
        if (base) {
            const ab = asgAsignacion(base);
            const quien = ab.op || ab.unit;
            const siguientes = trips.filter(t => {
                if (ASG.sel.has(String(t.id)) || hhmmToMins(t.h) <= hhmmToMins(base.h)) return false;
                const at = asgAsignacion(t);
                return ab.op ? at.op === ab.op : ab.unit && at.unit === ab.unit;
            });
            if (quien && siguientes.length) {
                html += `<button type="button" class="btn-outline" style="margin-top:8px;padding:10px;font-size:13.5px;" onclick="stuAsgSiguientes()">➕ Marcar también sus ${siguientes.length} viaje(s) siguientes (${escHtml(quien)})</button>`;
            }
        }
        cont.innerHTML = html;
        const cuenta = document.getElementById("asgCuenta");
        if (cuenta) cuenta.textContent = ASG.sel.size ? `${ASG.sel.size} marcado(s)` : "";
        stuAsgRevisar();
    }

    window.stuAsgMarcar = function (id, valor) {
        if (valor) ASG.sel.add(String(id));
        else ASG.sel.delete(String(id));
        stuAsgLista();
    };

    window.stuAsgSiguientes = function () {
        const trips = asgTrips();
        const base = trips.find(t => String(t.id) === String(ASG.baseId));
        if (!base) return;
        const ab = asgAsignacion(base);
        trips.forEach(t => {
            if (hhmmToMins(t.h) < hhmmToMins(base.h)) return;
            const at = asgAsignacion(t);
            if (ab.op ? at.op === ab.op : ab.unit && at.unit === ab.unit) ASG.sel.add(String(t.id));
        });
        stuAsgLista();
    };

    window.stuAsgTodos = function (valor) {
        const trips = asgTrips();
        const q = ASG.filtro.trim();
        trips.forEach(t => {
            const a = asgAsignacion(t);
            if (ASG.sel.has(String(t.id)) || asgCoincide(t, a, q)) {
                if (valor) ASG.sel.add(String(t.id));
                else ASG.sel.delete(String(t.id));
            }
        });
        stuAsgLista();
    };

    // ----- Listas con buscador (Vehículo y Conductor) -----
    function stuAsgCombos() {
        const cu = document.getElementById("asgComboU");
        const co = document.getElementById("asgComboOp");
        if (cu) {
            const txt = ASG.u === null ? "Sin cambio" : ASG.u === "VACIO" ? "Quitar unidad (S/U)" : "U-" + ASG.u;
            cu.className = "asg-combo" + (ASG.u !== null ? " elegido" : "");
            cu.innerHTML = `<span>${escHtml(txt)}</span><span>▾</span>`;
        }
        if (co) {
            const txt = ASG.op === null ? "Sin cambio" : ASG.op === "VACIO" ? "Quitar operador" : ASG.op;
            co.className = "asg-combo" + (ASG.op !== null ? " elegido" : "");
            co.innerHTML = `<span>${escHtml(txt)}</span><span>▾</span>`;
        }
    }

    window.stuAsgAbrirLista = function (cual) {
        ["U", "Op"].forEach(c => {
            const p = document.getElementById("asgPanel" + c);
            if (p) p.style.display = c === cual && p.style.display === "none" ? "block" : "none";
        });
        const panel = document.getElementById("asgPanel" + cual);
        if (panel && panel.style.display === "block") {
            if (cual === "U") stuAsgListaU();
            else stuAsgListaOp();
            const inp = document.getElementById("asgBuscar" + cual);
            if (inp) {
                inp.value = "";
                setTimeout(() => inp.focus(), 30);
                if (cual === "U") stuAsgListaU();
                else stuAsgListaOp();
            }
        }
    };

    window.stuAsgListaU = function () {
        const cont = document.getElementById("asgOpcionesU");
        if (!cont) return;
        const q = String((document.getElementById("asgBuscarU") || {}).value || "").replace(/\D/g, "");
        const enUso = (ASG.ocupacion && ASG.ocupacion.unitToOp) || {};
        let html = `<div class="asg-op" onclick="stuAsgElegir('U', null)"><b>Sin cambio</b></div>
                    <div class="asg-op" onclick="stuAsgElegir('U', 'VACIO')"><span>Quitar unidad (S/U)</span></div>`;
        FLOTA_FIJA.filter(f => !q || String(f.u).indexOf(q) !== -1)
            .slice(0, 120)
            .forEach(f => {
                const u = String(f.u);
                const taller = isUnidadEnTallerOInhabil(u);
                const quien = enUso[u];
                const tags = (taller ? `<span class="asg-tag taller">🔧 Taller${stuDiasTaller(u) ? " · " + escHtml(stuDiasTaller(u)) : ""}</span>` : "") +
                    (!taller && quien ? `<span class="asg-tag uso">La trae ${escHtml(quien)}</span>` : "") +
                    (!taller && !quien ? `<span class="asg-tag libre">Libre</span>` : "");
                html += `<div class="asg-op" onclick="stuAsgElegir('U', '${u}')"><span><b class="mono">U-${u}</b> <small>${escHtml(f.p)}</small></span><span>${tags}</span></div>`;
            });
        cont.innerHTML = html;
    };

    window.stuAsgListaOp = function () {
        const cont = document.getElementById("asgOpcionesOp");
        if (!cont) return;
        const q = smartNorm((document.getElementById("asgBuscarOp") || {}).value || "");
        const ventanas = {};
        ((ASG.ocupacion && ASG.ocupacion.opWindows) || []).forEach(w => (ventanas[w.nombre] = w));
        const claves = {};
        Object.keys(store.operadoresDB || {}).forEach(k => (claves[store.operadoresDB[k]] = k));
        const nombres = Array.from(new Set(Object.values(store.operadoresDB || {}).filter(Boolean)))
            .filter(n => isOperadorActivo(n))
            .filter(n => !q || smartNorm(n + " " + (claves[n] || "")).indexOf(q) !== -1 || q.split(" ").every(p => smartNorm(n).indexOf(p) !== -1));
        const peso = n => {
            const w = ventanas[n];
            if (!w) return 3;
            if (w.freeNow && (!w.trips || !w.trips.length)) return 0;
            if (w.freeNow) return 1;
            return 2;
        };
        nombres.sort((a, b) => peso(a) - peso(b) || a.localeCompare(b));
        let html = `<div class="asg-op" onclick="stuAsgElegir('Op', null)"><b>Sin cambio</b></div>
                    <div class="asg-op" onclick="stuAsgElegir('Op', 'VACIO')"><span>Quitar operador</span></div>`;
        nombres.slice(0, 150).forEach(n => {
            const w = ventanas[n];
            let tag = "";
            if (w && w.freeNow && (!w.trips || !w.trips.length)) tag = `<span class="asg-tag guardia">Guardia</span>`;
            else if (w && w.freeNow) tag = `<span class="asg-tag libre">Libre hasta ${escHtml(w.winTo)}</span>`;
            else if (w) tag = `<span class="asg-tag uso">En ruta</span>`;
            html += `<div class="asg-op" onclick="stuAsgElegir('Op', decodeURIComponent('${tabAttr(n)}'))"><span><b>${escHtml(n)}</b>${claves[n] ? ` <small>${escHtml(claves[n])}</small>` : ""}</span><span>${tag}</span></div>`;
        });
        if (!nombres.length) html += `<div class="asg-op"><small>No encontré operadores disponibles con ese nombre.</small></div>`;
        cont.innerHTML = html;
    };

    window.stuAsgElegir = function (cual, valor) {
        if (cual === "U") ASG.u = valor;
        else ASG.op = valor;
        const p = document.getElementById("asgPanel" + cual);
        if (p) p.style.display = "none";
        stuAsgCombos();
        stuAsgRevisar();
    };

    window.stuAsgMotivo = function (btn) {
        document.querySelectorAll("#sheetContent .reason-chip").forEach(b => b.classList.remove("sel"));
        btn.classList.add("sel");
        ASG.motivo = btn.getAttribute("data-mot") || "";
        stuAsgRevisar();
    };

    // ----- Sugerencias de quién puede cubrir (del viaje que tocaste) -----
    function stuAsgSugerencias() {
        const cont = document.getElementById("asgSugerencias");
        if (!cont) return;
        const base = ASG.baseId ? asgTrips().find(t => String(t.id) === String(ASG.baseId)) : null;
        if (!base) {
            cont.innerHTML = "";
            return;
        }
        let cands = [];
        try {
            cands = recomendarCandidatosParaViaje(base).slice(0, 4);
        } catch (e) {}
        if (!cands.length) {
            cont.innerHTML = "";
            return;
        }
        cont.innerHTML = `<details style="margin-top:10px;" open><summary style="cursor:pointer;font-size:12.5px;font-weight:800;color:var(--ink-soft);padding:4px 0 6px;">💡 Quién llega a tiempo para las ${escHtml(base.h)} (toca para elegir)</summary>` +
            cands
                .map(c => `<div class="asg-sug" onclick="stuAsgUsarSugerencia(decodeURIComponent('${tabAttr(c.op)}'), decodeURIComponent('${tabAttr(c.unit || "")}'))">
                    <span><b>${escHtml(c.op)}</b>${c.unit ? ` · <span class="mono">U-${escHtml(c.unit)}</span>` : ""}<br><small style="color:var(--ink-soft);">${escHtml(c.windowText)}</small></span>
                    <span class="asg-tag libre">Elegir</span></div>`)
                .join("") +
            `</details>`;
    }

    window.stuAsgUsarSugerencia = function (op, unidad) {
        ASG.op = op || null;
        if (unidad) ASG.u = unidad;
        stuAsgCombos();
        stuAsgRevisar();
    };

    // ----- Revisión antes de asignar: choques, taller y unidad ocupada -----
    function stuAsgProblemas() {
        const trips = asgTrips();
        const marcados = trips.filter(t => ASG.sel.has(String(t.id)));
        const avisos = [];
        if (ASG.u && ASG.u !== "VACIO" && isUnidadEnTallerOInhabil(ASG.u)) avisos.push({ s: "mal", t: `La U-${ASG.u} está en taller (${getMotivoUnidad(ASG.u) || "no disponible"}).` });
        const choca = (quien, esUnidad) => {
            const otros = trips.filter(t => {
                if (ASG.sel.has(String(t.id))) return false;
                const a = asgAsignacion(t);
                return esUnidad ? a.unit === quien : a.op === quien;
            });
            const horas = [];
            marcados.forEach(m => {
                const i1 = hhmmToMins(m.h);
                const f1 = i1 + getTripDuration(m);
                otros.forEach(o => {
                    const i2 = hhmmToMins(o.h);
                    const f2 = i2 + getTripDuration(o);
                    if (Math.min(f1, f2) - Math.max(i1, i2) > 5) horas.push(`${m.h} con su viaje de ${o.h} (${o.o} a ${o.d})`);
                });
            });
            return Array.from(new Set(horas));
        };
        if (ASG.op && ASG.op !== "VACIO") {
            const h = choca(ASG.op, false);
            if (h.length) avisos.push({ s: "ojo", t: `${ASG.op} ya tiene viajes a esa hora: ${h.slice(0, 4).join("; ")}${h.length > 4 ? "…" : ""}` });
        }
        if (ASG.u && ASG.u !== "VACIO") {
            const h = choca(ASG.u, true);
            if (h.length) avisos.push({ s: "ojo", t: `La U-${ASG.u} ya va en otro viaje a esa hora: ${h.slice(0, 4).join("; ")}${h.length > 4 ? "…" : ""}` });
        }
        return avisos;
    }

    function stuAsgRevisar() {
        const btn = document.getElementById("asgBtnAsignar");
        const cont = document.getElementById("asgAviso");
        if (!btn || !cont) return;
        const n = ASG.sel.size;
        const hayCambio = ASG.u !== null || ASG.op !== null;
        let html = "";
        if (!n) html = `<div class="asg-aviso ojo">Marca al menos un viaje (paso 2).</div>`;
        else if (!hayCambio) html = `<div class="asg-aviso ojo">Elige una unidad o un operador nuevo (paso 3).</div>`;
        else {
            const probs = stuAsgProblemas();
            html = probs.map(p => `<div class="asg-aviso ${p.s}">${p.s === "mal" ? "⛔" : "⚠️"} ${escHtml(p.t)}</div>`).join("");
            if (!probs.length) html = `<div class="asg-aviso ok">✅ Sin choques: se puede asignar.</div>`;
        }
        cont.innerHTML = html;
        btn.disabled = !n || !hayCambio;
        btn.style.opacity = btn.disabled ? "0.5" : "1";
        const partes = [];
        if (ASG.u !== null) partes.push(ASG.u === "VACIO" ? "sin unidad" : "U-" + ASG.u);
        if (ASG.op !== null) partes.push(ASG.op === "VACIO" ? "sin operador" : ASG.op);
        btn.textContent = n && hayCambio ? `Asignar ${partes.join(" · ")} a ${n} viaje(s)` : "Asignar";
    }

    // ----- Asignar -----
    window.stuAsgAsignar = function () {
        const trips = asgTrips().filter(t => ASG.sel.has(String(t.id))).sort((a, b) => a.h.localeCompare(b.h));
        if (!trips.length || (ASG.u === null && ASG.op === null)) return;
        const ds = getDayState();
        const dKey = fbKey(store.currentDay);
        const antes = trips.map(t => asgAsignacion(t));
        trips.forEach(t => {
            if (ASG.u !== null) ds.tripUnitOverride[t.id] = ASG.u;
            if (ASG.op !== null) ds.tripOpOverride[t.id] = ASG.op;
        });
        const unicos = arr => Array.from(new Set(arr.filter(Boolean)));
        const unidadesAntes = unicos(antes.map(a => a.unit));
        const opsAntes = unicos(antes.map(a => a.op));
        const horas = trips.map(t => t.h);
        const rutaTxt = trips.length === 1 ? formatRouteName(trips[0].o, trips[0].d) : `${trips.length} viajes: ${trips.slice(0, 3).map(t => t.h + " " + normLoc(t.o) + " a " + normLoc(t.d)).join(", ")}${trips.length > 3 ? "…" : ""}`;
        registrarEnHistorial({
            tripTime: horas.length > 1 ? `${horas[0]} a ${horas[horas.length - 1]}` : horas[0],
            clave: trips[0].k || "—",
            route: rutaTxt,
            scope: `Asignación por selección (${trips.length} viaje(s): ${horas.join(", ")})`,
            tripId: trips.length === 1 ? trips[0].id : "",
            oldUnit: unidadesAntes.length > 1 ? unidadesAntes.join("/") : unidadesAntes[0] || "S/U",
            newUnit: ASG.u === null ? (unidadesAntes[0] || "S/U") : ASG.u === "VACIO" ? "S/U" : ASG.u,
            oldOp: opsAntes.length > 1 ? opsAntes.join(" / ") : opsAntes[0] || "Sin Asignar",
            newOp: ASG.op === null ? (opsAntes[0] || "Sin Asignar") : ASG.op === "VACIO" ? "Sin Asignar" : ASG.op,
            reason: ASG.motivo || "Reasignación manual",
            type: "Viaje"
        });
        window.render();
        savePatch({
            [`state/${dKey}/tripUnitOverride`]: ds.tripUnitOverride,
            [`state/${dKey}/tripOpOverride`]: ds.tripOpOverride,
            [`state/${dKey}/unitChanges`]: ds.unitChanges,
            globalHistory: store.globalHistory
        });
        const resumen = [];
        if (ASG.u !== null) resumen.push(ASG.u === "VACIO" ? "Sin unidad" : "U-" + ASG.u);
        if (ASG.op !== null) resumen.push(ASG.op === "VACIO" ? "Sin operador" : ASG.op);
        openSheet(`<div class="asg-exito">
            <div class="ok">✓</div>
            <h2 style="margin:0 0 6px;">Asignación exitosa</h2>
            <div style="font-size:14px;color:var(--ink-soft);line-height:1.5;"><b style="color:var(--ink);">${escHtml(resumen.join(" · "))}</b><br>en ${trips.length} viaje(s): ${escHtml(horas.join(", "))}<br>Motivo: ${escHtml(ASG.motivo || "Reasignación manual")}</div>
            <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">${isConnectedToFirebase ? "El aviso se envió a todos los teléfonos." : "Sin internet: se guardó en este teléfono y se enviará al reconectar."}</div>
          </div>
          <button type="button" class="btn-primary" style="background:var(--accent);" onclick="closeSheet()">OK</button>`);
    };

    // Todo lo que antes abría la ventana vieja de cambio ahora abre esta (tocar un viaje, Cubrir, Pendientes)
    window.openChangeModal = function (card) {
        const tripId = card && card.getAttribute ? card.getAttribute("data-id") || "" : "";
        window.stuAbrirAsignador({ tripId: tripId });
    };

    // Botón 🔁 Cambio en la barra de filtros
    function injectBotonCambio() {
        const bar = document.getElementById("toolbar");
        if (!bar || document.getElementById("btnAsignador")) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "btnAsignador";
        btn.className = "tbtn";
        btn.style.background = "var(--done)";
        btn.style.color = "#fff";
        btn.style.borderColor = "var(--done)";
        btn.textContent = "🔁 Cambio";
        btn.onclick = function () {
            window.stuAbrirAsignador({});
        };
        bar.insertBefore(btn, bar.firstChild);
    }

    // =========================================================================
    // 7. CONEXIÓN LIGERA A FIREBASE + DIAGNÓSTICO DE DATOS + AVISO DE VERSIÓN NUEVA
    //    - Sustituye la conexión original: sin bucle cada 150 ms, junta ráfagas de
    //      cambios en una sola actualización y no se rompe si falla una notificación.
    //    - Se define aquí arriba (al cargar el archivo) para ganarle al reintento
    //      que index.html programa antes de que existan las librerías de Firebase.
    // =========================================================================
    let fbIntentosSDK = 0;
    let fbYaConectado = false;
    let fbEsperandoRed = false;

    function avisarCambioRecibido(ult) {
        try {
            const isCritical = ESTADOS_CRITICOS.some(est =>
                String(ult.reason || "").toLowerCase().includes(est.toLowerCase())
            );
            playAlertSound(isCritical);
            if (navigator.vibrate) navigator.vibrate(isCritical ? [400, 200, 400, 200, 600] : [200, 100, 200]);

            if ("Notification" in window && Notification.permission === "granted") {
                try {
                    new Notification((isCritical ? "⚠️ CRÍTICO: " : "🔄 Cambio: ") + ult.route, {
                        body: `Unidad: ${ult.newUnit === "VACIO" || ult.newUnit === "S/U" ? "S/U" : "U-" + ult.newUnit} | Op: ${
                            ult.newOp === "VACIO" ? "Sin Asignar" : ult.newOp || ult.nombre
                        }\nMotivo: ${ult.reason || "N/A"}`
                    });
                } catch (e) {}
            }
            if (isCritical && !document.hidden && typeof showAggressiveToast === "function") {
                showAggressiveToast(`Cambio urgente en ruta ${ult.route}.`);
            }
        } catch (e) {}
    }

    function procesarDatosDeNube(snap, esPrimeraCarga) {
        const cloudVal = snap.val();
        if (cloudVal) {
            const prevHistLen = Array.isArray(store.globalHistory) ? store.globalHistory.length : 0;
            const localHistoryBackup = Array.isArray(store.globalHistory) ? [...store.globalHistory] : [];

            normalizeStoreStructure(cloudVal);

            if (localHistoryBackup.length > 0) {
                const ids = new Set(store.globalHistory.map(h => h && h.id).filter(Boolean));
                localHistoryBackup.forEach(item => {
                    if (item && item.id && !ids.has(item.id)) {
                        store.globalHistory.push(item);
                        ids.add(item.id);
                    }
                });
            }
            getGlobalHistory();
            saveLocalCacheDebounced();

            if (!esPrimeraCarga && store.globalHistory.length > prevHistLen && prevHistLen > 0) {
                const ult = store.globalHistory[store.globalHistory.length - 1];
                if (ult) avisarCambioRecibido(ult);
            }
        }
        setSyncStatus(false, "En línea", false);
        window.render();
    }

    window.initFirebaseConnection = function () {
        if (fbYaConectado) return;
        if (typeof db !== "undefined" && db) {
            fbYaConectado = true;
            return;
        }

        // Esperar a que carguen las librerías de Firebase, con pausas cada vez más largas
        if (typeof firebase === "undefined" || !firebase.database) {
            fbIntentosSDK++;
            if (fbIntentosSDK > 30) {
                setSyncStatus(false, "Sin red (Caché)", true);
                if (!fbEsperandoRed) {
                    fbEsperandoRed = true;
                    window.addEventListener("online", function () {
                        fbEsperandoRed = false;
                        fbIntentosSDK = 0;
                        window.initFirebaseConnection();
                    }, { once: true });
                }
                return;
            }
            setTimeout(window.initFirebaseConnection, Math.min(250 * fbIntentosSDK, 3000));
            return;
        }

        fbYaConectado = true;
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyCgRzOFk8XaCHZZV3brW9AtuJCVBP0cJhA",
                authDomain: "rutas-operaciones.firebaseapp.com",
                databaseURL: "https://rutas-operaciones-default-rtdb.firebaseio.com",
                projectId: "rutas-operaciones"
            };
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.database().ref("operaciones_v6");

            firebase.database().ref(".info/connected").on("value", snap => {
                isConnectedToFirebase = !!snap.val();
                if (isConnectedToFirebase) setSyncStatus(false, "En línea", false);
                else setSyncStatus(false, "Sin red (Caché)", true);
            });

            let primera = true;
            let snapPendiente = null;
            let temporizador = null;
            db.on(
                "value",
                snap => {
                    snapPendiente = snap;
                    if (temporizador) return; // ya hay una actualización en camino: solo se usa la más reciente
                    temporizador = setTimeout(function () {
                        temporizador = null;
                        const s = snapPendiente;
                        snapPendiente = null;
                        const esPrimera = primera;
                        primera = false;
                        try {
                            procesarDatosDeNube(s, esPrimera);
                        } catch (e) {
                            console.error("Error procesando datos de la nube:", e);
                            setSyncStatus(false, "En línea", false);
                        }
                    }, primera ? 0 : 400);
                },
                () => setSyncStatus(false, "Caché local", true)
            );
        } catch (e) {
            fbYaConectado = false;
            setSyncStatus(false, "Modo caché", true);
        }
    };

    // Si la app vuelve a primer plano y aún no conectó, reintenta de inmediato
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && !fbYaConectado) {
            fbIntentosSDK = 0;
            window.initFirebaseConnection();
        }
    });

    // ----- Diagnóstico: ¿qué parte de los datos pesa más? -----
    function pesoKB(obj) {
        try {
            const txt = JSON.stringify(obj === undefined ? null : obj);
            return new Blob([txt]).size / 1024;
        } catch (e) {
            return 0;
        }
    }

    function formatoPeso(kb) {
        return kb >= 1024 ? (kb / 1024).toFixed(2) + " MB" : Math.round(kb) + " KB";
    }

    window.verConsumoDatos = async function () {
        const secciones = [
            ["days", "Rol (todas las corridas)"],
            ["state", "Cambios y estados por día"],
            ["operadoresMeta", "Datos de operadores (teléfonos, etc.)"],
            ["operadoresDB", "Lista de operadores"],
            ["globalHistory", "Historial de cambios"],
            ["globalFleet", "Flota"],
            ["knownRoutes", "Rutas que conoce cada operador"],
            ["unassignedReasons", "Motivos (taller, baja, etc.)"],
            ["tallerDB", "Unidades en taller"]
        ];
        let total = 0;
        const filas = secciones
            .map(function (s) {
                const kb = pesoKB(store[s[0]]);
                total += kb;
                return { nombre: s[1], kb: kb };
            })
            .sort((a, b) => b.kb - a.kb);

        let cacheLocalKB = 0;
        try {
            cacheLocalKB = ((localStorage.getItem(CACHE_KEY) || "").length * 2) / 1024;
        } catch (e) {}

        let usoNavegador = "";
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                if (est && est.usage) usoNavegador = formatoPeso(est.usage / 1024);
            }
        } catch (e) {}

        const nHist = Array.isArray(store.globalHistory) ? store.globalHistory.length : 0;
        const nDias = Object.keys(store.days || {}).length;
        const nEstados = Object.keys(store.state || {}).length;

        let barras = "";
        filas.forEach(function (f) {
            const pct = total > 0 ? Math.max(1, Math.round((f.kb / total) * 100)) : 0;
            barras += `<div style="margin-bottom:9px;">
                <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;">
                  <span>${f.nombre}</span><span>${formatoPeso(f.kb)} (${pct}%)</span>
                </div>
                <div style="height:7px;background:var(--line);border-radius:6px;overflow:hidden;margin-top:3px;">
                  <div style="height:100%;width:${pct}%;background:var(--accent);"></div>
                </div>
              </div>`;
        });

        openSheet(`<h2>📊 ¿Qué gasta mis datos?</h2>
          <div style="background:var(--surface-2);padding:12px;border-radius:12px;font-size:13px;line-height:1.7;margin-bottom:12px">
            <b>Total que se baja de la nube al conectar:</b> hasta ${formatoPeso(total)}<br>
            <b>Copia guardada en este teléfono:</b> ${formatoPeso(cacheLocalKB)}<br>
            ${usoNavegador ? `<b>Espacio usado por la app en el teléfono:</b> ${usoNavegador}<br>` : ""}
            <b>Días del rol:</b> ${nDias} · <b>Días con cambios guardados:</b> ${nEstados} · <b>Registros de historial:</b> ${nHist}
          </div>
          ${barras}
          <div style="font-size:12px;color:var(--ink-soft);margin:10px 0;">
            Mándame una captura de esta pantalla y te digo exactamente qué parte conviene aligerar, sin borrar nada importante.
          </div>
          <button type="button" class="btn-outline" onclick="closeSheet()">Cerrar</button>`);
    };

    // ----- Aviso cuando hay una versión nueva de la app en GitHub -----
    function mostrarBarraVersionNueva() {
        if (document.getElementById("stuBarraVersion")) return;
        const bar = document.createElement("div");
        bar.id = "stuBarraVersion";
        bar.style.cssText =
            "position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom, 0px) + 74px);z-index:10002;" +
            "background:#00509d;color:#fff;border-radius:12px;padding:10px 12px;display:flex;align-items:center;" +
            "gap:10px;font-weight:700;font-size:13px;box-shadow:0 6px 18px rgba(0,0,0,0.3);";
        bar.innerHTML =
            `<span style="flex:1;">Hay una versión nueva de la app.</span>` +
            `<button type="button" id="stuBtnVersion" style="border:none;border-radius:9px;padding:8px 12px;background:#fff;color:#00509d;font-weight:800;cursor:pointer;">Actualizar</button>`;
        document.body.appendChild(bar);
        document.getElementById("stuBtnVersion").onclick = function () {
            location.reload();
        };
    }

    function registrarAvisoVersionNueva() {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.addEventListener("message", function (ev) {
            if (ev.data && ev.data.type === "stu-version-nueva") mostrarBarraVersionNueva();
        });
    }

    // =========================================================================
    // 8. INICIALIZACIÓN AUTOMÁTICA AL CARGAR LA APP
    // =========================================================================
    function initExtras() {
        enforceMobileViewportAndStyles();
        inyectarEstilosTablero();
        inyectarEstilosEstados();
        stuRestaurarDeCopiaLocal();
        inyectarEstilosAsignador();
        injectBotonCambio();
        injectFullscreenButton();
        injectFallasButton();
        injectInicialesSmartButton();
        enlazarRegistroDeCambiosLocales();
        enlazarRenderConAvisos();
        registrarAvisoVersionNueva();
        if (typeof window.render === "function") {
            window.render();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initExtras);
    } else {
        initExtras();
    }
})();