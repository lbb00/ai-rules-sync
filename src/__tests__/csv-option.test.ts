import { describe, expect, it } from 'vitest';
import { parseCsvOption } from '../cli/csv-option.js';

describe('parseCsvOption', () => {
  it('trims whitespace around comma-separated values', () => {
    expect(parseCsvOption('cursor, codex')).toEqual(['cursor', 'codex']);
  });

  it('drops empty segments produced by trailing/duplicate commas', () => {
    expect(parseCsvOption('cursor,, codex,')).toEqual(['cursor', 'codex']);
  });

  it('returns undefined for empty or missing input', () => {
    expect(parseCsvOption(undefined)).toBeUndefined();
    expect(parseCsvOption('')).toBeUndefined();
    expect(parseCsvOption('  ,  ')).toBeUndefined();
  });
});
