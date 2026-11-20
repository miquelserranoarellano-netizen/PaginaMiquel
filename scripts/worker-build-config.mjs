// Se ejecuta antes de compilar. Solo en Cloudflare Workers Builds (WORKERS_CI=1):
// si en Settings → Build → Variables and secrets existen SUPABASE_URL y
// SUPABASE_SERVICE_KEY, las incluye en el servidor para que también funcionen
// desde ahí. En local no hace nada (así la clave nunca acaba en el repositorio).
import { writeFileSync } from 'node:fs';

const url = (process.env.SUPABASE_URL ?? '').trim();
const key = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();

if (process.env.WORKERS_CI !== '1') {
  process.exit(0);
}
if (!url || !key) {
  console.log('[supabase] Sin SUPABASE_URL / SUPABASE_SERVICE_KEY en las variables de compilación');
  process.exit(0);
}
const file = new URL('../worker/build-config.ts', import.meta.url);
writeFileSync(
  file,
  `// Generado al compilar en Cloudflare. No se guarda en el repositorio.\n` +
    `export const BUILD_CONFIG: { SUPABASE_URL?: string; SUPABASE_SERVICE_KEY?: string } = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key })};\n`,
);
console.log(`[supabase] Configuración incluida en el servidor (URL ${url.replace(/^(https?:\/\/[^/]+).*$/, '$1')}…, clave de ${key.length} caracteres)`);
