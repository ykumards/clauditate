class Clauditate < Formula
  desc "A menubar meditation app that helps you stay mindful while Claude Code works"
  homepage "https://github.com/ykumards/clauditate"
  url "https://github.com/ykumards/clauditate/archive/refs/tags/v1.2.0.tar.gz"
  sha256 "83f7011dbf1df06cd51dbed83c1f36c40b32087857c08a1d32d87db12ff8fc15"
  license "MIT"
  version "1.2.0"

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