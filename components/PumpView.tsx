import type { CSSProperties } from "react";
import { FUEL_INFO, type FuelType } from "@/lib/game";

interface PumpViewProps {
  fuel: FuelType;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
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
      <span className="pump-canopy" />
      <span className="pump-body">
        <span className="pump-screen">{info.badge}</span>
        <span className="pump-nozzle" />
      </span>
      <span className="pump-label">{info.label}</span>
    </button>
  );
}
