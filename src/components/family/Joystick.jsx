import { useRef, useState } from 'react';

export default function Joystick({ onMove }) {
  const baseRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);
  const center = useRef({ x: 0, y: 0 });
  const RADIUS = 42;

  const start = (e) => {
    e.preventDefault();
    const rect = baseRef.current.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    active.current = true;
    move(e);
  };

  const move = (e) => {
    if (!active.current) return;
    e.preventDefault();
    let dx = e.clientX - center.current.x;
    let dy = e.clientY - center.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS; }
    setKnob({ x: dx, y: dy });
    onMove(dx / RADIUS, dy / RADIUS);
  };

  const end = (e) => {
    e?.preventDefault?.();
    active.current = false;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      className="absolute bottom-8 left-6 w-28 h-28 rounded-full bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center touch-none z-20 shadow-lg"
    >
      <div className="w-12 h-12 rounded-full bg-white/90 shadow-md" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}