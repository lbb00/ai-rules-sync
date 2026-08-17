import { describe, expect, it } from 'vitest';
import { bashScript, fishScript, getCompletionScript, resolveCompletionAdapter, UNWIRED_ADAPTER_NAMES, zshScript } from '../completion/scripts.js';
import { adapterRegistry } from '../adapters/index.js';

describe('completion scripts metadata generation', () => {
  it('should include windsurf and cline skills completion in bash script', () => {
    expect(bashScript).toContain('ais _complete windsurf-skills');
    expect(bashScript).toContain('ais _complete cline-skills');
    expect(bashScript).toContain('if [[ "$prev" == "windsurf" ]]');
    expect(bashScript).toContain('if [[ "$prev" == "cline" ]]');
  });

  it('should include nested subcommand arrays and dynamic add completion in zsh script', () => {
    expect(zshScript).toContain('windsurf_skills_subcmds');
    expect(zshScript).toContain('cline_skills_subcmds');
    expect(zshScript).toContain('ais _complete cursor-commands');
    expect(zshScript).toContain('ais _complete windsurf-rules');
  });

  it('should include metadata-driven fish completion entries', () => {
    expect(fishScript).toContain('__fish_use_subcommand" -a "windsurf"');
    expect(fishScript).toContain('__fish_use_subcommand" -a "cline"');
    expect(fishScript).toContain('ais _complete windsurf-skills');
    expect(fishScript).toContain('ais _complete cline-skills');
  });

  it('should include linux-style aliases and new query commands', () => {
    expect(bashScript).toContain('list ls');
    expect(bashScript).toContain('remove rm');
    expect(bashScript).toContain('status');
    expect(bashScript).toContain('search');

    expect(zshScript).toContain("'ls:Alias for list'");
    expect(zshScript).toContain("'rm:Alias for remove'");
    expect(zshScript).toContain("'status:Show repository and config status'");
    expect(zshScript).toContain("'search:Search entries in repository'");

    expect(fishScript).toContain('-a "ls" -d "Alias for list"');
    expect(fishScript).toContain('-a "rm" -d "Alias for remove"');
    expect(fishScript).toContain('-a "status" -d "Show repository and config status"');
    expect(fishScript).toContain('-a "search" -d "Search entries in repository"');
  });

  it('should return trimmed completion scripts for each shell', () => {
    expect(getCompletionScript('bash')).toBe(bashScript.trim());
    expect(getCompletionScript('zsh')).toBe(zshScript.trim());
    expect(getCompletionScript('fish')).toBe(fishScript.trim());
  });

  it('should generate a directory-listing completion type for every registered, CLI-wired adapter', () => {
    // Every adapter (all ~30 tools, not just the original 11) that has a real CLI
    // command must be reachable from `ais <TAB>` completion; the generator is
    // expected to derive this from adapterRegistry rather than a hand-maintained
    // tool list that drifts. Adapters registered but not yet wired to a CLI
    // command (see UNWIRED_ADAPTER_NAMES) are excluded on purpose.
    const missing = adapterRegistry.all()
      .map(adapter => adapter.name)
      .filter(name => !UNWIRED_ADAPTER_NAMES.has(name))
      .filter(name => !bashScript.includes(`ais _complete ${name}`));

    expect(missing).toEqual([]);
  });

  it('should not suggest subcommands for adapters that lack real CLI wiring', () => {
    // registerRulesAndSkillsToolGroup only wires rules/skills for cline and
    // windsurf; the opencode and codex command blocks in src/index.ts don't wire
    // opencode-rules or codex-agents. Completion must not lie about these.
    expect(bashScript).not.toContain('ais _complete cline-commands');
    expect(bashScript).not.toContain('ais _complete cline-agents');
    expect(bashScript).not.toContain('ais _complete windsurf-commands');
    expect(bashScript).not.toContain('ais _complete opencode-rules');
    expect(bashScript).not.toContain('ais _complete codex-agents');

    expect(zshScript).not.toContain('cline_commands_subcmds');
    expect(zshScript).not.toContain('cline_agents_subcmds');
    expect(zshScript).not.toContain('windsurf_commands_subcmds');
    expect(zshScript).not.toContain('opencode_rules_subcmds');
    expect(zshScript).not.toContain('codex_agents_subcmds');

    expect(fishScript).not.toContain('ais _complete cline-commands');
    expect(fishScript).not.toContain('ais _complete cline-agents');
    expect(fishScript).not.toContain('ais _complete windsurf-commands');
    expect(fishScript).not.toContain('ais _complete opencode-rules');
    expect(fishScript).not.toContain('ais _complete codex-agents');

    // Actually-wired subtypes for the same tools must still get completion.
    expect(bashScript).toContain('ais _complete cline-rules');
    expect(bashScript).toContain('ais _complete cline-skills');
    expect(bashScript).toContain('ais _complete windsurf-rules');
    expect(bashScript).toContain('ais _complete windsurf-skills');
    expect(bashScript).toContain('ais _complete opencode-commands');
    expect(bashScript).toContain('ais _complete opencode-skills');
    expect(bashScript).toContain('ais _complete opencode-agents');
    expect(bashScript).toContain('ais _complete opencode-tools');
    expect(bashScript).toContain('ais _complete codex-rules');
    expect(bashScript).toContain('ais _complete codex-skills');
    expect(bashScript).toContain('ais _complete codex-md');
  });

  it('should not resolve an adapter for unwired completion types', () => {
    for (const name of UNWIRED_ADAPTER_NAMES) {
      expect(resolveCompletionAdapter(name), `"${name}" should not resolve, it has no CLI wiring`).toBeUndefined();
    }
  });

  it('should resolve an adapter for every completion type the generated scripts can emit', () => {
    // Any `ais _complete <type>` the bash/zsh/fish scripts can produce must resolve to a
    // real adapter, otherwise the shell silently gets no completions for that type.
    const types = new Set(
      Array.from(bashScript.matchAll(/ais _complete ([\w-]+)/g), match => match[1])
    );

    expect(types.size).toBeGreaterThan(0);
    for (const type of types) {
      expect(resolveCompletionAdapter(type), `no adapter resolves for completion type "${type}"`).toBeDefined();
    }
  });
});
