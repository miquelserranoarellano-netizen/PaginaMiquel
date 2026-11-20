/**
 * Lienzo del editor 2D: viewport (zoom/desplazamiento), cuadrícula, dibujo de la
 * planta, selección y herramienta activa.
 *
 * Ratón: rueda = zoom · botón central, botón derecho arrastrando o Espacio+arrastre = desplazar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Vec2 } from '@/core/geometry';
import { levelBBox, sortedLevels } from '@/modules/FloorPlan/queries';
import { getCatalogItem } from '@/modules/Furniture/catalog';
import { createFurniture } from '@/modules/Furniture/factory';
import { placeAgainstWall } from '@/modules/Furniture/placement';
import { useEditorStore, type Viewport2D } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { GridLayer } from './GridLayer';
import { PlanDrawing, UnderlayDrawing } from './PlanDrawing';
import { SelectionOverlay } from './SelectionOverlay';
import { type PlanContextValue, PlanContext, type PlanPointer, type ToolHandlers } from './toolContext';
import { type Size, MAX_ZOOM, MIN_ZOOM, fitBBox, screenToWorld, worldTransform, zoomAt } from './viewport';
import { SelectTool } from './tools/SelectTool';
import { WallTool } from './tools/WallTool';
import { RoomDetectTool, RoomPolyTool, RoomRectTool } from './tools/RoomTools';
import { OpeningTool } from './tools/OpeningTool';
import { MeasureTool } from './tools/MeasureTool';
import { FurnitureTool } from './tools/FurnitureTool';
import { PlanOverlays } from './PlanOverlays';
import { FurnitureGuides2D } from '@/modules/Furniture/FurnitureGuides2D';

export const DRAG_MIME = 'application/x-homedesign-catalog';

/** Última petición de encuadre atendida (persiste al cambiar de vista). */
let handledFit = -1;

function ActiveTool({ tool }: { tool: string }) {
  switch (tool) {
    case 'wall':
      return <WallTool />;
    case 'room-rect':
      return <RoomRectTool />;
    case 'room-poly':
      return <RoomPolyTool />;
    case 'room-detect':
      return <RoomDetectTool />;
    case 'opening':
      return <OpeningTool />;
    case 'measure':
      return <MeasureTool />;
    case 'furniture':
      return <FurnitureTool />;
    case 'pan':
      return null;
    default:
      return <SelectTool />;
  }
}

