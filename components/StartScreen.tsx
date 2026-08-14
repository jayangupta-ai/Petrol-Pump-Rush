interface StartScreenProps {
  highScore: number;
  onStart: () => void;
  onOpenSettings: () => void;
}

export default function StartScreen({
  highScore,
  onStart,
  onOpenSettings,
}: StartScreenProps) {
  return (
    <div className="overlay start-overlay" role="dialog" aria-modal="true">
      <div className="start-card">
        <p className="start-kicker">Petrol Pump Rush</p>
        <h1 className="start-title">FUEL UP!</h1>
        <p className="start-subtitle">
          Attend cars, send them to the right pump, and hold the nozzle to fill —
          release near 100% for max points.
        </p>

        <div className="start-strip">
          <div className="mini-car mini-car-red" />
          <div className="mini-pump mini-pump-red" />
          <div className="mini-car mini-car-blue" />
          <div className="mini-pump mini-pump-green" />
          <div className="mini-car mini-car-gold" />
          <div className="mini-pump mini-pump-orange" />
        </div>

        <ul className="start-rules">
          <li>
            <span className="rule-num">1</span> Click a waiting car to see its fuel
          </li>
          <li>
            <span className="rule-num">2</span> Pick the matching pump to route the
            car
          </li>
          <li>
            <span className="rule-num">3</span> Hold <b>Fill Fuel</b> and release
            near 100%
          </li>
          <li>
            <span className="rule-num">4</span> 3 wrong fuels — the 4th explodes!
          </li>
        </ul>

        {highScore > 0 && (
          <p className="start-highscore">High Score: {highScore}</p>
        )}

        <button type="button" className="start-btn" onClick={onStart}>
          START GAME
        </button>

        <button
          type="button"
          className="settings-link"
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.4 13a7.6 7.6 0 0 0 .1-1c0-.3 0-.7-.1-1l2.1-1.7a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.6 7.6 0 0 0-1.7-1L14.4 2a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L2.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.7a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6c0 .3.2.4.5.4h4c.3 0 .5-.1.5-.4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
            />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}
