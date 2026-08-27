import { useState } from 'react';
import { AlertTriangle, Download, ExternalLink, X } from 'lucide-react';
import { useFeatures } from '@/hooks/useFeatures';
import { STATUS_LABELS, pillarColor, PILLARS, RELEASE_NOTES_URLS, type Feature, type Pillar } from '@/data/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { exportToCSV } from '@/utils/exportCSV';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  concept: '#5A5F68', committed: '#1A4A8C', ec: '#0A6578', indev: '#5A3A8C',
  validation: '#8A5400', delivered: '#1A5C35', deferred: '#8C1A1A',
};

// ── Release notes widget ─────────────────────────────────────────────────────

function ReleaseNotesWidget({ pool, filterRelease }: { pool: Feature[]; filterRelease: string }) {
  const releasesWithNotes = [...new Set(pool.flatMap(f => f.releases))]
    .sort()
    .filter(r => RELEASE_NOTES_URLS[r]);

  if (releasesWithNotes.length === 0) return null;

  const entries = filterRelease
    ? (RELEASE_NOTES_URLS[filterRelease] ? [filterRelease] : [])
    : releasesWithNotes;

  if (entries.length === 0) return null;

  return (
    <div className="flex gap-4 mb-5 flex-wrap">
      {entries.map(r => (
        <div key={r} className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-foreground">v{r}</span>
          <a
            href={RELEASE_NOTES_URLS[r]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Release Notes <ExternalLink size={10} />
          </a>
        </div>
      ))}
    </div>
  );
}

// ── groupFeatures helpers ────────────────────────────────────────────────────

function groupByRelease(features: Feature[]): [string, Feature[]][] {
  const rels = [...new Set(features.flatMap(f => f.releases))].sort();
  return rels
    .map(r => [`v${r}`, features.filter(f => f.releases.includes(r))] as [string, Feature[]])
    .filter(([, items]) => items.length > 0);
}

function groupByPillar(features: Feature[]): [string, Feature[]][] {
  return (PILLARS as Pillar[])
    .map(p => [p, features.filter(f => f.pillar === p)] as [string, Feature[]])
    .filter(([, items]) => items.length > 0);
}

// ── Feature detail slide-over ────────────────────────────────────────────────

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
            <a href={`https://jira-dc.paloaltonetworks.com/browse/${f.jiraKey}`} target="_blank" className="text-[11px] font-bold text-primary hover:underline">
              {f.jiraKey}
            </a>
            <h2 className="text-base font-black text-foreground mt-1 leading-snug">{f.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-7 w-7"><X size={14} /></Button>
        </div>
        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={f.status as never}>{STATUS_LABELS[f.status]}</Badge>
            {f.releases.map(r => <Badge key={r} variant="blue">v{r}</Badge>)}
            {f.atRisk && <Badge variant="danger"><AlertTriangle size={9} />At Risk</Badge>}
          </div>
          {f.atRisk && f.riskReason && (
            <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-3 text-xs text-brand-red">
              <strong>Risk:</strong> {f.riskReason}
            </div>
          )}
          <div className="glass-strong rounded-xl p-5 flex flex-col gap-5">
            {[{ label: 'Summary', content: f.summary }, { label: 'Customer Problem', content: f.customerProblem }].map(({ label, content }) => (
              <div key={label}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
              </div>
            ))}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Business Value</div>
              <div className="rounded-lg bg-brand-green/5 border border-brand-green/15 p-3 text-xs text-muted-foreground leading-relaxed">{f.businessValue}</div>
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Customers ({f.customers.length})</div>
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
            {f.publicDocsUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={f.publicDocsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={12} />Documentation
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared feature table ─────────────────────────────────────────────────────

function FeatureTable({ groups, onSelect }: { groups: [string, Feature[]][]; onSelect: (f: Feature) => void }) {
  return (
    <>
      {groups.map(([groupName, items]) => (
        <div key={groupName} className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{groupName}</span>
            <div className="editorial-divider flex-1" />
            <Badge variant="muted">{items.length}</Badge>
          </div>
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.07]" style={{ background: 'rgba(0,0,0,0.02)' }}>
                    {['Key', 'Feature', 'Status', 'Release', 'Component', 'PM', 'Customers'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((f, i) => (
                    <tr
                      key={f.id}
                      onClick={() => onSelect(f)}
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
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[f.status], boxShadow: `0 0 6px ${STATUS_COLORS[f.status]}60` }} />
                          <span className="font-semibold text-foreground truncate">{f.title}</span>
                          {f.atRisk && <AlertTriangle size={10} className="text-brand-red shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={f.status as never} className="text-[9px]">{STATUS_LABELS[f.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.releases.join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: pillarColor(f.pillar as Pillar) }}>{f.productComponent}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.pmOwner}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {f.customers.slice(0, 2).map(c => <Badge key={c} variant="muted" className="text-[9px]">{c}</Badge>)}
                          {f.customers.length > 2 && <Badge variant="muted" className="text-[9px]">+{f.customers.length - 2}</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && <div className="py-10 text-center text-muted-foreground text-sm">No features</div>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Tab views ────────────────────────────────────────────────────────────────

function RoadmapFilterBar({
  features, pool,
  filterRelease, setFilterRelease,
  filterPM, setFilterPM,
  filterComponent, setFilterComponent,
  filterCustomer, setFilterCustomer,
  defaultRelease = '',
  onExport, exportLabel,
}: {
  features: Feature[]; pool: Feature[];
  filterRelease: string; setFilterRelease: (v: string) => void;
  filterPM: string; setFilterPM: (v: string) => void;
  filterComponent: string; setFilterComponent: (v: string) => void;
  filterCustomer: string; setFilterCustomer: (v: string) => void;
  defaultRelease?: string;
  onExport: () => void; exportLabel: string;
}) {
  const allReleases = [...new Set(pool.flatMap(f => f.releases))].sort();
  const allPMs = [...new Set(features.map(f => f.pmOwner))].filter(Boolean).sort();
  const allComponents = [...new Set(pool.map(f => f.productComponent))].filter(Boolean).sort();
  const allCustomers = [...new Set(pool.flatMap(f => f.customers))].filter(Boolean).sort();
  const hasFilters = !!(filterPM || filterComponent || filterCustomer || filterRelease !== defaultRelease);

  return (
    <div className="flex flex-wrap gap-2 items-center mb-6 pb-4 border-b border-border">
      <Select value={filterRelease} onValueChange={setFilterRelease}>
        <SelectTrigger className="w-28"><SelectValue placeholder="Release" /></SelectTrigger>
        <SelectContent>
          {allReleases.map(r => <SelectItem key={r} value={r}>v{r}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filterPM} onValueChange={setFilterPM}>
        <SelectTrigger className="w-32"><SelectValue placeholder="PM Owner" /></SelectTrigger>
        <SelectContent>
          {allPMs.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filterComponent} onValueChange={setFilterComponent}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Component" /></SelectTrigger>
        <SelectContent>
          {allComponents.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filterCustomer} onValueChange={setFilterCustomer}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Customer" /></SelectTrigger>
        <SelectContent>
          {allCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => {
          setFilterRelease(defaultRelease); setFilterPM(''); setFilterComponent(''); setFilterCustomer('');
        }}>
          <X size={11} />Clear
        </Button>
      )}

      <div className="ml-auto">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onExport}>
          <Download size={11} />{exportLabel}
        </Button>
      </div>
    </div>
  );
}

function ComingView({ features }: { features: Feature[] }) {
  const [filterRelease, setFilterRelease] = useState('');
  const [filterPM, setFilterPM]           = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterCustomer, setFilterCustomer]   = useState('');
  const [selected, setSelected] = useState<Feature | null>(null);

  const pool = features.filter(f => f.status === 'committed' || f.status === 'ec');
  const filtered = pool.filter(f =>
    (!filterRelease || f.releases.includes(filterRelease)) &&
    (!filterPM      || f.pmOwner === filterPM) &&
    (!filterComponent || f.productComponent === filterComponent) &&
    (!filterCustomer  || f.customers.includes(filterCustomer)),
  );
  const groups = groupByRelease(filtered);

  return (
    <div>
      {selected && <FeatureDetail f={selected} onClose={() => setSelected(null)} />}
      <RoadmapFilterBar
        features={features} pool={pool}
        filterRelease={filterRelease} setFilterRelease={setFilterRelease}
        filterPM={filterPM} setFilterPM={setFilterPM}
        filterComponent={filterComponent} setFilterComponent={setFilterComponent}
        filterCustomer={filterCustomer} setFilterCustomer={setFilterCustomer}
        onExport={() => exportToCSV(filtered, 'roadmap-coming')} exportLabel="Export"
      />
      <FeatureTable groups={groups} onSelect={setSelected} />
      {groups.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">No upcoming features</div>}
    </div>
  );
}

function ShippedView({ features }: { features: Feature[] }) {
  const pool = features.filter(f => f.status === 'delivered');
  const latestRelease = [...new Set(pool.flatMap(f => f.releases))].sort().at(-1) ?? '';

  const [filterRelease, setFilterRelease] = useState(() => latestRelease);
  const [filterPM, setFilterPM]           = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterCustomer, setFilterCustomer]   = useState('');
  const [selected, setSelected] = useState<Feature | null>(null);
  const filtered = pool.filter(f =>
    (!filterRelease || f.releases.includes(filterRelease)) &&
    (!filterPM      || f.pmOwner === filterPM) &&
    (!filterComponent || f.productComponent === filterComponent) &&
    (!filterCustomer  || f.customers.includes(filterCustomer)),
  );
  const groups = groupByPillar(filtered);

  return (
    <div>
      {selected && <FeatureDetail f={selected} onClose={() => setSelected(null)} />}
      <RoadmapFilterBar
        features={features} pool={pool}
        filterRelease={filterRelease} setFilterRelease={setFilterRelease}
        filterPM={filterPM} setFilterPM={setFilterPM}
        filterComponent={filterComponent} setFilterComponent={setFilterComponent}
        filterCustomer={filterCustomer} setFilterCustomer={setFilterCustomer}
        defaultRelease={latestRelease}
        onExport={() => exportToCSV(filtered, 'roadmap-shipped')} exportLabel="Export"
      />
      <ReleaseNotesWidget pool={pool} filterRelease={filterRelease} />
      <FeatureTable groups={groups} onSelect={setSelected} />
      {groups.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">No shipped features</div>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { features, loading, error } = useFeatures();

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-brand-red">Error loading features: {error}</div>;

  return (
    <div className={cn('animate-fade-in')}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Product Roadmap</h1>
        <p className="text-sm text-muted-foreground mt-1">Engineering committed features by release</p>
      </div>
      <Tabs defaultValue="coming">
        <TabsList className="bg-transparent border border-black/10 rounded-lg p-1 mb-6">
          <TabsTrigger value="coming" className="rounded-md">What&apos;s Coming</TabsTrigger>
          <TabsTrigger value="shipped" className="rounded-md">What Shipped</TabsTrigger>
        </TabsList>
        <TabsContent value="coming"><ComingView features={features} /></TabsContent>
        <TabsContent value="shipped"><ShippedView features={features} /></TabsContent>
      </Tabs>
    </div>
  );
}
