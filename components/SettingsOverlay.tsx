import type { Settings } from "@/lib/settings";

interface SettingsOverlayProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

function Toggle({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="setting-row"
      onClick={onToggle}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span className="setting-info">
        <b>{label}</b>
        <span>{description}</span>
      </span>
      <span className={`toggle ${checked ? "on" : ""}`}>
        <span className="toggle-knob" />
      </span>
    </button>
  );
}

export default function SettingsOverlay({
  settings,
  onChange,
  onClose,
}: SettingsOverlayProps) {
  return (
    <div className="overlay settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-card">
        <div className="settings-head">
          <h2>Settings</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <Toggle
          label="Sound Effects"
          description="Play sounds for fills, strikes and explosions"
          checked={settings.sound}
          onToggle={() => onChange({ ...settings, sound: !settings.sound })}
        />
        <Toggle
          label="Reduced Motion"
          description="Disable animations and camera shake"
          checked={settings.reducedMotion}
          onToggle={() =>
            onChange({ ...settings, reducedMotion: !settings.reducedMotion })
          }
        />
      </div>
    </div>
  );
}
