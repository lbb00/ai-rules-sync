import { expect, it } from 'vitest';
import type { AdapterRegistry, SyncAdapter } from '../../adapters/types.js';

interface StandardAdapterExpectation {
  name: string;
  tool: string;
  subtype: string;
  defaultSourceDir: string;
  targetDir: string;
  mode: 'directory' | 'file' | 'hybrid';
  configPath: [string, string];
  fileSuffixes?: string[];
}

interface StandardAdapterContractOptions {
  adapter: SyncAdapter;
  registry: AdapterRegistry;
  expected: StandardAdapterExpectation;
}

/**
 * Shared contract tests for standard adapters created via createBaseAdapter.
 */
export function runStandardAdapterContract(options: StandardAdapterContractOptions): void {
  const { adapter, registry, expected } = options;

  it('should have correct basic properties', () => {
    expect(adapter.name).toBe(expected.name);
    expect(adapter.tool).toBe(expected.tool);
    expect(adapter.subtype).toBe(expected.subtype);
    expect(adapter.defaultSourceDir).toBe(expected.defaultSourceDir);
    expect(adapter.targetDir).toBe(expected.targetDir);
    expect(adapter.mode).toBe(expected.mode);
    if (expected.fileSuffixes) {
      expect(adapter.fileSuffixes).toEqual(expected.fileSuffixes);
    }
  });

  it('should have correct config path', () => {
    expect(adapter.configPath).toEqual(expected.configPath);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = registry.getByName(expected.name);
    expect(retrieved).toBe(adapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = registry.get(expected.tool, expected.subtype);
    expect(retrieved).toBe(adapter);
  });

  it('should have required adapter methods', () => {
    expect(adapter.addDependency).toBeDefined();
    expect(adapter.removeDependency).toBeDefined();
    expect(adapter.link).toBeDefined();
    expect(adapter.unlink).toBeDefined();
  });
}
