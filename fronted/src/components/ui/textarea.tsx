import * as React from "react";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={[
        "flex min-h-[80px] w-full rounded-lg border",
        "border-zinc-700 bg-zinc-900",
        "px-3 py-2 text-sm text-zinc-100",
        "placeholder:text-zinc-500",
        "outline-none",
        "focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";