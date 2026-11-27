# Rol Operativo STU BUAP — reglas del proyecto

App de Germán (Supervisor de operaciones, Estrella Roja) para la operación STU/BUAP.
Germán es Ingeniero Industrial, no programa: explicar en español sencillo, sin tecnicismos.

## Qué es
- PWA de un solo `index.html` + `sw.js` + carpeta `modulos/` (entrega-turno, kilometraje, excesos).
- APK con Capacitor; se arma sola en GitHub Actions (`.github/workflows/generar-apk.yml`).
- Base: Firebase Realtime Database, proyecto `rutas-operaciones`, nodo principal `operaciones_v6`.
- Reglas de la base en `reglas-firebase.json` (se pegan a mano en la consola de Firebase).

## Reglas de trabajo (siempre)
1. Español y horario de 24 horas en todo (textos, horas, archivos).
2. 100 % gratis: plan Spark de Firebase, GitHub Pages, nada de pago.
3. No borrar ni romper funciones ni datos que ya existen.
4. Preguntar antes de cambios grandes (reglas de Firebase, forma de guardar, quitar secciones).
5. Primero la vista previa (artefacto con datos de ejemplo); los archivos para subir solo cuando Germán apruebe.
6. Nunca escribir PINs, contraseñas ni llaves en el código: el repositorio es público.
7. Datos personales: sin domicilios ni columnas sensibles en la nube; los teléfonos personales sí se quedan.
   El área Consulta no ve nombres completos ni teléfonos; las demás áreas sí ven nombres completos.
8. En cada versión nueva: subir `CACHE_NAME` en `sw.js` (v21 = 5.0, v22 = 5.1), `STU_VERSION` en `index.html`,
   `version` en `package.json`, `versionName` en el workflow y el `?v=` de los módulos.

## Áreas y permisos
Supervisión, Despacho, Torre de Control, Jefatura, Desarrollo, Consulta.
- Crear, duplicar, borrar días y poner candado: Supervisión, Jefatura, Desarrollo.
- Quitar candado y administrar usuarios: Jefatura y Desarrollo.
- Subir el Excel "datos" (plantilla y flota): solo Desarrollo.
- Consulta: solo lectura.

## Cómo guarda la app
- `savePatch` = `db.update` por rutas; `saveStore` = `db.update` de cada sección (nunca `set` de toda la base:
  las reglas no dan permiso de escritura en la raíz de `operaciones_v6`).
- Caché local: `localStorage` `stu_buap_cache_v7`; funciona sin internet.
- Días: `store.days[clave] = {label, key, fecha, trips[], origen, candado?}`; cambios en `store.state[clave]`.
- Flota (5.0): manda la última Entrega de turno (`store.flotaTurno`). Lo marcado en Flota después de esa entrega
  también cuenta; lo viejo sin confirmar (marcas anteriores, Excel "datos", estados generales) queda "Por confirmar"
  y NO cuenta como taller. Todo pasa por `isUnidadEnTallerOInhabil` / `ftEstado`.
- Roles archivados: `operaciones_v6_roles/{aaaa-mm}/{iso}` y resumen en `operaciones_v6_roles_idx/{iso}`.

## Novedades 5.0 (para no romperlas)
- Usuarios (`stuAbrirUsuarios`): tres formas de entrar. Google con pre-registro en `operaciones_v6_usuarios/invitados/{correo con , en vez de .}`;
  correo y contraseña; usuario y contraseña (correo interno `usuario@<authDomain>`, mapa público `login/{usuario}`).
  Las cuentas se crean con una segunda conexión de Firebase ("alta") para no cerrar la sesión de quien da de alta.
  La contraseña temporal NUNCA se guarda; `debeCambiar` obliga a crear la propia. Requiere el proveedor Correo/contraseña en Firebase.
