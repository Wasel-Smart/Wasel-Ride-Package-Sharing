import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { instantFeedback } from "../../utils/instantFeedback";
import { buttonVariants } from "./buttonVariants";

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    enableFeedback?: boolean;
    feedbackType?: 'light' | 'medium' | 'heavy';
  };

const feedbackCleanupRegistry = new WeakMap<HTMLElement, () => void>();

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant, size, asChild = false, enableFeedback = true, feedbackType = 'light', ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const setButtonRef = React.useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;

    if (typeof ref === "function") {
      ref(node);
      return;
    }

    if (ref) {
      ref.current = node;
    }
  }, [ref]);

  React.useEffect(() => {
    const element = buttonRef.current;
    if (!element || !enableFeedback) return;

    const timeoutId = window.setTimeout(() => {
      const cleanupTouch = instantFeedback.attachTouchFeedback(element, feedbackType);
      const cleanupClick = instantFeedback.attachClickFeedback(element, feedbackType);

      feedbackCleanupRegistry.set(element, () => {
        cleanupTouch();
        cleanupClick();
        feedbackCleanupRegistry.delete(element);
      });
    }, 100); // Defer by 100ms

    return () => {
      window.clearTimeout(timeoutId);
      feedbackCleanupRegistry.get(element)?.();
    };
  }, [enableFeedback, feedbackType]);

  return (
    <Comp
      ref={setButtonRef}
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

export { Button };
