/**
 * Interfaz compacta para móvil: barra inferior con herramientas y paneles
 * deslizables (herramientas, biblioteca y propiedades).
 */
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AppWindow, Armchair, Check, DoorOpen, Hexagon, MousePointer2, PenLine, Ruler, ScanSearch, SlidersHorizontal, Square, Undo2, Wrench, X } from 'lucide-react';
import { LibraryPanel } from '@/modules/Furniture/LibraryPanel';
import { type ToolId, useEditorStore } from '@/store/editorStore';
import { PropertiesPanel } from './PropertiesPanel';
import { ToolsPanel } from './ToolsPanel';
import { cx } from './controls';

/** Envía una tecla a la herramienta activa (los botones táctiles reutilizan los atajos). */
function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code: key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key, bubbles: true }));
}

function BarButton({ active, onClick, label, children, badge }: { active?: boolean; onClick: () => void; label: string; children: ReactNode; badge?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx('relative flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] font-medium', active ? 'bg-accent-50 text-accent-800' : 'text-slate-600 active:bg-slate-100')}
    >
      {children}
      <span className="leading-none">{label}</span>
      {badge && <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-select" />}
    </button>
  );
}

function ContextRow() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const [dims, setDims] = useState('');
  const pill = 'h-9 shrink-0 rounded-lg px-3 text-[12.5px] font-medium';
  if (tool === 'select' || tool === 'pan') return null;
  const done = (
    <button type="button" className={cx(pill, 'bg-slate-800 text-white')} onClick={() => setTool('select')}>
      Listo
    </button>
  );
  let content: ReactNode;
  if (tool === 'wall')
    content = (
      <>
        <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500">Toca para encadenar muros o arrastra el dedo</span>
        <button type="button" className={cx(pill, 'border border-slate-200 bg-white text-slate-700')} onClick={() => press('Escape')}>
          Terminar tramo
        </button>
        {done}
      </>
    );
  else if (tool === 'room-rect')
    content = (
      <>
        <form
          className="flex min-w-0 flex-1 items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const v = dims.trim();
            if (!v) return;
            for (const ch of v) press(ch);
            press('Enter');
            setDims('');
            (document.activeElement as HTMLElement | null)?.blur();
          }}
        >
          <input
            id="hd-mobile-dims"
            value={dims}
            onChange={(e) => setDims(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Medidas: 4x3"
            inputMode="decimal"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-[16px]"
          />
          <button type="submit" className={cx(pill, 'bg-accent-600 text-white')} title="Crear con estas medidas desde la esquina marcada">
            <Check size={16} />
          </button>
        </form>
        {done}
      </>
    );
  else if (tool === 'room-poly')
    content = (
      <>
        <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500">Toca cada esquina</span>
        <button type="button" className={cx(pill, 'border border-slate-200 bg-white text-slate-700')} onClick={() => press('Backspace')}>
          <Undo2 size={15} />
        </button>
        <button type="button" className={cx(pill, 'bg-accent-600 text-white')} onClick={() => press('Enter')}>
          Cerrar
        </button>
        {done}
      </>
    );
  else
    content = (
      <>
        <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500">
          {tool === 'opening' ? 'Toca un muro para colocarla' : tool === 'measure' ? 'Toca dos puntos para medir' : tool === 'room-detect' ? 'Toca dentro de un recinto cerrado' : tool === 'furniture' ? 'Toca el plano para colocar el mueble' : ''}
        </span>
        {done}
      </>
    );
  return <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">{content}</div>;
}

