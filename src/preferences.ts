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
}

export class PreferencesManager {
  private preferencesPath: string;
  private defaultPreferences: MindfulnessPreferences = {
    dailyGoalMinutes: 10,
    workHoursStart: "09:00",
    workHoursEnd: "18:00", 
    sessionLengthMinutes: 3,
    frequency: 'balanced',
    enabled: true
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
          history: {}
        };
        await this.savePreferences(defaultData);
        return defaultData;
      }

      const content = fs.readFileSync(this.preferencesPath, 'utf8');
      const data: MindfulnessData = JSON.parse(content);
      
      // Merge with defaults in case new preferences were added
      data.preferences = { ...this.defaultPreferences, ...data.preferences };
      
      return data;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return {
        preferences: { ...this.defaultPreferences },
        history: {}
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
}