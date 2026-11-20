import { createContext, useContext, useEffect, useRef } from 'react';
import type { Vec2 } from '@/core/geometry';
import type { ID } from '@/modules/FloorPlan/types';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { type SnapResult, snapPoint } from './snapping';
import type { Size } from './viewport';

export interface PlanPointer {
  world: Vec2;
  screen: Vec2;
  button: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
}

/** Manejadores que cada herramienta registra en el lienzo. */
export interface ToolHandlers {
  onPointerDown?: (p: PlanPointer) => void;
  onPointerMove?: (p: PlanPointer) => void;
  onPointerUp?: (p: PlanPointer) => void;
  onDoubleClick?: (p: PlanPointer) => void;
  /** Clic derecho sin arrastrar. */
  onContextClick?: (p: PlanPointer) => void;
  /** Devuelve true si la herramienta consume la tecla. */
  onKeyDown?: (e: KeyboardEvent) => boolean;
  onLeave?: () => void;
  cursor?: string;
}

export interface PlanContextValue {
  zoom: number;
  size: Size;
  levelId: ID;
  register: (h: ToolHandlers | null) => void;
}

export const PlanContext = createContext<PlanContextValue | null>(null);

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan fuera del lienzo');
  return ctx;
}

/** Registra los manejadores de la herramienta activa (siempre con la versión más reciente). */
export function useTool(handlers: ToolHandlers): void {
  const { register } = usePlan();
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const proxy: ToolHandlers = {
      onPointerDown: (p) => ref.current.onPointerDown?.(p),
      onPointerMove: (p) => ref.current.onPointerMove?.(p),
      onPointerUp: (p) => ref.current.onPointerUp?.(p),
      onDoubleClick: (p) => ref.current.onDoubleClick?.(p),
      onContextClick: (p) => ref.current.onContextClick?.(p),
      onKeyDown: (e) => ref.current.onKeyDown?.(e) ?? false,
      onLeave: () => ref.current.onLeave?.(),
      get cursor() {
        return ref.current.cursor;
      },
    };
    register(proxy);
    return () => register(null);
  }, [register]);
}

export interface SnapRequest {
  anchor?: Vec2 | null;
  constrain?: boolean;
  free?: boolean;
  excludePoints?: Vec2[];
  /** Usar el documento base del gesto en curso (al arrastrar). */
  useGestureBase?: boolean;
}

/** Ajusta un punto con las preferencias actuales del usuario. */
export function snapWorld(world: Vec2, zoom: number, levelId: ID, req: SnapRequest = {}): SnapResult {
  const ed = useEditorStore.getState();
  const ps = useProjectStore.getState();
  const doc = req.useGestureBase && ps.gestureBase ? ps.gestureBase : ps.doc;
  return snapPoint(world, {
    doc,
    levelId,
    zoom,
    gridSize: ed.gridSize,
    snapGrid: ed.snapToGrid,
    snapObjects: ed.snapToObjects,
    anchor: req.anchor,
    constrain: req.constrain,
    free: req.free,
    excludePoints: req.excludePoints,
  });
}
