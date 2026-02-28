import { describe, it, expect } from 'vitest';
import { findAdapterForAlias } from '../adapters/index.js';
import type { ProjectConfig } from '../project-config.js';

describe('findAdapterForAlias', () => {
  it('should resolve windsurf skill alias', () => {
    const config: ProjectConfig = {
      windsurf: {
        skills: {
          deploy: 'https://example.com/repo.git'
        }
      }
    };

    const found = findAdapterForAlias(config, 'deploy');
    expect(found?.adapter.name).toBe('windsurf-skills');
    expect(found?.section).toBe('windsurf.skills');
  });

  it('should resolve cline rule alias', () => {
    const config: ProjectConfig = {
      cline: {
        rules: {
          coding: 'https://example.com/repo.git'
        }
      }
    };

    const found = findAdapterForAlias(config, 'coding');
    expect(found?.adapter.name).toBe('cline-rules');
    expect(found?.section).toBe('cline.rules');
  });

  it('should resolve flat agentsMd alias', () => {
    const config: ProjectConfig = {
      agentsMd: {
        AGENTS: 'https://example.com/repo.git'
      }
    };

    const found = findAdapterForAlias(config, 'AGENTS');
    expect(found?.adapter.name).toBe('agents-md-file');
    expect(found?.section).toBe('agentsMd');
  });

  it('should return null when alias does not exist', () => {
    const config: ProjectConfig = {
      windsurf: {
        rules: {
          style: 'https://example.com/repo.git'
        }
      }
    };

    const found = findAdapterForAlias(config, 'unknown');
    expect(found).toBeNull();
  });
});
