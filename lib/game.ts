export type FuelType = "PETROL" | "DIESEL" | "CNG";

export const FUELS: FuelType[] = ["PETROL", "DIESEL", "CNG"];

export interface FuelInfo {
  label: string;
  color: string;
  badge: string;
}

export const FUEL_INFO: Record<FuelType, FuelInfo> = {
  PETROL: { label: "Petrol", color: "#e84118", badge: "P" },
  DIESEL: { label: "Diesel", color: "#f0932b", badge: "D" },
  CNG: { label: "CNG", color: "#27ae60", badge: "C" },
};

export type CarPhase =
  | "ENTERING"
  | "WAITING"
  | "ATTENDED"
  | "MOVING"
  | "FUELING"
  | "DEPARTING"
  | "EXPLODING";

export interface Car {
  id: number;
  fuel: FuelType;
  color: string;
  phase: CarPhase;
  pumpId: FuelType | null;
  phaseStartedAt: number;
  fillProgress: number;
}

export type GameStatus = "START" | "PLAYING" | "GAME_OVER";

export type ToastKind =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "perfect"
  | "spill";

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  createdAt: number;
}

export type FillResult = "PERFECT" | "GOOD" | "PARTIAL" | "SPILL";

export interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  wrongFuelCount: number;
  highScore: number;
  level: number;
  levelElapsedMs: number;
  carsServed: number;
  cars: Car[];
  attendedCarId: number | null;
  selectedPump: FuelType | null;
  fillingCarId: number | null;
  toasts: Toast[];
  popups: Popup[];
  seq: number;
  toastSeq: number;
  popupSeq: number;
}

export const CAR_COLORS = [
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#e74c3c",
  "#2c3e50",
  "#f1c40f",
  "#16a085",
];

export const WRONG_FUEL_LIMIT = 3;
export const MAX_QUEUE = 4;
export const MAX_QUEUE_CAP = 8;
export const REWARD_CORRECT = 100;
export const PERFECT_BONUS = 50;
export const PENALTY_WRONG = 50;

export const TICK_MS = 100;
export const FILL_TIME_MS = 1400;
export const DEPART_TIME_MS = 1300;
export const ENTER_TIME_MS = 1300;
export const EXPLOSION_TIME_MS = 1700;
export const TOAST_MS = 2600;
export const POPUP_MS = 1300;
export const SPAWN_INTERVAL_BASE_MS = 1900;
export const SPAWN_INTERVAL_MIN_MS = 800;
export const LEVEL_MS = 25000;

// Accuracy scoring (percent of a full tank at release time)
export const FILL_PERFECT_MIN = 90;
export const FILL_GOOD_MIN = 60;
export const FILL_SPILL_CAP = 130;

export const STAGE_W = 900;
export const STAGE_H = 560;

export const PUMP_X: Record<FuelType, number> = {
  PETROL: 210,
  DIESEL: 450,
  CNG: 690,
};

export function createInitialState(): GameState {
  return {
    status: "START",
    score: 0,
    wrongFuelCount: 0,
    highScore: 0,
    level: 1,
    levelElapsedMs: 0,
    carsServed: 0,
    cars: [],
    attendedCarId: null,
    selectedPump: null,
    fillingCarId: null,
    toasts: [],
    popups: [],
    seq: 1,
    toastSeq: 1,
    popupSeq: 1,
  };
}

export type Action =
  | { type: "TICK"; now?: number }
  | { type: "SPAWN_CAR"; fuel?: FuelType; now?: number }
  | { type: "CAR_ENTERED"; id: number }
  | { type: "ATTEND_CAR"; id: number; now?: number }
  | { type: "SELECT_PUMP"; pump: FuelType; now?: number }
  | { type: "START_FILL"; now?: number }
  | { type: "RELEASE_FILL"; now?: number }
  | { type: "CLEAR_TOAST"; id: number }
  | { type: "START_GAME" }
  | { type: "LOAD_HIGH_SCORE"; value: number };

const nowMs = (now?: number) => (now === undefined ? Date.now() : now);

function pushToast(
  state: GameState,
  text: string,
  kind: ToastKind,
  now: number
): Toast[] {
  const toast: Toast = {
    id: state.toastSeq,
    text,
    kind,
    createdAt: now,
  };
  return [...state.toasts, toast];
}

