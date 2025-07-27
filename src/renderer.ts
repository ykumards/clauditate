interface SettingsData {
  defaultCycles: number;
  notifications: boolean;
}

interface StatsData {
  completedSessions: number;
  totalMinutes: number;
}

interface SessionData {
  timestamp: number;
  minutes: number;
  cycles: number;
}

interface DayData {
  minutes: number;
  sessions: SessionData[];
  cycles: number;
}

interface DailySessions {
  [date: string]: DayData;
}

type BreathingPhase = 'idle' | 'breatheIn' | 'breatheOut';

class BreathingApp {
  private breatheInDuration: number = 5000; // 5 seconds (inhale)
  private breatheOutDuration: number = 5000; // 5 seconds (exhale)
  private isRunning: boolean = false;
  private currentCycle: number = 0;
  private totalCycles: number = 5;
  private completedSessions: number = 0;
  private totalMinutes: number = 0;
  private currentPhase: BreathingPhase = 'idle';
  private sessionStartTime: number | null = null;
  private phaseTimeout: NodeJS.Timeout | null = null;
  
  // Insights tracking
  private currentWeekOffset: number = 0; // 0 = current week, -1 = previous week, etc.
  private dailySessions: DailySessions = {}; // Store daily meditation data
  
  // DOM elements
  private breatheVisual!: HTMLElement;
  private instruction!: HTMLElement;
  private cycleInfo!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private cycleButtons!: NodeListOf<HTMLButtonElement>;
  private settingsIcon!: HTMLElement;
  private backIcon!: HTMLElement;
  private breatheContainer!: HTMLElement;
  private settingsContainer!: HTMLElement;
  private cycleRadios!: NodeListOf<HTMLInputElement>;
  private notificationsToggle!: HTMLInputElement;
  private quitBtn!: HTMLButtonElement;
  
  // Insights elements
  private insightsIcon!: HTMLElement;
  private insightsBackIcon!: HTMLElement;
  private insightsContainer!: HTMLElement;
  private todayMinutes!: HTMLElement;
  private weekMinutes!: HTMLElement;
  private monthMinutes!: HTMLElement;
  private weeklyChart!: HTMLElement;
  private weekRange!: HTMLElement;
  private prevWeek!: HTMLElement;
  private nextWeek!: HTMLElement;
  private recentSessions!: HTMLElement;
  
  // Completion elements
  private completionOverlay!: HTMLElement;
  private completionMessage!: HTMLElement;
  private completionCloseBtn!: HTMLButtonElement;
  private confettiContainer!: HTMLElement;

  constructor() {
    this.init();
  }
  
  private async init(): Promise<void> {
    this.initElements();
    this.initEventListeners();
    await this.loadStats();
    this.updateDisplay();
  }
  
  private initElements(): void {
    this.breatheVisual = this.getElementById('breatheVisual');
    this.instruction = this.getElementById('instruction');
    this.cycleInfo = this.getElementById('cycleInfo');
    this.startBtn = this.getElementById('startBtn') as HTMLButtonElement;
    this.stopBtn = this.getElementById('stopBtn') as HTMLButtonElement;
    this.cycleButtons = document.querySelectorAll('.cycle-btn') as NodeListOf<HTMLButtonElement>;
    this.settingsIcon = this.getElementById('settingsIcon');
    this.backIcon = this.getElementById('backIcon');
    this.breatheContainer = this.getElementById('breatheContainer');
    this.settingsContainer = this.getElementById('settingsContainer');
    this.cycleRadios = document.querySelectorAll('input[name="cycles"]') as NodeListOf<HTMLInputElement>;
    this.notificationsToggle = this.getElementById('notificationsToggle') as HTMLInputElement;
    this.quitBtn = this.getElementById('quitBtn') as HTMLButtonElement;
    
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
    this.completionCloseBtn = this.getElementById('completionCloseBtn') as HTMLButtonElement;
    this.confettiContainer = this.getElementById('confettiContainer');
  }
  
