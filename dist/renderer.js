"use strict";
class BreathingApp {
    constructor() {
        this.breatheInDuration = 5000; // 5 seconds (inhale)
        this.breatheOutDuration = 5000; // 5 seconds (exhale)
        this.isRunning = false;
        this.currentCycle = 0;
        this.totalCycles = 5;
        this.completedSessions = 0;
        this.totalMinutes = 0;
        this.currentPhase = 'idle';
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
        await this.loadPreferences();
        await this.loadSnoozeStatus();
        this.updateDisplay();
    }
    initElements() {
        this.breatheVisual = this.getElementById('breatheVisual');
        this.instruction = this.getElementById('instruction');
        this.cycleInfo = this.getElementById('cycleInfo');
        this.startBtn = this.getElementById('startBtn');
        this.stopBtn = this.getElementById('stopBtn');
        this.cycleButtons = document.querySelectorAll('.cycle-btn');
        this.settingsIcon = this.getElementById('settingsIcon');
        this.snoozeIcon = this.getElementById('snoozeIcon');
        this.backIcon = this.getElementById('backIcon');
        this.breatheContainer = this.getElementById('breatheContainer');
        this.settingsContainer = this.getElementById('settingsContainer');
        this.cycleRadios = document.querySelectorAll('input[name="cycles"]');
        this.targetRadios = document.querySelectorAll('input[name="dailyTarget"]');
        this.frequencyRadios = document.querySelectorAll('input[name="frequency"]');
        this.workHoursStart = this.getElementById('workHoursStart');
        this.workHoursEnd = this.getElementById('workHoursEnd');
        this.notificationsToggle = this.getElementById('notificationsToggle');
        this.quitBtn = this.getElementById('quitBtn');
        // Insights elements
        this.insightsIcon = this.getElementById('insightsIcon');
        this.insightsBackIcon = this.getElementById('insightsBackIcon');
        this.insightsContainer = this.getElementById('insightsContainer');
        this.todayMinutes = this.getElementById('todayMinutes');
        this.weekMinutes = this.getElementById('weekMinutes');
        this.monthMinutes = this.getElementById('monthMinutes');
        this.weeklyChart = this.getElementById('weeklyChart');
        this.weekRange = this.getElementById('weekRange');
        this.prevWeek = this.getElementById('prevWeek');
        this.nextWeek = this.getElementById('nextWeek');
        this.recentSessions = this.getElementById('recentSessions');
        // Completion elements
        this.completionOverlay = this.getElementById('completionOverlay');
        this.completionMessage = this.getElementById('completionMessage');
        this.completionCloseBtn = this.getElementById('completionCloseBtn');
        this.confettiContainer = this.getElementById('confettiContainer');
    }
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id '${id}' not found`);
        }
        return element;
    }
    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.cycleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isRunning) {
                    const target = e.target;
                    const cycles = parseInt(target.dataset.cycles || '5');
                    this.selectCycles(cycles);
                }
            });
        });
        this.settingsIcon.addEventListener('click', () => this.showSettings());
        this.snoozeIcon.addEventListener('click', () => this.handleSnooze());
        this.backIcon.addEventListener('click', () => this.hideSettings());
        this.insightsIcon.addEventListener('click', () => this.showInsights());
        this.insightsBackIcon.addEventListener('click', () => this.hideInsights());
        this.prevWeek.addEventListener('click', () => this.navigateWeek(-1));
        this.nextWeek.addEventListener('click', () => this.navigateWeek(1));
        this.cycleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleCycleChange(e));
        });
        this.targetRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePreferenceChange(e));
        });
        this.frequencyRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePreferenceChange(e));
        });
        this.workHoursStart.addEventListener('change', (e) => this.handlePreferenceChange(e));
        this.workHoursEnd.addEventListener('change', (e) => this.handlePreferenceChange(e));
        this.notificationsToggle.addEventListener('change', () => this.saveSettings());
        this.quitBtn.addEventListener('click', () => this.quitApp());
        this.completionCloseBtn.addEventListener('click', () => this.hideCompletionMessage());
    }
    selectCycles(cycles) {
        this.totalCycles = cycles;
        this.cycleButtons.forEach(btn => {
            const btnCycles = parseInt(btn.dataset.cycles || '5');
            if (btnCycles === cycles) {
                btn.classList.add('active');
            }
            else {
                btn.classList.remove('active');
            }
        });
        this.updateDisplay();
    }
    start() {
        if (this.isRunning)
            return;
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
        if (!this.isRunning)
            return;
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
        if (!this.isRunning)
            return;
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
        this.breatheVisual.className = 'relative w-40 h-40 mb-4';
        this.instruction.textContent = '\u00A0';
        this.updateDisplay();
    }
    async startBreatheCycle() {
        if (!this.isRunning)
            return;
        if (this.currentCycle >= this.totalCycles) {
            await this.complete();
            return;
        }
        this.currentCycle++;
        this.updateDisplay();
        this.breatheIn();
    }
    breatheIn() {
        if (!this.isRunning)
            return;
        this.currentPhase = 'breatheIn';
        this.breatheVisual.className = 'relative w-40 h-40 mb-4 breathing-in';
        this.instruction.textContent = 'Breathe In';
        this.phaseTimeout = setTimeout(() => {
            this.transitionToOut();
        }, this.breatheInDuration);
    }
    transitionToOut() {
        if (!this.isRunning)
            return;
        this.phaseTimeout = setTimeout(() => {
            this.breatheOut();
        }, 1000);
    }
    breatheOut() {
        if (!this.isRunning)
            return;
        this.currentPhase = 'breatheOut';
        this.breatheVisual.className = 'relative w-40 h-40 mb-4 breathing-out';
        this.instruction.textContent = 'Breathe Out';
        this.phaseTimeout = setTimeout(() => {
            this.transitionToNext();
        }, this.breatheOutDuration);
    }
    transitionToNext() {
        if (!this.isRunning)
            return;
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
        }
        else {
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
    async handleSnooze() {
        try {
            const result = await window.electronAPI.toggleSnooze();
            if (result.success) {
                this.updateSnoozeIcon(result.isSnooze);
            }
            else {
                console.error('Failed to toggle snooze:', result.error);
            }
        }
        catch (error) {
            console.error('Error toggling snooze:', error);
        }
    }
    async loadSnoozeStatus() {
        try {
            const result = await window.electronAPI.getSnoozeStatus();
            if (result.success) {
                this.updateSnoozeIcon(result.isSnooze || false);
            }
        }
        catch (error) {
            console.error('Error loading snooze status:', error);
            // Default to not snoozed
            this.updateSnoozeIcon(false);
        }
    }
    updateSnoozeIcon(isSnooze) {
        if (isSnooze) {
            // Snooze is ON (notifications disabled) - Bell with slash
            this.snoozeIcon.innerHTML = `
        <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 5a2 2 0 114 0v.341C15.67 6.165 17 8.388 17 11v3.159c0 .538.214 1.055.595 1.436L19 17H5l1.405-1.405A2.032 2.032 0 007 14.158V11c0-2.612 1.33-4.835 3-5.659V5z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.73 21a2 2 0 01-3.46 0"></path>
          <line stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="3" y1="3" x2="21" y2="21"></line>
        </svg>
      `;
            this.snoozeIcon.title = "Notifications OFF - Click to enable";
            this.snoozeIcon.style.opacity = "1";
        }
        else {
            // Snooze is OFF (notifications enabled) - Regular bell
            this.snoozeIcon.innerHTML = `
        <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
      `;
            this.snoozeIcon.title = "Notifications ON - Click to snooze";
            this.snoozeIcon.style.opacity = "0.6";
        }
    }
    handleCycleChange(e) {
        const target = e.target;
        this.totalCycles = parseInt(target.value);
        this.selectCycles(this.totalCycles);
        this.updateSettingsUI();
        this.saveSettings();
    }
    handlePreferenceChange(e) {
        this.savePreferences();
    }
    async savePreferences() {
        try {
            const selectedTarget = document.querySelector('input[name="dailyTarget"]:checked');
            const selectedFrequency = document.querySelector('input[name="frequency"]:checked');
            const preferences = {
                dailyGoalMinutes: selectedTarget ? parseInt(selectedTarget.value) : 10,
                workHoursStart: this.workHoursStart.value,
                workHoursEnd: this.workHoursEnd.value,
                frequency: selectedFrequency ? selectedFrequency.value : 'balanced',
                enabled: this.notificationsToggle.checked
            };
            await window.electronAPI.savePreferences(preferences);
        }
        catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    async loadPreferences() {
        try {
            const result = await window.electronAPI.loadPreferences();
            if (result.success && result.preferences) {
                const prefs = result.preferences;
                // Set daily target
                const targetRadio = document.querySelector(`input[name="dailyTarget"][value="${prefs.dailyGoalMinutes}"]`);
                if (targetRadio) {
                    targetRadio.checked = true;
                    this.updateRadioVisual('target-option', targetRadio);
                }
                // Set frequency
                const freqRadio = document.querySelector(`input[name="frequency"][value="${prefs.frequency}"]`);
                if (freqRadio) {
                    freqRadio.checked = true;
                    this.updateRadioVisual('freq-option', freqRadio);
                }
                // Set work hours
                this.workHoursStart.value = prefs.workHoursStart || '09:00';
                this.workHoursEnd.value = prefs.workHoursEnd || '18:00';
                // Set notifications toggle
                this.notificationsToggle.checked = prefs.enabled !== false;
            }
        }
        catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    updateRadioVisual(className, radio) {
        // CSS handles the styling via :checked pseudo-selector, no need to manually update
    }
    async saveSettings() {
        const settings = {
            defaultCycles: this.totalCycles,
            notifications: this.notificationsToggle.checked
        };
        if (window.electronAPI) {
            await window.electronAPI.saveSettings(settings);
        }
        else {
            // Fallback to localStorage for development
            localStorage.setItem('breathingSettings', JSON.stringify(settings));
        }
    }
    async loadSettings() {
        let settings = null;
        if (window.electronAPI) {
            settings = await window.electronAPI.loadSettings();
        }
        else {
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
            // Update visual appearance - let CSS handle styling
            const cycleOption = radio.nextElementSibling;
            // Just use the base CSS classes, don't override
        });
        this.selectCycles(this.totalCycles);
    }
    async loadStats() {
        let stats = null;
        if (window.electronAPI) {
            stats = await window.electronAPI.loadStats();
        }
        else {
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
        }
        else {
            // Fallback to localStorage for development
            localStorage.setItem('dailySessions', JSON.stringify(this.dailySessions));
        }
    }
    async loadDailySessions() {
        let data = null;
        if (window.electronAPI) {
            data = await window.electronAPI.loadDailySessions();
        }
        else {
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
        this.todayMinutes.textContent = todayMinutes.toString();
        // This week's minutes
        const weekStart = this.getWeekStart(today);
        let weekMinutes = 0;
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            weekMinutes += this.dailySessions[dateStr]?.minutes || 0;
        }
        this.weekMinutes.textContent = weekMinutes.toString();
        // This month's minutes
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        let monthMinutes = 0;
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            monthMinutes += this.dailySessions[dateStr]?.minutes || 0;
        }
        this.monthMinutes.textContent = monthMinutes.toString();
    }
    renderWeeklyChart() {
        const today = new Date();
        const chartWeek = new Date(today);
        chartWeek.setDate(today.getDate() + (this.currentWeekOffset * 7));
        const weekStart = this.getWeekStart(chartWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        // Update week range display - compact format
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[weekStart.getMonth()];
        const endMonth = monthNames[weekEnd.getMonth()];
        const startDay = weekStart.getDate();
        const endDay = weekEnd.getDate();
        if (startMonth === endMonth) {
            this.weekRange.textContent = `${startMonth} ${startDay}-${endDay}`;
        }
        else {
            this.weekRange.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
        }
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
        // Check if there's any data
        const hasData = weekData.some(minutes => minutes > 0);
        if (!hasData) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'absolute inset-0 flex items-center justify-center';
            emptyState.innerHTML = `<div class="text-white/20 text-[10px]">No data</div>`;
            this.weeklyChart.appendChild(emptyState);
        }
        // Render bars
        weekData.forEach(minutes => {
            const bar = document.createElement('div');
            const height = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
            bar.className = 'flex-1 bg-blue-600 rounded-t-md transition-all hover:bg-blue-500';
            bar.style.height = hasData ? `${Math.max(height, 2)}%` : '2px'; // Only show if there's data
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
            sessionEl.className = 'flex justify-between items-center';
            const date = new Date(session.date);
            const isToday = session.date === new Date().toISOString().split('T')[0];
            const dateStr = isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            sessionEl.innerHTML = `
        <span class="text-white/50 text-[11px]">${dateStr}</span>
        <span class="text-white/70 text-[11px]">${session.minutes}min • ${session.cycles}c</span>
      `;
            this.recentSessions.appendChild(sessionEl);
        });
        if (allSessions.length === 0) {
            this.recentSessions.innerHTML = '<div class="text-white/30 text-[11px] text-center">No sessions yet</div>';
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
    async quitApp() {
        if (window.electronAPI) {
            await window.electronAPI.quitApp();
        }
        else {
            // Fallback for development - just close the window
            window.close();
        }
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new BreathingApp();
});
//# sourceMappingURL=renderer.js.map