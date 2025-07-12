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
interface ElectronAPI {
    showNotification: (title: string, body: string) => Promise<void>;
    saveSettings: (settings: SettingsData) => Promise<boolean>;
    loadSettings: () => Promise<SettingsData | null>;
    saveStats: (stats: StatsData) => Promise<boolean>;
    loadStats: () => Promise<StatsData | null>;
    saveDailySessions: (sessions: DailySessions) => Promise<boolean>;
    loadDailySessions: () => Promise<DailySessions | null>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
export {};
//# sourceMappingURL=preload.d.ts.map