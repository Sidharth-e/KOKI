import { cn } from "@/lib/utils";

interface LoadingAnimationProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingAnimation({
  className,
  size = "md",
}: LoadingAnimationProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={cn("flex items-center gap-2 text-primary", className)}
      role="status"
      aria-label="Thinking..."
    >
      <svg
        className={cn("animate-spin [animation-duration:2.5s] text-primary", sizeClasses[size])}
        viewBox="0 0 24 24"
        fill="none"
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect
            key={i}
            x="10.75"
            y="2"
            width="2.5"
            height="5.5"
            rx="1.25"
            fill="currentColor"
            transform={`rotate(${angle} 12 12)`}
            opacity={0.3 + (i / 8) * 0.7}
          />
        ))}
      </svg>
    </div>
  );
}

