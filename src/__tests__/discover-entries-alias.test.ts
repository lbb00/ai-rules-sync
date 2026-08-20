import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { discoverEntriesForAdapter } from '../commands/add-all.js';
import { claudeSkillsAdapter } from '../adapters/claude-skills.js';

describe('discoverEntriesForAdapter alias handling', () => {
  it('does not re-offer a repo entry that is already configured under an alias', async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-discover-repo-'));
    await fs.ensureDir(path.join(repoPath, claudeSkillsAdapter.defaultSourceDir, 'fix'));
    await fs.writeFile(path.join(repoPath, claudeSkillsAdapter.defaultSourceDir, 'fix', 'SKILL.md'), '# fix');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-discover-project-'));
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      claude: {
        skills: {
          'quick-fix': { url: 'https://example.com/repo.git', rule: 'fix' }
        }
      }
    });

    const entries = await discoverEntriesForAdapter(
      claudeSkillsAdapter,
      { name: 'test-repo', url: 'https://example.com/repo.git', path: repoPath },
      projectPath
    );

    const fixEntry = entries.find(e => e.entryName === 'fix');
    expect(fixEntry).toBeDefined();
    expect(fixEntry!.alreadyInConfig).toBe(true);
  });
});
