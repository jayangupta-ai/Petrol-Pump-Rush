/**
 * Config - Centralized game constants for Phase 3
 * All rewards, penalties, tolerances, upgrade costs, and fill speed live here.
 */

const CONFIG = {
    // ===== ACCURACY BANDS =====
    accuracy: {
        PERFECT:    { tolerance: 5,   label: 'PERFECT!',    color: '#FFD700', pointsMult: 2.0 },
        GOOD:       { tolerance: 20,  label: 'GOOD',        color: '#00FF00', pointsMult: 1.0 },
        TOO_MUCH:   { label: 'TOO MUCH!',  color: '#FF6600', pointsMult: 0, penalty: 15 },
        TOO_LITTLE: { label: 'TOO LITTLE!', color: '#FF6600', pointsMult: 0, penalty: 15 },
        WRONG_FUEL: { label: 'WRONG FUEL!', color: '#FF0000', pointsMult: 0, penalty: 30 }
    },

    // ===== REWARDS & PENALTIES =====
    baseReward: 50,
    wrongFuelPenalty: 30,
    missTargetPenalty: 15,
    maxWrongFuel: 4,

    // ===== FILL MECHANICS =====
    baseFillSpeed: 2.5,       // units per frame while holding
    fuelAmounts: {
        min: 100,
        max: 500,
        step: 50             // amounts will be multiples of this
    },

    // ===== DIFFICULTY =====
    baseSpawnRate: 160,       // frames between spawns at start
    minSpawnRate: 60,         // fastest possible spawn rate
    spawnRateReduction: 10,   // reduction per score tier
    scoreTierSize: 200,       // score needed per difficulty step

    // ===== UPGRADE DEFINITIONS =====
    upgrades: {
        faster_service: {
            id: 'faster_service',
            name: 'Faster Service',
            description: 'Increases fill speed by 20% per level.',
            baseCost: 100,
            costMultiplier: 1.8,
            maxLevel: 5,
            effect: (level) => 1 + (level * 0.2) // multiplier for fill speed
        },
        queue_capacity: {
            id: 'queue_capacity',
            name: 'Queue Capacity',
            description: 'Allows more cars to wait in queue.',
            baseCost: 150,
            costMultiplier: 2.0,
            maxLevel: 4,
            effect: (level) => 3 + level // max queue size
        },
        bonus_reward: {
            id: 'bonus_reward',
            name: 'Bonus Reward',
            description: 'Adds +10 bonus points per successful fill.',
            baseCost: 120,
            costMultiplier: 1.8,
            maxLevel: 5,
            effect: (level) => level * 10 // flat bonus
        },
        mistake_protection: {
            id: 'mistake_protection',
            name: 'Mistake Protection',
            description: 'Increases wrong-fuel tolerance before Game Over.',
            baseCost: 200,
            costMultiplier: 2.5,
            maxLevel: 3,
            effect: (level) => 4 + level // max wrong fuel count
        },
        slower_progression: {
            id: 'slower_progression',
            name: 'Slower Difficulty',
            description: 'Difficulty ramps up more slowly.',
            baseCost: 180,
            costMultiplier: 2.0,
            maxLevel: 3,
            effect: (level) => 1 + (level * 0.3) // multiplier for scoreTierSize
        }
    },

    // Helper: get upgrade cost at a given level
    getUpgradeCost(upgradeId, currentLevel) {
        const def = this.upgrades[upgradeId];
        if (!def) return Infinity;
        return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
    }
};
