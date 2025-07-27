"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Notification methods
    showNotification: (title, body) => electron_1.ipcRenderer.invoke('show-notification', { title, body }),
    // Settings persistence
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => electron_1.ipcRenderer.invoke('load-settings'),
    // Stats persistence
    saveStats: (stats) => electron_1.ipcRenderer.invoke('save-stats', stats),
    loadStats: () => electron_1.ipcRenderer.invoke('load-stats'),
    // Daily sessions persistence
    saveDailySessions: (sessions) => electron_1.ipcRenderer.invoke('save-daily-sessions', sessions),
    loadDailySessions: () => electron_1.ipcRenderer.invoke('load-daily-sessions'),
    // App control
    quitApp: () => electron_1.ipcRenderer.invoke('quit-app')
});
//# sourceMappingURL=preload.js.map