export default function LibraryLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-9 w-36 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        {[80, 96, 88].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-gray-100 animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3 animate-pulse">
            <div className="h-32 rounded-xl bg-gray-100" />
            <div className="h-4 w-3/4 rounded-full bg-gray-100" />
            <div className="h-3 w-1/2 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
