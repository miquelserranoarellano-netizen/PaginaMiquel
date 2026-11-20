import { X } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Vistas',
    items: [
      ['1 · 2 · 3', 'Plano 2D · Modelo 3D · Recorrido'],
      ['F', 'Encuadrar el plano'],
      ['Rueda · botón central', 'Zoom · desplazar el plano'],
    ],
  },
  {
    title: 'Herramientas del plano',
    items: [
      ['V', 'Seleccionar y mover'],
      ['W', 'Muro (escribe la longitud y Enter)'],
      ['H · Y · U', 'Estancia rectangular · poligonal · detectar'],
      ['D · N', 'Puerta · ventana'],
      ['M', 'Medir y dejar una cota'],
      ['Mayús · Alt', 'Ángulos de 15° · sin ajuste'],
    ],
  },
  {
    title: 'Edición',
    items: [
      ['Ctrl+Z · Ctrl+Y', 'Deshacer · rehacer'],
      ['Ctrl+C · Ctrl+V · Ctrl+D', 'Copiar · pegar · duplicar'],
      ['Supr', 'Eliminar la selección'],
      ['Flechas (Mayús ×10)', 'Desplazar la selección'],
      ['R (Mayús: 15°)', 'Girar muebles 90°'],
      ['Ctrl+A · Esc', 'Seleccionar todo · cancelar'],
      ['Ctrl+S', 'Guardar ahora'],
    ],
  },
  {
    title: 'Recorrido',
    items: [
      ['W A S D · ratón', 'Caminar · mirar'],
      ['Mayús', 'Correr'],
      ['F · E · Q', 'Cámara libre · subir · bajar'],
      ['Esc', 'Soltar el ratón'],
    ],
  },
];

/** Ayuda de atajos de teclado (tecla ?). */
export function ShortcutsHelp() {
  const open = useEditorStore((s) => s.helpOpen);
  const setOpen = useEditorStore((s) => s.setHelpOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="hd-help-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl thin-scroll">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="hd-help-title" className="text-[16px] font-semibold text-slate-900">
            Atajos de teclado
          </h2>
          <button type="button" aria-label="Cerrar" autoFocus onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</h3>
              <dl className="space-y-1.5">
                {g.items.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <dt>
                      <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11.5px] text-slate-700">{k}</kbd>
                    </dt>
                    <dd className="text-right text-slate-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
