/**
 * Game Objects - Car, Pump, Worker, FloatingText classes
 * Phase 3: Cars now have requestedAmount and support hold-to-fill
 * Phase 4: Worker walks up to cars, improved visual feedback
 */

class Car {
    constructor(fuelType) {
        this.fuelType = fuelType; // 'petrol', 'diesel', 'cng'
        this.x = 1300;
        this.y = CONFIG.layout.pumpY - 10 + (Math.random() * 30 - 15);
        const wave = (typeof gameState !== 'undefined' && gameState.wave) ? gameState.wave : 1;
        this.speed = Math.min(1.4 + (wave - 1) * 0.12, 2.8);
        this.targetX = 900;
        this.targetY = CONFIG.layout.pumpY - 10;
        this.state = 'queuing'; // queuing, waiting, arriving_pump, ready_to_fill, filling, leaving, explosion
        this.fillProgress = 0;
        this.isWrongFuel = false;
        this.width = 80;
        this.height = 52;
        this.carType = ['blue', 'yellow', 'truck'][Math.floor(Math.random() * 3)];
        this.bobOffset = Math.random() * Math.PI * 2;

        // Phase 3: Fuel amount request
        const { min, max, step } = CONFIG.fuelAmounts;
        this.requestedAmount = (Math.floor(Math.random() * ((max - min) / step + 1)) * step) + min;
        this.currentFillAmount = 0;
        this.accuracyResult = null; // Will be set after filling
    }

