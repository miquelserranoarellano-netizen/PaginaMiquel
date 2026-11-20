/**
 * Cuentas propias de HomeDesign Studio (usuario y contraseña) en la web
 * publicada en Cloudflare: la API vive en el mismo dominio (`/api/*`, ver
 * worker/index.ts). Con sesión iniciada los proyectos se guardan en la cuenta y
 * se pueden abrir desde cualquier dispositivo.
 */
import { create } from 'zustand';
import type { ProjectMeta } from '@/modules/FloorPlan/types';
import { inClaude } from './claudeHost';
import { decodeDoc, encodeDoc } from './claudeStorage';
import type { StorageAdapter } from './storage';

const TOKEN_KEY = 'homedesign.account.v1';

const GUEST_KEY = 'homedesign.guest';

interface AccountState {
  /** null mientras se comprueba si esta web tiene cuentas. */
  available: boolean | null;
  signup: boolean;
  username: string | null;
  /** Ha elegido seguir sin cuenta en esta visita. */
  guest: boolean;
  /** Dónde guarda el servidor las cuentas ('supabase' o 'd1'). */
  storage: string | null;
  /** Problema de la base de datos del servidor (p. ej. faltan las tablas en Supabase). */
  serverError: string | null;
  set: (p: Partial<Omit<AccountState, 'set'>>) => void;
}

const readGuest = (): boolean => {
  try {
    return sessionStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
};

export const useAccount = create<AccountState>()((set) => ({ available: null, signup: true, username: null, guest: readGuest(), storage: null, serverError: null, set: (p) => set(p) }));

/** true en la web publicada (no dentro de Claude ni en la app de escritorio). */
export const isWeb = (): boolean => typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && !inClaude() && !window.homeDesign;

export function continueAsGuest(): void {
  try {
    sessionStorage.setItem(GUEST_KEY, '1');
  } catch {
    /* sin almacenamiento */
  }
  useAccount.getState().set({ guest: true });
}

let token: string | null = null;
try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  token = null;
}

const saveToken = (t: string | null) => {
  token = t;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin almacenamiento local */
  }
};

async function api<T>(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      signal: ctl.signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  } finally {
    clearTimeout(t);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (res.status === 401 && token && path !== '/api/login') {
    saveToken(null);
    useAccount.getState().set({ username: null });
  }
  if (!res.ok || !body) throw new ApiError(body?.error ?? `Error ${res.status}`, res.status);
  return body;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** true si el error es «ese usuario no existe» (para ofrecer crear la cuenta). */
export const isUnknownUser = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

/** Comprueba si la web tiene cuentas y recupera la sesión guardada. */
export async function initAccount(): Promise<void> {
  const st = useAccount.getState();
  if (!isWeb()) return st.set({ available: false });
  try {
    const h = await api<{ accounts?: boolean; signup?: boolean; storage?: string; error?: string }>('/api/health', { method: 'GET' }, 8000);
    if (!h.accounts) return st.set({ available: false });
    let username: string | null = null;
    if (token) {
      try {
        username = (await api<{ username: string }>('/api/me', { method: 'GET' })).username;
      } catch {
        /* sesión caducada o sin conexión: se pedirá entrar de nuevo */
      }
    }
    st.set({ available: true, signup: h.signup !== false, username, storage: h.storage ?? null, serverError: h.error ?? null });
  } catch {
    st.set({ available: false });
  }
}

export async function accountLogin(username: string, password: string, create = false): Promise<void> {
  const r = await api<{ token: string; username: string }>(create ? '/api/register' : '/api/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) });
  saveToken(r.token);
  useAccount.getState().set({ username: r.username });
}

export async function accountLogout(): Promise<void> {
  await api('/api/logout', { method: 'POST', body: '{}' }).catch(() => undefined);
  saveToken(null);
  try {
    sessionStorage.removeItem(GUEST_KEY);
  } catch {
    /* sin almacenamiento */
  }
  useAccount.getState().set({ username: null, guest: false });
}

export const accountActive = (): boolean => !!useAccount.getState().username;

export function accountAdapter(): StorageAdapter {
  const path = (id: string) => `/api/projects/${encodeURIComponent(id)}`;
  return {
    kind: 'account',
    list: () => api<ProjectMeta[]>('/api/projects', { method: 'GET' }),
    async load(id) {
      const r = await api<{ parts: string[] }>(path(id), { method: 'GET' }, 60000);
      return decodeDoc(r.parts);
    },
    async save(doc, meta) {
      const parts = await encodeDoc(doc, 900_000);
      const m = JSON.stringify(meta).length > 300_000 ? { ...meta, thumbnail: undefined } : meta;
      await api(path(doc.id), { method: 'PUT', body: JSON.stringify({ meta: m, parts, version: doc.updatedAt }) }, 60000);
    },
    async remove(id) {
      await api(path(id), { method: 'DELETE', body: '{}' });
    },
  };
}
