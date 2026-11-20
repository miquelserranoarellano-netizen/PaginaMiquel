# HomeDesign Studio — Arquitectura

Documento de diseño previo a la implementación. Explica cómo está organizada la
aplicación, el modelo de datos, el sistema de coordenadas y cómo se mantienen
sincronizados el plano 2D y el modelo 3D.

## 1. Visión general

```
┌──────────────────────── Electron (proceso principal) ────────────────────────┐
│  electron/main.cjs   ventana, menú, IPC de ficheros (guardado atómico)       │
│  electron/preload.cjs  API segura `window.homeDesign` (contextIsolation)     │
└───────────────────────────────▲──────────────────────────────────────────────┘
                                │ IPC
┌───────────────────────────────┴──────── Renderer (React) ────────────────────┐
│                                                                              │
│   UI (barras, paneles)  ──►  Stores Zustand  ◄── Editor2D (SVG)              │
│                               │  projectStore  (documento + historial)       │
│                               │  editorStore   (herramienta, selección, vista)│
│                               ▼                                              │
│                         ProjectDoc (modelo único)                            │
│                               │                                              │
│              ┌────────────────┼──────────────────┐                           │
│              ▼                ▼                  ▼                           │
│        Editor2D (plano)   Editor3D (R3F)   FirstPersonController             │
│                                                                              │
│   ProjectManager: almacenamiento (Electron fs / IndexedDB), autoguardado,    │
│   importación/exportación (.hdsp, PNG, PDF, GLB, GLTF)                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

* **Un único documento** (`ProjectDoc`) describe la vivienda. El plano 2D, el
  modelo 3D y el recorrido son *vistas* de ese documento: nunca guardan copias.
* Toda modificación pasa por `projectStore.apply()` (o por un *gesto*
  `beginGesture / updateGesture / endGesture` para arrastres), lo que garantiza
  deshacer/rehacer, autoguardado y sincronización automática.

## 2. Tecnologías

| Área | Elección | Motivo |
|------|----------|--------|
| UI | React 19 + TypeScript | Tipado estricto del modelo, componentes reutilizables |
| Build | Vite 7 | Arranque instantáneo, build optimizado por *chunks* |
| 3D | Three.js + React Three Fiber + Drei | Escena declarativa sincronizada con el estado |
| Estado | Zustand + Immer | Store mínimo, actualizaciones inmutables con *structural sharing* (historial barato) |
| Estilos | Tailwind CSS 4 | Interfaz consistente sin hojas de estilo dispersas |
| Escritorio | **Electron** | Ver decisión D1 |
| Persistencia | Ficheros JSON locales (Electron) / IndexedDB (navegador) | Sin cuentas ni servidores |
| PDF | jsPDF | Exportación de planos con cajetín |
| Tests | Vitest | Geometría y operaciones del modelo |

## 3. Estructura de carpetas

```
electron/                 Proceso principal y preload de Electron
docs/                     Documentación técnica
src/
  core/                   Lógica pura, sin React (testeable)
    geometry/             Vectores, polígonos, intersecciones
    ids.ts, units.ts      Identificadores y formato de unidades
  modules/
    FloorPlan/            Modelo de datos: tipos, fábricas, validación, plantillas
    Walls/                Geometría de muros (uniones a inglete, huecos), operaciones
    Rooms/                Tipos de estancia, superficies, detección automática
    DoorsAndWindows/      Catálogo de huecos, símbolos 2D, modelos 3D
    Furniture/            Catálogo paramétrico, modelos 3D, GLB/GLTF externos
    Materials/            Biblioteca de materiales y texturas procedurales
    Lighting/             Ambientes de iluminación (día/noche) y luces
    Editor2D/             Lienzo SVG, viewport, herramientas de dibujo, *snap*
    Editor3D/             Escena 3D, cámara orbital, selección, exportación GLB
    FirstPersonController/  Recorrido en primera persona, colisiones, minimapa
    ProjectManager/       Almacenamiento, autoguardado, import/export, pantalla de proyectos
    UI/                   Barras, paneles, campos numéricos, notificaciones
  store/                  projectStore (documento + historial) y editorStore (UI)
