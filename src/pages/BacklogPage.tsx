import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Download, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react';
import { exportToCSV } from '@/utils/exportCSV';
import { useFeatures } from '@/hooks/useFeatures';
import {
  pillarColor, PRD_STATUS_CONFIG,
  PILLARS, PRODUCT_COMPONENTS, RELEASES,
  type Pillar, type ProductComponent, type Feature,
} from '@/data/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type GroupBy = 'pillar' | 'productComponent' | 'release' | 'pmOwner' | 'engTeam';

const STATUS_COLOR = '#f43f5e';

function FeatureDetail({ f, onClose }: { f: Feature; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      <div
        className="fixed top-0 right-0 bottom-0 w-[500px] z-50 border-l border-black/[0.08] overflow-y-auto animate-slide-in-right shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)' }}
      >
        <div className="h-[3px] w-full shrink-0" style={{ background: pillarColor(f.pillar as Pillar) }} />
        <div
          className="flex items-start justify-between p-5 border-b border-black/[0.08] sticky top-0 backdrop-blur"
          style={{ background: 'rgba(255,255,255,0.96)' }}
        >
          <div>
            <a
              href={`https://jira-dc.paloaltonetworks.com/browse/${f.jiraKey}`}
              target="_blank"
              className="text-[11px] font-bold text-primary hover:underline"
            >
              {f.jiraKey}
            </a>
            <h2 className="text-base font-black text-foreground mt-1 leading-snug">{f.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-7 w-7">
            <X size={14} />
          </Button>
        </div>
        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="deferred">Deferred</Badge>
            {f.releases.map(r => <Badge key={r} variant="blue">v{r}</Badge>)}
            {f.atRisk && <Badge variant="danger"><AlertTriangle size={9} />At Risk</Badge>}
          </div>
          {f.atRisk && f.riskReason && (
            <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-3 text-xs text-brand-red">
              <strong>Risk:</strong> {f.riskReason}
            </div>
          )}
          <div className="glass-strong rounded-xl p-5 flex flex-col gap-5">
            {[
              { label: 'Summary', content: f.summary },
              { label: 'Customer Problem', content: f.customerProblem },
            ].map(({ label, content }) => (
              <div key={label}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
              </div>
            ))}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Business Value</div>
              <div className="rounded-lg bg-brand-green/5 border border-brand-green/15 p-3 text-xs text-muted-foreground leading-relaxed">
                {f.businessValue}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Use Case</div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">{f.useCase}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ownership</div>
                <div className="flex flex-col gap-1.5 text-xs">
                  {[['PM', f.pmOwner], ['Eng', f.engOwner], ['Team', f.engTeam]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Details</div>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Component</span>
                    <span className="font-semibold" style={{ color: pillarColor(f.pillar as Pillar) }}>{f.productComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effort</span>
                    <Badge variant="muted">{f.effort}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="font-bold text-foreground">P{f.priority}</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Customers ({f.customers.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {f.customers.map(c => <Badge key={c} variant="muted">{c}</Badge>)}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-black/[0.08]">
            <Button variant="outline" size="sm" asChild>
              <a href={`https://jira-dc.paloaltonetworks.com/browse/${f.jiraKey}`} target="_blank">
                <ExternalLink size={12} />Open in Jira
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function BacklogPage() {
  const { features, loading, error } = useFeatures();
  const [search, setSearch] = useState('');
  const [filterRelease, setFilterRelease] = useState('');
  const [filterPillar, setFilterPillar] = useState('');
  const [filterPM, setFilterPM] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterRisk, setFilterRisk] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('pillar');
  const [selected, setSelected] = useState<Feature | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-brand-red">Error loading features: {error}</div>;

  const ALL_CUSTOMERS = [...new Set(features.flatMap(f => f.customers))].sort();
  const pool = features.filter(f => f.status === 'deferred');

  const filtered = pool.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        f.title.toLowerCase().includes(q) ||
        f.jiraKey.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.customers.some(c => c.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterRelease && !f.releases.includes(filterRelease)) return false;
    if (filterPillar && f.pillar !== filterPillar) return false;
    if (filterPM && f.pmOwner !== filterPM) return false;
    if (filterComponent && f.productComponent !== filterComponent) return false;
    if (filterCustomer && !f.customers.includes(filterCustomer)) return false;
    if (filterRisk && !f.atRisk) return false;
    return true;
  });

  const hasFilters = !!(search || filterRelease || filterPillar || filterPM || filterComponent || filterCustomer || filterRisk);

  const groups: [string, Feature[]][] =
    groupBy === 'pillar'
      ? (PILLARS as Pillar[]).map(p => [p, filtered.filter(f => f.pillar === p)]).filter(([, i]) => (i as Feature[]).length > 0) as [string, Feature[]][]
      : groupBy === 'release'
      ? RELEASES.map(r => [`Release ${r}`, filtered.filter(f => f.releases.includes(r))]).filter(([, i]) => (i as Feature[]).length > 0) as [string, Feature[]][]
      : groupBy === 'pmOwner'
      ? [...new Set(filtered.map(f => f.pmOwner))].sort().map(o => [o, filtered.filter(f => f.pmOwner === o)]) as [string, Feature[]][]
      : groupBy === 'engTeam'
      ? [...new Set(filtered.map(f => f.engTeam))].sort().map(t => [t, filtered.filter(f => f.engTeam === t)]) as [string, Feature[]][]
      : (PRODUCT_COMPONENTS as ProductComponent[]).map(a => [a, filtered.filter(f => f.productComponent === a)]).filter(([, i]) => (i as Feature[]).length > 0) as [string, Feature[]][];

  return (
    <div className={cn('animate-fade-in')}>
      {selected && <FeatureDetail f={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-start justify-between mb-3">
        <h1 className="text-2xl font-black tracking-tight">Backlog</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportToCSV(filtered, 'backlog')}>
          <Download size={11} />Export
        </Button>
      </div>

      {/* Filter strip */}
      <div className="flex flex-wrap gap-2 items-center mb-7 pb-4 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            ref={searchRef}
            className="pl-7 w-52"
            placeholder="Search backlog… (/ to focus)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterRelease} onValueChange={setFilterRelease}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Release" /></SelectTrigger>
          <SelectContent>
            {RELEASES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPillar} onValueChange={setFilterPillar}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Pillar" /></SelectTrigger>
          <SelectContent>
            {PILLARS.map(p => <SelectItem key={p} value={p}>{p.split('&')[0].trim()}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPM} onValueChange={setFilterPM}>
          <SelectTrigger className="w-32"><SelectValue placeholder="PM Owner" /></SelectTrigger>
          <SelectContent>
            {[...new Set(features.map(f => f.pmOwner))].sort().map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterComponent} onValueChange={setFilterComponent}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Component" /></SelectTrigger>
          <SelectContent>
            {[...new Set(pool.map(f => f.productComponent))].filter(Boolean).sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Customer" /></SelectTrigger>
          <SelectContent>
            {ALL_CUSTOMERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant={filterRisk ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setFilterRisk(v => !v)}
          className="gap-1.5"
        >
          <AlertTriangle size={11} />At Risk
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setFilterRelease('');
              setFilterPillar('');
              setFilterPM('');
              setFilterComponent('');
              setFilterCustomer('');
              setFilterRisk(false);
            }}
          >
            <X size={11} />Clear
          </Button>
        )}

        <div className="w-px h-5 bg-border shrink-0 mx-1" />
        <div className="ml-auto flex items-center gap-2">
          <SlidersHorizontal size={12} className="text-muted-foreground" />
          <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Group by" /></SelectTrigger>
            <SelectContent>
              {[
                ['pillar', 'Pillar'],
                ['productComponent', 'Product Component'],
                ['release', 'Release'],
                ['pmOwner', 'PM Owner'],
                ['engTeam', 'Eng Team'],
              ].map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Feature groups */}
      {groups.map(([groupName, items]) => (
        <div key={groupName} className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{groupName}</span>
            <div className="editorial-divider flex-1" />
            <Badge variant="muted">{(items as Feature[]).length}</Badge>
          </div>
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.07]" style={{ background: 'rgba(0,0,0,0.02)' }}>
                    {['Key', 'Feature', 'PRD', 'Release', 'Component', 'PM', 'Customers', 'Priority', 'Size'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(items as Feature[]).map((f, i) => (
                    <tr
                      key={f.id}
                      onClick={() => setSelected(f)}
                      className="cursor-pointer hover:bg-black/[0.025] transition-colors"
                      style={i > 0 ? { borderTop: '1px solid rgba(0,0,0,0.05)' } : undefined}
                    >
                      <td className="px-4 py-3">
                        <a
                          href={`https://jira-dc.paloaltonetworks.com/browse/${f.jiraKey}`}
                          target="_blank"
                          onClick={e => e.stopPropagation()}
                          className="text-primary font-bold hover:underline"
                        >
                          {f.jiraKey}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: STATUS_COLOR, boxShadow: `0 0 6px ${STATUS_COLOR}60` }}
                          />
                          <span className="font-semibold text-foreground truncate">{f.title}</span>
                          {f.atRisk && <AlertTriangle size={10} className="text-brand-red shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const cfg = PRD_STATUS_CONFIG[f.prdStatus];
                          return (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.releases.join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: pillarColor(f.pillar as Pillar) }}>
                          {f.productComponent}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.pmOwner}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {f.customers.slice(0, 2).map(c => (
                            <Badge key={c} variant="muted" className="text-[9px]">{c}</Badge>
                          ))}
                          {f.customers.length > 2 && (
                            <Badge variant="muted" className="text-[9px]">+{f.customers.length - 2}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">P{f.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{f.effort}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(items as Feature[]).length === 0 && (
                <div className="py-10 text-center text-muted-foreground text-sm">No features match filters</div>
              )}
            </div>
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">No deferred features match the current filters</div>
      )}
    </div>
  );
}
