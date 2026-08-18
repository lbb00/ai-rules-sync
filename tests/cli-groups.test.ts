import { describe, it, expect } from 'vitest';
import {
  CLI_GROUP_TOOL_MAP,
  BROADCAST_GROUPS,
  resolveToolByCliName,
  cliNameForTool,
  broadcastGroupForSubtype,
  assertNoBroadcastGroupNameCollisions
} from '../src/adapters/cli-groups.js';
import { adapterRegistry } from '../src/adapters/index.js';

describe('cli-groups', () => {
  describe('resolveToolByCliName', () => {
    it('resolves a known CLI group alias to its adapter tool name', () => {
      expect(resolveToolByCliName('agy')).toBe('antigravity-cli');
      expect(resolveToolByCliName('droid')).toBe('factorydroid');
    });

    it('resolves a native adapter tool name to itself', () => {
      expect(resolveToolByCliName('claude')).toBe('claude');
      expect(resolveToolByCliName('cursor')).toBe('cursor');
      // Native tool names for aliased tools also resolve, not just their alias.
      expect(resolveToolByCliName('antigravity-cli')).toBe('antigravity-cli');
      expect(resolveToolByCliName('factorydroid')).toBe('factorydroid');
    });

    it('returns undefined for an unknown name instead of throwing', () => {
      expect(resolveToolByCliName('not-a-real-tool')).toBeUndefined();
      expect(() => resolveToolByCliName('not-a-real-tool')).not.toThrow();
    });
  });

  describe('cliNameForTool', () => {
    it('returns the alias for tools whose CLI group name differs from their tool field', () => {
      expect(cliNameForTool('antigravity-cli')).toBe('agy');
      expect(cliNameForTool('factorydroid')).toBe('droid');
    });

    it('returns the tool name itself for tools with no alias', () => {
      expect(cliNameForTool('claude')).toBe('claude');
      expect(cliNameForTool('opencode')).toBe('opencode');
    });

    it('round-trips with resolveToolByCliName for every tool in the registry', () => {
      const tools = new Set(adapterRegistry.all().map(adapter => adapter.tool));
      for (const tool of tools) {
        const cliName = cliNameForTool(tool);
        expect(resolveToolByCliName(cliName)).toBe(tool);
      }
    });
  });

  describe('CLI_GROUP_TOOL_MAP', () => {
    it('only lists the tools whose CLI group name actually diverges from adapter.tool', () => {
      // Every mapped tool name must be real, and every mapped value must be
      // reachable via a real adapter, so the table can't silently rot.
      for (const [cliName, tool] of Object.entries(CLI_GROUP_TOOL_MAP)) {
        expect(cliName).not.toBe(tool);
        expect(adapterRegistry.getForTool(tool).length).toBeGreaterThan(0);
      }
    });
  });

  describe('BROADCAST_GROUPS', () => {
    it('gives every group at least two distinct tools with a matching adapter', () => {
      for (const [groupName, subtypes] of Object.entries(BROADCAST_GROUPS)) {
        const tools = new Set(
          adapterRegistry
            .all()
            .filter(adapter => subtypes.includes(adapter.subtype))
            .map(adapter => adapter.tool)
        );
        expect(tools.size, `broadcast group "${groupName}" needs >=2 tools`).toBeGreaterThanOrEqual(2);
      }
    });

    it('does not create a group for single-tool subtypes like workflows or tools', () => {
      const groupedSubtypes = new Set(Object.values(BROADCAST_GROUPS).flat());
      expect(groupedSubtypes.has('workflows')).toBe(false);
      expect(groupedSubtypes.has('tools')).toBe(false);
    });
  });

  describe('assertNoBroadcastGroupNameCollisions', () => {
    it('passes for the real registry data (implicitly exercised on module import)', () => {
      const cliGroupNames = adapterRegistry.all().map(adapter => cliNameForTool(adapter.tool));
      expect(() =>
        assertNoBroadcastGroupNameCollisions(Object.keys(BROADCAST_GROUPS), cliGroupNames)
      ).not.toThrow();
    });

    it('throws when a broadcast group name collides with a tool CLI group name', () => {
      expect(() =>
        assertNoBroadcastGroupNameCollisions(['claude'], ['claude', 'cursor'])
      ).toThrow(/collides with a tool/);
    });

    it('throws when a broadcast group name collides with a reserved top-level word', () => {
      expect(() =>
        assertNoBroadcastGroupNameCollisions(['install'], ['claude', 'cursor'], ['install'])
      ).toThrow(/collides with a reserved/);
    });
  });

  describe('broadcastGroupForSubtype', () => {
    it('resolves a grouped subtype to its broadcast group name', () => {
      expect(broadcastGroupForSubtype('skills')).toBe('skills');
      expect(broadcastGroupForSubtype('rules')).toBe('rules');
    });

    it('resolves agents-md\'s "file" subtype to the "md" group', () => {
      // BROADCAST_GROUPS.md = ['md', 'file'] — 'file' is agents-md's subtype,
      // folded under the 'md' broadcast group for UX (AGENTS.md is "the md
      // file" to users). A stub redirect that used the raw subtype name would
      // suggest a nonexistent `ais file ...` command instead.
      expect(broadcastGroupForSubtype('file')).toBe('md');
    });

    it('returns undefined for a subtype with no broadcast group', () => {
      expect(broadcastGroupForSubtype('instructions')).toBeUndefined();
      expect(broadcastGroupForSubtype('workflows')).toBeUndefined();
    });
  });
});
