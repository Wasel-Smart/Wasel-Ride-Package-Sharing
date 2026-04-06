import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { instantFeedback } from "../../utils/instantFeedback";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.1rem] text-sm font-semibold tracking-[-0.01em] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_18px_44px_rgba(22,199,242,0.24)] hover:brightness-110",
        destructive:
          "bg-destructive text-white shadow-[0_18px_36px_rgba(255,100,106,0.22)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-primary/20 bg-card/90 text-foreground hover:border-primary/40 hover:bg-secondary/80 dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border border-white/5 bg-secondary/90 text-secondary-foreground hover:bg-secondary/75",
        ghost:
          "text-muted-foreground hover:bg-white/5 hover:text-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-11 px-6 has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      enableFeedback?: boolean; // NEW: Enable instant feedback
      feedbackType?: 'light' | 'medium' | 'heavy'; // NEW: Feedback intensity
    }
>(({ className, variant, size, asChild = false, enableFeedback = true, feedbackType = 'light', ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // OPTIMIZED: Attach instant feedback on mount - DEFERRED to avoid blocking FID
  React.useEffect(() => {
    const element = buttonRef.current;
    if (!element || !enableFeedback) return;

    // Defer feedback attachment to avoid blocking initial interactions
    const timeoutId = setTimeout(() => {
      const cleanupTouch = instantFeedback.attachTouchFeedback(element, feedbackType);
      const cleanupClick = instantFeedback.attachClickFeedback(element, feedbackType);

      // Store cleanup functions for unmount
      (element as any).__feedbackCleanup = () => {
        cleanupTouch();
        cleanupClick();
      };
    }, 100); // Defer by 100ms

    return () => {
      clearTimeout(timeoutId);
      if ((element as any).__feedbackCleanup) {
        (element as any).__feedbackCleanup();
      }
    };
  }, [enableFeedback, feedbackType]);

  // Merge refs
  React.useImperativeHandle(ref, () => buttonRef.current!);

  return (
    <Comp
      ref={buttonRef}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      style={{ 
        WebkitTapHighlightColor: 'transparent', // Remove default mobile tap highlight
        touchAction: 'manipulation', // Optimize for touch (no 300ms delay)
        userSelect: 'none' // Prevent text selection
      }}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
