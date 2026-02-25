import { useEffect, useState } from 'react';
import RulesList from './components/RulesList.tsx';
import RepoManager from './components/RepoManager.tsx';
import AddRulePanel from './components/AddRulePanel.tsx';
import { Button } from './components/ui/button.tsx';
import { Moon, Sun } from 'lucide-react';

type Tab = 'rules' | 'repos' | 'add';

const TAB_LABELS: Record<Tab, string> = {
  rules: 'Rules',
  repos: 'Repositories',
  add: 'Add Rule',
};

function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  return [dark, setDark] as const;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('rules');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dark, setDark] = useDarkMode();

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">AI Rules Sync Dashboard</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      <nav className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-6">
        <div className="flex gap-0">
          {(['rules', 'repos', 'add'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--foreground))]'
                  : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </nav>

      <main className="px-6 py-6">
        {tab === 'rules' && <RulesList key={refreshKey} onRefresh={refresh} />}
        {tab === 'repos' && <RepoManager key={refreshKey} onRefresh={refresh} />}
        {tab === 'add' && <AddRulePanel onAdded={() => { refresh(); setTab('rules'); }} />}
      </main>
    </div>
  );
}
