import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
        outline: 'border-border text-foreground',
        concept: 'border-transparent bg-slate-500/10 text-slate-500',
        committed: 'border-transparent bg-brand-blue/15 text-brand-blue',
        ec: 'border-transparent bg-cyan-500/15 text-cyan-500',
        indev: 'border-transparent bg-brand-purple/15 text-brand-purple',
        validation: 'border-transparent bg-brand-amber/15 text-brand-amber',
        delivered: 'border-transparent bg-brand-green/15 text-brand-green',
        deferred: 'border-transparent bg-brand-red/15 text-brand-red',
        muted: 'border-transparent bg-muted text-muted-foreground',
        success: 'border-transparent bg-brand-green/15 text-brand-green',
        warning: 'border-transparent bg-brand-amber/15 text-brand-amber',
        danger: 'border-transparent bg-brand-red/15 text-brand-red',
        blue: 'border-transparent bg-brand-blue/15 text-brand-blue',
        purple: 'border-transparent bg-brand-purple/15 text-brand-purple',
        teal: 'border-transparent bg-brand-teal/15 text-brand-teal',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
