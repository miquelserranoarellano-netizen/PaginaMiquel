/**
 * Acceso a las capacidades de la página cuando se abre dentro de Claude
 * (base de datos privada por usuario y análisis de imágenes con Claude).
 * Fuera de Claude todas devuelven null y la app funciona igual.
 */

export interface HostDocSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
export interface HostDocRef {
  id: string;
  get(): Promise<HostDocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  collection(path: string): HostCollection;
}
export interface HostCollection {
  doc(id: string): HostDocRef;
  get(): Promise<{ docs: HostDocSnap[] }>;
}
export interface HostDb {
  doc(path: string): HostDocRef;
  collection(path: string): HostCollection;
}
export interface HostUser {
  id(): Promise<string | null>;
}
export interface SampleError {
  code: string;
  message: string;
  text?: string;
}
export interface HostSample {
  (input: string, options?: Record<string, unknown>): Promise<{ text: string; truncated: boolean }>;
  json<T = unknown>(input: string, options?: Record<string, unknown>): Promise<T>;
  limits(): Promise<{ maxPromptBytes: number; images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
}

interface HostMap {
  db: HostDb;
  user: HostUser;
  sample: HostSample;
}

type ClaudeWindow = { claude?: { use?: (name: string) => Promise<unknown> } };

/** true si la página se está mostrando dentro de Claude. */
export const inClaude = (): boolean => typeof window !== 'undefined' && typeof (window as unknown as ClaudeWindow).claude?.use === 'function';

const cache = new Map<string, Promise<unknown>>();

/** Pide una capacidad; null si no existe en esta vista o no responde a tiempo. */
export function capability<K extends keyof HostMap>(name: K, timeoutMs = 12000): Promise<HostMap[K] | null> {
  if (!inClaude()) return Promise.resolve(null);
  let p = cache.get(name);
  if (!p) {
    const use = (window as unknown as ClaudeWindow).claude!.use!;
    p = Promise.race([use(name).catch(() => null), new Promise((r) => setTimeout(() => r(null), timeoutMs))]);
    cache.set(name, p);
  }
  return p as Promise<HostMap[K] | null>;
}

export const isSampleError = (e: unknown): e is SampleError => !!e && typeof e === 'object' && typeof (e as SampleError).code === 'string';
