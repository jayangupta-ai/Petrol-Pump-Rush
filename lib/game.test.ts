import { describe, expect, it } from "vitest";
import {
  createInitialState,
  DEPART_TIME_MS,
  ENTER_TIME_MS,
  EXPLOSION_TIME_MS,
  FILL_TIME_MS,
  getLevelMultiplier,
  getQueueCap,
  getSpawnIntervalMs,
  LEVEL_MS,
  MAX_QUEUE,
  PENALTY_WRONG,
  PERFECT_BONUS,
  reducer,
  REWARD_CORRECT,
  scoreFill,
  TICK_MS,
  WRONG_FUEL_LIMIT,
  type FuelType,
  type GameState,
} from "./game";

const T0 = 1_000_000;

function playing(): GameState {
  return reducer(createInitialState(), { type: "START_GAME" });
}

function enterWaiting(state: GameState, id: number): GameState {
  let next = reducer(state, { type: "CAR_ENTERED", id });
  next = reducer(next, { type: "ATTEND_CAR", id });
  return next;
}

/** Spawn, attend, route to the correct pump, and hold-fill until the given progress. */
function fill(state: GameState, fuel: FuelType, progress: number, now = T0): GameState {
  let s = reducer(state, { type: "SPAWN_CAR", fuel, now });
  const id = s.cars[s.cars.length - 1].id;
  s = enterWaiting(s, id);
  s = reducer(s, { type: "SELECT_PUMP", pump: fuel, now });
  s = reducer(s, { type: "START_FILL", now });
  const end = now + (progress / 100) * FILL_TIME_MS;
  s = reducer(s, { type: "TICK", now: end });
  return reducer(s, { type: "RELEASE_FILL", now: end });
}

describe("spawning", () => {
  it("spawns a car with the requested fuel as ENTERING", () => {
    const state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    expect(state.cars).toHaveLength(1);
    expect(state.cars[0].fuel).toBe("PETROL");
    expect(state.cars[0].phase).toBe("ENTERING");
  });

  it("respects the queue capacity limit", () => {
    let state = playing();
    for (let i = 0; i < MAX_QUEUE + 2; i++) {
      state = reducer(state, { type: "SPAWN_CAR", fuel: "PETROL", now: T0 });
    }
    const queued = state.cars.filter(
      (c) => c.phase === "ENTERING" || c.phase === "WAITING"
    ).length;
    expect(queued).toBeLessThanOrEqual(MAX_QUEUE);
  });

  it("turns an ENTERING car into WAITING after the entry duration", () => {
    let state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "CNG",
      now: T0,
    });
    state = reducer(state, {
      type: "TICK",
      now: T0 + ENTER_TIME_MS + 10,
    });
    expect(state.cars[0].phase).toBe("WAITING");
  });
});

describe("start game", () => {
  it("begins in START and START_GAME enters PLAYING with a fresh game", () => {
    const initial = createInitialState();
    expect(initial.status).toBe("START");
    const state = reducer(initial, { type: "START_GAME" });
    expect(state.status).toBe("PLAYING");
    expect(state.level).toBe(1);
    expect(state.score).toBe(0);
    expect(state.cars).toHaveLength(0);
  });
});

