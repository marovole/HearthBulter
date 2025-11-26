import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out-expo disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg hover:bg-primary-dark',
        destructive:
          'bg-destructive text-white shadow-soft hover:shadow-soft-lg hover:bg-destructive/90 focus-visible:ring-destructive/50',
        outline:
          'border-2 border-border bg-transparent hover:bg-muted hover:border-primary/30 text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-soft hover:shadow-soft-lg hover:bg-secondary/80',
        ghost:
          'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
        glow: 'bg-primary text-primary-foreground shadow-glow-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:bg-primary-dark',
        accent: 'bg-accent text-accent-foreground shadow-soft hover:shadow-glow-accent hover:bg-accent/90',
        soft: 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 rounded-md gap-1.5 px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'size-10 rounded-lg',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  // When asChild is true, we can't modify the child's structure
  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