  private getElementById(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id '${id}' not found`);
    }
    return element;
  }
  
  private initEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());
    
    this.cycleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!this.isRunning) {
          const target = e.target as HTMLButtonElement;
          const cycles = parseInt(target.dataset.cycles || '5');
          this.selectCycles(cycles);
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
    
    this.quitBtn.addEventListener('click', () => this.quitApp());
    
    this.completionCloseBtn.addEventListener('click', () => this.hideCompletionMessage());
  }
  
  private selectCycles(cycles: number): void {
    this.totalCycles = cycles;
    this.cycleButtons.forEach(btn => {
      const btnCycles = parseInt(btn.dataset.cycles || '5');
      if (btnCycles === cycles) {
        btn.className = 'cycle-btn h-10 rounded-full border-2 border-blue-500 bg-blue-500/20 text-blue-300 font-medium transition-all hover:bg-blue-500/30 text-sm';
      } else {
        btn.className = 'cycle-btn h-10 rounded-full border-2 border-white/20 bg-white/5 text-white/70 font-medium transition-all hover:bg-white/10 text-sm';
      }
    });
    this.updateDisplay();
  }
  
  private start(): void {
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
  
  private async stop(): Promise<void> {
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
  
  private async complete(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.currentPhase = 'idle';
    
    // Calculate session time
    const sessionTime = Math.floor((Date.now() - this.sessionStartTime!) / 1000);
    const sessionMinutes = Math.round(sessionTime / 60);
    this.totalMinutes += sessionMinutes;
    this.completedSessions++;
    
    // Save daily session data
    await this.saveDailySession(sessionMinutes, this.totalCycles);
    await this.saveStats();
    
    this.showCompletionMessage();
    this.resetUI();
  }
  
  private resetUI(): void {
    this.startBtn.classList.remove('hidden');
    this.stopBtn.classList.add('hidden');
    this.cycleButtons.forEach(btn => btn.style.opacity = '1');
    this.breatheVisual.className = 'relative w-32 h-32 mb-8';
    this.instruction.textContent = '';
    this.updateDisplay();
  }
  
  private async startBreatheCycle(): Promise<void> {
    if (!this.isRunning) return;
    
    if (this.currentCycle >= this.totalCycles) {
      await this.complete();
      return;
    }
    
    this.currentCycle++;
    this.updateDisplay();
    this.breatheIn();
  }
  
  private breatheIn(): void {
    if (!this.isRunning) return;
    
    this.currentPhase = 'breatheIn';
    this.breatheVisual.className = 'relative w-32 h-32 mb-8 breathing-in';
    this.instruction.textContent = 'Breathe In';
    
    this.phaseTimeout = setTimeout(() => {
      this.transitionToOut();
    }, this.breatheInDuration);
  }
  
  private transitionToOut(): void {
    if (!this.isRunning) return;
    
    this.phaseTimeout = setTimeout(() => {
      this.breatheOut();
    }, 1000);
  }
  
  private breatheOut(): void {
    if (!this.isRunning) return;
    
    this.currentPhase = 'breatheOut';
    this.breatheVisual.className = 'relative w-32 h-32 mb-8 breathing-out';
    this.instruction.textContent = 'Breathe Out';
    
    this.phaseTimeout = setTimeout(() => {
      this.transitionToNext();
    }, this.breatheOutDuration);
  }
  
  private transitionToNext(): void {
    if (!this.isRunning) return;
    
    this.phaseTimeout = setTimeout(async () => {
      await this.startBreatheCycle();
    }, 1000);
  }
  
  private updateDisplay(): void {
    this.cycleInfo.textContent = this.isRunning 
      ? `${this.currentCycle} of ${this.totalCycles} breaths`
      : `${this.totalCycles} breaths`;
  }
  
  private showCompletionMessage(): void {
    this.completionMessage.textContent = `Great job! You completed ${this.totalCycles} breathing cycles.`;
    this.completionOverlay.classList.remove('hidden');
    this.completionOverlay.classList.add('completion-overlay');
    this.createConfetti();
  }
  
  private hideCompletionMessage(): void {
    this.completionOverlay.classList.add('hidden');
    this.completionOverlay.classList.remove('completion-overlay');
    this.clearConfetti();
  }
  
  private createConfetti(): void {
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
  
  private clearConfetti(): void {
    this.confettiContainer.innerHTML = '';
  }
  
  private async saveStats(): Promise<void> {
    const stats: StatsData = {
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
  
  private showSettings(): void {
    this.breatheContainer.style.display = 'none';
    this.settingsContainer.classList.remove('hidden');
  }
  
  private hideSettings(): void {
    this.settingsContainer.classList.add('hidden');
    this.breatheContainer.style.display = 'flex';
  }
  
  private handleCycleChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.totalCycles = parseInt(target.value);
    this.selectCycles(this.totalCycles);
    this.updateSettingsUI();
    this.saveSettings();
  }
  
  private async saveSettings(): Promise<void> {
    const settings: SettingsData = {
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
  
  private async loadSettings(): Promise<void> {
    let settings: SettingsData | null = null;
    
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
  
  private updateSettingsUI(): void {
    // Update cycle radio buttons
    this.cycleRadios.forEach(radio => {
      radio.checked = parseInt(radio.value) === this.totalCycles;
      
      // Update visual appearance
      const cycleOption = radio.nextElementSibling as HTMLElement;
      if (radio.checked) {
        cycleOption.className = 'cycle-option w-full h-12 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-300 font-medium cursor-pointer transition-all hover:bg-white/10';
      } else {
        cycleOption.className = 'cycle-option w-full h-12 bg-white/5 border-2 border-transparent rounded-full flex items-center justify-center text-white/70 font-medium cursor-pointer transition-all hover:bg-white/10';
      }
    });
    
    this.selectCycles(this.totalCycles);
  }
  
  private async loadStats(): Promise<void> {
    let stats: StatsData | null = null;
    
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
  private showInsights(): void {
    this.breatheContainer.style.display = 'none';
    this.insightsContainer.classList.remove('hidden');
    this.updateInsightsData();
    this.renderWeeklyChart();
    this.renderRecentSessions();
  }
  
  private hideInsights(): void {
    this.insightsContainer.classList.add('hidden');
    this.breatheContainer.style.display = 'flex';
  }
  
  private async saveDailySession(minutes: number, cycles: number): Promise<void> {
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
  
  private async loadDailySessions(): Promise<void> {
    let data: DailySessions | null = null;
    
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
  
  private updateInsightsData(): void {
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
  
  private renderWeeklyChart(): void {
    const today = new Date();
    const chartWeek = new Date(today);
    chartWeek.setDate(today.getDate() + (this.currentWeekOffset * 7));
    
    const weekStart = this.getWeekStart(chartWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // Update week range display
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    this.weekRange.textContent = `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
    
    // Clear chart
    this.weeklyChart.innerHTML = '';
    
    // Get max minutes for scaling
    let maxMinutes = 0;
    const weekData: number[] = [];
    
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
  
  private renderRecentSessions(): void {
    this.recentSessions.innerHTML = '';
    
    // Get all sessions and sort by timestamp
    const allSessions: Array<SessionData & { date: string }> = [];
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
  
  private navigateWeek(direction: number): void {
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
  
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday = 0
    return new Date(d.setDate(diff));
  }
  
  private async quitApp(): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.quitApp();
    } else {
      // Fallback for development - just close the window
      window.close();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BreathingApp();
});