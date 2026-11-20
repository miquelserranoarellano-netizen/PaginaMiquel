import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { addLevel } from '@/modules/FloorPlan/levels';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { cx } from './controls';

/** Selector de plantas flotante sobre el lienzo. */
export function LevelBar() {
  const levels = useProjectStore((s) => s.doc.levels);
  const active = useEditorStore((s) => s.activeLevelId);
  const setActive = useEditorStore((s) => s.setActiveLevel);
  const [menu, setMenu] = useState(false);
  const list = Object.values(levels).sort((a, b) => a.order - b.order);

  const add = (copy: boolean) => {
    let id = '';
    projectApi.apply((d) => {
      id = addLevel(d, copy ? active : undefined);
    });
    setActive(id);
    setMenu(false);
  };

  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <Layers size={14} className="ml-1.5 mr-0.5 text-slate-400" />
      {[...list].reverse().map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setActive(l.id)}
          className={cx('rounded-md px-2.5 py-1 text-[12px] font-medium transition', l.id === active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100')}
        >
          {l.name}
        </button>
      ))}
      <div className="relative">
        <button type="button" title="Añadir planta" onClick={() => setMenu(!menu)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <Plus size={15} />
        </button>
        {menu && (
          <div className="absolute left-0 top-9 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button type="button" className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-slate-50" onClick={() => add(false)}>
              Planta vacía
              <span className="block text-[11px] text-slate-500">Empieza desde cero encima de la última</span>
            </button>
            <button type="button" className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-slate-50" onClick={() => add(true)}>
              Copiar muros de esta planta
              <span className="block text-[11px] text-slate-500">Útil para mantener el perímetro</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
