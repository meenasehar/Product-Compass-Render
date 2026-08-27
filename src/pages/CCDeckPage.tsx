import { useState } from 'react';
import { Shield, Globe, Lock, Bot } from 'lucide-react';
import { useFeatures } from '@/hooks/useFeatures';
import { pillarColor, PILLARS, type Pillar } from '@/data/features';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function Mono({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'var(--f-mono)', ...style }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <Mono style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 700 }}>
        {children}
      </Mono>
      <div style={{ flex: 1, height: '1px', background: 'var(--rule-md)' }} />
    </div>
  );
}

type PillarIconComponent = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

const PILLAR_ICONS: Record<string, PillarIconComponent> = {
  'Next Gen Platforms & Compliance': Shield,
  'Scalable Networking': Globe,
  'On-Box Security & SASE': Lock,
  'AI/Agentic Experience & Operations': Bot,
};

const STATUS_COLORS: Record<string, string> = {
  concept: '#94a3b8', committed: '#4f8ef7', ec: '#22d3ee', indev: '#a78bfa',
  validation: '#f59e0b', delivered: '#00c896', deferred: '#f43f5e',
};

// ── Value Story view ─────────────────────────────────────────────────────────

function ValueStoryView({ release, allFeatures }: { release: string; allFeatures: import('@/data/features').Feature[] }) {
  const features = allFeatures.filter(f => f.releases.includes(release));
  const active = features.filter(f => f.status !== 'concept' && f.status !== 'deferred');

  const byPillar = (PILLARS as Pillar[])
    .map(p => ({ pillar: p, features: features.filter(f => f.pillar === p) }))
    .filter(g => g.features.length > 0);

  // Release Value: most detailed businessValue in this release
  const releaseValueText = active
    .filter(f => f.businessValue)
    .sort((a, b) => (b.businessValue?.length ?? 0) - (a.businessValue?.length ?? 0))[0]
    ?.businessValue ?? '';

  // Key Takeaways: top businessValue per pillar, up to 4
  const keyTakeaways = byPillar
    .map(({ features: pf }) =>
      pf
        .filter(x => x.businessValue && x.status !== 'deferred')
        .sort((a, b) => (b.businessValue?.length ?? 0) - (a.businessValue?.length ?? 0))[0]
        ?.businessValue
    )
    .filter((v): v is string => !!v)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      {/* Release hero */}
      <div className="glass-hero rounded-2xl px-8 py-8">
        <Mono style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mid)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          v{release}
        </Mono>
        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0 }}>
          Prisma SD-WAN v{release}
        </h2>
      </div>

      {/* Release Value + Key Takeaways tiles */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass rounded-xl p-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Mono style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 700 }}>Release Value</Mono>
            <div style={{ flex: 1, height: '1px', background: 'var(--rule-md)' }} />
          </div>
          {releaseValueText ? (
            <p style={{ fontFamily: 'var(--f-ui)', fontSize: '14px', color: 'var(--ink-mid)', lineHeight: 1.65, margin: 0 }}>
              {releaseValueText}
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--f-ui)', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: 1.65, margin: 0, opacity: 0.45 }}>
              Add the Business Value field to Jira features for this release to populate this section.
            </p>
          )}
        </div>

        <div className="glass rounded-xl p-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Mono style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 700 }}>Key Takeaways</Mono>
            <div style={{ flex: 1, height: '1px', background: 'var(--rule-md)' }} />
          </div>
          {keyTakeaways.length > 0 ? (
            <div className="flex flex-col gap-4">
              {keyTakeaways.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold"
                    style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground opacity-50">No takeaways available — add Business Value to Jira features.</p>
          )}
        </div>
      </div>

      {/* What's New — features organized by pillar */}
      <div>
        <SectionLabel>What's New</SectionLabel>
        <div className="flex flex-col gap-5">
          {byPillar.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No features found for v{release}
            </div>
          )}
          {byPillar.map(({ pillar, features: pf }) => {
            const color = pillarColor(pillar);
            const PillarIcon = PILLAR_ICONS[pillar];
            const activeFeatures = pf.filter(f => f.status !== 'concept' && f.status !== 'deferred');

            return (
              <div key={pillar} className="glass rounded-xl overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ background: `${color}08`, borderBottom: `1px solid ${color}22` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}14`, border: `1px solid ${color}25` }}
                  >
                    {PillarIcon && <PillarIcon size={15} style={{ color }} />}
                  </div>
                  <span className="text-sm font-black text-foreground">{pillar}</span>
                </div>

                <div className="divide-y divide-black/[0.05]">
                  {activeFeatures.slice(0, 8).map(f => (
                    <div key={f.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1"
                          style={{ background: STATUS_COLORS[f.status] }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-foreground leading-snug">{f.title}</span>
                          {f.customerProblem && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 line-clamp-2">
                              <span className="font-semibold text-foreground/60">Problem: </span>{f.customerProblem}
                            </p>
                          )}
                          {f.businessValue && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                              <span className="font-semibold text-foreground/60">Value: </span>{f.businessValue}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeFeatures.length > 8 && (
                    <div className="px-5 py-2.5 text-[10px] text-muted-foreground/50">
                      +{activeFeatures.length - 8} more
                    </div>
                  )}
                  {activeFeatures.length === 0 && (
                    <div className="px-5 py-4 text-[11px] text-muted-foreground/50">
                      No active features in this pillar for v{release}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Competitive Landscape placeholder ────────────────────────────────────────

function CompetitiveView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}
      >
        ⚠
      </div>
      <div className="text-center max-w-md">
        <div className="text-sm font-bold text-foreground mb-2">Competitive data requires manual curation</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Competitive intelligence must come from verified sources — analyst reports, product announcements, field observations, and win/loss data. No automated source is available for this content.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-3">
          To populate this section, add your competitive analysis directly to the <Mono style={{ fontSize: '11px' }}>PILLAR_LANDSCAPE</Mono> constant in <Mono style={{ fontSize: '11px' }}>CCDeckPage.tsx</Mono> with sourced, verified data.
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CCDeckPage() {
  const { features, loading, error } = useFeatures();
  const [release, setRelease] = useState('7.0');
  const [view, setView] = useState<'story' | 'competitive'>('story');

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-brand-red">Error loading features: {error}</div>;

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--f-ui)' }}>
      {/* ── Masthead ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--rule-heavy)', paddingBottom: '20px', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '42px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.01em' }}>
          Go-to-Market
        </h1>
        <Mono style={{ fontSize: '11px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-mid)', display: 'block', marginTop: '8px', fontWeight: 500 }}>
          Release features and competitive positioning
        </Mono>
      </div>

      {/* Release selector */}
      <div style={{ marginBottom: '28px' }}>
        <Mono style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mid)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
          Release
        </Mono>
        <div className="flex items-center gap-2">
          {(['6.8', '7.0', '7.1'] as const).map(r => {
            const active = release === r;
            const isGA = r === '6.8';
            return (
              <button
                key={r}
                onClick={() => setRelease(r)}
                className={cn(
                  'flex flex-col items-start px-5 py-3 rounded-xl border transition-all duration-150 min-w-[110px]',
                  active
                    ? 'border-primary/40 text-foreground'
                    : 'border-black/[0.08] text-muted-foreground hover:border-black/[0.15] hover:text-foreground'
                )}
                style={active ? {
                  background: 'linear-gradient(135deg, #4f8ef712 0%, #7c3aed08 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(79,142,247,0.3)',
                } : { background: 'rgba(0,0,0,0.02)' }}
              >
                <span className={cn('text-base font-black tracking-tight leading-none', active && 'text-primary')}>
                  v{r}
                </span>
                <span
                  className="text-[9px] font-bold mt-1.5"
                  style={{ color: isGA ? '#00c896' : r === '7.0' ? '#a78bfa' : '#94a3b8' }}
                >
                  {isGA ? 'GA' : r === '7.0' ? 'Upcoming' : 'Planned'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={view} onValueChange={v => setView(v as typeof view)}>
        <TabsList className="bg-transparent border border-black/10 rounded-lg p-1 mb-7">
          <TabsTrigger value="story">Value Story</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Landscape</TabsTrigger>
        </TabsList>

        <TabsContent value="story">
          <ValueStoryView release={release} allFeatures={features} />
        </TabsContent>
        <TabsContent value="competitive">
          <CompetitiveView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
