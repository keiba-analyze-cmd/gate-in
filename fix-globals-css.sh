#!/bin/bash
# globals.css 修正（Tailwind v4互換）
echo "🔧 globals.css を修正中..."

cat << 'FILEOF' > src/app/globals.css
@import "tailwindcss";

@layer base {
  :root {
    --primary: #16a34a;
    --primary-light: #dcfce7;
    --accent: #ea580c;
    --accent-light: #fff7ed;
    --gold: #eab308;
    --gold-light: #fefce8;
  }

  html {
    -webkit-tap-highlight-color: transparent;
  }

  body {
    background-color: #f9fafb;
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "palt";
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
}

/* カスタムユーティリティ（@apply を使わない） */
.font-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

.safe-bottom {
  padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
FILEOF

echo "✅ globals.css 修正完了！"
echo "  pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
