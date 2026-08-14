class Ais < Formula
  desc "Synchronize AI agent rules across projects and teams"
  homepage "https://github.com/lbb00/ai-rules-sync"
  url "https://registry.npmjs.org/ai-rules-sync/-/ai-rules-sync-0.10.0.tgz"
  sha256 "ef189346dbcd767bd7ccffd16e8cf479b8af03ab55652b63d634112a5f1bfde3"
  license "Unlicense"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/ais --version")
  end
end
