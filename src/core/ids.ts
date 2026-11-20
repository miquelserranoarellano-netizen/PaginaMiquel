let counter = 0;

/** Genera un identificador corto y único (prefijo legible + aleatorio + contador). */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}${counter.toString(36)}`;
}
