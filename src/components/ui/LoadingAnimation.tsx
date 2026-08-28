import { cn } from "@/lib/utils";

interface LoadingAnimationProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingAnimation({
  className,
  size = "md",
}: LoadingAnimationProps) {
  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <div
      className={cn("flex items-center gap-1.5 py-1", className)}
      role="status"
      aria-label="Loading"
    >
      <span
        className={cn(
          "rounded-full bg-primary/80 animate-bounce [animation-delay:-0.3s]",
          dotSizes[size]
        )}
      />
      <span
        className={cn(
          "rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]",
          dotSizes[size]
        )}
      />
      <span
        className={cn(
          "rounded-full bg-primary/80 animate-bounce",
          dotSizes[size]
        )}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
