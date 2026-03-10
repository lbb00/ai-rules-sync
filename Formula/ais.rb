class Ais < Formula
  desc "Synchronize AI agent rules across projects and teams"
  homepage "https://github.com/lbb00/ai-rules-sync"
  url "https://registry.npmjs.org/ai-rules-sync/-/ai-rules-sync-0.7.0.tgz"
  sha256 "564f85223e4ed6b373c7662ca8c6a5a2ba45a3271bbec410f6a8c5990371189a"
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
