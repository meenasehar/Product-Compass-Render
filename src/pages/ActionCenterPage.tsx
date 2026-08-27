import { useState, useMemo, useEffect } from 'react';
import { ExternalLink, Loader2, Printer, RefreshCw, Sparkles } from 'lucide-react';
import { useFeatures } from '@/hooks/useFeatures';
import { pillarColor, PILLARS, type Pillar, type Feature } from '@/data/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/api';



function CCFeatureCard({ f, index }: { f: Feature; index: number }) {
  const color = pillarColor(f.pillar as Pillar);
  return (
    <div
      className="relative rounded-2xl overflow-hidden print:break-inside-avoid"
      style={{ background: 'rgba(255,255,255,1.0)', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <div className="h-1 w-full" style={{ background: color }} />
      <div className="p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <span className="text-[12px] font-bold text-primary">{f.jiraKey}</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-foreground leading-snug">{f.title}</h3>
          </div>
          <div
            className="text-3xl font-black shrink-0 opacity-10 select-none"
            style={{ color, fontVariantNumeric: 'tabular-nums' }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          {[
            { label: 'Customer Problem', text: f.customerProblem },
            { label: 'Business Value',   text: f.businessValue },
            { label: 'Use Case',         text: f.useCase, italic: true },
          ].map(({ label, text, italic }) => (
            <div key={label}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
              <p className={cn('text-sm text-muted-foreground leading-relaxed', italic && 'italic')}>{text}</p>
            </div>
          ))}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Customers ({f.customers.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {f.customers.map(c => <Badge key={c} variant="muted" className="text-[11px]">{c}</Badge>)}
              {f.customers.length === 0 && <span className="text-[12px] text-muted-foreground/40">—</span>}
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-5 mt-5 pt-4 flex-wrap"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
        >
          {[['PM', f.pmOwner], ['Eng', f.engOwner], ['Team', f.engTeam], ['Effort', f.effort], ['Priority', `P${f.priority}`]].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/50 uppercase tracking-widest">{k}</span>
              <span className="text-[12px] font-bold text-foreground">{v}</span>
            </div>
          ))}
          {f.requirementsUrl && (
            <a
              href={f.requirementsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[12px] font-bold text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              PRD <ExternalLink size={9} />
            </a>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {f.releases.map(r => <Badge key={r} variant="blue" className="text-[11px]">v{r}</Badge>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CCDeckTab({ features: allFeatures }: { features: Feature[] }) {
  const allReleases = useMemo(
    () => [...new Set(allFeatures.flatMap(f => f.releases))].sort(),
    [allFeatures]
  );

  // Exclude GA (all delivered) and post-CC (all features already EC or beyond)
  const activeReleases = useMemo(
    () => allReleases.filter(r => {
      const feats = allFeatures.filter(f => f.releases.includes(r));
      if (feats.length === 0) return false;
      if (feats.every(f => f.status === 'delivered')) return false; // GA — skip
      // Skip releases where engineering has already committed everything (all EC/indev/validation/delivered)
      const allPastCC = feats.every(f => ['ec', 'indev', 'validation', 'delivered'].includes(f.status));
      if (allPastCC) return false;
      return true;
    }),
    [allReleases, allFeatures]
  );

  // Default to the first release that has CC-labeled features
  const defaultRelease = useMemo(() => {
    const withCC = activeReleases.find(r =>
      allFeatures.some(f => f.labels.some(l => l === `sdwan-${r}-cc`))
    );
    return withCC ?? activeReleases[0] ?? '';
  }, [activeReleases, allFeatures]);

  const [release, setRelease] = useState<string>('');
  const activeRelease = release || defaultRelease;

  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const deckReady = generatedFor === activeRelease && generatedUrl !== null;

  // Load persisted deck URL when release changes
  useEffect(() => {
    if (!activeRelease) return;
    const stored = localStorage.getItem(`cc_deck_${activeRelease}`);
    if (stored) {
      try {
        const { url } = JSON.parse(stored) as { url: string };
        setGeneratedUrl(url);
        setGeneratedFor(activeRelease);
      } catch {
        localStorage.removeItem(`cc_deck_${activeRelease}`);
      }
    } else {
      setGeneratedUrl(null);
      setGeneratedFor(null);
    }
  }, [activeRelease]);

  // CC deck features = features tagged with the CC label for this release
  const ccLabel = `sdwan-${activeRelease}-cc`;
  const features = allFeatures.filter(f => f.labels.some(l => l === ccLabel));

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    setGeneratedUrl(null);
    setGeneratedFor(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate/ccdeck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release: activeRelease }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const data = await res.json() as { url: string; title: string; featureCount: number };
      localStorage.setItem(`cc_deck_${activeRelease}`, JSON.stringify({ url: data.url, title: data.title }));
      setGeneratedUrl(data.url);
      setGeneratedFor(activeRelease);
      window.open(data.url, '_blank');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }
  const byPillar = (PILLARS as Pillar[])
    .map(p => ({ pillar: p, items: features.filter(f => f.pillar === p) }))
    .filter(g => g.items.length > 0);

  return (
    <div>
      {/* Release selector */}
      <div
        className="inline-flex items-center gap-1.5 p-1 rounded-xl mb-7"
        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        {activeReleases.map(r => {
          const active = activeRelease === r;
          return (
            <button
              key={r}
              onClick={() => setRelease(r)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              style={active ? {
                background: 'rgba(174,71,22,0.08)',
                borderBottom: '2px solid #AE4716',
                color: '#AE4716',
                borderRadius: '2px',
              } : { borderBottom: '2px solid transparent' }}
            >
              v{r}
            </button>
          );
        })}
      </div>

      {/* Summary card — always visible */}
      <div
        className="rounded-2xl p-6 mb-7"
        style={{
          background: 'rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-1.5">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              v{activeRelease} · Prisma SD-WAN
            </div>
            <div className="text-4xl font-black text-foreground leading-none">
              {features.length}
              <span className="text-lg font-normal text-muted-foreground ml-2">features</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {deckReady && generatedUrl && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={generatedUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={11} />Open Deck
                </a>
              </Button>
            )}
            <Button
              className="gap-2"
              onClick={handleGenerate}
              disabled={features.length === 0 || generating}
            >
              {generating
                ? <><Loader2 size={13} className="animate-spin" />Generating…</>
                : deckReady
                  ? <><RefreshCw size={13} />Regenerate</>
                  : <><Sparkles size={13} />Generate Slides</>
              }
            </Button>
          </div>
        </div>

        <div className="editorial-divider my-4" />

        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Pillar Breakdown</div>
        <div className="flex flex-col gap-3">
          {byPillar.map(({ pillar, items }) => {
            const color = pillarColor(pillar);
            const pct = features.length ? Math.round((items.length / features.length) * 100) : 0;
            return (
              <div key={pillar} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-sm text-foreground flex-1 truncate">{pillar}</span>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-sm font-bold w-5 text-right" style={{ color }}>{items.length}</span>
                </div>
              </div>
            );
          })}
          {features.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">No features for this release</div>
          )}
        </div>
      </div>

      {/* Error */}
      {genError && (
        <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-3 text-sm text-brand-red mb-5">
          <strong>Generation failed:</strong> {genError}
        </div>
      )}

      {/* Deck content */}
      {deckReady && (
        <div>
          <div className="flex items-center justify-end mb-6">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer size={12} />Print / Export PDF
            </Button>
          </div>

          {byPillar.map(({ pillar, items }) => {
            const color = pillarColor(pillar);
            return (
              <div key={pillar} className="mb-10 print:break-before-page">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}70` }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>{pillar}</span>
                  <div className="editorial-divider flex-1" />
                  <Badge variant="muted">{items.length}</Badge>
                </div>
                <div className="flex flex-col gap-4">
                  {items.map((f, i) => <CCFeatureCard key={f.id} f={f} index={i} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ActionCenterPage() {
  const { features, loading, error } = useFeatures();

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-brand-red">Error loading features: {error}</div>;

  return (
    <div className={cn('animate-fade-in')}>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Action Center</h1>
        <p className="text-base text-muted-foreground mt-1">PM Artifacts</p>
      </div>

      <Tabs defaultValue="ccdeck">
        <TabsList className="bg-transparent border border-black/10 rounded-lg p-1 mb-6">
          <TabsTrigger value="ccdeck" className="rounded-md">CC Deck</TabsTrigger>
        </TabsList>
        <TabsContent value="ccdeck">
          <CCDeckTab features={features} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
