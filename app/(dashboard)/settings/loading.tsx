export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="h-7 w-40 rounded-xl bg-gray-100 animate-pulse" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-6 space-y-4 animate-pulse">
          <div className="h-4 w-32 rounded-full bg-gray-100" />
          <div className="h-10 rounded-xl bg-gray-100" />
          {i === 0 && <div className="h-10 rounded-xl bg-gray-100" />}
          <div className="h-9 w-28 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