    update(dt = 1) {
        const ease = 1 - Math.pow(0.9, dt);

        if (this.state === 'queuing' || this.state === 'waiting') {
            // Determine queue position (two-row queue keeps cars on screen)
            let queueIndex = 0;
            for (let c of gameState.cars) {
                if (c === this) break;
                if (c.state === 'queuing' || c.state === 'waiting') queueIndex++;
            }
            const row = Math.floor(queueIndex / 3);
            const col = queueIndex % 3;
            const targetQueueX = 990 + col * 90;
            const targetQueueY = CONFIG.layout.pumpY - 10 + row * 95;

            // Smooth easing
            this.x += (targetQueueX - this.x) * ease;
            this.y += (targetQueueY - this.y) * ease;

            if (Math.abs(this.x - targetQueueX) < 1 && Math.abs(this.y - targetQueueY) < 1) {
                this.x = targetQueueX;
                this.y = targetQueueY;
                this.state = 'waiting';
            } else {
                this.state = 'queuing';
            }
        } else if (this.state === 'arriving_pump') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Smooth easing to pump
            this.x += dx * ease;
            this.y += dy * ease;

            if (dist < 2) {
                this.state = 'ready_to_fill';
                this.x = this.targetX;
                this.y = this.targetY;
            }
        } else if (this.state === 'filling') {
            // Filling is driven externally by the hold-to-fill system
            this.fillProgress = Math.min(this.currentFillAmount / (this.requestedAmount * 1.3), 1);
        } else if (this.state === 'leaving') {
            this.x -= this.speed * 3 * dt;
            if (this.x < -150) {
                return false;
            }
        }
        return true;
    }

    evaluateAccuracy() {
        if (this.isWrongFuel) {
            return 'WRONG_FUEL';
        }

        const diff = Math.abs(this.currentFillAmount - this.requestedAmount);

        if (diff <= CONFIG.accuracy.PERFECT.tolerance) {
            return 'PERFECT';
        } else if (diff <= CONFIG.accuracy.GOOD.tolerance) {
            return 'GOOD';
        } else if (this.currentFillAmount > this.requestedAmount) {
            return 'TOO_MUCH';
        } else {
            return 'TOO_LITTLE';
        }
    }

    completeFill() {
        const result = this.evaluateAccuracy();
        this.accuracyResult = result;
        const band = CONFIG.accuracy[result];

        this.state = 'leaving';

        if (result === 'PERFECT' || result === 'GOOD') {
            if (result === 'PERFECT') {
                sfx.fanfare();
            } else {
                sfx.success();
            }
            sfx.carLeave();
            let pts = Math.floor(CONFIG.baseReward * band.pointsMult * gameState.combo);
            pts += shop.getBonusReward();
            if (result === 'PERFECT') pts += CONFIG.perfectBonus;
            gameState.score += pts;
            gameState.combo++;
            gameState.carsServiced++;
            gameState.floatingTexts.push(new FloatingText(`+${pts}`, this.x, this.y - 40, band.color));
            gameState.floatingTexts.push(new FloatingText(band.label, this.x, this.y - 62, band.color));
            if (gameState.combo > 2) {
                gameState.floatingTexts.push(new FloatingText(`COMBO x${gameState.combo}`, this.x, this.y - 84, '#FF00FF'));
            }
        } else if (result === 'WRONG_FUEL') {
            sfx.wrong();
            gameState.score = Math.max(0, gameState.score - CONFIG.wrongFuelPenalty);
            gameState.combo = 1;
            gameState.wrongFuelCount++;
            gameState.lastStrikeCar = this;
            spawnBurst(this.x, this.y, 14, '#FF0000');
            gameState.shake = Math.max(gameState.shake, 0.4);
            gameState.flash = Math.max(gameState.flash, 0.45);
            gameState.floatingTexts.push(new FloatingText(`-${CONFIG.wrongFuelPenalty}`, this.x, this.y - 40, band.color));
            gameState.floatingTexts.push(new FloatingText(band.label, this.x, this.y - 62, band.color));
        } else {
            // TOO_MUCH or TOO_LITTLE
            sfx.wrong();
            gameState.score = Math.max(0, gameState.score - CONFIG.missTargetPenalty);
            gameState.combo = 1;
            gameState.wrongFuelCount++;
            gameState.lastStrikeCar = null;
            spawnBurst(this.x, this.y, 8, '#FF6600');
            gameState.shake = Math.max(gameState.shake, 0.2);
            gameState.floatingTexts.push(new FloatingText(`-${CONFIG.missTargetPenalty}`, this.x, this.y - 40, band.color));
            gameState.floatingTexts.push(new FloatingText(band.label, this.x, this.y - 62, band.color));
        }

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('pumpGameHighScore', gameState.highScore);
        }

        return result;
    }

    draw(ctx, isSelected) {
        // Idle bobbing so queued cars feel alive
        const bob = (this.state === 'waiting') ? Math.sin(Date.now() / 400 + this.bobOffset) * 2 : 0;

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 45, this.width * 0.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw car sprite
        const carSpec = assetManager.extractCarSprite(this.carType);
        assetManager.drawSprite(ctx, carSpec, this.x - this.width / 2, this.y - this.height / 2 + bob * 0.4, this.width, this.height);

        // Selected car gets a pulsing gold highlight
        if (this.state === 'waiting' && isSelected) {
            const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + pulse * 0.4})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 14 + pulse * 8;
            ctx.strokeRect(this.x - this.width / 2 - 4, this.y - this.height / 2 - 4 + bob * 0.4, this.width + 8, this.height + 8);
            ctx.shadowBlur = 0;
        }

        // Waiting (not selected) cars get a subtle blue hint that they are clickable
        if (this.state === 'waiting' && !isSelected) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - this.width / 2 - 3, this.y - this.height / 2 - 3 + bob * 0.4, this.width + 6, this.height + 6);
        }

        // Draw ready-to-fill indicator (pulsing green border)
        if (this.state === 'ready_to_fill') {
            const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(0, 255, 0, ${0.5 + pulse * 0.5})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00FF00';
            ctx.shadowBlur = 15 * pulse;
            ctx.strokeRect(this.x - this.width / 2 - 3, this.y - this.height / 2 - 3, this.width + 6, this.height + 6);
            ctx.shadowBlur = 0;
        }

        // Draw wrong fuel warning during filling
        if (this.state === 'filling' && this.isWrongFuel) {
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 12px "Press Start 2P", Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 8;
            ctx.fillText('X WRONG!', this.x, this.y - this.height / 2 - 15);
            ctx.shadowBlur = 0;
        }

        // Clearly show the car's requested fuel type AND amount
        if (this.state === 'queuing' || this.state === 'waiting') {
            const fuelColors = {
                'petrol': '#00BFFF',
                'diesel': '#32CD32',
                'cng': '#FFA500'
            };

            const label = `${this.fuelType.toUpperCase()} ${this.requestedAmount}`;
            const labelWidth = Math.max(80, label.length * 7);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(this.x - labelWidth / 2, this.y - this.height / 2 - 38, labelWidth, 22);

            ctx.fillStyle = fuelColors[this.fuelType];
            ctx.font = 'bold 8px "Press Start 2P", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, this.x, this.y - this.height / 2 - 22);
        }

        // Fill progress bar shown on the car while filling
        if (this.state === 'filling' && !gameState.fuelMeterShown) {
            const barW = 56;
            const pct = Math.min(this.currentFillAmount / this.requestedAmount, 1);
            const barY = this.y - this.height / 2 - 38;
            const fuelColors = { 'petrol': '#00BFFF', 'diesel': '#32CD32', 'cng': '#FFA500' };

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(this.x - barW / 2, barY, barW, 7);

            const barColor = pct >= 1 ? '#FF0000' : (fuelColors[this.fuelType] || '#00FF00');
            ctx.fillStyle = barColor;
            ctx.fillRect(this.x - barW / 2 + 1, barY + 1, (barW - 2) * pct, 5);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(this.x + (pct >= 1 ? barW / 2 - 2 : barW / 2 - 2), barY - 1, 2, 9);
        }
    }

    contains(x, y) {
        return x > this.x - this.width / 2 - 5 && x < this.x + this.width / 2 + 5 &&
               y > this.y - this.height / 2 - 8 && y < this.y + this.height / 2 + 8;
    }
}

