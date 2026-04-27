import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-[var(--wasel-copy-soft)] selection:bg-primary selection:text-primary-foreground border-input flex h-[var(--wasel-control-height)] w-full min-w-0 rounded-[var(--wasel-input-radius)] border border-[var(--wasel-panel-border)] px-4 py-2 text-base bg-[var(--surface-field)] text-[var(--wasel-copy-primary)] shadow-[var(--wasel-shadow-xs)] backdrop-blur-xl transition-[color,box-shadow,border-color,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-[var(--wasel-button-primary-border-strong)] focus-visible:ring-[3px] focus-visible:ring-[rgb(var(--accent-secondary-rgb)/0.18)]",
          "hover:border-[var(--wasel-button-primary-border)]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
