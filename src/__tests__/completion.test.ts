import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs-extra
vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...(actual.default as Record<string, unknown>),
      pathExists: vi.fn(async () => false),
      readFile: vi.fn(async () => ''),
      writeFile: vi.fn(async () => {}),
      appendFile: vi.fn(async () => {}),
      ensureDir: vi.fn(async () => {}),
      existsSync: vi.fn(() => false),
    },
  };
});

// Mock config
vi.mock('../config.js', () => ({
  getConfig: vi.fn(async () => ({})),
  setConfig: vi.fn(async () => {}),
}));

// Mock chalk to passthrough strings
vi.mock('chalk', () => {
  const handler: ProxyHandler<object> = {
    get: () => new Proxy((s: string) => s, handler),
    apply: (_target, _thisArg, args) => args[0],
  };
  return { default: new Proxy({}, handler) };
});

// Mock readline
vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn(() => ({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('y')),
      close: vi.fn(),
    })),
  },
}));

import fs from 'fs-extra';
import { getConfig, setConfig } from '../config.js';
import {
  detectShell,
  getShellConfigPath,
  getCompletionSnippet,
  isCompletionInstalled,
  installCompletionToFile,
  removeCompletionCode,
  checkAndPromptCompletion,
  forceInstallCompletion,
  COMPLETION_START_MARKER,
  COMPLETION_END_MARKER,
} from '../completion.js';

const mockedPathExists = vi.mocked(fs.pathExists);
const mockedReadFile = vi.mocked(fs.readFile);
const mockedWriteFile = vi.mocked(fs.writeFile);
const mockedAppendFile = vi.mocked(fs.appendFile);
const mockedEnsureDir = vi.mocked(fs.ensureDir);
const mockedExistsSync = vi.mocked(fs.existsSync);
const mockedGetConfig = vi.mocked(getConfig);
const mockedSetConfig = vi.mocked(setConfig);

// Save original env/platform
const originalShell = process.env.SHELL;
const originalPlatform = process.platform;
const originalStdinTTY = process.stdin.isTTY;
const originalStdoutTTY = process.stdout.isTTY;
const originalForceInteractive = process.env.AIS_FORCE_INTERACTIVE;

beforeEach(() => {
  vi.resetAllMocks();
  mockedGetConfig.mockResolvedValue({ repos: {} });
  mockedSetConfig.mockResolvedValue(undefined);
});

afterEach(() => {
  // Restore env/platform
  process.env.SHELL = originalShell;
  Object.defineProperty(process, 'platform', { value: originalPlatform });
  process.stdin.isTTY = originalStdinTTY;
  process.stdout.isTTY = originalStdoutTTY;
  if (originalForceInteractive !== undefined) {
    process.env.AIS_FORCE_INTERACTIVE = originalForceInteractive;
  } else {
    delete process.env.AIS_FORCE_INTERACTIVE;
  }
});

// ----- detectShell -----

describe('detectShell', () => {
  it('returns zsh for /bin/zsh', () => {
    process.env.SHELL = '/bin/zsh';
    expect(detectShell()).toBe('zsh');
  });

  it('returns bash for /bin/bash', () => {
    process.env.SHELL = '/bin/bash';
    expect(detectShell()).toBe('bash');
  });

  it('returns fish for /usr/bin/fish', () => {
    process.env.SHELL = '/usr/bin/fish';
    expect(detectShell()).toBe('fish');
  });

  it('returns unknown when SHELL is empty', () => {
    process.env.SHELL = '';
    expect(detectShell()).toBe('unknown');
  });

  it('returns unknown when SHELL is unset', () => {
    delete process.env.SHELL;
    expect(detectShell()).toBe('unknown');
  });

  it('returns unknown for unrecognized shell', () => {
    process.env.SHELL = '/bin/tcsh';
    expect(detectShell()).toBe('unknown');
  });
});

// ----- getShellConfigPath -----

