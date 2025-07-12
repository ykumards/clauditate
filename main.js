const { menubar } = require('menubar');
const { app, Tray, Menu, Notification } = require('electron');
const path = require('path');

const mb = menubar({
  index: `file://${path.join(__dirname, 'index.html')}`,
  icon: '🍅',
  tooltip: 'Pomodoro Timer',
  showDockIcon: false,
  browserWindow: {
    width: 300,
    height: 450,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  }
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