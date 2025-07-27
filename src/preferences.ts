import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MindfulnessPreferences {
  dailyGoalMinutes: number;
  workHoursStart: string; // "09:00"
  workHoursEnd: string;   // "18:00"
  sessionLengthMinutes: number;
  frequency: 'gentle' | 'balanced' | 'intensive';
  enabled: boolean;
  snoozed: boolean; // Manual override - when true, never show
}

export interface SessionHistory {
  [date: string]: {
    totalMinutes: number;
    sessions: Array<{
      start: string; // "09:45"
      duration: number;
    }>;
  };
}

export interface MindfulnessData {
  preferences: MindfulnessPreferences;
  history: SessionHistory;
  lastSessionTimestamp?: string; // ISO string
  lastWindowShownAt?: string; // ISO string
  dismissalTimestamps: string[]; // Array of ISO strings
}

export class PreferencesManager {
  private preferencesPath: string;
  private defaultPreferences: MindfulnessPreferences = {
    dailyGoalMinutes: 10,
    workHoursStart: "09:00",
    workHoursEnd: "18:00", 
    sessionLengthMinutes: 3,
    frequency: 'balanced',
    enabled: true,
    snoozed: false
  };

  constructor() {
    const homeDir = os.homedir();
    const clauditateDir = path.join(homeDir, '.clauditate');
    
    // Ensure directory exists
    if (!fs.existsSync(clauditateDir)) {
      fs.mkdirSync(clauditateDir, { recursive: true });
    }
    
    this.preferencesPath = path.join(clauditateDir, 'mindfulness.json');
  }

  async loadPreferences(): Promise<MindfulnessData> {
    try {
      if (!fs.existsSync(this.preferencesPath)) {
        // Create default preferences on first run
        const defaultData: MindfulnessData = {
          preferences: { ...this.defaultPreferences },
          history: {},
          dismissalTimestamps: []
        };
        await this.savePreferences(defaultData);
        return defaultData;
      }

      const content = fs.readFileSync(this.preferencesPath, 'utf8');
      const data: MindfulnessData = JSON.parse(content);
      
      // Merge with defaults in case new preferences were added
      data.preferences = { ...this.defaultPreferences, ...data.preferences };
      
      // Ensure dismissalTimestamps exists for older data files
      if (!data.dismissalTimestamps) {
        data.dismissalTimestamps = [];
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return {
        preferences: { ...this.defaultPreferences },
        history: {},
        dismissalTimestamps: []
      };
    }
  }

  async savePreferences(data: MindfulnessData): Promise<void> {
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.preferencesPath, content, 'utf8');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  async updatePreferences(preferences: Partial<MindfulnessPreferences>): Promise<void> {
    const data = await this.loadPreferences();
    data.preferences = { ...data.preferences, ...preferences };
    await this.savePreferences(data);
  }

  async recordSession(durationMinutes: number): Promise<void> {
    const data = await this.loadPreferences();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5); // "HH:MM"

    if (!data.history[today]) {
      data.history[today] = {
        totalMinutes: 0,
        sessions: []
      };
    }

    data.history[today].totalMinutes += durationMinutes;
    data.history[today].sessions.push({
      start: timeStr,
      duration: durationMinutes
    });

    data.lastSessionTimestamp = now.toISOString();
    await this.savePreferences(data);
  }

