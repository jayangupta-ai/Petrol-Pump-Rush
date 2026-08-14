import type { CSSProperties } from "react";
import { FUEL_INFO, type FuelType } from "@/lib/game";

interface PumpViewProps {
  fuel: FuelType;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function PumpArt({ fuel, uid }: { fuel: FuelType; uid: string }) {
  const info = FUEL_INFO[fuel];
  const canopy = `pump-canopy-${uid}`;
  const body = `pump-body-${uid}`;
  const screenGlow = `pump-screen-glow-${uid}`;

  return (
    <svg viewBox="0 0 84 148" className="pump-svg" aria-hidden="true">
      <defs>
        <linearGradient id={canopy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={info.color} />
          <stop offset="1" stopColor={info.color} stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ccd6dd" />
        </linearGradient>
        <radialGradient id={screenGlow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={info.color} stopOpacity="0.55" />
          <stop offset="1" stopColor={info.color} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="6" y="132" width="72" height="10" rx="3" fill="#2f3640" />
      <rect x="10" y="130" width="64" height="4" rx="2" fill="#57606f" />

      <path
        d="M66 70 C88 76 90 102 74 118 C70 122 66 120 66 116 C70 112 74 104 72 96 C70 88 68 84 66 82 Z"
        fill="#57606f"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.8"
      />
      <rect
        x="68"
        y="113"
        width="10"
        height="9"
        rx="3"
        fill="#2f3640"
        transform="rotate(-28 73 117)"
      />

      <rect x="10" y="24" width="64" height="106" rx="9" fill={`url(#${body})`} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <rect x="14" y="28" width="22" height="98" rx="6" fill="rgba(255,255,255,0.35)" />

      <rect x="4" y="6" width="76" height="20" rx="7" fill={`url(#${canopy})`} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <rect x="9" y="10" width="66" height="12" rx="5" fill="rgba(0,0,0,0.18)" />
      <text x="42" y="20.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" letterSpacing="2">
        {info.label.toUpperCase()}
      </text>

      <rect x="24" y="46" width="36" height="34" rx="6" fill="#1c2733" stroke={info.color} strokeWidth="1.6" />
      <rect x="26" y="48" width="32" height="30" rx="4" fill={`url(#${screenGlow})`} />
      <text x="42" y="72" textAnchor="middle" fontSize="27" fontWeight="900" fill={info.color}>
        {info.badge}
      </text>

      <rect x="28" y="86" width="28" height="8" rx="2" fill="#222f3e" />
      <rect x="31" y="88" width="22" height="4" rx="1.5" fill="#2ecc71" opacity="0.9" />

      <rect x="16" y="102" width="8" height="22" rx="3" fill={info.color} opacity="0.9" />
      <rect x="60" y="102" width="8" height="22" rx="3" fill={info.color} opacity="0.9" />

      <rect x="22" y="24" width="40" height="4" rx="2" fill="rgba(255,255,255,0.8)" />
    </svg>
  );
}

export default function PumpView({ fuel, selected, disabled, onSelect }: PumpViewProps) {
  const info = FUEL_INFO[fuel];
  return (
    <button
      type="button"
      className={`pump ${selected ? "selected" : ""}`}
      style={{ "--pump-color": info.color } as CSSProperties}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${info.label} pump`}
    >
      <PumpArt fuel={fuel} uid={fuel} />
    </button>
  );
}
