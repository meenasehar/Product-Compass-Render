import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1a1f4e 0%, #0a0c1e 60%)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-10 flex flex-col items-center text-center"
        style={{
          background: 'rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.09)',
          backdropFilter: 'blur(32px)',
        }}
      >
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, #4f8ef7 0%, #7c3aed 100%)',
            boxShadow: '0 0 32px #4f8ef740',
          }}
        >
          <Compass size={24} className="text-white" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-foreground mb-1">Product Compass</h1>
        <p className="text-sm text-muted-foreground mb-8">Prisma SD-WAN · PM Intelligence</p>

        <Button
          className="w-full gap-3 h-11 text-sm font-semibold"
          onClick={() => { window.location.href = `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''}/auth/google`; }}
        >
          {/* Google "G" icon */}
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.25-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.1 17.64 11.86 17.64 9.2z" fill="#fff" fillOpacity=".9"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#fff" fillOpacity=".7"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#fff" fillOpacity=".5"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#fff" fillOpacity=".6"/>
          </svg>
          Sign in with Google
        </Button>

        <p className="text-[11px] text-muted-foreground/50 mt-5">
          Restricted to @paloaltonetworks.com accounts
        </p>
      </div>
    </div>
  );
}
