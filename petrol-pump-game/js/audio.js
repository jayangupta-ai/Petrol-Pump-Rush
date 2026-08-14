/**
 * Audio System - Web Audio API synthesizer for retro sound effects
 */
class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicTimer = null;
        this.musicStep = 0;
        this.musicOn = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, vol = 0.1, slide = 0) {
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(freq * slide, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, vol = 0.1) {
        if (!this.enabled || !this.ctx) return;

        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    arrive() {
        // Short descending blip
        this.playTone(600, 'square', 0.15, 0.05, 0.5);
    }

    success() {
        // Happy ascending arpeggio
        setTimeout(() => this.playTone(400, 'square', 0.1, 0.05), 0);
        setTimeout(() => this.playTone(500, 'square', 0.1, 0.05), 100);
        setTimeout(() => this.playTone(600, 'square', 0.2, 0.05), 200);
    }

    fanfare() {
        // Golden reward fanfare for a PERFECT fill
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.12, 0.06), i * 90);
        });
        setTimeout(() => this.playTone(1319, 'square', 0.3, 0.06), notes.length * 90);
    }

    wrong() {
        // Harsh low buzzer
        this.playTone(150, 'sawtooth', 0.3, 0.1);
    }

    explosion() {
        // Noise generator crash
        this.playNoise(0.5, 0.2);
        this.playTone(100, 'sawtooth', 0.5, 0.1, 0.5); // low descending sub bass
    }

    select() {
        // UI click
        this.playTone(800, 'sine', 0.05, 0.05);
    }

    fillTick() {
        // Pump clicking sound while filling
        this.playTone(1100 + Math.random() * 200, 'square', 0.03, 0.03);
    }

    carLeave() {
        // Whoosh as the car drives away
        this.playTone(300, 'sine', 0.2, 0.03, 0.3);
    }

    gameOver() {
        // Sad descending melody
        setTimeout(() => this.playTone(400, 'square', 0.2, 0.05), 0);
        setTimeout(() => this.playTone(350, 'square', 0.2, 0.05), 200);
        setTimeout(() => this.playTone(300, 'square', 0.4, 0.05), 400);
    }

    // ===== BACKGROUND MUSIC =====
    startMusic() {
        if (!this.enabled || !this.ctx) return;
        if (this.musicTimer) return;
        this.musicOn = true;
        this.musicStep = 0;
        this.musicTimer = setInterval(() => this.playMusicStep(), 190);
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
        this.musicOn = false;
    }

    playMusicStep() {
        if (!this.enabled || !this.ctx) return;
        const step = this.musicStep % 16;
        this.musicStep++;

        // Simple bass pulse on beats
        const bass = [110, 87.3, 98, 82.4];
        if (step % 4 === 0) {
            this.playTone(bass[Math.floor(step / 4)], 'triangle', 0.16, 0.035);
        }

        // Cheerful pentatonic melody
        const melody = [330, 392, 330, 440, 392, 330, 294, 330, 262, 330, 392, 330, 440, 392, 440, 330];
        if (step % 2 === 0) {
            this.playTone(melody[step], 'square', 0.1, 0.012);
        }
    }
}

const sfx = new SoundFX();
