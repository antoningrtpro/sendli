export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-6 w-48 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 space-y-2 animate-pulse">
            <div className="h-3 w-20 rounded-full bg-gray-100" />
            <div className="h-7 w-10 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 animate-pulse">
        <div className="h-4 w-32 rounded-full bg-gray-100 mb-4" />
        <div className="h-44 rounded-xl bg-gray-50" />
      </div>

      {/* Recipients table */}
      <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden animate-pulse">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 w-36 rounded-full bg-gray-100" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 rounded-full bg-gray-100" />
              <div className="h-3 w-28 rounded-full bg-gray-100" />
            </div>
            <div className="h-4 w-10 rounded-full bg-gray-100" />
            <div className="h-4 w-24 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
