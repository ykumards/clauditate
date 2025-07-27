#!/usr/bin/env node
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
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const preferences_1 = require("./preferences");
// Simple logger that respects development mode
const isDev = process.env.NODE_ENV === 'development';
const log = {
    debug: (msg) => { if (isDev)
        console.log(msg); }, // Only in dev
    info: (msg) => console.log(msg), // Always show user-facing messages
    error: (msg) => console.error(msg), // Always show errors
    silent: (msg) => { if (isDev)
        console.log(msg); }, // Silent in production (IPC, internal)
};
class ClauditateCLI {
    constructor() {
        this.isRunning = false;
        // Get the path to the installed package
        this.appPath = path.dirname(__dirname);
    }
    getSocketPath() {
        const tmpDir = os.tmpdir();
        return path.join(tmpDir, 'clauditate.sock');
    }
    async sendIPCCommand(command) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const socketPath = this.getSocketPath();
            let response = '';
            socket.connect(socketPath, () => {
                socket.write(command);
            });
            socket.on('data', (data) => {
                response += data.toString();
                if (response.includes('\n')) {
                    socket.end();
                    resolve(response.trim());
                }
            });
            socket.on('error', (error) => {
                reject(new Error(`IPC connection failed: ${error.message}`));
            });
            socket.on('close', () => {
                if (!response) {
                    reject(new Error('No response from app'));
                }
            });
            // Timeout after 5 seconds
            setTimeout(() => {
                socket.destroy();
                reject(new Error('IPC command timeout'));
            }, 5000);
        });
    }
    async run(args) {
        const options = this.parseArgs(args);
        if (options.help || args.length === 0) {
            this.showHelp();
            return;
        }
        if (options.hookClaude) {
            await this.installHooks();
            return;
        }
        if (options.unhookClaude) {
            await this.uninstallHooks();
            return;
        }
        if (options.updateHooks) {
            await this.updateHooks();
            return;
        }
        if (options.start) {
            await this.startApp();
            return;
        }
        if (options.show) {
            await this.showApp();
            return;
        }
        if (options.smartShow) {
            await this.smartShowApp();
            return;
        }
        if (options.hide) {
            await this.hideApp();
            return;
        }
    }
    parseArgs(args) {
        const options = {};
        for (const arg of args) {
            switch (arg) {
                case '--show':
                case '-s':
                    options.show = true;
                    break;
                case '--smart-show':
                    options.smartShow = true;
                    break;
                case '--hide':
                case '-h':
                    options.hide = true;
                    break;
                case '--start':
                    options.start = true;
                    break;
                case '--hook-claude':
                    options.hookClaude = true;
                    break;
                case '--unhook-claude':
                    options.unhookClaude = true;
                    break;
                case '--update-hooks':
                    options.updateHooks = true;
                    break;
                case '--help':
                    options.help = true;
                    break;
            }
        }
        return options;
    }
    showHelp() {
        console.log(`
clauditate - Mindful meditation for Claude Code developers

Usage:
  clauditate [command]

Commands:
  --start           Start the meditation app
  --show, -s        Show the meditation app (always)
  --smart-show      Show the meditation app (only if timing is right)
  --hide, -h        Hide the meditation app (for hooks)
  --hook-claude     Install Claude Code hooks integration
  --unhook-claude   Remove Claude Code hooks integration
  --update-hooks    Update Claude Code hooks to latest version
  --help            Show this help

Examples:
  clauditate --start                # Start the app normally
  clauditate --hook-claude          # Set up Claude Code integration
  clauditate --show                 # Show app (used by Claude hooks)
  clauditate --hide                 # Hide app (used by Claude hooks)

After installation, the app will automatically appear when Claude Code is thinking!
    `);
    }
    async startApp() {
        log.info('Starting Clauditate...');
        const electronPath = path.join(this.appPath, 'node_modules', '.bin', 'electron');
        const mainPath = path.join(this.appPath, 'dist', 'main.js');
        const child = (0, child_process_1.spawn)(electronPath, [mainPath], {
            stdio: 'inherit',
            detached: true
        });
        child.unref();
        log.info('Clauditate started successfully!');
    }
    async showApp() {
        try {
            // Try to show via IPC first
            const response = await this.sendIPCCommand('show');
            if (response.startsWith('error')) {
                log.error('Show command failed: ' + response);
            }
            else {
                log.silent('App shown successfully');
            }
        }
        catch (error) {
            // If IPC fails, app is not running - respect user's choice to quit
            log.silent('App not running - respecting user choice to work without interruptions');
            // Don't auto-start the app
        }
    }
    async smartShowApp() {
        try {
            // Check if app is running first
            const isRunning = await this.isAppRunning();
            if (!isRunning) {
                log.silent('App not running - respecting user choice to work without interruptions');
                return;
            }
            // App is running, check if we should show based on timing logic
            const preferencesManager = new preferences_1.PreferencesManager();
            const shouldShow = await preferencesManager.shouldShowMeditation();
            if (shouldShow) {
                const response = await this.sendIPCCommand('show');
                if (response.startsWith('error')) {
                    log.silent('Smart show command failed: ' + response);
                }
                else {
                    log.silent('App shown based on smart timing');
                }
            }
            else {
                log.silent('Skipping show - not the right time for mindfulness');
            }
        }
        catch (error) {
            log.silent('Smart show failed: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    async hideApp() {
        try {
            const response = await this.sendIPCCommand('hide');
            if (response.startsWith('error')) {
                log.error('Hide command failed: ' + response);
            }
            else {
                log.silent('App hidden successfully');
            }
        }
        catch (error) {
            log.silent('Failed to hide app: ' + String(error));
        }
    }
    async isAppRunning() {
        try {
            const response = await this.sendIPCCommand('ping');
            return response === 'pong';
        }
        catch (error) {
            return false;
        }
    }
    async installHooks() {
        log.info('Installing Claude Code hooks...');
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
            log.error('Could not determine home directory');
            process.exit(1);
        }
        const claudeDir = path.join(homeDir, '.claude');
        const settingsPath = path.join(claudeDir, 'settings.json');
        // Create .claude directory if it doesn't exist
        if (!fs.existsSync(claudeDir)) {
            fs.mkdirSync(claudeDir, { recursive: true });
        }
        // Load existing settings or create new ones
        let settings = {};
        if (fs.existsSync(settingsPath)) {
            const settingsContent = fs.readFileSync(settingsPath, 'utf8');
            try {
                settings = JSON.parse(settingsContent);
            }
            catch (error) {
                log.debug('Creating new settings file...');
            }
        }
        // Add clauditate hooks
        if (!settings.hooks) {
            settings.hooks = {};
        }
        const cliPath = path.join(this.appPath, 'dist', 'cli.js');
        settings.hooks.PreToolUse = [
            {
                matcher: "",
                hooks: [
                    {
                        type: "command",
                        command: `node "${cliPath}" --smart-show`
                    }
                ]
            }
        ];
        // Remove PostToolUse hook - we don't want to hide between tools
        // settings.hooks.PostToolUse = [
        //   {
        //     matcher: "",
        //     hooks: [
        //       {
        //         type: "command",
        //         command: `node "${cliPath}" --hide`
        //       }
        //     ]
        //   }
        // ];
        // Remove Stop hook - let user control when to hide
        // settings.hooks.Stop = [
        //   {
        //     matcher: "",
        //     hooks: [
        //       {
        //         type: "command",
        //         command: `node "${cliPath}" --hide`
        //       }
        //     ]
        //   }
        // ];
        // Write settings back
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        log.info('✅ Claude Code hooks installed successfully!');
        log.info('Clauditate will now appear automatically when Claude Code is thinking.');
    }
    async updateHooks() {
        log.info('Updating Claude Code hooks...');
        // First uninstall existing hooks
        await this.uninstallHooks(true); // true = silent mode
        // Then install fresh hooks
        await this.installHooks();
        log.info('✅ Claude Code hooks updated successfully!');
    }
    async uninstallHooks(silent = false) {
        if (!silent) {
            log.info('Uninstalling Claude Code hooks...');
        }
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
            log.error('Could not determine home directory');
            process.exit(1);
        }
        const settingsPath = path.join(homeDir, '.claude', 'settings.json');
        if (!fs.existsSync(settingsPath)) {
            if (!silent) {
                log.debug('No Claude Code settings found.');
            }
            return;
        }
        const settingsContent = fs.readFileSync(settingsPath, 'utf8');
        let settings = {};
        try {
            settings = JSON.parse(settingsContent);
        }
        catch (error) {
            log.error('Could not parse Claude Code settings');
            return;
        }
        // Remove clauditate hooks
        if (settings.hooks) {
            delete settings.hooks.PreToolUse;
            // delete settings.hooks.PostToolUse; // Not used anymore
            delete settings.hooks.Stop; // Clean up old Stop hooks if they exist
            // If hooks object is empty, remove it
            if (Object.keys(settings.hooks).length === 0) {
                delete settings.hooks;
            }
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        if (!silent) {
            log.info('✅ Claude Code hooks uninstalled successfully!');
        }
    }
}
// Main execution
const cli = new ClauditateCLI();
cli.run(process.argv.slice(2)).catch(console.error);
//# sourceMappingURL=cli.js.map