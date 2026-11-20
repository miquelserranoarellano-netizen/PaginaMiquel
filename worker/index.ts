/**
 * API de cuentas y proyectos de HomeDesign Studio (Cloudflare Workers).
 * Guarda en Supabase si SUPABASE_URL y SUPABASE_SERVICE_KEY están configurados
 * y, si no, en la base de datos D1 de Cloudflare (ver store.ts).
 *
 * Solo atiende /api/*; el resto lo sirven los recursos estáticos (dist).
 * Contraseñas con PBKDF2-SHA256 (100 000 iteraciones, sal aleatoria), sesiones
 * con token aleatorio (en la base de datos solo se guarda su hash) y bloqueo
 * temporal tras varios intentos fallidos. Los proyectos llegan ya comprimidos
 * desde la app y se guardan troceados.
 */

import { D1Store, type D1Database, type Store, StoreError, SupabaseStore, type StoredProject } from './store';

interface Env {
  /** Base de datos D1 (se usa si Supabase no está configurado). */
  DB?: D1Database;
  /** URL del proyecto de Supabase (https://xxxx.supabase.co). */
  SUPABASE_URL?: string;
  /** Clave secreta de Supabase (service_role o sb_secret_…). Va como secreto en Cloudflare. */
  SUPABASE_SERVICE_KEY?: string;
  /** "false" para cerrar el registro de cuentas nuevas. */
  ALLOW_SIGNUP?: string;
  /** Máximo de cuentas (20 por defecto). */
  MAX_USERS?: string;
}

const ITERATIONS = 100_000;
const SESSION_DAYS = 365;
const MAX_PROJECT_BYTES = 40_000_000;
const MAX_USER_BYTES = 200_000_000;
const MAX_PART = 1_000_000;
const USERNAME = /^[A-Za-z0-9_.-]{3,32}$/;
const PROJECT_ID = /^[A-Za-z0-9_-]{1,64}$/;

function stores(env: Env): { store: Store; legacy: Store | null } {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) return { store: new SupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY), legacy: env.DB ? new D1Store(env.DB) : null };
  if (env.DB) return { store: new D1Store(env.DB), legacy: null };
  throw new HttpError(503, 'No hay base de datos configurada (Supabase o D1)');
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations }, key, 256));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, it, salt, hash] = stored.split('$');
  const got = await pbkdf2(password, unb64(salt), Number(it));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

const sha256 = async (s: string) => b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

async function newSession(store: Store, userId: string): Promise<string> {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
  await store.createSession(await sha256(token), userId, Date.now() + SESSION_DAYS * 86_400_000);
  return token;
}

async function currentUser(req: Request, store: Store): Promise<{ id: string; username: string; tokenHash: string }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Inicia sesión');
  const tokenHash = await sha256(token);
  const session = await store.getSession(tokenHash);
  const user = session && session.expires_at >= Date.now() ? await store.getUser(session.user_id) : null;
  if (!user) throw new HttpError(401, 'La sesión ha caducado: vuelve a entrar');
  return { id: user.id, username: user.username, tokenHash };
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Petición no válida');
  }
}

function credentials(body: { username?: unknown; password?: unknown }) {
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  if (!USERNAME.test(username)) throw new HttpError(400, 'El usuario debe tener de 3 a 32 letras, números, puntos, guiones o guiones bajos');
  if (password.length < 6 || password.length > 200) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
  return { username, password, id: username.toLowerCase() };
}

/**
 * Si la cuenta existe en la base de datos anterior (D1) y la contraseña es
 * correcta, la copia con sus proyectos al almacén actual (Supabase).
 */
async function migrateAccount(store: Store, legacy: Store | null, id: string, password: string) {
  if (!legacy) return null;
  const old = await legacy.getUser(id).catch(() => null);
  if (!old || !(await verifyPassword(password, old.password))) return null;
  await store.createUser(old);
  for (const p of await legacy.exportProjects(id)) await store.saveProject(id, p);
  return old;
}

async function register(req: Request, env: Env, store: Store, legacy: Store | null) {
  if (env.ALLOW_SIGNUP === 'false') throw new HttpError(403, 'El registro de cuentas nuevas está cerrado');
  const { username, password, id } = credentials(await readJson(req));
  const taken = new HttpError(409, 'Ese usuario ya existe: entra con tu contraseña');
  if ((await store.getUser(id)) || (legacy && (await legacy.getUser(id).catch(() => null)))) throw taken;
  if ((await store.countUsers()) >= Number(env.MAX_USERS ?? 20)) throw new HttpError(403, 'No se admiten más cuentas en esta instalación');
  if (!(await store.createUser({ id, username, password: await hashPassword(password), created_at: Date.now() }))) throw taken;
  await store.clearAttempts(id);
  return json({ token: await newSession(store, id), username });
}

