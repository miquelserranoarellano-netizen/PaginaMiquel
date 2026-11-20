import { Trash2 } from 'lucide-react';
import { formatArea, formatLength } from '@/core/units';
import { polygonArea } from '@/core/geometry';
import { LIMITS } from '@/modules/FloorPlan/defaults';
import { removeLevel, restackLevels } from '@/modules/FloorPlan/levels';
import { summarize } from '@/modules/FloorPlan/queries';
import { getRoomType } from '@/modules/Rooms/roomTypes';
import { MaterialPicker } from '@/modules/Materials/MaterialPicker';
import { LightingPanel } from '@/modules/Lighting/LightingPanel';
import { View3DPanel } from '@/modules/Editor3D/View3DPanel';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { Button, Field, NumberField, Section, Stat, TextField, Toggle } from './controls';
import { toast } from './toast';

export function NoSelectionPanel() {
  const doc = useProjectStore((s) => s.doc);
  const view = useEditorStore((s) => s.view);
  const levelId = useEditorStore((s) => s.activeLevelId);
  const level = doc.levels[levelId];
  const sum = summarize(doc, levelId);
  const total = summarize(doc);
  const rooms = Object.values(doc.rooms)
    .filter((r) => r.levelId === levelId)
    .sort((a, b) => polygonArea(b.points) - polygonArea(a.points));

  return (
    <>
      {view !== '2d' && <View3DPanel />}
      {view !== '2d' && <LightingPanel />}
      <Section title="Superficies">
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5">
          <Stat label="Superficie útil (planta)" value={<span className="font-semibold text-accent-700">{formatArea(sum.usefulArea)}</span>} />
          {sum.outdoorArea > 0 && <Stat label="Exterior (planta)" value={formatArea(sum.outdoorArea)} />}
          {Object.keys(doc.levels).length > 1 && <Stat label="Superficie útil (total)" value={formatArea(total.usefulArea)} />}
          <Stat label="Longitud de muros" value={formatLength(sum.wallLength)} />
        </div>
        {rooms.length > 0 ? (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {rooms.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => useEditorStore.getState().select([{ kind: 'room', id: r.id }])} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12.5px] hover:bg-slate-50">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: r.color }} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="text-[11px] text-slate-400">{getRoomType(r.type).name !== r.name ? getRoomType(r.type).name : ''}</span>
                  <span className="tabular-nums text-slate-700">{formatArea(polygonArea(r.points))}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] leading-relaxed text-slate-500">Aún no hay estancias en esta planta. Dibuja una con la herramienta <b>Habitación</b> o crea muros y usa <b>Detectar</b>.</p>
        )}
      </Section>
      {level && (
        <Section title="Planta" defaultOpen={view === '2d'}>
          <Field label="Nombre">
            <TextField value={level.name} onChange={(v) => projectApi.apply((d) => void (d.levels[levelId].name = v))} />
          </Field>
          <Field label="Cota del suelo">
            <NumberField value={level.elevation} min={-10} max={100} unit="m" length onChange={(v) => projectApi.apply((d) => void (d.levels[levelId].elevation = v))} />
          </Field>
          <Field label="Altura libre" hint="Altura por defecto de los muros de esta planta">
            <NumberField
              value={level.height}
              min={LIMITS.levelHeight.min}
              max={LIMITS.levelHeight.max}
              unit="m"
              length
              onChange={(v) =>
                projectApi.apply((d) => {
                  const old = d.levels[levelId].height;
                  d.levels[levelId].height = v;
                  for (const w of Object.values(d.walls)) if (w.levelId === levelId && Math.abs(w.height - old) < 1e-6) w.height = v;
                  restackLevels(d);
                })
              }
            />
          </Field>
          <Field label="Forjado">
            <NumberField
              value={level.slabThickness}
              min={0.05}
              max={1}
              unit="m"
              length
              onChange={(v) =>
                projectApi.apply((d) => {
                  d.levels[levelId].slabThickness = v;
                  restackLevels(d);
                })
              }
            />
          </Field>
          {Object.keys(doc.levels).length > 1 && (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                if (!window.confirm(`¿Eliminar "${level.name}" y todo su contenido?`)) return;
                let ok = false;
                projectApi.apply((d) => {
                  ok = removeLevel(d, levelId);
                });
                if (ok) {
                  const first = Object.values(projectApi.doc.levels).sort((a, b) => a.order - b.order)[0];
                  useEditorStore.getState().setActiveLevel(first.id);
                  toast.info('Planta eliminada (puedes deshacer con Ctrl+Z)');
                }
              }}
            >
              <Trash2 size={14} /> Eliminar planta
            </Button>
          )}
        </Section>
      )}
      <Section title="Valores por defecto" defaultOpen={false}>
        <Field label="Grosor muro">
          <NumberField value={doc.settings.defaultWallThickness} min={LIMITS.wallThickness.min} max={LIMITS.wallThickness.max} unit="m" length onChange={(v) => projectApi.apply((d) => void (d.settings.defaultWallThickness = v))} />
        </Field>
        <Field label="Altura muro">
          <NumberField value={doc.settings.defaultWallHeight} min={LIMITS.wallHeight.min} max={LIMITS.wallHeight.max} unit="m" length onChange={(v) => projectApi.apply((d) => void (d.settings.defaultWallHeight = v))} />
        </Field>
        <MaterialPicker label="Acabado de muros nuevos" category="pared" value={doc.settings.defaultInterior} onChange={(m) => projectApi.apply((d) => void (d.settings.defaultInterior = m))} />
        <Field label="Terreno">
          <Toggle checked={doc.settings.showGround} onChange={(v) => projectApi.apply((d) => void (d.settings.showGround = v))} label="Mostrar en 3D" />
        </Field>
        {doc.settings.showGround && <MaterialPicker label="Terreno" category="exterior" value={doc.settings.ground} onChange={(m) => projectApi.apply((d) => void (d.settings.ground = m))} />}
      </Section>
    </>
  );
}
