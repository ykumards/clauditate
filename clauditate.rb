class Clauditate < Formula
  desc "Mindful meditation app that integrates with Claude Code for automatic breathing breaks"
  homepage "https://github.com/clauditate/clauditate"
  url "https://github.com/clauditate/clauditate/archive/v1.0.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    system "npm", "run", "build", "--prefix", libexec
    
    bin.install_symlink Dir["#{libexec}/bin/*"]
    
    # Create wrapper script for the main clauditate command
    (bin/"clauditate").write <<~EOS
      #!/bin/bash
      exec "#{Formula["node"].bin}/node" "#{libexec}/dist/cli.js" "$@"
    EOS
  end

  def post_install
    puts <<~EOS
      🧘 Clauditate installed successfully!

      To integrate with Claude Code:
        clauditate --install

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