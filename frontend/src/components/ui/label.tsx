import * as React from "react";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className = "", ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={[
        "text-sm font-medium text-zinc-200",
        className,
      ].join(" ")}
      {...props}
    />
  );
});

Label.displayName = "Label";