- Pendientes y agenda (`pdAbrir`): pantalla completa, base de registros `pdRegistros()` (pendientes, permisos de `estadosRango`,
  folios, turnos, vueltas extra, roles, cierres). En computadora: `pdVistaCronoPC` (tabla + línea de tiempo) y `pdVistaCalPC`
  (barras de varios días). Los permisos se editan ahí mismo y se guardan en `estadosRango/{op}/{id}` (campos estado, desde, hasta, nota, papel).
- Estilo GER: capa CSS "5.0 · ESTILO GER" al final del `<style>`; colores azul rey #1D3F94 y rojo #E31B23. Tablero en celular compacto.
- Aviso "Sin internet" (`stuMarcarRed`). Kilometraje: números como 17.973,40 (`fNum`).

## Cómo probar antes de entregar
- Revisar sintaxis de los `<script>` con `node --check`.
- Playwright con capturas a 400 px (teléfono) y 1440 px (computadora); cero errores en consola.
- La copia de vista previa (`art/`) lleva datos de ejemplo; la versión real no.

## Entrega
ZIP con `subir-a-github/` (index.html, sw.js, modulos/, package.json, capacitor.config.json,
.github/workflows/generar-apk.yml, CLAUDE.md), `firebase/reglas-firebase.json` y `GUIA.txt` paso a paso.

## Novedades 5.1 (para no romperlas)
- Reportes: un solo apartado (`modulos/reportes.html`, menú Reportes). Acceso Supervisión, Torre de Control, Jefatura y Desarrollo;
  subir archivos solo Desarrollo (`stuPuede("subirReportes")`). Kilometraje, Excesos, Eventos, Puntualidad, Diésel y Cambios programados
  funcionan; Archivos, Reportes del día, Periodo, Cómo se cruzan y Programado vs real aún con datos de ejemplo (marcados «Ejemplo»).
- Indicadores oculto (nav y menú); el código sigue (lo usa «Para el grupo de operadores»).
- Flota: pestañas Flota · Headcount · Entrega de turno (`flotaTab`); sub-pestañas Asignados / Operadores sin asignar / Unidades sin asignar /
  Unidades en taller (`flotaSub`). Asignación del día desde el rol (plantilla) → Monitor → Excel "datos" (`flAsignacionDelDia`).
  Errores: operador en el rol con estado fuera (`FL_FUERA`) va en rojo hasta arriba. Bajas: `store.bajasFecha`, visibles hasta fin de mes.
  Consulta no ve Flota. Edita solo Supervisión y Desarrollo (`estadoOp`, `estadoUnidad`, `headcount`, `turno`).
- Headcount: ligado al rol planeado (sin rol = sin novedad y sin corridas en `t.n`); estado nuevo «Suspensión».
- Entrega de turno dentro de Flota (`?en=flota`): solo Cambios y Seguimiento, sin días (usa `STU_PUENTE.diaIso`), copia del día pasado;
  ya no cambia estados de operadores (`marcarEstado` desactivado) ni muestra préstamos (viven en Headcount).
- Activas: colores de ruta (`stuColorRuta`, `RC_REGLAS`, config en `config/rutaColores`, Menú › Ajustes › Colores de rutas).
  Celular: tarjeta de siempre con color hasta la hora, sin estrella de puntualidad. Computadora: hoja tipo Excel (`htmlFilaXl`):
  Origen, Destino, Unidad, Clave, Nombre, Hora, Positivo, Salida real, Incidencias (ícono), Analista; flechas/Tab/Enter, "." o "+" + Enter marca;
  anchos de columna arrastrables (`stu_xl_anchos`). Filtros: Todas · Entradas · Salidas · Entrada CU2 · Salida CU2.
- Palomita oculta a los 5 min (`OCULTAR_FORMADO_MIN`). Sin botón rojo flotante de cambio.
- Cambios por confirmar: Avisar · Sin aviso · Deshacer por cambio; solo se avisa lo hecho hoy; `stuAvisoVigente` (2 h) filtra avisos viejos.
- Catálogo de rutas = Hoja2 oficial; clave desconocida sale «Ruta ####» con aviso (sin «Acajete»).

