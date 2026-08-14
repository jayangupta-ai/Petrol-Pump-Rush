import { WRONG_FUEL_LIMIT, type GameStatus, type Toast } from "@/lib/game";

interface HudProps {
  score: number;
  highScore: number;
  wrongFuelCount: number;
  statusText: string;
  toasts: Toast[];
  canFill: boolean;
  onFill: () => void;
  status: GameStatus;
}

const TOAST_CLASS: Record<Toast["kind"], string> = {
  success: "toast-success",
  error: "toast-error",
  warning: "toast-warning",
  info: "toast-info",
};

export default function Hud({
  score,
  highScore,
  wrongFuelCount,
  statusText,
  toasts,
  canFill,
  onFill,
  status,
}: HudProps) {
  const warningsLeft = Math.max(0, WRONG_FUEL_LIMIT - wrongFuelCount);

  return (
    <div className="hud">
      <div className="hud-stats">
        <div className="stat">
          <span className="stat-label">Score</span>
          <span className="stat-value">{score}</span>
        </div>
        <div className="stat">
          <span className="stat-label">High Score</span>
          <span className="stat-value">{highScore}</span>
        </div>
        <div className="stat stat-wrong" data-critical={wrongFuelCount > WRONG_FUEL_LIMIT - 1}>
          <span className="stat-label">Wrong Fuels</span>
          <span className="stat-value">
            {wrongFuelCount}
            <span className="warn-pips">
              {Array.from({ length: WRONG_FUEL_LIMIT }).map((_, i) => (
                <span
                  key={i}
                  className={`warn-pip ${i < wrongFuelCount ? "used" : ""}`}
                />
              ))}
              <span className="warn-extra" data-armed={warningsLeft === 0}>
                {warningsLeft === 0 ? "!" : ""}
              </span>
            </span>
          </span>
        </div>
      </div>

      <div className="hud-status">
        <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
        <span className="status-text">{statusText}</span>
      </div>

      <div className="hud-toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${TOAST_CLASS[toast.kind]}`}>
            {toast.text}
          </div>
        ))}
      </div>

      <div className="action-bar">
        <button
          type="button"
          className="fill-btn"
          onClick={onFill}
          disabled={!canFill}
        >
          Fill Fuel
        </button>
      </div>
    </div>
  );
}
