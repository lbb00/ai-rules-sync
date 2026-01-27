import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { linkEntry } from '../src/sync-engine.js';
import { cursorRulesAdapter } from '../src/adapters/cursor-rules.js';
import { createMultiSuffixResolver, createSuffixAwareTargetResolver } from '../src/adapters/base.js';
import * as projectConfigModule from '../src/project-config.js';
import * as utilsModule from '../src/utils.js';

vi.mock('fs-extra');
vi.mock('../src/project-config.js');
vi.mock('../src/utils.js');

describe('Cursor Rules Hybrid Mode', () => {
    const mockProjectPath = '/mock/project';
    const mockRepoPath = '/mock/repos/test-repo';
    const mockRepo = {
        name: 'test-repo',
        url: 'http://test.git',
        path: mockRepoPath
    };
    const sourceDir = '.cursor/rules';

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
        vi.mocked(fs.ensureSymlink).mockResolvedValue(undefined);
        vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => true } as any);
        vi.mocked(fs.remove).mockResolvedValue(undefined);
        vi.mocked(utilsModule.addIgnoreEntry).mockResolvedValue(true);
        vi.mocked(projectConfigModule.getRepoSourceConfig).mockResolvedValue({});
        vi.mocked(projectConfigModule.getSourceDir).mockReturnValue(sourceDir);
    });

    describe('resolveSource - createMultiSuffixResolver', () => {
        const resolver = createMultiSuffixResolver(['.mdc', '.md'], 'Rule');

        it('should link directory when source is a directory', async () => {
            const dirPath = path.join(mockRepoPath, sourceDir, 'my-rule-dir');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                return p === dirPath;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === dirPath) {
                    return { isDirectory: () => true } as any;
                }
                throw new Error('Not found');
            });

            const result = await resolver(mockRepoPath, sourceDir, 'my-rule-dir');

            expect(result.sourceName).toBe('my-rule-dir');
            expect(result.sourcePath).toBe(dirPath);
            expect(result.suffix).toBeUndefined();
        });

        it('should link .mdc file when source has .mdc suffix', async () => {
            const filePath = path.join(mockRepoPath, sourceDir, 'coding-standards.mdc');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                return p === filePath;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === filePath) {
                    return { isDirectory: () => false } as any;
                }
                throw new Error('Not found');
            });

            const result = await resolver(mockRepoPath, sourceDir, 'coding-standards.mdc');

            expect(result.sourceName).toBe('coding-standards.mdc');
            expect(result.sourcePath).toBe(filePath);
            expect(result.suffix).toBe('.mdc');
        });

        it('should link .md file when source has .md suffix', async () => {
            const filePath = path.join(mockRepoPath, sourceDir, 'readme.md');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                return p === filePath;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === filePath) {
                    return { isDirectory: () => false } as any;
                }
                throw new Error('Not found');
            });

            const result = await resolver(mockRepoPath, sourceDir, 'readme.md');

            expect(result.sourceName).toBe('readme.md');
            expect(result.sourcePath).toBe(filePath);
            expect(result.suffix).toBe('.md');
        });

        it('should prefer .mdc over .md when no suffix given', async () => {
            const mdcPath = path.join(mockRepoPath, sourceDir, 'coding-standards.mdc');
            const mdPath = path.join(mockRepoPath, sourceDir, 'coding-standards.md');
            const basePath = path.join(mockRepoPath, sourceDir, 'coding-standards');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                // Base name doesn't exist, but .mdc does
                return p === mdcPath;
            });

            const result = await resolver(mockRepoPath, sourceDir, 'coding-standards');

            expect(result.sourceName).toBe('coding-standards.mdc');
            expect(result.sourcePath).toBe(mdcPath);
            expect(result.suffix).toBe('.mdc');
        });

        it('should fall back to .md when .mdc not found', async () => {
            const mdcPath = path.join(mockRepoPath, sourceDir, 'coding-standards.mdc');
            const mdPath = path.join(mockRepoPath, sourceDir, 'coding-standards.md');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                // Only .md exists
                return p === mdPath;
            });

            const result = await resolver(mockRepoPath, sourceDir, 'coding-standards');

            expect(result.sourceName).toBe('coding-standards.md');
            expect(result.sourcePath).toBe(mdPath);
            expect(result.suffix).toBe('.md');
        });

        it('should prefer exact directory match over file with suffix', async () => {
            const dirPath = path.join(mockRepoPath, sourceDir, 'my-rule');
            const mdcPath = path.join(mockRepoPath, sourceDir, 'my-rule.mdc');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                // Both directory and .mdc file exist
                return p === dirPath || p === mdcPath;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === dirPath) {
                    return { isDirectory: () => true } as any;
                }
                throw new Error('Not found');
            });

            const result = await resolver(mockRepoPath, sourceDir, 'my-rule');

            // Should prefer directory
            expect(result.sourceName).toBe('my-rule');
            expect(result.sourcePath).toBe(dirPath);
            expect(result.suffix).toBeUndefined();
        });

        it('should throw error when rule not found', async () => {
            vi.mocked(fs.pathExists).mockResolvedValue(false);

            await expect(resolver(mockRepoPath, sourceDir, 'nonexistent'))
                .rejects.toThrow('Rule "nonexistent" not found in repository.');
        });
    });

    describe('resolveTargetName - createSuffixAwareTargetResolver', () => {
        const resolver = createSuffixAwareTargetResolver(['.mdc', '.md']);

        it('should use alias when provided', () => {
            expect(resolver('original', 'my-alias')).toBe('my-alias');
        });

        it('should use name when no alias', () => {
            expect(resolver('my-rule')).toBe('my-rule');
        });

        it('should add suffix to alias when source has suffix', () => {
            expect(resolver('coding-standards.mdc', 'standards', '.mdc')).toBe('standards.mdc');
        });

        it('should not duplicate suffix if alias already has it', () => {
            expect(resolver('coding-standards.mdc', 'standards.mdc', '.mdc')).toBe('standards.mdc');
        });

        it('should not add suffix when source has no suffix (directory)', () => {
            expect(resolver('my-rule-dir', 'my-alias', undefined)).toBe('my-alias');
        });
    });

    describe('Full integration - linkEntry with cursor-rules adapter', () => {
        it('should link directory correctly', async () => {
            const dirPath = path.join(mockRepoPath, sourceDir, 'my-rule-dir');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p === dirPath) return true;
                // Target path check
                if (typeof p === 'string' && p.includes(mockProjectPath)) return false;
                return false;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === dirPath) {
                    return { isDirectory: () => true } as any;
                }
                throw new Error('Not found');
            });

            const result = await linkEntry(cursorRulesAdapter, {
                projectPath: mockProjectPath,
                name: 'my-rule-dir',
                repo: mockRepo
            });

            expect(result.sourceName).toBe('my-rule-dir');
            expect(result.targetName).toBe('my-rule-dir');
            expect(result.linked).toBe(true);

            const expectedTargetPath = path.join(path.resolve(mockProjectPath), '.cursor', 'rules', 'my-rule-dir');
            expect(fs.ensureSymlink).toHaveBeenCalledWith(dirPath, expectedTargetPath);
        });

        it('should link .mdc file correctly', async () => {
            const filePath = path.join(mockRepoPath, sourceDir, 'coding.mdc');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p === filePath) return true;
                if (typeof p === 'string' && p.includes(mockProjectPath)) return false;
                return false;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === filePath) {
                    return { isDirectory: () => false } as any;
                }
                throw new Error('Not found');
            });

            const result = await linkEntry(cursorRulesAdapter, {
                projectPath: mockProjectPath,
                name: 'coding.mdc',
                repo: mockRepo
            });

            expect(result.sourceName).toBe('coding.mdc');
            expect(result.targetName).toBe('coding.mdc');
            expect(result.linked).toBe(true);
        });

        it('should resolve name without suffix to .mdc file', async () => {
            const mdcPath = path.join(mockRepoPath, sourceDir, 'coding.mdc');
            const basePath = path.join(mockRepoPath, sourceDir, 'coding');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p === mdcPath) return true;
                if (typeof p === 'string' && p.includes(mockProjectPath)) return false;
                return false;
            });

            const result = await linkEntry(cursorRulesAdapter, {
                projectPath: mockProjectPath,
                name: 'coding',
                repo: mockRepo
            });

            expect(result.sourceName).toBe('coding.mdc');
            expect(result.targetName).toBe('coding.mdc');

            const expectedTargetPath = path.join(path.resolve(mockProjectPath), '.cursor', 'rules', 'coding.mdc');
            expect(fs.ensureSymlink).toHaveBeenCalledWith(mdcPath, expectedTargetPath);
        });

        it('should use alias with suffix propagation', async () => {
            const filePath = path.join(mockRepoPath, sourceDir, 'coding.mdc');

            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p === filePath) return true;
                if (typeof p === 'string' && p.includes(mockProjectPath)) return false;
                return false;
            });
            vi.mocked(fs.stat).mockImplementation(async (p) => {
                if (p === filePath) {
                    return { isDirectory: () => false } as any;
                }
                throw new Error('Not found');
            });

            const result = await linkEntry(cursorRulesAdapter, {
                projectPath: mockProjectPath,
                name: 'coding.mdc',
                repo: mockRepo,
                alias: 'my-coding-rules'
            });

            expect(result.sourceName).toBe('coding.mdc');
            // Alias should get .mdc suffix added
            expect(result.targetName).toBe('my-coding-rules.mdc');
        });
    });
});
