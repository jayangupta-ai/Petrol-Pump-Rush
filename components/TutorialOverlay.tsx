import { useState } from "react";

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Step {
  title: string;
  body: string;
  visual: string;
}

const STEPS: Step[] = [
  {
    title: "Attend a car",
    body: "Click any waiting car in the queue to bring it to the attended bay. Its fuel request is revealed.",
    visual: "tut-attend",
  },
  {
    title: "Pick the right pump",
    body: "Click the pump that matches the car's fuel. The car drives there automatically. Wrong pump = strike!",
    visual: "tut-pump",
  },
  {
    title: "Hold to fill",
    body: "Hold the Fill Fuel button to pump. The tank bar rises fast. Release near 100% for a perfect score — overfilling spills points!",
    visual: "tut-fill",
  },
  {
    title: "Don't blow it",
    body: "Three wrong fuels give you strikes. The fourth wrong fuel explodes the car and ends your run. Level up every 25 seconds for bigger queues and faster pumps!",
    visual: "tut-boom",
  },
];

export default function TutorialOverlay({
  onComplete,
  onSkip,
}: TutorialOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="overlay tutorial-overlay" role="dialog" aria-modal="true">
      <div className="tutorial-card">
        <p className="tutorial-step">Step {index + 1} of {STEPS.length}</p>
        <div className={`tutorial-visual ${step.visual}`}>
          <div className="tv-road" />
          <div className="tv-car" />
          <div className="tv-pump" />
          <div className="tv-chip">{index + 1}</div>
        </div>
        <h2 className="tutorial-title">{step.title}</h2>
        <p className="tutorial-body">{step.body}</p>

        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tut-dot ${i === index ? "active" : ""}`} />
          ))}
        </div>

        <div className="tutorial-actions">
          <button type="button" className="tut-skip" onClick={onSkip}>
            Skip
          </button>
          <button
            type="button"
            className="tut-next"
            onClick={() => (isLast ? onComplete() : setIndex(index + 1))}
          >
            {isLast ? "Start Game" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
