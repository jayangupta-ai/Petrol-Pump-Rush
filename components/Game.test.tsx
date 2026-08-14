// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Game from "@/components/Game";
import {
  DEPART_TIME_MS,
  ENTER_TIME_MS,
  EXPLOSION_TIME_MS,
  FUEL_TIME_MS,
  TICK_MS,
  WRONG_FUEL_LIMIT,
} from "@/lib/game";

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

describe("Petrol Pump Rush - integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the station, HUD and three pumps", () => {
    render(<Game />);
    expect(screen.getByText("Petrol Pump Rush")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Petrol pump" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diesel pump" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "CNG pump" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fill Fuel" })).toBeTruthy();
    expect(screen.getByText("PLAYING")).toBeTruthy();
  });

  it("correct fueling awards points and the car departs", async () => {
    render(<Game />);
    await advance(ENTER_TIME_MS + 50);

    const cars = getCars();
    expect(cars.length).toBeGreaterThan(0);
    const car = cars[0];
    const fuel = fuelOf(car);

    fireEvent.click(car);
    await advance(50);

    const pump = screen.getByRole("button", { name: new RegExp(`^${fuel} pump$`) });
    fireEvent.click(pump);
    await advance(50);

    const fillBtn = screen.getByRole("button", { name: "Fill Fuel" }) as HTMLButtonElement;
    expect(fillBtn.disabled).toBe(false);
    fireEvent.click(fillBtn);
    await advance(100);

    expect(screen.getByText(/Correct/)).toBeTruthy();
    expect(screen.queryByText(/Wrong fuel/)).toBeFalsy();

    await advance(FUEL_TIME_MS + DEPART_TIME_MS + 200);
    expect(car.isConnected).toBe(false);
  });

  it("attending a car reveals its requested fuel and fill is locked until a pump is picked", async () => {
    render(<Game />);
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
      fireEvent.click(fillBtn);
      await advance(50);
      expect(screen.getAllByText(/Wrong fuel/).length).toBeGreaterThan(0);
      expect(screen.getByText("PLAYING")).toBeTruthy();
    }

    fireEvent.click(wrongPump);
    await advance(50);
    fireEvent.click(fillBtn);
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
});
