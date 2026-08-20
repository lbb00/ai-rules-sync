import { describe, expect, it } from 'vitest';
import { isSourceNameConfigured } from '../project-config.js';

describe('isSourceNameConfigured', () => {
  it('matches a plain (non-aliased) key', () => {
    const section = { 'code-discovery': 'https://example.com/repo.git' };
    expect(isSourceNameConfigured(section, 'code-discovery')).toBe(true);
  });

  it('matches a source name configured under an alias', () => {
    const section = {
      'quick-fix': { url: 'https://example.com/repo.git', rule: 'fix' }
    };
    expect(isSourceNameConfigured(section, 'fix')).toBe(true);
  });

  it('returns false for an unconfigured source name', () => {
    const section = { 'code-discovery': 'https://example.com/repo.git' };
    expect(isSourceNameConfigured(section, 'review')).toBe(false);
  });
});
