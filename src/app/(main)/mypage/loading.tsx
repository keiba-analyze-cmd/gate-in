export default function MyPageLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="rounded-2xl p-6 bg-gray-200 h-64" />
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl border border-gray-200 p-3 h-16" />
        <div className="bg-white rounded-xl border border-gray-200 p-3 h-16" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 h-16" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 h-48" />
    </div>
  );
}
