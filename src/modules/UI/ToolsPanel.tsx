import type { ReactNode } from 'react';
import { Hand, MousePointer2, PenLine, Ruler, Square, Hexagon, ScanSearch, DoorOpen, AppWindow } from 'lucide-react';
import { OPENING_TYPES } from '@/modules/DoorsAndWindows/catalog';
import { ROOM_TYPES } from '@/modules/Rooms/roomTypes';
import { type ToolId, useEditorStore } from '@/store/editorStore';
import { Section, SelectField, Toggle, cx } from './controls';

function ToolButton({ id, icon, label, shortcut }: { id: ToolId; icon: ReactNode; label: string; shortcut?: string }) {
  const active = useEditorStore((s) => s.tool === id);
  const setTool = useEditorStore((s) => s.setTool);
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={() => setTool(id)}
      className={cx(
        'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium transition',
        active ? 'border-accent-300 bg-accent-50 text-accent-800' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50',
      )}
    >
      {icon}
      <span className="leading-none">{label}</span>
      {shortcut && <kbd className="text-[9.5px] font-normal text-slate-400">{shortcut}</kbd>}
    </button>
  );
}

const GRID_OPTIONS = [
  { value: '0.05', label: '5 cm' },
  { value: '0.1', label: '10 cm' },
  { value: '0.25', label: '25 cm' },
  { value: '0.5', label: '50 cm' },
  { value: '1', label: '1 m' },
];

export function ToolsPanel() {
  const { roomType, setRoomType, openingKind, setOpeningKind, tool, createWallsWithRoom, setCreateWallsWithRoom } = useEditorStore();
  const { gridSize, setGridSize, snapToGrid, setSnapToGrid, snapToObjects, setSnapToObjects, plan, setPlan } = useEditorStore();
  const roomTool = tool === 'room-rect' || tool === 'room-poly' || tool === 'room-detect';
  return (
    <div>
      <Section title="Dibujo">
        <div className="grid grid-cols-4 gap-1">
          <ToolButton id="select" icon={<MousePointer2 size={18} />} label="Selec." shortcut="V" />
          <ToolButton id="pan" icon={<Hand size={18} />} label="Mover" shortcut="Esp" />
          <ToolButton id="wall" icon={<PenLine size={18} />} label="Muro" shortcut="W" />
          <ToolButton id="measure" icon={<Ruler size={18} />} label="Medir" shortcut="M" />
        </div>
      </Section>
      <Section title="Habitaciones">
        <div className="grid grid-cols-3 gap-1">
          <ToolButton id="room-rect" icon={<Square size={18} />} label="Rectángulo" shortcut="H" />
          <ToolButton id="room-poly" icon={<Hexagon size={18} />} label="Polígono" shortcut="Y" />
          <ToolButton id="room-detect" icon={<ScanSearch size={18} />} label="Detectar" shortcut="U" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {ROOM_TYPES.map((r) => (
            <button
              key={r.type}
              type="button"
              onClick={() => {
                setRoomType(r.type);
                if (!roomTool) useEditorStore.getState().setTool('room-rect');
              }}
              className={cx(
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[12px] transition',
                roomType === r.type ? 'border-accent-300 bg-accent-50 font-medium text-accent-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              <span className="h-3 w-3 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: r.color }} />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </div>
        <Toggle checked={createWallsWithRoom} onChange={setCreateWallsWithRoom} label="Levantar muros automáticamente" />
      </Section>
      <Section title="Puertas y ventanas">
        <div className="grid grid-cols-2 gap-1">
          {OPENING_TYPES.map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => setOpeningKind(o.kind)}
              className={cx(
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[12px] transition',
                tool === 'opening' && openingKind === o.kind ? 'border-accent-300 bg-accent-50 font-medium text-accent-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              {o.category === 'puerta' ? <DoorOpen size={14} className="shrink-0" /> : <AppWindow size={14} className="shrink-0" />}
              <span className="leading-tight">{o.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Atajos: <kbd>D</kbd> puerta, <kbd>N</kbd> ventana.
        </p>
      </Section>
      <Section title="Ajuste y visualización" defaultOpen={false}>
        <div className="grid grid-cols-[96px_1fr] items-center gap-2">
          <span className="text-[12px] text-slate-500">Cuadrícula</span>
          <SelectField value={String(gridSize)} options={GRID_OPTIONS} onChange={(v) => setGridSize(parseFloat(v))} />
        </div>
        <div className="space-y-2 pt-1">
          <Toggle checked={snapToGrid} onChange={setSnapToGrid} label="Ajustar a la cuadrícula" />
          <Toggle checked={snapToObjects} onChange={setSnapToObjects} label="Ajustar a muros y vértices" />
          <Toggle checked={plan.grid} onChange={(v) => setPlan({ grid: v })} label="Mostrar cuadrícula" />
          <Toggle checked={plan.wallLengths} onChange={(v) => setPlan({ wallLengths: v })} label="Longitud de muros" />
          <Toggle checked={plan.roomLabels} onChange={(v) => setPlan({ roomLabels: v })} label="Nombres y superficies" />
          <Toggle checked={plan.dimensions} onChange={(v) => setPlan({ dimensions: v })} label="Cotas" />
          <Toggle checked={plan.furniture} onChange={(v) => setPlan({ furniture: v })} label="Muebles" />
          <Toggle checked={plan.lowerLevel} onChange={(v) => setPlan({ lowerLevel: v })} label="Planta inferior de referencia" />
        </div>
      </Section>
    </div>
  );
}
