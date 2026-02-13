export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* ヒーローカード */}
      <div className="h-48 bg-gray-200 rounded-2xl" />

      {/* セクション */}
      <div className="space-y-3">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}
