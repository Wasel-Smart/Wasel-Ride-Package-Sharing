import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,border-color,background-color] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/14 text-primary [a&]:hover:bg-primary/20',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive/14 text-destructive [a&]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border-border/80 text-foreground [a&]:hover:bg-accent/10 [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
