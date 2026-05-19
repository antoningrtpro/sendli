export default function BannersLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-9 w-36 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden animate-pulse">
            <div className="h-36 bg-gray-100" />
            <div className="p-4 flex items-center justify-between">
              <div className="h-4 w-32 rounded-full bg-gray-100" />
              <div className="h-7 w-16 rounded-lg bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
