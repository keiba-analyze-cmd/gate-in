export default function RaceDetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="h-8 bg-gray-200 rounded w-64 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-48 mb-6" />
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
