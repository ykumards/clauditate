#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import { PreferencesManager } from './preferences';

interface CLIOptions {
  show?: boolean;
  smartShow?: boolean;
  hide?: boolean;
  start?: boolean;
  hookClaude?: boolean;
  unhookClaude?: boolean;
  updateHooks?: boolean;
  help?: boolean;
}

class ClauditateCLI {
  private appPath: string;
  private isRunning: boolean = false;

  constructor() {
    // Get the path to the installed package
    this.appPath = path.dirname(__dirname);
  }

  private getSocketPath(): string {
    const tmpDir = os.tmpdir();
    return path.join(tmpDir, 'clauditate.sock');
  }

  private async sendIPCCommand(command: string): Promise<string> {
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

  async run(args: string[]): Promise<void> {
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

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};
    
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

  private showHelp(): void {
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

  private async startApp(): Promise<void> {
    console.log('Starting Clauditate...');
    
    const electronPath = path.join(this.appPath, 'node_modules', '.bin', 'electron');
    const mainPath = path.join(this.appPath, 'dist', 'main.js');
    
    const child = spawn(electronPath, [mainPath], {
      stdio: 'inherit',
      detached: true
    });

    child.unref();
    console.log('Clauditate started successfully!');
  }

  private async showApp(): Promise<void> {
    try {
      // Try to show via IPC first
      const response = await this.sendIPCCommand('show');
      if (response.startsWith('error')) {
        console.error('Show command failed:', response);
      } else {
        console.log('App shown successfully');
      }
    } catch (error) {
      // If IPC fails, app is not running - respect user's choice to quit
      console.log('App not running - respecting user choice to work without interruptions');
      // Don't auto-start the app
    }
  }

  private async smartShowApp(): Promise<void> {
    try {
      // Check if app is running first
      const isRunning = await this.isAppRunning();
      if (!isRunning) {
        console.log('App not running - respecting user choice to work without interruptions');
        return;
      }

      // App is running, check if we should show based on timing logic
      const preferencesManager = new PreferencesManager();
      const shouldShow = await preferencesManager.shouldShowMeditation();
      
      if (shouldShow) {
        const response = await this.sendIPCCommand('show');
        if (response.startsWith('error')) {
          console.error('Smart show command failed:', response);
        } else {
          console.log('App shown based on smart timing');
        }
      } else {
        console.log('Skipping show - not the right time for mindfulness');
      }
    } catch (error) {
      console.log('Smart show failed:', error instanceof Error ? error.message : String(error));
    }
  }

  private async hideApp(): Promise<void> {
    try {
      const response = await this.sendIPCCommand('hide');
      if (response.startsWith('error')) {
        console.error('Hide command failed:', response);
      } else {
        console.log('App hidden successfully');
      }
    } catch (error) {
      console.error('Failed to hide app:', error);
    }
  }

  private async isAppRunning(): Promise<boolean> {
    try {
      const response = await this.sendIPCCommand('ping');
      return response === 'pong';
    } catch (error) {
      return false;
    }
  }

  private async installHooks(): Promise<void> {
    console.log('Installing Claude Code hooks...');
    
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      console.error('Could not determine home directory');
      process.exit(1);
    }

    const claudeDir = path.join(homeDir, '.claude');
    const settingsPath = path.join(claudeDir, 'settings.json');
    
    // Create .claude directory if it doesn't exist
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Load existing settings or create new ones
    let settings: any = {};
    if (fs.existsSync(settingsPath)) {
      const settingsContent = fs.readFileSync(settingsPath, 'utf8');
      try {
        settings = JSON.parse(settingsContent);
      } catch (error) {
        console.log('Creating new settings file...');
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

    settings.hooks.Stop = [
      {
        matcher: "",
        hooks: [
          {
            type: "command",
            command: `node "${cliPath}" --hide`
          }
        ]
      }
    ];

    // Write settings back
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    console.log('✅ Claude Code hooks installed successfully!');
    console.log('Clauditate will now appear automatically when Claude Code is thinking.');
  }

  private async updateHooks(): Promise<void> {
    console.log('Updating Claude Code hooks...');
    
    // First uninstall existing hooks
    await this.uninstallHooks(true); // true = silent mode
    
    // Then install fresh hooks
    await this.installHooks();
    
    console.log('✅ Claude Code hooks updated successfully!');
  }

  private async uninstallHooks(silent: boolean = false): Promise<void> {
    if (!silent) {
      console.log('Uninstalling Claude Code hooks...');
    }
    
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      console.error('Could not determine home directory');
      process.exit(1);
    }

    const settingsPath = path.join(homeDir, '.claude', 'settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      if (!silent) {
        console.log('No Claude Code settings found.');
      }
      return;
    }

    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    let settings: any = {};
    
    try {
      settings = JSON.parse(settingsContent);
    } catch (error) {
      console.error('Could not parse Claude Code settings');
      return;
    }

    // Remove clauditate hooks
    if (settings.hooks) {
      delete settings.hooks.PreToolUse;
      // delete settings.hooks.PostToolUse; // Not used anymore
      delete settings.hooks.Stop;
      
      // If hooks object is empty, remove it
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    if (!silent) {
      console.log('✅ Claude Code hooks uninstalled successfully!');
    }
  }
}

// Main execution
const cli = new ClauditateCLI();
cli.run(process.argv.slice(2)).catch(console.error);