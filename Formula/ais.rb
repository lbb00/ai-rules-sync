class Ais < Formula
  desc "Synchronize AI agent rules across projects and teams"
  homepage "https://github.com/lbb00/ai-rules-sync"
  url "https://registry.npmjs.org/ai-rules-sync/-/ai-rules-sync-0.5.0.tgz"
  sha256 "dacf888ade91ae0141473aba22b76143e8f33dae43832348fc1df5211310be52"
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
