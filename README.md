# Clauditate

> **⚠️ Early Release v1.1.0** - Please report issues!
> 
> Mindful meditation app that integrates with Claude Code for automatic breathing breaks during development

Clauditate combines meditation with coding by automatically showing a beautiful breathing app whenever Claude Code is thinking or processing. Stay centered and mindful while Claude helps you code!

## Features

- **Automatic Integration**: Appears when Claude Code is thinking, disappears when done
- **Beautiful Breathing Guide**: Smooth visual animations for inhale/exhale cycles
- **Customizable Sessions**: Choose 5, 10, 20, or 30 breathing cycles
- **Progress Tracking**: Daily, weekly, and monthly meditation insights
- **Celebration**: Gentle confetti animation when sessions complete
- **Menubar App**: Unobtrusive presence in your system tray
- **Cross-platform**: Works on macOS, Windows, and Linux

## Installation

### npm (recommended)
```bash
npm install -g clauditate
clauditate --hook-claude  # Set up Claude Code integration
```

### Homebrew (macOS)
```bash
brew tap ykumards/tap
brew install clauditate
clauditate --hook-claude  # Set up Claude Code integration
```

### Manual Installation
```bash
git clone https://github.com/ykumards/clauditate.git
cd clauditate
npm install
npm run build
npm link
clauditate --hook-claude
```

## Usage

### Automatic Mode (Recommended)
After running `clauditate --hook-claude`, the app will automatically:
- Show when Claude Code starts any tool operation
- Hide when Claude Code finishes
- Provide gentle breathing guidance during Claude's thinking time

### Manual Mode
```bash
clauditate --start      # Start the meditation app
clauditate --show       # Show the app
clauditate --hide       # Hide the app
clauditate --help       # Show all commands
```

### Managing Integration
```bash
clauditate --hook-claude    # Install Claude Code hooks
clauditate --unhook-claude  # Remove Claude Code hooks
clauditate --update-hooks   # Update hooks to latest version
```

## How It Works

Clauditate uses Claude Code's [hooks system](https://docs.anthropic.com/en/docs/claude-code/hooks) to:

1. **PreToolUse Hook**: Triggers when Claude starts any tool (Bash, Edit, Read, etc.)
2. **PostToolUse Hook**: Triggers when Claude finishes a tool operation
3. **Stop Hook**: Triggers when Claude finishes responding

This creates natural meditation moments during development, helping you:
- Stay mindful during long Claude operations
- Take breathing breaks during complex tasks
- Maintain focus and reduce stress
- Practice mindfulness without disrupting workflow


## Configuration

Clauditate automatically configures Claude Code hooks in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "clauditate --show"}]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "clauditate --hide"}]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "clauditate --hide"}]
    }]
  }
}
```

## Development

```bash
git clone https://github.com/ykumards/clauditate.git
cd clauditate
npm install
npm run build
npm run dev  # Start in development mode
```

### Project Structure
```
src/
├── main.ts      # Electron main process
├── renderer.ts  # Frontend meditation interface
├── preload.ts   # Secure IPC bridge
├── cli.ts       # Command-line interface
└── install.ts   # Installation wizard
```

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Disclaimer

**IMPORTANT**: This is an early release (v1.1.0). While we've tested it carefully:

- This software is provided "AS IS" without warranty of any kind
- Use at your own risk
- We are not responsible for any issues, interruptions, or meditation-induced enlightenment
- **This is an independent project, not officially affiliated with Anthropic Inc. or Claude**
- "Claude" and "Claude Code" are trademarks of Anthropic Inc.
- We are not endorsed by, sponsored by, or otherwise affiliated with Anthropic Inc.

Please report bugs and issues on [GitHub](https://github.com/ykumards/clauditate/issues).

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

## Acknowledgments

- Built with [Electron](https://electronjs.org/) and [TypeScript](https://typescriptlang.org/)
- Integrates with [Claude Code](https://claude.ai/code) hooks system
- Inspired by mindfulness practices and developer wellness

## 🔗 Links

- [GitHub Repository](https://github.com/ykumards/clauditate)
- [npm Package](https://npmjs.com/package/clauditate)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Report Issues](https://github.com/ykumards/clauditate/issues)

---

*Stay mindful, code peacefully* 🧘‍♀️✨
