export default function ProposalsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-9 w-40 rounded-xl bg-gray-100 animate-pulse" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-5">
        {[80, 64, 72, 60].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-gray-100 animate-pulse" style={{ width: w }} />
        ))}
      </div>

      {/* Table rows */}
      <div className="rounded-2xl overflow-hidden border border-gray-100">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100">
          {[160, 80, 80, 80, 80].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-gray-200 animate-pulse" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0">
            <div className="flex-1 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="h-4 w-48 rounded-full bg-gray-100 animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-4 w-14 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-4 w-14 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-4 w-20 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-7 w-7 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
