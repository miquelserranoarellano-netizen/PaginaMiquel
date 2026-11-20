/**
 * Almacenes de cuentas y proyectos del Worker:
 *  - SupabaseStore: tablas hd_* de un proyecto de Supabase (supabase/cuentas.sql),
 *    a través de su API REST con la clave secreta (solo existe en el servidor).
 *  - D1Store: base de datos D1 de Cloudflare (la que se usa si Supabase no está
 *    configurado). Al pasar a Supabase, las cuentas de D1 se copian solas.
 */

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface UserRow {
  id: string;
  username: string;
  password: string;
  created_at: number;
}
export interface Attempt {
  fails: number;
  locked_until: number;
}
export interface StoredProject {
  id: string;
  meta: unknown;
  version: number;
  parts: string[];
  size: number;
}

export class StoreError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}

export interface Store {
  readonly kind: 'supabase' | 'd1';
  check(): Promise<void>;
  getUser(id: string): Promise<UserRow | null>;
  countUsers(): Promise<number>;
  /** false si el usuario ya existía. */
  createUser(u: UserRow): Promise<boolean>;
  getAttempt(id: string): Promise<Attempt | null>;
  setAttempt(id: string, a: Attempt): Promise<void>;
  clearAttempts(id: string): Promise<void>;
  createSession(tokenHash: string, userId: string, expiresAt: number): Promise<void>;
  getSession(tokenHash: string): Promise<{ user_id: string; expires_at: number } | null>;
  deleteSession(tokenHash: string): Promise<void>;
  listProjects(userId: string): Promise<unknown[]>;
  getProject(userId: string, id: string): Promise<{ version: number; parts: string[] } | null>;
  usedBytes(userId: string, exceptId: string): Promise<number>;
  saveProject(userId: string, p: StoredProject): Promise<void>;
  deleteProject(userId: string, id: string): Promise<void>;
  exportProjects(userId: string): Promise<StoredProject[]>;
}

// ── Supabase ───────────────────────────────────────────────────────────────

/**
 * URL de la API del proyecto. Acepta también la dirección del panel
 * (supabase.com/dashboard/project/<ref>) o solo la referencia del proyecto.
 */
