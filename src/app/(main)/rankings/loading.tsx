export default function RankingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-40" />
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded-lg flex-1" />
        <div className="h-10 bg-gray-200 rounded-lg flex-1" />
      </div>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-16" />
      ))}
    </div>
  );
}
