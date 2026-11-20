import { type ReactNode, useEffect, useState } from 'react';
import { Box, ChevronLeft, Footprints, Map as MapIcon, Redo2, Undo2 } from 'lucide-react';
import { useEditorStore, type ViewMode } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { cx } from './controls';
import { SaveIndicator, SaveButton } from '@/modules/ProjectManager/SaveIndicator';
import { ExportMenu } from '@/modules/ProjectManager/ExportMenu';
import { closeProject } from '@/modules/ProjectManager/persistence';

function ViewTab({ value, icon, label, shortcut, compact }: { value: ViewMode; icon: ReactNode; label: string; shortcut: string; compact?: boolean }) {
  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  return (
    <button
      type="button"
      title={`${label} (${shortcut})`}
      aria-label={label}
      onClick={() => setView(value)}
      className={cx(
        'flex items-center gap-1.5 rounded-md py-1.5 text-[12.5px] font-medium transition',
        compact ? 'px-2.5' : 'px-3',
        view === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
      )}
    >
      {icon}
      {!compact && label}
    </button>
  );
}

function ProjectName({ compact }: { compact?: boolean }) {
  const name = useProjectStore((s) => s.doc.name);
  const [text, setText] = useState(name);
  useEffect(() => setText(name), [name]);
  return (
    <input
      id="hd-project-name"
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
      className={cx(
        compact ? 'w-full' : 'w-48',
        'min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-[13.5px] font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-accent-500 focus:bg-white',
      )}
    />
  );
}

export function TopBar({ compact }: { compact?: boolean }) {
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const iconBtn = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30';
  return (
    <header className={cx('relative z-20 grid h-12 shrink-0 items-center border-b border-slate-200 bg-white', compact ? 'grid-cols-[1fr_auto_auto] gap-1 px-1.5' : 'grid-cols-[1fr_auto_1fr] gap-3 px-3')}>
      <div className="flex min-w-0 items-center gap-2">
        {!compact && (
          <div className="flex shrink-0 items-center gap-2 pr-1">
            <img src="./icon.svg" alt="" className="h-7 w-7" />
            <span className="hidden text-[13px] font-semibold tracking-tight text-slate-900 xl:inline">HomeDesign Studio</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => void closeProject()}
          aria-label="Volver a la lista de proyectos"
          className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[12.5px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          title="Volver a la lista de proyectos"
        >
          <ChevronLeft size={compact ? 18 : 15} /> {!compact && 'Proyectos'}
        </button>
        {!compact && <div className="h-6 w-px bg-slate-200" />}
        <ProjectName compact={compact} />
        {!compact && <SaveIndicator />}
      </div>

      <div className="flex rounded-lg bg-slate-100 p-0.5">
        <ViewTab value="2d" icon={<MapIcon size={15} />} label="Plano 2D" shortcut="1" compact={compact} />
        <ViewTab value="3d" icon={<Box size={15} />} label="Modelo 3D" shortcut="2" compact={compact} />
        <ViewTab value="walk" icon={<Footprints size={15} />} label="Recorrido" shortcut="3" compact={compact} />
      </div>

      <div className="flex items-center justify-end gap-0.5">
        <button type="button" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" disabled={!canUndo} onClick={undo} className={iconBtn}>
          <Undo2 size={16} />
        </button>
        {!compact && (
          <button type="button" title="Rehacer (Ctrl+Y)" aria-label="Rehacer" disabled={!canRedo} onClick={redo} className={iconBtn}>
            <Redo2 size={16} />
          </button>
        )}
        {!compact && <div className="mx-1 h-6 w-px bg-slate-200" />}
        {!compact && <SaveButton />}
        <ExportMenu compact={compact} />
      </div>
    </header>
  );
}
