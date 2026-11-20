import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, FolderOpen, Home, MoreHorizontal, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { formatArea } from '@/core/units';
import type { ProjectMeta } from '@/modules/FloorPlan/types';
import { Button } from '@/modules/UI/controls';
import { dialog } from '@/modules/UI/dialog';
import { toast } from '@/modules/UI/toast';
import { createProject, deleteProject, duplicateProject, exportStoredProject, importProjectFile, listProjects, renameProject } from './actions';
import { openDocument, openProjectById } from './persistence';
import { isDesktop } from './storage';
import { createSampleHouse } from './sampleHouse';

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function ProjectCard({ meta, onChanged }: { meta: ProjectMeta; onChanged: () => void }) {
  const [menu, setMenu] = useState(false);
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
              const ok = await dialog.confirm({ title: `¿Eliminar "${meta.name}"?`, message: 'El proyecto se borrará de este equipo. Si quieres conservar una copia, expórtalo antes.', confirmText: 'Eliminar', danger: true });
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
  const refresh = useCallback(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => {
        toast.error(`No se pudo leer la lista de proyectos: ${e instanceof Error ? e.message : e}`);
        setProjects([]);
      });
  }, []);
  useEffect(refresh, [refresh]);

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

        <section className="mt-8">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Mis proyectos</h2>
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
        <footer className="mt-10 text-[11.5px] text-slate-400">
          {isDesktop() ? 'Los proyectos se guardan en la carpeta de datos de la aplicación, con copia de seguridad automática.' : 'Los proyectos se guardan en este navegador (IndexedDB). Usa “Exportar” para hacer copias de seguridad.'}
        </footer>
      </div>
    </div>
  );
}