export function MobileBar() {
  const view = useEditorStore((s) => s.view);
  const tool = useEditorStore((s) => s.tool);
  const openingKind = useEditorStore((s) => s.openingKind);
  const setTool = useEditorStore((s) => s.setTool);
  const setOpeningKind = useEditorStore((s) => s.setOpeningKind);
  const panel = useEditorStore((s) => s.mobilePanel);
  const setPanel = useEditorStore((s) => s.setMobilePanel);
  const hasSelection = useEditorStore((s) => s.selection.length > 0);
  const toolBtn = (id: ToolId, label: string, icon: ReactNode) => (
    <BarButton key={id} label={label} active={tool === id} onClick={() => setTool(id)}>
      {icon}
    </BarButton>
  );
  return (
    <nav className="shrink-0 border-t border-slate-200 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {view === '2d' && <ContextRow />}
      <div className="flex items-center gap-0.5 overflow-x-auto px-1.5 py-1 thin-scroll">
        {view === '2d' && (
          <>
            {toolBtn('select', 'Mover', <MousePointer2 size={19} />)}
            {toolBtn('wall', 'Muro', <PenLine size={19} />)}
            {toolBtn('room-rect', 'Estancia', <Square size={19} />)}
            {toolBtn('room-poly', 'Polígono', <Hexagon size={19} />)}
            {toolBtn('room-detect', 'Detectar', <ScanSearch size={19} />)}
            <BarButton label="Puerta" active={tool === 'opening' && openingKind === 'door'} onClick={() => setOpeningKind('door')}>
              <DoorOpen size={19} />
            </BarButton>
            <BarButton label="Ventana" active={tool === 'opening' && openingKind === 'window'} onClick={() => setOpeningKind('window')}>
              <AppWindow size={19} />
            </BarButton>
            {toolBtn('measure', 'Medir', <Ruler size={19} />)}
            <div className="mx-1 h-8 w-px shrink-0 bg-slate-200" />
            <BarButton label="Más" active={panel === 'tools'} onClick={() => setPanel(panel === 'tools' ? 'none' : 'tools')}>
              <Wrench size={19} />
            </BarButton>
          </>
        )}
        <BarButton label="Muebles" active={panel === 'library'} onClick={() => setPanel(panel === 'library' ? 'none' : 'library')}>
          <Armchair size={19} />
        </BarButton>
        <BarButton label={view === '2d' ? 'Propiedades' : 'Ajustes'} active={panel === 'props'} badge={hasSelection} onClick={() => setPanel(panel === 'props' ? 'none' : 'props')}>
          <SlidersHorizontal size={19} />
        </BarButton>
      </div>
    </nav>
  );
}

/** Paneles deslizables: herramientas y biblioteca a la izquierda, propiedades desde abajo. */
export function MobileDrawers() {
  const panel = useEditorStore((s) => s.mobilePanel);
  const setPanel = useEditorStore((s) => s.setMobilePanel);
  const tool = useEditorStore((s) => s.tool);
  const placing = useEditorStore((s) => s.placingCatalogId);
  const view = useEditorStore((s) => s.view);
  const selection = useEditorStore((s) => s.selection);
  const prev = useRef({ tool, placing, view });

  // Al elegir herramienta o mueble se cierra el panel para poder tocar el plano.
  useEffect(() => {
    const p = prev.current;
    if ((tool !== p.tool || placing !== p.placing) && (panel === 'tools' || panel === 'library')) setPanel('none');
    if (view !== p.view) setPanel('none');
    prev.current = { tool, placing, view };
  }, [tool, placing, view, panel, setPanel]);

  if (panel === 'none') return null;
  const close = () => setPanel('none');
  if (panel === 'props') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col justify-end bg-slate-900/25" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="flex max-h-[62%] flex-col rounded-t-2xl bg-white shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-[13px] font-semibold text-slate-800">{selection.length ? 'Propiedades' : 'Proyecto y vista'}</span>
            <button type="button" aria-label="Cerrar" onClick={close} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain thin-scroll">
            <PropertiesPanel />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/25" onClick={(e) => e.target === e.currentTarget && close()}>
      <aside className="flex h-full w-[86%] max-w-[340px] flex-col bg-white shadow-2xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center gap-1 border-b border-slate-200 p-1.5">
          {(
            [
              ['tools', 'Herramientas'],
              ['library', 'Muebles'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={id === 'tools' && view !== '2d'}
              onClick={() => setPanel(id)}
              className={cx('flex-1 rounded-md py-2 text-[13px] font-medium disabled:opacity-40', panel === id ? 'bg-slate-100 text-slate-900' : 'text-slate-500')}
            >
              {label}
            </button>
          ))}
          <button type="button" aria-label="Cerrar" onClick={close} className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain thin-scroll">{panel === 'tools' ? <ToolsPanel /> : <LibraryPanel />}</div>
      </aside>
    </div>
  );
}
