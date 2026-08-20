#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const START_MARKER = '<!-- SUPPORTED_TOOLS_TABLE:START -->';
const END_MARKER = '<!-- SUPPORTED_TOOLS_TABLE:END -->';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'docs', 'supported-tools.json');

// ----- Feature matrix for READMEs -----

const assetTypes = ['rules', 'skills', 'commands', 'agents', 'AGENTS.md', 'tools', 'prompts', 'instructions'];

// Map typeEn values from supported-tools.json to matrix columns
const typeToColumn = {
  'Rules': 'rules',
  'Skills': 'skills',
  'Commands': 'commands',
  'Subagents': 'agents',
  'Agents': 'agents',
  'CLAUDE.md': 'AGENTS.md',
  'GEMINI.md': 'AGENTS.md',
  'Tools': 'tools',
  'Prompts': 'prompts',
  'Instructions': 'instructions',
  'Workflows': 'commands',
  'CODEBUDDY.md': 'AGENTS.md',
  '**AGENTS.md**': 'AGENTS.md',
  'AGENTS.md': 'AGENTS.md',
  'QWEN.md': 'AGENTS.md',
};

function buildMatrixHeader(lang) {
  const headers = lang === 'en'
    ? ['Tool', ...assetTypes]
    : ['工具', ...assetTypes];
  const header = `| ${headers.join(' | ')} |`;
  const sep = `|${headers.map((_, i) => i === 0 ? ':---' : ':---:').join('|')}|`;
  return [header, sep];
}

function buildMatrixRows(entries, lang) {
  // Group entries by tool
  const toolMap = new Map();
  for (const entry of entries) {
    const toolKey = lang === 'en' ? entry.toolEn : entry.toolZh;
    const col = typeToColumn[entry.typeEn];
    if (!toolMap.has(toolKey)) {
      toolMap.set(toolKey, {});
    }
    if (col) {
      toolMap.get(toolKey)[col] = true;
    }
  }

  const rows = [];
  for (const [tool, types] of toolMap) {
    const cells = [tool, ...assetTypes.map(t => types[t] ? '✅' : '—')];
    rows.push(`| ${cells.join(' | ')} |`);
  }
  return rows;
}

// ----- Directory reference for docs/reference/supported-tools.md -----

const REF_START = '<!-- REF_TABLE:START -->';
const REF_END = '<!-- REF_TABLE:END -->';

function formatPathCell(pathValue) {
  if (pathValue.includes(' (root)')) return `\`${pathValue.replace(' (root)', '')}\` (root)`;
  if (pathValue.includes('（根目录）')) return `\`${pathValue.replace('（根目录）', '')}\`（根目录）`;
  return `\`${pathValue}\``;
}

function formatSuffixCell(suffixValue) {
  if (suffixValue === '-') return '—';
  const parts = suffixValue.split(',').map(p => p.trim()).filter(Boolean);
  return parts.length === 0 ? '—' : parts.map(p => `\`${p}\``).join(', ');
}

function buildRefRows(entries) {
  return entries.map((entry) => {
    const docLabel = entry.docLabelEn;
    return `| ${entry.toolEn} | ${entry.typeEn} | ${entry.mode} | ${formatPathCell(entry.pathEn)} | ${formatSuffixCell(entry.suffix)} | [→](${entry.docUrl}) |`;
  });
}

