export default function BrandKitLoading() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="h-7 w-28 rounded-xl bg-gray-100 animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-6 space-y-4 animate-pulse">
          <div className="h-4 w-36 rounded-full bg-gray-100" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 w-10 rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-10 rounded-xl bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
