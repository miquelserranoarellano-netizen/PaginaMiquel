import { distance, polygonArea } from '@/core/geometry';
import { formatArea, formatLength, formatNumber } from '@/core/units';
import { summarize } from '@/modules/FloorPlan/queries';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { useSaveStore } from '@/modules/ProjectManager/saveStore';

function SelectionInfo() {
  const doc = useProjectStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  if (selection.length === 0) return null;
  if (selection.length > 1) return <span>{selection.length} elementos seleccionados</span>;
  const r = selection[0];
  switch (r.kind) {
    case 'wall': {
      const w = doc.walls[r.id];
      return w ? <span>Muro · {formatLength(distance(w.start, w.end))} · grosor {formatLength(w.thickness)} · alto {formatLength(w.height)}</span> : null;
    }
    case 'room': {
      const room = doc.rooms[r.id];
      return room ? <span>{room.name} · {formatArea(polygonArea(room.points))}</span> : null;
    }
    case 'opening': {
      const o = doc.openings[r.id];
      return o ? <span>Hueco · {formatLength(o.width)} × {formatLength(o.height)}</span> : null;
    }
    case 'furniture': {
      const f = doc.furniture[r.id];
      return f ? <span>{f.name} · {formatNumber(f.width)} × {formatNumber(f.depth)} × {formatNumber(f.height)} m · {formatNumber(f.rotation, 0)}°</span> : null;
    }
    case 'dimension': {
      const d = doc.dimensions[r.id];
      return d ? <span>Cota · {formatLength(distance(d.start, d.end))}</span> : null;
    }
  }
}

export function StatusBar() {
  const cursor = useEditorStore((s) => s.cursor);
  const live = useEditorStore((s) => s.liveMeasure);
  const view = useEditorStore((s) => s.view);
  const zoom = useEditorStore((s) => s.viewport.zoom);
  const levelId = useEditorStore((s) => s.activeLevelId);
  const doc = useProjectStore((s) => s.doc);
  const saveStatus = useSaveStore((s) => s.status);
  const lastSavedAt = useSaveStore((s) => s.lastSavedAt);
  const sum = summarize(doc, levelId);
  const level = doc.levels[levelId];
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-slate-200 bg-white px-3 text-[11.5px] text-slate-500">
      {view === '2d' && (
        <span className="w-40 tabular-nums">{cursor ? `X ${formatNumber(cursor.x)}  Y ${formatNumber(cursor.y)} m` : '—'}</span>
      )}
      {live ? <span className="font-medium text-accent-700">{live}</span> : <SelectionInfo />}
      <div className="ml-auto flex items-center gap-4">
        {level && <span>{level.name}</span>}
        <span>
          {sum.rooms} estancias · <b className="font-medium text-slate-700">{formatArea(sum.usefulArea)}</b> útiles
        </span>
        <span>{sum.walls} muros · {sum.openings} huecos · {sum.furniture} objetos</span>
        {view === '2d' && <span className="tabular-nums">Zoom {Math.round((zoom / 50) * 100)}%</span>}
        <span className={saveStatus === 'error' ? 'text-red-600' : ''}>
          {saveStatus === 'saved' && lastSavedAt ? `Guardado ${new Date(lastSavedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'dirty' ? 'Pendiente de guardar' : saveStatus === 'error' ? 'Error al guardar' : ''}
        </span>
      </div>
    </footer>
  );
}