function updateMarkedBlock(content, replacement, startMarker = START_MARKER, endMarker = END_MARKER) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing or invalid markers: ${startMarker} / ${endMarker}`);
  }

  const before = content.slice(0, startIndex + startMarker.length);
  const after = content.slice(endIndex);
  return `${before}\n${replacement}\n${after}`;
}

async function main() {
  const raw = await readFile(dataPath, 'utf8');
  const entries = JSON.parse(raw);

  // ----- Update README.md (English) -----
  const enMatrix = [
    ...buildMatrixHeader('en'),
    ...buildMatrixRows(entries, 'en')
  ].join('\n');

  const readmeEn = path.join(rootDir, 'README.md');
  const enOriginal = await readFile(readmeEn, 'utf8');
  const enUpdated = updateMarkedBlock(enOriginal, enMatrix);
  if (enUpdated !== enOriginal) {
    await writeFile(readmeEn, enUpdated, 'utf8');
    console.log(`Updated: README.md`);
  } else {
    console.log(`Unchanged: README.md`);
  }

  // ----- Update README_ZH.md (Chinese) -----
  const zhMatrix = [
    ...buildMatrixHeader('zh'),
    ...buildMatrixRows(entries, 'zh')
  ].join('\n');

  const readmeZh = path.join(rootDir, 'README_ZH.md');
  const zhOriginal = await readFile(readmeZh, 'utf8');
  const zhUpdated = updateMarkedBlock(zhOriginal, zhMatrix);
  if (zhUpdated !== zhOriginal) {
    await writeFile(readmeZh, zhUpdated, 'utf8');
    console.log(`Updated: README_ZH.md`);
  } else {
    console.log(`Unchanged: README_ZH.md`);
  }

  // ----- Update docs/reference/supported-tools.md -----
  const refHeader = '| Tool | Type | Mode | Default Source Directory | File Suffixes | Docs |';
  const refSep = '|------|------|------|--------------------------|---------------|------|';
  const refTable = [refHeader, refSep, ...buildRefRows(entries)].join('\n');

  const refPath = path.join(rootDir, 'docs', 'reference', 'supported-tools.md');
  await updateRefFile(refPath, refTable, {
    title: '# Supported Tools — Directory Reference',
    intro: 'Source paths, sync modes, file suffixes, and documentation links for every supported tool and asset type. Command walkthroughs: [Tool Guides](/guide/tool-guides).',
    modes: `## Modes

- **directory** — Links entire directories (skills, agents)
- **file** — Links individual files with automatic suffix resolution
- **hybrid** — Links both files and directories (e.g., Cursor rules)
`,
  });

  // ----- Update docs/zh/reference/supported-tools.md -----
  const refHeaderZh = '| 工具 | 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |';
  const refSepZh = '|------|------|------|------------|----------|------|';
  const refRowsZh = entries.map((entry) => {
    return `| ${entry.toolZh} | ${entry.typeZh} | ${entry.mode} | ${formatPathCell(entry.pathZh)} | ${formatSuffixCell(entry.suffix)} | [→](${entry.docUrl}) |`;
  });
  const refTableZh = [refHeaderZh, refSepZh, ...refRowsZh].join('\n');

  const refPathZh = path.join(rootDir, 'docs', 'zh', 'reference', 'supported-tools.md');
  await updateRefFile(refPathZh, refTableZh, {
    title: '# 支持的工具 — 目录参考',
    intro: '每个已支持工具和资产类型的源路径、同步模式、文件后缀和文档链接。命令说明见[工具指南](/zh/guide/tool-guides)。',
    modes: `## 模式说明

- **directory** — 链接整个目录（skills、agents）
- **file** — 链接单个文件，自动解析后缀
- **hybrid** — 同时支持文件和目录（例如 Cursor rules）
`,
  });
}

async function updateRefFile(refPath, refTable, { title, intro, modes }) {
  let refOriginal;
  try {
    refOriginal = await readFile(refPath, 'utf8');
  } catch {
    const content = `${title}\n\n${intro}\n\n${REF_START}\n${refTable}\n${REF_END}\n\n${modes}`;
    await writeFile(refPath, content, 'utf8');
    console.log(`Created: ${path.relative(rootDir, refPath)}`);
    return;
  }

  if (refOriginal.includes(REF_START) && refOriginal.includes(REF_END)) {
    const refUpdated = updateMarkedBlock(refOriginal, refTable, REF_START, REF_END);
    if (refUpdated !== refOriginal) {
      await writeFile(refPath, refUpdated, 'utf8');
      console.log(`Updated: ${path.relative(rootDir, refPath)}`);
    } else {
      console.log(`Unchanged: ${path.relative(rootDir, refPath)}`);
    }
  } else {
    const content = `${title}\n\n${intro}\n\n${REF_START}\n${refTable}\n${REF_END}\n\n${modes}`;
    await writeFile(refPath, content, 'utf8');
    console.log(`Rewrote: ${path.relative(rootDir, refPath)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});