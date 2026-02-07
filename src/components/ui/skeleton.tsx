import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg shimmer-loading", className)}
      {...props}
    />
  );
}

export { Skeleton };
