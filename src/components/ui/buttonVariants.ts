import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[999px] text-sm font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'border border-[rgba(255,255,255,0.18)] bg-[linear-gradient(135deg,_#F3FBFF_0%,_#BFEFFF_38%,_#65E1FF_100%)] text-[#041424] shadow-[0_20px_48px_rgba(101,225,255,0.24)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_28px_60px_rgba(101,225,255,0.32)]',
        destructive:
          'bg-destructive text-white shadow-[0_18px_36px_rgba(255,100,106,0.22)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-[rgba(157,232,255,0.2)] bg-[rgba(255,255,255,0.06)] text-foreground backdrop-blur-xl hover:border-[rgba(157,232,255,0.34)] hover:bg-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]',
        secondary:
          'border border-white/10 bg-[rgba(255,255,255,0.06)] text-secondary-foreground backdrop-blur-xl hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(157,232,255,0.24)]',
        ghost:
          'text-muted-foreground hover:bg-white/6 hover:text-foreground dark:hover:bg-white/8',
        link: 'text-[#9DE8FF] underline-offset-4 hover:underline',
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
