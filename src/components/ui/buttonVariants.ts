import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.1rem] text-sm font-semibold tracking-[-0.01em] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_18px_44px_rgba(22,199,242,0.24)] hover:brightness-110',
        destructive:
          'bg-destructive text-white shadow-[0_18px_36px_rgba(255,100,106,0.22)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-primary/20 bg-card/90 text-foreground hover:border-primary/40 hover:bg-secondary/80 dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'border border-white/5 bg-secondary/90 text-secondary-foreground hover:bg-secondary/75',
        ghost:
          'text-muted-foreground hover:bg-white/5 hover:text-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-9 gap-1.5 px-3.5 has-[>svg]:px-3',
        lg: 'h-11 px-6 has-[>svg]:px-5',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
