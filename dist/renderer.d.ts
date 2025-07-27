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
declare class BreathingApp {
    private breatheInDuration;
    private breatheOutDuration;
    private isRunning;
    private currentCycle;
    private totalCycles;
    private completedSessions;
    private totalMinutes;
    private currentPhase;
    private sessionStartTime;
    private phaseTimeout;
    private currentWeekOffset;
    private dailySessions;
    private breatheVisual;
    private instruction;
    private cycleInfo;
    private startBtn;
    private stopBtn;
    private cycleButtons;
    private settingsIcon;
    private snoozeIcon;
    private backIcon;
    private breatheContainer;
    private settingsContainer;
    private cycleRadios;
    private targetRadios;
    private frequencyRadios;
    private workHoursStart;
    private workHoursEnd;
    private notificationsToggle;
    private quitBtn;
    private insightsIcon;
    private insightsBackIcon;
    private insightsContainer;
    private todayMinutes;
    private weekMinutes;
    private monthMinutes;
    private weeklyChart;
    private weekRange;
    private prevWeek;
    private nextWeek;
    private recentSessions;
    private completionOverlay;
    private completionMessage;
    private completionCloseBtn;
    private confettiContainer;
    constructor();
    private init;
    private initElements;
    private getElementById;
    private initEventListeners;
    private selectCycles;
    private start;
    private stop;
    private complete;
    private resetUI;
    private startBreatheCycle;
    private breatheIn;
    private transitionToOut;
    private breatheOut;
    private transitionToNext;
    private updateDisplay;
    private showCompletionMessage;
    private hideCompletionMessage;
    private createConfetti;
    private clearConfetti;
    private saveStats;
    private showSettings;
    private hideSettings;
    private handleSnooze;
    private loadSnoozeStatus;
    private updateSnoozeIcon;
    private handleCycleChange;
    private handlePreferenceChange;
    private savePreferences;
    private loadPreferences;
    private updateRadioVisual;
    private saveSettings;
    private loadSettings;
    private updateSettingsUI;
    private loadStats;
    private showInsights;
    private hideInsights;
    private saveDailySession;
    private loadDailySessions;
    private updateInsightsData;
    private renderWeeklyChart;
    private renderRecentSessions;
    private navigateWeek;
    private getWeekStart;
    private quitApp;
}
//# sourceMappingURL=renderer.d.ts.map