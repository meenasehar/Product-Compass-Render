import { ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { useApp, type Page } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const NAV: { id: Page; label: string }[] = [
  { id: 'features',  label: 'Feature Tracker' },
  { id: 'action',    label: 'Action Center' },
  { id: 'ccdeck',    label: 'Go-to-Market' },
];

export default function Sidebar() {
  const { page, setPage, syncing, lastSyncedAt, triggerSync } = useApp();
  const { user, logout } = useAuth();

  return (
    <aside
      className="flex flex-col shrink-0 h-screen"
      style={{
        width: '248px',
        background: 'var(--sb-bg)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Wordmark */}
      <div style={{ padding: '30px 24px 24px' }}>
        <div
          style={{
            fontFamily: 'var(--f-display)',
            fontWeight: 800,
            fontSize: '26px',
            color: '#F0EBE0',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          Product Compass
        </div>
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(240,235,224,0.50)',
            marginTop: '6px',
          }}
        >
          Prisma SD-WAN
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 0' }}>
        {NAV.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 24px 12px 21px',
                fontFamily: 'var(--f-sans)',
                fontSize: '15px',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.005em',
                background: active ? 'rgba(174,71,22,0.18)' : 'transparent',
                color: active ? '#F09060' : 'rgba(240,235,224,0.60)',
                cursor: 'pointer',
                transition: 'all 0.12s',
                border: 'none',
                outline: 'none',
                borderLeft: active ? '3px solid #D45A1A' : '3px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(240,235,224,0.90)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(240,235,224,0.60)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 22px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Sync */}
        <button
          onClick={triggerSync}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            width: '100%',
            marginBottom: '10px',
            fontFamily: 'var(--f-mono)',
            fontSize: '10px',
            letterSpacing: '0.05em',
            color: syncing ? '#D97A50' : 'rgba(212,207,197,0.40)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.12s',
          }}
          title="Force sync from Jira"
        >
          <RefreshCw
            size={11}
            style={{
              flexShrink: 0,
              animation: syncing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{syncing ? 'Syncing…' : 'Sync Jira'}</span>
          {lastSyncedAt && !syncing && (
            <span style={{ marginLeft: 'auto', color: 'rgba(212,207,197,0.25)' }}>
              {relativeTime(lastSyncedAt)}
            </span>
          )}
        </button>

        {/* External Jira link */}
        <a
          href="https://jira-dc.paloaltonetworks.com/projects/PSDWPM"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontFamily: 'var(--f-mono)',
            fontSize: '10px',
            letterSpacing: '0.05em',
            color: 'rgba(212,207,197,0.38)',
            textDecoration: 'none',
            marginBottom: '12px',
            transition: 'color 0.12s',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--ed-green)',
              flexShrink: 0,
            }}
          />
          PSDWPM
          <ExternalLink size={9} style={{ marginLeft: 'auto' }} />
        </a>

        {/* User */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0 }}
                referrerPolicy="no-referrer"
              />
            )}
            <span
              style={{
                fontFamily: 'var(--f-sans)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(212,207,197,0.45)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(212,207,197,0.30)',
                padding: 0,
                flexShrink: 0,
                transition: 'color 0.12s',
              }}
              title="Sign out"
            >
              <LogOut size={11} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
