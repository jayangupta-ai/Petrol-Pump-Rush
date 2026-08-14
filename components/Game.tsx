"use client";

import { useEffect, useReducer, useRef } from "react";
import {
  createInitialState,
  FUEL_INFO,
  FUELS,
  getQueueIndex,
  isFillEnabled,
  MAX_QUEUE,
  PUMP_X,
  reducer,
  SPAWN_INTERVAL_MS,
  STAGE_H,
  STAGE_W,
  TICK_MS,
  type GameState,
} from "@/lib/game";
import CarView from "./CarView";
import PumpView from "./PumpView";
import Hud from "./Hud";
import GameOverOverlay from "./GameOverOverlay";
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
  return { ...createInitialState(), highScore: loadHighScore() };
}

function deriveStatus(state: GameState, attendedCarId: number | null): string {
  if (state.status === "GAME_OVER") return "The pump is destroyed. Restart to play again.";
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
  const seeded = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "TICK" }), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const queuedCount = state.cars.filter(
    (c) => c.phase === "ENTERING" || c.phase === "WAITING"
  ).length;
  const canSpawn = state.status === "PLAYING" && queuedCount < MAX_QUEUE;
  useEffect(() => {
    if (!canSpawn) return;
    const id = window.setInterval(
      () => dispatch({ type: "SPAWN_CAR" }),
      SPAWN_INTERVAL_MS
    );
    return () => window.clearInterval(id);
  }, [canSpawn]);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    dispatch({ type: "SPAWN_CAR" });
    dispatch({ type: "SPAWN_CAR" });
  }, []);

  useEffect(() => {
    if (state.status === "GAME_OVER") {
      try {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
      } catch {
        /* ignore storage failures */
      }
    }
  }, [state.status, state.highScore]);

  return (
    <div className="game-wrap">
      <header className="game-header">
        <h1>Petrol Pump Rush</h1>
      </header>

      <Hud
        score={state.score}
        highScore={state.highScore}
        wrongFuelCount={state.wrongFuelCount}
        statusText={deriveStatus(state, state.attendedCarId)}
        toasts={state.toasts}
        canFill={isFillEnabled(state)}
        onFill={() => dispatch({ type: "FILL_FUEL" })}
        status={state.status}
      />

      <div className="game-scroll">
        <div className="stage" style={{ width: STAGE_W, height: STAGE_H }}>
          <div className="road-band" />
          <div className="lane-line" />

          <div className="attended-label">Attended bay</div>

          {state.cars.map((car) => (
            <CarView
              key={car.id}
              car={car}
              queueIndex={getQueueIndex(state, car.id)}
              attended={car.id === state.attendedCarId}
              onAttend={() => dispatch({ type: "ATTEND_CAR", id: car.id })}
              onEntered={() => dispatch({ type: "CAR_ENTERED", id: car.id })}
            />
          ))}

          {FUELS.map((fuel) => (
            <div key={fuel} className="pump-slot" style={{ left: PUMP_X[fuel] - 48 }}>
              <PumpView
                fuel={fuel}
                selected={state.selectedPump === fuel}
                disabled={state.status !== "PLAYING" || state.attendedCarId == null}
                onSelect={() => dispatch({ type: "SELECT_PUMP", pump: fuel })}
              />
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

      <footer className="game-footer">
        Attend a car, pick its pump, then hit <b>Fill Fuel</b>. First 3 wrong fuels cost
        points - the 4th blows up the car.
      </footer>

      {state.status === "GAME_OVER" && (
        <GameOverOverlay
          score={state.score}
          highScore={state.highScore}
          wrongFuelCount={state.wrongFuelCount}
          onRestart={() => dispatch({ type: "RESTART" })}
        />
      )}
    </div>
  );
}
