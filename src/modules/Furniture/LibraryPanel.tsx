import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { DRAG_MIME } from '@/modules/Editor2D/PlanCanvas';
import { cx } from '@/modules/UI/controls';
import { useEditorStore } from '@/store/editorStore';
import { CATALOG, CATEGORY_ORDER } from './catalog';
import { CATEGORY_LABELS, type CatalogItem, type FurnitureCategory } from './types';
import { FurnitureSymbol } from './Furniture2D';
import { addFurnitureAtViewCenter } from './placementActions';
import { ImportModelButton } from './ImportModelButton';
import { useThumbnail } from './thumbnails';
import { ImportedModels } from './ImportedModels';

function Thumb({ item }: { item: CatalogItem }) {
  const url = useThumbnail(item);
  if (url) return <img src={url} alt="" className="h-14 w-full object-contain" draggable={false} />;
  return <PlanThumb item={item} />;
}

function PlanThumb({ item }: { item: CatalogItem }) {
  const pad = Math.max(item.w, item.d) * 0.12;
  const vb = `${-item.w / 2 - pad} ${-item.d / 2 - pad} ${item.w + pad * 2} ${item.d + pad * 2}`;
  return (
    <svg viewBox={vb} className="h-14 w-full p-1.5 opacity-70" preserveAspectRatio="xMidYMid meet">
      <FurnitureSymbol item={{ catalogId: item.id, width: item.w, depth: item.d, height: item.h, materials: item.slots, name: item.name }} />
    </svg>
  );
}

export function LibraryPanel() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({ sofas: true });
  const placing = useEditorStore((s) => s.placingCatalogId);
  const view = useEditorStore((s) => s.view);
  const startPlacing = useEditorStore((s) => s.startPlacing);
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<FurnitureCategory, CatalogItem[]>();
    for (const c of CATALOG) {
      if (q && !c.name.toLowerCase().includes(q) && !CATEGORY_LABELS[c.category].toLowerCase().includes(q)) continue;
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-slate-200 p-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Buscar muebles y objetos…"
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-[12.5px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
          />
        </div>
        <p className="text-[11px] leading-snug text-slate-500">Arrastra un objeto al plano o al modelo 3D, o haz clic para colocarlo.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        {grouped.map(([cat, items]) => {
          const isOpen = query ? true : !!open[cat];
          return (
            <div key={cat} className="border-b border-slate-100">
              <button type="button" onClick={() => setOpen({ ...open, [cat]: !isOpen })} className="flex w-full items-center justify-between px-3 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50">
                <span>
                  {CATEGORY_LABELS[cat]} <span className="font-normal text-slate-400">{items.length}</span>
                </span>
                <ChevronDown size={14} className={cx('text-slate-400 transition-transform', !isOpen && '-rotate-90')} />
              </button>
              {isOpen && (
                <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                  {items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, it.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => (view === '2d' ? startPlacing(it.id) : addFurnitureAtViewCenter(it.id))}
                      title={`${it.name} · ${it.w.toFixed(2)} × ${it.d.toFixed(2)} × ${it.h.toFixed(2)} m`}
                      className={cx(
                        'flex cursor-grab flex-col items-center gap-1 rounded-lg border bg-white p-1.5 text-center transition active:cursor-grabbing',
                        placing === it.id ? 'border-accent-400 ring-2 ring-accent-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
                      )}
                    >
                      <Thumb item={it} />
                      <span className="line-clamp-2 text-[11px] leading-tight text-slate-700">{it.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <ImportedModels />
      </div>
      <div className="border-t border-slate-200 p-3">
        <ImportModelButton />
      </div>
    </div>
  );
}
