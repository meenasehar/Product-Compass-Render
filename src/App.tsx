import { useState } from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';
import { AppProvider, useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import AgentChat from '@/components/AgentChat';
import HelpModal from '@/components/HelpModal';
import LoginPage from '@/pages/LoginPage';
import FeaturesPage from '@/pages/FeaturesPage';
import BacklogPage from '@/pages/BacklogPage';
import RoadmapPage from '@/pages/RoadmapPage';
import ActionCenterPage from '@/pages/ActionCenterPage';
import CCDeckPage from '@/pages/CCDeckPage';

function PageRouter() {
  const { page } = useApp();
  switch (page) {
    case 'features': return <FeaturesPage />;
    case 'backlog': return <BacklogPage />;
    case 'roadmap': return <RoadmapPage />;
    case 'action': return <ActionCenterPage />;
    case 'ccdeck': return <CCDeckPage />;
    default: return <FeaturesPage />;
  }
}

function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col shadow-2xl"
        style={{
          width: '420px',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <AgentChat onClose={onClose} />
      </div>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  const [agentOpen, setAgentOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <AuthGate>
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8">
            <PageRouter />
          </div>
        </main>
      </div>

      {/* Floating Help button */}
      <button
        onClick={() => setHelpOpen(v => !v)}
        className="fixed bottom-[64px] right-6 z-50 flex items-center gap-1.5 transition-all duration-150 hover:scale-105 active:scale-95"
        style={{
          height: '36px',
          padding: '0 12px',
          background: helpOpen ? '#4f8ef7' : 'var(--surface)',
          border: '1px solid var(--rule-strong)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(28,26,23,0.12)',
          fontFamily: 'var(--f-mono)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: helpOpen ? '#fff' : 'var(--ink-mid)',
          cursor: 'pointer',
        }}
        title="How to use this board"
      >
        <HelpCircle size={13} />
        HELP
      </button>

      {/* Floating Agent button */}
      <button
        onClick={() => setAgentOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
        style={{
          background: agentOpen ? 'var(--ed-accent)' : 'var(--surface)',
          border: '1px solid var(--rule-strong)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(28,26,23,0.12)',
        }}
        title="Product Intelligence Agent"
      >
        <Sparkles
          size={14}
          style={{ color: agentOpen ? '#FDFCF9' : 'var(--ed-accent)' }}
        />
      </button>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </AppProvider>
    </AuthGate>
  );
}