async function login(req: Request, env: Env, store: Store, legacy: Store | null) {
  const { username, password, id } = credentials(await readJson(req));
  const now = Date.now();
  let user = await store.getUser(id);
  if (!user) {
    user = await migrateAccount(store, legacy, id, password);
    if (user) {
      await store.clearAttempts(id);
      return json({ token: await newSession(store, user.id), username: user.username });
    }
    if (legacy && (await legacy.getUser(id).catch(() => null))) throw new HttpError(401, 'Contraseña incorrecta (distingue mayúsculas y minúsculas)');
    const signup = env.ALLOW_SIGNUP !== 'false';
    throw new HttpError(404, `No existe ninguna cuenta con el usuario «${username}».${signup ? ' Si es la primera vez, créala con «Crear cuenta».' : ''}`);
  }
  const attempt = await store.getAttempt(id);
  if (attempt && attempt.locked_until > now) {
    const min = Math.ceil((attempt.locked_until - now) / 60_000);
    throw new HttpError(429, `Demasiados intentos. Espera ${min} min y vuelve a probar`);
  }
  if (!(await verifyPassword(password, user.password))) {
    const fails = (attempt?.fails ?? 0) + 1;
    const lock = fails >= 5 ? now + Math.min(60, 2 ** (fails - 5) * 5) * 60_000 : 0;
    await store.setAttempt(id, { fails, locked_until: lock });
    throw new HttpError(401, fails >= 5 ? 'Contraseña incorrecta. Por seguridad, espera unos minutos antes de volver a probar' : 'Contraseña incorrecta (distingue mayúsculas y minúsculas)');
  }
  await store.clearAttempts(id);
  return json({ token: await newSession(store, user.id), username: user.username });
}

async function saveProject(req: Request, store: Store, userId: string, id: string) {
  const body = await readJson<{ meta?: unknown; parts?: unknown; version?: unknown }>(req);
  const parts = body.parts;
  const version = Number(body.version);
  if (!Array.isArray(parts) || !parts.length || parts.some((p) => typeof p !== 'string' || p.length > MAX_PART) || !Number.isFinite(version)) throw new HttpError(400, 'Proyecto no válido');
  const meta = body.meta ?? {};
  if (JSON.stringify(meta).length > 400_000) throw new HttpError(400, 'Ficha del proyecto demasiado grande');
  const size = (parts as string[]).reduce((s, p) => s + p.length, 0);
  if (size > MAX_PROJECT_BYTES) throw new HttpError(413, 'El proyecto es demasiado grande (quita modelos importados pesados)');
  if ((await store.usedBytes(userId, id)) + size > MAX_USER_BYTES) throw new HttpError(413, 'Has llenado el espacio de tu cuenta: borra algún proyecto');
  const p: StoredProject = { id, meta, version, parts: parts as string[], size };
  await store.saveProject(userId, p);
  return json({ ok: true });
}

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method.toUpperCase();
  const { store, legacy } = stores(env);
  if (path === '/api/health') {
    let error: string | undefined;
    try {
      await store.check();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    return json({ ok: !error, accounts: true, signup: env.ALLOW_SIGNUP !== 'false', storage: store.kind, ...(error ? { error } : {}) });
  }
  if (method !== 'GET' && method !== 'HEAD' && req.headers.get('content-type')?.includes('application/json') !== true) throw new HttpError(415, 'Se esperaba JSON');
  if (path === '/api/register' && method === 'POST') return register(req, env, store, legacy);
  if (path === '/api/login' && method === 'POST') return login(req, env, store, legacy);
  const user = await currentUser(req, store);
  if (path === '/api/me' && method === 'GET') return json({ username: user.username });
  if (path === '/api/logout' && method === 'POST') {
    await store.deleteSession(user.tokenHash);
    return json({ ok: true });
  }
  if (path === '/api/projects' && method === 'GET') return json(await store.listProjects(user.id));
  const m = /^\/api\/projects\/([^/]+)$/.exec(path);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (!PROJECT_ID.test(id)) throw new HttpError(400, 'Identificador no válido');
    if (method === 'GET') {
      const p = await store.getProject(user.id, id);
      if (!p) throw new HttpError(404, 'No se ha encontrado el proyecto');
      return json(p);
    }
    if (method === 'PUT') return saveProject(req, store, user.id, id);
    if (method === 'DELETE') {
      await store.deleteProject(user.id, id);
      return json({ ok: true });
    }
  }
  throw new HttpError(404, 'Ruta no encontrada');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await handle(req, env);
    } catch (e) {
      if (e instanceof HttpError || e instanceof StoreError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Error del servidor' }, 500);
    }
  },
};
