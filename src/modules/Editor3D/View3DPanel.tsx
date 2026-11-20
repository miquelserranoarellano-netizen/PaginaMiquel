import { useEditorStore } from '@/store/editorStore';
import { Button, Section, Segmented, Toggle } from '@/modules/UI/controls';

/** Opciones de visualización 3D en el panel derecho. */
export function View3DPanel() {
  const view = useEditorStore((s) => s.view);
  const view3d = useEditorStore((s) => s.view3d);
  const setView3d = useEditorStore((s) => s.setView3d);
  const requestCamera = useEditorStore((s) => s.requestCamera);
  if (view !== '3d') return null;
  return (
    <Section title="Vista 3D">
      <div className="grid grid-cols-3 gap-1.5">
        <Button className="px-1" onClick={() => requestCamera('exterior')}>
          Exterior
        </Button>
        <Button className="px-1" onClick={() => requestCamera('top')}>
          Cenital
        </Button>
        <Button className="px-1" onClick={() => requestCamera('interior')}>
          Interior
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-slate-500">Estilo</span>
        <Segmented
          value={view3d.style}
          onChange={(v) => setView3d({ style: v })}
          options={[
            { value: 'estudio', label: 'Estudio', title: 'Fondo gris de presentación, como una maqueta' },
            { value: 'exterior', label: 'Entorno', title: 'Cielo, terreno y jardín' },
          ]}
        />
      </div>
      <div className="space-y-2 pt-1">
        <Toggle checked={view3d.quality === 'alta'} onChange={(v) => setView3d({ quality: v ? 'alta' : 'normal' })} label="Calidad alta (oclusión ambiental)" />
        <Toggle checked={view3d.showCeilings} onChange={(v) => setView3d({ showCeilings: v })} label="Mostrar techos" />
        <Toggle checked={view3d.cutaway} onChange={(v) => setView3d({ cutaway: v })} label="Muros cortados (maqueta)" />
        <Toggle checked={view3d.upToActiveLevel} onChange={(v) => setView3d({ upToActiveLevel: v })} label="Solo hasta la planta activa" />
        <Toggle checked={view3d.showFurniture} onChange={(v) => setView3d({ showFurniture: v })} label="Mostrar muebles" />
      </div>
      <p className="text-[11.5px] leading-snug text-slate-500">Haz clic en un muro, suelo, puerta o mueble para editar su altura, grosor, materiales y colores.</p>
    </Section>
  );
}
