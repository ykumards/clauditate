export interface MindfulnessPreferences {
    dailyGoalMinutes: number;
    workHoursStart: string;
    workHoursEnd: string;
    sessionLengthMinutes: number;
    frequency: 'gentle' | 'balanced' | 'intensive';
    enabled: boolean;
}
export interface SessionHistory {
    [date: string]: {
        totalMinutes: number;
        sessions: Array<{
            start: string;
            duration: number;
        }>;
    };
}
export interface MindfulnessData {
    preferences: MindfulnessPreferences;
    history: SessionHistory;
    lastSessionTimestamp?: string;
}
export declare class PreferencesManager {
    private preferencesPath;
    private defaultPreferences;
    constructor();
    loadPreferences(): Promise<MindfulnessData>;
    savePreferences(data: MindfulnessData): Promise<void>;
    updatePreferences(preferences: Partial<MindfulnessPreferences>): Promise<void>;
    recordSession(durationMinutes: number): Promise<void>;
    shouldShowMeditation(): Promise<boolean>;
    private isWithinWorkHours;
    private getRemainingWorkHours;
    private getFrequencyMultiplier;
    getTodayProgress(): Promise<{
        completed: number;
        goal: number;
        percentage: number;
    }>;
}
//# sourceMappingURL=preferences.d.ts.map