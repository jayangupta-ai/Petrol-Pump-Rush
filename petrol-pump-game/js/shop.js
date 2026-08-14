/**
 * Shop System - Upgrade shop with localStorage persistence
 */

class Shop {
    constructor() {
        this.levels = this.loadLevels();
    }

    loadLevels() {
        const saved = localStorage.getItem('pumpGameUpgrades');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        // Default: all upgrades at level 0
        const levels = {};
        for (const id of Object.keys(CONFIG.upgrades)) {
            levels[id] = 0;
        }
        return levels;
    }

    saveLevels() {
        localStorage.setItem('pumpGameUpgrades', JSON.stringify(this.levels));
    }

    getLevel(upgradeId) {
        return this.levels[upgradeId] || 0;
    }

    getEffect(upgradeId) {
        const def = CONFIG.upgrades[upgradeId];
        if (!def) return 0;
        return def.effect(this.getLevel(upgradeId));
    }

    canPurchase(upgradeId, currentScore) {
        const def = CONFIG.upgrades[upgradeId];
        if (!def) return false;
        const level = this.getLevel(upgradeId);
        if (level >= def.maxLevel) return false;
        const cost = CONFIG.getUpgradeCost(upgradeId, level);
        return currentScore >= cost;
    }

    purchase(upgradeId, gameState) {
        const def = CONFIG.upgrades[upgradeId];
        if (!def) return false;
        const level = this.getLevel(upgradeId);
        if (level >= def.maxLevel) return false;
        const cost = CONFIG.getUpgradeCost(upgradeId, level);
        if (gameState.score < cost) return false;

        gameState.score -= cost;
        this.levels[upgradeId] = level + 1;
        this.saveLevels();
        
        // Update high score if needed (score may have changed)
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('pumpGameHighScore', gameState.highScore);
        }
        
        return true;
    }

    resetAll() {
        for (const id of Object.keys(CONFIG.upgrades)) {
            this.levels[id] = 0;
        }
        this.saveLevels();
    }

    // Get derived game values based on current upgrade levels
    getFillSpeed() {
        return CONFIG.baseFillSpeed * this.getEffect('faster_service');
    }

    getMaxQueue() {
        return this.getEffect('queue_capacity');
    }

    getBonusReward() {
        return this.getEffect('bonus_reward');
    }

    getMaxWrongFuel() {
        return this.getEffect('mistake_protection');
    }

    getDifficultyMultiplier() {
        return this.getEffect('slower_progression');
    }
}

const shop = new Shop();
