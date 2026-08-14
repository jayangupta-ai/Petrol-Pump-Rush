"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// --- Audio Engine ---
class AudioEngine {
  ctx: AudioContext | null = null;
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSpawn() { this.playTone(300, "sine", 0.1); this.playTone(400, "sine", 0.2, 0.05); }
  playCoin() { this.playTone(880, "square", 0.1); setTimeout(() => this.playTone(1760, "square", 0.2), 100); }
  playError() { this.playTone(150, "sawtooth", 0.3); }
  playExplosion() { this.playTone(50, "square", 0.5, 0.3); }
  playGameOver() { this.playTone(200, "sawtooth", 0.5); setTimeout(() => this.playTone(100, "sawtooth", 0.8), 200); }
}

const audio = new AudioEngine();

// --- Types & Constants ---
type FuelType = "Petrol" | "Diesel" | "CNG";
type CarVariant = "blue" | "yellow" | "truck";
type GameMode = "START" | "PLAYING" | "PAUSED" | "GAME_OVER";

type Car = {
  id: number;
  fuelType: FuelType;
  variant: CarVariant;
  positionX: number; // Percentage width
  speed: number;
  status: "queued" | "entering" | "waiting" | "fueling" | "leaving" | "exploding";
  pumpIndex: number | null;
  timeLeft: number;
};

type Popup = {
  id: number;
  x: number; // percentage
  y: number; // percentage
  text: string;
  color: string;
};

const PUMP_POSITIONS = [20, 50, 80]; // percentages
const FUELS: FuelType[] = ["Petrol", "Diesel", "CNG"];
const VARIANTS: CarVariant[] = ["blue", "yellow", "truck"];

// --- CSS ---
const STYLES = `
.game-container {
  position: relative;
  width: 100%;
  max-width: 900px;
  aspect-ratio: 16/9;
  background-color: #333;
  overflow: hidden;
  margin: 0 auto;
  border: 4px solid #222;
  border-radius: 12px;
  user-select: none;
}
.forecourt {
  position: absolute;
  inset: 0;
  background-image: url('/images/background.png');
  background-position: center; 
  background-size: cover;
  background-repeat: no-repeat;
}
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 50;
  backdrop-filter: blur(2px);
}
.overlay h1 { font-size: 64px; color: #f1c40f; margin-bottom: 20px; text-shadow: 4px 4px 0 #000; text-align: center; }
.btn {
  padding: 16px 32px;
  font-size: 24px;
  cursor: pointer;
  background: #f1c40f;
  color: #000;
  border: 4px solid #000;
  border-radius: 12px;
  font-weight: 900;
  box-shadow: 0 6px 0 #000;
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn:active {
  transform: translateY(6px);
  box-shadow: 0 0 0 #000;
}

.pump {
  position: absolute;
  bottom: 25%;
  width: 15%;
  aspect-ratio: 1/2;
  transform: translateX(-50%);
  cursor: pointer;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  transition: filter 0.2s;
}
.pump:hover { filter: brightness(1.2); }
.pump[data-fuel="Petrol"] { background-image: url('/images/pump_petrol.png'); }
.pump[data-fuel="Diesel"] { background-image: url('/images/pump_diesel.png'); }
.pump[data-fuel="CNG"] { background-image: url('/images/pump_cng.png'); }

.worker {
  position: absolute;
  bottom: 20%;
  width: 10%;
  aspect-ratio: 1/2;
  transform: translateX(-50%);
  transition: left 0.3s ease;
  background-image: url('/images/worker_idle.png');
  background-size: contain; 
  background-position: center;
  background-repeat: no-repeat;
  z-index: 10;
}
.worker.walking {
  animation: walk 0.3s infinite alternate steps(1);
}
@keyframes walk {
  0% { background-image: url('/images/worker_walk_1.png'); }
  50% { background-image: url('/images/worker_walk_2.png'); }
  100% { background-image: url('/images/worker_walk_2.png'); }
}

.car {
  position: absolute;
  bottom: 20%;
  width: 22%;
  aspect-ratio: 2/1;
  transform: translateX(-50%);
  transition: left 0.1s linear;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 5;
}
.car[data-variant="blue"] { background-image: url('/images/car_blue.png'); }
.car[data-variant="yellow"] { background-image: url('/images/car_yellow.png'); }
.car[data-variant="truck"] { background-image: url('/images/car_truck.png'); }

.car.fueling {
  animation: pulse 0.5s infinite alternate;
}
.car.exploding {
  animation: shake 0.5s infinite;
  filter: sepia(1) hue-rotate(-50deg) saturate(5) brightness(1.2);
}

.fuel-indicator {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  color: black;
  border: 2px solid black;
  box-shadow: 0px 4px 0px rgba(0,0,0,0.5);
  animation: bounce 1s infinite alternate;
}

.hud {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
  z-index: 20;
}
.hud .score-panel { display: flex; flex-direction: column; }
.combo-text { font-size: 18px; color: #f39c12; }
.combo-text.high { color: #e74c3c; font-size: 22px; animation: pulse 0.5s infinite alternate; }
.strikes { color: #ff4757; }

.popup {
  position: absolute;
  font-weight: 900;
  font-size: 24px;
  text-shadow: 2px 2px 0 #000;
  animation: floatUp 1s forwards ease-out;
  pointer-events: none;
  z-index: 40;
}

@keyframes pulse {
  0% { transform: translateX(-50%) scale(1); }
  100% { transform: translateX(-50%) scale(1.05); }
}
@keyframes bounce {
  0% { transform: translate(-50%, 0); }
  100% { transform: translate(-50%, -5px); }
}
@keyframes floatUp {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
}
@keyframes shake {
  0% { transform: translateX(-50%) rotate(0deg); }
  25% { transform: translateX(-52%) rotate(-10deg); }
  50% { transform: translateX(-50%) rotate(0deg); }
  75% { transform: translateX(-48%) rotate(10deg); }
  100% { transform: translateX(-50%) rotate(0deg); }
}
`;

