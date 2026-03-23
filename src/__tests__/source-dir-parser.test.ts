import { describe, it, expect } from 'vitest';
import { parseSourceDirParam, parseSourceDirParams } from '../cli/source-dir-parser.js';

describe('source-dir-parser', () => {
  describe('parseSourceDirParam', () => {
    describe('simple format (just a path)', () => {
      it('should parse a simple path with both context tool and subtype', () => {
        const result = parseSourceDirParam('custom/rules', 'cursor', 'rules');
        expect(result).toEqual({ cursor: { rules: 'custom/rules' } });
      });

      it('should throw if contextTool is missing', () => {
        expect(() => parseSourceDirParam('custom/rules', undefined, 'rules')).toThrow(
          'Cannot infer tool and subtype'
        );
      });

      it('should throw if contextSubtype is missing', () => {
        expect(() => parseSourceDirParam('custom/rules', 'cursor')).toThrow(
          'Cannot infer tool and subtype'
        );
      });

      it('should throw if both context values are missing', () => {
        expect(() => parseSourceDirParam('custom/rules')).toThrow(
          'Cannot infer tool and subtype'
        );
      });
    });

    describe('dot-notation format (tool.subtype=path)', () => {
      it('should parse full tool.subtype=path format', () => {
        const result = parseSourceDirParam('cursor.rules=custom/rules');
        expect(result).toEqual({ cursor: { rules: 'custom/rules' } });
      });

      it('should parse tool.subtype=path without context', () => {
        const result = parseSourceDirParam('claude.skills=my/skills');
        expect(result).toEqual({ claude: { skills: 'my/skills' } });
      });

      it('should throw if tool.subtype key has empty tool', () => {
        expect(() => parseSourceDirParam('.rules=path')).toThrow('Invalid source-dir key');
      });

      it('should throw if tool.subtype key has empty subtype', () => {
        expect(() => parseSourceDirParam('cursor.=path')).toThrow('Invalid source-dir key');
      });
    });

    describe('subtype-only format (subtype=path)', () => {
      it('should parse subtype=path with contextTool', () => {
        const result = parseSourceDirParam('rules=custom/rules', 'cursor');
        expect(result).toEqual({ cursor: { rules: 'custom/rules' } });
      });

      it('should throw if subtype=path without contextTool', () => {
        expect(() => parseSourceDirParam('rules=custom/rules')).toThrow(
          'Cannot infer tool'
        );
      });
    });

    describe('error cases', () => {
      it('should throw for empty key in key=path format', () => {
        expect(() => parseSourceDirParam('=custom/rules')).toThrow('Invalid source-dir format');
      });

      it('should throw for key= with empty path', () => {
        expect(() => parseSourceDirParam('rules=')).toThrow('Invalid source-dir format');
      });
    });
  });

  describe('parseSourceDirParams', () => {
    it('should parse an empty array', () => {
      const result = parseSourceDirParams([]);
      expect(result).toEqual({});
    });

    it('should parse a single value', () => {
      const result = parseSourceDirParams(['cursor.rules=custom/rules']);
      expect(result).toEqual({ cursor: { rules: 'custom/rules' } });
    });

    it('should merge multiple values for different tools', () => {
      const result = parseSourceDirParams([
        'cursor.rules=custom/cursor-rules',
        'claude.skills=custom/claude-skills',
      ]);
      expect(result).toEqual({
        cursor: { rules: 'custom/cursor-rules' },
        claude: { skills: 'custom/claude-skills' },
      });
    });

    it('should merge multiple values for the same tool', () => {
      const result = parseSourceDirParams([
        'cursor.rules=custom/rules',
        'cursor.commands=custom/commands',
      ]);
      expect(result).toEqual({
        cursor: { rules: 'custom/rules', commands: 'custom/commands' },
      });
    });

    it('should override earlier values for the same tool.subtype', () => {
      const result = parseSourceDirParams([
        'cursor.rules=first/path',
        'cursor.rules=second/path',
      ]);
      expect(result).toEqual({ cursor: { rules: 'second/path' } });
    });

    it('should pass context tool and subtype to each param', () => {
      const result = parseSourceDirParams(['my/rules'], 'cursor', 'rules');
      expect(result).toEqual({ cursor: { rules: 'my/rules' } });
    });
  });
});
