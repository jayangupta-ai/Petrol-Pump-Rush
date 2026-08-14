/**
 * Main Game Logic - Petrol Pump Rush
 * Phase 3: Hold-to-fill, upgrade shop, fuel amounts, accuracy
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== GAME STATE =====
let currentGameState = 'START'; // START, PLAYING, PAUSED, GAMEOVER, SHOP

let gameState = {
    score: 0,
    highScore: parseInt(localStorage.getItem('pumpGameHighScore')) || 0,
    wrongFuelCount: 0,
    combo: 1,
    currentCar: null,
    selectedPump: null,
    fillingCar: null,       // The car currently being filled via hold-to-fill
    isFilling: false,       // Whether the player is currently holding to fill
    cars: [],
    floatingTexts: [],
    particles: [],          // Phase 4: Explosion particles
    frameCount: 0,
    worker: null,
    wave: 1,
    carsServiced: 0,
    bestCombo: 1
};

// ===== PUMP SETUP =====
const pumps = [
    new Pump('petrol', 464, 420),
    new Pump('diesel', 633, 490),
    new Pump('cng', 801, 560)
];

// ===== INITIALIZATION =====
async function initApp() {
    showLoadingScreen();
    const assetsLoaded = await assetManager.loadAssets();
    hideLoadingScreen();

    if (!assetsLoaded) console.warn('Some assets failed to load');
    
    // Check if tutorial is needed
    if (!localStorage.getItem('pumpGameTutorialShown')) {
        document.getElementById('tutorialScreen').style.display = 'flex';
    } else {
        document.getElementById('startScreen').style.display = 'flex';
    }
    draw();
}

function startGame() {
    currentGameState = 'PLAYING';
    
    const maxWrong = shop.getMaxWrongFuel();
    
    gameState = {
        score: 0,
        highScore: parseInt(localStorage.getItem('pumpGameHighScore')) || 0,
        wrongFuelCount: 0,
        combo: 1,
        currentCar: null,
        selectedPump: null,
        fillingCar: null,
        isFilling: false,
        cars: [],
        floatingTexts: [],
        particles: [],
        frameCount: 0,
        worker: new Worker(800, 300),
        wave: 1,
        carsServiced: 0,
        bestCombo: 1
    };

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('shopScreen').style.display = 'none';
    document.getElementById('fuelMeterOverlay').style.display = 'none';
    
    updateUI();
    requestAnimationFrame(gameLoop);
}

function showLoadingScreen() {
    if (!document.getElementById('loadingScreen')) {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loadingScreen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <h2>Loading Game Assets...</h2>
                <div class="spinner"></div>
                <p id="loadingProgress">0%</p>
            </div>
        `;
        document.body.appendChild(loadingScreen);
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'none';
}

// ===== CAR SPAWNING =====
function spawnCar() {
    const maxQueue = shop.getMaxQueue();
    const queueCount = gameState.cars.filter(c => c.state === 'queuing' || c.state === 'waiting').length;
    if (queueCount >= maxQueue) return; // Queue full!

    const fuelTypes = ['petrol', 'diesel', 'cng'];
    const randomFuel = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
    gameState.cars.push(new Car(randomFuel));
    sfx.arrive();
}

// ===== INPUT HANDLING =====
canvas.addEventListener('click', (e) => {
    if (currentGameState !== 'PLAYING') return;
    if (gameState.isFilling || gameState.fillingCar) return; // Don't allow clicks while filling

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check if car was clicked
    for (let car of gameState.cars) {
        if (car.state === 'waiting' && car.contains(x, y)) {
            sfx.select();
            gameState.currentCar = car;
            return;
        }
    }

    // Check if pump was clicked
    for (let pump of pumps) {
        if (pump.contains(x, y)) {
            pumps.forEach(p => p.selected = false);
            pump.selected = true;
            gameState.selectedPump = pump;

            if (gameState.currentCar && gameState.currentCar.state === 'waiting') {
                sfx.select();
                const car = gameState.currentCar;
                car.targetX = pump.x + 40;
                car.targetY = pump.y - 20;
                car.state = 'arriving_pump';
                car.isWrongFuel = (car.fuelType !== pump.type);
                gameState.currentCar = null;
            }
            return;
        }
    }
});

// ===== HOLD-TO-FILL SYSTEM =====
function startFilling() {
    if (currentGameState !== 'PLAYING') return;
    if (gameState.isFilling) return; // Prevent duplicate

    // Find the car that is ready_to_fill
    const car = gameState.cars.find(c => c.state === 'ready_to_fill');
    if (!car) return;

    sfx.init(); // Ensure audio context is ready
    gameState.fillingCar = car;
    gameState.isFilling = true;
    car.state = 'filling';
    car.currentFillAmount = 0;

    // Show fuel meter overlay
    showFuelMeter(car);
}

function stopFilling() {
    if (!gameState.isFilling || !gameState.fillingCar) return;

    const car = gameState.fillingCar;
    gameState.isFilling = false;

    // Evaluate accuracy
    const result = car.completeFill();
    
    // Stats tracking
    if (result === 'PERFECT' || result === 'GOOD') {
        gameState.carsServiced++;
        if (gameState.combo > gameState.bestCombo) gameState.bestCombo = gameState.combo;
        
        // Wave progression: every 10 cars
        if (gameState.carsServiced % 10 === 0) {
            gameState.wave++;
            gameState.floatingTexts.push(new FloatingText(`WAVE ${gameState.wave}!`, canvas.width/2, canvas.height/2, '#00FF00'));
        }
    }
    
    // Show result on meter
    showFuelMeterResult(result);
    
    // Check game over
    const maxWrong = shop.getMaxWrongFuel();
    if (gameState.wrongFuelCount >= maxWrong) {
        setTimeout(() => {
            hideFuelMeter();
            triggerGameOver();
        }, 800);
    } else {
        setTimeout(() => {
            hideFuelMeter();
            gameState.fillingCar = null;
            updateUI();
        }, 1200);
    }
}

function updateFilling() {
    if (!gameState.isFilling || !gameState.fillingCar) return;

    const car = gameState.fillingCar;
    const fillSpeed = shop.getFillSpeed();
    car.currentFillAmount += fillSpeed;
    
    // Cap at 130% of requested (for overfill)
    const maxFill = car.requestedAmount * 1.3;
    if (car.currentFillAmount >= maxFill) {
        car.currentFillAmount = maxFill;
        stopFilling(); // Auto-stop at max
        return;
    }

    // Update fuel meter UI
    updateFuelMeterUI(car);
}

// ===== FUEL METER UI =====
function showFuelMeter(car) {
    const overlay = document.getElementById('fuelMeterOverlay');
    const fuelColors = { petrol: '#00BFFF', diesel: '#32CD32', cng: '#FFA500' };
    
    document.getElementById('fuelMeterTitle').textContent = `FILLING: ${car.fuelType.toUpperCase()} — ${car.requestedAmount}`;
    document.getElementById('fuelMeterTitle').style.color = fuelColors[car.fuelType] || '#FFD700';
    document.getElementById('fuelMeterTarget').textContent = car.requestedAmount;
    document.getElementById('fuelMeterCurrent').textContent = '0';
    document.getElementById('fuelMeterResult').style.display = 'none';
    
    // Position target line
    const maxFill = car.requestedAmount * 1.3;
    const targetPercent = (car.requestedAmount / maxFill) * 100;
    document.getElementById('fuelMeterTargetLine').style.left = targetPercent + '%';
    
    // Position perfect zone
    const perfectTol = CONFIG.accuracy.PERFECT.tolerance;
    const perfectLeft = ((car.requestedAmount - perfectTol) / maxFill) * 100;
    const perfectRight = ((car.requestedAmount + perfectTol) / maxFill) * 100;
    const perfectZone = document.getElementById('fuelMeterPerfectZone');
    perfectZone.style.left = perfectLeft + '%';
    perfectZone.style.width = (perfectRight - perfectLeft) + '%';
    
    // Position good zone
    const goodTol = CONFIG.accuracy.GOOD.tolerance;
    const goodLeft = ((car.requestedAmount - goodTol) / maxFill) * 100;
    const goodRight = ((car.requestedAmount + goodTol) / maxFill) * 100;
    const goodZone = document.getElementById('fuelMeterGoodZone');
    goodZone.style.left = goodLeft + '%';
    goodZone.style.width = (goodRight - goodLeft) + '%';
    
    // Reset fill bar
    document.getElementById('fuelMeterFill').style.width = '0%';
    
    overlay.style.display = 'flex';
}

function updateFuelMeterUI(car) {
    const maxFill = car.requestedAmount * 1.3;
    const fillPercent = (car.currentFillAmount / maxFill) * 100;
    
    document.getElementById('fuelMeterFill').style.width = fillPercent + '%';
    document.getElementById('fuelMeterCurrent').textContent = Math.floor(car.currentFillAmount);
    
    // Color the fill bar based on proximity to target
    const diff = Math.abs(car.currentFillAmount - car.requestedAmount);
    const fill = document.getElementById('fuelMeterFill');
    if (diff <= CONFIG.accuracy.PERFECT.tolerance) {
        fill.style.background = 'linear-gradient(90deg, #FFD700, #FFFF00)';
    } else if (diff <= CONFIG.accuracy.GOOD.tolerance) {
        fill.style.background = 'linear-gradient(90deg, #00CC00, #00FF00)';
    } else if (car.currentFillAmount > car.requestedAmount) {
        fill.style.background = 'linear-gradient(90deg, #FF6600, #FF3300)';
    } else {
        fill.style.background = 'linear-gradient(90deg, #00CC00, #00FF00)';
    }
}

function showFuelMeterResult(result) {
    const band = CONFIG.accuracy[result];
    const resultEl = document.getElementById('fuelMeterResult');
    resultEl.textContent = band.label;
    resultEl.style.color = band.color;
    resultEl.style.display = 'block';
}

function hideFuelMeter() {
    document.getElementById('fuelMeterOverlay').style.display = 'none';
}

// ===== POINTER EVENTS FOR HOLD-TO-FILL =====
// Use pointer events so it works on both mouse and touch
const fuelMeterOverlay = document.getElementById('fuelMeterOverlay');

fuelMeterOverlay.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startFilling();
});

fuelMeterOverlay.addEventListener('pointerup', (e) => {
    e.preventDefault();
    stopFilling();
});

fuelMeterOverlay.addEventListener('pointerleave', (e) => {
    // Safety: stop filling if pointer leaves the overlay
    if (gameState.isFilling) {
        stopFilling();
    }
});

// Also listen on canvas for when a car is ready_to_fill (pressing starts the meter)
canvas.addEventListener('pointerdown', (e) => {
    if (currentGameState !== 'PLAYING') return;
    
    // Check if any car is ready_to_fill
    const readyCar = gameState.cars.find(c => c.state === 'ready_to_fill');
    if (readyCar) {
        e.preventDefault();
        startFilling();
    }
});

canvas.addEventListener('pointerup', (e) => {
    if (gameState.isFilling) {
        e.preventDefault();
        stopFilling();
    }
});

// ===== SHOP UI =====
function renderShop() {
    const container = document.getElementById('shopItems');
    container.innerHTML = '';
    
    document.getElementById('shopBalance').textContent = `Balance: ${gameState.score} pts`;

    for (const [id, def] of Object.entries(CONFIG.upgrades)) {
        const level = shop.getLevel(id);
        const isMaxed = level >= def.maxLevel;
        const cost = isMaxed ? 0 : CONFIG.getUpgradeCost(id, level);
        const canBuy = !isMaxed && gameState.score >= cost;

        const item = document.createElement('div');
        item.className = 'shop-item';
        
        item.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-name">${def.name}</div>
                <div class="shop-item-desc">${def.description}</div>
                <div class="shop-item-level">Lv ${level} / ${def.maxLevel}</div>
            </div>
            <button class="shop-buy-btn ${isMaxed ? 'maxed' : ''}" 
                    data-upgrade="${id}" 
                    ${!canBuy ? 'disabled' : ''}>
                ${isMaxed ? 'MAX' : cost + ' pts'}
            </button>
        `;
        
        container.appendChild(item);
    }
    
    // Attach buy events
    container.querySelectorAll('.shop-buy-btn:not(.maxed):not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const upgradeId = btn.getAttribute('data-upgrade');
            if (shop.purchase(upgradeId, gameState)) {
                sfx.success();
                renderShop();
                updateUI();
            }
        });
    });
}

function openShop(returnTo) {
    gameState._shopReturnTo = returnTo;
    document.getElementById('shopScreen').style.display = 'flex';
    
    // Hide other screens
    if (returnTo === 'START') document.getElementById('startScreen').style.display = 'none';
    if (returnTo === 'PAUSED') document.getElementById('pauseScreen').style.display = 'none';
    if (returnTo === 'GAMEOVER') document.getElementById('gameOver').style.display = 'none';
    
    renderShop();
}

function closeShop() {
    document.getElementById('shopScreen').style.display = 'none';
    const returnTo = gameState._shopReturnTo || 'START';
    
    if (returnTo === 'START') document.getElementById('startScreen').style.display = 'flex';
    if (returnTo === 'PAUSED') document.getElementById('pauseScreen').style.display = 'flex';
    if (returnTo === 'GAMEOVER') document.getElementById('gameOver').style.display = 'flex';
}

// ===== GAME OVER =====
function triggerGameOver() {
    currentGameState = 'GAMEOVER';
    sfx.explosion();
    setTimeout(() => sfx.gameOver(), 500);
    
    gameState.isFilling = false;
    gameState.fillingCar = null;
    
    gameState.cars.forEach(car => {
        if (car.state === 'filling' && car.isWrongFuel) {
            car.state = 'explosion';
            // Spawn particles
            for(let i=0; i<30; i++) {
                gameState.particles.push(new Particle(car.x, car.y));
            }
        }
    });
    
    document.getElementById('finalScore').textContent = `Final Score: ${gameState.score}`;
    document.getElementById('statsWave').textContent = `Wave Reached: ${gameState.wave}`;
    document.getElementById('statsCars').textContent = `Cars Serviced: ${gameState.carsServiced}`;
    document.getElementById('statsCombo').textContent = `Best Combo: x${gameState.bestCombo}`;
    
    document.getElementById('gameOverMessage').textContent = 'WRONG FUEL EXPLOSION! 💥';
    document.getElementById('gameOver').style.display = 'flex';
}

// ===== UI UPDATE =====
function updateUI() {
    document.getElementById('scoreDisplay').textContent = String(gameState.score).padStart(5, '0');
    document.getElementById('highDisplay').textContent = String(gameState.highScore).padStart(5, '0');
    document.getElementById('comboDisplay').textContent = 'x' + gameState.combo;
    document.getElementById('waveDisplay').textContent = gameState.wave;

    // Update wrong fuel indicator (dynamic based on upgrade)
    const maxWrong = shop.getMaxWrongFuel();
    const wrongFuelDots = document.getElementById('wrongFuelDots');
    wrongFuelDots.innerHTML = '';
    for (let i = 0; i < maxWrong; i++) {
        const dot = document.createElement('div');
        dot.className = 'fuel-dot';
        if (i < gameState.wrongFuelCount) {
            dot.className += ' x';
            dot.textContent = '✕';
        }
        wrongFuelDots.appendChild(dot);
    }
}

// ===== DRAWING =====
function draw() {
    assetManager.drawBackground(ctx, canvas.width, canvas.height);

    if (!assetManager.getImage('background')) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999999';
        ctx.fillRect(0, 250, canvas.width, 350);
    }

    pumps.forEach(pump => pump.draw(ctx));

    if (gameState.worker) {
        gameState.worker.update();
        gameState.worker.draw(ctx);
    }

    gameState.cars.forEach(car => {
        if (car.state !== 'explosion') {
            car.draw(ctx);
        }
    });
    
    gameState.particles.forEach(p => p.draw(ctx));

    gameState.floatingTexts.forEach(text => text.draw(ctx));

    if (gameState.currentCar) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 14px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('↓ ATTENDING ↓', gameState.currentCar.x, gameState.currentCar.y - 70);
    }

    // Show "HOLD TO FILL" prompt when car is ready
    const readyCar = gameState.cars.find(c => c.state === 'ready_to_fill');
    if (readyCar && !gameState.isFilling) {
        const pulse = Math.sin(Date.now() / 300) * 0.4 + 0.6;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 12px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HOLD TO FILL!', readyCar.x, readyCar.y - 70);
        ctx.restore();
    }
}

// ===== GAME LOOP =====
function gameLoop() {
    if (currentGameState !== 'PLAYING') return;

    gameState.frameCount++;
    
    // Difficulty scaling (affected by upgrade)
    const diffMult = shop.getDifficultyMultiplier();
    const effectiveTierSize = CONFIG.scoreTierSize * diffMult;
    let currentSpawnRate = Math.max(
        CONFIG.minSpawnRate,
        CONFIG.baseSpawnRate - Math.floor(gameState.score / effectiveTierSize) * CONFIG.spawnRateReduction
    );
    
    if (gameState.frameCount % currentSpawnRate === 0) {
        spawnCar();
    }

    // Update filling
    if (gameState.isFilling) {
        updateFilling();
    }

    // Update cars
    gameState.cars = gameState.cars.filter(car => car.update() !== false);
    
    // Update particles
    gameState.particles = gameState.particles.filter(p => p.update() !== false);
    
    // Update floating texts
    gameState.floatingTexts = gameState.floatingTexts.filter(text => text.update() !== false);

    draw();
    updateUI();

    requestAnimationFrame(gameLoop);
}

// ===== SETUP BUTTONS =====
document.getElementById('startBtn').addEventListener('click', () => {
    sfx.init();
    sfx.select();
    startGame();
});

document.getElementById('resumeBtn').addEventListener('click', () => {
    sfx.select();
    currentGameState = 'PLAYING';
    document.getElementById('pauseScreen').style.display = 'none';
    requestAnimationFrame(gameLoop);
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p') {
        if (currentGameState === 'PLAYING') {
            currentGameState = 'PAUSED';
            document.getElementById('pauseScreen').style.display = 'flex';
        } else if (currentGameState === 'PAUSED') {
            currentGameState = 'PLAYING';
            document.getElementById('pauseScreen').style.display = 'none';
            requestAnimationFrame(gameLoop);
        }
    }
});

document.getElementById('restartBtn').addEventListener('click', () => {
    sfx.select();
    startGame();
});

// Shop buttons
document.getElementById('shopBtnStart').addEventListener('click', () => {
    sfx.init();
    sfx.select();
    openShop('START');
});

document.getElementById('shopBtnPause').addEventListener('click', () => {
    sfx.select();
    openShop('PAUSED');
});

document.getElementById('shopBtnGameOver').addEventListener('click', () => {
    sfx.select();
    openShop('GAMEOVER');
});

document.getElementById('shopCloseBtn').addEventListener('click', () => {
    sfx.select();
    closeShop();
});

document.getElementById('resetProgressBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all upgrades and scores?")) {
        localStorage.clear();
        shop.resetAll();
        gameState.score = 0;
        gameState.highScore = 0;
        sfx.explosion();
        renderShop();
    }
});

// Tutorial & Settings
document.getElementById('tutorialGotItBtn').addEventListener('click', () => {
    sfx.init();
    sfx.select();
    localStorage.setItem('pumpGameTutorialShown', 'true');
    document.getElementById('tutorialScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
});

document.getElementById('soundToggleBtn').addEventListener('click', (e) => {
    sfx.enabled = !sfx.enabled;
    e.target.textContent = sfx.enabled ? '🔊' : '🔇';
    sfx.select();
});

// ===== START APP =====
initApp();
