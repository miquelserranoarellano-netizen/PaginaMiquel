/**
 * Guardado en la cuenta de Claude: cuando la app se abre dentro de Claude, los
 * proyectos se guardan en la base de datos privada del usuario
 * (`data/users/<id>/…`), así que siguen ahí al cerrar, en otro navegador o en
 * el móvil. Cada proyecto se comprime (zlib) y se trocea en documentos de
 * ~200 KB; la ficha (nombre, miniatura, superficie) va en un documento aparte
 * que se escribe al final, para que la lista nunca muestre un guardado a medias.
 * Además se mantiene una copia en el navegador como respaldo.
 */
import type { ProjectDoc, ProjectMeta } from '@/modules/FloorPlan/types';
import { capability, type HostCollection, type HostDb, type HostDocRef } from './claudeHost';
import type { StorageAdapter } from './storage';

const CHUNK = 200_000;
const PREFIX = 'p_';

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encodeDoc(doc: ProjectDoc, chunk = CHUNK): Promise<string[]> {
  const { zlibSync, strToU8 } = await import('fflate');
  const b64 = toBase64(zlibSync(strToU8(JSON.stringify(doc)), { level: 6 }));
  const parts: string[] = [];
  for (let i = 0; i < b64.length; i += chunk) parts.push(b64.slice(i, i + chunk));
  return parts.length ? parts : [''];
}

export async function decodeDoc(parts: string[]): Promise<unknown> {
  const { unzlibSync, strFromU8 } = await import('fflate');
  return JSON.parse(strFromU8(unzlibSync(fromBase64(parts.join('')))));
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('La cuenta de Claude no responde')), ms))]);

/** La ficha debe caber en un documento (256 KB): sin miniatura si es demasiado grande. */
const fitMeta = (meta: ProjectMeta): ProjectMeta => (JSON.stringify(meta).length > 180_000 ? { ...meta, thumbnail: undefined } : meta);

const message = (e: unknown): string => (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e));

/**
 * Devuelve el adaptador de la cuenta de Claude, o null si esta vista no lo
 * permite (fuera de Claude, sin sesión o sin permiso de escritura).
 */
export async function claudeAdapter(local: StorageAdapter | null): Promise<StorageAdapter | null> {
  const [db, user] = await Promise.all([capability('db'), capability('user')]);
  if (!db || !user) return null;
  const uid = await user.id().catch(() => null);
  if (!uid) return null;
  const base = `data/users/${uid}`;
  let col: HostCollection;
  try {
    col = (db as HostDb).collection(base);
    await withTimeout(col.get(), 10000);
  } catch {
    return null;
  }
  const metaRef = (id: string): HostDocRef => col.doc(PREFIX + id);
  const chunks = (id: string) => metaRef(id).collection('chunks');
  /** Número de trozos del último guardado de cada proyecto (para borrar los sobrantes). */
  const written = new Map<string, number>();

  const adapter: StorageAdapter = {
    kind: 'claude',
    async list() {
      const snap = await withTimeout(col.get(), 15000);
      return snap.docs
        .filter((d) => d.exists && d.id.startsWith(PREFIX))
        .map((d) => d.data() as { meta?: ProjectMeta })
        .filter((b): b is { meta: ProjectMeta } => !!b?.meta?.id)
        .map((b) => b.meta);
    },
    async load(id) {
      try {
        const m = await withTimeout(metaRef(id).get(), 15000);
        const body = m.data() as { count?: number; version?: number } | undefined;
        if (!m.exists || !body?.count) throw new Error('No se ha encontrado el proyecto');
        const snaps = await Promise.all(Array.from({ length: body.count }, (_, i) => chunks(id).doc(String(i)).get()));
        const parts = snaps.map((s) => s.data() as { d?: string; v?: number } | undefined);
        if (parts.some((p) => typeof p?.d !== 'string' || p.v !== body.version)) throw new Error('El guardado en la nube está incompleto');
        const doc = await decodeDoc(parts.map((p) => p!.d!));
        written.set(id, body.count);
        return doc;
      } catch (e) {
        // Respaldo: la copia de este navegador.
        if (local) {
          try {
            return await local.load(id);
          } catch {
            /* sin copia local */
          }
        }
        throw new Error(message(e));
      }
    },
    async save(doc, meta) {
      if (local) await local.save(doc, meta).catch(() => undefined);
      const parts = await encodeDoc(doc);
      const version = doc.updatedAt;
      let prevCount = written.get(doc.id);
      if (prevCount === undefined) prevCount = ((await metaRef(doc.id).get().catch(() => null))?.data() as { count?: number } | undefined)?.count ?? 0;
      for (let i = 0; i < parts.length; i++) {
        // Cada trozo lleva la versión del guardado: al leer se comprueba que todos coinciden.
        await chunks(doc.id).doc(String(i)).set({ d: parts[i], v: version });
      }
      await metaRef(doc.id).set({ meta: fitMeta(meta), count: parts.length, version, size: parts.reduce((s, p) => s + p.length, 0) });
      for (let i = parts.length; i < prevCount; i++) await chunks(doc.id).doc(String(i)).delete().catch(() => undefined);
      written.set(doc.id, parts.length);
    },
    async remove(id) {
      if (local) await local.remove(id).catch(() => undefined);
      const m = await metaRef(id).get().catch(() => null);
      const count = (m?.data() as { count?: number } | undefined)?.count ?? 0;
      await metaRef(id).delete();
      for (let i = 0; i < count; i++) await chunks(id).doc(String(i)).delete().catch(() => undefined);
      written.delete(id);
    },
  };

  // Primera vez: sube a la cuenta los proyectos que solo estaban en este navegador.
  if (local) {
    try {
      const [mine, here] = await Promise.all([adapter.list(), local.list()]);
      const known = new Map(mine.map((m) => [m.id, m.updatedAt]));
      for (const m of here) {
        if ((known.get(m.id) ?? -1) >= m.updatedAt) continue;
        const raw = (await local.load(m.id)) as ProjectDoc;
        const parts = await encodeDoc(raw);
        for (let i = 0; i < parts.length; i++) await chunks(m.id).doc(String(i)).set({ d: parts[i], v: raw.updatedAt });
        await metaRef(m.id).set({ meta: fitMeta(m), count: parts.length, version: raw.updatedAt, size: parts.reduce((s, p) => s + p.length, 0) });
      }
    } catch (e) {
      console.warn('No se pudieron subir los proyectos locales a la cuenta de Claude', e);
    }
  }
  return adapter;
}
