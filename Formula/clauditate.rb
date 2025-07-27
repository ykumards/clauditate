class Clauditate < Formula
  desc "Mindful meditation app that integrates with Claude Code for automatic breathing breaks"
  homepage "https://github.com/ykumards/clauditate"
  url "https://github.com/ykumards/clauditate/archive/refs/tags/v1.1.0.tar.gz"
  sha256 "0019dfc4b32d63c1392aa264aed2253c1e0c2fb09216f8e2cc269bbfb8bb49b5"
  license "MIT"
  version "1.1.0"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    system "npm", "run", "build"
    
    # Create symlink for the CLI
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/clauditate", "--version"
  end
end