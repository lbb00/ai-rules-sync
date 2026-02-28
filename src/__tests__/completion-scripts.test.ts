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

  it('should return trimmed completion scripts for each shell', () => {
    expect(getCompletionScript('bash')).toBe(bashScript.trim());
    expect(getCompletionScript('zsh')).toBe(zshScript.trim());
    expect(getCompletionScript('fish')).toBe(fishScript.trim());
  });
});
