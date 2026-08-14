interface GameOverOverlayProps {
  score: number;
  highScore: number;
  wrongFuelCount: number;
  onRestart: () => void;
}

export default function GameOverOverlay({
  score,
  highScore,
  wrongFuelCount,
  onRestart,
}: GameOverOverlayProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlay-card">
        <h2 className="overlay-title">Game Over</h2>
        <p className="overlay-subtitle">A car exploded at your pump!</p>
        <div className="overlay-stats">
          <div className="overlay-stat">
            <span>Score</span>
            <b>{score}</b>
          </div>
          <div className="overlay-stat">
            <span>High Score</span>
            <b>{highScore}</b>
          </div>
          <div className="overlay-stat">
            <span>Wrong Fuels</span>
            <b>{wrongFuelCount}</b>
          </div>
        </div>
        <button type="button" className="restart-btn" onClick={onRestart}>
          Restart Game
        </button>
      </div>
    </div>
  );
}
