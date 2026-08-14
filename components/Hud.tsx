import { WRONG_FUEL_LIMIT, type GameStatus, type Toast } from "@/lib/game";

interface HudProps {
  score: number;
  highScore: number;
  wrongFuelCount: number;
  level: number;
  levelProgress: number;
  carsServed: number;
  statusText: string;
  toasts: Toast[];
  canFill: boolean;
  fillActive: boolean;
  fillProgress: number;
  soundOn: boolean;
  status: GameStatus;
  onFillStart: () => void;
  onFillEnd: () => void;
  onOpenSettings: () => void;
}

const TOAST_CLASS: Record<Toast["kind"], string> = {
  success: "toast-success",
  error: "toast-error",
  warning: "toast-warning",
  info: "toast-info",
  perfect: "toast-perfect",
  spill: "toast-spill",
};

export default function Hud({
  score,
  highScore,
  wrongFuelCount,
  level,
  levelProgress,
  carsServed,
  statusText,
  toasts,
  canFill,
  fillActive,
  fillProgress,
  soundOn,
  status,
  onFillStart,
  onFillEnd,
  onOpenSettings,
}: HudProps) {
  const warningsLeft = Math.max(0, WRONG_FUEL_LIMIT - wrongFuelCount);
  const fillLocked = !canFill && !fillActive;
  const fillLabel = fillActive
    ? `Filling… ${fillProgress}%`
    : canFill
      ? "Fill Fuel"
      : "Fill Fuel";

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-stats">
          <div className="stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">High Score</span>
            <span className="stat-value">{highScore}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Served</span>
            <span className="stat-value">{carsServed}</span>
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

        <div className="hud-controls">
          <div className="level-meter" title={`Level ${level}`}>
            <span className="level-meter-label">LV {level}</span>
            <span className="level-meter-bar">
              <span
                className="level-meter-fill"
                style={{ width: `${Math.round(levelProgress * 100)}%` }}
              />
            </span>
          </div>
          <button
            type="button"
            className="gear-btn"
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.4 13a7.6 7.6 0 0 0 .1-1c0-.3 0-.7-.1-1l2.1-1.7a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.6 7.6 0 0 0-1.7-1L14.4 2a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L2.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.7a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6c0 .3.2.4.5.4h4c.3 0 .5-.1.5-.4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
              />
            </svg>
            {!soundOn && <span className="sound-off-mark">/</span>}
          </button>
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
          className={`fill-btn ${fillActive ? "filling" : ""}`}
          onClick={() => undefined}
          onPointerDown={(e) => {
            e.preventDefault();
            onFillStart();
          }}
          onPointerUp={onFillEnd}
          onPointerCancel={onFillEnd}
          onPointerLeave={fillActive ? onFillEnd : undefined}
          onContextMenu={(e) => e.preventDefault()}
          disabled={fillLocked}
          aria-label="Fill Fuel"
          style={{ touchAction: "none" }}
        >
          {fillLabel}
        </button>
        {fillActive && (
          <span className="fill-hint">
            release near 100% — overfilling spills!
          </span>
        )}
      </div>
    </div>
  );
}