function nextToastSeq(state: GameState): number {
  return state.toastSeq + 1;
}

function pushPopup(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
  now: number
): Popup[] {
  const popup: Popup = {
    id: state.popupSeq,
    x,
    y,
    text,
    color,
    createdAt: now,
  };
  return [...state.popups, popup];
}

function nextPopupSeq(state: GameState): number {
  return state.popupSeq + 1;
}

function isInQueue(car: Car): boolean {
  return car.phase === "ENTERING" || car.phase === "WAITING";
}

export function getSpawnIntervalMs(level: number): number {
  return Math.max(
    SPAWN_INTERVAL_MIN_MS,
    SPAWN_INTERVAL_BASE_MS - (level - 1) * 150
  );
}

export function getQueueCap(level: number): number {
  return Math.min(MAX_QUEUE_CAP, MAX_QUEUE + Math.floor((level - 1) / 2));
}

/** Fill speed in percent-per-ms; higher levels fill faster (harder to stop). */
export function getFillRate(level: number): number {
  return (100 / FILL_TIME_MS) * (1 + (level - 1) * 0.1);
}

/** Modest score multiplier that grows with level. */
export function getLevelMultiplier(level: number): number {
  return 1 + (level - 1) * 0.1;
}

export function scoreFill(progress: number, level: number): { result: FillResult; points: number } {
  const mult = getLevelMultiplier(level);
  let result: FillResult;
  let base: number;
  if (progress > 100) {
    result = "SPILL";
    base = Math.floor(REWARD_CORRECT * Math.max(0, 1 - (progress - 100) / 30));
  } else if (progress >= FILL_PERFECT_MIN) {
    result = "PERFECT";
    base = REWARD_CORRECT + PERFECT_BONUS;
  } else if (progress >= FILL_GOOD_MIN) {
    result = "GOOD";
    base = REWARD_CORRECT;
  } else {
    result = "PARTIAL";
    base = Math.floor((REWARD_CORRECT * progress) / FILL_GOOD_MIN);
  }
  return { result, points: Math.floor(base * mult) };
}

function reduceSpawn(state: GameState, fuel?: FuelType, now?: number): GameState {
  if (state.status !== "PLAYING") return state;
  const queued = state.cars.filter(isInQueue).length;
  if (queued >= getQueueCap(state.level)) return state;
  const chosen = fuel ?? FUELS[Math.floor(Math.random() * FUELS.length)];
  const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const car: Car = {
    id: state.seq,
    fuel: chosen,
    color,
    phase: "ENTERING",
    pumpId: null,
    phaseStartedAt: nowMs(now),
    fillProgress: 0,
  };
  return { ...state, cars: [...state.cars, car], seq: state.seq + 1 };
}

