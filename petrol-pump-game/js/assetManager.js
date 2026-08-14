/**
 * AssetManager - Handles loading and caching of game assets
 */

class AssetManager {
    constructor() {
        this.images = {};
        this.loading = false;
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    async loadAssets(onProgress) {
        this.loading = true;

        const assetPaths = {
            background: 'assets/background.png',
            sprites: 'assets/sprite_transparent.png'  // Isometric sprite sheet (cars, pumps, worker)
        };

        this.totalCount = Object.keys(assetPaths).length;
        const promises = [];

        for (const [key, path] of Object.entries(assetPaths)) {
            promises.push(this.loadImage(key, path).then(() => {
                if (onProgress) onProgress(this.loadedCount, this.totalCount);
            }));
        }

        await Promise.all(promises);
        this.loading = false;
        return true;
    }

    loadImage(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                this.loadedCount++;
                resolve();
            };
            img.onerror = () => {
                console.warn(`Failed to load: ${path}`);
                this.loadedCount++;
                resolve(); // Continue even if one fails
            };
            img.src = path;
        });
    }

    getImage(name) {
        return this.images[name] || null;
    }

    getLoadProgress() {
        return (this.loadedCount / this.totalCount) * 100;
    }

    isLoading() {
        return this.loading;
    }

    // Sprite sheet extraction methods
    extractCarSprite(carType) {
        const spritesImg = this.getImage('sprites');
        if (!spritesImg) return null;

        // Extracted from sprite_transparent.png
        const carSpecs = {
            blue: { x: 173, y: 52, w: 229, h: 144 },
            yellow: { x: 597, y: 52, w: 225, h: 144 },
            truck: { x: 997, y: 17, w: 249, h: 179 }
        };

        return carSpecs[carType] || carSpecs.blue;
    }

    extractPumpSprite(pumpType) {
        const spritesImg = this.getImage('sprites');
        if (!spritesImg) return null;

        // Extracted from sprite_transparent.png
        const pumpSpecs = {
            petrol: { x: 211, y: 294, w: 151, h: 158 },
            diesel: { x: 627, y: 296, w: 150, h: 156 },
            cng: { x: 1036, y: 296, w: 149, h: 156 }
        };

        return pumpSpecs[pumpType] || pumpSpecs.petrol;
    }

    extractWorkerSprite(state) {
        const spritesImg = this.getImage('sprites');
        if (!spritesImg) return null;

        // Worker sprite positions
        const workerSpecs = {
            idle: { x: 263, y: 556, w: 61, h: 152 },
            walk1: { x: 662, y: 557, w: 85, h: 151 },
            walk2: { x: 1063, y: 557, w: 86, h: 151 }
        };

        return workerSpecs[state] || workerSpecs.idle;
    }

    extractUIIcon(iconType) {
        const uiImg = this.getImage('uiIcons');
        if (!uiImg) return null;

        // UI icon positions from UI_and_Icons.png
        const iconSpecs = {
            petrolIcon: { x: 1110, y: 68, w: 60, h: 60 },
            dieselIcon: { x: 1180, y: 68, w: 60, h: 60 },
            cngIcon: { x: 1320, y: 68, w: 60, h: 60 },
            hudPanel: { x: 310, y: 458, w: 400, h: 80 },
            restartBtn: { x: 780, y: 458, w: 200, h: 60 }
        };

        return iconSpecs[iconType] || null;
    }

    // Draw sprite sheet image on canvas
    drawSprite(ctx, spriteSpec, x, y, width, height) {
        const img = this.getImage('sprites');
        if (!img || !spriteSpec) return;

        try {
            ctx.drawImage(
                img,
                spriteSpec.x, spriteSpec.y, spriteSpec.w, spriteSpec.h,
                x, y, width, height
            );
        } catch (e) {
            console.warn('Error drawing sprite:', e);
        }
    }

    // Draw background image
    drawBackground(ctx, canvasWidth, canvasHeight) {
        const bgImg = this.getImage('background');
        if (!bgImg) {
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            return;
        }

        try {
            ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        } catch (e) {
            console.warn('Error drawing background:', e);
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    }
}

// Global asset manager instance
const assetManager = new AssetManager();
