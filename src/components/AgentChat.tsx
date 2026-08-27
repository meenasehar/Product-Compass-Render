import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, X } from 'lucide-react';
import { useFeatures } from '@/hooks/useFeatures';
import { pillarColor, type Feature, type Pillar } from '@/data/features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// API calls go through the server-side proxy at /api/chat

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(features: Feature[]): string {
  const featuresJson = JSON.stringify(
    features.map(f => ({
      id: f.id,
      jiraKey: f.jiraKey,
      title: f.title,
      status: f.status,
      pillar: f.pillar,
      productComponent: f.productComponent,
      pmOwner: f.pmOwner,
      engOwner: f.engOwner,
      engTeam: f.engTeam,
      releases: f.releases,
      customers: f.customers,
      priority: f.priority,
      effort: f.effort,
      atRisk: f.atRisk,
      riskReason: f.riskReason ?? null,
      summary: f.summary,
      customerProblem: f.customerProblem,
      businessValue: f.businessValue,
      useCase: f.useCase,
    })),
    null,
    2
  );

  return `You are the Product Intelligence Agent for Prisma SD-WAN at Palo Alto Networks. You have deep knowledge of the product's feature tracker and competitive landscape. Be concise and precise.

## Feature Tracker (${features.length} features)
${featuresJson}

## Competitive Landscape

**Competitors:** Cisco Catalyst SD-WAN, Arista Velocloud, HPE Networking EdgeConnect, Fortinet

**Move types:** Advancing (threat — meaningful capability shipped, requires response) | Incremental (limited/narrow progress, manageable) | No Move (gap — we maintain or extend lead)

**Pillar: Intelligent Traffic Steering**
- Catalyst: vAnalytics 3.0 with ML-based path selection → Advancing
- Arista: WAN telemetry improvements → Incremental; lacks multi-cloud depth
- HPE: No meaningful update → No Move; EdgeConnect hybrid WAN lags on AI
- Fortinet: Security-first routing convergence → Incremental; thin on WAN orchestration

**Pillar: Autonomous Operations & AIOps**
- Catalyst: Cisco AI Assistant for Networking GA → Advancing; direct AIOps rival
- Arista: CloudVision enhancements → Incremental; narrower scope
- HPE: No notable release → No Move
- Fortinet: FortiAIOps limited WAN scope → Incremental

**Pillar: Cloud & Application Experience**
- Catalyst: SSE + SD-WAN policy convergence under one license → Advancing; major threat
- Arista: Multi-cloud routing improvements → Incremental; limited SaaS optimization
- HPE: Greenlake integration → Incremental; cloud-first story nascent
- Fortinet: SASE bundle expansion → Advancing; security-integrated WAN gaining traction

**Pillar: Security & Zero Trust**
- Catalyst: SD-WAN + Catalyst Center microsegmentation → Incremental
- Arista: CloudGuard partnership → Incremental; not native
- HPE: Aruba ClearPass integration → Incremental; network access focus
- Fortinet: FortiSASE deeply integrated → Advancing; strongest SASE competitor

**Our Key Advantages:** End-to-end AIOps with ADEM (Autonomous Digital Experience Management), native Panorama integration for unified security policy, best-in-class multi-cloud fabric, purpose-built SASE convergence with Prisma Access. Prisma SD-WAN pioneered cloud-delivered SD-WAN; our data platform breadth exceeds all four competitors.

## Release Context (PANW FY: Q1=Aug–Oct, Q2=Nov–Jan, Q3=Feb–Apr, Q4=May–Jul)
- v6.5 GA → Q4 FY25 | v6.6 GA → Q1 FY26
- v7.0 Upcoming → Q4 FY26 (main active development)
- v7.1 Planned → Q2 FY27
- Today: August 2026

## How to Respond
- Be concise. Bullet points for lists. Under 250 words unless depth is needed.
- For competitive questions, cite specific competitor moves and our advantages.
- When the user asks you to improve or rewrite a feature field (summary, customerProblem, businessValue, useCase, title), output a suggestion block so the UI can offer to apply it:

\`\`\`feature-update
{"id": "<feature-id>", "field": "<field-name>", "value": "<new content>"}
\`\`\`

Only output one block per field change. Use the exact feature id from the data above.`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  pending?: boolean;
}

interface UpdateBlock {
  id: string;
  field: string;
  value: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseUpdateBlocks(text: string): UpdateBlock[] {
  const regex = /```feature-update\n([\s\S]*?)```/g;
  const results: UpdateBlock[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (parsed.id && parsed.field && parsed.value !== undefined) {
        results.push(parsed as UpdateBlock);
      }
    } catch { /* ignore */ }
  }
  return results;
}

function renderLine(line: string, key: number) {
  const isBullet = line.startsWith('- ') || line.startsWith('• ');
  const raw = isBullet ? line.slice(2) : line;

  const parts = raw.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={j} className="text-foreground/90 font-semibold">{p.slice(2, -2)}</strong>
      : <span key={j}>{p}</span>
  );

  if (isBullet) {
    return (
      <div key={key} className="flex gap-2 items-start">
        <span className="text-muted-foreground/40 shrink-0 mt-px">•</span>
        <span>{parts}</span>
      </div>
    );
  }
  return <div key={key}>{parts}</div>;
}