function reduceTick(state: GameState, now?: number): GameState {
  const t = nowMs(now);
  if (state.status === "START") return state;
  if (state.status === "GAME_OVER") {
    return {
      ...state,
      toasts: state.toasts.filter((toast) => t - toast.createdAt < TOAST_MS),
      popups: state.popups.filter((p) => t - p.createdAt < POPUP_MS),
    };
  }

  // Survival level timer
  let level = state.level;
  let levelElapsedMs = state.levelElapsedMs + TICK_MS;
  let toasts = state.toasts;
  let toastSeq = state.toastSeq;
  let popups = state.popups;
  let popupSeq = state.popupSeq;
  if (levelElapsedMs >= LEVEL_MS) {
    level += 1;
    levelElapsedMs = 0;
    toasts = pushToast(state, `Level ${level} — faster!`, "info", t);
    toastSeq = nextToastSeq(state);
    popups = pushPopup(state, STAGE_W / 2, 180, `LEVEL ${level}`, "#ffd166", t);
    popupSeq = nextPopupSeq(state);
  }

  let exploded = false;
  const overflowCar =
    state.fillingCarId != null
      ? state.cars.find(
          (c) =>
            c.id === state.fillingCarId &&
            c.phase === "FUELING" &&
            Math.max(0, t - c.phaseStartedAt) * getFillRate(level) >= FILL_SPILL_CAP
        ) ?? null
      : null;
  const cars = state.cars.map((car): Car | null => {
    switch (car.phase) {
      case "ENTERING":
        if (t - car.phaseStartedAt >= ENTER_TIME_MS) {
          return { ...car, phase: "WAITING" };
        }
        return car;
      case "FUELING": {
        if (car.id !== state.fillingCarId) return car;
        const elapsed = Math.max(0, t - car.phaseStartedAt);
        const progress = Math.min(FILL_SPILL_CAP, elapsed * getFillRate(level));
        if (progress >= FILL_SPILL_CAP) {
          return { ...car, fillProgress: progress, phase: "DEPARTING", phaseStartedAt: t };
        }
        return { ...car, fillProgress: progress };
      }
      case "DEPARTING":
        if (t - car.phaseStartedAt >= DEPART_TIME_MS) return null;
        return car;
      case "EXPLODING":
        if (t - car.phaseStartedAt >= EXPLOSION_TIME_MS) exploded = true;
        return car;
      default:
        return car;
    }
  }).filter((car): car is Car => car !== null);

  let next: GameState = {
    ...state,
    level,
    levelElapsedMs,
    cars,
    toasts: toasts.filter((toast) => t - toast.createdAt < TOAST_MS),
    popups: popups.filter((p) => t - p.createdAt < POPUP_MS),
    toastSeq,
    popupSeq,
  };

  if (overflowCar) {
    const { points } = scoreFill(FILL_SPILL_CAP, next.level);
    const lost = Math.max(0, Math.floor((REWARD_CORRECT * (FILL_SPILL_CAP - 100)) / 30 * getLevelMultiplier(next.level)));
    next = {
      ...next,
      score: next.score + points,
      carsServed: next.carsServed + 1,
      fillingCarId: null,
      attendedCarId: null,
      selectedPump: null,
      toasts: pushToast(next, "SPILLED! Tank overflowed", "spill", t),
      toastSeq: next.toastSeq + 1,
      popups: pushPopup(
        next,
        PUMP_X[overflowCar.pumpId ?? "PETROL"],
        420,
        `-${lost} SPILL`,
        "#ff7675",
        t
      ),
      popupSeq: next.popupSeq + 1,
    };
  }

  if (exploded && next.status === "PLAYING") {
    next = {
      ...next,
      status: "GAME_OVER",
      highScore: Math.max(next.highScore, next.score),
    };
  }

  if (next.attendedCarId != null) {
    const attended = next.cars.find((c) => c.id === next.attendedCarId);
    if (
      !attended ||
      (attended.phase !== "ATTENDED" &&
        attended.phase !== "MOVING" &&
        attended.phase !== "FUELING")
    ) {
      next = { ...next, attendedCarId: null };
    }
  }

  return next;
}

function reduceCarEntered(state: GameState, id: number): GameState {
  const cars = state.cars.map((car) =>
    car.id === id && car.phase === "ENTERING"
      ? { ...car, phase: "WAITING" as CarPhase }
      : car
  );
  return { ...state, cars };
}

function reduceAttendCar(state: GameState, id: number, now?: number): GameState {
  if (state.status !== "PLAYING") return state;
  const car = state.cars.find((c) => c.id === id);
  if (!car || car.phase !== "WAITING") return state;

  const t = nowMs(now);
  const cars = state.cars.map((c) => {
    if (c.id === id) {
      return { ...c, phase: "ATTENDED" as CarPhase, pumpId: null, phaseStartedAt: t };
    }
    if (c.phase === "ATTENDED" || c.phase === "MOVING" || c.phase === "FUELING") {
      return { ...c, phase: "WAITING" as CarPhase, pumpId: null, phaseStartedAt: t };
    }
    return c;
  });

  return {
    ...state,
    cars,
    attendedCarId: id,
    selectedPump: null,
    fillingCarId: null,
    toasts: pushToast(state, "Attended car - select a pump", "info", t),
    toastSeq: nextToastSeq(state),
  };
}

function reduceSelectPump(state: GameState, pump: FuelType, now?: number): GameState {
  if (state.status !== "PLAYING" || state.attendedCarId == null) return state;
  const car = state.cars.find((c) => c.id === state.attendedCarId);
  if (!car || (car.phase !== "ATTENDED" && car.phase !== "MOVING")) return state;

  const same = state.selectedPump === pump;
  const t = nowMs(now);
  const cars = state.cars.map((c) => {
    if (c.id !== car.id) return c;
    if (same) {
      return { ...c, phase: "ATTENDED" as CarPhase, pumpId: null, phaseStartedAt: t };
    }
    return { ...c, phase: "MOVING" as CarPhase, pumpId: pump, phaseStartedAt: t };
  });

  return {
    ...state,
    cars,
    selectedPump: same ? null : pump,
    toasts: pushToast(
      state,
      same ? "Pump deselected" : `Sending car to ${FUEL_INFO[pump].label} pump`,
      "info",
      t
    ),
    toastSeq: nextToastSeq(state),
  };
}

