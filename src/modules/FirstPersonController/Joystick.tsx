import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useWalkStore, walkInput } from './walkStore';

const R = 56;

/** Joystick virtual para moverse con el dedo (y botones de subir/bajar en cámara libre). */
export function Joystick({ free }: { free: boolean }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 });
  const id = useRef<number | null>(null);

  const update = (cx: number, cy: number) => {
    let dx = cx - center.current.x;
    let dy = cy - center.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    walkInput.x = dx / R;
    walkInput.y = dy / R;
  };
  const release = () => {
    id.current = null;
    setKnob({ x: 0, y: 0 });
    walkInput.x = 0;
    walkInput.y = 0;
  };
  const hold = (v: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      walkInput.up = v;
    },
    onPointerUp: () => (walkInput.up = 0),
    onPointerCancel: () => (walkInput.up = 0),
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 flex items-end justify-between px-5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div
        role="application"
        aria-label="Joystick de movimiento"
        className="pointer-events-auto relative touch-none rounded-full border border-white/40 bg-slate-900/25 backdrop-blur-sm"
        style={{ width: R * 2 + 24, height: R * 2 + 24 }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          id.current = e.pointerId;
          useWalkStore.getState().set({ interacted: true });
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => id.current === e.pointerId && update(e.clientX, e.clientY)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/85 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      {free && (
        <div className="pointer-events-auto flex flex-col gap-2">
          <button type="button" aria-label="Subir" className="flex h-14 w-14 touch-none items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-sm" {...hold(1)}>
            <ChevronUp size={26} />
          </button>
          <button type="button" aria-label="Bajar" className="flex h-14 w-14 touch-none items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-sm" {...hold(-1)}>
            <ChevronDown size={26} />
          </button>
        </div>
      )}
    </div>
  );
}
