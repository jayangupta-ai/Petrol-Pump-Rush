"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  createInitialState,
  FUEL_INFO,
  FUELS,
  fillProgressOf,
  getQueueCap,
  getQueueIndex,
  getSpawnIntervalMs,
  isFillEnabled,
  isFilling,
  PUMP_X,
  reducer,
  STAGE_H,
  STAGE_W,
  TICK_MS,
  type GameState,
} from "@/lib/game";
import {
  initAudio,
  playClick,
  playExplosion,
  playError,
  playGameOver,
  playGood,
  playLevelUp,
  playPerfect,
  playSpill,
  playStart,
  setMuted,
} from "@/lib/sound";
import {
  DEFAULT_SETTINGS,
  hasSeenTutorial,
  loadSettings,
  markTutorialSeen,
  saveSettings,
  type Settings,
} from "@/lib/settings";
import CarView from "./CarView";
import PumpView from "./PumpView";
import AttendantView from "./AttendantView";
import Hud from "./Hud";
import GameOverOverlay from "./GameOverOverlay";
import StartScreen from "./StartScreen";
import SettingsOverlay from "./SettingsOverlay";
import TutorialOverlay from "./TutorialOverlay";
import "../app/game.css";

const HIGH_SCORE_KEY = "petrol-pump-rush:high-score";

function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function init(): GameState {
  return createInitialState();
}

function deriveStatus(state: GameState, attendedCarId: number | null): string {
  if (state.status === "START") return "Welcome! Press Start when you're ready.";
  if (state.status === "GAME_OVER") return "The pump is destroyed. Restart to play again.";
  if (state.fillingCarId != null) {
    return "Holding… release near 100% for max points!";
  }
  if (attendedCarId != null) {
    if (state.selectedPump != null) {
      return `Fill ${FUEL_INFO[state.selectedPump].label} into the attended car`;
    }
    return "Select a pump for the attended car";
  }
  return "Click a waiting car to attend it";
}

