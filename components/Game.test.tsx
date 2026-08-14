// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Game from "@/components/Game";
import {
  DEPART_TIME_MS,
  ENTER_TIME_MS,
  EXPLOSION_TIME_MS,
  FILL_TIME_MS,
  TICK_MS,
  WRONG_FUEL_LIMIT,
} from "@/lib/game";

const TUTORIAL_KEY = "petrol-pump-rush:tutorial-seen";
const SETTINGS_KEY = "petrol-pump-rush:settings";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

async function advance(ms: number) {
  const steps = Math.max(1, Math.ceil(ms / TICK_MS));
  for (let i = 0; i < steps; i++) {
    await act(async () => {
      vi.advanceTimersByTime(TICK_MS);
    });
  }
}

function getCars(): HTMLElement[] {
  return screen.getAllByTitle(/^Requests /);
}

function fuelOf(el: HTMLElement): string {
  return (el.getAttribute("title") ?? "").replace("Requests ", "");
}

function startGame() {
  fireEvent.click(screen.getByRole("button", { name: "START GAME" }));
}

describe("Petrol Pump Rush - integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.localStorage.setItem(TUTORIAL_KEY, "1");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the START screen and starts a fresh game", () => {
    render(<Game />);
    expect(screen.getByText("FUEL UP!")).toBeTruthy();
    expect(screen.getByRole("button", { name: "START GAME" })).toBeTruthy();
    startGame();
    expect(screen.getByText("PLAYING")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Petrol pump" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diesel pump" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "CNG pump" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fill Fuel" })).toBeTruthy();
  });

  it("shows the tutorial on first visit and completing it starts the game", () => {
    window.localStorage.removeItem(TUTORIAL_KEY);
    render(<Game />);
    startGame();
    expect(screen.getByText("Step 1 of 4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));
    expect(screen.getByText("PLAYING")).toBeTruthy();
    expect(window.localStorage.getItem(TUTORIAL_KEY)).toBe("1");
  });

  it("correct fueling awards points and the car departs", async () => {
    render(<Game />);
    startGame();
    await advance(ENTER_TIME_MS + 50);

    const car = getCars()[0];
    const fuel = fuelOf(car);
    fireEvent.click(car);
    await advance(50);

    const pump = screen.getByRole("button", { name: new RegExp(`^${fuel} pump$`) });
    fireEvent.click(pump);
    await advance(50);

    const fillBtn = screen.getByRole("button", { name: "Fill Fuel" }) as HTMLButtonElement;
    expect(fillBtn.disabled).toBe(false);

    fireEvent.pointerDown(fillBtn);
    await advance(FILL_TIME_MS * 0.7);
    fireEvent.pointerUp(fillBtn);
    await advance(50);

    expect(screen.getByText(/Good fill/)).toBeTruthy();
    expect(screen.queryByText(/Wrong fuel/)).toBeFalsy();

    await advance(DEPART_TIME_MS + 200);
    expect(car.isConnected).toBe(false);
  });

  it("attending a car reveals its requested fuel and fill is locked until a pump is picked", async () => {
    render(<Game />);
    startGame();
    await advance(ENTER_TIME_MS + 50);

    const car = getCars()[0];
    fireEvent.click(car);
    await advance(50);

    const fillBtn = screen.getByRole("button", { name: "Fill Fuel" }) as HTMLButtonElement;
    expect(fillBtn.disabled).toBe(true);
    expect(car.parentElement?.classList.contains("is-attended")).toBe(true);
    const bubble = car.querySelector(".request-bubble");
    expect(bubble).toBeTruthy();
    expect(bubble?.textContent).toContain(fuelOf(car));

    const pump = screen.getByRole("button", { name: new RegExp(`^${fuelOf(car)} pump$`) });
    fireEvent.click(pump);
    await advance(50);
    expect(fillBtn.disabled).toBe(false);
  });

  it("wrong fuel penalizes but continues, and the 4th wrong fuel explodes into game over; restart resets", async () => {
    render(<Game />);
    startGame();
    await advance(ENTER_TIME_MS + 50);

    const car = getCars()[0];
    const fuel = fuelOf(car);
    fireEvent.click(car);
    await advance(50);

    const wrongPump = screen
      .getAllByRole("button", { name: / pump$/i })
      .find((b) => b.getAttribute("aria-label") !== `${fuel} pump`) as HTMLElement;
    expect(wrongPump).toBeTruthy();

    const fillBtn = screen.getByRole("button", { name: "Fill Fuel" }) as HTMLButtonElement;

    for (let i = 0; i < WRONG_FUEL_LIMIT; i++) {
      fireEvent.click(wrongPump);
      await advance(50);
      fireEvent.pointerDown(fillBtn);
      await advance(50);
      fireEvent.pointerUp(fillBtn);
      await advance(50);
      expect(screen.getAllByText(/Wrong fuel/).length).toBeGreaterThan(0);
      expect(screen.getByText("PLAYING")).toBeTruthy();
    }

    fireEvent.click(wrongPump);
    await advance(50);
    fireEvent.pointerDown(fillBtn);
    await advance(50);
    fireEvent.pointerUp(fillBtn);
    await advance(50);
    expect(screen.getByText(/exploded/)).toBeTruthy();

    await advance(EXPLOSION_TIME_MS + 200);
    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("GAME_OVER")).toBeTruthy();

    const restart = screen.getByRole("button", { name: "Restart Game" });
    fireEvent.click(restart);
    await advance(50);
    expect(screen.queryByText("Game Over")).toBeFalsy();
    expect(screen.getByText("PLAYING")).toBeTruthy();
  });

  it("settings toggles persist to localStorage and close", () => {
    render(<Game />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const soundRow = screen.getByRole("switch", { name: "Sound Effects" });
    expect(soundRow.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(soundRow);
    expect(soundRow.getAttribute("aria-checked")).toBe("false");
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}");
    expect(saved.sound).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeFalsy();
  });
});
