# ゲートイン！ 引き継ぎドキュメント

## 📅 最終更新: 2026-02-21

---

## 🏇 プロジェクト概要

**ゲートイン！** は競馬予想SNS＋学習プラットフォーム。ユーザーが競馬レースの予想を投稿し、的中率を競い合うソーシャルサービス。

**本番URL**: https://gate-in.jp
**リポジトリ**: `gate-in` (GitHub)

---

## 🏗️ アーキテクチャ

```
gate-in/
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   ├── admin/
│   │   │   │   └── x-posts/        # X投稿管理
│   │   │   ├── contest/            # 週間予想大会
│   │   │   └── ...
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   ├── auto-settle/    # レース結果精算
│   │   │   │   ├── update-entries/ # 出走馬更新（5分ごと土日）
│   │   │   │   ├── email-weekend/  # 週末メール
│   │   │   │   ├── x-post/         # X自動投稿
│   │   │   │   ├── daily-report/   # KPIレポート
│   │   │   │   └── weekly-contest/ # 週間大会管理
│   │   │   ├── admin/
│   │   │   │   └── weekly-contest/ # 大会作成API
│   │   │   └── ...
│   │   └── ...
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminTabs.tsx
│   │   │   └── AdminContestManager.tsx  # 大会作成UI
│   │   ├── social/
│   │   │   └── TimelineFeed.tsx    # 更新ボタン付き
│   │   └── ...
│   ├── lib/
│   │   ├── slack.ts                # Slack通知
│   │   ├── services/
│   │   │   └── settle-race.ts      # ポイント精算（エラーチェック付き）
│   │   ├── email/
│   │   │   ├── client.ts           # Resendクライアント
│   │   │   └── contest-winner.ts   # 大会入賞者メール
│   │   └── ...
│   └── ...
├── public/
│   └── firebase-messaging-sw.js    # プッシュ通知SW
└── vercel.json                     # Cron設定
```

---

## 🔧 2026-02-21 修正内容

### レース結果表示のバグ修正
1. **的中ランク表示修正**: `vote_picks`を含めて取得し、正確な的中タイプを判定
   - 修正ファイル: `races/page.tsx`, `RaceListClient.tsx`, `RaceCard.tsx`
   - 原因: `vote_picks`なしでフォールバック判定していたため「単勝的中」が誤表示

2. **「対抗」セクション削除**: VoteSummaryから不要な表示を削除
   - 修正ファイル: `VoteSummary.tsx`
   - 原因: ○印は馬連・ワイド・三連複の計算に使われるだけでポイントは付与されない

### 精算ロジックの改善
3. **払戻未確定時スキップ**: `win`と`place`の払戻がない場合はsettleをスキップ
   - 修正ファイル: `auto-settle/route.ts`
   - 原因: 払戻確定前にsettleが実行されるとpoints_transactionsが記録されない

4. **エラーチェック追加**: `points_transactions`のinsertエラーをログ出力
   - 修正ファイル: `settle-race.ts`

### UI/UX改善
5. **オッズ更新頻度変更**: 土日は5分ごとに更新
   - 修正ファイル: `vercel.json`
   - 変更前: `0 0,2,4,6 * * 0,6`（4回/日）
   - 変更後: `*/5 * * * 0,6`（5分ごと）

6. **投票シェアカード**: 手動で閉じるまで表示されるよう修正
   - 修正ファイル: `VoteForm.tsx`
   - 原因: `router.refresh()`が即座に呼ばれて状態がリセットされていた

7. **タイムライン更新ボタン**: 🔄ボタンを追加
   - 修正ファイル: `TimelineFeed.tsx`

8. **掲示板コメントエラー修正**:
   - POST: レスポンス形式を`{ comment: data }`に修正
   - GET: 存在しない`is_hidden`カラムの参照を削除
   - 修正ファイル: `api/races/[raceId]/comments/route.ts`

---

## 🏆 週間予想大会システム

### 参加条件
- **3レース以上**予想で自動エントリー（`is_eligible: true`）
- 参加ボタン不要、予想するだけで自動参加

### 賞金
- 1位: ¥5,000 / 2位: ¥3,000 / 3位: ¥2,000（Amazonギフト券）

### 運用フロー
1. **土曜日**: レース情報をスクレイピング（/admin?tab=scrape）
2. **土曜日**: /admin?tab=contest でWIN5対象5レースを選択 → 大会作成
3. **日曜日**: ユーザーが予想、3レース以上で自動エントリー
4. **金曜日16:05 JST**: Cronで前週大会クローズ
   - 前週大会を `finished` に更新
   - 新週大会を `active` で作成
   - TOP3に通知＋メール送信

