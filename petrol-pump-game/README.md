# ⛽ Petrol Pump Rush - Game with PNG Assets

A complete, interactive petrol pump management game built with HTML5 Canvas and your custom PNG sprite assets.

## 🎮 Game Overview

You work at a petrol pump! Cars arrive requesting different types of fuel (Petrol, Diesel, or CNG). Your job is to:
1. **Attend** incoming cars by clicking them
2. **Select** the correct fuel pump
3. **Fill** their fuel to earn points
4. **Avoid** wrong fuel or face penalties!

## 📋 Game Rules

- **Correct Fuel**: +50 points
- **Wrong Fuel**: -30 points penalty
- **Wrong Fuel Limit**: After the 4th wrong fuel attempt, the car explodes and **GAME OVER!**
- The game tracks your high score and saves it in your browser

## 📁 Project Structure

```
petrol-pump-game/
├── index.html              # Main game file
├── README.md              # This file
├── css/
│   └── style.css          # All game styling and layout
├── js/
│   ├── assetManager.js    # Handles PNG asset loading and sprite extraction
│   ├── gameObjects.js     # Car, Pump, and Worker classes
│   └── game.js            # Main game logic and loop
└── assets/
    ├── background.png     # Game background
    ├── game_look.png      # Reference game screenshot
    ├── cars.png           # Car sprites (blue, yellow, truck)
    ├── pumps.png          # Pump sprites (petrol, diesel, CNG)
    ├── worker.png         # Worker animation frames (idle, walk)
    └── UI_and_Icons.png   # UI elements and icons
```

## 🚀 How to Run

### Option 1: Local File
1. Download the entire `petrol-pump-game` folder
2. Open `index.html` in any modern web browser
3. Play!

### Option 2: Web Server (Recommended)
For best results, serve the game through a local web server:

**Using Python 3:**
```bash
cd petrol-pump-game
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser

**Using Node.js (http-server):**
```bash
npm install -g http-server
cd petrol-pump-game
http-server
```

## 🎮 Controls

- **Click a Car**: Select it to attend (highlighted with yellow border)
- **Click a Pump**: Send the car to that pump (P=Petrol, D=Diesel, C=CNG)
- **Auto-Fill**: Car fills automatically when at the correct/incorrect pump
- **Restart**: Click RESTART button after game over

## 🏗️ Code Architecture

### AssetManager (`assetManager.js`)
- Loads all PNG sprites with error handling
- Extracts specific sprites from sprite sheets using coordinates
- Provides methods to draw sprites on canvas
- Fallback rendering if assets fail to load

### Game Objects (`gameObjects.js`)
- **Car**: Moves around, requests fuel, tracks fill progress
- **Pump**: Stationary fuel stations with type (P/D/C)
- **Worker**: Animated character that responds to game state

### Game Logic (`game.js`)
- Main game loop with requestAnimationFrame
- Input handling and car-pump matching
- Score calculation and high score tracking
- Game over detection (4 wrong fuels)

## 🎨 Sprite Sheet Coordinates

The asset manager extracts sprites from PNG files using pixel coordinates:

**cars.png:**
- Blue car: (800, 150, 100×60)
- Yellow car: (800, 220, 100×60)
- Truck: (800, 370, 120×70)

**pumps.png:**
- Petrol: (150, 140, 80×140)
- Diesel: (580, 140, 80×140)
- CNG: (1040, 140, 80×140)

**worker.png:**
- Idle: (0, 0, 80×100)
- Walk 1: (100, 0, 80×100)
- Walk 2: (200, 0, 80×100)

*Adjust these coordinates if your sprite sheets have different layouts!*

## 🐛 Troubleshooting

**Assets not loading?**
- Make sure all PNG files are in the `assets/` folder
- Check browser console for error messages (F12 → Console tab)
- Try using a web server instead of opening the file directly

**Game running slow?**
- Close other browser tabs
- Check your internet connection (for first load)
- Update your browser

**Sprites displaying incorrectly?**
- Verify sprite coordinates in `assetManager.js`
- Make sure PNG files match the expected sprite sheet layout
- Check the image dimensions in the browser's developer tools

## 📊 Features

✅ PNG sprite asset support
✅ Multiple fuel types (Petrol, Diesel, CNG)
✅ Score tracking with high score persistence
✅ Wrong fuel warning system
✅ Smooth animations and transitions
✅ Responsive canvas rendering
✅ Fallback rendering for missing assets
✅ Mobile-friendly controls (touch support)

## 🎯 Future Enhancement Ideas

- Add difficulty levels (speed increase)
- Power-ups (shield, double points)
- Leaderboard system
- Different car types with special requirements
- Sound effects and background music
- Multiplayer mode
- Mobile app version

## 📝 License

This game is provided as-is for educational and personal use. Feel free to modify and improve!

## 🎨 Credits

Game concept: Petrol Pump Rush
Assets: Custom PNG sprite sheets
Engine: HTML5 Canvas + Vanilla JavaScript

---

**Enjoy the game and happy pumping!** ⛽🚗💨
