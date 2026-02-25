import { useEffect, useState } from 'react';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.tsx';
import { Copy } from 'lucide-react';

interface Rule {
  tool: string;
  subtype: string;
  alias: string;
  sourceName: string;
  repoUrl: string;
  targetPath: string;
  sourceFilePath: string;
  status: 'linked' | 'broken' | 'missing';
}

interface Props {
  onRefresh: () => void;
}

export default function RulesList({ onRefresh }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rules')
      .then((r) => r.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => setError('Failed to load rules'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (rule: Rule) => {
    const key = `${rule.tool}/${rule.subtype}/${rule.alias}`;
    setRemoving(key);
    try {
      const res = await fetch('/api/operations/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: rule.tool, subtype: rule.subtype, alias: rule.alias }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Remove failed');
      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRemoving(null);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const statusBadge = (status: Rule['status']) => {
    const variant = status === 'linked' ? 'success' : status === 'broken' ? 'warning' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) return <div className="text-[hsl(var(--muted-foreground))] text-sm">Loading rules...</div>;
  if (error) return <div className="text-[hsl(var(--destructive))] text-sm">{error}</div>;
  if (rules.length === 0)
    return <div className="text-[hsl(var(--muted-foreground))] text-sm">No rules configured in this project.</div>;

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tool</TableHead>
            <TableHead>Subtype</TableHead>
            <TableHead>Alias</TableHead>
            <TableHead>Source Name</TableHead>
            <TableHead>Source File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const key = `${rule.tool}/${rule.subtype}/${rule.alias}`;
            const shortPath = rule.sourceFilePath
              ? '…' + rule.sourceFilePath.slice(Math.max(0, rule.sourceFilePath.length - 40))
              : '—';
            return (
              <TableRow key={key}>
                <TableCell className="font-mono text-sm">{rule.tool}</TableCell>
                <TableCell className="font-mono text-sm text-[hsl(var(--muted-foreground))]">{rule.subtype}</TableCell>
                <TableCell className="font-medium text-sm">{rule.alias}</TableCell>
                <TableCell className="font-mono text-sm text-[hsl(var(--muted-foreground))] truncate max-w-[160px]" title={rule.sourceName}>
                  {rule.sourceName}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {rule.sourceFilePath ? (
                    <div className="flex items-center gap-1">
                      <span
                        className="font-mono text-xs text-[hsl(var(--muted-foreground))] truncate"
                        title={rule.sourceFilePath}
                      >
                        {shortPath}
                      </span>
                      <button
                        onClick={() => handleCopy(rule.sourceFilePath, key)}
                        className="shrink-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                        title="Copy path"
                      >
                        <Copy className={`h-3.5 w-3.5 ${copied === key ? 'text-green-500' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[hsl(var(--muted-foreground))] text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>{statusBadge(rule.status)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(rule)}
                    disabled={removing === key}
                    className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  >
                    {removing === key ? 'Removing…' : 'Remove'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
