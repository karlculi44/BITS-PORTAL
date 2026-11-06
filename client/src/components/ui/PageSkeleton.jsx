function PageSkeleton({ variant = "dashboard" }) {
  const cards = variant === "dashboard" ? 4 : 2;

  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-gray-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-28 rounded-lg bg-gray-800" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-gray-800" />
    </div>
  );
}

export default PageSkeleton;
