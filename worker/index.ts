/**
 * API de cuentas y proyectos de HomeDesign Studio (Cloudflare Workers + D1).
 *
 * Solo atiende /api/*; el resto lo sirven los recursos estáticos (dist).
 * Contraseñas con PBKDF2-SHA256 (100 000 iteraciones, sal aleatoria), sesiones
 * con token aleatorio (en la base de datos solo se guarda su hash) y bloqueo
 * temporal tras varios intentos fallidos. Los proyectos llegan ya comprimidos
 * desde la app y se guardan troceados.
 */

interface D1Result<T> {
  results: T[];
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
  exec(sql: string): Promise<unknown>;
}
interface Env {
  DB: D1Database;
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

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (user_id TEXT PRIMARY KEY, fails INTEGER NOT NULL, locked_until INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS projects (user_id TEXT NOT NULL, id TEXT NOT NULL, meta TEXT NOT NULL, version INTEGER NOT NULL, parts INTEGER NOT NULL, size INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, id))`,
  `CREATE TABLE IF NOT EXISTS project_parts (user_id TEXT NOT NULL, project_id TEXT NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (user_id, project_id, idx))`,
];

let schemaReady: Promise<void> | null = null;
const ensureSchema = (db: D1Database) => (schemaReady ??= db.batch(SCHEMA.map((s) => db.prepare(s))).then(() => undefined).catch((e) => {
  schemaReady = null;
  throw e;
}));

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

async function newSession(env: Env, userId: string): Promise<string> {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), userId, now + SESSION_DAYS * 86_400_000),
  ]);
  return token;
}

async function currentUser(req: Request, env: Env): Promise<{ id: string; username: string; tokenHash: string }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Inicia sesión');
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare('SELECT u.id AS id, u.username AS username, s.expires_at AS exp FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
    .bind(tokenHash)
    .first<{ id: string; username: string; exp: number }>();
  if (!row || row.exp < Date.now()) throw new HttpError(401, 'La sesión ha caducado: vuelve a entrar');
  return { id: row.id, username: row.username, tokenHash };
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

async function register(req: Request, env: Env) {
  if (env.ALLOW_SIGNUP === 'false') throw new HttpError(403, 'El registro de cuentas nuevas está cerrado');
  const { username, password, id } = credentials(await readJson(req));
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>())?.n ?? 0;
  if (count >= Number(env.MAX_USERS ?? 20)) throw new HttpError(403, 'No se admiten más cuentas en esta instalación');
  if (await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(id).first()) throw new HttpError(409, 'Ese usuario ya existe: entra con tu contraseña');
  await env.DB.prepare('INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)').bind(id, username, await hashPassword(password), Date.now()).run();
  return json({ token: await newSession(env, id), username });
}

async function login(req: Request, env: Env) {
  const { password, id } = credentials(await readJson(req));
  const now = Date.now();
  const attempt = await env.DB.prepare('SELECT fails, locked_until FROM login_attempts WHERE user_id = ?').bind(id).first<{ fails: number; locked_until: number }>();
  if (attempt && attempt.locked_until > now) {
    const min = Math.ceil((attempt.locked_until - now) / 60_000);
    throw new HttpError(429, `Demasiados intentos. Espera ${min} min y vuelve a probar`);
  }
  const user = await env.DB.prepare('SELECT id, username, password FROM users WHERE id = ?').bind(id).first<{ id: string; username: string; password: string }>();
  const ok = user ? await verifyPassword(password, user.password) : (await pbkdf2(password, new Uint8Array(16), ITERATIONS), false);
  if (!ok || !user) {
    const fails = (attempt?.fails ?? 0) + 1;
    const lock = fails >= 5 ? now + Math.min(60, 2 ** (fails - 5) * 5) * 60_000 : 0;
    await env.DB.prepare('INSERT INTO login_attempts (user_id, fails, locked_until) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until')
      .bind(id, fails, lock)
      .run();
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE user_id = ?').bind(id).run();
  return json({ token: await newSession(env, user.id), username: user.username });
}

async function saveProject(req: Request, env: Env, userId: string, id: string) {
  const body = await readJson<{ meta?: unknown; parts?: unknown; version?: unknown }>(req);
  const parts = body.parts;
  const version = Number(body.version);
  if (!Array.isArray(parts) || !parts.length || parts.some((p) => typeof p !== 'string' || p.length > MAX_PART) || !Number.isFinite(version)) throw new HttpError(400, 'Proyecto no válido');
  const meta = JSON.stringify(body.meta ?? {});
  if (meta.length > 400_000) throw new HttpError(400, 'Ficha del proyecto demasiado grande');
  const size = (parts as string[]).reduce((s, p) => s + p.length, 0);
  if (size > MAX_PROJECT_BYTES) throw new HttpError(413, 'El proyecto es demasiado grande (quita modelos importados pesados)');
  const used = (await env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS s FROM projects WHERE user_id = ? AND id != ?').bind(userId, id).first<{ s: number }>())?.s ?? 0;
  if (used + size > MAX_USER_BYTES) throw new HttpError(413, 'Has llenado el espacio de tu cuenta: borra algún proyecto');
  const stmts: D1PreparedStatement[] = [env.DB.prepare('DELETE FROM project_parts WHERE user_id = ? AND project_id = ?').bind(userId, id)];
  (parts as string[]).forEach((p, i) => stmts.push(env.DB.prepare('INSERT INTO project_parts (user_id, project_id, idx, data) VALUES (?, ?, ?, ?)').bind(userId, id, i, p)));
  stmts.push(
    env.DB.prepare(
      'INSERT INTO projects (user_id, id, meta, version, parts, size, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, id) DO UPDATE SET meta = excluded.meta, version = excluded.version, parts = excluded.parts, size = excluded.size, updated_at = excluded.updated_at',
    ).bind(userId, id, meta, version, parts.length, size, Date.now()),
  );
  // batch = transacción: o se guarda todo o nada.
  await env.DB.batch(stmts);
  return json({ ok: true });
}

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method.toUpperCase();
  if (path === '/api/health') return json({ ok: true, accounts: true, signup: env.ALLOW_SIGNUP !== 'false' });
  if (method !== 'GET' && method !== 'HEAD' && req.headers.get('content-type')?.includes('application/json') !== true) throw new HttpError(415, 'Se esperaba JSON');
  await ensureSchema(env.DB);
  if (path === '/api/register' && method === 'POST') return register(req, env);
  if (path === '/api/login' && method === 'POST') return login(req, env);
  const user = await currentUser(req, env);
  if (path === '/api/me' && method === 'GET') return json({ username: user.username });
  if (path === '/api/logout' && method === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.tokenHash).run();
    return json({ ok: true });
  }
  if (path === '/api/projects' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT meta FROM projects WHERE user_id = ? ORDER BY updated_at DESC').bind(user.id).all<{ meta: string }>();
    return json(rows.results.map((r) => JSON.parse(r.meta)));
  }
  const m = /^\/api\/projects\/([^/]+)$/.exec(path);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (!PROJECT_ID.test(id)) throw new HttpError(400, 'Identificador no válido');
    if (method === 'GET') {
      const p = await env.DB.prepare('SELECT version, parts FROM projects WHERE user_id = ? AND id = ?').bind(user.id, id).first<{ version: number; parts: number }>();
      if (!p) throw new HttpError(404, 'No se ha encontrado el proyecto');
      const rows = await env.DB.prepare('SELECT data FROM project_parts WHERE user_id = ? AND project_id = ? ORDER BY idx').bind(user.id, id).all<{ data: string }>();
      if (rows.results.length !== p.parts) throw new HttpError(500, 'El proyecto guardado está incompleto');
      return json({ version: p.version, parts: rows.results.map((r) => r.data) });
    }
    if (method === 'PUT') return saveProject(req, env, user.id, id);
    if (method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM project_parts WHERE user_id = ? AND project_id = ?').bind(user.id, id),
        env.DB.prepare('DELETE FROM projects WHERE user_id = ? AND id = ?').bind(user.id, id),
      ]);
      return json({ ok: true });
    }
  }
  throw new HttpError(404, 'Ruta no encontrada');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      if (!env.DB) throw new HttpError(503, 'La base de datos no está configurada');
      return await handle(req, env);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Error del servidor' }, 500);
    }
  },
};
