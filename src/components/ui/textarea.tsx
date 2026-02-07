import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white/90 ring-offset-background placeholder:text-white/25 transition-all duration-150 ease-in-out hover:border-white/20 focus-visible:outline-none focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:shadow-[0_0_20px_rgba(255,255,255,0.05)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
