import { describe, expect, it } from 'vitest';
import { bashScript, fishScript, getCompletionScript, resolveCompletionAdapter, zshScript } from '../completion/scripts.js';
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

  it('should generate a directory-listing completion type for every registered adapter', () => {
    // Every adapter (all ~30 tools) now gets a real `ais <tool> <subtype>` CLI
    // command (registerToolGroup wires every adapter the registry has, no
    // hand-maintained exceptions), so every adapter must be reachable from
    // `ais <TAB>` completion too.
    const missing = adapterRegistry.all()
      .map(adapter => adapter.name)
      .filter(name => !bashScript.includes(`ais _complete ${name}`));

    expect(missing).toEqual([]);
  });

  it('should suggest subcommands for every adapter subtype, including tools with more than one', () => {
    // registerToolGroup wires a subtype subgroup per adapter uniformly, so
    // multi-subtype tools (cline, windsurf, opencode, codex, ...) must expose
    // completion for all of their subtypes, not just the first one wired.
    expect(bashScript).toContain('ais _complete cline-commands');
    expect(bashScript).toContain('ais _complete cline-agents');
    expect(bashScript).toContain('ais _complete windsurf-commands');
    expect(bashScript).toContain('ais _complete opencode-rules');
    expect(bashScript).toContain('ais _complete codex-agents');

    expect(zshScript).toContain('cline_commands_subcmds');
    expect(zshScript).toContain('cline_agents_subcmds');
    expect(zshScript).toContain('windsurf_commands_subcmds');
    expect(zshScript).toContain('opencode_rules_subcmds');
    expect(zshScript).toContain('codex_agents_subcmds');

    expect(fishScript).toContain('ais _complete cline-commands');
    expect(fishScript).toContain('ais _complete cline-agents');
    expect(fishScript).toContain('ais _complete windsurf-commands');
    expect(fishScript).toContain('ais _complete opencode-rules');
    expect(fishScript).toContain('ais _complete codex-agents');

    // Their other subtypes still get completion too.
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

  it('should resolve an adapter for every adapter now wired into the command tree', () => {
    // These five used to have no real CLI command and had to be excluded from
    // resolveCompletionAdapter; the 1.0 command-tree redesign wires every
    // adapter uniformly, so they must resolve like any other adapter now.
    const previouslyUnwired = ['cline-commands', 'cline-agents', 'windsurf-commands', 'opencode-rules', 'codex-agents'];
    for (const name of previouslyUnwired) {
      expect(resolveCompletionAdapter(name), `"${name}" should resolve now that it has CLI wiring`).toBeDefined();
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
