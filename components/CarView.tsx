import type { CSSProperties } from "react";
import { FUEL_INFO, getCarPosition, type Car } from "@/lib/game";

interface CarViewProps {
  car: Car;
  queueIndex: number;
  attended: boolean;
  onAttend: () => void;
  onEntered: () => void;
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
        <div className="car-body">
          <div className="car-roof" />
        </div>
        <div className="car-window" />
        <div className="car-wheel w1" />
        <div className="car-wheel w2" />
        <div className="fuel-dot" style={{ background: info.color }} />
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
            <div className="fill-bar-inner" style={{ width: `${car.fillProgress}%` }} />
          </div>
        )}
        {car.phase === "EXPLODING" && <div className="boom" />}
      </div>
    </div>
  );
}
