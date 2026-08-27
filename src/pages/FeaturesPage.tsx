import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle, Anchor, ChevronDown, Download, ExternalLink, FileText, Frame, ClipboardList, FileCode, Inbox, Palette, Search, ShieldAlert, X, Send, CheckCircle2 } from 'lucide-react';
import { exportToCSV } from '@/utils/exportCSV';
import { API_BASE } from '@/lib/api';
import { useFeatures } from '@/hooks/useFeatures';
import { useApp } from '@/context/AppContext';
import {
  STATUS_LABELS, STATUS_ORDER, pillarColor, PRD_STATUS_CONFIG,
  PILLARS, PRODUCT_COMPONENTS,
  type Status, type Pillar, type Feature,
} from '@/data/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function StatusBadge({ status, release }: { status: Status; release?: string }) {
  const label = status === 'concept' && release
    ? `Concept-${release}`
    : STATUS_LABELS[status];
  return <span className={`st-${status}`}>{label}</span>;
}

function PrdStatusBadge({ status }: { status: import('@/data/features').PrdStatus }) {
  const cfg = PRD_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

type IntakeFormData = {
  summary: string;
  reporter: string;
  components: string[];
  problem: string;
  solution: string;
  benefits: string;
  priority: string;
  labels: string;
  prdQA: boolean;
  prdDev: boolean;
  prdNotNeeded: boolean;
  uxReview: boolean;
  prdLink: string;
  testPlanLink: string;
  figmaLink: string;
  functionalSpecLink: string;
};
const EMPTY_INTAKE: IntakeFormData = {
  summary: '', reporter: '', components: [],
  problem: '', solution: '', benefits: '',
  priority: 'P2', labels: '',
  prdQA: false, prdDev: false, prdNotNeeded: false, uxReview: false,
  prdLink: '', testPlanLink: '', figmaLink: '', functionalSpecLink: '',
};
const PRIORITY_OPTIONS = ['P1-Blocker', 'P1', 'P2', 'P3', 'P4', 'P5'];

function IntakePanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<IntakeFormData>(EMPTY_INTAKE);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ key: string; url: string } | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [availableComponents, setAvailableComponents] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/features/components`)
      .then(r => r.json())
      .then((data: { name: string }[]) => setAvailableComponents(data.map(c => c.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (result) panelRef.current?.scrollTo({ top: 0 });
  }, [result]);

  function setField<K extends keyof IntakeFormData>(k: K, v: IntakeFormData[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleComponent(name: string) {
    setForm(f => ({
      ...f,
      components: f.components.includes(name)
        ? f.components.filter(c => c !== name)
        : [...f.components, name],
    }));
  }

  const isValid = form.summary.trim().length > 0 && form.problem.trim().length > 0;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const prdReviewed = [
        form.prdQA && 'QA Reviewed',
        form.prdDev && 'Dev Reviewed',
        form.prdNotNeeded && 'Not Needed',
      ].filter(Boolean) as string[];

      const descParts: string[] = [];
      if (form.problem)  descParts.push(`*Problem:*\n${form.problem}`);
      if (form.solution) descParts.push(`*Solution:*\n${form.solution}`);
      if (form.benefits) descParts.push(`*Benefits:*\n${form.benefits}`);

      const res = await fetch(`${API_BASE}/api/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary:           form.summary,
          reporter:          form.reporter || undefined,
          components:        form.components.length ? form.components : undefined,
          description:       descParts.join('\n\n') || undefined,
          priority:          form.priority,
          labels:            form.labels ? form.labels.split(',').map(l => l.trim()).filter(Boolean) : undefined,
          prdReviewed:       prdReviewed.length ? prdReviewed : undefined,
          uxReview:          form.uxReview || undefined,
          prdLink:           form.prdLink || undefined,
          testPlanLink:      form.testPlanLink || undefined,
          figmaLink:         form.figmaLink || undefined,
          functionalSpecLink: form.functionalSpecLink || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; detail?: { errorMessages?: string[]; errors?: Record<string, string> } };
        const detail = body.detail;
        const msgs = [
          ...(detail?.errorMessages ?? []),
          ...Object.values(detail?.errors ?? {}),
        ].filter(Boolean);
        throw new Error(msgs.length ? msgs.join(' | ') : (body.error ?? `Jira returned ${res.status}`));
      }
      const data = await res.json() as { key: string; url: string };
      setResult(data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = 'text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5 block';

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 w-[620px] z-50 border-l border-black/[0.08] overflow-y-auto animate-slide-in-right shadow-2xl flex flex-col"
        style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)' }}
      >
        <div
          className="flex items-center justify-between p-5 border-b border-black/[0.08] sticky top-0 backdrop-blur shrink-0"
          style={{ background: 'rgba(255,255,255,0.96)' }}
        >
          <h2 className="text-base font-black text-foreground">New Feature Request</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0">
            <X size={14} />
          </Button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {result ? (
            <div className="flex flex-col items-center justify-center min-h-[420px] text-center gap-4">
              <CheckCircle2 size={44} className="text-brand-green" />
              <div>
                <div className="text-lg font-black text-foreground mb-1">Feature created!</div>
                <a href={result.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                  {result.key} <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setResult(null); setForm(EMPTY_INTAKE); }}>Add Another</Button>
                <Button size="sm" onClick={() => { onCreated(); onClose(); }}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Core Fields ── */}
              <div className="glass rounded-xl">
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <h3 className="text-sm font-bold">Feature Details</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <label className={labelCls}>Summary <span className="text-brand-red">*</span></label>
                    <Input value={form.summary} onChange={e => setField('summary', e.target.value)}
                      placeholder="Concise feature title…" className="text-sm h-10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Reporter</label>
                      <div className="flex items-center rounded-md border border-input bg-background text-sm h-9 focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                        <input
                          value={form.reporter}
                          onChange={e => setField('reporter', e.target.value.replace(/@.*/, ''))}
                          placeholder="username"
                          className="flex-1 min-w-0 px-3 bg-transparent focus:outline-none text-sm"
                        />
                        <span className="pr-3 text-muted-foreground text-[12px] shrink-0 select-none">@paloaltonetworks.com</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Priority</label>
                      <Select value={form.priority} onValueChange={v => setField('priority', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Components ── */}
              {availableComponents.length > 0 && (
                <div className="glass rounded-xl">
                  <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <h3 className="text-sm font-bold">Component/s</h3>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {availableComponents.map(name => {
                      const active = form.components.includes(name);
                      return (
                        <button key={name} type="button" onClick={() => toggleComponent(name)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border"
                          style={active
                            ? { background: 'rgba(212,90,26,0.12)', color: '#D45A1A', borderColor: 'rgba(212,90,26,0.35)' }
                            : { background: 'transparent', color: 'rgba(0,0,0,0.45)', borderColor: 'rgba(0,0,0,0.12)' }
                          }
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Description ── */}
              <div className="glass rounded-xl">
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <h3 className="text-sm font-bold">Description</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  {([
                    ['problem',  'Problem',  "What pain point does this solve?",                     3, true],
                    ['solution', 'Solution', 'How will this feature address the problem?',             2, false],
                    ['benefits', 'Benefits', 'Business value, ARR impact, competitive differentiation…', 2, false],
                  ] as [keyof IntakeFormData, string, string, number, boolean][]).map(([key, label, ph, rows, req]) => (
                    <div key={key as string}>
                      <label className={labelCls}>
                        {label}{req && <span className="text-brand-red"> *</span>}
                      </label>
                      <textarea
                        value={form[key] as string}
                        onChange={e => setField(key, e.target.value as IntakeFormData[typeof key])}
                        placeholder={ph}
                        rows={rows}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Labels ── */}
              <div>
                <label className={labelCls}>
                  Labels{' '}
                  <span className="normal-case font-normal text-muted-foreground/70">(optional, comma-separated)</span>
                </label>
                <Input value={form.labels} onChange={e => setField('labels', e.target.value)}
                  placeholder="e.g. at-risk, anchor, sdwan-7.1.1-cc" className="text-sm h-9" />
              </div>

              {/* ── Reviews ── */}
              <div className="glass rounded-xl">
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <h3 className="text-sm font-bold">
                    Reviews{' '}
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <label className={labelCls}>PRD Review</label>
                    <div className="flex flex-wrap gap-5">
                      {([
                        ['prdQA',        'QA Reviewed'],
                        ['prdDev',       'Dev Reviewed'],
                        ['prdNotNeeded', 'Not Needed'],
                      ] as [keyof IntakeFormData, string][]).map(([key, lbl]) => (
                        <label key={key as string} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={form[key] as boolean}
                            onChange={e => setField(key, e.target.checked as IntakeFormData[typeof key])}
                            className="w-4 h-4 accent-primary" />
                          <span className="text-sm text-foreground">{lbl}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.uxReview}
                      onChange={e => setField('uxReview', e.target.checked)}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-semibold text-foreground">UX Review</span>
                  </label>
                </div>
              </div>

              {/* ── Documentation Links ── */}
              <div className="glass rounded-xl">
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <h3 className="text-sm font-bold">
                    Documentation Links{' '}
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </h3>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {([
                    ['prdLink',            'PRD Link'],
                    ['testPlanLink',        'Test Plan Link'],
                    ['figmaLink',           'Figma UX Link'],
                    ['functionalSpecLink',  'Functional Spec Link'],
                  ] as [keyof IntakeFormData, string][]).map(([key, lbl]) => (
                    <div key={key as string}>
                      <label className={labelCls}>{lbl}</label>
                      <Input value={form[key] as string}
                        onChange={e => setField(key, e.target.value as IntakeFormData[typeof key])}
                        placeholder="https://…" type="url" className="text-sm h-9" />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Submit ── */}
              <div className="pb-2">
                <Button onClick={handleSubmit} disabled={!isValid || submitting} size="lg" className="w-full">
                  {submitting
                    ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    : <Send size={14} />
                  }
                  {submitting ? 'Creating in Jira…' : 'Create Feature in Jira'}
                </Button>
                {!isValid && !submitting && (
                  <p className="text-[10.5px] text-muted-foreground mt-2 text-center">Summary and Problem are required.</p>
                )}
                {submitError && (
                  <p className="text-[11px] text-brand-red mt-2 text-center">{submitError}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function FeatureDetail({ f, onClose }: { f: Feature; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      <div
        className="fixed top-0 right-0 bottom-0 w-[500px] z-50 border-l border-black/[0.08] overflow-y-auto animate-slide-in-right shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)' }}
      >
        {/* Colored top band using pillar color */}
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
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={f.status} release={f.releases[0]} />
            {(f.status === 'ec' || f.status === 'delivered') && f.releases.map(r => <Badge key={r} variant="blue">v{r}</Badge>)}
            {f.atRisk && <Badge variant="danger"><AlertTriangle size={9} />At Risk</Badge>}
            {(() => {
              const reviewed = f.prdReviewed ?? [];
              const isPrdReviewed = reviewed.some(v => v === 'QA Reviewed' || v === 'Dev Reviewed');
              const isPrdNotNeeded = reviewed.includes('Not Needed');
              if (isPrdReviewed) {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}>
                    PRD Reviewed
                  </span>
                );
              }
              if (!isPrdNotNeeded) {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(244,63,94,0.10)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
                    <ShieldAlert size={9} />CC Risk
                  </span>
                );
              }
              return null;
            })()}
          </div>

          {/* At-risk reason */}
          {f.atRisk && f.riskReason && (
            <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-3 text-xs text-brand-red">
              <strong>Risk:</strong> {f.riskReason}
            </div>
          )}

          {/* Spec & design links */}
          {(f.requirementsUrl || f.figmaUrl || f.testPlanUrl || f.functionalSpecUrl || f.uxStatus) && (
            <div className="flex flex-wrap gap-2">
              {f.requirementsUrl && (
                <a href={f.requirementsUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.20)' }}
                >
                  <FileText size={12} className="shrink-0" />
                  <span>Requirements</span>
                  <ExternalLink size={9} className="shrink-0 opacity-60" />
                </a>
              )}
              {f.functionalSpecUrl && (
                <a href={f.functionalSpecUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.20)' }}
                >
                  <FileCode size={12} className="shrink-0" />
                  <span>Func Spec</span>
                  <ExternalLink size={9} className="shrink-0 opacity-60" />
                </a>
              )}
              {f.testPlanUrl && (
                <a href={f.testPlanUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.20)' }}
                >
                  <ClipboardList size={12} className="shrink-0" />
                  <span>Test Plan</span>
                  <ExternalLink size={9} className="shrink-0 opacity-60" />
                </a>
              )}
              {f.figmaUrl && (
                <a href={f.figmaUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(167,139,250,0.08)', color: '#7c3aed', border: '1px solid rgba(167,139,250,0.20)' }}
                >
                  <Frame size={12} className="shrink-0" />
                  <span>Figma</span>
                  <ExternalLink size={9} className="shrink-0 opacity-60" />
                </a>
              )}
              {f.uxStatus && (
                <span
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ background: 'rgba(236,72,153,0.08)', color: '#db2777', border: '1px solid rgba(236,72,153,0.20)' }}
                >
                  <Palette size={12} className="shrink-0" />
                  <span>UX: {f.uxStatus}</span>
                </span>
              )}
            </div>
          )}

          <div className="glass-strong rounded-xl p-5 flex flex-col gap-5">
            {/* Description: Jira description, or fallback to requirements link hint */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Description</div>
              {f.summary ? (
                <p className="text-[13px] text-muted-foreground leading-[1.65] whitespace-pre-line">{f.summary}</p>
              ) : f.requirementsUrl ? (
                <a href={f.requirementsUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <FileText size={11} />View in Requirements Doc
                </a>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">No description provided.</p>
              )}
            </div>

            {f.customerProblem && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Customer Problem</div>
                <p className="text-[13px] text-muted-foreground leading-[1.65]">{f.customerProblem}</p>
              </div>
            )}

            {f.businessValue && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Business Value</div>
                <div className="rounded-lg bg-brand-green/5 border border-brand-green/15 p-3 text-[13px] text-muted-foreground leading-[1.65]">
                  {f.businessValue}
                </div>
              </div>
            )}

            {f.useCase && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Use Case</div>
                <p className="text-[13px] text-muted-foreground leading-[1.65] italic">{f.useCase}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Ownership</div>
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
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Details</div>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Component</span>
                    <span className="font-semibold" style={{ color: pillarColor(f.pillar as Pillar) }}>
                      {(f.components?.length ? f.components : [f.productComponent]).join(', ')}
                    </span>
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

            {f.customers.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                  Customers ({f.customers.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.customers.map(c => <Badge key={c} variant="muted">{c}</Badge>)}
                </div>
              </div>
            )}
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

// ── Inline-editable note cell ────────────────────────────────────────────────
function NoteCell({ jiraKey, notes, onSave }: {
  jiraKey: string;
  notes: Record<string, string>;
  onSave: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(notes[jiraKey] ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit(e?: React.FocusEvent | React.KeyboardEvent) {
    e?.stopPropagation();
    setEditing(false);
    onSave(jiraKey, draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === 'Enter') commit(e);
    if (e.key === 'Escape') { setEditing(false); }
  }

  if (editing) {
    return (
      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder="Add customer…"
          className="w-full min-w-[180px] rounded border border-primary/40 bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          style={{ fontFamily: 'var(--f-ui)' }}
        />
      </td>
    );
  }

  const text = notes[jiraKey];
  return (
    <td className="px-4 py-3.5" onClick={startEdit}>
      {text ? (
        <span
          className="text-[13px] text-foreground cursor-text max-w-[200px] truncate block"
          title={text}
        >
          {text}
        </span>
      ) : (
        <span className="text-[12px] text-muted-foreground/40 cursor-text italic">—</span>
      )}
    </td>
  );
}

export default function FeaturesPage() {
  const { features, loading, error, refetch } = useFeatures();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRelease, setFilterRelease] = useState('');
  const [filterPillar, setFilterPillar] = useState<string>('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterPM, setFilterPM] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterRisk, setFilterRisk] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(false);
  const [filterNpiIt, setFilterNpiIt] = useState(false);
  const [filterBacklog, setFilterBacklog] = useState(false);
  const [backlogFeatures, setBacklogFeatures] = useState<Feature[]>([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [anchorFeatures, setAnchorFeatures] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Feature | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<string>('Component');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [kanbanOrder, setKanbanOrder] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!filterBacklog) return;
    if (backlogFeatures.length > 0) return;
    setBacklogLoading(true);
    fetch(`${API_BASE}/api/features/backlog`)
      .then(r => r.json())
      .then(data => setBacklogFeatures(data as Feature[]))
      .catch(() => {})
      .finally(() => setBacklogLoading(false));
  }, [filterBacklog, backlogFeatures.length]);

  const { syncTick } = useApp();

  useEffect(() => {
    setKanbanOrder([]);
  }, [syncTick]);

  useEffect(() => {
    if (filterStatus !== 'concept') return;
    if (kanbanOrder.length > 0) return;
    fetch(`${API_BASE}/api/features/kanban-order`)
      .then(r => r.json())
      .then(data => setKanbanOrder(data as string[]))
      .catch(() => {});
  }, [filterStatus, kanbanOrder.length]);

  useEffect(() => {
    fetch(`${API_BASE}/api/notes`)
      .then(r => r.json())
      .then(data => setNotes(data as Record<string, string>))
      .catch(() => {});
  }, []);

  // X.Y.Z = cc-label release (concept); X.Y = fixVersion release (ec/delivered)
  const isConceptRelease = (r: string) => /^\d+\.\d+\.\d+$/.test(r);
  const conceptReleaseOptions = [...new Set(
    features.filter(f => f.status === 'concept').flatMap(f => f.releases).filter(isConceptRelease)
  )].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const regularReleaseOptions = [...new Set(
    features.flatMap(f => f.releases).filter(r => !isConceptRelease(r))
  )].sort();

  // Auto-select the first concept release when Concept status is chosen; clear when leaving
  useEffect(() => {
    if (filterStatus === 'concept') {
      setFilterRelease(conceptReleaseOptions[0] ?? '');
    } else if (isConceptRelease(filterRelease)) {
      setFilterRelease('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const saveNote = useCallback((key: string, value: string) => {
    setNotes(prev => {
      const next = { ...prev };
      if (value.trim()) next[key] = value.trim(); else delete next[key];
      return next;
    });
    fetch(`${API_BASE}/api/notes/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: value }),
    }).catch(() => {});
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-brand-red">Error loading features: {error}</div>;

  // Combine Jira customers with free-form note values (split on comma) for the filter dropdown
  const noteCustomers = Object.values(notes).flatMap(v => v.split(',').map(s => s.trim()).filter(Boolean));
  const ALL_CUSTOMERS = [...new Set([...features.flatMap(f => f.customers), ...noteCustomers])].sort();

  const isPrdReviewed = (f: Feature) => {
    const rev = f.prdReviewed ?? [];
    return rev.some(v => v === 'QA Reviewed' || v === 'Dev Reviewed') || rev.includes('Not Needed');
  };
  const isCcRisk = (f: Feature) => f.atRisk || !isPrdReviewed(f);

  const sourceFeatures = filterBacklog ? backlogFeatures : features;

  const filtered = sourceFeatures.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        f.title.toLowerCase().includes(q) ||
        f.jiraKey.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.businessValue.toLowerCase().includes(q) ||
        f.customerProblem.toLowerCase().includes(q) ||
        f.customers.some(c => c.toLowerCase().includes(q)) ||
        (notes[f.jiraKey] ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (!filterBacklog && filterStatus && f.status !== filterStatus) return false;
    if (!filterBacklog && filterRelease && !f.releases.includes(filterRelease)) return false;
    if (filterPillar && f.pillar !== filterPillar) return false;
    if (filterComponent && f.productComponent !== filterComponent) return false;
    if (filterPM && f.pmOwner !== filterPM) return false;
    if (filterTeam && f.engTeam !== filterTeam) return false;
    if (filterCustomer) {
      const noteVal = notes[f.jiraKey] ?? '';
      const noteCustomerList = noteVal.split(',').map(s => s.trim()).filter(Boolean);
      if (!f.customers.includes(filterCustomer) && !noteCustomerList.includes(filterCustomer)) return false;
    }
    if (!filterBacklog && filterRisk && !isCcRisk(f)) return false;
    if (!filterBacklog && filterAnchor && !anchorFeatures.has(f.id) && !f.labels.includes('anchor')) return false;
    if (!filterBacklog && filterNpiIt && !(f.components ?? []).includes('NPI-IT')) return false;
    return true;
  });

  const hasFilters = !!(search || filterStatus || filterRelease || filterPillar || filterComponent || filterPM || filterTeam || filterCustomer || filterRisk || filterAnchor || filterNpiIt || filterBacklog);

  function toggleAnchor(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setAnchorFeatures(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const prdSortKey = (f: Feature): string => {
    const rev = f.prdReviewed ?? [];
    if (rev.some(v => v === 'QA Reviewed' || v === 'Dev Reviewed')) return '0';
    if (rev.includes('Not Needed')) return '1';
    if (f.prdStatus !== 'none') return `2_${f.prdStatus}`;
    return '3';
  };

  const useKanbanOrder = filterStatus === 'concept' && kanbanOrder.length > 0;

  const sorted = [...filtered].sort((a, b) => {
    if (useKanbanOrder) {
      const ai = kanbanOrder.indexOf(a.jiraKey);
      const bi = kanbanOrder.indexOf(b.jiraKey);
      // Issues not on the board go to the end
      const an = ai === -1 ? Infinity : ai;
      const bn = bi === -1 ? Infinity : bi;
      return an - bn;
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortCol) {
      case 'Jira':      return a.jiraKey.localeCompare(b.jiraKey) * dir;
      case 'Feature':   return a.title.localeCompare(b.title) * dir;
      case 'Status':    return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * dir;
      case 'PRD':       return prdSortKey(a).localeCompare(prdSortKey(b)) * dir;
      case 'Release':   return (a.releases[0] ?? '').localeCompare(b.releases[0] ?? '') * dir;
      case 'Component': return a.productComponent.localeCompare(b.productComponent) * dir;
      case 'PM':        return a.pmOwner.localeCompare(b.pmOwner) * dir;
      default:          return 0;
    }
  });

  const groups: [string, Feature[]][] = (PILLARS as Pillar[])
    .map(p => [p, sorted.filter(f => f.pillar === p)] as [string, Feature[]])
    .filter(([, items]) => items.length > 0);

  return (
    <div className="animate-fade-in">
      {showIntake && <IntakePanel onClose={() => setShowIntake(false)} onCreated={refetch} />}
      {selected && <FeatureDetail f={selected} onClose={() => setSelected(null)} />}

      {/* Page header — editorial masthead style */}
      <div className="flex items-start justify-between mb-3">
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '42px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.01em' }}>Feature Tracker</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportToCSV(filtered, 'features')}>
            <Download size={11} />Export
          </Button>
          <Button size="sm" onClick={() => setShowIntake(true)}>+ New Feature</Button>
        </div>
      </div>

      {/* Filter strip — no Card wrapper */}
      <div className="flex flex-wrap gap-2 items-center mb-7 pb-4 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            ref={searchRef}
            className="pl-7 w-52"
            placeholder="Search features… (/ to focus)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {!filterBacklog && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_ORDER
                .filter(s => !['committed', 'indev', 'validation', 'deferred'].includes(s))
                .map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {!filterBacklog && (
          <Select value={filterRelease} onValueChange={setFilterRelease}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Release" /></SelectTrigger>
            <SelectContent>
              {(filterStatus === 'concept' ? conceptReleaseOptions : regularReleaseOptions).map(r => (
                <SelectItem key={r} value={r}>{filterStatus === 'concept' ? `Concept-${r}` : r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterPillar} onValueChange={setFilterPillar}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Pillar" /></SelectTrigger>
          <SelectContent>
            {PILLARS.map(p => <SelectItem key={p} value={p}>{p.split('&')[0].trim()}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterComponent} onValueChange={setFilterComponent}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Component" /></SelectTrigger>
          <SelectContent>
            {PRODUCT_COMPONENTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPM} onValueChange={setFilterPM}>
          <SelectTrigger className="w-32"><SelectValue placeholder="PM" /></SelectTrigger>
          <SelectContent>
            {[...new Set(features.map(f => f.pmOwner))].sort().map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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

        <Button
          variant={filterAnchor ? 'outline' : 'outline'}
          size="sm"
          onClick={() => setFilterAnchor(v => !v)}
          className="gap-1.5"
          style={filterAnchor ? { borderColor: '#f59e0b60', color: '#f59e0b' } : undefined}
        >
          <Anchor size={13} strokeWidth={2} />Anchored{anchorFeatures.size > 0 && ` (${anchorFeatures.size})`}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterNpiIt(v => !v)}
          className="gap-1.5"
          style={filterNpiIt ? { borderColor: '#a78bfa60', color: '#a78bfa' } : undefined}
        >
          <ClipboardList size={13} strokeWidth={2} />NPI/IT
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterBacklog(v => !v)}
          className="gap-1.5"
          style={filterBacklog ? { borderColor: '#6366f160', color: '#6366f1', background: 'rgba(99,102,241,0.06)' } : undefined}
        >
          {backlogLoading ? <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> : <Inbox size={12} />}
          Backlog
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setFilterStatus('');
              setFilterRelease('');
              setFilterPillar('');
              setFilterComponent('');
              setFilterPM('');
              setFilterTeam('');
              setFilterCustomer('');
              setFilterRisk(false);
              setFilterAnchor(false);
              setFilterNpiIt(false);
              setFilterBacklog(false);
            }}
          >
            <X size={11} />Clear
          </Button>
        )}

      </div>

      {/* Feature count */}
      <div className="px-4 pb-1 flex items-center gap-2">
        <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
          {filterBacklog && backlogLoading
            ? 'Loading backlog…'
            : <>{filtered.length} feature{filtered.length !== 1 ? 's' : ''}{filterBacklog && ' in backlog'}{!filterBacklog && hasFilters && <span className="ml-1 opacity-60">matching filters</span>}</>
          }
        </span>
        {useKanbanOrder && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(79,142,247,0.10)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.20)' }}>
            Ordered by sdwan-7.1.1-cc board
          </span>
        )}
      </div>

      {/* Feature groups */}
      {groups.map(([groupName, items]) => {
        const groupColor = pillarColor(groupName as Pillar);
        const isCollapsed = collapsed.has(groupName);
        return (
          <div key={groupName} className="mb-6">
            <button
              className="flex items-center gap-3 mb-4 w-full text-left"
              onClick={() => setCollapsed(prev => {
                const next = new Set(prev);
                next.has(groupName) ? next.delete(groupName) : next.add(groupName);
                return next;
              })}
            >
              {groupColor && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: groupColor }} />
              )}
              <span
                className="text-[11px] font-black uppercase tracking-widest"
                style={groupColor ? { color: groupColor } : { color: 'hsl(215 20% 45%)' }}
              >
                {groupName}
              </span>
              <ChevronDown
                size={13}
                style={{
                  color: groupColor ?? 'rgba(0,0,0,0.3)',
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                  flexShrink: 0,
                }}
              />
              <div className="editorial-divider flex-1" />
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
                style={groupColor
                  ? { background: `${groupColor}1a`, color: groupColor, border: `1px solid ${groupColor}33` }
                  : { background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.08)' }
                }
              >
                {(items as Feature[]).length}
              </span>
            </button>

            {!isCollapsed && <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b border-black/[0.09]"
                      style={{ background: groupColor ? `${groupColor}12` : 'rgba(0,0,0,0.03)' }}
                    >
                      <th className="pl-4 pr-1 py-3 w-8" />
                      {['Jira', 'Feature', ...(!filterBacklog ? ['Status'] : []), 'PRD', ...(!filterBacklog ? ['Release'] : []), 'Component', 'PM', 'Customer'].map(h => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground select-none transition-colors ${h === 'Notes' ? '' : 'cursor-pointer hover:text-foreground'}`}
                          onClick={() => {
                            if (h === 'Notes') return;
                            if (sortCol === h) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortCol(h); setSortDir('asc'); }
                          }}
                        >
                          <span className="inline-flex items-center gap-1">
                            {h}
                            {h !== 'Notes' && (sortCol === h
                              ? <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                              : <span className="text-[10px] opacity-25">⇅</span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(items as Feature[]).map((f, i) => (
                      <tr
                        key={f.id}
                        onClick={() => setSelected(f)}
                        className="cursor-pointer hover:bg-black/[0.03] transition-colors"
                        style={{
                          ...(i > 0 ? { borderTop: '1px solid rgba(0,0,0,0.06)' } : {}),
                          ...(f.atRisk ? { background: 'rgba(244,63,94,0.05)' } : {}),
                        }}
                      >
                        <td className="pl-4 pr-1 py-3.5">
                          {(anchorFeatures.has(f.id) || f.labels.includes('anchor')) && (
                            <button
                              onClick={e => toggleAnchor(f.id, e)}
                              className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:bg-black/[0.06]"
                              title="Remove anchor"
                            >
                              <Anchor
                                size={14}
                                strokeWidth={2.5}
                                style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b90)' }}
                              />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-black text-[12px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ed-accent)' }}>
                            {f.jiraKey}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[300px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">{f.title}</span>
                            {f.atRisk && <AlertTriangle size={12} className="text-brand-red shrink-0" />}
                          </div>
                        </td>
                        {!filterBacklog && (
                          <td className="px-4 py-3.5">
                            <StatusBadge status={f.status} release={f.releases[0]} />
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          {(() => {
                            const rev = f.prdReviewed ?? [];
                            const isReviewed = rev.some(v => v === 'QA Reviewed' || v === 'Dev Reviewed');
                            const isNotNeeded = rev.includes('Not Needed');
                            if (isReviewed) {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold" style={{ background: 'rgba(0,200,150,0.15)', color: '#00a878', border: '1px solid rgba(0,200,150,0.35)' }}>Reviewed</span>;
                            }
                            if (isNotNeeded) {
                              return <Badge variant="muted">Not Needed</Badge>;
                            }
                            if (f.prdStatus !== 'none') {
                              return <PrdStatusBadge status={f.prdStatus} />;
                            }
                            return (
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold"
                                style={{ background: 'rgba(244,63,94,0.15)', color: '#e02d4f', border: '1px solid rgba(244,63,94,0.35)' }}
                              >
                                Not Reviewed
                              </span>
                            );
                          })()}
                        </td>
                        {!filterBacklog && (
                          <td className="px-4 py-3.5 text-[12px] font-medium text-muted-foreground tabular-nums">
                            {(f.status === 'ec' || f.status === 'delivered') ? f.releases.map(r => `v${r}`).join(', ') : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-[13px]" style={{ color: pillarColor(f.pillar as Pillar) }}>
                            {(f.components?.length ? f.components : [f.productComponent]).join(', ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-foreground font-medium">{f.pmOwner}</td>
                        <NoteCell jiraKey={f.jiraKey} notes={notes} onSave={saveNote} />
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(items as Feature[]).length === 0 && (
                  <div className="py-10 text-center text-muted-foreground text-sm">No features match filters</div>
                )}
              </div>
            </div>}
          </div>
        );
      })}
    </div>
  );
}
