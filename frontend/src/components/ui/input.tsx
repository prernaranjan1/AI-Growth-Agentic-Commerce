import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={[
        "flex h-10 w-full rounded-lg border",
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

Input.displayName = "Input";