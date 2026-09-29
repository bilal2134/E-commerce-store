import type { ActionResult } from "@/domain/validation/result";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Live region for action feedback. The region is always in the DOM so screen
 * readers announce text changes; success uses role="status" (polite) and
 * failures role="alert".
 */
export function StatusMessage({
  result,
  className,
  successFallback,
}: {
  result: ActionResult | null;
  className?: string;
  successFallback?: string;
}) {
  if (!result) return <div role="status" className={className} />;
  if (result.ok) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-sm bg-success-tint px-3 py-2 text-sm font-medium text-success",
          className,
        )}
      >
        <CheckIcon size={16} />
        {result.message ?? successFallback ?? "Saved"}
      </div>
    );
  }
  if (!result.formError) return <div role="status" className={className} />;
  return (
    <div
      role="alert"
      className={cn("rounded-sm bg-danger-tint px-3 py-2 text-sm font-medium text-danger", className)}
    >
      {result.formError}
    </div>
  );
}
