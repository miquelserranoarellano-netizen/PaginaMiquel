import type { ReactNode } from 'react';
import { Armchair, Building2, Eye, Home, Layers, Scissors, View } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cx } from '@/modules/UI/controls';

function TB({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition', active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100')}
    >
      {children}
    </button>
  );
}

/** Controles rápidos del visor 3D. */
export function ViewerToolbar() {
  const view3d = useEditorStore((s) => s.view3d);
  const setView3d = useEditorStore((s) => s.setView3d);
  const requestCamera = useEditorStore((s) => s.requestCamera);
  return (
    <>
      <div className="absolute right-3 top-3 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <TB title="Vista exterior" onClick={() => requestCamera('exterior')}>
          <Building2 size={14} /> Exterior
        </TB>
        <TB title="Vista cenital" onClick={() => requestCamera('top')}>
          <View size={14} /> Cenital
        </TB>
        <TB title="Vista interior de la estancia seleccionada (o la mayor)" onClick={() => requestCamera('interior')}>
          <Home size={14} /> Interior
        </TB>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <TB title="Mostrar u ocultar techos" active={view3d.showCeilings} onClick={() => setView3d({ showCeilings: !view3d.showCeilings })}>
          <Eye size={14} /> Techos
        </TB>
        <TB title="Muros cortados a media altura (vista de maqueta)" active={view3d.cutaway} onClick={() => setView3d({ cutaway: !view3d.cutaway })}>
          <Scissors size={14} /> Maqueta
        </TB>
        <TB title="Mostrar solo hasta la planta activa" active={view3d.upToActiveLevel} onClick={() => setView3d({ upToActiveLevel: !view3d.upToActiveLevel })}>
          <Layers size={14} /> Hasta planta
        </TB>
        <TB title="Mostrar muebles" active={view3d.showFurniture} onClick={() => setView3d({ showFurniture: !view3d.showFurniture })}>
          <Armchair size={14} />
        </TB>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-3.5 py-1.5 text-[11.5px] text-white shadow">
        Arrastrar: girar · Clic derecho: desplazar · Rueda: zoom · Clic: seleccionar · Arrastra un mueble seleccionado para moverlo
      </div>
    </>
  );
}
