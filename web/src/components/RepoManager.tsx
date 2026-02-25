import { useEffect, useState } from 'react';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AdapterCount {
  tool: string;
  subtype: string;
  count: number;
  sourceDir: string;
}

interface Repo {
  name: string;
  url: string;
  path: string;
  current: boolean;
  adapters: AdapterCount[];
}

interface Props {
  onRefresh: () => void;
}

export default function RepoManager({ onRefresh }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/repos/rules')
      .then((r) => r.json())
      .then((data) => setRepos(data.repos || []))
      .catch(() => setError('Failed to load repositories'))
      .finally(() => setLoading(false));
  }, []);

  const handleSwitch = async (name: string) => {
    setSwitching(name);
    try {
      const res = await fetch('/api/repos/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Switch failed');
      setRepos((prev) => prev.map((r) => ({ ...r, current: r.name === name })));
      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSwitching(null);
    }
  };

  const handleInstallAll = async () => {
    setInstalling(true);
    try {
      const res = await fetch('/api/operations/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Install failed');
      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setInstalling(false);
    }
  };

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) return <div className="text-[hsl(var(--muted-foreground))] text-sm">Loading repositories...</div>;
  if (error) return <div className="text-[hsl(var(--destructive))] text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-[hsl(var(--foreground))]">Repositories</h2>
        <Button onClick={handleInstallAll} disabled={installing} size="sm">
          {installing ? 'Installing…' : 'Install All'}
        </Button>
      </div>

      {repos.length === 0 ? (
        <div className="text-[hsl(var(--muted-foreground))] text-sm">No repositories configured.</div>
      ) : (
        <div className="space-y-2">
          {repos.map((repo) => {
            const isExpanded = expanded.has(repo.name);
            const totalCount = repo.adapters.reduce((s, a) => s + a.count, 0);
            // Group adapters by tool
            const byTool: Record<string, AdapterCount[]> = {};
            for (const a of repo.adapters) {
              if (!byTool[a.tool]) byTool[a.tool] = [];
              byTool[a.tool].push(a);
            }

            return (
              <div
                key={repo.name}
                className={`rounded-lg border transition-colors ${
                  repo.current
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center gap-2 p-4">
                  <button
                    onClick={() => toggleExpand(repo.name)}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] shrink-0"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <span className="font-medium text-[hsl(var(--foreground))]">{repo.name}</span>

                  {repo.current && <Badge variant="secondary">current</Badge>}

                  <span className="text-sm text-[hsl(var(--muted-foreground))] font-mono truncate flex-1 min-w-0">
                    {repo.url}
                  </span>

                  {totalCount > 0 && (
                    <Badge variant="outline" className="shrink-0">
                      {totalCount}
                    </Badge>
                  )}

                  {!repo.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitch(repo.name)}
                      disabled={switching === repo.name}
                      className="shrink-0"
                    >
                      {switching === repo.name ? 'Switching…' : 'Switch'}
                    </Button>
                  )}
                </div>

                {/* Expanded adapter details */}
                {isExpanded && repo.adapters.length > 0 && (
                  <div className="px-4 pb-4 pt-0 border-t border-[hsl(var(--border))]">
                    <div className="mt-3 space-y-2">
                      {Object.entries(byTool).map(([tool, adapters]) => (
                        <div key={tool}>
                          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">
                            {tool}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {adapters.map((a) => (
                              <span
                                key={`${a.tool}-${a.subtype}`}
                                className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-2 py-0.5 text-xs text-[hsl(var(--foreground))]"
                              >
                                {a.subtype}
                                <span className="font-semibold text-[hsl(var(--primary))]">{a.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && repo.adapters.length === 0 && (
                  <div className="px-4 pb-4 pt-0 border-t border-[hsl(var(--border))]">
                    <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">No rule files found.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
