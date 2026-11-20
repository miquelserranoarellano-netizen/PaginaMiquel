/**
 * Guardado en la nube con Supabase (opcional).
 *
 * Configuración: variables de compilación VITE_SUPABASE_URL y
 * VITE_SUPABASE_ANON_KEY (por ejemplo, en Cloudflare) o, desde la propia app,
 * la URL del proyecto y la clave pública "anon". La tabla y sus reglas de
 * seguridad están en supabase/schema.sql. Cada persona entra con su email y
 * contraseña y solo ve sus proyectos.
 */
import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectDoc, ProjectMeta } from '@/modules/FloorPlan/types';
import type { StorageAdapter } from './storage';

const KEY = 'homedesign.supabase.v1';

export interface CloudConfig {
  url: string;
  anonKey: string;
}

interface CloudState {
  config: CloudConfig | null;
  email: string | null;
  userId: string | null;
  ready: boolean;
  set: (p: Partial<Omit<CloudState, 'set'>>) => void;
}

function readConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as CloudConfig;
      if (c.url && c.anonKey) return c;
    }
  } catch {
    /* sin almacenamiento local */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && anonKey ? { url, anonKey } : null;
}

export const useCloud = create<CloudState>()((set) => ({
  config: typeof window !== 'undefined' ? readConfig() : null,
  email: null,
  userId: null,
  ready: false,
  set: (p) => set(p),
}));

let client: Promise<SupabaseClient> | null = null;

export function normalizeUrl(url: string): string {
  const u = url.trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(u) ? u : `https://${u}`;
}

async function getClient(): Promise<SupabaseClient> {
  const cfg = useCloud.getState().config;
  if (!cfg) throw new Error('Supabase no está configurado');
  if (!client) {
    client = import('@supabase/supabase-js').then(({ createClient }) => {
      const c = createClient(normalizeUrl(cfg.url), cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'homedesign.auth' } });
      c.auth.onAuthStateChange((_e, session) => useCloud.getState().set({ email: session?.user.email ?? null, userId: session?.user.id ?? null, ready: true }));
      return c;
    });
  }
  return client;
}

/** Comprueba la sesión guardada al arrancar. */
export async function initCloud(): Promise<void> {
  if (!useCloud.getState().config) {
    useCloud.getState().set({ ready: true });
    return;
  }
  try {
    const c = await getClient();
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000));
    const { data } = await Promise.race([c.auth.getSession(), timeout]);
    useCloud.getState().set({ email: data.session?.user.email ?? null, userId: data.session?.user.id ?? null, ready: true });
  } catch {
    useCloud.getState().set({ email: null, userId: null, ready: true });
  }
}

export function saveConfig(cfg: CloudConfig | null): void {
  client = null;
  try {
    if (cfg) localStorage.setItem(KEY, JSON.stringify({ url: normalizeUrl(cfg.url), anonKey: cfg.anonKey.trim() }));
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento local */
  }
  useCloud.getState().set({ config: cfg ? { url: normalizeUrl(cfg.url), anonKey: cfg.anonKey.trim() } : readConfig(), email: null, userId: null });
}

/** Comprueba que la clave es la pública (anon / publishable) y no la secreta. */
export function checkPublicKey(key: string): string | null {
  const k = key.trim();
  if (!k) return 'Falta la clave pública';
  if (k.startsWith('sb_secret_')) return 'Esa es la clave secreta: usa la pública (anon o publishable)';
  if (k.startsWith('sb_publishable_')) return null;
  const parts = k.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
      if (payload.role === 'service_role') return 'Esa es la clave service_role (secreta): usa la clave anon';
      return null;
    } catch {
      return 'La clave no tiene un formato válido';
    }
  }
  return 'La clave no tiene un formato válido';
}

export function checkUrl(url: string): string | null {
  try {
    const u = new URL(normalizeUrl(url));
    return u.hostname.includes('.') ? null : 'La URL no es válida';
  } catch {
    return 'La URL no es válida';
  }
}

const friendly = (msg: string): string => {
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu email con el enlace que te ha llegado y vuelve a entrar';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese email: entra con tu contraseña';
  if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres';
  if (/relation .*projects.* does not exist|Could not find the table/i.test(msg)) return 'Falta crear la tabla: ejecuta supabase/schema.sql en tu proyecto de Supabase';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'No se puede conectar con Supabase: revisa la URL y tu conexión';
  return msg;
};

export async function signIn(email: string, password: string): Promise<void> {
  const c = await getClient();
  const { error, data } = await c.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
  useCloud.getState().set({ email: data.user?.email ?? email, userId: data.user?.id ?? null });
}

/** Crea la cuenta. Devuelve true si hay que confirmar el email antes de entrar. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const c = await getClient();
  const { error, data } = await c.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
  if (data.session) useCloud.getState().set({ email: data.user?.email ?? email, userId: data.user?.id ?? null });
  return !data.session;
}

export async function signOut(): Promise<void> {
  const c = await getClient();
  await c.auth.signOut();
  useCloud.getState().set({ email: null, userId: null });
}

/** true si los proyectos se guardan ahora en la nube. */
export const cloudActive = (): boolean => !!useCloud.getState().config && !!useCloud.getState().email;

export function cloudAdapter(): StorageAdapter {
  const table = async () => (await getClient()).from('projects');
  const check = <T,>(r: { data: T; error: { message: string } | null }): T => {
    if (r.error) throw new Error(friendly(r.error.message));
    return r.data;
  };
  return {
    kind: 'cloud',
    async list() {
      const rows = check(await (await table()).select('id, meta, updated_at').order('updated_at', { ascending: false })) as { id: string; meta: ProjectMeta }[];
      return rows.map((r) => ({ ...r.meta, id: r.id }));
    },
    async load(id) {
      const row = check(await (await table()).select('doc').eq('id', id).single()) as { doc: unknown };
      return row.doc;
    },
    async save(doc: ProjectDoc, meta: ProjectMeta) {
      const user_id = useCloud.getState().userId;
      if (!user_id) throw new Error('Inicia sesión para guardar en la nube');
      check(await (await table()).upsert({ id: doc.id, user_id, name: doc.name, meta, doc, updated_at: new Date(doc.updatedAt).toISOString() }, { onConflict: 'user_id,id' }));
    },
    async remove(id) {
      check(await (await table()).delete().eq('id', id));
    },
  };
}