export function supabaseApiUrl(raw: string): string {
  const u = raw.trim();
  const dash = /supabase\.com\/dashboard\/project\/([a-z0-9]{10,40})/i.exec(u);
  if (dash) return `https://${dash[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{10,40}$/i.test(u)) return `https://${u.toLowerCase()}.supabase.co`;
  return u
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
    .replace(/^(?!https?:\/\/)/, 'https://');
}

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private base: string;
  constructor(
    url: string,
    private key: string,
  ) {
    this.base = `${supabaseApiUrl(url)}/rest/v1/`;
  }

  private async req<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<{ data: T; res: Response }> {
    const headers: Record<string, string> = { apikey: this.key, 'content-type': 'application/json', accept: 'application/json' };
    // Clave antigua (JWT service_role): también va en Authorization. Las nuevas (sb_secret_…) solo en apikey.
    if (this.key.split('.').length === 3) headers.authorization = `Bearer ${this.key}`;
    if (init.prefer) headers.prefer = init.prefer;
    let res: Response;
    try {
      res = await fetch(this.base + path, { ...init, headers });
    } catch {
      throw new StoreError('No se puede conectar con Supabase: revisa SUPABASE_URL');
    }
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const e = (data ?? {}) as { code?: string; message?: string };
      if (res.status === 401 || res.status === 403) throw new StoreError('Supabase rechaza la clave: revisa SUPABASE_SERVICE_KEY (la clave secreta / service_role)');
      if (e.code === 'PGRST205' || e.code === '42P01' || /does not exist|Could not find the table/i.test(e.message ?? '')) throw new StoreError('Faltan las tablas en Supabase: ejecuta supabase/cuentas.sql en el SQL Editor');
      if (e.code === '23505') throw new StoreError('duplicate', 409);
      throw new StoreError(`Supabase: ${e.message ?? res.statusText}`);
    }
    return { data: data as T, res };
  }

  private q = (v: string) => encodeURIComponent(v);

  async check() {
    await this.req('hd_users?select=id&limit=1');
  }
  async getUser(id: string) {
    const { data } = await this.req<UserRow[]>(`hd_users?id=eq.${this.q(id)}&select=id,username,password,created_at`);
    return data[0] ?? null;
  }
  async countUsers() {
    const { res } = await this.req<unknown[]>('hd_users?select=id&limit=1', { prefer: 'count=exact' });
    return Number(res.headers.get('content-range')?.split('/')[1] ?? 0) || 0;
  }
  async createUser(u: UserRow) {
    try {
      await this.req('hd_users', { method: 'POST', body: JSON.stringify(u), prefer: 'return=minimal' });
      return true;
    } catch (e) {
      if (e instanceof StoreError && e.status === 409) return false;
      throw e;
    }
  }
  async getAttempt(id: string) {
    const { data } = await this.req<Attempt[]>(`hd_login_attempts?user_id=eq.${this.q(id)}&select=fails,locked_until`);
    return data[0] ?? null;
  }
  async setAttempt(id: string, a: Attempt) {
    await this.req('hd_login_attempts', { method: 'POST', body: JSON.stringify({ user_id: id, ...a }), prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  async clearAttempts(id: string) {
    await this.req(`hd_login_attempts?user_id=eq.${this.q(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
  }
  async createSession(tokenHash: string, userId: string, expiresAt: number) {
    await this.req(`hd_sessions?expires_at=lt.${Date.now()}`, { method: 'DELETE', prefer: 'return=minimal' });
    await this.req('hd_sessions', { method: 'POST', body: JSON.stringify({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt }), prefer: 'return=minimal' });
  }
  async getSession(tokenHash: string) {
    const { data } = await this.req<{ user_id: string; expires_at: number }[]>(`hd_sessions?token_hash=eq.${this.q(tokenHash)}&select=user_id,expires_at`);
    return data[0] ?? null;
  }
  async deleteSession(tokenHash: string) {
    await this.req(`hd_sessions?token_hash=eq.${this.q(tokenHash)}`, { method: 'DELETE', prefer: 'return=minimal' });
  }
  async listProjects(userId: string) {
    const { data } = await this.req<{ meta: unknown }[]>(`hd_projects?user_id=eq.${this.q(userId)}&select=meta&order=updated_at.desc`);
    return data.map((r) => r.meta);
  }
  async getProject(userId: string, id: string) {
    const { data } = await this.req<{ version: number; parts: string[] }[]>(`hd_projects?user_id=eq.${this.q(userId)}&id=eq.${this.q(id)}&select=version,parts`);
    return data[0] ?? null;
  }
  async usedBytes(userId: string, exceptId: string) {
    const { data } = await this.req<{ size: number }[]>(`hd_projects?user_id=eq.${this.q(userId)}&id=neq.${this.q(exceptId)}&select=size`);
    return data.reduce((s, r) => s + (Number(r.size) || 0), 0);
  }
  async saveProject(userId: string, p: StoredProject) {
    const name = String((p.meta as { name?: unknown })?.name ?? '').slice(0, 200);
    // Una sola fila por proyecto: el guardado es atómico.
    await this.req('hd_projects?on_conflict=user_id,id', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, id: p.id, name, meta: p.meta, version: p.version, parts: p.parts, size: p.size, updated_at: Date.now() }),
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }
  async deleteProject(userId: string, id: string) {
    await this.req(`hd_projects?user_id=eq.${this.q(userId)}&id=eq.${this.q(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
  }
  async exportProjects(userId: string) {
    const { data } = await this.req<StoredProject[]>(`hd_projects?user_id=eq.${this.q(userId)}&select=id,meta,version,parts,size`);
    return data;
  }
}

// ── D1 ─────────────────────────────────────────────────────────────────────

const D1_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (user_id TEXT PRIMARY KEY, fails INTEGER NOT NULL, locked_until INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS projects (user_id TEXT NOT NULL, id TEXT NOT NULL, meta TEXT NOT NULL, version INTEGER NOT NULL, parts INTEGER NOT NULL, size INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, id))`,
  `CREATE TABLE IF NOT EXISTS project_parts (user_id TEXT NOT NULL, project_id TEXT NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (user_id, project_id, idx))`,
];
let d1Ready: Promise<void> | null = null;

export class D1Store implements Store {
  readonly kind = 'd1' as const;
  constructor(private db: D1Database) {}

  private ready() {
    return (d1Ready ??= this.db
      .batch(D1_SCHEMA.map((s) => this.db.prepare(s)))
      .then(() => undefined)
      .catch((e) => {
        d1Ready = null;
        throw e;
      }));
  }
  async check() {
    await this.ready();
  }
  async getUser(id: string) {
    await this.ready();
    return this.db.prepare('SELECT id, username, password, created_at FROM users WHERE id = ?').bind(id).first<UserRow>();
  }
  async countUsers() {
    await this.ready();
    return (await this.db.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>())?.n ?? 0;
  }
  async createUser(u: UserRow) {
    await this.ready();
    if (await this.db.prepare('SELECT 1 FROM users WHERE id = ?').bind(u.id).first()) return false;
    await this.db.prepare('INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)').bind(u.id, u.username, u.password, u.created_at).run();
    return true;
  }
  async getAttempt(id: string) {
    await this.ready();
    return this.db.prepare('SELECT fails, locked_until FROM login_attempts WHERE user_id = ?').bind(id).first<Attempt>();
  }
  async setAttempt(id: string, a: Attempt) {
    await this.db
      .prepare('INSERT INTO login_attempts (user_id, fails, locked_until) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until')
      .bind(id, a.fails, a.locked_until)
      .run();
  }
  async clearAttempts(id: string) {
    await this.db.prepare('DELETE FROM login_attempts WHERE user_id = ?').bind(id).run();
  }
  async createSession(tokenHash: string, userId: string, expiresAt: number) {
    await this.ready();
    await this.db.batch([
      this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
      this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(tokenHash, userId, expiresAt),
    ]);
  }
  async getSession(tokenHash: string) {
    await this.ready();
    return this.db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').bind(tokenHash).first<{ user_id: string; expires_at: number }>();
  }
  async deleteSession(tokenHash: string) {
    await this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  async listProjects(userId: string) {
    await this.ready();
    const rows = await this.db.prepare('SELECT meta FROM projects WHERE user_id = ? ORDER BY updated_at DESC').bind(userId).all<{ meta: string }>();
    return rows.results.map((r) => JSON.parse(r.meta) as unknown);
  }
  async getProject(userId: string, id: string) {
    await this.ready();
    const p = await this.db.prepare('SELECT version, parts FROM projects WHERE user_id = ? AND id = ?').bind(userId, id).first<{ version: number; parts: number }>();
    if (!p) return null;
    const rows = await this.db.prepare('SELECT data FROM project_parts WHERE user_id = ? AND project_id = ? ORDER BY idx').bind(userId, id).all<{ data: string }>();
    if (rows.results.length !== p.parts) throw new StoreError('El proyecto guardado está incompleto', 500);
    return { version: p.version, parts: rows.results.map((r) => r.data) };
  }
  async usedBytes(userId: string, exceptId: string) {
    await this.ready();
    return (await this.db.prepare('SELECT COALESCE(SUM(size), 0) AS s FROM projects WHERE user_id = ? AND id != ?').bind(userId, exceptId).first<{ s: number }>())?.s ?? 0;
  }
  async saveProject(userId: string, p: StoredProject) {
    await this.ready();
    const stmts: D1PreparedStatement[] = [this.db.prepare('DELETE FROM project_parts WHERE user_id = ? AND project_id = ?').bind(userId, p.id)];
    p.parts.forEach((d, i) => stmts.push(this.db.prepare('INSERT INTO project_parts (user_id, project_id, idx, data) VALUES (?, ?, ?, ?)').bind(userId, p.id, i, d)));
    stmts.push(
      this.db
        .prepare(
          'INSERT INTO projects (user_id, id, meta, version, parts, size, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, id) DO UPDATE SET meta = excluded.meta, version = excluded.version, parts = excluded.parts, size = excluded.size, updated_at = excluded.updated_at',
        )
        .bind(userId, p.id, JSON.stringify(p.meta), p.version, p.parts.length, p.size, Date.now()),
    );
    // batch = transacción: o se guarda todo o nada.
    await this.db.batch(stmts);
  }
  async deleteProject(userId: string, id: string) {
    await this.db.batch([
      this.db.prepare('DELETE FROM project_parts WHERE user_id = ? AND project_id = ?').bind(userId, id),
      this.db.prepare('DELETE FROM projects WHERE user_id = ? AND id = ?').bind(userId, id),
    ]);
  }
  async exportProjects(userId: string) {
    await this.ready();
    const rows = await this.db.prepare('SELECT id, meta, version, size FROM projects WHERE user_id = ?').bind(userId).all<{ id: string; meta: string; version: number; size: number }>();
    const out: StoredProject[] = [];
    for (const r of rows.results) {
      const p = await this.getProject(userId, r.id).catch(() => null);
      if (p) out.push({ id: r.id, meta: JSON.parse(r.meta), version: r.version, parts: p.parts, size: r.size });
    }
    return out;
  }
}
