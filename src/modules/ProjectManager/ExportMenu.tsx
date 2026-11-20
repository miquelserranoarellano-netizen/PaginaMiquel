import { useEffect, useRef, useState } from 'react';
import { Box, Camera, ChevronDown, Download, FileImage, FileText, Package, Save } from 'lucide-react';
import { saveNow } from './persistence';
import { Button } from '@/modules/UI/controls';
import { toast } from '@/modules/UI/toast';
import { useEditorStore } from '@/store/editorStore';
import { exportModel, exportPlanPdf, exportPlanPng, exportProject, exportScreenshot } from './exporters';

export function ExportMenu({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const view = useEditorStore((s) => s.view);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const run = (fn: () => Promise<void>) => async () => {
    setOpen(false);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      toast.error(`Error al exportar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const Item = ({ icon, label, hint, onClick, disabled }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <span>
        <span className="block text-[12.5px] font-medium text-slate-800">{label}</span>
        <span className="block text-[11px] text-slate-500">{hint}</span>
      </span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <Button variant="primary" onClick={() => setOpen(!open)} disabled={busy} className={compact ? 'px-2.5' : undefined} title="Exportar">
        <Download size={14} /> {!compact && (busy ? 'Exportando…' : 'Exportar')} {!compact && <ChevronDown size={13} />}
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-30 max-h-[75vh] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Planos</div>
          <Item icon={<FileImage size={16} />} label="Plano en PNG" hint="Planta activa, alta resolución" onClick={run(exportPlanPng)} />
          <Item icon={<FileText size={16} />} label="Planos en PDF" hint="A3 a escala, con cajetín y superficies" onClick={run(exportPlanPdf)} />
          <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Modelo 3D</div>
          <Item icon={<Box size={16} />} label="Modelo 3D (GLB)" hint="Un único fichero con texturas" onClick={run(() => exportModel(true))} />
          <Item icon={<Box size={16} />} label="Modelo 3D (GLTF)" hint="Formato JSON estándar" onClick={run(() => exportModel(false))} />
          <Item icon={<Camera size={16} />} label="Captura 3D (PNG)" hint={view === '2d' ? 'Disponible en el modelo 3D o el recorrido' : 'Imagen de la vista actual'} onClick={run(exportScreenshot)} disabled={view === '2d'} />
          <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Proyecto</div>
          <Item icon={<Package size={16} />} label="Proyecto (.hdsp)" hint="Copia completa para guardar o compartir" onClick={run(exportProject)} />
          {compact && (
            <>
              <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Guardar</div>
              <Item icon={<Save size={16} />} label="Guardar ahora" hint="Los cambios también se guardan solos" onClick={run(async () => void (await saveNow()))} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
