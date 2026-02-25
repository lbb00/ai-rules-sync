import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.ts';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow hover:opacity-90',
        destructive: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] shadow-sm hover:opacity-90',
        outline: 'border border-[hsl(var(--input))] bg-[hsl(var(--background))] shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
        secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm hover:opacity-80',
        ghost: 'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
        link: 'text-[hsl(var(--primary))] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
