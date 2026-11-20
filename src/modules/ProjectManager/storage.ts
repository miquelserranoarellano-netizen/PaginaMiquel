/**
 * Almacenamiento local de proyectos:
 *  - Escritorio (Electron): ficheros JSON en la carpeta de datos del usuario,
 *    con escritura atómica y copia de seguridad (ver electron/main.cjs).
 *  - Navegador: IndexedDB.
 */
import { createStore, del, entries, get, set } from 'idb-keyval';
import type { ProjectDoc, ProjectMeta } from '@/modules/FloorPlan/types';

export interface StorageAdapter {
  kind: 'desktop' | 'browser';
  list(): Promise<ProjectMeta[]>;
  load(id: string): Promise<unknown>;
  save(doc: ProjectDoc, meta: ProjectMeta): Promise<void>;
  remove(id: string): Promise<void>;
}

function browserAdapter(): StorageAdapter {
  const store = createStore('homedesign-studio', 'projects');
  return {
    kind: 'browser',
    async list() {
      const all = await entries<string, unknown>(store);
      return all.filter(([k]) => String(k).startsWith('meta:')).map(([, v]) => v as ProjectMeta);
    },
    async load(id) {
      const raw = await get<string>(`doc:${id}`, store);
      if (!raw) throw new Error('No se ha encontrado el proyecto');
      return JSON.parse(raw);
    },
    async save(doc, meta) {
      await set(`doc:${doc.id}`, JSON.stringify(doc), store);
      await set(`meta:${doc.id}`, meta, store);
    },
    async remove(id) {
      await del(`doc:${id}`, store);
      await del(`meta:${id}`, store);
    },
  };
}

function desktopAdapter(): StorageAdapter {
  const api = window.homeDesign!;
  return {
    kind: 'desktop',
    async list() {
      return (await api.projects.list()) as ProjectMeta[];
    },
    async load(id) {
      return JSON.parse(await api.projects.read(id));
    },
    async save(doc, meta) {
      await api.projects.write(doc.id, JSON.stringify(doc), JSON.stringify(meta));
    },
    async remove(id) {
      await api.projects.remove(id);
    },
  };
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) adapter = typeof window !== 'undefined' && window.homeDesign?.isDesktop ? desktopAdapter() : browserAdapter();
  return adapter;
}

export const isDesktop = (): boolean => typeof window !== 'undefined' && !!window.homeDesign?.isDesktop;
