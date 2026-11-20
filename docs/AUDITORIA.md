# Auditoría de HomeDesign Studio

Revisión completa de la aplicación (interacción, muebles, orden del código y
rendimiento) y cambios aplicados.

## Interacción y detalles

| Hallazgo | Cambio |
|---|---|
| Borrar era irreversible a simple vista (había que conocer Ctrl+Z). | Al borrar aparece un aviso con **Deshacer** (`toast.action`, `UI/actions.ts`). |
| Los atajos no se podían descubrir. | Panel de **atajos** (`?` o botón *Atajos* de la barra de estado). |
| Al borrar la planta activa la vista quedaba en una planta inexistente. | `useLevelGuard` recoloca la vista en una planta válida. |
| Los campos numéricos solo aplicaban el valor al salir del campo; en el móvil costaba subir la altura de la tele. | `NumberField` aplica el valor mientras escribes (0,7 s), muestra botones − / + en pantallas táctiles y usa teclado numérico. |
| Altura del televisor poco clara. | Etiqueta *Desde el suelo* y nuevo campo *Centro a* (altura del centro de la pantalla) con la recomendación de altura cómoda. |
| `prompt`/`confirm` del navegador no funcionan en Electron ni en marcos. | Diálogos propios (`UI/dialog.tsx`). |
| Textos de ayuda del plano tapaban el zoom en pantallas medianas. | Ancho limitado y recorte. |
| Las notificaciones quedaban detrás de las ventanas modales. | Capa superior para los avisos. |

## Muebles

* **16 objetos nuevos** (95 en total, 16 categorías): nuevas categorías
  *Climatización* (split, radiador, ventilador de techo con luz, termo, bomba de
  calor) y *Estructura* (escalera recta y de caracol, pilar, barandilla de vidrio),
  y además litera, consola de entrada, perchero, banco de recibidor, lavabo doble,
  jacuzzi y pérgola.
* **Amueblar estancia**: coloca los muebles típicos según el tipo de estancia,
  pegados a las paredes, sin tapar puertas/ventanas y dejando paso
  (`Furniture/autoFurnish.ts`, con tests).

## Orden del código

* `Furniture/catalog.ts` (690 líneas) se divide en `Furniture/catalog/` con un
  fichero por familia y piezas comunes en `parts.ts`.
* Texturas separadas en dibujo (`Materials/patterns.ts`) y conversión a three.js
  (`Materials/textures.ts`).
* Miniaturas: la cola y la caché (`thumbnails.ts`) separadas del renderizador
  (`thumbnailRenderer.ts`).
* Guardado: adaptadores intercambiables (escritorio, navegador, memoria, nube).

## Rendimiento

| Medida | Antes | Después |
|---|---|---|
| JavaScript inicial (gzip) | 417 KB | **219 KB** |
| three.js en el arranque | sí | no (se carga al abrir el 3D o la biblioteca) |
| Cliente de Supabase | — | bajo demanda (59 KB gzip, solo si se configura) |

Además: el postprocesado (oclusión ambiental) se puede desactivar con *Calidad
alta*, las miniaturas se generan en tiempo libre del navegador (`requestIdleCallback`)
y el autoguardado espera a que termine cada arrastre.

## Nube

Guardado opcional en Supabase con cuentas de usuario y seguridad por filas; ver
el README (*Guardar en la nube*).

## Pendiente / ideas

* Subida física por escaleras en el recorrido.
* Tejados inclinados.
* Sincronización sin conexión (guardar localmente si falla la nube y subir después).