describe("hold-to-fill mechanics", () => {
  it("moves the attended car to FUELING at the pump on START_FILL", () => {
    let state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "DIESEL",
      now: T0,
    });
    state = enterWaiting(state, 1);
    expect(state.attendedCarId).toBe(1);
    expect(state.cars[0].phase).toBe("ATTENDED");

    state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL", now: T0 });
    expect(state.cars[0].phase).toBe("MOVING");
    expect(state.cars[0].pumpId).toBe("DIESEL");

    state = reducer(state, { type: "START_FILL", now: T0 });
    expect(state.cars[0].phase).toBe("FUELING");
    expect(state.cars[0].pumpId).toBe("DIESEL");
    expect(state.fillingCarId).toBe(1);
    expect(state.score).toBe(0);
  });

  it("scores a PERFECT fill released at 95%", () => {
    const state = fill(playing(), "PETROL", 95);
    expect(state.score).toBe(REWARD_CORRECT + PERFECT_BONUS);
    expect(state.cars[0].phase).toBe("DEPARTING");
    expect(state.carsServed).toBe(1);
  });

  it("scores a GOOD fill released at 70%", () => {
    const state = fill(playing(), "DIESEL", 70);
    expect(state.score).toBe(REWARD_CORRECT);
  });

  it("scores partial points for an early release at 30%", () => {
    const state = fill(playing(), "CNG", 30);
    expect(state.score).toBe(Math.floor((REWARD_CORRECT * 30) / 60));
  });

  it("penalizes overflow past 100% without ending the game", () => {
    const state = fill(playing(), "PETROL", 110);
    expect(state.score).toBe(
      Math.floor(REWARD_CORRECT * (1 - (110 - 100) / 30))
    );
    expect(state.status).toBe("PLAYING");
    expect(state.cars[0].phase).toBe("DEPARTING");
  });

  it("auto-releases with a spill when the tank overflows past the cap", () => {
    let state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    state = enterWaiting(state, 1);
    state = reducer(state, { type: "SELECT_PUMP", pump: "PETROL", now: T0 });
    state = reducer(state, { type: "START_FILL", now: T0 });
    state = reducer(state, {
      type: "TICK",
      now: T0 + FILL_TIME_MS * 1.6,
    });
    expect(state.cars[0].phase).toBe("DEPARTING");
    expect(state.fillingCarId).toBeNull();
    expect(state.score).toBe(0);
    expect(state.toasts.some((t) => t.kind === "spill")).toBe(true);
  });

  it("completes fueling, departs the car, then removes it", () => {
    let state = fill(playing(), "PETROL", 100);
    expect(state.cars[0].phase).toBe("DEPARTING");

    state = reducer(state, {
      type: "TICK",
      now: T0 + FILL_TIME_MS + DEPART_TIME_MS + 10,
    });
    expect(state.cars).toHaveLength(0);
  });

  it("scoreFill covers every accuracy band", () => {
    expect(scoreFill(100, 1)).toEqual({ result: "PERFECT", points: 150 });
    expect(scoreFill(90, 1)).toEqual({ result: "PERFECT", points: 150 });
    expect(scoreFill(60, 1).result).toBe("GOOD");
    expect(scoreFill(30, 1).result).toBe("PARTIAL");
    expect(scoreFill(130, 1).result).toBe("SPILL");
    expect(scoreFill(100, 1).points).toBeLessThan(scoreFill(100, 2).points);
  });

  it("is a no-op to start filling with no attended car or pump selected", () => {
    let state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    state = reducer(state, { type: "TICK", now: T0 + 5000 });
    const before = reducer(state, { type: "START_FILL", now: T0 + 5000 });
    expect(before.score).toBe(0);
    expect(before.cars[0].phase).toBe("WAITING");
    expect(before.fillingCarId).toBeNull();
  });
});

describe("wrong fueling", () => {
  function threeWrongFuels(): GameState {
    let state = playing();
    state = reducer(state, { type: "SPAWN_CAR", fuel: "PETROL", now: T0 });
    state = enterWaiting(state, 1);
    for (let i = 0; i < WRONG_FUEL_LIMIT; i++) {
      state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL", now: T0 + i });
      state = reducer(state, { type: "START_FILL", now: T0 + i });
    }
    return state;
  }

  it("applies a penalty and increments wrongFuelCount without ending the game", () => {
    let next = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    next = enterWaiting(next, 1);
    next = reducer(next, { type: "SELECT_PUMP", pump: "DIESEL", now: T0 });
    next = reducer(next, { type: "START_FILL", now: T0 });

    expect(next.wrongFuelCount).toBe(1);
    expect(next.score).toBe(0);
    expect(next.status).toBe("PLAYING");
    expect(next.cars[0].phase).toBe("ATTENDED");
  });

  it("allows the first three wrong attempts while the game continues", () => {
    const state = threeWrongFuels();
    expect(state.wrongFuelCount).toBe(WRONG_FUEL_LIMIT);
    expect(state.status).toBe("PLAYING");
  });

  it("explodes the car and triggers game over on the 4th wrong attempt", () => {
    let state = threeWrongFuels();
    state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL", now: T0 + 100 });
    state = reducer(state, { type: "START_FILL", now: T0 + 100 });
    expect(state.wrongFuelCount).toBe(WRONG_FUEL_LIMIT + 1);
    expect(state.cars[0].phase).toBe("EXPLODING");
    expect(state.status).toBe("PLAYING");

    state = reducer(state, {
      type: "TICK",
      now: T0 + 100 + EXPLOSION_TIME_MS + 10,
    });
    expect(state.status).toBe("GAME_OVER");
    expect(state.score).toBe(0);
  });

  it("never drops the score below zero", () => {
    let state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "CNG",
      now: T0,
    });
    state = enterWaiting(state, 1);
    for (let i = 0; i < WRONG_FUEL_LIMIT + 1; i++) {
      state = reducer(state, { type: "SELECT_PUMP", pump: "PETROL", now: T0 + i });
      state = reducer(state, { type: "START_FILL", now: T0 + i });
    }
    expect(state.score).toBe(0);
  });
});

describe("attending", () => {
  it("releases a previously attended car back into the queue", () => {
    let state = reducer(playing(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    state = reducer(state, { type: "SPAWN_CAR", fuel: "CNG", now: T0 });
    state = reducer(state, { type: "CAR_ENTERED", id: 1 });
    state = reducer(state, { type: "CAR_ENTERED", id: 2 });

    state = reducer(state, { type: "ATTEND_CAR", id: 1 });
    expect(state.attendedCarId).toBe(1);
    expect(state.cars.find((c) => c.id === 1)?.phase).toBe("ATTENDED");

    state = reducer(state, { type: "ATTEND_CAR", id: 2 });
    expect(state.attendedCarId).toBe(2);
    expect(state.cars.find((c) => c.id === 1)?.phase).toBe("WAITING");
  });
});

describe("progression", () => {
  it("raises the level after LEVEL_MS of play and resets the timer", () => {
    let state = playing();
    const steps = LEVEL_MS / TICK_MS;
    for (let i = 0; i < steps; i++) {
      state = reducer(state, { type: "TICK", now: T0 + (i + 1) * TICK_MS });
    }
    expect(state.level).toBe(2);
    expect(state.levelElapsedMs).toBe(0);
  });

  it("spawn interval shrinks and queue cap grows with level", () => {
    expect(getSpawnIntervalMs(4)).toBeLessThan(getSpawnIntervalMs(1));
    expect(getSpawnIntervalMs(1)).toBeGreaterThanOrEqual(getSpawnIntervalMs(8));
    expect(getQueueCap(1)).toBe(MAX_QUEUE);
    expect(getQueueCap(9)).toBe(8);
    expect(getLevelMultiplier(1)).toBe(1);
    expect(getLevelMultiplier(2)).toBe(1.1);
  });
});

describe("high score and restart", () => {
  it("records the high score at game over", () => {
    let state = playing();
    let now = T0;
    state = fill(state, "PETROL", 70, now);
    state = fill(state, "DIESEL", 70, (now += 2000));
    state = fill(state, "CNG", 70, (now += 2000));
    expect(state.score).toBe(3 * REWARD_CORRECT);

    for (let i = 0; i < 4; i++) {
      now += 2000;
      state = reducer(state, { type: "SPAWN_CAR", fuel: "PETROL", now });
      const id = state.cars[state.cars.length - 1].id;
      state = reducer(state, { type: "CAR_ENTERED", id });
      state = reducer(state, { type: "ATTEND_CAR", id });
      state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL", now });
      state = reducer(state, { type: "START_FILL", now });
    }
    expect(state.score).toBe(3 * REWARD_CORRECT - 4 * PENALTY_WRONG);

    state = reducer(state, {
      type: "TICK",
      now: now + EXPLOSION_TIME_MS + 100,
    });
    expect(state.status).toBe("GAME_OVER");
    expect(state.highScore).toBe(100);
  });

  it("restarts with a clean game while keeping the high score", () => {
    let state = playing();
    state = { ...state, highScore: 500 };
    state = reducer(state, { type: "START_GAME" });
    expect(state.status).toBe("PLAYING");
    expect(state.score).toBe(0);
    expect(state.wrongFuelCount).toBe(0);
    expect(state.cars).toHaveLength(0);
    expect(state.level).toBe(1);
    expect(state.highScore).toBe(500);
  });

  it("loads a persisted high score without lowering an existing one", () => {
    let state = playing();
    state = reducer(state, { type: "LOAD_HIGH_SCORE", value: 0 });
    expect(state.highScore).toBe(0);
    state = reducer(state, { type: "LOAD_HIGH_SCORE", value: 250 });
    expect(state.highScore).toBe(250);
    state = reducer(state, { type: "LOAD_HIGH_SCORE", value: 100 });
    expect(state.highScore).toBe(250);
    state = { ...state, highScore: 400 };
    state = reducer(state, { type: "LOAD_HIGH_SCORE", value: 300 });
    expect(state.highScore).toBe(400);
  });
});
