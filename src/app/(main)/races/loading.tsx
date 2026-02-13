export default function RacesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="flex gap-2">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
