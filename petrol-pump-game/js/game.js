/**
 * Main Game Logic - Petrol Pump Rush
 * Phase 3: Hold-to-fill, upgrade shop, fuel amounts, accuracy
 * Phase 4: Worker walks to cars, polished feedback, background music
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
    fuelMeterShown: false,  // Fuel meter overlay visibility
    cars: [],
    floatingTexts: [],
    particles: [],
    shake: 0,               // Screen shake intensity (0..1)
    flash: 0,               // Red flash intensity (0..1)
    lastStrikeCar: null,    // Car that caused the final strike
    frameCount: 0,
    worker: null,
    wave: 1,
    carsServiced: 0,
    bestCombo: 1
};

// ===== PUMP SETUP =====
const pumps = [
    new Pump('petrol', CONFIG.layout.firstPumpX, CONFIG.layout.pumpY),
    new Pump('diesel', CONFIG.layout.firstPumpX + CONFIG.layout.pumpSpacing, CONFIG.layout.pumpY),
    new Pump('cng', CONFIG.layout.firstPumpX + CONFIG.layout.pumpSpacing * 2, CONFIG.layout.pumpY)
];

// ===== HELPERS =====
function spawnBurst(x, y, count, colorOverride) {
    for (let i = 0; i < count; i++) {
        const p = new Particle(x, y);
        if (colorOverride && Math.random() < 0.7) p.color = colorOverride;
        gameState.particles.push(p);
    }
}

function getPumpForCar(car) {
    for (let pump of pumps) {
        if (pump.x === car.targetX - 55) return pump;
    }
    return null;
}

// ===== INITIALIZATION =====
async function initApp() {
    showLoadingScreen();
    const assetsLoaded = await assetManager.loadAssets((done, total) => {
        const el = document.getElementById('loadingProgress');
        if (el) el.textContent = Math.round((done / total) * 100) + '%';
    });
    hideLoadingScreen();

    if (!assetsLoaded) console.warn('Some assets failed to load');

    // Check if tutorial is needed
    if (!localStorage.getItem('pumpGameTutorialShown')) {
        document.getElementById('tutorialScreen').style.display = 'flex';
        document.getElementById('startScreen').style.display = 'none';
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
        fuelMeterShown: false,
        cars: [],
        floatingTexts: [],
        particles: [],
        shake: 0,
        flash: 0,
        lastStrikeCar: null,
        frameCount: 0,
        worker: new Worker(CONFIG.layout.workerHomeX, CONFIG.layout.workerHomeY),
        wave: 1,
        carsServiced: 0,
        bestCombo: 1
    };

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('shopScreen').style.display = 'none';
    document.getElementById('fuelMeterOverlay').style.display = 'none';

    // Kick things off with a couple of cars so the game isn't empty
    spawnCar();
    spawnCar();

    gameState.floatingTexts.push(new FloatingText('WAVE 1 - GO!', canvas.width / 2, canvas.height / 2, '#FFD700', true));

    sfx.startMusic();
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
            pumps.forEach(p => p.selected = false);
            gameState.selectedPump = null;
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
                car.targetX = pump.x + 55;
                car.targetY = pump.y - 12;
                car.state = 'arriving_pump';
                car.isWrongFuel = (car.fuelType !== pump.type);
                gameState.currentCar = null;
            }
            return;
        }
    }

    // Clicking empty space clears selection
    gameState.currentCar = null;
    pumps.forEach(p => p.selected = false);
    gameState.selectedPump = null;
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
    car.lastTick = 0;

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
        if (gameState.combo > gameState.bestCombo) gameState.bestCombo = gameState.combo;

        // Wave progression: every 10 cars
        if (gameState.carsServiced % 10 === 0) {
            gameState.wave++;
            gameState.floatingTexts.push(new FloatingText(`WAVE ${gameState.wave}!`, canvas.width / 2, canvas.height / 2, '#00FF00', true));
        }
    }

    // Show result on meter
    showFuelMeterResult(result);

    // Check game over
    const maxWrong = shop.getMaxWrongFuel();
    if (gameState.wrongFuelCount >= maxWrong) {
        const offendingCar = (result === 'WRONG_FUEL') ? car : gameState.lastStrikeCar;
        setTimeout(() => {
            hideFuelMeter();
            triggerGameOver(offendingCar);
        }, 750);
    } else {
        setTimeout(() => {
            hideFuelMeter();
            gameState.fillingCar = null;
            updateUI();
        }, 750);
    }
}

function updateFilling(dt) {
    if (!gameState.isFilling || !gameState.fillingCar) return;

    const car = gameState.fillingCar;
    const fillSpeed = shop.getFillSpeed();
    car.currentFillAmount += fillSpeed * dt;

    // Fill tick sound at regular intervals
    if (car.currentFillAmount >= car.lastTick + CONFIG.fillTickInterval) {
        sfx.fillTick();
        car.lastTick = car.currentFillAmount;
    }

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

    gameState.fuelMeterShown = true;

    document.getElementById('fuelMeterTitle').textContent = `FILLING: ${car.fuelType.toUpperCase()}  ${car.requestedAmount}`;
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
    gameState.fuelMeterShown = false;
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
function triggerGameOver(offendingCar) {
    currentGameState = 'GAMEOVER';
    sfx.explosion();
    setTimeout(() => sfx.gameOver(), 500);
    sfx.stopMusic();

    gameState.isFilling = false;
    gameState.fillingCar = null;

    if (offendingCar) {
        offendingCar.state = 'explosion';
        spawnBurst(offendingCar.x, offendingCar.y, 45);
        gameState.shake = 1;
        gameState.flash = 1;
    } else {
        gameState.shake = 0.5;
        gameState.flash = 0.6;
    }

    // Run a short post-mortem animation so the explosion plays out
    gameState._postTimer = 0;
    requestAnimationFrame(postGameOverLoop);
}

function postGameOverLoop() {
    // Cancel if the game has been restarted
    if (currentGameState === 'PLAYING' || gameState._postTimer === undefined) return;

    gameState._postTimer++;

    // Keep particles and texts animating
    gameState.particles = gameState.particles.filter(p => p.update() !== false);
    gameState.floatingTexts = gameState.floatingTexts.filter(t => t.update() !== false);
    gameState.shake *= 0.92;
    gameState.flash -= 0.025;

    draw();

    if (gameState._postTimer < 110) {
        requestAnimationFrame(postGameOverLoop);
    } else {
        document.getElementById('finalScore').textContent = `Final Score: ${gameState.score}`;
        document.getElementById('statsWave').textContent = `Wave Reached: ${gameState.wave}`;
        document.getElementById('statsCars').textContent = `Cars Serviced: ${gameState.carsServiced}`;
        document.getElementById('statsCombo').textContent = `Best Combo: x${gameState.bestCombo}`;
        document.getElementById('gameOverMessage').textContent = offendingCarMessage();
        document.getElementById('gameOver').style.display = 'flex';
    }
}

function offendingCarMessage() {
    const maxWrong = shop.getMaxWrongFuel();
    if (gameState.wrongFuelCount >= maxWrong && gameState.lastStrikeCar) {
        return 'WRONG FUEL EXPLOSION!';
    }
    return 'TOO MANY MISTAKES! GAME OVER';
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
            dot.textContent = 'X';
        }
        wrongFuelDots.appendChild(dot);
    }
}

// ===== WORKER TARGETING =====
function updateWorkerTarget() {
    if (!gameState.worker) return;

    if (gameState.fillingCar) {
        // Stand next to the car being filled
        gameState.worker.setTarget(gameState.fillingCar.x - 34, gameState.fillingCar.y + 6);
        return;
    }

    // Walk to a car being served or selected
    const served = gameState.cars.find(c => c.state === 'arriving_pump' || c.state === 'ready_to_fill');
    if (served) {
        gameState.worker.setTarget(served.x - 34, served.y + 6);
        return;
    }

    if (gameState.currentCar) {
        gameState.worker.setTarget(gameState.currentCar.x - 34, gameState.currentCar.y + 6);
        return;
    }

    gameState.worker.goHome();
}

// ===== DRAWING =====
function draw() {
    ctx.save();

    // Screen shake
    if (gameState.shake > 0.01) {
        ctx.translate((Math.random() - 0.5) * gameState.shake * 14, (Math.random() - 0.5) * gameState.shake * 14);
    }

    assetManager.drawBackground(ctx, canvas.width, canvas.height);

    if (!assetManager.getImage('background')) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999999';
        ctx.fillRect(0, 250, canvas.width, 350);
    }

    pumps.forEach(pump => pump.draw(ctx));

    gameState.cars.forEach(car => {
        car.draw(ctx, gameState.currentCar === car);
    });

    if (gameState.worker) {
        gameState.worker.update();
        gameState.worker.draw(ctx);
    }

    gameState.particles.forEach(p => p.draw(ctx));

    gameState.floatingTexts.forEach(text => text.draw(ctx));

    if (gameState.currentCar) {
        const pulse = Math.sin(Date.now() / 200) * 0.4 + 0.6;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK PUMP', gameState.currentCar.x, gameState.currentCar.y - 75);
        ctx.restore();
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
        ctx.fillText('HOLD TO FILL!', readyCar.x, readyCar.y - 72);
        ctx.restore();
    }

    // Draw explosion wreck tint
    gameState.cars.forEach(car => {
        if (car.state === 'explosion') {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#FF4400';
            ctx.fillRect(car.x - car.width / 2, car.y - car.height / 2, car.width, car.height);
            ctx.restore();
        }
    });

    ctx.restore();

    // Red flash overlay for big mistakes
    if (gameState.flash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${Math.max(0, Math.min(0.35, gameState.flash * 0.35))})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ===== GAME LOOP =====
let lastFrameTime = null;

function gameLoop(timestamp) {
    if (currentGameState !== 'PLAYING') return;

    // Delta time normalized to 60fps (1.0 = one frame at 60fps), capped to avoid huge jumps
    const dt = lastFrameTime === null ? 1 : Math.min((timestamp - lastFrameTime) / 16.6667, 3);
    lastFrameTime = timestamp;

    gameState.frameCount++;
    gameState.spawnAccumulator = (gameState.spawnAccumulator || 0) + dt;

    // Difficulty scaling (affected by upgrade)
    const diffMult = shop.getDifficultyMultiplier();
    const effectiveTierSize = CONFIG.scoreTierSize * diffMult;
    let currentSpawnRate = Math.max(
        CONFIG.minSpawnRate,
        CONFIG.baseSpawnRate - Math.floor(gameState.score / effectiveTierSize) * CONFIG.spawnRateReduction
    );

    if (gameState.spawnAccumulator >= currentSpawnRate) {
        gameState.spawnAccumulator = 0;
        spawnCar();
    }

    // Update filling
    if (gameState.isFilling) {
        updateFilling(dt);
    }

    // Update cars
    gameState.cars = gameState.cars.filter(car => car.update(dt) !== false);

    // Update pump in-use state
    if (gameState.fillingCar) {
        pumps.forEach(p => p.inUse = (p === getPumpForCar(gameState.fillingCar)));
    } else {
        pumps.forEach(p => p.inUse = false);
    }

    // Update particles
    gameState.particles = gameState.particles.filter(p => p.update() !== false);

    // Update floating texts
    gameState.floatingTexts = gameState.floatingTexts.filter(text => text.update() !== false);

    // Decay shake/flash
    if (gameState.shake > 0) gameState.shake *= 0.92;
    if (gameState.flash > 0) gameState.flash -= 0.02;

    updateWorkerTarget();

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
    sfx.startMusic();
    requestAnimationFrame(gameLoop);
});

function togglePause() {
    if (currentGameState === 'PLAYING') {
        currentGameState = 'PAUSED';
        sfx.stopMusic();
        document.getElementById('pauseScreen').style.display = 'flex';
    } else if (currentGameState === 'PAUSED') {
        currentGameState = 'PLAYING';
        sfx.select();
        document.getElementById('pauseScreen').style.display = 'none';
        sfx.startMusic();
        requestAnimationFrame(gameLoop);
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p') {
        togglePause();
    }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    sfx.init();
    togglePause();
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
    sfx.init();
    sfx.enabled = !sfx.enabled;
    e.target.textContent = sfx.enabled ? 'ON' : 'OFF';
    if (sfx.enabled) {
        if (currentGameState === 'PLAYING') sfx.startMusic();
        sfx.select();
    } else {
        sfx.stopMusic();
    }
});

// ===== START APP =====
initApp();