describe('getShellConfigPath', () => {
  it('returns .zshrc for zsh', () => {
    const result = getShellConfigPath('zsh');
    expect(result).toContain('.zshrc');
  });

  it('returns fish config path for fish', () => {
    const result = getShellConfigPath('fish');
    expect(result).toContain('config.fish');
    expect(result).toContain('.config/fish');
  });

  it('returns .bash_profile on macOS when it exists', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockedExistsSync.mockReturnValue(true);

    const result = getShellConfigPath('bash');
    expect(result).toContain('.bash_profile');
  });

  it('returns .bashrc on macOS when .bash_profile does not exist', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockedExistsSync.mockReturnValue(false);

    const result = getShellConfigPath('bash');
    expect(result).toContain('.bashrc');
  });

  it('returns .bashrc on Linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const result = getShellConfigPath('bash');
    expect(result).toContain('.bashrc');
  });

  it('returns null for unknown shell', () => {
    const result = getShellConfigPath('unknown');
    expect(result).toBeNull();
  });
});

// ----- getCompletionSnippet -----

describe('getCompletionSnippet', () => {
  it('returns fish source command for fish shell', () => {
    const snippet = getCompletionSnippet('fish');
    expect(snippet).toContain('ais completion fish | source');
    expect(snippet).toContain(COMPLETION_START_MARKER);
    expect(snippet).toContain(COMPLETION_END_MARKER);
  });

  it('returns eval command for zsh shell', () => {
    const snippet = getCompletionSnippet('zsh');
    expect(snippet).toContain('eval "$(ais completion zsh)"');
  });

  it('returns eval command for bash shell', () => {
    const snippet = getCompletionSnippet('bash');
    expect(snippet).toContain('eval "$(ais completion)"');
  });

  it('includes start and end markers', () => {
    const snippet = getCompletionSnippet('bash');
    expect(snippet).toContain(COMPLETION_START_MARKER);
    expect(snippet).toContain(COMPLETION_END_MARKER);
  });
});

// ----- isCompletionInstalled -----

describe('isCompletionInstalled', () => {
  it('returns false when config file does not exist', async () => {
    mockedPathExists.mockResolvedValue(false as never);

    const result = await isCompletionInstalled('/home/user/.zshrc');
    expect(result).toBe(false);
  });

  it('returns false when config file does not contain marker', async () => {
    mockedPathExists.mockResolvedValue(true as never);
    mockedReadFile.mockResolvedValue('# some other config' as never);

    const result = await isCompletionInstalled('/home/user/.zshrc');
    expect(result).toBe(false);
  });

  it('returns true when config file contains start marker', async () => {
    mockedPathExists.mockResolvedValue(true as never);
    mockedReadFile.mockResolvedValue(
      `some content\n${COMPLETION_START_MARKER}\neval "$(ais completion)"\n${COMPLETION_END_MARKER}\n` as never
    );

    const result = await isCompletionInstalled('/home/user/.zshrc');
    expect(result).toBe(true);
  });
});

// ----- installCompletionToFile -----

describe('installCompletionToFile', () => {
  it('returns failure for unknown shell', async () => {
    const result = await installCompletionToFile('unknown');
    expect(result.success).toBe(false);
    expect(result.configPath).toBeNull();
  });

  it('returns alreadyInstalled when completion exists', async () => {
    process.env.SHELL = '/bin/zsh';
    mockedPathExists.mockResolvedValue(true as never);
    mockedReadFile.mockResolvedValue(COMPLETION_START_MARKER as never);

    const result = await installCompletionToFile('zsh');
    expect(result.success).toBe(true);
    expect(result.alreadyInstalled).toBe(true);
    expect(mockedAppendFile).not.toHaveBeenCalled();
  });

  it('appends snippet when not installed', async () => {
    process.env.SHELL = '/bin/zsh';
    mockedPathExists.mockResolvedValue(false as never);

    const result = await installCompletionToFile('zsh');
    expect(result.success).toBe(true);
    expect(result.alreadyInstalled).toBe(false);
    expect(mockedEnsureDir).toHaveBeenCalled();
    expect(mockedAppendFile).toHaveBeenCalled();
  });
});

// ----- removeCompletionCode -----