class Pump {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 70;
        this.selected = false;
        this.inUse = false;
    }

    draw(ctx) {
        const pumpSpec = assetManager.extractPumpSprite(this.type);
        assetManager.drawSprite(ctx, pumpSpec, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        if (this.selected) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
            ctx.strokeRect(this.x - this.width / 2 - 4, this.y - this.height / 2 - 4, this.width + 8, this.height + 8);
            ctx.shadowBlur = 0;
        } else if (this.inUse) {
            // Soft glow while a car is being filled here
            const pulse = Math.sin(Date.now() / 250) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 + pulse * 0.4})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - this.width / 2 - 4, this.y - this.height / 2 - 4, this.width + 8, this.height + 8);
        }

        // Pump Label below the sprite
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.type.toUpperCase(), this.x, this.y + this.height / 2 + 22);
        ctx.shadowBlur = 0;

        // Fallback
        if (!assetManager.getImage('sprites')) {
            const colors = { petrol: '#0099FF', diesel: '#00CC00', cng: '#FF8800' };
            ctx.fillStyle = colors[this.type];
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.type === 'petrol' ? 'P' : this.type === 'diesel' ? 'D' : 'C', this.x, this.y + 5);
        }
    }

    contains(x, y) {
        return x > this.x - this.width / 2 - 5 && x < this.x + this.width / 2 + 5 &&
               y > this.y - this.height / 2 - 5 && y < this.y + this.height / 2 + 5;
    }
}

class Worker {
    constructor(x, y) {
        this.homeX = x;
        this.homeY = y;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.state = 'idle';
        this.animationFrame = 0;
        this.moving = false;
        this.flip = false;
        this.width = 36;
        this.height = 56;
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    goHome() {
        this.targetX = this.homeX;
        this.targetY = this.homeY;
    }

    update(dt = 1) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 3.0 * dt;

        if (dist > 3) {
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed;
            this.moving = true;
            this.flip = dx < 0;

            this.animationFrame += 0.16 * dt;
            if (this.animationFrame >= 2) this.animationFrame = 0;
            this.state = this.animationFrame < 1 ? 'walk1' : 'walk2';
        } else {
            this.moving = false;
            this.state = 'idle';
            this.animationFrame = 0;
        }
    }

    draw(ctx) {
        const spec = assetManager.extractWorkerSprite(this.state);
        if (!spec) return;

        ctx.save();

        // Small bobbing while walking feels lively
        const bob = this.moving ? Math.sin(this.animationFrame * Math.PI) * 1.5 : 0;

        if (this.flip) {
            ctx.translate(this.x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, 0);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        assetManager.drawSprite(ctx, spec, this.x - this.width / 2, this.y - this.height + bob, this.width, this.height);

        ctx.restore();

        // Fallback if sprites missing
        if (!assetManager.getImage('sprites')) {
            ctx.fillStyle = '#1E90FF';
            ctx.fillRect(this.x - 15, this.y - 40, 30, 40);
            ctx.fillStyle = '#FFB366';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 45, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class FloatingText {
    constructor(text, x, y, color, big = false) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0;
        this.vy = -1;
        this.big = big;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(this.life, 0);
        ctx.fillStyle = this.color;
        ctx.font = this.big ? 'bold 20px "Press Start 2P", Arial' : 'bold 14px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
        this.size = 5 + Math.random() * 15;
        const colors = ['#FF0000', '#FF6600', '#FFAA00', '#FFFF00', '#FFFFFF'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.95;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(this.life, 0);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(this.size, 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
