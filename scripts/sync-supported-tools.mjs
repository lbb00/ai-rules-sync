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

const targets = [
  {
    filePath: path.join(rootDir, 'README.md'),
    lang: 'en',
    header: '| Tool | Type | Mode | Default Source Directory | File Suffixes | Documentation |',
    separator: '|------|------|------|--------------------------|---------------|---------------|'
  },
  {
    filePath: path.join(rootDir, 'README_ZH.md'),
    lang: 'zh',
    header: '| 工具 | 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |',
    separator: '|------|------|------|------------|----------|------|'
  }
];

function formatPathCell(pathValue) {
  if (pathValue.includes(' (root)')) {
    return `\`${pathValue.replace(' (root)', '')}\` (root)`;
  }
  if (pathValue.includes('（根目录）')) {
    return `\`${pathValue.replace('（根目录）', '')}\`（根目录）`;
  }
  return `\`${pathValue}\``;
}

function formatSuffixCell(suffixValue) {
  if (suffixValue === '-') {
    return '-';
  }
  const parts = suffixValue.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return '-';
  }
  return parts.map(part => `\`${part}\``).join(', ');
}

function formatDocumentationCell(entry, lang) {
  const label = lang === 'en' ? entry.docLabelEn : entry.docLabelZh;
  const note = lang === 'en' ? entry.noteEn : entry.noteZh;
  let cell = `[${label}](${entry.docUrl})`;
  if (note) {
    cell += ` — ${note}`;
  }
  return cell;
}

function buildTableRows(entries, lang) {
  return entries.map((entry) => {
    const tool = lang === 'en' ? entry.toolEn : entry.toolZh;
    const type = lang === 'en' ? entry.typeEn : entry.typeZh;
    const pathValue = lang === 'en' ? entry.pathEn : entry.pathZh;
    return `| ${tool} | ${type} | ${entry.mode} | ${formatPathCell(pathValue)} | ${formatSuffixCell(entry.suffix)} | ${formatDocumentationCell(entry, lang)} |`;
  });
}

function updateMarkedBlock(content, replacement) {
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing or invalid markers: ${START_MARKER} / ${END_MARKER}`);
  }

  const before = content.slice(0, startIndex + START_MARKER.length);
  const after = content.slice(endIndex);
  return `${before}\n${replacement}\n${after}`;
}

async function main() {
  const raw = await readFile(dataPath, 'utf8');
  const entries = JSON.parse(raw);

  for (const target of targets) {
    const tableLines = [
      target.header,
      target.separator,
      ...buildTableRows(entries, target.lang)
    ].join('\n');

    const original = await readFile(target.filePath, 'utf8');
    const updated = updateMarkedBlock(original, tableLines);
    if (updated !== original) {
      await writeFile(target.filePath, updated, 'utf8');
      console.log(`Updated: ${path.relative(rootDir, target.filePath)}`);
    } else {
      console.log(`Unchanged: ${path.relative(rootDir, target.filePath)}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
