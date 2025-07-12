const { ipcRenderer } = require('electron');

class BreathingApp {
    constructor() {
        this.breatheInDuration = 5000; // 5 seconds (inhale)
        this.breatheOutDuration = 5000; // 5 seconds (exhale)
        this.isRunning = false;
        this.currentCycle = 0;
        this.totalCycles = 5;
        this.completedSessions = 0;
        this.totalMinutes = 0;
        this.currentPhase = 'idle'; // 'idle', 'breatheIn', 'breatheOut'
        this.sessionStartTime = null;
        this.phaseTimeout = null;
        
        this.initElements();
        this.initEventListeners();
        this.loadStats();
        this.updateDisplay();
    }
    
    initElements() {
        this.breatheVisual = document.getElementById('breatheVisual');
        this.instruction = document.getElementById('instruction');
        this.cycleInfo = document.getElementById('cycleInfo');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.cycleButtons = document.querySelectorAll('.cycle-btn');
        this.settingsIcon = document.getElementById('settingsIcon');
        this.backIcon = document.getElementById('backIcon');
        this.breatheContainer = document.getElementById('breatheContainer');
        this.settingsContainer = document.getElementById('settingsContainer');
        this.cycleRadios = document.querySelectorAll('input[name="cycles"]');
        this.notificationsToggle = document.getElementById('notificationsToggle');
    }
    
    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        this.cycleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isRunning) {
                    this.selectCycles(parseInt(e.target.dataset.cycles));
                }
            });
        });
        
        this.settingsIcon.addEventListener('click', () => this.showSettings());
        this.backIcon.addEventListener('click', () => this.hideSettings());
        
        this.cycleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleCycleChange(e));
        });
        
        this.notificationsToggle.addEventListener('change', () => this.saveSettings());
    }
    
    selectCycles(cycles) {
        this.totalCycles = cycles;
        this.cycleButtons.forEach(btn => {
            if (parseInt(btn.dataset.cycles) === cycles) {
                btn.className = 'cycle-btn h-10 rounded-full border-2 border-blue-500 bg-blue-500/20 text-blue-300 font-medium transition-all hover:bg-blue-500/30 text-sm';
            } else {
                btn.className = 'cycle-btn h-10 rounded-full border-2 border-white/20 bg-white/5 text-white/70 font-medium transition-all hover:bg-white/10 text-sm';
            }
        });
        this.updateDisplay();
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.currentCycle = 0;
        this.sessionStartTime = Date.now();
        this.startBtn.classList.add('hidden');
        this.stopBtn.classList.remove('hidden');
        
        // Disable cycle selection during session
        this.cycleButtons.forEach(btn => btn.style.opacity = '0.5');
        
        this.startBreatheCycle();
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.currentPhase = 'idle';
        
        if (this.phaseTimeout) {
            clearTimeout(this.phaseTimeout);
            this.phaseTimeout = null;
        }
        
        // Calculate session time and update stats
        if (this.sessionStartTime && this.currentCycle > 0) {
            const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const sessionMinutes = Math.round(sessionTime / 60);
            this.totalMinutes += sessionMinutes;
            
            // Only count as completed if user did at least one full cycle
            if (this.currentCycle >= 1) {
                this.completedSessions++;
            }
            
            this.saveStats();
        }
        
        this.resetUI();
    }
    
    complete() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.currentPhase = 'idle';
        
        // Calculate session time
        const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const sessionMinutes = Math.round(sessionTime / 60);
        this.totalMinutes += sessionMinutes;
        this.completedSessions++;
        this.saveStats();
        
        this.showNotification('Meditation Complete', `Great job! You completed ${this.totalCycles} breathing cycles.`);
        this.resetUI();
    }
    
    resetUI() {
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        this.cycleButtons.forEach(btn => btn.style.opacity = '1');
        this.breatheVisual.className = 'relative w-32 h-32 mb-8';
        this.instruction.textContent = '';
        this.updateDisplay();
    }
    
    startBreatheCycle() {
        if (!this.isRunning) return;
        
        if (this.currentCycle >= this.totalCycles) {
            this.complete();
            return;
        }
        
        this.currentCycle++;
        this.updateDisplay();
        this.breatheIn();
    }
    
    breatheIn() {
        if (!this.isRunning) return;
        
        this.currentPhase = 'breatheIn';
        this.breatheVisual.className = 'relative w-32 h-32 mb-8 breathing-in';
        this.instruction.textContent = 'Breathe In';
        
        this.phaseTimeout = setTimeout(() => {
            this.transitionToOut();
        }, this.breatheInDuration);
    }
    
    transitionToOut() {
        if (!this.isRunning) return;
        
        this.phaseTimeout = setTimeout(() => {
            this.breatheOut();
        }, 1000);
    }
    
    breatheOut() {
        if (!this.isRunning) return;
        
        this.currentPhase = 'breatheOut';
        this.breatheVisual.className = 'relative w-32 h-32 mb-8 breathing-out';
        this.instruction.textContent = 'Breathe Out';
        
        this.phaseTimeout = setTimeout(() => {
            this.transitionToNext();
        }, this.breatheOutDuration);
    }
    
    transitionToNext() {
        if (!this.isRunning) return;
        
        this.phaseTimeout = setTimeout(() => {
            this.startBreatheCycle();
        }, 1000);
    }
    
    updateDisplay() {
        this.cycleInfo.textContent = this.isRunning 
            ? `${this.currentCycle} of ${this.totalCycles} breaths`
            : `${this.totalCycles} breaths`;
    }
    
    showNotification(title, body) {
        if (window.Notification && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'assets/icon.png',
                silent: false
            });
        } else if (window.Notification && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, {
                        body: body,
                        icon: 'assets/icon.png',
                        silent: false
                    });
                }
            });
        }
    }
    
    saveStats() {
        localStorage.setItem('breathingStats', JSON.stringify({
            completedSessions: this.completedSessions,
            totalMinutes: this.totalMinutes
        }));
    }
    
    showSettings() {
        this.breatheContainer.style.display = 'none';
        this.settingsContainer.classList.remove('hidden');
    }
    
    hideSettings() {
        this.settingsContainer.classList.add('hidden');
        this.breatheContainer.style.display = 'flex';
    }
    
    handleCycleChange(e) {
        this.totalCycles = parseInt(e.target.value);
        this.selectCycles(this.totalCycles);
        this.updateSettingsUI();
        this.saveSettings();
    }
    
    saveSettings() {
        const settings = {
            defaultCycles: this.totalCycles,
            notifications: this.notificationsToggle.checked
        };
        localStorage.setItem('breathingSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const settings = localStorage.getItem('breathingSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.totalCycles = parsed.defaultCycles || 5;
            this.notificationsToggle.checked = parsed.notifications !== false;
            
            // Update UI to reflect loaded settings
            this.updateSettingsUI();
        }
    }
    
    updateSettingsUI() {
        // Update cycle radio buttons
        this.cycleRadios.forEach(radio => {
            radio.checked = parseInt(radio.value) === this.totalCycles;
            
            // Update visual appearance
            const cycleOption = radio.nextElementSibling;
            if (radio.checked) {
                cycleOption.className = 'cycle-option w-full h-12 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-300 font-medium cursor-pointer transition-all hover:bg-white/10';
            } else {
                cycleOption.className = 'cycle-option w-full h-12 bg-white/5 border-2 border-transparent rounded-full flex items-center justify-center text-white/70 font-medium cursor-pointer transition-all hover:bg-white/10';
            }
        });
        
        this.selectCycles(this.totalCycles);
    }
    
    loadStats() {
        const stats = localStorage.getItem('breathingStats');
        if (stats) {
            const parsed = JSON.parse(stats);
            this.completedSessions = parsed.completedSessions || 0;
            this.totalMinutes = parsed.totalMinutes || 0;
        }
        this.loadSettings();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new BreathingApp();
    
    if (window.Notification && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});