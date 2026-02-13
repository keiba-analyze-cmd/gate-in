import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-8 pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          <Link href="/terms" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            利用規約
          </Link>
          <Link href="/privacy" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/legal" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            特定商取引法に基づく表記
          </Link>
          <Link href="/contact" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            お問い合わせ
          </Link>
        </div>
        <p className="text-center text-[10px] text-gray-300">
          © 2026 ゲートイン！ All rights reserved.
        </p>
      </div>
    </footer>
  );
}
