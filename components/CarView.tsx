import type { CSSProperties } from "react";
import { FUEL_INFO, getCarPosition, type Car } from "@/lib/game";

interface CarViewProps {
  car: Car;
  queueIndex: number;
  attended: boolean;
  onAttend: () => void;
  onEntered: () => void;
}

function CarArt({ car, uid }: { car: Car; uid: string }) {
  const paint = `car-paint-${uid}`;
  const paintDark = `car-paint-dark-${uid}`;
  const glass = `car-glass-${uid}`;
  const lighten = (hex: string, amt: number): string => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + amt);
    const g = Math.min(255, ((n >> 8) & 255) + amt);
    const b = Math.min(255, (n & 255) + amt);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };

  return (
    <svg viewBox="0 0 120 60" className="car-svg" aria-hidden="true">
      <defs>
        <linearGradient id={paint} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(car.color, 60)} />
          <stop offset="0.55" stopColor={car.color} />
          <stop offset="1" stopColor={lighten(car.color, -40)} />
        </linearGradient>
        <linearGradient id={paintDark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={car.color} />
          <stop offset="1" stopColor={lighten(car.color, -70)} />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6f3ff" />
          <stop offset="1" stopColor="#7fa8c9" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="56.5" rx="49" ry="3.6" fill="rgba(0,0,0,0.4)" />

      <path
        d="M8 40.5 C8 32 14 24 26 23 L36 22.6 C42 14 54 9 70 9 L82 9 C96 9 102 14 107 22 L110 22.4 C114 23 117 26 117 30 L117 36 C117 40 115 41.5 111 41.5 L103 41.5 C101 44.5 92 47 82 47 L47 47 C38 47 29 44.6 27 41.5 L13 41.5 C10 41.5 8 42.5 8 40.5 Z"
        fill={`url(#${paint})`}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="1.1"
      />
      <path
        d="M10 41.5 L105 41.5 C107 42 109 44 109 46.5 L109 47.6 C109 49.4 107 50 105 50 L91 50 C90 52.4 81 54 72 54 L49 54 C40 54 31 52.4 30 50 L15 50 C12 50 10 49.4 10 47.6 Z"
        fill={`url(#${paintDark})`}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="0.8"
      />

      <path
        d="M38 23 C44 16.5 55 12.5 68 12.5 L79 12.5 C89 12.5 95 15.5 99 21 L91 22.6 C86 18.4 79 16 70 16 L55 16 C48 16 42 19 39 23 Z"
        fill={`url(#${glass})`}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
      <path
        d="M20 23 C24 18 32 14.6 40 14 L36 22.6 Z"
        fill={`url(#${glass})`}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />

      <path
        d="M30 22 L84 22 C90 22 93 23.5 94.5 25 L30 25 Z"
        fill="rgba(255,255,255,0.28)"
      />

      <line x1="70" y1="23.5" x2="70" y2="46" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <rect x="72.5" y="31" width="6" height="2.6" rx="1.3" fill="rgba(0,0,0,0.5)" />

      <circle cx="28" cy="46" r="11.5" fill="#181e24" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
      <circle cx="28" cy="46" r="5.6" fill="#2f3640" />
      <circle cx="28" cy="46" r="2.2" fill="#7f8c8d" />
      <circle cx="92" cy="46" r="11.5" fill="#181e24" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
      <circle cx="92" cy="46" r="5.6" fill="#2f3640" />
      <circle cx="92" cy="46" r="2.2" fill="#7f8c8d" />

      <rect x="112" y="29" width="6" height="5.4" rx="1.8" fill="#fff3c4" />
      <rect x="5" y="30" width="5.5" height="5.4" rx="1.8" fill="#ff5f5f" />
      <rect x="5.6" y="39" width="4.5" height="4.4" rx="1.5" fill="#ffb3b3" />
    </svg>
  );
}

export default function CarView({
  car,
  queueIndex,
  attended,
  onAttend,
  onEntered,
}: CarViewProps) {
  const pos = getCarPosition(car, queueIndex);
  const info = FUEL_INFO[car.fuel];
  const phaseClass = `car-${car.phase.toLowerCase()}`;

  return (
    <div
      className={`car-slot ${phaseClass} ${attended ? "is-attended" : ""}`}
      style={
        {
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`,
          zIndex: pos.z,
        } as CSSProperties
      }
    >
      <div
        className="car"
        style={{ "--car-color": car.color } as CSSProperties}
        onClick={onAttend}
        onAnimationEnd={onEntered}
        title={`Requests ${info.label}`}
      >
        <CarArt car={car} uid={String(car.id)} />
        <div
          className="fuel-dot"
          style={{ background: info.color }}
          title={info.label}
        />
        {attended && (
          <div className="request-bubble" style={{ borderColor: info.color }}>
            <span className="fuel-chip" style={{ background: info.color }}>
              {info.badge}
            </span>
            {info.label}
          </div>
        )}
        {car.phase === "FUELING" && (
          <div className="fill-bar">
            <div
              className="fill-bar-inner"
              style={{ width: `${Math.min(100, car.fillProgress)}%` }}
            />
          </div>
        )}
        {car.phase === "EXPLODING" && <div className="boom" />}
      </div>
    </div>
  );
}
