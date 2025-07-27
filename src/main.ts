import { menubar } from "menubar";
import { app, Tray, Menu, Notification, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import { PreferencesManager } from "./preferences";

const mb = menubar({
  index: `file://${path.join(__dirname, "../index.html")}`,
  icon: "☯",
  tooltip: "Breathe - Meditation",
  showDockIcon: false,
  browserWindow: {
    width: 300,
    height: 450,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  },
});

// Data storage path
const userDataPath = app.getPath("userData");
const settingsPath = path.join(userDataPath, "settings.json");
const statsPath = path.join(userDataPath, "stats.json");
const dailySessionsPath = path.join(userDataPath, "dailySessions.json");

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
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error("Error reading file:", error);
  }
  return null;
};

const writeJsonFile = <T>(filePath: string, data: T): boolean => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing file:", error);
    return false;
  }
};

// IPC handlers
ipcMain.handle(
  "show-notification",
  async (event, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
        icon: path.join(__dirname, "../assets/icon.png"),
        silent: false,
      }).show();
    }
  },
);

ipcMain.handle("save-settings", async (event, settings: SettingsData) => {
  return writeJsonFile(settingsPath, settings);
});

ipcMain.handle("load-settings", async (event) => {
  return readJsonFile<SettingsData>(settingsPath);
});

ipcMain.handle("save-stats", async (event, stats: StatsData) => {
  return writeJsonFile(statsPath, stats);
});

ipcMain.handle("load-stats", async (event) => {
  return readJsonFile<StatsData>(statsPath);
});

ipcMain.handle(
  "save-daily-sessions",
  async (event, sessions: DailySessions) => {
    return writeJsonFile(dailySessionsPath, sessions);
  },
);

ipcMain.handle("load-daily-sessions", async (event) => {
  return readJsonFile<DailySessions>(dailySessionsPath);
});

ipcMain.handle("quit-app", async (event) => {
  app.quit();
});

ipcMain.handle("toggle-snooze", async (event) => {
  try {
    const isSnooze = await preferencesManager.toggleSnooze();
    return { success: true, isSnooze };
  } catch (error) {
    console.error("Failed to toggle snooze:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("get-snooze-status", async (event) => {
  try {
    const isSnooze = await preferencesManager.isSnooze();
    return { success: true, isSnooze };
  } catch (error) {
    console.error("Failed to get snooze status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("save-preferences", async (event, preferences) => {
  try {
    await preferencesManager.updatePreferences(preferences);
    return { success: true };
  } catch (error) {
    console.error("Failed to save preferences:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("load-preferences", async (event) => {
  try {
    const data = await preferencesManager.loadPreferences();
    return { success: true, preferences: data.preferences };
  } catch (error) {
    console.error("Failed to load preferences:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// Initialize preferences manager
const preferencesManager = new PreferencesManager();

mb.on("ready", () => {
  console.log("Menubar app is ready");
  setupIPCServer();
});

// Track window shown for dismissal detection
mb.on("show", async () => {
  console.log("Window shown");
  await preferencesManager.recordWindowShown();
});

// Track window hidden and check for dismissal
mb.on("hide", async () => {
  console.log("Window hidden");
  await preferencesManager.checkForDismissal();
});

// Only open dev tools in development
if (process.env.NODE_ENV === "development") {
  mb.on("after-create-window", () => {
    mb.window?.webContents.openDevTools({ mode: "detach" });
  });
}

// IPC Server for CLI communication
let ipcServer: net.Server | null = null;

const getSocketPath = (): string => {
  const tmpDir = os.tmpdir();
  return path.join(tmpDir, "clauditate.sock");
};

const setupIPCServer = (): void => {
  const socketPath = getSocketPath();

  // Remove existing socket file if it exists
  try {
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
  } catch (error) {
    console.log("Could not remove existing socket:", error);
  }

  ipcServer = net.createServer((socket) => {
    console.log("CLI client connected");

    const safeWrite = (data: string) => {
      if (!socket.destroyed && socket.writable) {
        try {
          socket.write(data);
        } catch (error) {
          console.log(
            "Socket write failed (client disconnected):",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    };

    socket.on("data", (data) => {
      try {
        const command = data.toString().trim();
        console.log("Received command:", command);

        switch (command) {
          case "show":
            try {
              mb.showWindow();
              safeWrite("shown\n");
            } catch (error) {
              safeWrite("error: failed to show\n");
            }
            break;

          case "hide":
            try {
              mb.hideWindow();
              safeWrite("hidden\n");
            } catch (error) {
              safeWrite("error: failed to hide\n");
            }
            break;

          case "ping":
            safeWrite("pong\n");
            break;

          default:
            safeWrite("error: unknown command\n");
        }
      } catch (error) {
        console.error("Error processing command:", error);
        safeWrite("error: processing failed\n");
      }
    });

    socket.on("error", (error) => {
      console.log("Socket error:", error);
    });

    socket.on("close", () => {
      console.log("CLI client disconnected");
    });
  });

  ipcServer.listen(socketPath, () => {
    console.log("IPC server listening on:", socketPath);
  });

  ipcServer.on("error", (error) => {
    console.error("IPC server error:", error);
  });
};

// Cleanup on app quit
app.on("before-quit", () => {
  if (ipcServer) {
    ipcServer.close();
    try {
      const socketPath = getSocketPath();
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
      }
    } catch (error) {
      console.log("Could not cleanup socket:", error);
    }
  }
});

