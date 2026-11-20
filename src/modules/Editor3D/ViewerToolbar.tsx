import type { ReactNode } from 'react';
import { Aperture, Armchair, Building2, Eye, Home, Layers, Scissors, Sparkles, Trees, View } from 'lucide-react';
import { startRender, useRenderStore } from './renderStore';
import { useEditorStore } from '@/store/editorStore';
import { cx } from '@/modules/UI/controls';
import { PresetButtons } from '@/modules/Lighting/LightingPanel';
import { useCompact } from '@/modules/UI/useLayout';

function TB({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cx('flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition', active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100')}
    >
      {children}
    </button>
  );
}

/** Texto de un botón que se oculta en la interfaz compacta. */
const L = ({ children }: { children: ReactNode }) => <span className="max-[900px]:hidden">{children}</span>;

/** Controles rápidos del visor 3D. */
export function ViewerToolbar() {
  const compact = useCompact();
  const view3d = useEditorStore((s) => s.view3d);
  const setView3d = useEditorStore((s) => s.setView3d);
  const requestCamera = useEditorStore((s) => s.requestCamera);
  const rendering = useRenderStore((s) => s.status !== 'off');
  return (
    <>
      <div className={cx('absolute flex items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur', compact ? 'bottom-2 left-2 right-2 thin-scroll' : 'right-3 top-3')}>
        <TB title="Vista exterior" onClick={() => requestCamera('exterior')}>
          <Building2 size={14} /> <L>Exterior</L>
        </TB>
        <TB title="Vista cenital" onClick={() => requestCamera('top')}>
          <View size={14} /> <L>Cenital</L>
        </TB>
        <TB title="Vista interior de la estancia seleccionada (o la mayor)" onClick={() => requestCamera('interior')}>
          <Home size={14} /> <L>Interior</L>
        </TB>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <TB title="Mostrar u ocultar techos" active={view3d.showCeilings} onClick={() => setView3d({ showCeilings: !view3d.showCeilings })}>
          <Eye size={14} /> <L>Techos</L>
        </TB>
        <TB title="Muros cortados a media altura (vista de maqueta)" active={view3d.cutaway} onClick={() => setView3d({ cutaway: !view3d.cutaway })}>
          <Scissors size={14} /> <L>Maqueta</L>
        </TB>
        <TB title="Mostrar solo hasta la planta activa" active={view3d.upToActiveLevel} onClick={() => setView3d({ upToActiveLevel: !view3d.upToActiveLevel })}>
          <Layers size={14} /> <L>Hasta planta</L>
        </TB>
        <TB title="Mostrar muebles" active={view3d.showFurniture} onClick={() => setView3d({ showFurniture: !view3d.showFurniture })}>
          <Armchair size={14} />
        </TB>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <TB
          title="Render realista: luz rebotada, sombras suaves y reflejos (trazado de rayos). Mejora mientras la cámara está quieta."
          active={rendering}
          onClick={() => {
            useEditorStore.getState().clearSelection();
            startRender();
          }}
        >
          <Aperture size={14} /> <L>Render realista</L>
        </TB>
      </div>
      <div className={cx('absolute flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur', compact ? 'right-2 top-2' : 'left-3 top-[58px]')}>
        <TB title="Presentación de estudio (fondo gris, como una maqueta)" active={view3d.style === 'estudio'} onClick={() => setView3d({ style: 'estudio' })}>
          <Sparkles size={14} /> <L>Estudio</L>
        </TB>
        <TB title="Entorno exterior con cielo y jardín" active={view3d.style === 'exterior'} onClick={() => setView3d({ style: 'exterior' })}>
          <Trees size={14} /> <L>Entorno</L>
        </TB>
      </div>
      {!compact && (
        <div className="absolute right-3 top-[58px] w-52 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
          <PresetButtons compact />
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-1/2 max-[900px]:hidden -translate-x-1/2 rounded-full bg-slate-900/75 px-3.5 py-1.5 text-[11.5px] text-white shadow">
        Arrastrar: girar · Clic derecho: desplazar · Rueda: zoom · Clic: seleccionar · Arrastra un mueble seleccionado para moverlo
      </div>
    </>
  );
}
