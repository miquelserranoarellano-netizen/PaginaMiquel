import { useSyncExternalStore } from 'react';

/** Suscripción a una media query (se actualiza al girar el móvil o redimensionar). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Pantalla estrecha (móvil o tableta en vertical): interfaz compacta con paneles deslizables. */
export const COMPACT_QUERY = '(max-width: 900px)';
export const useCompact = (): boolean => useMediaQuery(COMPACT_QUERY);

/** Dispositivo táctil como puntero principal. */
export const isTouchDevice = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
export const useTouch = (): boolean => useMediaQuery('(pointer: coarse)');
