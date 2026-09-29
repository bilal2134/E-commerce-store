export default function PanelLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="mb-6 h-9 w-56 animate-pulse rounded-sm bg-blush" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-sm border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-72 animate-pulse rounded-sm border border-line bg-surface" />
    </div>
  );
}
