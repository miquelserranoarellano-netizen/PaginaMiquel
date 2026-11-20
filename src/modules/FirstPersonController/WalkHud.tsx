import { Box, Footprints, MousePointer2, Plane } from 'lucide-react';
import { sortedLevels } from '@/modules/FloorPlan/queries';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { cx } from '@/modules/UI/controls';
import { Minimap } from './Minimap';
import { useWalkStore } from './walkStore';
import { PRESETS, applyPreset } from '@/modules/Lighting/LightingPanel';
import { useCompact, useTouch } from '@/modules/UI/useLayout';
import { Joystick } from './Joystick';

function Key({ children }: { children: string }) {
  return <kbd className="inline-flex min-w-[22px] items-center justify-center rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold">{children}</kbd>;
}

export function WalkHud() {
  const doc = useProjectStore((s) => s.doc);
  const levelId = useEditorStore((s) => s.activeLevelId);
  const setActiveLevel = useEditorStore((s) => s.setActiveLevel);
  const free = useEditorStore((s) => s.walkFreeCamera);
  const setFree = useEditorStore((s) => s.setWalkFreeCamera);
  const setView = useEditorStore((s) => s.setView);
  const { locked, roomName, interacted } = useWalkStore();
  const levels = sortedLevels(doc);
  const touch = useTouch();
  const compact = useCompact();
  return (
    <>
      {/* Minimapa */}
      <div className="absolute left-3 top-3 overflow-hidden rounded-xl border border-white/20 bg-white/90 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-1.5 text-[11.5px]">
          <span className="font-semibold text-slate-800">{doc.levels[levelId]?.name}</span>
          <span className="truncate text-slate-500">{roomName ?? 'Exterior'}</span>
        </div>
        <Minimap doc={doc} levelId={levelId} size={compact ? 130 : 210} />
      </div>

      {/* Mira */}
      {locked && <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.45)]" />}

      {touch && <Joystick free={free} />}
      {touch && !interacted && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-6">
          <div className="max-w-xs rounded-2xl bg-slate-900/80 px-5 py-4 text-center text-[13px] text-white shadow-2xl backdrop-blur">
            <b className="block text-[15px]">Recorre la casa</b>
            Mueve el joystick para caminar (al fondo, corre) y arrastra el dedo por la pantalla para mirar. Las puertas se abren solas.
          </div>
        </div>
      )}

      {/* Instrucciones */}
      {!touch && !locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-md rounded-2xl bg-slate-900/80 px-7 py-6 text-center text-white shadow-2xl backdrop-blur">
            <MousePointer2 className="mx-auto mb-2" size={26} />
            <h3 className="text-[16px] font-semibold">Haz clic para empezar el recorrido</h3>
            <p className="mt-1 text-[12.5px] text-white/70">También puedes mirar arrastrando con el ratón.</p>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-left text-[12px]">
              <span className="flex items-center gap-1">
                <Key>W</Key>
                <Key>A</Key>
                <Key>S</Key>
                <Key>D</Key> Moverse
              </span>
              <span>Ratón · Mirar alrededor</span>
              <span className="flex items-center gap-1">
                <Key>Mayús</Key> Correr
              </span>
              <span className="flex items-center gap-1">
                <Key>F</Key> Cámara libre
              </span>
              <span className="flex items-center gap-1">
                <Key>E</Key>
                <Key>Q</Key> Subir / bajar (libre)
              </span>
              <span className="flex items-center gap-1">
                <Key>Esc</Key> Soltar el ratón
              </span>
            </div>
            <p className="mt-4 text-[11.5px] text-white/60">Las puertas se abren solas al acercarte. Haz clic en el minimapa para ir a otro punto.</p>
          </div>
        </div>
      )}

      {/* Controles inferiores */}
      <div className="absolute bottom-3 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg thin-scroll" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button type="button" onClick={() => setFree(false)} className={cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium', !free ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100')}>
          <Footprints size={14} /> {!compact && 'Caminar'}
        </button>
        <button type="button" onClick={() => setFree(true)} className={cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium', free ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100')}>
          <Plane size={14} /> {compact ? 'Libre' : 'Cámara libre'}
        </button>
        {levels.length > 1 && (
          <>
            <div className="h-5 w-px bg-slate-200" />
            {levels.map((l) => (
              <button key={l.id} type="button" onClick={() => setActiveLevel(l.id)} className={cx('rounded-lg px-2.5 py-1.5 text-[12px]', l.id === levelId ? 'bg-accent-50 font-semibold text-accent-800' : 'text-slate-600 hover:bg-slate-100')}>
                {l.name}
              </button>
            ))}
          </>
        )}
        <div className="h-5 w-px bg-slate-200" />
        {PRESETS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" title={label} onClick={() => applyPreset(id)} className={cx('flex h-8 w-8 items-center justify-center rounded-lg', doc.lighting.preset === id ? 'bg-accent-50 text-accent-800' : 'text-slate-500 hover:bg-slate-100')}>
            <Icon size={15} />
          </button>
        ))}
        <div className="h-5 w-px bg-slate-200" />
        <button type="button" onClick={() => setView('3d')} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-100">
          <Box size={14} /> {compact ? '3D' : 'Salir al modelo 3D'}
        </button>
      </div>
    </>
  );
}