```

Cada módulo expone su API pública en `index.ts`. Los módulos de dominio
(`Walls`, `Rooms`, …) contienen tanto la lógica pura como sus componentes 2D/3D,
de modo que añadir un tipo de elemento nuevo es local a su módulo.

## 4. Sistema de coordenadas

* Unidad: **metro** en todo el modelo (la interfaz muestra m, cm y m²).
* Plano: `x` hacia la derecha (este), `y` hacia abajo (sur), origen arbitrario.
* 3D (Three.js, Y arriba): `X = x`, `Z = y`, `Y = elevación`.
* Rotaciones de muebles: grados en sentido horario visto en planta.
  En 3D: `rotation.y = -rad(grados)`.
* Cada planta (`Level`) tiene una `elevation` (cota del suelo) y una altura por
  defecto; los elementos guardan alturas relativas a su planta.

## 5. Modelo de datos (`ProjectDoc`)

Colecciones normalizadas (diccionarios por `id`), cada elemento con `levelId`:

```ts
ProjectDoc {
  schemaVersion, id, name, createdAt, updatedAt
  settings   { defaultWallThickness, defaultWallHeight, ... }
  lighting   { preset, sunIntensity, sunAzimuth, sunElevation, ambient, interior, exposure, shadows }
  levels     Record<id, Level      { name, elevation, height, order }>
  walls      Record<id, Wall       { start, end, thickness, height, sideA, sideB }>
  rooms      Record<id, Room       { name, type, points[], floor, ceiling, hasCeiling, ceilingLight }>
  openings   Record<id, Opening    { wallId, kind, offset, width, height, sill, hinge, swing, frame, panel }>
  furniture  Record<id, Furniture  { catalogId, position, rotation, elevation, width, depth, height, materials, assetId? }>
  dimensions Record<id, Dimension  { start, end, offset }>        // cotas
  assets     Record<id, Asset      { name, mime, dataUrl }>        // GLB/GLTF importados
}
```

* Las **puertas y ventanas** se definen sobre su muro (`wallId` + `offset` desde
  el inicio del muro). Al mover o alargar un muro, los huecos le acompañan.
* Las **superficies** se calculan siempre desde la geometría (fórmula del
  área de Gauss), nunca se guardan: no pueden quedar desincronizadas.
* Los **materiales** se referencian por id (`{ materialId, color }`), así un
  cambio en la biblioteca se refleja en todo el proyecto.

## 6. Sincronización 2D ⇄ 3D

1. El usuario actúa en cualquier vista → se llama a una operación del dominio
   (p. ej. `Walls.ops.moveEndpoint(draft, …)`) dentro de `projectStore.apply`.
2. Immer produce un documento nuevo compartiendo lo que no cambió.
3. Cada vista se suscribe con selectores a las colecciones que necesita. React
   re-renderiza solo los elementos cuya referencia cambió (`React.memo`).
4. En 3D, cada muro calcula su geometría con `useMemo` dependiente del muro, de
   sus muros conectados y de sus huecos: mover una pared reconstruye solo las
   geometrías afectadas.

Ediciones posibles desde 3D: seleccionar, mover muebles arrastrando sobre el
suelo, cambiar alturas, grosores, materiales, colores, techos, iluminación. El
trazado de muros se hace en 2D (es donde se puede dibujar con precisión).

## 7. Historial (deshacer / rehacer)

* `past[]` y `future[]` guardan referencias a documentos inmutables (gracias
  al *structural sharing* de Immer cuestan muy poca memoria). Límite: 200 pasos.
* Los arrastres usan *gestos*: el estado previo se guarda al empezar y solo se
  apila una entrada al soltar, no una por cada movimiento del ratón.

## 8. Persistencia y fiabilidad

* Autoguardado con *debounce* (1,5 s) tras cada cambio + guardado manual (Ctrl+S).
* Electron: `userData/projects/<id>.hdsp.json` + `<id>.meta.json`. Escritura
  atómica (fichero temporal + `rename`) y copia `.bak` de la versión anterior.
* Navegador: IndexedDB (mismo formato).
* Al abrir/importar, `normalizeProject()` valida la estructura, migra versiones
  y rellena valores por defecto; los errores se muestran sin perder datos.

## 9. Decisiones y soluciones alternativas

* **D1 – Electron en lugar de Tauri.** Tauri usa el WebView del sistema
  (WebKitGTK en Linux, WKWebView en macOS) cuyo rendimiento WebGL es irregular,
  y exige toolchain de Rust. Electron incluye Chromium: el 3D se comporta igual
  en Windows, macOS y Linux.
* **D2 – Texturas procedurales.** No se incluyen fotografías de texturas con
  licencia: parquet, mármol, cerámica, hormigón, ladrillo, piedra, madera, césped…
  se generan en la propia app (funciona sin conexión y se pueden teñir de
  cualquier color). El módulo `Materials` admite añadir mapas de imagen más
  adelante.
* **D3 – Muebles paramétricos + GLB/GLTF.** El catálogo incluido está modelado
  con primitivas paramétricas (se redimensionan sin deformarse y generan su
  símbolo 2D automáticamente). Para modelos realistas se pueden importar
  ficheros GLB/GLTF, que se guardan dentro del proyecto.
* **D4 – Puertas en el recorrido.** Las hojas de puerta se abren solas al
  acercarse en el modo recorrido; así se puede pasar entre estancias sin
  botones adicionales.
* **D5 – Huecos en muros sin CSG.** Cada muro se divide en tramos macizos, antepechos
  y dinteles alrededor de sus huecos. Es más rápido y robusto que la
  sustracción booleana y genera colisiones exactas para el recorrido.
* **D6 – Plano en SVG.** El editor 2D usa SVG: líneas nítidas a cualquier zoom,
  selección precisa y exportación directa a PNG/PDF.
* **D7 – Escaleras.** Las plantas se apilan en 3D; en el recorrido se cambia de
  planta desde el selector (no hay subida física por escaleras).

## 10. Fases de desarrollo

1. Interfaz y editor 2D funcional.
2. Conversión automática del plano a geometría 3D.
3. Recorrido en primera persona con colisiones.
4. Biblioteca de muebles y objetos 3D.
5. Materiales, texturas e iluminación.
6. Guardado, exportación y optimización (+ empaquetado de escritorio).
