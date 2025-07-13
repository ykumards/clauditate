#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

class ClauditeInstaller {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<void> {
    console.log('\n🧘 Welcome to Clauditate! 🧘\n');
    console.log('Clauditate integrates with Claude Code to provide mindful breathing breaks');
    console.log('while Claude is thinking, helping you stay centered during development.\n');

    const shouldInstall = await this.askQuestion(
      'Would you like to install Claude Code hooks for automatic meditation breaks? (y/N): '
    );

    if (shouldInstall.toLowerCase().startsWith('y')) {
      await this.installHooks();
    } else {
      console.log('\nYou can always install hooks later by running:');
      console.log('  clauditate --hook-claude\n');
      console.log('To start the app manually:');
      console.log('  clauditate --start\n');
    }

    this.rl.close();
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private async installHooks(): Promise<void> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (!homeDir) {
        throw new Error('Could not determine home directory');
      }

      const claudeDir = path.join(homeDir, '.claude');
      const settingsPath = path.join(claudeDir, 'settings.json');
      
      // Check if Claude Code is likely installed
      if (!fs.existsSync(claudeDir)) {
        console.log('\n⚠️  Claude Code directory not found.');
        const createDir = await this.askQuestion(
          'Create .claude directory for future Claude Code installation? (y/N): '
        );
        
        if (!createDir.toLowerCase().startsWith('y')) {
          console.log('\nHooks not installed. You can install them later with:');
          console.log('  clauditate --hook-claude\n');
          return;
        }
        
        fs.mkdirSync(claudeDir, { recursive: true });
      }

      // Backup existing settings
      if (fs.existsSync(settingsPath)) {
        const backupPath = settingsPath + `.backup.${Date.now()}`;
        fs.copyFileSync(settingsPath, backupPath);
        console.log(`\n📋 Backed up existing settings to: ${backupPath}`);
      }

      // Load existing settings or create new ones
      let settings: any = {};
      if (fs.existsSync(settingsPath)) {
        const settingsContent = fs.readFileSync(settingsPath, 'utf8');
        try {
          settings = JSON.parse(settingsContent);
        } catch (error) {
          console.log('Creating new settings file...');
          settings = {};
        }
      }

      // Add clauditate hooks
      if (!settings.hooks) {
        settings.hooks = {};
      }

      // Get the CLI path relative to this install script
      const packageDir = path.dirname(__dirname);
      const cliPath = path.join(packageDir, 'dist', 'cli.js');
      
      settings.hooks.PreToolUse = [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: `node "${cliPath}" --show`
            }
          ]
        }
      ];

      settings.hooks.PostToolUse = [
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

      // Write settings
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      
      console.log('\n✅ Claude Code hooks installed successfully!');
      console.log('\n🎉 Setup complete! Clauditate will now appear automatically when Claude Code is thinking.');
      console.log('\nCommands:');
      console.log('  clauditate --start        # Start the app manually');
      console.log('  clauditate --unhook-claude # Remove Claude Code integration');
      console.log('  clauditate --help         # Show all commands\n');

    } catch (error) {
      console.error('\n❌ Error installing hooks:', error);
      console.log('\nYou can try again later with:');
      console.log('  clauditate --hook-claude\n');
    }
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  const installer = new ClauditeInstaller();
  installer.run().catch(console.error);
}

export { ClauditeInstaller };