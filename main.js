const { menubar } = require('menubar');
const { app, Tray, Menu, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const mb = menubar({
  index: `file://${path.join(__dirname, 'index.html')}`,
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

// Helper functions for file operations
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading file:', error);
  }
  return null;
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
};

// IPC handlers
ipcMain.handle('show-notification', async (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, 'assets', 'icon.png'),
      silent: false
    }).show();
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  return writeJsonFile(settingsPath, settings);
});

ipcMain.handle('load-settings', async (event) => {
  return readJsonFile(settingsPath);
});

ipcMain.handle('save-stats', async (event, stats) => {
  return writeJsonFile(statsPath, stats);
});

ipcMain.handle('load-stats', async (event) => {
  return readJsonFile(statsPath);
});

ipcMain.handle('save-daily-sessions', async (event, sessions) => {
  return writeJsonFile(dailySessionsPath, sessions);
});

ipcMain.handle('load-daily-sessions', async (event) => {
  return readJsonFile(dailySessionsPath);
});

mb.on('ready', () => {
  console.log('Menubar app is ready');
});

// Only open dev tools in development
if (process.env.NODE_ENV === 'development') {
  mb.on('after-create-window', () => {
    mb.window.webContents.openDevTools({ mode: 'detach' });
  });
}