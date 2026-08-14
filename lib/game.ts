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

export type GameStatus = "PLAYING" | "GAME_OVER";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  createdAt: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  wrongFuelCount: number;
  highScore: number;
  cars: Car[];
  attendedCarId: number | null;
  selectedPump: FuelType | null;
  toasts: Toast[];
  seq: number;
  toastSeq: number;
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
export const REWARD_CORRECT = 100;
export const PENALTY_WRONG = 50;

export const TICK_MS = 100;
export const FUEL_TIME_MS = 1400;
export const DEPART_TIME_MS = 1300;
export const ENTER_TIME_MS = 1300;
export const EXPLOSION_TIME_MS = 1700;
export const TOAST_MS = 2600;
export const SPAWN_INTERVAL_MS = 1600;

export const STAGE_W = 900;
export const STAGE_H = 560;

export const PUMP_X: Record<FuelType, number> = {
  PETROL: 210,
  DIESEL: 450,
  CNG: 690,
};

export function createInitialState(): GameState {
  return {
    status: "PLAYING",
    score: 0,
    wrongFuelCount: 0,
    highScore: 0,
    cars: [],
    attendedCarId: null,
    selectedPump: null,
    toasts: [],
    seq: 1,
    toastSeq: 1,
  };
}

export type Action =
  | { type: "TICK"; now?: number }
  | { type: "SPAWN_CAR"; fuel?: FuelType; now?: number }
  | { type: "CAR_ENTERED"; id: number }
  | { type: "ATTEND_CAR"; id: number; now?: number }
  | { type: "SELECT_PUMP"; pump: FuelType; now?: number }
  | { type: "FILL_FUEL"; now?: number }
  | { type: "CLEAR_TOAST"; id: number }
  | { type: "RESTART" };

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

function isInQueue(car: Car): boolean {
  return car.phase === "ENTERING" || car.phase === "WAITING";
}

function reduceSpawn(state: GameState, fuel?: FuelType, now?: number): GameState {
  if (state.status !== "PLAYING") return state;
  const queued = state.cars.filter(isInQueue).length;
  if (queued >= MAX_QUEUE) return state;
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
  if (state.status === "GAME_OVER") {
    return {
      ...state,
      toasts: state.toasts.filter((toast) => t - toast.createdAt < TOAST_MS),
    };
  }

  let exploded = false;
  const cars = state.cars
    .map((car): Car | null => {
      switch (car.phase) {
        case "ENTERING":
          if (t - car.phaseStartedAt >= ENTER_TIME_MS) {
            return { ...car, phase: "WAITING" };
          }
          return car;
        case "FUELING": {
          const elapsed = t - car.phaseStartedAt;
          const progress = Math.min(100, (elapsed * 100) / FUEL_TIME_MS);
          if (progress >= 100) {
            return { ...car, fillProgress: 100, phase: "DEPARTING", phaseStartedAt: t };
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
    })
    .filter((car): car is Car => car !== null);

  let next: GameState = {
    ...state,
    cars,
    toasts: state.toasts.filter((toast) => t - toast.createdAt < TOAST_MS),
  };

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
    if (c.phase === "ATTENDED" || c.phase === "MOVING") {
      return { ...c, phase: "WAITING" as CarPhase, pumpId: null, phaseStartedAt: t };
    }
    return c;
  });

  return {
    ...state,
    cars,
    attendedCarId: id,
    selectedPump: null,
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

function reduceFillFuel(state: GameState, now?: number): GameState {
  if (state.status !== "PLAYING") return state;
  if (state.attendedCarId == null || state.selectedPump == null) return state;
  const car = state.cars.find((c) => c.id === state.attendedCarId);
  if (!car || (car.phase !== "ATTENDED" && car.phase !== "MOVING")) return state;

  const t = nowMs(now);
  const pump = state.selectedPump;

  if (pump === car.fuel) {
    const score = state.score + REWARD_CORRECT;
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
      score,
      cars,
      attendedCarId: null,
      selectedPump: null,
      toasts: pushToast(state, `+${REWARD_CORRECT} Correct ${FUEL_INFO[pump].label}!`, "success", t),
      toastSeq: nextToastSeq(state),
    };
  }

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
  };
}

function reduceClearToast(state: GameState, id: number): GameState {
  return { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
}

function reduceRestart(state: GameState): GameState {
  return { ...createInitialState(), highScore: state.highScore };
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
    case "FILL_FUEL":
      return reduceFillFuel(state, action.now);
    case "CLEAR_TOAST":
      return reduceClearToast(state, action.id);
    case "RESTART":
      return reduceRestart(state);
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
      return { x: 16 + queueIndex * 96, y: 76, scale: 1, z: 1 };
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
