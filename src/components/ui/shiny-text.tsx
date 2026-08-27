import { cn } from '@/lib/utils';

interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export function ShinyText({ text, className, speed = 3 }: ShinyTextProps) {
  return (
    <span
      className={cn('inline-block bg-clip-text text-transparent', className)}
      style={{
        backgroundImage: 'linear-gradient(90deg, #4a6888 0%, #f0f6ff 40%, #4a6888 80%)',
        backgroundSize: '200% auto',
        animation: `shimmer ${speed}s linear infinite`,
      }}
    >
      {text}
    </span>
  );
}
