import { useState } from 'react';
import { X } from 'lucide-react';

interface Step {
  title: string;
  body: React.ReactNode;
}

function StepItem({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
        style={{ background: 'rgba(79,142,247,0.14)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}
      >
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-foreground mb-1">{title}</div>
        <div className="text-[12px] text-muted-foreground leading-relaxed">{body}</div>
      </div>
    </div>
  );
}


function HelpTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full mt-3 text-[11px]" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'rgba(79,142,247,0.07)', borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
          <th className="text-left px-3 py-2 font-bold text-foreground">Swimlane</th>
          <th className="text-left px-3 py-2 font-bold text-foreground">Jira Components</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([swimlane, components], i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
            <td className="px-3 py-2 font-semibold text-foreground align-top">{swimlane}</td>
            <td className="px-3 py-2 text-muted-foreground">{components}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const SWIMLANE_TABLE: [string, string][] = [
  ['Next Gen Platforms & Compliance', 'Hardware, Licensing, Compliance, Scale'],
  ['AI/Agentic Experience & Operations', 'Cloudblades, Controller, Supportability, UI, Agentic Network Operations'],
  ['On-Box Security & SASE', 'SASE, Branch Security'],
  ['Scalable Networking', 'Routing, VPN, High Availability'],
];

const PM_STEPS: Step[] = [
  {
    title: 'Create the Jira in PSDWPM',
    body: 'Go to the Prisma SD-WAN Product Management project (PSDWPM). Create a new issue with type New Feature. Set the Priority (P1–P4) to reflect business impact.',
  },
  {
    title: 'Add the Release Label',
    body: 'In the Labels field, add the release tag that matches the target CC release — for example sdwan-7.1.1-cc. This is what makes the feature appear on the 7.1.1 CC board view. Without this label it will not show up.',
  },
  {
    title: 'Link the PRD',
    body: 'Paste the Confluence PRD link into the Requirements field. This surfaces as the ↗ PRD link on the board. Every feature should have a PRD — if one doesn\'t exist yet, create it before adding the Jira to the board.',
  },
  {
    title: 'Mark PRD Review Status',
    body: 'Use the PRD Reviewed field to track sign-off. Check Dev Reviewed once the engineering lead has signed off, and QA Reviewed once QA has confirmed testability. Both checked = green dot on the board. If no review is needed (e.g. carry-over), check Not Needed.',
  },
  {
    title: 'Label Anchor Features',
    body: 'If this is a key delivery commitment for the release, add the label anchor. Anchor features appear with an ⚓ icon and a gold left border on the board so they stand out at a glance.',
  },
  {
    title: 'Stack Rank (Directors)',
    body: 'PM Directors use the Jira Kanban board to drag and re-order features within each swimlane. The board here reflects that rank order — top of the list = highest priority.',
  },
  {
    title: 'Mark as Resolved When Done',
    body: 'Once a feature ships, either PM or Engineering should set the Jira status to Resolved. This turns the dot green (Delivered) on the board.',
  },
  {
    title: 'Component → Swimlane Mapping',
    body: (
      <>
        The Component field in Jira determines which swimlane a feature appears in on this board. Set the component correctly or the feature will not route to the right group.
        <HelpTable rows={SWIMLANE_TABLE} />
      </>
    ),
  },
  {
    title: 'NPI & IT Cross-Functional Features',
    body: (
      <>
        If your feature requires involvement from the NPI or IT team, you must complete all three of the following steps in Jira — otherwise the feature will not appear on the NPI &amp; IT tab and the IT team will not have visibility:
        <table className="w-full mt-3 text-[11px]" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['IT Cross-Functional Dependencies field', 'Select Yes'],
              ['Component', 'Add NPI-IT as a component on the Jira issue'],
              ['Additional Information field', 'Paste the Asana project link — used to pull live IT Status from Asana and display it on the NPI & IT board'],
            ].map(([field, action], i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                <td className="px-3 py-2 font-semibold text-foreground align-top w-[45%]">{field}</td>
                <td className="px-3 py-2 text-muted-foreground">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  },
];

const ENG_STEPS: Step[] = [
  {
    title: 'Set the Fix Version When Picking Up a Feature',
    body: 'When your team commits to delivering a feature, set the Fix Version in Jira to the target release (e.g. 7.1.1, 7.0.1). This is the signal that work has started — the board will show a blue In Progress dot. Features with no fix version show as gray Not Started.',
  },
  {
    title: 'Add the Functional Spec URL',
    body: 'Paste the link to your functional spec (Confluence or Google Doc) into the Functional Spec field on the Jira. This gives PM and QA a direct reference to the engineering design without having to chase it down separately. Add it as early as possible — ideally before coding begins.',
  },
  {
    title: 'Link the Test Plan',
    body: 'Add a link to your test plan in the Test Plan field or as a linked issue. This is required before a feature can be marked as ready for QA. If a test plan doesn\'t exist yet, flag it in the Jira comments so QA can help create one.',
  },
  {
    title: 'Delivery via EC or Agile',
    body: 'Features can be delivered through the standard EC (Engineering Commit) process or via an Agile sprint release. Either path is fine — the fix version field is the only signal the board needs. Make sure it reflects the actual release the feature will ship in.',
  },
  {
    title: 'Resolve When Shipped',
    body: 'Once the feature is released, set the Jira to Resolved. Either Engineering or PM can do this. The board will immediately show a green Delivered dot on the next refresh.',
  },
];

const ENG_OWNERSHIP_TABLE: [string, string][] = [
  ['Fix Version', 'Set when your team commits to delivering the feature'],
  ['Functional Spec', 'Link to engineering design doc (Confluence or Google Doc)'],
  ['Test Plan', 'Link to test plan or linked issue'],
  ['Status / Resolution', 'Set to Resolved once the feature ships'],
];

type Tab = 'pm' | 'eng';

export default function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('pm');

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: '520px',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--surface, #fdfcf9)',
          borderLeft: '1px solid rgba(0,0,0,0.10)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(0,0,0,0.09)' }}
        >
          <div style={{ flex: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div
                  style={{
                    fontFamily: 'var(--f-display, serif)',
                    fontWeight: 800,
                    fontSize: '18px',
                    color: 'var(--ink, #1c1a17)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  How to Use This Board
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-mono, monospace)',
                    fontSize: '10px',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.35)',
                    marginTop: '3px',
                  }}
                >
                  Prisma SD-WAN Feature Tracker
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-black/[0.06] shrink-0"
                style={{ color: 'rgba(0,0,0,0.40)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-0">
              {([['pm', 'Product Management'], ['eng', 'Engineering']] as [Tab, string][]).map(([id, label]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    style={{
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: active ? 700 : 500,
                      fontFamily: 'var(--f-sans, sans-serif)',
                      color: active ? 'var(--ink, #1c1a17)' : 'rgba(0,0,0,0.40)',
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid #4f8ef7' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      marginBottom: '-1px',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.70)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.40)'; }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
          {tab === 'pm' && (
            <div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-6">
                Product Managers are responsible for creating and maintaining Jira features and keeping PRD review status current.
              </p>
              <div className="flex flex-col gap-5">
                {PM_STEPS.map((s, i) => (
                  <StepItem key={i} n={i + 1} title={s.title} body={s.body} />
                ))}
              </div>
            </div>
          )}

          {tab === 'eng' && (
            <div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-6">
                Engineering uses Jira updates as signals to the board — no extra tooling needed. A few key fields keep the board accurate and useful for the whole team.
              </p>
              <div className="flex flex-col gap-5">
                {ENG_STEPS.map((s, i) => (
                  <StepItem key={i} n={i + 1} title={s.title} body={s.body} />
                ))}
              </div>
              <div
                className="mt-6 rounded-lg p-4"
                style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)' }}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Fields Engineering Owns</div>
                <HelpTable rows={ENG_OWNERSHIP_TABLE} />
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  Engineering does not need to manage labels, PRD links, or stack rank — those are PM responsibilities.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
