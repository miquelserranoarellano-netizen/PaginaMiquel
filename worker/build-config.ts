/**
 * Configuración del servidor que se añade al compilar en Cloudflare (Workers
 * Builds) a partir de las variables de la sección *Build* (ver
 * scripts/worker-build-config.mjs). En el repositorio está siempre vacía: no
 * escribas aquí ninguna clave. Las variables de *Variables and Secrets* del
 * Worker tienen prioridad sobre estas.
 */
export const BUILD_CONFIG: { SUPABASE_URL?: string; SUPABASE_SERVICE_KEY?: string } = {};
