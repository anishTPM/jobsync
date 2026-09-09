"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }
>(({ className, indeterminate, ...props }, ref) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inputRef.current!);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      ref={inputRef}
      className={cn(
        "h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };