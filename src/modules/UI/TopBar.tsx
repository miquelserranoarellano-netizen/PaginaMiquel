import { type ReactNode, useEffect, useState } from 'react';
import { Box, ChevronLeft, Footprints, Map as MapIcon, Redo2, Undo2 } from 'lucide-react';
import { useEditorStore, type ViewMode } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { cx } from './controls';
import { SaveIndicator, SaveButton } from '@/modules/ProjectManager/SaveIndicator';
import { ExportMenu } from '@/modules/ProjectManager/ExportMenu';

function ViewTab({ value, icon, label, shortcut }: { value: ViewMode; icon: ReactNode; label: string; shortcut: string }) {
  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  return (
    <button
      type="button"
      title={`${label} (${shortcut})`}
      onClick={() => setView(value)}
      className={cx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition', view === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
    >
      {icon}
      {label}
    </button>
  );
}

function ProjectName() {
  const name = useProjectStore((s) => s.doc.name);
  const [text, setText] = useState(name);
  useEffect(() => setText(name), [name]);
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = text.trim();
        if (v && v !== name) projectApi.apply((d) => void (d.name = v));
        else setText(name);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setText(name);
          e.currentTarget.blur();
        }
      }}
      title="Nombre del proyecto"
      className="w-48 min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-[13.5px] font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-accent-500 focus:bg-white"
    />
  );
}

export function TopBar() {
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const setScreen = useEditorStore((s) => s.setScreen);
  return (
    <header className="relative z-20 grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-200 bg-white px-3">
      <div className="flex min-w-0 items-center gap-2">
      <div className="flex shrink-0 items-center gap-2 pr-1">
        <img src="./icon.svg" alt="" className="h-7 w-7" />
        <span className="hidden text-[13px] font-semibold tracking-tight text-slate-900 xl:inline">HomeDesign Studio</span>
      </div>
      <button type="button" onClick={() => setScreen('projects')} className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[12.5px] text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Volver a la lista de proyectos">
        <ChevronLeft size={15} /> Proyectos
      </button>
      <div className="h-6 w-px bg-slate-200" />
      <ProjectName />
      <SaveIndicator />
      </div>

      <div className="flex rounded-lg bg-slate-100 p-0.5">
        <ViewTab value="2d" icon={<MapIcon size={15} />} label="Plano 2D" shortcut="1" />
        <ViewTab value="3d" icon={<Box size={15} />} label="Modelo 3D" shortcut="2" />
        <ViewTab value="walk" icon={<Footprints size={15} />} label="Recorrido" shortcut="3" />
      </div>

      <div className="flex items-center justify-end gap-1">
        <button type="button" title="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={undo} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30">
          <Undo2 size={16} />
        </button>
        <button type="button" title="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={redo} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30">
          <Redo2 size={16} />
        </button>
        <div className="mx-1 h-6 w-px bg-slate-200" />
        <SaveButton />
        <ExportMenu />
      </div>
    </header>
  );
}
