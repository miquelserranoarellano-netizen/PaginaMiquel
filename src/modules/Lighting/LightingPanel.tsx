import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import type { LightingPreset, LightingSettings } from '@/modules/FloorPlan/types';
import { LIGHTING_PRESETS } from '@/modules/FloorPlan/defaults';
import { Field, Section, Slider, Toggle, cx } from '@/modules/UI/controls';
import { projectApi, useProjectStore } from '@/store/projectStore';

export const PRESETS: { id: LightingPreset; label: string; icon: typeof Sun }[] = [
  { id: 'manana', label: 'Mañana', icon: Sunrise },
  { id: 'mediodia', label: 'Mediodía', icon: Sun },
  { id: 'atardecer', label: 'Atardecer', icon: Sunset },
  { id: 'noche', label: 'Noche', icon: Moon },
];

export function applyPreset(id: LightingPreset) {
  projectApi.apply((d) => {
    d.lighting = { ...d.lighting, ...LIGHTING_PRESETS[id], preset: id };
  });
}

/** Cambio de iluminación: durante un arrastre de deslizador se agrupa en un solo paso de historial. */
function setLighting(patch: Partial<LightingSettings>) {
  const recipe = (d: { lighting: LightingSettings }) => {
    Object.assign(d.lighting, patch);
  };
  if (useProjectStore.getState().gestureBase) projectApi.updateGesture(recipe);
  else projectApi.apply(recipe);
}

function LiveSlider({ value, min, max, step, format, onChange }: { value: number; min: number; max: number; step: number; format?: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div onPointerDown={() => projectApi.beginGesture()} onPointerUp={() => projectApi.endGesture()} onPointerCancel={() => projectApi.endGesture()}>
      <Slider value={value} min={min} max={max} step={step} format={format} onChange={onChange} />
    </div>
  );
}

export function PresetButtons({ compact }: { compact?: boolean }) {
  const preset = useProjectStore((s) => s.doc.lighting.preset);
  return (
    <div className={cx('grid gap-1', compact ? 'grid-cols-4' : 'grid-cols-4')}>
      {PRESETS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => applyPreset(id)}
          className={cx(
            'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[11px] font-medium transition',
            preset === id ? 'border-accent-300 bg-accent-50 text-accent-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
          )}
        >
          <Icon size={16} />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}

export function LightingPanel() {
  const l = useProjectStore((s) => s.doc.lighting);
  const deg = (v: number) => `${Math.round(v)}°`;
  return (
    <Section title="Iluminación">
      <PresetButtons />
      <div className="space-y-2.5 pt-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Luz natural</div>
        <Field label="Intensidad">
          <LiveSlider value={l.sunIntensity} min={0} max={6} step={0.05} onChange={(v) => setLighting({ sunIntensity: v })} />
        </Field>
        <Field label="Orientación" hint="0° norte · 90° este · 180° sur · 270° oeste">
          <LiveSlider value={l.sunAzimuth} min={0} max={360} step={1} format={deg} onChange={(v) => setLighting({ sunAzimuth: v })} />
        </Field>
        <Field label="Altura del sol">
          <LiveSlider value={l.sunElevation} min={2} max={90} step={1} format={deg} onChange={(v) => setLighting({ sunElevation: v })} />
        </Field>
        <Field label="Color del sol">
          <input type="color" className="h-7 w-full cursor-pointer rounded-md border border-slate-200 bg-white" value={l.sunColor} onChange={(e) => setLighting({ sunColor: e.target.value })} />
        </Field>
        <Field label="Luz ambiente">
          <LiveSlider value={l.ambientIntensity} min={0} max={2} step={0.02} onChange={(v) => setLighting({ ambientIntensity: v })} />
        </Field>
        <Field label="Sombras">
          <Toggle checked={l.shadows} onChange={(v) => setLighting({ shadows: v })} />
        </Field>
        <div className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Luz interior</div>
        <Field label="Encendida">
          <Toggle checked={l.interiorOn} onChange={(v) => setLighting({ interiorOn: v })} label={l.interiorOn ? 'Sí' : 'No'} />
        </Field>
        <Field label="Intensidad">
          <LiveSlider value={l.interiorIntensity} min={0} max={3} step={0.05} onChange={(v) => setLighting({ interiorIntensity: v })} />
        </Field>
        <Field label="Exposición">
          <LiveSlider value={l.exposure} min={0.3} max={2.5} step={0.05} onChange={(v) => setLighting({ exposure: v })} />
        </Field>
      </div>
    </Section>
  );
}
