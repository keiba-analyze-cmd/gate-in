export default function RaceDetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-48" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-12" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-20" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
