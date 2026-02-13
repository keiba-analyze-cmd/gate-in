#!/usr/bin/env python3
"""
Task #29: ローディング・スケルトン表示
- 主要ページにloading.tsxを追加
"""

import os

PAGES = {
    "src/app/(main)/races/loading.tsx": '''\
export default function RacesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-40" />
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 bg-gray-200 rounded-lg w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
''',
    "src/app/(main)/races/[raceId]/loading.tsx": '''\
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
''',
    "src/app/(main)/mypage/loading.tsx": '''\
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
''',
    "src/app/(main)/rankings/loading.tsx": '''\
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
''',
    "src/app/(main)/timeline/loading.tsx": '''\
export default function TimelineLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-40" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          </div>
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}
''',
    "src/app/(main)/notifications/loading.tsx": '''\
export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-24" />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-4 border-b border-gray-50">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-48" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
''',
}

def run():
    for path, content in PAGES.items():
        dirpath = os.path.dirname(path)
        os.makedirs(dirpath, exist_ok=True)
        with open(path, "w") as f:
            f.write(content)
        print(f"  ✅ {path}")

    print("\n🏁 Task #29 完了")

if __name__ == "__main__":
    run()
