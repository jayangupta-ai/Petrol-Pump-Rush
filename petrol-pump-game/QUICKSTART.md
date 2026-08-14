# 🚀 Quick Start Guide

## Fastest Way to Play

### Option 1: Direct Open (Simplest)
1. **Download** the entire `petrol-pump-game` folder
2. **Open** `index.html` in your web browser (double-click it)
3. **Play!**

✅ Works on: Windows, Mac, Linux
⚠️ Note: Some older browsers might have issues with asset loading. Use Chrome, Firefox, or Edge for best results.

---

## Better Options (For Development/Testing)

### Option 2: Python Web Server (Recommended)

**Windows:**
1. Open Command Prompt in the `petrol-pump-game` folder
2. Type: `python -m http.server 8000`
3. Open browser to: `http://localhost:8000`

**Mac/Linux:**
1. Open Terminal in the `petrol-pump-game` folder
2. Type: `python3 -m http.server 8000`
3. Open browser to: `http://localhost:8000`

### Option 3: Node.js Web Server

1. Install http-server globally:
   ```bash
   npm install -g http-server
   ```
2. Navigate to `petrol-pump-game` folder
3. Run: `http-server`
4. Open browser to: `http://localhost:8080`

---

## Project Structure at a Glance

```
petrol-pump-game/
  ├── 📄 index.html ........... Main game file
  ├── 📄 README.md ............ Full documentation
  ├── 📁 css/
  │   └── style.css .......... Game styling
  ├── 📁 js/
  │   ├── assetManager.js .... Asset loading
  │   ├── gameObjects.js ..... Car/Pump classes
  │   └── game.js ............ Main game logic
  └── 📁 assets/
      ├── background.png
      ├── cars.png
      ├── pumps.png
      ├── worker.png
      ├── UI_and_Icons.png
      └── game_look.png
```

---

## Game Controls

| Action | How |
|--------|-----|
| **Start** | Click on any waiting car (yellow border) |
| **Select Pump** | Click on Petrol (P), Diesel (D), or CNG pump |
| **Restart** | Click RESTART GAME button after game over |

---

## What's in the Box?

✅ **Complete game** with 3 fuel types
✅ **PNG sprite assets** - fully integrated
✅ **High score tracking** - saves to browser
✅ **Sound-ready** - commented code for future audio
✅ **Mobile-friendly** - works on tablets and phones
✅ **Well-documented** - easy to customize

---

## Customization Tips

### Change Sprite Coordinates
If your sprite sheets are different sizes:
1. Open `js/assetManager.js`
2. Find the `extractCarSprite()`, `extractPumpSprite()`, etc. methods
3. Adjust the `x`, `y`, `w`, `h` values

### Modify Game Speed
In `js/gameObjects.js`:
- **Car speed**: Change `this.speed = 1.5` in Car class
- **Spawn rate**: Change `frameCount % 140` in game.js

### Change Point Values
In `js/gameObjects.js`:
- **Correct fuel**: Change `gameState.score += 50`
- **Wrong fuel**: Change `gameState.score -= 30`

### Adjust Pump Positions
In `js/game.js`:
```javascript
const pumps = [
    new Pump('petrol', 200, 300),   // x, y coordinates
    new Pump('diesel', 500, 300),
    new Pump('cng', 800, 300)
];
```

---

## Troubleshooting

**Game won't start?**
- Try opening it with a web server instead of directly
- Clear browser cache (Ctrl+Shift+Delete)
- Try a different browser

**Sprites not showing?**
- Verify all PNG files are in the `assets/` folder
- Check that filenames match exactly (case-sensitive on Mac/Linux)
- Open browser console (F12) and look for error messages

**High score not saving?**
- Make sure you're not in private/incognito mode
- Check browser localStorage is enabled

---

## 📞 Support

If you run into issues:
1. Check the README.md for detailed documentation
2. Review the browser console for error messages (F12 → Console)
3. Verify all files are in the correct folders
4. Try running with a web server

---

**Enjoy playing Petrol Pump Rush!** 🎮⛽

For more details, see **README.md**