function reduceStartFill(state: GameState, now?: number): GameState {
  if (state.status !== "PLAYING") return state;
  if (state.attendedCarId == null || state.selectedPump == null) return state;
  const car = state.cars.find((c) => c.id === state.attendedCarId);
  if (!car || (car.phase !== "ATTENDED" && car.phase !== "MOVING")) return state;

  const t = nowMs(now);
  const pump = state.selectedPump;

  if (pump === car.fuel) {
    const cars = state.cars.map((c) =>
      c.id === car.id
        ? {
            ...c,
            phase: "FUELING" as CarPhase,
            pumpId: pump,
            fillProgress: 0,
            phaseStartedAt: t,
          }
        : c
    );
    return {
      ...state,
      cars,
      fillingCarId: car.id,
      toasts: pushToast(state, "Hold to fill — release near 100%!", "info", t),
      toastSeq: nextToastSeq(state),
    };
  }

  // Wrong fuel: strike. The 4th wrong fuel explodes the car.
  const wrongFuelCount = state.wrongFuelCount + 1;
  const score = Math.max(0, state.score - PENALTY_WRONG);
  const isExplosion = wrongFuelCount > WRONG_FUEL_LIMIT;

  if (isExplosion) {
    const cars = state.cars.map((c) =>
      c.id === car.id
        ? { ...c, phase: "EXPLODING" as CarPhase, pumpId: pump, phaseStartedAt: t }
        : c
    );
    return {
      ...state,
      score,
      wrongFuelCount,
      cars,
      attendedCarId: null,
      selectedPump: null,
      toasts: pushToast(state, "WRONG FUEL! The car exploded!", "warning", t),
      toastSeq: nextToastSeq(state),
      popups: pushPopup(
        state,
        PUMP_X[pump],
        420,
        "WRONG FUEL!",
        "#ff6b6b",
        t
      ),
      popupSeq: nextPopupSeq(state),
    };
  }

  const cars = state.cars.map((c) =>
    c.id === car.id
      ? { ...c, phase: "ATTENDED" as CarPhase, pumpId: null, phaseStartedAt: t }
      : c
  );
  return {
    ...state,
    score,
    wrongFuelCount,
    cars,
    selectedPump: null,
    toasts: pushToast(
      state,
      `-${PENALTY_WRONG} Wrong fuel! (${wrongFuelCount}/${WRONG_FUEL_LIMIT})`,
      "error",
      t
    ),
    toastSeq: nextToastSeq(state),
    popups: pushPopup(state, PUMP_X[pump], 420, "WRONG FUEL", "#ff6b6b", t),
    popupSeq: nextPopupSeq(state),
  };
}

