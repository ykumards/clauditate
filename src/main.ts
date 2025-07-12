import { menubar } from 'menubar';
import { app, Tray, Menu, Notification, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const mb = menubar({
  index: `file://${path.join(__dirname, '../index.html')}`,
  icon: '☯',
  tooltip: 'Breathe - Meditation',
  showDockIcon: false,
  browserWindow: {
    width: 300,
    height: 450,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  }
});

// Data storage path
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');
const statsPath = path.join(userDataPath, 'stats.json');
const dailySessionsPath = path.join(userDataPath, 'dailySessions.json');

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

// Helper functions for file operations
const readJsonFile = <T>(filePath: string): T | null => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error('Error reading file:', error);
  }
  return null;
};

const writeJsonFile = <T>(filePath: string, data: T): boolean => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
};

// IPC handlers
ipcMain.handle('show-notification', async (event, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, '../assets/icon.png'),
      silent: false
    }).show();
  }
});

ipcMain.handle('save-settings', async (event, settings: SettingsData) => {
  return writeJsonFile(settingsPath, settings);
});

ipcMain.handle('load-settings', async (event) => {
  return readJsonFile<SettingsData>(settingsPath);
});

ipcMain.handle('save-stats', async (event, stats: StatsData) => {
  return writeJsonFile(statsPath, stats);
});

ipcMain.handle('load-stats', async (event) => {
  return readJsonFile<StatsData>(statsPath);
});

ipcMain.handle('save-daily-sessions', async (event, sessions: DailySessions) => {
  return writeJsonFile(dailySessionsPath, sessions);
});

ipcMain.handle('load-daily-sessions', async (event) => {
  return readJsonFile<DailySessions>(dailySessionsPath);
});

mb.on('ready', () => {
  console.log('Menubar app is ready');
});

// Only open dev tools in development
if (process.env.NODE_ENV === 'development') {
  mb.on('after-create-window', () => {
    mb.window?.webContents.openDevTools({ mode: 'detach' });
  });
}