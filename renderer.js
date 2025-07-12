// Remove direct electron access - now using secure electronAPI from preload script

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
        
        // Insights tracking
        this.currentWeekOffset = 0; // 0 = current week, -1 = previous week, etc.
        this.dailySessions = {}; // Store daily meditation data
        
        this.init();
    }
    
    async init() {
        this.initElements();
        this.initEventListeners();
        await this.loadStats();
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
        
        // Insights elements
        this.insightsIcon = document.getElementById('insightsIcon');
        this.insightsBackIcon = document.getElementById('insightsBackIcon');
        this.insightsContainer = document.getElementById('insightsContainer');
        this.todayMinutes = document.getElementById('todayMinutes');
        this.weekMinutes = document.getElementById('weekMinutes');
        this.monthMinutes = document.getElementById('monthMinutes');
        this.weeklyChart = document.getElementById('weeklyChart');
        this.weekRange = document.getElementById('weekRange');
        this.prevWeek = document.getElementById('prevWeek');
        this.nextWeek = document.getElementById('nextWeek');
        this.recentSessions = document.getElementById('recentSessions');
        
        // Completion elements
        this.completionOverlay = document.getElementById('completionOverlay');
        this.completionMessage = document.getElementById('completionMessage');
        this.completionCloseBtn = document.getElementById('completionCloseBtn');
        this.confettiContainer = document.getElementById('confettiContainer');
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
        
        this.insightsIcon.addEventListener('click', () => this.showInsights());
        this.insightsBackIcon.addEventListener('click', () => this.hideInsights());
        
        this.prevWeek.addEventListener('click', () => this.navigateWeek(-1));
        this.nextWeek.addEventListener('click', () => this.navigateWeek(1));
        
        this.cycleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleCycleChange(e));
        });
        
        this.notificationsToggle.addEventListener('change', () => this.saveSettings());
        
        this.completionCloseBtn.addEventListener('click', () => this.hideCompletionMessage());
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
    
    async stop() {
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
            
            await this.saveStats();
        }
        
        this.resetUI();
    }
    
    async complete() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.currentPhase = 'idle';
        
        // Calculate session time
        const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const sessionMinutes = Math.round(sessionTime / 60);
        this.totalMinutes += sessionMinutes;
        this.completedSessions++;
        
        // Save daily session data
        await this.saveDailySession(sessionMinutes, this.totalCycles);
        await this.saveStats();
        
        this.showCompletionMessage();
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
    
    async startBreatheCycle() {
        if (!this.isRunning) return;
        
        if (this.currentCycle >= this.totalCycles) {
            await this.complete();
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
        
        this.phaseTimeout = setTimeout(async () => {
            await this.startBreatheCycle();
        }, 1000);
    }
    
    updateDisplay() {
        this.cycleInfo.textContent = this.isRunning 
            ? `${this.currentCycle} of ${this.totalCycles} breaths`
            : `${this.totalCycles} breaths`;
    }
    
    showCompletionMessage() {
        this.completionMessage.textContent = `Great job! You completed ${this.totalCycles} breathing cycles.`;
        this.completionOverlay.classList.remove('hidden');
        this.completionOverlay.classList.add('completion-overlay');
        this.createConfetti();
    }
    
    hideCompletionMessage() {
        this.completionOverlay.classList.add('hidden');
        this.completionOverlay.classList.remove('completion-overlay');
        this.clearConfetti();
    }
    
    createConfetti() {
        this.clearConfetti();
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];
        
        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            this.confettiContainer.appendChild(confetti);
        }
        
        // Auto cleanup after animation
        setTimeout(() => {
            this.clearConfetti();
        }, 4000);
    }
    
    clearConfetti() {
        this.confettiContainer.innerHTML = '';
    }
    
    async saveStats() {
        const stats = {
            completedSessions: this.completedSessions,
            totalMinutes: this.totalMinutes
        };
        
        if (window.electronAPI) {
            await window.electronAPI.saveStats(stats);
        } else {
            // Fallback to localStorage for development
            localStorage.setItem('breathingStats', JSON.stringify(stats));
        }
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
    
    async saveSettings() {
        const settings = {
            defaultCycles: this.totalCycles,
            notifications: this.notificationsToggle.checked
        };
        
        if (window.electronAPI) {
            await window.electronAPI.saveSettings(settings);
        } else {
            // Fallback to localStorage for development
            localStorage.setItem('breathingSettings', JSON.stringify(settings));
        }
    }
    
    async loadSettings() {
        let settings = null;
        
        if (window.electronAPI) {
            settings = await window.electronAPI.loadSettings();
        } else {
            // Fallback to localStorage for development
            const settingsStr = localStorage.getItem('breathingSettings');
            if (settingsStr) {
                settings = JSON.parse(settingsStr);
            }
        }
        
        if (settings) {
            this.totalCycles = settings.defaultCycles || 5;
            this.notificationsToggle.checked = settings.notifications !== false;
            
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
    
    async loadStats() {
        let stats = null;
        
        if (window.electronAPI) {
            stats = await window.electronAPI.loadStats();
        } else {
            // Fallback to localStorage for development
            const statsStr = localStorage.getItem('breathingStats');
            if (statsStr) {
                stats = JSON.parse(statsStr);
            }
        }
        
        if (stats) {
            this.completedSessions = stats.completedSessions || 0;
            this.totalMinutes = stats.totalMinutes || 0;
        }
        
        await this.loadSettings();
        await this.loadDailySessions();
    }
    
    // Insights functionality
    showInsights() {
        this.breatheContainer.style.display = 'none';
        this.insightsContainer.classList.remove('hidden');
        this.updateInsightsData();
        this.renderWeeklyChart();
        this.renderRecentSessions();
    }
    
    hideInsights() {
        this.insightsContainer.classList.add('hidden');
        this.breatheContainer.style.display = 'flex';
    }
    
    async saveDailySession(minutes, cycles) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!this.dailySessions[today]) {
            this.dailySessions[today] = {
                minutes: 0,
                sessions: [],
                cycles: 0
            };
        }
        
        this.dailySessions[today].minutes += minutes;
        this.dailySessions[today].cycles += cycles;
        this.dailySessions[today].sessions.push({
            timestamp: Date.now(),
            minutes: minutes,
            cycles: cycles
        });
        
        if (window.electronAPI) {
            await window.electronAPI.saveDailySessions(this.dailySessions);
        } else {
            // Fallback to localStorage for development
            localStorage.setItem('dailySessions', JSON.stringify(this.dailySessions));
        }
    }
    
    async loadDailySessions() {
        let data = null;
        
        if (window.electronAPI) {
            data = await window.electronAPI.loadDailySessions();
        } else {
            // Fallback to localStorage for development
            const dataStr = localStorage.getItem('dailySessions');
            if (dataStr) {
                data = JSON.parse(dataStr);
            }
        }
        
        if (data) {
            this.dailySessions = data;
        }
    }
    
    updateInsightsData() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Today's minutes
        const todayMinutes = this.dailySessions[todayStr]?.minutes || 0;
        this.todayMinutes.textContent = todayMinutes;
        
        // This week's minutes
        const weekStart = this.getWeekStart(today);
        let weekMinutes = 0;
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            weekMinutes += this.dailySessions[dateStr]?.minutes || 0;
        }
        this.weekMinutes.textContent = weekMinutes;
        
        // This month's minutes
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        let monthMinutes = 0;
        
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            monthMinutes += this.dailySessions[dateStr]?.minutes || 0;
        }
        this.monthMinutes.textContent = monthMinutes;
    }
    
    renderWeeklyChart() {
        const today = new Date();
        const chartWeek = new Date(today);
        chartWeek.setDate(today.getDate() + (this.currentWeekOffset * 7));
        
        const weekStart = this.getWeekStart(chartWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        // Update week range display
        const options = { month: 'short', day: 'numeric' };
        this.weekRange.textContent = `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
        
        // Clear chart
        this.weeklyChart.innerHTML = '';
        
        // Get max minutes for scaling
        let maxMinutes = 0;
        const weekData = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const minutes = this.dailySessions[dateStr]?.minutes || 0;
            weekData.push(minutes);
            maxMinutes = Math.max(maxMinutes, minutes);
        }
        
        // Render bars
        weekData.forEach(minutes => {
            const bar = document.createElement('div');
            const height = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
            bar.className = 'flex-1 bg-blue-500/60 rounded-t transition-all hover:bg-blue-500/80';
            bar.style.height = `${Math.max(height, 2)}%`; // Minimum 2% height for visibility
            bar.title = `${minutes} minutes`;
            this.weeklyChart.appendChild(bar);
        });
    }
    
    renderRecentSessions() {
        this.recentSessions.innerHTML = '';
        
        // Get all sessions and sort by timestamp
        const allSessions = [];
        Object.entries(this.dailySessions).forEach(([date, dayData]) => {
            dayData.sessions.forEach(session => {
                allSessions.push({
                    ...session,
                    date: date
                });
            });
        });
        
        allSessions.sort((a, b) => b.timestamp - a.timestamp);
        
        // Show last 5 sessions
        allSessions.slice(0, 5).forEach(session => {
            const sessionEl = document.createElement('div');
            sessionEl.className = 'flex justify-between items-center text-sm';
            
            const date = new Date(session.date);
            const isToday = session.date === new Date().toISOString().split('T')[0];
            const dateStr = isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            sessionEl.innerHTML = `
                <span class="text-white/70">${dateStr}</span>
                <span class="text-blue-400">${session.minutes}min • ${session.cycles} cycles</span>
            `;
            
            this.recentSessions.appendChild(sessionEl);
        });
        
        if (allSessions.length === 0) {
            this.recentSessions.innerHTML = '<div class="text-white/50 text-sm text-center">No sessions yet</div>';
        }
    }
    
    navigateWeek(direction) {
        this.currentWeekOffset += direction;
        this.renderWeeklyChart();
        
        // Disable next week button if trying to go into future
        const today = new Date();
        const chartWeek = new Date(today);
        chartWeek.setDate(today.getDate() + (this.currentWeekOffset * 7));
        
        if (chartWeek > today) {
            this.currentWeekOffset -= direction; // Revert
            this.renderWeeklyChart();
        }
    }
    
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Sunday = 0
        return new Date(d.setDate(diff));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new BreathingApp();
});