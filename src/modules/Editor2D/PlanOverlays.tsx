import { Maximize, Minus, Plus } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { formatNumber } from '@/core/units';
import { zoomAt, type Size } from './viewport';
import { useCompact } from '@/modules/UI/useLayout';

const HINTS: Record<string, string> = {
  select: 'Clic para seleccionar · Mayús+clic: añadir · Arrastra en vacío para seleccionar por área · Supr: borrar · Ctrl+D: duplicar',
  pan: 'Arrastra para desplazar el plano',
  wall: 'Clic o arrastra para dibujar muros · Escribe la longitud y pulsa Enter · Mayús: ángulos de 15° · Alt: sin ajuste · Doble clic / Esc: terminar',
  'room-rect': 'Arrastra para dibujar la habitación · Escribe "4x3" + Enter para medidas exactas · Alt: sin ajuste',
  'room-poly': 'Clic en cada vértice · Clic en el primero, doble clic o Enter para cerrar · Retroceso: deshacer vértice',
  'room-detect': 'Haz clic dentro de un recinto cerrado por muros para crear la habitación automáticamente',
  opening: 'Clic sobre un muro para colocar · La apertura sigue el lado del cursor · Alt: sin ajuste a la cuadrícula',
  measure: 'Clic en dos puntos (o arrastra) para medir y dejar una cota',
  furniture: 'Clic para colocar · Se apoya solo en las paredes cercanas (Alt para evitarlo) · R: girar 90° · Mayús+clic: seguir colocando',
};

export function PlanOverlays({ size }: { size: Size }) {
  const tool = useEditorStore((s) => s.tool);
  const vp = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const requestFit = useEditorStore((s) => s.requestFit);
  const compact = useCompact();

  // Barra de escala: longitud "redonda" que ocupe ~80-160 px.
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const meters = candidates.find((m) => m * vp.zoom >= 70) ?? 50;
  const px = meters * vp.zoom;
  const center = { x: size.w / 2, y: size.h / 2 };

  return (
    <>
      {!compact && <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[calc(100%-22rem)] -translate-x-1/2 truncate rounded-full bg-slate-900/75 px-3.5 py-1.5 text-[11.5px] text-white shadow">{HINTS[tool]}</div>}
      <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-1">
        <div className="text-[11px] font-medium text-slate-600">{meters < 1 ? `${formatNumber(meters * 100, 0)} cm` : `${formatNumber(meters, 0)} m`}</div>
        <div className="h-1.5 border-x-2 border-b-2 border-slate-600" style={{ width: px }} />
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 p-0.5 shadow-sm">
        <button type="button" title="Alejar" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setViewport(zoomAt(vp, size, center, 1 / 1.25))}>
          <Minus size={15} />
        </button>
        <span className="w-12 text-center text-[11.5px] tabular-nums text-slate-600">{Math.round((vp.zoom / 50) * 100)}%</span>
        <button type="button" title="Acercar" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setViewport(zoomAt(vp, size, center, 1.25))}>
          <Plus size={15} />
        </button>
        <div className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" title="Encuadrar todo (F)" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={requestFit}>
          <Maximize size={14} />
        </button>
      </div>
    </>
  );
}
