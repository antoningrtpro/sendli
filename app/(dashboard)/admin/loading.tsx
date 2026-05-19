export default function AdminLoading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="h-7 w-40 rounded-xl bg-gray-100 animate-pulse" />
      <div className="flex gap-3">
        {[100, 120, 90].map((w, i) => (
          <div key={i} className="h-9 rounded-xl bg-gray-100 animate-pulse" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
          {[180, 120, 80, 80, 80].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-gray-200 animate-pulse" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded-full bg-gray-100" />
              <div className="h-3 w-44 rounded-full bg-gray-100" />
            </div>
            <div className="h-5 w-16 rounded-full bg-gray-100" />
            <div className="h-5 w-14 rounded-full bg-gray-100" />
            <div className="h-7 w-24 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
