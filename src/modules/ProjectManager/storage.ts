/**
 * Almacenamiento local de proyectos:
 *  - Escritorio (Electron): ficheros JSON en la carpeta de datos del usuario,
 *    con escritura atómica y copia de seguridad (ver electron/main.cjs).
 *  - Navegador: IndexedDB.
 */
import { createStore, del, entries, get, set } from 'idb-keyval';
import type { ProjectDoc, ProjectMeta } from '@/modules/FloorPlan/types';
import { cloudActive, cloudAdapter } from './cloud';

export interface StorageAdapter {
  kind: 'desktop' | 'browser' | 'cloud';
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

/** Almacenamiento en memoria: último recurso cuando el navegador no deja guardar. */
function memoryAdapter(): StorageAdapter {
  const docs = new Map<string, string>();
  const metas = new Map<string, ProjectMeta>();
  return {
    kind: 'browser',
    async list() {
      return [...metas.values()];
    },
    async load(id) {
      const raw = docs.get(id);
      if (!raw) throw new Error('No se ha encontrado el proyecto');
      return JSON.parse(raw);
    },
    async save(doc, meta) {
      docs.set(doc.id, JSON.stringify(doc));
      metas.set(doc.id, meta);
    },
    async remove(id) {
      docs.delete(id);
      metas.delete(id);
    },
  };
}

/** Comprueba que IndexedDB funciona (puede estar bloqueado en ventanas privadas o marcos). */
async function probeBrowser(a: StorageAdapter): Promise<boolean> {
  try {
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500));
    await Promise.race([a.list(), timeout]);
    return true;
  } catch {
    return false;
  }
}

let adapter: StorageAdapter | null = null;
let volatile = false;

/** true si los proyectos solo se guardan en memoria (se pierden al cerrar). */
export const isVolatileStorage = (): boolean => volatile;

/** Almacenamiento local (escritorio o navegador). */
function localStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;
  if (typeof window !== 'undefined' && window.homeDesign?.isDesktop) {
    adapter = desktopAdapter();
    return adapter;
  }
  // Se decide de forma perezosa: IndexedDB si responde, si no memoria.
  let chosen: Promise<StorageAdapter> | null = null;
  const pick = () =>
    (chosen ??= (async () => {
      try {
        const b = browserAdapter();
        if (await probeBrowser(b)) return b;
      } catch {
        /* sin IndexedDB */
      }
      volatile = true;
      return memoryAdapter();
    })());
  adapter = {
    kind: 'browser',
    list: async () => (await pick()).list(),
    load: async (id) => (await pick()).load(id),
    save: async (doc, meta) => (await pick()).save(doc, meta),
    remove: async (id) => (await pick()).remove(id),
  };
  return adapter;
}

let cloud: StorageAdapter | null = null;

/** Adaptador activo: la nube (Supabase) si hay sesión iniciada; si no, este dispositivo. */
export function getStorage(): StorageAdapter {
  if (cloudActive()) return (cloud ??= cloudAdapter());
  return localStorageAdapter();
}

/** Almacenamiento de este dispositivo, aunque haya sesión en la nube (para migrar proyectos). */
export const getLocalStorage = (): StorageAdapter => localStorageAdapter();

export const isDesktop = (): boolean => typeof window !== 'undefined' && !!window.homeDesign?.isDesktop;
