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
const menubar_1 = require("menubar");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const mb = (0, menubar_1.menubar)({
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
const userDataPath = electron_1.app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');
const statsPath = path.join(userDataPath, 'stats.json');
const dailySessionsPath = path.join(userDataPath, 'dailySessions.json');
// Helper functions for file operations
const readJsonFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error reading file:', error);
    }
    return null;
};
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    }
    catch (error) {
        console.error('Error writing file:', error);
        return false;
    }
};
// IPC handlers
electron_1.ipcMain.handle('show-notification', async (event, { title, body }) => {
    if (electron_1.Notification.isSupported()) {
        new electron_1.Notification({
            title,
            body,
            icon: path.join(__dirname, '../assets/icon.png'),
            silent: false
        }).show();
    }
});
electron_1.ipcMain.handle('save-settings', async (event, settings) => {
    return writeJsonFile(settingsPath, settings);
});
electron_1.ipcMain.handle('load-settings', async (event) => {
    return readJsonFile(settingsPath);
});
electron_1.ipcMain.handle('save-stats', async (event, stats) => {
    return writeJsonFile(statsPath, stats);
});
electron_1.ipcMain.handle('load-stats', async (event) => {
    return readJsonFile(statsPath);
});
electron_1.ipcMain.handle('save-daily-sessions', async (event, sessions) => {
    return writeJsonFile(dailySessionsPath, sessions);
});
electron_1.ipcMain.handle('load-daily-sessions', async (event) => {
    return readJsonFile(dailySessionsPath);
});
mb.on('ready', () => {
    console.log('Menubar app is ready');
    setupIPCServer();
});
// Only open dev tools in development
if (process.env.NODE_ENV === 'development') {
    mb.on('after-create-window', () => {
        mb.window?.webContents.openDevTools({ mode: 'detach' });
    });
}
// IPC Server for CLI communication
let ipcServer = null;
const getSocketPath = () => {
    const tmpDir = os.tmpdir();
    return path.join(tmpDir, 'clauditate.sock');
};
const setupIPCServer = () => {
    const socketPath = getSocketPath();
    // Remove existing socket file if it exists
    try {
        if (fs.existsSync(socketPath)) {
            fs.unlinkSync(socketPath);
        }
    }
    catch (error) {
        console.log('Could not remove existing socket:', error);
    }
    ipcServer = net.createServer((socket) => {
        console.log('CLI client connected');
        socket.on('data', (data) => {
            try {
                const command = data.toString().trim();
                console.log('Received command:', command);
                switch (command) {
                    case 'show':
                        try {
                            mb.showWindow();
                            socket.write('shown\n');
                        }
                        catch (error) {
                            socket.write('error: failed to show\n');
                        }
                        break;
                    case 'hide':
                        try {
                            mb.hideWindow();
                            socket.write('hidden\n');
                        }
                        catch (error) {
                            socket.write('error: failed to hide\n');
                        }
                        break;
                    case 'ping':
                        socket.write('pong\n');
                        break;
                    default:
                        socket.write('error: unknown command\n');
                }
            }
            catch (error) {
                console.error('Error processing command:', error);
                socket.write('error: processing failed\n');
            }
        });
        socket.on('error', (error) => {
            console.log('Socket error:', error);
        });
        socket.on('close', () => {
            console.log('CLI client disconnected');
        });
    });
    ipcServer.listen(socketPath, () => {
        console.log('IPC server listening on:', socketPath);
    });
    ipcServer.on('error', (error) => {
        console.error('IPC server error:', error);
    });
};
// Cleanup on app quit
electron_1.app.on('before-quit', () => {
    if (ipcServer) {
        ipcServer.close();
        try {
            const socketPath = getSocketPath();
            if (fs.existsSync(socketPath)) {
                fs.unlinkSync(socketPath);
            }
        }
        catch (error) {
            console.log('Could not cleanup socket:', error);
        }
    }
});
//# sourceMappingURL=main.js.map