export default function PetrolPumpRushPhase2() {
  const [mode, setMode] = useState<GameMode>("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [workerPump, setWorkerPump] = useState<number>(0);
  const [cars, setCars] = useState<Car[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  
  const nextCarId = useRef(1);
  const nextPopupId = useRef(1);
  const gameTime = useRef(0); // For difficulty scaling

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem("petrol_pump_rush_high_score");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Save High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(Math.floor(score));
      localStorage.setItem("petrol_pump_rush_high_score", Math.floor(score).toString());
    }
  }, [score, highScore]);

  // Pause listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMode(m => {
          if (m === "PLAYING") return "PAUSED";
          if (m === "PAUSED") return "PLAYING";
          return m;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Popup helper
  const addPopup = useCallback((x: number, y: number, text: string, color: string) => {
    const id = nextPopupId.current++;
    setPopups(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, []);

  // Game Loop
  useEffect(() => {
    if (mode !== "PLAYING") return;

    const interval = setInterval(() => {
      gameTime.current += 50;
      
      setCars(prev => {
        let newCars = [...prev];
        
        // Difficulty scaling
        const baseChance = 0.015;
        const difficultyMultiplier = Math.min(score * 0.0005, 0.03); 
        const spawnChance = baseChance + difficultyMultiplier;
        
        // Count total active cars (queued + entering + waiting + fueling)
        const activeCarsCount = newCars.filter(c => c.status !== "leaving" && c.status !== "exploding").length;

        // Spawn logic: Max 5 active cars
        if (activeCarsCount < 5 && Math.random() < spawnChance) {
          audio.playSpawn();
          newCars.push({
            id: nextCarId.current++,
            fuelType: FUELS[Math.floor(Math.random() * FUELS.length)],
            variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
            positionX: -40, // Offscreen left
            speed: 1 + Math.min(score * 0.01, 1), // Slightly faster over time
            status: "queued" as const,
            pumpIndex: null,
            timeLeft: 1000,
          });
        }

        // Logic loop
        const occupiedPumps = newCars.filter(c => c.pumpIndex !== null && c.status !== "leaving" && c.status !== "exploding").map(c => c.pumpIndex);

        let queueIndex = 0;
        newCars = newCars.map(car => {
          
          if (car.status === "queued") {
            // Determine target position based on queue order
            const targetX = -10 - (queueIndex * 25);
            queueIndex++;
            
            // Move towards queue spot
            if (car.positionX < targetX) {
              return { ...car, positionX: car.positionX + car.speed };
            }
            
            // First in queue tries to find a pump
            if (queueIndex === 1) {
              const availablePumps = [0, 1, 2].filter(p => !occupiedPumps.includes(p));
              if (availablePumps.length > 0) {
                const pumpIndex = availablePumps[0]; // Take first available
                occupiedPumps.push(pumpIndex);
                return { ...car, status: "entering" as const, pumpIndex };
              }
            }
            return car;
          } 
          
          else if (car.status === "entering") {
            const targetX = PUMP_POSITIONS[car.pumpIndex!];
            if (car.positionX < targetX) {
              return { ...car, positionX: car.positionX + car.speed };
            } else {
              return { ...car, positionX: targetX, status: "waiting" as const, atPump: true };
            }
          } 
          
          else if (car.status === "fueling") {
            // Stay at pump while fueling animation happens
            if (car.timeLeft <= 0) {
              return { ...car, status: "leaving" as const };
            }
            return { ...car, timeLeft: car.timeLeft - 50 };
          }
          
          else if (car.status === "leaving") {
            return { ...car, positionX: car.positionX + car.speed * 2 };
          } 
          
          else if (car.status === "exploding") {
             if (car.timeLeft <= 0) {
                 // The game over handles the full stop, but if not game over, it just sits there for a sec
                 return car; // Actually, let's keep it exploding until restart
             }
             return { ...car, timeLeft: car.timeLeft - 50 };
          }
          
          else if (car.status === "waiting") {
             // Future extension: patience logic
             return car;
          }
          
          return car;
        }).filter(car => car.positionX < 130); // Remove off-screen right

        return newCars;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [mode]);

  const handlePumpClick = (pumpIndex: number) => {
    if (mode !== "PLAYING") return;
    setWorkerPump(pumpIndex);
    
    setCars(prev => {
      let madeMistake = false;
      let scored = false;
      let scoreGained = 0;
      
      const newCars = prev.map(car => {
        if (car.pumpIndex === pumpIndex && car.status === "waiting") {
          const pumpFuel = FUELS[pumpIndex];
          if (car.fuelType === pumpFuel) {
            scored = true;
            return { ...car, status: "fueling" as const, timeLeft: 500 }; // 0.5s fueling delay
          } else {
            madeMistake = true;
            return { ...car, status: "exploding" as const, timeLeft: 1000 };
          }
        }
        return car;
      });

      if (scored) {
        audio.playCoin();
        const comboMultiplier = 1 + (combo * 0.2);
        scoreGained = Math.floor(10 * comboMultiplier);
        setScore(s => s + scoreGained);
        setCombo(c => c + 1);
        addPopup(PUMP_POSITIONS[pumpIndex], 40, `+${scoreGained}`, "#2ecc71");
      }
      
      if (madeMistake) {
        setCombo(0);
        addPopup(PUMP_POSITIONS[pumpIndex], 40, "-1 STRIKE", "#e74c3c");
        setStrikes(s => {
          const newStrikes = s + 1;
          if (newStrikes >= 4) {
            audio.playExplosion();
            setTimeout(() => {
               audio.playGameOver();
               setMode("GAME_OVER");
            }, 600);
          } else {
            audio.playError();
          }
          return newStrikes;
        });
      }

      return newCars;
    });
  };

  const startGame = () => {
    audio.init(); // Initialize audio context on user interaction
    setScore(0);
    setStrikes(0);
    setCombo(0);
    setCars([]);
    setWorkerPump(0);
    setPopups([]);
    gameTime.current = 0;
    setMode("PLAYING");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <style>{STYLES}</style>
      
      <div className="game-container forecourt">
        
        {/* HUD */}
        <div className="hud">
          <div className="score-panel">
            <div>SCORE: {Math.floor(score)} | HIGH: {highScore}</div>
            {combo > 1 && (
              <div className={`combo-text ${combo >= 5 ? 'high' : ''}`}>
                COMBO x{combo}!
              </div>
            )}
          </div>
          <div className="strikes">STRIKES: {"X".repeat(strikes)}</div>
        </div>

        {/* Pumps */}
        {PUMP_POSITIONS.map((pos, index) => (
          <div 
            key={index}
            className="pump"
            data-fuel={FUELS[index]}
            style={{ left: `${pos}%` }}
            onClick={() => handlePumpClick(index)}
          />
        ))}

        {/* Worker */}
        <div 
          className={`worker ${mode === "PLAYING" ? "" : ""}`} // Idle animation if needed
          style={{ left: `${PUMP_POSITIONS[workerPump] + 12}%` }}
        />

        {/* Cars */}
        {cars.map(car => (
          <div 
            key={car.id}
            data-variant={car.variant}
            className={`car ${car.status === 'exploding' ? 'exploding' : ''} ${car.status === 'fueling' ? 'fueling' : ''}`}
            style={{ left: `${car.positionX}%` }}
          >
            {(car.status === "waiting" || car.status === "entering" || car.status === "queued") && (
              <div className="fuel-indicator">
                {car.fuelType}
              </div>
            )}
          </div>
        ))}

        {/* Popups */}
        {popups.map(p => (
          <div key={p.id} className="popup" style={{ left: `${p.x}%`, top: `${p.y}%`, color: p.color }}>
            {p.text}
          </div>
        ))}

        {/* OVERLAYS */}
        {mode === "START" && (
          <div className="overlay">
            <h1>PETROL PUMP RUSH</h1>
            <p style={{ marginBottom: 30, fontSize: 18 }}>Manage the pumps, watch out for the queue!</p>
            <button className="btn" onClick={startGame}>START GAME</button>
          </div>
        )}

        {mode === "PAUSED" && (
          <div className="overlay">
            <h1>PAUSED</h1>
            <button className="btn" onClick={() => setMode("PLAYING")}>RESUME</button>
          </div>
        )}

        {mode === "GAME_OVER" && (
          <div className="overlay">
            <h1 style={{ color: "#e74c3c" }}>GAME OVER</h1>
            <p style={{ fontSize: '32px', marginBottom: '10px', fontWeight: 'bold' }}>Score: {Math.floor(score)}</p>
            <p style={{ fontSize: '20px', marginBottom: '30px', color: '#f39c12' }}>Max Combo: {combo}</p>
            <button className="btn" onClick={startGame}>TRY AGAIN</button>
          </div>
        )}

      </div>
      
      <p style={{ marginTop: "20px", maxWidth: "600px", textAlign: "center", color: "#666" }}>
        Press <b>ESC</b> to Pause.
      </p>
    </div>
  );
}
