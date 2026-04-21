import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[rgb(var(--accent-secondary-rgb)/0.18)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,border-color,background-color] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-[var(--wasel-button-primary-border)] bg-[var(--wasel-button-primary-soft)] text-[var(--wasel-button-primary)] [a&]:hover:bg-[var(--wasel-button-primary-soft-strong)]',
        secondary:
          'border-[var(--wasel-panel-border)] bg-[var(--wasel-panel-muted)] text-[var(--wasel-copy-primary)] [a&]:hover:bg-[var(--surface-muted-strong)]',
        destructive:
          'border-transparent bg-destructive/14 text-destructive [a&]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border-[var(--wasel-panel-border)] text-[var(--wasel-copy-muted)] [a&]:hover:bg-[var(--wasel-panel-muted)] [a&]:hover:text-[var(--wasel-copy-primary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
