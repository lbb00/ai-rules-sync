import { useEffect, useState } from 'react';
import { Button } from './ui/button.tsx';
import { Label } from './ui/label.tsx';
import { Input } from './ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx';

interface AvailableRule {
  tool: string;
  subtype: string;
  name: string;
}

interface Props {
  onAdded: () => void;
}

export default function AddRulePanel({ onAdded }: Props) {
  const [available, setAvailable] = useState<AvailableRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTool, setSelectedTool] = useState('');
  const [selectedSubtype, setSelectedSubtype] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [alias, setAlias] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/rules/available')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setAvailable(data.available || []);
        }
      })
      .catch(() => setError('Failed to load available rules'))
      .finally(() => setLoading(false));
  }, []);

  const tools = [...new Set(available.map((r) => r.tool))].sort();
  const subtypes = [...new Set(available.filter((r) => r.tool === selectedTool).map((r) => r.subtype))].sort();
  const names = available.filter((r) => r.tool === selectedTool && r.subtype === selectedSubtype).map((r) => r.name).sort();

  const handleToolChange = (t: string) => {
    setSelectedTool(t);
    setSelectedSubtype('');
    setSelectedName('');
  };

  const handleSubtypeChange = (s: string) => {
    setSelectedSubtype(s);
    setSelectedName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool || !selectedSubtype || !selectedName) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/operations/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedTool,
          subtype: selectedSubtype,
          name: selectedName,
          alias: alias.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Add failed');
      onAdded();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-[hsl(var(--muted-foreground))] text-sm">Loading available rules...</div>;
  if (error) return <div className="text-[hsl(var(--destructive))] text-sm">{error}</div>;

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">Add Rule</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tool</Label>
          <Select value={selectedTool} onValueChange={handleToolChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select tool…" />
            </SelectTrigger>
            <SelectContent>
              {tools.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTool && (
          <div className="space-y-1.5">
            <Label>Subtype</Label>
            <Select value={selectedSubtype} onValueChange={handleSubtypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select subtype…" />
              </SelectTrigger>
              <SelectContent>
                {subtypes.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedSubtype && (
          <div className="space-y-1.5">
            <Label>Rule</Label>
            <Select value={selectedName} onValueChange={setSelectedName}>
              <SelectTrigger>
                <SelectValue placeholder="Select rule…" />
              </SelectTrigger>
              <SelectContent>
                {names.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedName && (
          <div className="space-y-1.5">
            <Label>
              Alias <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
            </Label>
            <Input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={selectedName}
            />
          </div>
        )}

        <Button type="submit" disabled={!selectedName || submitting}>
          {submitting ? 'Adding…' : 'Add Rule'}
        </Button>
      </form>
    </div>
  );
}
