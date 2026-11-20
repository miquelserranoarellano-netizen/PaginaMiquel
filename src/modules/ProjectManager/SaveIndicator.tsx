import { AlertCircle, Check, Cloud, Loader2, Save } from 'lucide-react';
import { useCloud } from './cloud';
import { useAccount } from './account';
import { useStorageLocation } from './storage';
import { useSaveStore } from './saveStore';
import { saveNow } from './persistence';
import { Button } from '@/modules/UI/controls';

export function SaveIndicator() {
  const { status, error } = useSaveStore();
  const cloud = useCloud((s) => !!s.email);
  const web = useAccount((s) => !!s.username);
  const account = useStorageLocation((s) => s.local === 'claude') || web;
  const map = {
    saved: { icon: cloud || account ? <Cloud size={13} /> : <Check size={13} />, text: cloud ? 'Guardado en la nube' : account ? 'Guardado en tu cuenta' : 'Guardado', cls: 'text-accent-700' },
    dirty: { icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />, text: 'Sin guardar', cls: 'text-slate-500' },
    saving: { icon: <Loader2 size={13} className="animate-spin" />, text: 'Guardando…', cls: 'text-slate-500' },
    error: { icon: <AlertCircle size={13} />, text: 'Error al guardar', cls: 'text-red-600' },
    idle: { icon: null, text: '', cls: '' },
  }[status];
  return (
    <span className={`hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-[11.5px] lg:flex ${map.cls}`} title={error ?? undefined}>
      {map.icon}
      {map.text}
    </span>
  );
}

export function SaveButton() {
  const status = useSaveStore((s) => s.status);
  return (
    <Button title="Guardar (Ctrl+S)" onClick={() => void saveNow()} disabled={status === 'saving'}>
      <Save size={14} /> Guardar
    </Button>
  );
}