// ── MessageContent ────────────────────────────────────────────────────────────

function MessageContent({
  text,
  features,
  onApply,
}: {
  text: string;
  features: Feature[];
  onApply: (block: UpdateBlock) => void;
}) {
  const updates = parseUpdateBlocks(text);
  const displayText = text.replace(/```feature-update[\s\S]*?```/g, '').trim();
  const lines = displayText.split('\n');

  return (
    <div className="space-y-3">
      <div className="text-xs leading-relaxed text-muted-foreground space-y-1">
        {lines.map((line, i) =>
          line === '' ? <div key={i} className="h-1" /> : renderLine(line, i)
        )}
      </div>

      {updates.map((u, i) => {
        const feature = features.find(f => f.id === u.id);
        const color = feature ? pillarColor(feature.pillar as Pillar) : '#4f8ef7';
        return (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-primary mb-1">Suggested Edit</div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {feature && (
                    <span className="font-bold" style={{ color }}>{feature.jiraKey}</span>
                  )}
                  <span>·</span>
                  <span className="font-semibold text-foreground">{u.field}</span>
                </div>
              </div>
              <Button size="sm" className="h-7 px-3 text-[11px]" onClick={() => onApply(u)}>
                Apply
              </Button>
            </div>
            <div
              className="text-[11px] text-muted-foreground leading-relaxed rounded-lg px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {u.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AgentChat ─────────────────────────────────────────────────────────────────

export default function AgentChat({ onClose }: { onClose?: () => void }) {
  const { features } = useFeatures();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const systemPrompt = useRef('');

  useEffect(() => {
    if (features.length === 0) return;
    systemPrompt.current = buildSystemPrompt(features);
    if (messages.length === 0) {
      setMessages([{
        id: 'intro',
        role: 'assistant',
        content: `Hi! I'm your Product Intelligence Agent — I have full context on all ${features.length} features in the tracker and the competitive landscape across Cisco, Arista, HPE, and Fortinet.\n\nTry asking:\n- **"What features are at risk in v7.0?"**\n- **"How do we stack up against Fortinet on Zero Trust?"**\n- **"Summarize features owned by [PM name]"**\n- **"Rewrite the business value for [Jira key]"**`,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function applyUpdate(block: UpdateBlock) {
    const feature = features.find(f => f.id === block.id);
    setAppliedCount(c => c + 1);
    const confirmMsg: Message = {
      id: `confirm-${Date.now()}`,
      role: 'assistant',
      content: `✓ Applied **${block.field}** update for ${feature?.jiraKey ?? block.id}. Change is in-session — export via Feature Tracker to persist.`,
    };
    setMessages(prev => [...prev, confirmMsg]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', pending: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    // Build history excluding the intro and pending placeholder
    const history = messages
      .filter(m => m.id !== 'intro' && !m.pending)
      .map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text });

    try {
      const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          stream: true,
          system: systemPrompt.current,
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta &&
              (parsed.delta as Record<string, unknown>).type === 'text_delta'
            ) {
              accumulated += (parsed.delta as Record<string, unknown>).text as string;
              setMessages(prev =>
                prev.map(m => (m.id === assistantId ? { ...m, content: accumulated } : m))
              );
            }
          } catch { /* ignore parse errors */ }
        }
      }

      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, pending: false } : m))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, content: `Error: ${msg}`, pending: false } : m
        )
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: 'rgba(8,10,28,0.97)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #4f8ef722 0%, #7c3aed22 100%)',
            border: '1px solid rgba(79,142,247,0.28)',
          }}
        >
          <Sparkles size={13} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground">Product Intelligence Agent</div>
          <div className="text-[10px] text-muted-foreground">
            {features.length} features · Cisco · Arista · HPE · Fortinet
          </div>
        </div>
        {appliedCount > 0 && (
          <Badge variant="blue" className="text-[9px] shrink-0">
            {appliedCount} edit{appliedCount > 1 ? 's' : ''} applied
          </Badge>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={
                msg.role === 'assistant'
                  ? {
                      background: 'linear-gradient(135deg, #4f8ef730 0%, #7c3aed30 100%)',
                      border: '1px solid rgba(79,142,247,0.3)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.11)',
                    }
              }
            >
              {msg.role === 'assistant' ? (
                <Bot size={11} className="text-primary" />
              ) : (
                <User size={11} className="text-muted-foreground" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={cn('max-w-[82%] rounded-2xl px-4 py-3')}
              style={
                msg.role === 'user'
                  ? {
                      background: 'rgba(79,142,247,0.11)',
                      border: '1px solid rgba(79,142,247,0.2)',
                    }
                  : undefined
              }
            >
              {/* Typing indicator */}
              {msg.pending && msg.content === '' ? (
                <div className="flex items-center gap-1.5 py-0.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              ) : msg.role === 'user' ? (
                <div className="text-xs text-foreground">{msg.content}</div>
              ) : (
                <MessageContent text={msg.content} features={features} onApply={applyUpdate} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            placeholder="Ask about features, competitive gaps, or request content edits…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              maxHeight: '120px',
              lineHeight: '1.5',
            }}
          />
          <Button
            size="icon"
            disabled={!input.trim() || loading}
            onClick={sendMessage}
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            <Send size={13} />
          </Button>
        </div>

      </div>
    </div>
  );
}
