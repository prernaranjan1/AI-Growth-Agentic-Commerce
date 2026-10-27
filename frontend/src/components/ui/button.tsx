import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      type = "button",
      ...props
    },
    ref
  ) => {
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-500",
      outline:
        "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800",
      ghost: "bg-transparent text-zinc-200 hover:bg-zinc-800",
      destructive: "bg-red-600 text-white hover:bg-red-500",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-6",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={[
          "inline-flex items-center justify-center rounded-lg",
          "font-medium transition-colors",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";