### 入賞者メール
- `src/lib/email/contest-winner.ts` でHTML形式メール送信
- Amazonギフト券は管理者が手動でメール送信

### 関連テーブル
- `contests` — 大会情報
- `contest_races` — 大会とレースの紐付け
- `contest_entries` — ユーザーのエントリー・ポイント

### 参加条件の実装箇所
- `src/lib/services/settle-race.ts` 555行目付近
- `is_eligible: (wcEntry.vote_count + 1) >= 3`

---

## 📱 X自動投稿システム

### 仕組み
1. 管理画面（/admin/x-posts）で投稿を予約
2. Cron（10分ごと）が5分以内の予約を検出
3. X API v2で自動投稿
4. Slackに完了/エラー通知

### 動的変数
- `{{weekly_mvp}}` → 先週のMVPユーザー名
- `{{today_date}}` → 今日の日付（例: 2/21）

### 投稿スケジュール
- 平日: 12:00 + 20:00（2投稿/日）
- 土日: 7:30（1投稿/日）
- 結果速報: 手動投稿

---

## 📊 Slack連携

### チャンネル構成
| チャンネル | 用途 |
|-----------|------|
| #gate-in-kpi | 日次KPIレポート（0:00 JST） |
| #gate-in-sns | X投稿完了/エラー通知 |
| #gate-in-support | お問い合わせ・コメント通報 |
| #gate-in-alerts | システムエラー |

### slack.ts ユーティリティ関数
```typescript
sendSlackNotification(channel, text)
sendKPIReport(data)
sendXPostNotification(content, tweetUrl)
sendInquiryNotification(data)
sendCommentReportNotification(data)
sendErrorNotification(data)
```

---

## 🔔 Firebase プッシュ通知

### プロジェクト情報
- **プロジェクトID**: `gate-in-notifications-6f66e`
- **旧プロジェクト**: `gate-in-2fba2`（組織ポリシー制限あり、使用不可）

### 環境変数（Vercel設定済み）
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `FIREBASE_SERVICE_ACCOUNT_KEY`

### Service Worker
- `public/firebase-messaging-sw.js` に設定をハードコード
- Firebase API Keyの公開は設計上問題なし（GitHub警告は無視可）

---

## ⏰ Cron設定（vercel.json）

| パス | スケジュール | 説明 |
|------|-------------|------|
| /api/cron/auto-settle | */10 * * * * | レース結果精算 |
| /api/cron/update-entries | */5 * * * 0,6 | 出走馬・オッズ更新（土日5分ごと） |
| /api/cron/email-weekend | 30 7 * * 5 | 週末案内メール |
| /api/cron/email-reactivation | 0 3 * * 3 | 休眠復帰メール |
| /api/cron/x-post | */10 * * * * | X自動投稿 |
| /api/cron/daily-report | 0 15 * * * | KPIレポート |
| /api/cron/weekly-contest | 5 7 * * 5 | 週間大会管理 |

---

## 🔧 環境変数一覧

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### microCMS
- `NEXT_PUBLIC_MICROCMS_SERVICE_DOMAIN`
- `NEXT_PUBLIC_MICROCMS_API_KEY`

### メール（Resend）
- `RESEND_API_KEY`

### X API
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_SECRET`

### Slack
- `SLACK_WEBHOOK_KPI`
- `SLACK_WEBHOOK_SNS`
- `SLACK_WEBHOOK_SUPPORT`
- `SLACK_WEBHOOK_ALERTS`

### Firebase（8つ）
- `NEXT_PUBLIC_FIREBASE_*`（7つ）
- `FIREBASE_SERVICE_ACCOUNT_KEY`

### その他
- `CRON_SECRET`

---

## ⚠️ 既知の問題・注意点

### Xログイン
- ユーザーから「requested path is invalid」エラー報告あり
- X Developer Portalで組織URLを設定済み（要テスト）

### GitHub Secret警告
- `firebase-messaging-sw.js`のAPI Key検出
- Firebase API Keyは公開設計のため無視可
- 必要に応じてGitHub Security → Close as False positive

### 組織ポリシー（hilltop-forest.com）
- 旧Firebaseプロジェクト`gate-in-2fba2`はサービスアカウントキー作成不可
- 新プロジェクト`gate-in-notifications-6f66e`を個人アカウントで作成済み

### DBスキーマ注意点
- `comments`テーブルに`is_hidden`カラムは存在しない（2026-02-21確認）

---

## 📋 次のアクション候補

1. **Xログインテスト** — 組織URL設定後の動作確認
2. **プッシュ通知テスト** — 設定画面で通知許可 → 動作確認
3. **競馬道場リニューアル** — ステージ制UI設計・実装
4. **X投稿の来週分登録** — 金曜までに翌週分を予約
