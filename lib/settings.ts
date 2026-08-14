export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  reducedMotion: false,
};

const SETTINGS_KEY = "petrol-pump-rush:settings";
const TUTORIAL_KEY = "petrol-pump-rush:tutorial-seen";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const prefersReduced =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    return {
      sound:
        parsed && typeof parsed.sound === "boolean"
          ? parsed.sound
          : DEFAULT_SETTINGS.sound,
      reducedMotion:
        parsed && typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : prefersReduced,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage failures */
  }
}

export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    /* ignore storage failures */
  }
}