## Material de apoyo (noviembre 2026)
- Presentaciones (Slides): «Cómo funciona la app» y «Mejora y crecimiento»; fuente en `presentaciones/`.
- Videos: «Presentacion_STU_Android/Escritorio» (~5 min, tono gerencia + personal operativo, transiciones) y
  «Guia_STU_*_vertical» (~1,5 min, formato teléfono). Voz gratis con Piper `es_MX-claude-high` (huggingface.co;
  requiere acceso a internet en Capacidades). Scripts en `videos/`: `cap.js` captura pantallas reales de la vista previa,
  `guion2.py`/`guionv.py` texto y voz, `capas*.js` dibujan, `clips*.py` animan, `final*.py` unen con transiciones.
  Pronunciación: STU→«S T U», CU2→«C U dos», Headcount→«Jed caunt».
- Infografías (Design, 1080×1350): La app en una imagen, Un día de operación, Por qué mejora, Quién ve qué, Así se ve.
- Respaldo de necesidades y prompt para chat nuevo: documento «Respaldo · Rol Operativo STU» y `RESPALDO_LEEME.md`.

## Novedades 5.1.1 (para no romperlas)
- Reportes › Archivos ya es real (`modulos/reportes.html`, bloque «ARCHIVOS DEL DÍA»): se sueltan o eligen los archivos del día
  una vez; se reconocen por nombre o contenido (PL Plantilla, MO Monitor, VE Velocidad, EV Eventos, KM Kilometraje, PU Puntualidad,
  DI Diésel). VE/EV/MO → Excesos (iframe oculto, `handleFiles`, guarda en `stu_vel_raw`); KM/MO → Kilometraje al abrir su pestaña
  (`KM_PEND`, `kmPendientes`); MO → nube `operaciones_v6_base/monitor` (Flota); DI → `dieLeerArchivo`; PU y PL con un toque
  (abren Puntualidad o Crear día con el archivo). Los archivos se vuelven a crear dentro del módulo (`enModulo`) por el lector de Excel.
  Permiso: `subirReportes` (solo Desarrollo). Bitácora local `rep_archivos_log`.
- Flota y Headcount solo del rol del día (`stuConSoloRol`, `window._stuSoloRol`): no cuentan los estados de operador del Excel de flota
  (letras, bajas, turismo de la hoja). Sí cuentan estadosDia, estadosRango, bajas marcadas en la app (`bajasFecha`) y lo general
  marcado en la app (`estadosGenApp`). Asignación solo de Plantilla del día o Monitor (ya no del Excel «datos»).
- `bajasFecha`, `estadosGenApp` y `config` (colores de ruta) ahora se leen de la nube en `stuCamposExtra`.
- Versión: CACHE_NAME v23, módulos ?v=5.1.1.

## Novedades 5.1.2 (para no romperlas)
- Reportes solo con datos reales: se quitaron Periodo, Cómo se cruzan y Programado vs real (eran de ejemplo).
- `modulos/reportes.html` pone `window.STU_PUENTE = PAPP.STU_PUENTE`: así Excesos y Kilometraje, abiertos dentro de Reportes,
  le mandan sus resultados a la app (antes se perdían y «Reportes del día» no se llenaba).
- Al subir en Archivos: Excesos/Eventos y Kilometraje se calculan en módulos ocultos; Puntualidad se guarda sola
  (`punProcesarSilencio` en index.html); Diésel con `dieLeerArchivo`; la Plantilla sigue con un toque (Crear día).
- «Reportes del día» = `renderReportesInd(true)` de la app pintado dentro del módulo (estilos .rp-/.ind- copiados y
  acotados a `.rp-real`). Pestañas Puntualidad y Diésel muestran su parte de esa hoja.
- Tabla «Archivos subidos por día»: nube `operaciones_v6/reportesArchivos/{día}/{tipo}` (regla $otro) + `rep_archivos_log` local.
- Versión: CACHE_NAME v24, módulos ?v=5.1.2.