  async shouldShowMeditation(): Promise<boolean> {
    try {
      const data = await this.loadPreferences();
      const { preferences, lastSessionTimestamp } = data;
      
      // Check if mindfulness is enabled
      if (!preferences.enabled) {
        return false;
      }

      // Check if snoozed (manual override)
      if (preferences.snoozed) {
        return false;
      }

      const now = new Date();
      
      // Check if within work hours
      if (!this.isWithinWorkHours(now, preferences)) {
        return false;
      }

      // Check 60-minute cliff rule
      if (lastSessionTimestamp) {
        const lastSession = new Date(lastSessionTimestamp);
        const hoursSinceLastSession = (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastSession < 1) {
          return false;
        }
      }

      // Check daily goal progress
      const today = now.toISOString().split('T')[0];
      const todayMinutes = data.history[today]?.totalMinutes || 0;
      
      if (todayMinutes >= preferences.dailyGoalMinutes) {
        return false; // Goal already achieved
      }

      // Check dismissal backoff - Option A: 2 dismissals in 30min → 2 hour cooldown
      const dismissalsLast30Min = this.getRecentDismissalsFromData(data, 30);
      if (dismissalsLast30Min.length >= 2) {
        const latestDismissal = new Date(Math.max(...dismissalsLast30Min.map(d => new Date(d).getTime())));
        const hoursSinceLatest = (now.getTime() - latestDismissal.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLatest < 2) {
          return false; // Still in 2-hour backoff period
        }
      }

      // Calculate probability based on remaining time and goal
      const remainingMinutes = preferences.dailyGoalMinutes - todayMinutes;
      const remainingWorkHours = this.getRemainingWorkHours(now, preferences);
      
      if (remainingWorkHours <= 0) {
        return false;
      }

      // Base probability calculation
      const baseProb = remainingMinutes / (remainingWorkHours * 60);
      
      // Apply frequency multiplier
      const frequencyMultiplier = this.getFrequencyMultiplier(preferences.frequency);
      const finalProbability = Math.min(baseProb * frequencyMultiplier, 0.8); // Cap at 80%
      
      // Random check
      return Math.random() < finalProbability;
      
    } catch (error) {
      console.error('Error in shouldShowMeditation:', error);
      return false;
    }
  }

  private isWithinWorkHours(now: Date, preferences: MindfulnessPreferences): boolean {
    const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
    return currentTime >= preferences.workHoursStart && currentTime <= preferences.workHoursEnd;
  }

  private getRemainingWorkHours(now: Date, preferences: MindfulnessPreferences): number {
    const currentTime = now.toTimeString().substring(0, 5);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [endHour, endMin] = preferences.workHoursEnd.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMin;
    const endMinutes = endHour * 60 + endMin;
    
    return Math.max(0, (endMinutes - currentMinutes) / 60);
  }

  private getFrequencyMultiplier(frequency: string): number {
    switch (frequency) {
      case 'gentle': return 0.5;
      case 'balanced': return 1.0;
      case 'intensive': return 1.5;
      default: return 1.0;
    }
  }

  async getTodayProgress(): Promise<{ completed: number; goal: number; percentage: number }> {
    const data = await this.loadPreferences();
    const today = new Date().toISOString().split('T')[0];
    const completed = data.history[today]?.totalMinutes || 0;
    const goal = data.preferences.dailyGoalMinutes;
    
    return {
      completed,
      goal,
      percentage: Math.min(100, Math.round((completed / goal) * 100))
    };
  }

  async recordWindowShown(): Promise<void> {
    const data = await this.loadPreferences();
    data.lastWindowShownAt = new Date().toISOString();
    await this.savePreferences(data);
  }

  async checkForDismissal(): Promise<void> {
    const data = await this.loadPreferences();
    const { lastWindowShownAt, lastSessionTimestamp } = data;
    
    if (!lastWindowShownAt) {
      return; // No window shown to dismiss
    }

    const shownTime = new Date(lastWindowShownAt);
    const lastSession = lastSessionTimestamp ? new Date(lastSessionTimestamp) : null;
    
    // If no session started since window was shown = dismissal
    if (!lastSession || lastSession < shownTime) {
      // Record dismissal
      data.dismissalTimestamps.push(new Date().toISOString());
      
      // Keep only last 24 hours of dismissals
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      data.dismissalTimestamps = data.dismissalTimestamps.filter(
        timestamp => new Date(timestamp) > oneDayAgo
      );
      
      // Clear the shown timestamp
      delete data.lastWindowShownAt;
      
      await this.savePreferences(data);
    }
  }

  private getRecentDismissalsFromData(data: MindfulnessData, minutesBack: number): string[] {
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
    return data.dismissalTimestamps.filter(timestamp => new Date(timestamp) > cutoffTime);
  }

  async toggleSnooze(): Promise<boolean> {
    const data = await this.loadPreferences();
    data.preferences.snoozed = !data.preferences.snoozed;
    await this.savePreferences(data);
    return data.preferences.snoozed;
  }

  async isSnooze(): Promise<boolean> {
    const data = await this.loadPreferences();
    return data.preferences.snoozed;
  }
}