function reduceReleaseFill(state: GameState, now?: number): GameState {
  if (state.status !== "PLAYING") return state;
  if (state.fillingCarId == null) return state;
  const car = state.cars.find((c) => c.id === state.fillingCarId);
  if (!car || car.phase !== "FUELING") return state;

  const t = nowMs(now);
  const { result, points } = scoreFill(car.fillProgress, state.level);

  const cars = state.cars.map((c) =>
    c.id === car.id
      ? { ...c, phase: "DEPARTING" as CarPhase, phaseStartedAt: t }
      : c
  );

  let toasts = state.toasts;
  let toastSeq = state.toastSeq;
  let popups = state.popups;
  let popupSeq = state.popupSeq;

  const popupY = 380;
  if (result === "PERFECT") {
    toasts = pushToast(state, `PERFECT +${points}`, "perfect", t);
    toastSeq = nextToastSeq(state);
    popups = pushPopup(state, PUMP_X[car.pumpId ?? "PETROL"], popupY, `PERFECT +${points}`, "#ffe066", t);
    popupSeq = nextPopupSeq(state);
  } else if (result === "GOOD") {
    toasts = pushToast(state, `+${points} Good fill`, "success", t);
    toastSeq = nextToastSeq(state);
    popups = pushPopup(state, PUMP_X[car.pumpId ?? "PETROL"], popupY, `+${points}`, "#2ecc71", t);
    popupSeq = nextPopupSeq(state);
  } else if (result === "PARTIAL") {
    toasts = pushToast(state, `+${points} Underfilled`, "info", t);
    toastSeq = nextToastSeq(state);
    popups = pushPopup(state, PUMP_X[car.pumpId ?? "PETROL"], popupY, `+${points}`, "#74b9ff", t);
    popupSeq = nextPopupSeq(state);
  } else {
    const lost = Math.max(
      0,
      Math.floor(((car.fillProgress - 100) / 30) * REWARD_CORRECT * getLevelMultiplier(state.level))
    );
    toasts = pushToast(state, "SPILLED! Tank overflowed", "spill", t);
    toastSeq = nextToastSeq(state);
    popups = pushPopup(state, PUMP_X[car.pumpId ?? "PETROL"], popupY, `-${lost} SPILL`, "#ff7675", t);
    popupSeq = nextPopupSeq(state);
  }

  return {
    ...state,
    score: state.score + points,
    carsServed: state.carsServed + 1,
    cars,
    fillingCarId: null,
    attendedCarId: null,
    selectedPump: null,
    toasts,
    toastSeq,
    popups,
    popupSeq,
  };
}

function reduceClearToast(state: GameState, id: number): GameState {
  return { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
}

function reduceStartGame(state: GameState): GameState {
  return { ...createInitialState(), status: "PLAYING", highScore: state.highScore };
}

function reduceLoadHighScore(state: GameState, value: number): GameState {
  if (value <= 0 || value <= state.highScore) return state;
  return { ...state, highScore: value };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "TICK":
      return reduceTick(state, action.now);
    case "SPAWN_CAR":
      return reduceSpawn(state, action.fuel, action.now);
    case "CAR_ENTERED":
      return reduceCarEntered(state, action.id);
    case "ATTEND_CAR":
      return reduceAttendCar(state, action.id, action.now);
    case "SELECT_PUMP":
      return reduceSelectPump(state, action.pump, action.now);
    case "START_FILL":
      return reduceStartFill(state, action.now);
    case "RELEASE_FILL":
      return reduceReleaseFill(state, action.now);
    case "CLEAR_TOAST":
      return reduceClearToast(state, action.id);
    case "START_GAME":
      return reduceStartGame(state);
    case "LOAD_HIGH_SCORE":
      return reduceLoadHighScore(state, action.value);
    default:
      return state;
  }
}

export interface CarPosition {
  x: number;
  y: number;
  scale: number;
  z: number;
}

export function getCarPosition(car: Car, queueIndex: number): CarPosition {
  switch (car.phase) {
    case "ENTERING":
    case "WAITING":
      return { x: 16 + queueIndex * 96, y: 235, scale: 1, z: 1 };
    case "ATTENDED":
      return { x: 132, y: 252, scale: 1.22, z: 4 };
    case "MOVING":
    case "FUELING":
    case "EXPLODING":
      return { x: PUMP_X[car.pumpId ?? "PETROL"], y: 448, scale: 1.22, z: 3 };
    case "DEPARTING":
      return { x: STAGE_W + 60, y: 448, scale: 1.22, z: 2 };
  }
}

export function getQueueIndex(state: GameState, carId: number): number {
  const queued = state.cars
    .filter(isInQueue)
    .sort((a, b) => a.id - b.id);
  return queued.findIndex((c) => c.id === carId);
}

export function isFillEnabled(state: GameState): boolean {
  if (state.status !== "PLAYING" || state.selectedPump == null) return false;
  if (state.attendedCarId == null) return false;
  const car = state.cars.find((c) => c.id === state.attendedCarId);
  if (!car) return false;
  return car.phase === "ATTENDED" || car.phase === "MOVING";
}

export function isFilling(state: GameState): boolean {
  if (state.status !== "PLAYING") return false;
  if (state.fillingCarId == null) return false;
  const car = state.cars.find((c) => c.id === state.fillingCarId);
  return !!car && car.phase === "FUELING";
}

export function fillProgressOf(state: GameState): number {
  if (state.fillingCarId == null) return 0;
  const car = state.cars.find((c) => c.id === state.fillingCarId);
  return car ? Math.round(Math.min(100, car.fillProgress)) : 0;
}
