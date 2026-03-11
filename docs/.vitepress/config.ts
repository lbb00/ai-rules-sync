import { defineConfig } from "vitepress";

const toolsSidebar = [
  { text: "Cursor", link: "/tools/cursor" },
  { text: "GitHub Copilot", link: "/tools/copilot" },
  { text: "Claude Code", link: "/tools/claude" },
  { text: "Trae", link: "/tools/trae" },
  { text: "OpenCode", link: "/tools/opencode" },
  { text: "Codex", link: "/tools/codex" },
  { text: "Gemini CLI", link: "/tools/gemini" },
  { text: "Warp", link: "/tools/warp" },
  { text: "Windsurf", link: "/tools/windsurf" },
  { text: "Cline", link: "/tools/cline" },
  { text: "AGENTS.md", link: "/tools/agents-md" },
];

const toolsSidebarZh = [
  { text: "Cursor", link: "/zh/tools/cursor" },
  { text: "GitHub Copilot", link: "/zh/tools/copilot" },
  { text: "Claude Code", link: "/zh/tools/claude" },
  { text: "Trae", link: "/zh/tools/trae" },
  { text: "OpenCode", link: "/zh/tools/opencode" },
  { text: "Codex", link: "/zh/tools/codex" },
  { text: "Gemini CLI", link: "/zh/tools/gemini" },
  { text: "Warp", link: "/zh/tools/warp" },
  { text: "Windsurf", link: "/zh/tools/windsurf" },
  { text: "Cline", link: "/zh/tools/cline" },
  { text: "AGENTS.md", link: "/zh/tools/agents-md" },
];

const guideSidebar = [
  {
    text: "Guide",
    items: [
      { text: "What is AIS?", link: "/guide/what-is-ais" },
      { text: "Getting Started", link: "/guide/getting-started" },
      { text: "Project-Level Sync", link: "/guide/project-level" },
      { text: "User Global-Level Sync", link: "/guide/user-level" },
      { text: "Multiple Repositories", link: "/guide/multiple-repos" },
      { text: "Import Rules", link: "/guide/import-rules" },
      { text: "Monorepo & Custom Dirs", link: "/guide/monorepo" },
      { text: "Core Concepts", link: "/guide/core-concepts" },
      { text: "Advanced Features", link: "/guide/advanced-features" },
    ],
  },
  {
    text: "Tool Guides",
    items: toolsSidebar,
  },
];

const guideSidebarZh = [
  {
    text: "指南",
    items: [
      { text: "什么是 AIS？", link: "/zh/guide/what-is-ais" },
      { text: "快速开始", link: "/zh/guide/getting-started" },
      { text: "项目级别同步", link: "/zh/guide/project-level" },
      { text: "用户全局级别同步", link: "/zh/guide/user-level" },
      { text: "多仓库", link: "/zh/guide/multiple-repos" },
      { text: "导入规则", link: "/zh/guide/import-rules" },
      { text: "Monorepo 与自定义目录", link: "/zh/guide/monorepo" },
      { text: "核心概念", link: "/zh/guide/core-concepts" },
      { text: "高级功能", link: "/zh/guide/advanced-features" },
    ],
  },
  {
    text: "工具指南",
    items: toolsSidebarZh,
  },
];



export default defineConfig({
  title: "AI Rules Sync",
  description:
    "Synchronize, manage, and share your AI agent rules across projects and teams.",
  base: "/ai-rules-sync/",

  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/ai-rules-sync/logo.svg",
      },
    ],
  ],

  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide/getting-started" },
          { text: "API", link: "/reference/cli" },
        ],
        sidebar: {
          "/guide/": guideSidebar,
          "/tools/": guideSidebar,
          "/reference/": [
            {
              text: "API",
              items: [
                { text: "CLI Commands", link: "/reference/cli" },
                {
                  text: "ai-rules-sync.json",
                  link: "/reference/configuration",
                },
              ],
            },
          ],
        },
      },
    },
    zh: {
      label: "中文",
      lang: "zh-CN",
      themeConfig: {
        nav: [
          { text: "指南", link: "/zh/guide/getting-started" },
          { text: "API", link: "/zh/reference/cli" },
        ],
        sidebar: {
          "/zh/guide/": guideSidebarZh,
          "/zh/tools/": guideSidebarZh,
          "/zh/reference/": [
            {
              text: "API",
              items: [
                { text: "CLI 命令", link: "/zh/reference/cli" },
                {
                  text: "ai-rules-sync.json",
                  link: "/zh/reference/configuration",
                },
              ],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: "github", link: "https://github.com/lbb00/ai-rules-sync" },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the Unlicense.",
      copyright: "Copyright © 2024-present",
    },
  },
});
