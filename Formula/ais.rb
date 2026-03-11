class Ais < Formula
  desc "Synchronize AI agent rules across projects and teams"
  homepage "https://github.com/lbb00/ai-rules-sync"
  url "https://registry.npmjs.org/ai-rules-sync/-/ai-rules-sync-0.8.1.tgz"
  sha256 "14fa41fdb83b6ee89ff38d83f634b415238548b748e60e0e50be406936d19369"
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
