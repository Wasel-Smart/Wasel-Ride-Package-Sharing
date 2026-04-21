import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.02em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[rgb(var(--accent-secondary-rgb)/0.18)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'border border-white/10 bg-[var(--theme-gradient-primary)] text-[var(--wasel-button-primary-foreground)] shadow-[var(--wasel-button-primary-shadow)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[var(--wasel-button-primary-shadow-hover)]',
        destructive:
          'bg-destructive text-white shadow-[0_18px_36px_rgba(255,100,106,0.22)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-[var(--wasel-button-primary-border)] bg-[var(--wasel-panel-muted)] text-[var(--wasel-copy-primary)] backdrop-blur-xl hover:border-[var(--wasel-button-primary-border-strong)] hover:bg-[var(--wasel-button-primary-soft-strong)]',
        secondary:
          'border border-[var(--wasel-button-primary-border)] bg-[var(--wasel-button-primary-soft)] text-[var(--wasel-copy-primary)] backdrop-blur-xl hover:bg-[var(--wasel-button-primary-soft-strong)] hover:border-[var(--wasel-button-primary-border-strong)]',
        ghost:
          'text-[var(--wasel-copy-muted)] hover:bg-[var(--wasel-panel-muted)] hover:text-[var(--wasel-copy-primary)]',
        link: 'text-[var(--wasel-button-primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[var(--wasel-control-height)] px-5 py-2 has-[>svg]:px-4',
        sm: 'h-10 gap-1.5 px-4 has-[>svg]:px-3',
        lg: 'h-[var(--wasel-control-height-lg)] px-7 has-[>svg]:px-5',
        icon: 'size-[var(--wasel-control-height)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
