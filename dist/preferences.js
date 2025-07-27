"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class PreferencesManager {
    constructor() {
        this.defaultPreferences = {
            dailyGoalMinutes: 10,
            workHoursStart: "09:00",
            workHoursEnd: "18:00",
            sessionLengthMinutes: 3,
            frequency: 'balanced',
            enabled: true
        };
        const homeDir = os.homedir();
        const clauditateDir = path.join(homeDir, '.clauditate');
        // Ensure directory exists
        if (!fs.existsSync(clauditateDir)) {
            fs.mkdirSync(clauditateDir, { recursive: true });
        }
        this.preferencesPath = path.join(clauditateDir, 'mindfulness.json');
    }
    async loadPreferences() {
        try {
            if (!fs.existsSync(this.preferencesPath)) {
                // Create default preferences on first run
                const defaultData = {
                    preferences: { ...this.defaultPreferences },
                    history: {}
                };
                await this.savePreferences(defaultData);
                return defaultData;
            }
            const content = fs.readFileSync(this.preferencesPath, 'utf8');
            const data = JSON.parse(content);
            // Merge with defaults in case new preferences were added
            data.preferences = { ...this.defaultPreferences, ...data.preferences };
            return data;
        }
        catch (error) {
            console.error('Failed to load preferences:', error);
            return {
                preferences: { ...this.defaultPreferences },
                history: {}
            };
        }
    }
    async savePreferences(data) {
        try {
            const content = JSON.stringify(data, null, 2);
            fs.writeFileSync(this.preferencesPath, content, 'utf8');
        }
        catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }
    async updatePreferences(preferences) {
        const data = await this.loadPreferences();
        data.preferences = { ...data.preferences, ...preferences };
        await this.savePreferences(data);
    }
    async recordSession(durationMinutes) {
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
    async shouldShowMeditation() {
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
        }
        catch (error) {
            console.error('Error in shouldShowMeditation:', error);
            return false;
        }
    }
    isWithinWorkHours(now, preferences) {
        const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
        return currentTime >= preferences.workHoursStart && currentTime <= preferences.workHoursEnd;
    }
    getRemainingWorkHours(now, preferences) {
        const currentTime = now.toTimeString().substring(0, 5);
        const [currentHour, currentMin] = currentTime.split(':').map(Number);
        const [endHour, endMin] = preferences.workHoursEnd.split(':').map(Number);
        const currentMinutes = currentHour * 60 + currentMin;
        const endMinutes = endHour * 60 + endMin;
        return Math.max(0, (endMinutes - currentMinutes) / 60);
    }
    getFrequencyMultiplier(frequency) {
        switch (frequency) {
            case 'gentle': return 0.5;
            case 'balanced': return 1.0;
            case 'intensive': return 1.5;
            default: return 1.0;
        }
    }
    async getTodayProgress() {
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
exports.PreferencesManager = PreferencesManager;
//# sourceMappingURL=preferences.js.map