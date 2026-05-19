export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="h-8 w-64 rounded-xl bg-gray-100 animate-pulse" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 bg-white border border-gray-100 animate-pulse space-y-3">
            <div className="h-3 w-20 rounded-full bg-gray-100" />
            <div className="h-7 w-12 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 rounded-full bg-gray-100" />
          <div className="flex gap-2">
            {[48, 52, 52, 64].map((w, i) => (
              <div key={i} className="h-7 rounded-full bg-gray-100" style={{ width: w }} />
            ))}
          </div>
        </div>
        <div className="h-44 rounded-xl bg-gray-50" />
      </div>

      {/* Recent proposals */}
      <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 w-40 rounded-full bg-gray-100 animate-pulse" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex-shrink-0" />
            <div className="flex-1 h-4 w-48 rounded-full bg-gray-100" />
            <div className="h-5 w-16 rounded-full bg-gray-100" />
            <div className="h-4 w-12 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
