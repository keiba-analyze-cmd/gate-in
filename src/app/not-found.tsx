import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🏇💨</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">ページが見つかりません</h1>
        <p className="text-sm text-gray-500 mb-6">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block bg-green-600 text-white font-bold text-sm px-6 py-3 rounded-full hover:bg-green-700 transition-colors"
        >
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}
