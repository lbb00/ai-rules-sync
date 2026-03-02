import { describe, expect, it } from 'vitest';
import { bashScript, fishScript, getCompletionScript, zshScript } from '../completion/scripts.js';

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
});
