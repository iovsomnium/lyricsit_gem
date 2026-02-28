import { cn } from "@/lib/utils/cn";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeStyles = {
  sm: "h-4 w-4 border-[1.5px]",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-2",
};

export function Loading({ size = "md", className, label }: LoadingProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-muted-light border-t-rhyme-blue",
          sizeStyles[size],
        )}
        role="status"
        aria-label={label ?? "로딩 중"}
      />
      {label && <span className="text-sm text-muted">{label}</span>}
    </div>
  );
}
