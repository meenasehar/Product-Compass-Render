import { useState } from 'react';
import { Send, CheckCircle2, LayoutGrid } from 'lucide-react';
import { PILLARS, PRODUCT_COMPONENTS, type Pillar, type ProductComponent } from '@/data/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Local components ────────────────────────────────────────────────────────

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none transition-colors"
    />
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
      {children}
      {required && <span className="text-brand-red ml-0.5">*</span>}
    </label>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const RECENT_SUBMISSIONS = [
  { id: 1, title: 'Auto-remediation for BGP flap events', submitter: 'J. Park', status: 'under_review' },
  { id: 2, title: 'SAML federation for multi-IDP tenants', submitter: 'A. Patel', status: 'accepted' },
  { id: 3, title: 'QoS policy per-application override', submitter: 'M. Torres', status: 'needs_info' },
  { id: 4, title: 'CloudBlade for Azure VNET peering', submitter: 'R. Singh', status: 'accepted' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'committed' | 'delivered' | 'warning' }> = {
  under_review: { label: 'Under Review', variant: 'committed' },
  accepted: { label: 'Accepted', variant: 'delivered' },
  needs_info: { label: 'Needs Info', variant: 'warning' },
};

type FormData = {
  title: string;
  pillar: string;
  productComponent: string;
  pmOwner: string;
  engTeam: string;
  summary: string;
  customerProblem: string;
  businessValue: string;
  useCase: string;
  customers: string;
  priority: string;
  effort: string;
};

const EMPTY: FormData = {
  title: '', pillar: '', productComponent: '', pmOwner: '', engTeam: '',
  summary: '', customerProblem: '', businessValue: '', useCase: '',
  customers: '', priority: '3', effort: 'M',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IntakePage() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof FormData) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const isValid =
    form.title.trim().length > 0 &&
    form.pillar.length > 0 &&
    form.customerProblem.trim().length > 0;

  function handleSubmit() {
    if (!isValid) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm(EMPTY);
    }, 3500);
  }

  return (
    <div className="animate-fade-in">
      {/* Minimal page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black tracking-tight">Feature Request Intake</h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <LayoutGrid size={12} />
          <span>Synced with Jira PSDWPM</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_300px] gap-6">

        {/* ── Left: Main form ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {submitted ? (
            <div
              className="glass rounded-xl"
              style={{ border: '1px solid rgba(0,200,150,0.2)', background: 'rgba(0,200,150,0.05)' }}
            >
              <div className="pt-12 pb-12 text-center">
                <CheckCircle2 size={44} className="text-brand-green mx-auto mb-4" />
                <div className="text-lg font-black text-foreground mb-1.5">Submitted!</div>
                <div className="text-sm text-muted-foreground max-w-xs mx-auto">
                  A Jira ticket will be created in PSDWPM and routed to the appropriate PM for triage.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: Feature Details */}
              <div className="glass rounded-xl">
                <div
                  className="px-5 pt-5 pb-4"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                >
                  <h3 className="text-sm font-bold">Feature Details</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <FieldLabel required>Feature Title</FieldLabel>
                    <Input
                      value={form.title}
                      onChange={e => set('title')(e.target.value)}
                      placeholder="Concise descriptive title..."
                      className="text-sm h-10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Strategic Pillar</FieldLabel>
                      <Select value={form.pillar} onValueChange={set('pillar')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pillar…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(PILLARS as Pillar[]).map(p => (
                            <SelectItem key={p} value={p}>{p.split('&')[0].trim()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Product Area</FieldLabel>
                      <Select value={form.productComponent} onValueChange={set('productComponent')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(PRODUCT_COMPONENTS as ProductComponent[]).map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>PM Owner</FieldLabel>
                      <Input value={form.pmOwner} onChange={e => set('pmOwner')(e.target.value)} placeholder="PM name…" />
                    </div>
                    <div>
                      <FieldLabel>Eng Team</FieldLabel>
                      <Input value={form.engTeam} onChange={e => set('engTeam')(e.target.value)} placeholder="Engineering team…" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Priority</FieldLabel>
                      <Select value={form.priority} onValueChange={set('priority')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['1', '2', '3', '4', '5'].map(p => (
                            <SelectItem key={p} value={p}>P{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Effort</FieldLabel>
                      <Select value={form.effort} onValueChange={set('effort')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['S', 'M', 'L', 'XL'].map(e => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Context & Justification */}
              <div className="glass rounded-xl">
                <div
                  className="px-5 pt-5 pb-4"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                >
                  <h3 className="text-sm font-bold">Context & Justification</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <FieldLabel>Summary</FieldLabel>
                    <Textarea
                      value={form.summary}
                      onChange={set('summary')}
                      placeholder="1–2 sentence overview of the feature…"
                      rows={2}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Customer Problem</FieldLabel>
                    <Textarea
                      value={form.customerProblem}
                      onChange={set('customerProblem')}
                      placeholder="What pain point does this solve? What can't customers do today?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <FieldLabel>Business Value</FieldLabel>
                    <Textarea
                      value={form.businessValue}
                      onChange={set('businessValue')}
                      placeholder="ARR impact, competitive differentiation, retention risk, etc."
                      rows={2}
                    />
                  </div>
                  <div>
                    <FieldLabel>Use Case / Scenario</FieldLabel>
                    <Textarea
                      value={form.useCase}
                      onChange={set('useCase')}
                      placeholder="Describe a concrete customer scenario where this feature is needed…"
                      rows={2}
                    />
                  </div>
                  <div>
                    <FieldLabel>Affected Customers</FieldLabel>
                    <Input
                      value={form.customers}
                      onChange={e => set('customers')(e.target.value)}
                      placeholder="e.g. Walmart, JPMorgan Chase, NHS UK (comma-separated)"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid}
                  size="lg"
                  className="w-full"
                >
                  <Send size={14} />
                  Submit Request
                </Button>
                {!isValid && (
                  <p className="text-[10.5px] text-muted-foreground mt-2 text-center">
                    Title, Strategic Pillar, and Customer Problem are required.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right: Sidebar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sticky top-8 self-start">

          {/* Review Process */}
          <div className="glass rounded-xl">
            <div
              className="px-5 pt-5 pb-4"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <h3 className="text-sm font-bold">Review Process</h3>
            </div>
            <div className="p-5">
              <div className="flex flex-col">
                {[
                  { step: '1', label: 'Submitted', desc: 'Jira ticket auto-created in PSDWPM backlog' },
                  { step: '2', label: 'PM Triage', desc: 'Assigned PM reviews within 5 business days' },
                  { step: '3', label: 'Prioritization', desc: 'Sprint planning or quarterly roadmap placement' },
                  { step: '4', label: 'Decision', desc: 'Accept → Backlog, Decline → archived with rationale' },
                ].map((s, i) => (
                  <div key={s.step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[9px] font-black text-primary shrink-0">
                        {s.step}
                      </div>
                      {i < 3 && (
                        <div className="w-px bg-border mt-1 mb-1" style={{ minHeight: 20 }} />
                      )}
                    </div>
                    <div className={i < 3 ? 'pb-3' : ''}>
                      <div className="text-xs font-bold text-foreground leading-tight">{s.label}</div>
                      <div className="text-[10.5px] text-muted-foreground mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="glass rounded-xl">
            <div
              className="px-5 pt-5 pb-4"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <h3 className="text-sm font-bold">Recent Submissions</h3>
            </div>
            <div className="p-5">
              {RECENT_SUBMISSIONS.map((s, i) => {
                const st = STATUS_MAP[s.status];
                return (
                  <div
                    key={s.id}
                    className={cn('pb-3 last:pb-0', i > 0 && 'pt-3')}
                    style={i > 0 ? { borderTop: '1px solid rgba(0,0,0,0.06)' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground leading-snug">{s.title}</span>
                      <Badge variant={st.variant} className="shrink-0 text-[9px]">{st.label}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{s.submitter}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
