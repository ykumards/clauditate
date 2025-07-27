class Clauditate < Formula
  desc "Mindful meditation app that integrates with Claude Code for automatic breathing breaks"
  homepage "https://github.com/ykumards/clauditate"
  url "https://github.com/ykumards/clauditate/archive/v1.0.1.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"

  depends_on "node"

  def install
    # Install dependencies
    system "npm", "ci", "--production", "--prefix", buildpath
    
    # Build the TypeScript
    system "npm", "run", "build", "--prefix", buildpath
    
    # Copy everything to libexec
    libexec.install Dir["*"]
    
    # Create the main executable
    (bin/"clauditate").write <<~EOS
      #!/bin/bash
      export NODE_PATH="#{libexec}/node_modules"
      exec "#{Formula["node"].opt_bin}/node" "#{libexec}/dist/cli.js" "$@"
    EOS
    
    # Make it executable
    chmod 0755, bin/"clauditate"
  end

  def post_install
    puts <<~EOS
      🧘 Clauditate installed successfully!

      To integrate with Claude Code:
        clauditate --hook-claude

      To start the meditation app:
        clauditate --start

      To see all commands:
        clauditate --help

      After installation, Clauditate will automatically appear when Claude Code is thinking!
    EOS
  end

  test do
    assert_match "clauditate - Mindful meditation for Claude Code developers", shell_output("#{bin}/clauditate --help")
  end
end