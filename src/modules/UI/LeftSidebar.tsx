import { Armchair, PencilRuler } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { LibraryPanel } from '@/modules/Furniture/LibraryPanel';
import { ToolsPanel } from './ToolsPanel';
import { cx } from './controls';

export function LeftSidebar() {
  const tab = useEditorStore((s) => s.leftTab);
  const setTab = useEditorStore((s) => s.setLeftTab);
  const view = useEditorStore((s) => s.view);
  // Las herramientas de dibujo solo tienen sentido en el plano 2D.
  const effective = view === '2d' ? tab : 'library';
  return (
    <aside className="flex w-[268px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex border-b border-slate-200 p-1.5">
        {(
          [
            ['tools', 'Herramientas', <PencilRuler key="t" size={14} />],
            ['library', 'Biblioteca', <Armchair key="l" size={14} />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            disabled={id === 'tools' && view !== '2d'}
            onClick={() => setTab(id)}
            title={id === 'tools' && view !== '2d' ? 'Disponible en el plano 2D' : undefined}
            className={cx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12.5px] font-medium transition disabled:opacity-40',
              effective === id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">{effective === 'tools' ? <ToolsPanel /> : <LibraryPanel />}</div>
    </aside>
  );
}
