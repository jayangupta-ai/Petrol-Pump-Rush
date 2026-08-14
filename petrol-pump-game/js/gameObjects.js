/**
 * Game Objects - Car, Pump, Worker, FloatingText classes
 * Phase 3: Cars now have requestedAmount and support hold-to-fill
 */

class Car {
    constructor(fuelType) {
        this.fuelType = fuelType; // 'petrol', 'diesel', 'cng'
        this.x = Math.random() > 0.5 ? -80 : 1280;
        this.y = 500 + Math.random() * 40 - 20;
        this.speed = 1.2;
        this.targetX = 500;
        this.targetY = 420;
        this.state = 'queuing'; // queuing, waiting, arriving_pump, ready_to_fill, filling, leaving, explosion
        this.fillProgress = 0;
        this.isWrongFuel = false;
        this.width = 80;
        this.height = 52;
        this.carType = ['blue', 'yellow', 'truck'][Math.floor(Math.random() * 3)];

        // Phase 3: Fuel amount request
        const { min, max, step } = CONFIG.fuelAmounts;
        this.requestedAmount = (Math.floor(Math.random() * ((max - min) / step + 1)) * step) + min;
        this.currentFillAmount = 0;
        this.accuracyResult = null; // Will be set after filling
    }

    update() {
        if (this.state === 'queuing' || this.state === 'waiting') {
            // Determine queue position
            let queueIndex = 0;
            for (let c of gameState.cars) {
                if (c === this) break;
                if (c.state === 'queuing' || c.state === 'waiting') queueIndex++;
            }
            
            let targetQueueX = 1050 + (queueIndex * 100);
            
            // Smooth easing
            this.x += (targetQueueX - this.x) * 0.1;
            
            if (Math.abs(this.x - targetQueueX) < 1) {
                this.x = targetQueueX;
                this.state = 'waiting';
            } else {
                this.state = 'queuing';
            }
        } else if (this.state === 'arriving_pump') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Smooth easing to pump
            this.x += dx * 0.1;
            this.y += dy * 0.1;

            if (dist < 2) {
                // Phase 3: Go to ready_to_fill instead of auto-filling
                this.state = 'ready_to_fill';
                this.x = this.targetX;
                this.y = this.targetY;
            }
        } else if (this.state === 'filling') {
            // Filling is now driven externally by the hold-to-fill system
            // fillProgress is calculated as currentFillAmount / requestedAmount (capped at some max)
            this.fillProgress = Math.min(this.currentFillAmount / (this.requestedAmount * 1.3), 1);
        } else if (this.state === 'leaving') {
            this.x -= this.speed * 3;
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
            sfx.success();
            let pts = Math.floor(CONFIG.baseReward * band.pointsMult * gameState.combo);
            pts += shop.getBonusReward();
            gameState.score += pts;
            gameState.combo++;
            gameState.floatingTexts.push(new FloatingText(`+${pts}`, this.x, this.y - 40, band.color));
            gameState.floatingTexts.push(new FloatingText(band.label, this.x, this.y - 60, band.color));
            if (gameState.combo > 2) {
                gameState.floatingTexts.push(new FloatingText(`Combo x${gameState.combo}!`, this.x, this.y - 80, '#FF00FF'));
            }
        } else if (result === 'WRONG_FUEL') {
            sfx.wrong();
            gameState.score = Math.max(0, gameState.score - CONFIG.wrongFuelPenalty);
            gameState.combo = 1;
            gameState.wrongFuelCount++;
            gameState.floatingTexts.push(new FloatingText(`-${CONFIG.wrongFuelPenalty}`, this.x, this.y - 40, band.color));
            gameState.floatingTexts.push(new FloatingText(band.label, this.x, this.y - 60, band.color));
        } else {
            // TOO_MUCH or TOO_LITTLE
            sfx.wrong();
            gameState.score = Math.max(0, gameState.score - CONFIG.missTargetPenalty);
            gameState.combo = 1;
            gameState.wrongFuelCount++;
            gameState.floatingTexts.push(new FloatingText(`-${CONFIG.missTargetPenalty}`, this.x, this.y - 40, band.color));
            gameState.floatingTexts.push(new FloatingText(band.label, this.x, this.y - 60, band.color));
        }

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('pumpGameHighScore', gameState.highScore);
        }
        
        return result;
    }

    draw(ctx) {
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 45, this.width * 0.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw car sprite
        const carSpec = assetManager.extractCarSprite(this.carType);
        assetManager.drawSprite(ctx, carSpec, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Draw selection highlight (yellow border when waiting)
        if (this.state === 'waiting') {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FFFF00';
            ctx.shadowBlur = 10;
            ctx.strokeRect(this.x - this.width / 2 - 3, this.y - this.height / 2 - 3, this.width + 6, this.height + 6);
            ctx.shadowBlur = 0;
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
            ctx.font = 'bold 14px "Press Start 2P", Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 8;
            ctx.fillText('⚠ WRONG!', this.x, this.y - this.height / 2 - 15);
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
            ctx.fillRect(this.x - labelWidth / 2, this.y - this.height / 2 - 35, labelWidth, 22);
            
            ctx.fillStyle = fuelColors[this.fuelType];
            ctx.font = 'bold 8px "Press Start 2P", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, this.x, this.y - this.height / 2 - 19);
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
        this.width = 55;
        this.height = 72;
        this.selected = false;
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
        }

        // Pump Label below the sprite
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        const labelText = this.type.toUpperCase();
        ctx.fillText(labelText, this.x, this.y + this.height / 2 + 20);
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
        return x > this.x - this.width / 2 && x < this.x + this.width / 2 &&
               y > this.y - this.height / 2 && y < this.y + this.height / 2;
    }
}

class Worker {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = 'idle';
        this.animationFrame = 0;
        this.animationSpeed = 0.12;
        this.width = 35;
        this.height = 48;
    }

    update() {
        if (gameState.currentCar || gameState.fillingCar) {
            this.animationFrame += this.animationSpeed;
            if (this.animationFrame >= 3) this.animationFrame = 0;
            const states = ['idle', 'walk1', 'walk2'];
            this.state = states[Math.floor(this.animationFrame)];
        } else {
            this.state = 'idle';
            this.animationFrame = 0;
        }
    }

    draw(ctx) {
        const workerSpec = assetManager.extractWorkerSprite(this.state);
        assetManager.drawSprite(ctx, workerSpec, this.x - this.width / 2, this.y - this.height, this.width, this.height);

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
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0;
        this.vy = -1;
    }
    
    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px "Press Start 2P", Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
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
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
