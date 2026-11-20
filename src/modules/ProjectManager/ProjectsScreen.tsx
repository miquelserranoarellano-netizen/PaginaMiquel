import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, FolderOpen, Home, MoreHorizontal, Pencil, Plus, Trash2, Upload, UploadCloud } from 'lucide-react';
import { formatArea } from '@/core/units';
import type { ProjectMeta } from '@/modules/FloorPlan/types';
import { Button } from '@/modules/UI/controls';
import { dialog } from '@/modules/UI/dialog';
import { toast } from '@/modules/UI/toast';
import { createProject, deleteProject, duplicateProject, exportStoredProject, importProjectFile, listProjects, renameProject } from './actions';
import { openDocument, openProjectById } from './persistence';
import { useStorageLocation } from './storage';
import { useCloud } from './cloud';
import { CloudButton, CloudDialog } from './CloudDialog';
import { accountAdapter, isWeb, useAccount } from './account';
import { getLocalStorage } from './storage';
import { uploadLocalProjects } from './migrate';
import { AccountButton, AccountDialog } from './AccountDialog';
import { createSampleHouse } from './sampleHouse';

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function ProjectCard({ meta, onChanged }: { meta: ProjectMeta; onChanged: () => void }) {
  const [menu, setMenu] = useState(false);
  const inSupabase = useCloud((s) => !!s.email);
  const inWebAccount = useAccount((s) => !!s.username);
  const inCloud = inSupabase || inWebAccount;
  const inAccount = useStorageLocation((s) => s.local === 'claude');
  const run = (fn: () => Promise<void>) => async () => {
    setMenu(false);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    onChanged();
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <button type="button" className="block w-full text-left" onClick={() => void openProjectById(meta.id)}>
        <div className="flex aspect-[16/10] items-center justify-center bg-[#fbfbfa]">
          {meta.thumbnail ? <img src={meta.thumbnail} alt="" className="h-full w-full object-contain p-3" /> : <Home size={40} className="text-slate-300" />}
        </div>
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="truncate text-[14px] font-semibold text-slate-900">{meta.name}</div>
          <div className="mt-0.5 text-[11.5px] text-slate-500">{dateFmt.format(meta.updatedAt)}</div>
          <div className="mt-0.5 text-[11.5px] text-slate-500">
            {meta.rooms ? `${meta.rooms} estancias · ${formatArea(meta.area ?? 0)} útiles` : 'Sin estancias'}
          </div>
        </div>
      </button>
      <button type="button" onClick={() => setMenu(!menu)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow-sm transition hover:bg-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100" title="Opciones">
        <MoreHorizontal size={16} />
      </button>
      {menu && (
        <div className="absolute right-2 top-11 z-10 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-[12.5px] shadow-lg" onMouseLeave={() => setMenu(false)}>
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50" onClick={() => void openProjectById(meta.id)}>
            <FolderOpen size={14} /> Abrir
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50"
            onClick={run(async () => {
              const name = await dialog.prompt({ title: 'Cambiar nombre', label: 'Nombre del proyecto', defaultValue: meta.name, confirmText: 'Guardar' });
              if (name) await renameProject(meta.id, name);
            })}
          >
            <Pencil size={14} /> Cambiar nombre
          </button>
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50" onClick={run(() => duplicateProject(meta.id))}>
            <Copy size={14} /> Duplicar
          </button>
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50" onClick={run(() => exportStoredProject(meta.id))}>
            <Download size={14} /> Exportar (.hdsp)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
            onClick={run(async () => {
              const ok = await dialog.confirm({ title: `¿Eliminar "${meta.name}"?`, message: inCloud || inAccount ? `El proyecto se borrará de tu cuenta ${inCloud ? 'en la nube' : 'de Claude'} (en todos tus dispositivos). Si quieres conservar una copia, expórtalo antes.` : 'El proyecto se borrará de este equipo. Si quieres conservar una copia, expórtalo antes.', confirmText: 'Eliminar', danger: true });
              if (ok) await deleteProject(meta.id);
            })}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

export function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const email = useCloud((s) => s.email);
  const cloudReady = useCloud((s) => s.ready);
  const cloudConfigured = useCloud((s) => !!s.config);
  const accounts = useAccount((s) => s.available);
  const username = useAccount((s) => s.username);
  const accountStorage = useAccount((s) => s.storage);
  const location = useStorageLocation((s) => s.local);
  const refresh = useCallback(() => {
    if (!useCloud.getState().ready || useAccount.getState().available === null) return;
    listProjects()
      .then(setProjects)
      .catch((e) => {
        toast.error(`No se pudo leer la lista de proyectos: ${e instanceof Error ? e.message : e}`);
        setProjects([]);
      });
  }, []);
  useEffect(refresh, [refresh, email, cloudReady, accounts, username]);

  // Proyectos que están solo en este navegador (para guardarlos en la cuenta).
  const [pendingLocal, setPendingLocal] = useState(0);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!username || !projects) return setPendingLocal(0);
    let alive = true;
    getLocalStorage()
      .list()
      .then((here) => {
        const known = new Map(projects.map((m) => [m.id, m.updatedAt]));
        if (alive) setPendingLocal(here.filter((m) => (known.get(m.id) ?? -1) < m.updatedAt).length);
      })
      .catch(() => alive && setPendingLocal(0));
    return () => {
      alive = false;
    };
  }, [username, projects]);
  const web = isWeb();

  return (
    <div className="h-full overflow-y-auto bg-canvas thin-scroll">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="./icon.svg" alt="" className="h-11 w-11" />
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">HomeDesign Studio</h1>
              <p className="text-[13px] text-slate-500">Diseña tu casa en 2D, visualízala en 3D y recórrela por dentro.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {web && <AccountButton onClick={() => setAccountOpen(true)} />}
            {(!web || cloudConfigured) && !username && <CloudButton onClick={() => setCloudOpen(true)} />}
            <Button
              onClick={async () => {
                const doc = await importProjectFile();
                if (doc) openDocument(doc, { alreadySaved: true });
                refresh();
              }}
            >
              <Upload size={14} /> Importar proyecto
            </Button>
            <Button onClick={() => void createProject('Casa de ejemplo', createSampleHouse())}>
              <Home size={14} /> Abrir casa de ejemplo
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const name = await dialog.prompt({ title: 'Nuevo proyecto', label: 'Nombre del proyecto', defaultValue: 'Mi casa', confirmText: 'Crear' });
                if (name) void createProject(name);
              }}
            >
              <Plus size={15} /> Nuevo proyecto
            </Button>
          </div>
        </header>

        {pendingLocal > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
            <UploadCloud size={18} className="shrink-0 text-accent-700" />
            <p className="min-w-0 flex-1 text-[13px] text-accent-900">
              Tienes {pendingLocal} proyecto{pendingLocal === 1 ? '' : 's'} guardado{pendingLocal === 1 ? '' : 's'} solo en este navegador. Guárdalo{pendingLocal === 1 ? '' : 's'} en tu cuenta para verlo{pendingLocal === 1 ? '' : 's'} desde cualquier dispositivo.
            </p>
            <Button
              variant="primary"
              disabled={uploading}
              onClick={async () => {
                setUploading(true);
                try {
                  const r = await uploadLocalProjects(accountAdapter());
                  toast.success(`${r.uploaded} proyecto${r.uploaded === 1 ? '' : 's'} guardado${r.uploaded === 1 ? '' : 's'} en tu cuenta`);
                  refresh();
                } catch (e) {
                  toast.error(`No se pudo guardar en tu cuenta: ${e instanceof Error ? e.message : String(e)}`);
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? 'Guardando…' : 'Guardar en mi cuenta'}
            </Button>
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">{username ? `Proyectos de ${username}` : email ? 'Mis proyectos en la nube' : 'Mis proyectos'}</h2>
          {projects === null ? (
            <p className="text-slate-500">Cargando…</p>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center">
              <Home size={36} className="mx-auto text-slate-300" />
              <h3 className="mt-3 text-[16px] font-semibold text-slate-800">Todavía no tienes proyectos</h3>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500">Crea un proyecto en blanco para dibujar tu casa desde cero, o abre la casa de ejemplo para explorar el plano, el modelo 3D y el recorrido virtual.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button onClick={() => void createProject('Casa de ejemplo', createSampleHouse())}>
                  <Home size={14} /> Casa de ejemplo
                </Button>
                <Button variant="primary" onClick={() => void createProject('Mi casa')}>
                  <Plus size={15} /> Nuevo proyecto
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} meta={p} onChanged={refresh} />
              ))}
            </div>
          )}
        </section>
        <footer className={`mt-10 text-[11.5px] ${location === 'memory' ? 'text-amber-700' : 'text-slate-400'}`}>
          {username
            ? `Los proyectos se guardan en tu cuenta (${username})${accountStorage === 'supabase' ? ' en Supabase' : ''}: entra con tu usuario desde cualquier dispositivo para verlos.`
            : email
            ? `Los proyectos se guardan en tu cuenta de Supabase (${email}).`
            : location === 'claude'
              ? 'Los proyectos se guardan automáticamente en tu cuenta de Claude: los encontrarás al volver a abrir la app, también desde el móvil.'
              : location === 'desktop'
                ? 'Los proyectos se guardan en la carpeta de datos de la aplicación, con copia de seguridad automática.'
                : location === 'memory'
                  ? 'Este navegador no deja guardar datos: los proyectos se perderán al cerrar. Expórtalos o guárdalos en la nube.'
                  : accounts
                    ? 'Los proyectos se guardan en este navegador. Inicia sesión para guardarlos en tu cuenta y verlos en todos tus dispositivos.'
                    : 'Los proyectos se guardan en este navegador. Usa “Guardar en la nube” para tenerlos en todos tus dispositivos, o “Exportar” para hacer copias.'}
        </footer>
      </div>
      {cloudOpen && <CloudDialog onClose={() => setCloudOpen(false)} onChanged={refresh} />}
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} onChanged={refresh} />}
    </div>
  );
}