export function PlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const doc = useProjectStore((s) => s.doc);
  const { viewport, activeLevelId, tool, plan, selection, hover, fitRequest, gridSize } = useEditorStore(
    useShallow((s) => ({
      viewport: s.viewport,
      activeLevelId: s.activeLevelId,
      tool: s.tool,
      plan: s.plan,
      selection: s.selection,
      hover: s.hover,
      fitRequest: s.fitRequest,
      gridSize: s.gridSize,
    })),
  );
  const handlers = useRef<ToolHandlers | null>(null);
  const pan = useRef<{ start: Vec2; vp: Viewport2D; button: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [, forceCursor] = useState(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Tamaño del lienzo
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Encuadre: al abrir un proyecto (fitRequest) o con el botón "Encuadrar".
  useEffect(() => {
    if (!size.w || !size.h || handledFit === fitRequest) return;
    handledFit = fitRequest;
    const box = levelBBox(projectApi.doc, useEditorStore.getState().activeLevelId);
    if (box) useEditorStore.getState().setViewport(fitBBox(box, size, 70));
    else useEditorStore.getState().setViewport({ cx: 6, cy: 4, zoom: 55 });
  }, [size, fitRequest]);

  // Zoom con la rueda (listener no pasivo para poder bloquear el scroll)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const vp = useEditorStore.getState().viewport;
      const s = sizeRef.current;
      if (e.shiftKey && !e.ctrlKey) {
        useEditorStore.getState().setViewport({ ...vp, cx: vp.cx + (e.deltaY || e.deltaX) / vp.zoom });
        return;
      }
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015));
      useEditorStore.getState().setViewport(zoomAt(vp, s, { x: e.clientX - rect.left, y: e.clientY - rect.top }, factor));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Teclado: primero la herramienta activa, luego Espacio para desplazar.
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey) return;
      if (handlers.current?.onKeyDown?.(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const register = useCallback((h: ToolHandlers | null) => {
    handlers.current = h;
    forceCursor((n) => n + 1);
  }, []);

  // Gestos táctiles: dos dedos = zoom y desplazamiento; un dedo en vacío = desplazar.
  const touches = useRef(new Map<number, Vec2>());
  const pinch = useRef<{ d0: number; mid0: Vec2; vp0: Viewport2D } | null>(null);
  const touchBlocked = useRef(false);

  const toPointer = (e: React.PointerEvent | React.MouseEvent): PlanPointer => {
    const rect = svgRef.current!.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return {
      world: screenToWorld(useEditorStore.getState().viewport, sizeRef.current, screen),
      screen,
      button: e.button,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      touch: 'pointerType' in e && e.pointerType === 'touch',
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = toPointer(e);
    if (p.touch) {
      touches.current.set(e.pointerId, p.screen);
      if (touches.current.size === 2) {
        // Segundo dedo: se cancela la acción en curso y empieza el pellizco.
        if (useProjectStore.getState().gestureBase) projectApi.cancelGesture();
        handlers.current?.onCancel?.();
        pan.current = null;
        setPanning(false);
        const [a, b] = [...touches.current.values()];
        pinch.current = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vp0: useEditorStore.getState().viewport };
        touchBlocked.current = true;
        return;
      }
      if (touches.current.size > 2 || touchBlocked.current) return;
    }
    if (e.button === 1 || e.button === 2 || (e.button === 0 && (spaceDown || tool === 'pan'))) {
      pan.current = { start: p.screen, vp: useEditorStore.getState().viewport, button: e.button, moved: e.button !== 2 };
      if (e.button !== 2) setPanning(true);
      return;
    }
    const used = handlers.current?.onPointerDown?.(p);
    if (p.touch && used === false) pan.current = { start: p.screen, vp: useEditorStore.getState().viewport, button: 0, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toPointer(e);
    if (p.touch && touches.current.has(e.pointerId)) touches.current.set(e.pointerId, p.screen);
    const pz = pinch.current;
    if (pz && touches.current.size >= 2) {
      const [a, b] = [...touches.current.values()];
      const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pz.vp0.zoom * (d / pz.d0)));
      // El punto del plano que estaba bajo los dedos sigue bajo los dedos.
      const anchor = screenToWorld(pz.vp0, sizeRef.current, pz.mid0);
      useEditorStore.getState().setViewport({ zoom, cx: anchor.x - (mid.x - sizeRef.current.w / 2) / zoom, cy: anchor.y - (mid.y - sizeRef.current.h / 2) / zoom });
      return;
    }
    if (p.touch && touchBlocked.current) return;
    if (!p.touch) useEditorStore.getState().setCursor(p.world);
    const pn = pan.current;
    if (pn) {
      const dx = p.screen.x - pn.start.x;
      const dy = p.screen.y - pn.start.y;
      if (!pn.moved && Math.hypot(dx, dy) > 4) {
        pn.moved = true;
        setPanning(true);
      }
      if (pn.moved) useEditorStore.getState().setViewport({ ...pn.vp, cx: pn.vp.cx - dx / pn.vp.zoom, cy: pn.vp.cy - dy / pn.vp.zoom });
      return;
    }
    handlers.current?.onPointerMove?.(p);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = toPointer(e);
    if (p.touch) {
      touches.current.delete(e.pointerId);
      if (touches.current.size < 2) pinch.current = null;
      if (touchBlocked.current) {
        if (touches.current.size === 0) touchBlocked.current = false;
        return;
      }
    }
    const pn = pan.current;
    if (pn) {
      if (pn.button === 2 && !pn.moved) handlers.current?.onContextClick?.(p);
      pan.current = null;
      setPanning(false);
      return;
    }
    handlers.current?.onPointerUp?.(p);
  };

  // Arrastrar muebles desde la biblioteca
  const onDrop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(DRAG_MIME);
    const item = id ? getCatalogItem(id) : undefined;
    if (!item) return;
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const world = screenToWorld(useEditorStore.getState().viewport, sizeRef.current, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    const levelId = useEditorStore.getState().activeLevelId;
    const snapped = e.altKey ? null : placeAgainstWall(projectApi.doc, levelId, world, item.w, item.d, 0);
    const f = createFurniture(levelId, item, snapped?.position ?? world, snapped?.rotation ?? 0);
    projectApi.apply((d) => {
      d.furniture[f.id] = f;
    });
    useEditorStore.getState().setTool('select');
    useEditorStore.getState().select([{ kind: 'furniture', id: f.id }]);
  };

  const levels = sortedLevels(doc);
  const idx = levels.findIndex((l) => l.id === activeLevelId);
  const lower = idx > 0 ? levels[idx - 1] : null;
  const ctx: PlanContextValue = { zoom: viewport.zoom, size, levelId: activeLevelId, register };
  const cursor = panning ? 'grabbing' : spaceDown || tool === 'pan' ? 'grab' : (handlers.current?.cursor ?? 'default');

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={onDrop}
    >
      {size.w > 0 && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          className="plan-svg absolute inset-0 touch-none [-webkit-touch-callout:none]"
          style={{ cursor }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(e) => {
            touches.current.delete(e.pointerId);
            pinch.current = null;
            if (touches.current.size === 0) touchBlocked.current = false;
            pan.current = null;
            setPanning(false);
            if (useProjectStore.getState().gestureBase) projectApi.cancelGesture();
            handlers.current?.onCancel?.();
          }}
          onDoubleClick={(e) => handlers.current?.onDoubleClick?.(toPointer(e))}
          onPointerLeave={() => {
            useEditorStore.getState().setCursor(null);
            handlers.current?.onLeave?.();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <g transform={worldTransform(viewport, size)}>
            {plan.grid && <GridLayer vp={viewport} size={size} gridSize={gridSize} />}
            {plan.lowerLevel && lower && <UnderlayDrawing doc={doc} levelId={lower.id} />}
            <PlanDrawing doc={doc} levelId={activeLevelId} zoom={viewport.zoom} options={plan} />
            <FurnitureGuides2D doc={doc} selection={selection} zoom={viewport.zoom} />
            <SelectionOverlay doc={doc} selection={selection} hover={tool === 'select' ? hover : null} zoom={viewport.zoom} />
            <PlanContext.Provider value={ctx}>
              <ActiveTool key={tool} tool={tool} />
            </PlanContext.Provider>
          </g>
        </svg>
      )}
      <PlanOverlays size={size} />
    </div>
  );
}
