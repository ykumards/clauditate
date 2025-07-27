import { contextBridge, ipcRenderer } from 'electron';

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
  toggleSnooze: () => Promise<{ success: boolean; isSnooze?: boolean; error?: string }>;
  getSnoozeStatus: () => Promise<{ success: boolean; isSnooze?: boolean; error?: string }>;
  savePreferences: (preferences: any) => Promise<{ success: boolean; error?: string }>;
  loadPreferences: () => Promise<{ success: boolean; preferences?: any; error?: string }>;
  quitApp: () => Promise<void>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notification methods
  showNotification: (title: string, body: string): Promise<void> => 
    ipcRenderer.invoke('show-notification', { title, body }),
  
  // Settings persistence
  saveSettings: (settings: SettingsData): Promise<boolean> => 
    ipcRenderer.invoke('save-settings', settings),
  loadSettings: (): Promise<SettingsData | null> => 
    ipcRenderer.invoke('load-settings'),
  
  // Stats persistence
  saveStats: (stats: StatsData): Promise<boolean> => 
    ipcRenderer.invoke('save-stats', stats),
  loadStats: (): Promise<StatsData | null> => 
    ipcRenderer.invoke('load-stats'),
  
  // Daily sessions persistence
  saveDailySessions: (sessions: DailySessions): Promise<boolean> => 
    ipcRenderer.invoke('save-daily-sessions', sessions),
  loadDailySessions: (): Promise<DailySessions | null> => 
    ipcRenderer.invoke('load-daily-sessions'),
  
  // Snooze functionality
  toggleSnooze: (): Promise<{ success: boolean; isSnooze?: boolean; error?: string }> => 
    ipcRenderer.invoke('toggle-snooze'),
  getSnoozeStatus: (): Promise<{ success: boolean; isSnooze?: boolean; error?: string }> => 
    ipcRenderer.invoke('get-snooze-status'),
  
  // Preferences
  savePreferences: (preferences: any): Promise<{ success: boolean; error?: string }> => 
    ipcRenderer.invoke('save-preferences', preferences),
  loadPreferences: (): Promise<{ success: boolean; preferences?: any; error?: string }> => 
    ipcRenderer.invoke('load-preferences'),
  
  // App control
  quitApp: (): Promise<void> => 
    ipcRenderer.invoke('quit-app')
} as ElectronAPI);

// Extend the Window interface to include our API
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}