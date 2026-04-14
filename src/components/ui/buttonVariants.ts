import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[999px] text-sm font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'border border-white/15 bg-[var(--theme-gradient-primary)] text-[var(--text-inverse)] shadow-[var(--wasel-shadow-teal)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[var(--wasel-shadow-blue)]',
        destructive:
          'bg-destructive text-white shadow-[0_18px_36px_rgba(255,100,106,0.22)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-[var(--border)] bg-[var(--surface-muted)] text-foreground backdrop-blur-xl hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted-strong)]',
        secondary:
          'border border-white/10 bg-[var(--surface-muted)] text-secondary-foreground backdrop-blur-xl hover:bg-[var(--surface-muted-strong)] hover:border-[var(--border-strong)]',
        ghost:
          'text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground',
        link: 'text-[var(--accent-secondary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-10 gap-1.5 px-4 has-[>svg]:px-3',
        lg: 'h-12 px-7 has-[>svg]:px-5',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
