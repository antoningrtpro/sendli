export default function IntegrationsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <div className="h-7 w-36 rounded-xl bg-gray-100 animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 flex items-center gap-4 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded-full bg-gray-100" />
            <div className="h-3 w-56 rounded-full bg-gray-100" />
          </div>
          <div className="h-8 w-24 rounded-xl bg-gray-100 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
