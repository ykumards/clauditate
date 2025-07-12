const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notification methods
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  
  // Settings persistence
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // Stats persistence
  saveStats: (stats) => ipcRenderer.invoke('save-stats', stats),
  loadStats: () => ipcRenderer.invoke('load-stats'),
  
  // Daily sessions persistence
  saveDailySessions: (sessions) => ipcRenderer.invoke('save-daily-sessions', sessions),
  loadDailySessions: () => ipcRenderer.invoke('load-daily-sessions')
});