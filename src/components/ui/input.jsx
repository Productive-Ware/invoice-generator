// File: src/components/ui/input.jsx

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-sm border bg-transparent px-4 py-6 text-base shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-full file:border-0 file:bg-transparent hover:file:bg-zinc-800 file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:file:border-b-1",
        type === "file" && "py-2 flex items-center",
        className
      )}
      {...props}
    />
  );
}

export { Input };
