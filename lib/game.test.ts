import { describe, expect, it } from "vitest";
import {
  createInitialState,
  DEPART_TIME_MS,
  ENTER_TIME_MS,
  EXPLOSION_TIME_MS,
  FUEL_TIME_MS,
  MAX_QUEUE,
  PENALTY_WRONG,
  reducer,
  REWARD_CORRECT,
  WRONG_FUEL_LIMIT,
  type FuelType,
  type GameState,
} from "./game";

const T0 = 1_000_000;

function enterWaiting(state: GameState, id: number): GameState {
  let next = reducer(state, { type: "CAR_ENTERED", id });
  next = reducer(next, { type: "ATTEND_CAR", id });
  return next;
}

function correctFill(state: GameState, fuel: FuelType, now: number): GameState {
  let s = reducer(state, { type: "SPAWN_CAR", fuel, now });
  const id = s.cars[s.cars.length - 1].id;
  s = reducer(s, { type: "CAR_ENTERED", id });
  s = reducer(s, { type: "ATTEND_CAR", id });
  s = reducer(s, { type: "SELECT_PUMP", pump: fuel });
  return reducer(s, { type: "FILL_FUEL", now });
}

describe("spawning", () => {
  it("spawns a car with the requested fuel as ENTERING", () => {
    const state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    expect(state.cars).toHaveLength(1);
    expect(state.cars[0].fuel).toBe("PETROL");
    expect(state.cars[0].phase).toBe("ENTERING");
  });

  it("respects the queue capacity limit", () => {
    let state = createInitialState();
    for (let i = 0; i < MAX_QUEUE + 2; i++) {
      state = reducer(state, { type: "SPAWN_CAR", fuel: "PETROL", now: T0 });
    }
    const queued = state.cars.filter(
      (c) => c.phase === "ENTERING" || c.phase === "WAITING"
    ).length;
    expect(queued).toBeLessThanOrEqual(MAX_QUEUE);
  });

  it("turns an ENTERING car into WAITING after the entry duration", () => {
    let state = reducer(createInitialState(), {
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

describe("correct fueling", () => {
  it("rewards points and moves the car to FUELING at the pump", () => {
    let state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "DIESEL",
      now: T0,
    });
    state = enterWaiting(state, 1);
    expect(state.attendedCarId).toBe(1);
    expect(state.cars[0].phase).toBe("ATTENDED");

    state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL" });
    expect(state.cars[0].phase).toBe("MOVING");
    expect(state.cars[0].pumpId).toBe("DIESEL");

    state = reducer(state, { type: "FILL_FUEL", now: T0 });
    expect(state.score).toBe(REWARD_CORRECT);
    expect(state.cars[0].phase).toBe("FUELING");
    expect(state.cars[0].pumpId).toBe("DIESEL");
    expect(state.wrongFuelCount).toBe(0);
  });

  it("completes fueling, departs the car, then removes it", () => {
    let state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    state = enterWaiting(state, 1);
    state = reducer(state, { type: "SELECT_PUMP", pump: "PETROL" });
    state = reducer(state, { type: "FILL_FUEL", now: T0 });

    state = reducer(state, { type: "TICK", now: T0 + FUEL_TIME_MS + 10 });
    expect(state.cars[0].phase).toBe("DEPARTING");

    state = reducer(state, {
      type: "TICK",
      now: T0 + FUEL_TIME_MS + DEPART_TIME_MS + 10,
    });
    expect(state.cars).toHaveLength(0);
  });
});

describe("wrong fueling", () => {
  function threeWrongFuels(): GameState {
    let state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    state = enterWaiting(state, 1);
    for (let i = 0; i < WRONG_FUEL_LIMIT; i++) {
      state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL" });
      state = reducer(state, { type: "FILL_FUEL", now: T0 + i });
    }
    return state;
  }

  it("applies a penalty and increments wrongFuelCount without ending the game", () => {
    const state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    let next = enterWaiting(state, 1);
    next = reducer(next, { type: "SELECT_PUMP", pump: "DIESEL" });
    next = reducer(next, { type: "FILL_FUEL", now: T0 });

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
    state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL" });
    state = reducer(state, { type: "FILL_FUEL", now: T0 + 100 });
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
    let state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "CNG",
      now: T0,
    });
    state = enterWaiting(state, 1);
    for (let i = 0; i < WRONG_FUEL_LIMIT + 1; i++) {
      state = reducer(state, { type: "SELECT_PUMP", pump: "PETROL" });
      state = reducer(state, { type: "FILL_FUEL", now: T0 + i });
    }
    expect(state.score).toBe(0);
  });
});

describe("attending", () => {
  it("releases a previously attended car back into the queue", () => {
    let state = reducer(createInitialState(), {
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

describe("high score and restart", () => {
  it("records the high score at game over", () => {
    let state = createInitialState();
    let now = T0;
    state = correctFill(state, "PETROL", now);
    state = correctFill(state, "DIESEL", (now += 2000));
    state = correctFill(state, "CNG", (now += 2000));
    expect(state.score).toBe(3 * REWARD_CORRECT);

    for (let i = 0; i < 4; i++) {
      now += 2000;
      state = reducer(state, { type: "SPAWN_CAR", fuel: "PETROL", now });
      const id = state.cars[state.cars.length - 1].id;
      state = reducer(state, { type: "CAR_ENTERED", id });
      state = reducer(state, { type: "ATTEND_CAR", id });
      state = reducer(state, { type: "SELECT_PUMP", pump: "DIESEL" });
      state = reducer(state, { type: "FILL_FUEL", now });
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
    let state = createInitialState();
    state = { ...state, highScore: 500 };
    state = reducer(state, { type: "RESTART" });
    expect(state.status).toBe("PLAYING");
    expect(state.score).toBe(0);
    expect(state.wrongFuelCount).toBe(0);
    expect(state.cars).toHaveLength(0);
    expect(state.highScore).toBe(500);
  });

  it("is a no-op to fill fuel with no attended car or pump selected", () => {
    const state = reducer(createInitialState(), {
      type: "SPAWN_CAR",
      fuel: "PETROL",
      now: T0,
    });
    const before = reducer(state, { type: "TICK", now: T0 + 5000 });
    const after = reducer(before, { type: "FILL_FUEL", now: T0 + 5000 });
    expect(after.score).toBe(0);
    expect(after.cars[0].phase).toBe("WAITING");
  });
});
