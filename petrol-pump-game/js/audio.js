/**
 * Audio System - Web Audio API synthesizer for retro sound effects
 */
class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
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
        
        const bufferSize = this.ctx.sampleRate * duration;
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

    gameOver() {
        // Sad descending melody
        setTimeout(() => this.playTone(400, 'square', 0.2, 0.05), 0);
        setTimeout(() => this.playTone(350, 'square', 0.2, 0.05), 200);
        setTimeout(() => this.playTone(300, 'square', 0.4, 0.05), 400);
    }
}

const sfx = new SoundFX();