describe('removeCompletionCode', () => {
  it('removes completion block from content', () => {
    const content = `before\n${COMPLETION_START_MARKER}\neval "$(ais completion)"\n${COMPLETION_END_MARKER}\nafter`;
    const result = removeCompletionCode(content);
    expect(result).not.toContain(COMPLETION_START_MARKER);
    expect(result).not.toContain(COMPLETION_END_MARKER);
    expect(result).toContain('before');
    expect(result).toContain('after');
  });

  it('returns content unchanged when no block present', () => {
    const content = 'no completion here';
    const result = removeCompletionCode(content);
    expect(result).toBe('no completion here');
  });

  it('collapses triple newlines to double', () => {
    const content = `before\n\n\n${COMPLETION_START_MARKER}\nstuff\n${COMPLETION_END_MARKER}\n\n\nafter`;
    const result = removeCompletionCode(content);
    expect(result).not.toMatch(/\n{3,}/);
  });
});

// ----- checkAndPromptCompletion -----

describe('checkAndPromptCompletion', () => {
  it('returns early when not interactive (no TTY)', async () => {
    process.stdin.isTTY = false;
    process.stdout.isTTY = false;
    delete process.env.AIS_FORCE_INTERACTIVE;

    await checkAndPromptCompletion();

    expect(mockedGetConfig).not.toHaveBeenCalled();
  });

  it('returns early when completionInstalled is true', async () => {
    process.env.AIS_FORCE_INTERACTIVE = 'true';
    mockedGetConfig.mockResolvedValue({ repos: {}, completionInstalled: true });

    await checkAndPromptCompletion();

    expect(mockedSetConfig).not.toHaveBeenCalled();
  });

  it('marks as handled when shell is unknown', async () => {
    process.env.AIS_FORCE_INTERACTIVE = 'true';
    process.env.SHELL = '';
    mockedGetConfig.mockResolvedValue({ repos: {} });

    await checkAndPromptCompletion();

    expect(mockedSetConfig).toHaveBeenCalledWith({ completionInstalled: true });
  });

  it('marks as handled when configPath is null', async () => {
    process.env.AIS_FORCE_INTERACTIVE = 'true';
    // Use an unknown shell to get null configPath
    process.env.SHELL = '';
    mockedGetConfig.mockResolvedValue({ repos: {} });

    await checkAndPromptCompletion();

    expect(mockedSetConfig).toHaveBeenCalledWith({ completionInstalled: true });
  });

  it('marks as handled when completion is already installed in file', async () => {
    process.env.AIS_FORCE_INTERACTIVE = 'true';
    process.env.SHELL = '/bin/zsh';
    mockedGetConfig.mockResolvedValue({ repos: {} });
    mockedPathExists.mockResolvedValue(true as never);
    mockedReadFile.mockResolvedValue(COMPLETION_START_MARKER as never);

    await checkAndPromptCompletion();

    expect(mockedSetConfig).toHaveBeenCalledWith({ completionInstalled: true });
  });
});

// ----- forceInstallCompletion -----

describe('forceInstallCompletion', () => {
  it('logs error and returns when shell is unknown', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.SHELL = '';

    await forceInstallCompletion();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not detect'));
    consoleSpy.mockRestore();
  });

  it('shows already-installed message when not forced', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.SHELL = '/bin/zsh';
    mockedPathExists.mockResolvedValue(true as never);
    mockedReadFile.mockResolvedValue(COMPLETION_START_MARKER as never);

    await forceInstallCompletion(false);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already installed'));
    expect(mockedAppendFile).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('removes existing and reinstalls when force is true', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.SHELL = '/bin/zsh';

    // First call: isCompletionInstalled check (pathExists returns true, readFile returns marker)
    mockedPathExists.mockResolvedValue(true as never);
    mockedReadFile.mockResolvedValue(
      `before\n${COMPLETION_START_MARKER}\nold\n${COMPLETION_END_MARKER}\nafter` as never
    );

    await forceInstallCompletion(true);

    // Should have written the cleaned file
    expect(mockedWriteFile).toHaveBeenCalled();
    // And then appended new snippet (via installCompletionToFile -> but it checks isCompletionInstalled again)
    expect(mockedSetConfig).toHaveBeenCalledWith({ completionInstalled: true });
    consoleSpy.mockRestore();
  });

  it('installs fresh when no existing completion', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.SHELL = '/bin/zsh';
    mockedPathExists.mockResolvedValue(false as never);

    await forceInstallCompletion(false);

    expect(mockedEnsureDir).toHaveBeenCalled();
    expect(mockedAppendFile).toHaveBeenCalled();
    expect(mockedSetConfig).toHaveBeenCalledWith({ completionInstalled: true });
    consoleSpy.mockRestore();
  });
});