export default function Game() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tutorialSeen = useRef(true);

  const prevStatus = useRef(state.status);
  const prevLevel = useRef(state.level);
  const lastToastId = useRef(0);

  // Load persisted preferences (sound, motion) and high score after mount to
  // avoid SSR hydration mismatches.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
    dispatch({ type: "LOAD_HIGH_SCORE", value: loadHighScore() });
    tutorialSeen.current = hasSeenTutorial();
  }, []);

  // Apply settings globally.
  useEffect(() => {
    setMuted(!settings.sound);
    saveSettings(settings);
    document.documentElement.dataset.reducedMotion = settings.reducedMotion
      ? "true"
      : "false";
  }, [settings]);

  // Game tick loop (also expires toasts/popups in GAME_OVER).
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "TICK" }), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const queuedCount = state.cars.filter(
    (c) => c.phase === "ENTERING" || c.phase === "WAITING"
  ).length;
  const canSpawn =
    state.status === "PLAYING" && queuedCount < getQueueCap(state.level);

  useEffect(() => {
    if (!canSpawn) return;
    const id = window.setInterval(
      () => dispatch({ type: "SPAWN_CAR" }),
      getSpawnIntervalMs(state.level)
    );
    return () => window.clearInterval(id);
  }, [canSpawn, state.level]);

  // Seed a small starting queue each time a game begins.
  useEffect(() => {
    if (prevStatus.current !== "PLAYING" && state.status === "PLAYING") {
      dispatch({ type: "SPAWN_CAR" });
      dispatch({ type: "SPAWN_CAR" });
    }
    prevStatus.current = state.status;
  }, [state.status]);

  // Sound effects driven by state changes.
  useEffect(() => {
    const fresh = state.toasts.filter((t) => t.id > lastToastId.current);
    for (const toast of fresh) {
      switch (toast.kind) {
        case "perfect":
          playPerfect();
          break;
        case "spill":
          playSpill();
          break;
        case "success":
          playGood();
          break;
        case "error":
          playError();
          break;
        case "warning":
          playExplosion();
          break;
        default:
          break;
      }
    }
    if (fresh.length > 0) {
      lastToastId.current = Math.max(
        ...fresh.map((t) => t.id),
        lastToastId.current
      );
    }
    if (state.level > prevLevel.current && state.status === "PLAYING") {
      playLevelUp();
    }
    if (prevStatus.current !== "GAME_OVER" && state.status === "GAME_OVER") {
      playGameOver();
    }
    prevLevel.current = state.level;
  }, [state]);

  // High score persistence.
  useEffect(() => {
    if (state.status === "GAME_OVER") {
      try {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
      } catch {
        /* ignore storage failures */
      }
    }
  }, [state.status, state.highScore]);

  // Responsive scale of the fixed-size stage.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const avail = el.clientWidth - 24;
      setScale(Math.min(1, Math.max(0.4, avail / STAGE_W)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const handleFillStart = () => {
    if (isFillEnabled(state)) {
      playClick();
      dispatch({ type: "START_FILL" });
    }
  };

  const handleFillEnd = () => {
    if (isFilling(state)) dispatch({ type: "RELEASE_FILL" });
  };

  // Keep the latest handlers available to the keyboard listeners without
  // re-registering them on every render.
  const fillHandlersRef = useRef({ onFillStart: handleFillStart, onFillEnd: handleFillEnd });
  useEffect(() => {
    fillHandlersRef.current = { onFillStart: handleFillStart, onFillEnd: handleFillEnd };
  });

  // Keyboard: Space to hold / release the nozzle.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (e.repeat) return;
      e.preventDefault();
      fillHandlersRef.current.onFillStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      fillHandlersRef.current.onFillEnd();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const startGame = () => {
    initAudio();
    if (!tutorialSeen.current) {
      setTutorialOpen(true);
      return;
    }
    dispatch({ type: "START_GAME" });
    playStart();
  };

  const finishTutorial = () => {
    tutorialSeen.current = true;
    markTutorialSeen();
    setTutorialOpen(false);
    dispatch({ type: "START_GAME" });
    playStart();
  };

  const updateSettings = (next: Settings) => {
    setSettings(next);
    if (!next.sound) setMuted(true);
  };

  const filling = isFilling(state);
  const fillProgress = fillProgressOf(state);
  const canFill = isFillEnabled(state);

  return (
    <div
      className="game-wrap"
      data-reduced-motion={settings.reducedMotion ? "true" : "false"}
    >
      <header className="game-header">
        <h1>Petrol Pump Rush</h1>
        {state.status === "PLAYING" && (
          <span className="level-badge">Level {state.level}</span>
        )}
      </header>

      <Hud
        score={state.score}
        highScore={state.highScore}
        wrongFuelCount={state.wrongFuelCount}
        level={state.level}
        levelProgress={Math.min(1, state.levelElapsedMs / 25000)}
        carsServed={state.carsServed}
        statusText={deriveStatus(state, state.attendedCarId)}
        toasts={state.toasts}
        status={state.status}
        canFill={canFill}
        fillActive={filling}
        fillProgress={fillProgress}
        soundOn={settings.sound}
        onFillStart={handleFillStart}
        onFillEnd={handleFillEnd}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="game-scroll" ref={scrollRef}>
        <div
          className="stage-scale"
          style={{ width: STAGE_W * scale, height: STAGE_H * scale }}
        >
          <div
            className="stage"
            style={{
              width: STAGE_W,
              height: STAGE_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="stage-sky" />
            <div className="stage-skyline" aria-hidden="true">
              <svg
                viewBox="0 0 900 170"
                preserveAspectRatio="none"
                width="100%"
                height="100%"
              >
                <rect x="0" y="96" width="70" height="74" fill="#232b47" />
                <rect x="80" y="60" width="64" height="110" fill="#252e4d" />
                <rect x="154" y="110" width="90" height="60" fill="#1f2740" />
                <rect x="254" y="40" width="54" height="130" fill="#283250" />
                <rect x="318" y="88" width="120" height="82" fill="#222a46" />
                <rect x="448" y="56" width="70" height="114" fill="#2a3454" />
                <rect x="528" y="118" width="96" height="52" fill="#1e2640" />
                <rect x="634" y="70" width="58" height="100" fill="#27304e" />
                <rect x="702" y="104" width="88" height="66" fill="#212943" />
                <rect x="800" y="44" width="100" height="126" fill="#2b3553" />
              </svg>
            </div>

            <div className="road-band" />
            <div className="lane-line" />

            <div className="station-canopy" aria-hidden="true">
              <div className="canopy-roof">
                <span className="canopy-sign">PETROL PUMP RUSH</span>
              </div>
              <span className="canopy-light cl1" />
              <span className="canopy-light cl2" />
              <span className="canopy-light cl3" />
              <span className="canopy-col cc1" />
              <span className="canopy-col cc2" />
            </div>

            <div className="attended-label">Attended bay</div>

            {state.cars.map((car) => (
              <CarView
                key={car.id}
                car={car}
                queueIndex={getQueueIndex(state, car.id)}
                attended={car.id === state.attendedCarId}
                onAttend={() => {
                  playClick();
                  dispatch({ type: "ATTEND_CAR", id: car.id });
                }}
                onEntered={() => dispatch({ type: "CAR_ENTERED", id: car.id })}
              />
            ))}

            {state.attendedCarId != null &&
              state.cars.some((c) => c.id === state.attendedCarId) && (
                <AttendantView />
              )}

            {FUELS.map((fuel) => (
              <div key={fuel} className="pump-slot" style={{ left: PUMP_X[fuel] - 48 }}>
                <PumpView
                  fuel={fuel}
                  selected={state.selectedPump === fuel}
                  disabled={state.status !== "PLAYING" || state.attendedCarId == null}
                  onSelect={() => {
                    playClick();
                    dispatch({ type: "SELECT_PUMP", pump: fuel });
                  }}
                />
              </div>
            ))}

            {state.popups.map((p) => (
              <div
                key={p.id}
                className="stage-popup"
                style={{ left: p.x, top: p.y, color: p.color }}
              >
                {p.text}
              </div>
            ))}

            <div className="legend">
              {FUELS.map((fuel) => (
                <span key={fuel} className="legend-item">
                  <span
                    className="legend-dot"
                    style={{ background: FUEL_INFO[fuel].color }}
                  />
                  {FUEL_INFO[fuel].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="game-footer">
        Attend a car, pick its pump, hold <b>Fill Fuel</b> and release near 100%.
        Level up every 25 seconds. First 3 wrong fuels cost points — the 4th blows
        up the car. <b>Space</b> also works to fill.
      </footer>

      {state.status === "START" && (
        <StartScreen
          highScore={state.highScore}
          onStart={startGame}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {state.status === "GAME_OVER" && (
        <GameOverOverlay
          score={state.score}
          highScore={state.highScore}
          wrongFuelCount={state.wrongFuelCount}
          level={state.level}
          carsServed={state.carsServed}
          onRestart={() => dispatch({ type: "START_GAME" })}
        />
      )}

      {tutorialOpen && (
        <TutorialOverlay
          onComplete={finishTutorial}
          onSkip={finishTutorial}
        />
      )}

      {settingsOpen && (
        <SettingsOverlay
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
