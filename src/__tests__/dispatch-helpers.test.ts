import { describe, expect, it } from 'vitest';
import { getToolsForInstallMode, resolveSingleAdapterForMode } from '../commands/helpers.js';
import { adapterRegistry } from '../adapters/index.js';

describe('getToolsForInstallMode', () => {
  it('should return an empty list for mode "none"', () => {
    expect(getToolsForInstallMode('none')).toEqual([]);
  });

  it('should install a single newer registry-only tool without a hardcoded branch', () => {
    // Regression for: top-level `ais install` silently did nothing for any
    // of the 19 tools registered after the hand-written if-chain was last
    // updated (e.g. codebuddy, pi, warp, ...).
    expect(getToolsForInstallMode('codebuddy')).toEqual(['codebuddy']);
  });

  it('should cover every registered tool (not just the original 11) in ambiguous mode', () => {
    const tools = getToolsForInstallMode('ambiguous');
    expect(tools).toContain('codebuddy');
    expect(tools).toContain('warp');
    expect(tools).toContain('agents-md');
    expect(tools.length).toBe(new Set(adapterRegistry.all().map(a => a.tool)).size);
  });
});

describe('resolveSingleAdapterForMode', () => {
  it('should auto-resolve a tool that has exactly one registered subtype', () => {
    // warp only ever registered warpSkillsAdapter; generic add/remove should
    // just work instead of throwing "please use an explicit subcommand".
    const adapter = resolveSingleAdapterForMode('warp', 'add');
    expect(adapter.name).toBe('warp-skills');
  });

  it('should auto-resolve agents-md (single subtype) once its tool name is reachable', () => {
    const adapter = resolveSingleAdapterForMode('agents-md', 'add');
    expect(adapter.name).toBe('agents-md-file');
  });

  it('should preserve the legacy default-subtype pick for cursor (rules) despite multiple subtypes', () => {
    const adapter = resolveSingleAdapterForMode('cursor', 'add');
    expect(adapter.name).toBe('cursor-rules');
  });

  it('should require an explicit subcommand for a newer multi-subtype tool, listing its real subtypes', () => {
    expect(() => resolveSingleAdapterForMode('codebuddy', 'add')).toThrow(
      /ais codebuddy rules\/skills\/commands\/md add/
    );
  });

  it('should still require an explicit subcommand for claude (pre-existing multi-subtype behavior)', () => {
    expect(() => resolveSingleAdapterForMode('claude', 'add')).toThrow(/explicitly/);
  });
});
