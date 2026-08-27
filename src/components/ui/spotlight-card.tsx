import { useRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({ children, className, spotlightColor = 'rgba(79,142,247,0.08)' }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--spotlight-x', `${x}px`);
    ref.current.style.setProperty('--spotlight-y', `${y}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card transition-colors duration-200',
        'before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100',
        className
      )}
      style={{
        '--spotlight-x': '50%',
        '--spotlight-y': '50%',
      } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle at var(--spotlight-x) var(--spotlight-y), ${spotlightColor} 0%, transparent 65%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-0 hover:opacity-100"
        style={{ background: `radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), ${spotlightColor} 0%, transparent 65%)` }}
      />
      {children}
    </div>
  );
}
