import { SITE_URL } from "./client";

// ============================================
// 共通レイアウト
// ============================================
function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0 16px;">
      <span style="font-size:32px;">🏇</span>
      <div style="font-size:18px;font-weight:900;color:#1a1a1a;margin-top:4px;">
        ゲートイン<span style="color:#ea580c;">！</span>
      </div>
    </div>
    <!-- Content -->
    <div style="background:#fff;border-radius:16px;padding:32px 24px;border:1px solid #e5e5e5;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;color:#999;font-size:11px;">
      <p>
        <a href="${SITE_URL}" style="color:#999;text-decoration:none;">gate-in.jp</a> ・
        <a href="${SITE_URL}/mypage/edit" style="color:#999;text-decoration:none;">通知設定</a>
      </p>
      <p style="margin-top:8px;">© 2026 ゲートイン！ All Rights Reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================
// ① ウェルカムメール
// ============================================
export function welcomeEmail(displayName: string): { subject: string; html: string } {
  return {
    subject: "🏇 ゲートイン！へようこそ！",
    html: layout(`
      <h2 style="font-size:20px;font-weight:900;color:#1a1a1a;margin:0 0 16px;">
        ${displayName}さん、ようこそ！🎉
      </h2>
      <p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px;">
        競馬予想コミュニティ「ゲートイン！」にご登録いただきありがとうございます。
      </p>

      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-weight:700;color:#166534;font-size:14px;margin:0 0 12px;">🚀 まずはこの3ステップ</p>
        <table style="width:100%;font-size:13px;color:#444;">
          <tr><td style="padding:6px 0;">❶</td><td style="padding:6px 8px;font-weight:600;">レースを選んで予想を投票</td></tr>
          <tr><td style="padding:6px 0;">❷</td><td style="padding:6px 8px;font-weight:600;">みんなの予想をチェック</td></tr>
          <tr><td style="padding:6px 0;">❸</td><td style="padding:6px 8px;font-weight:600;">週間大会でAmazonギフト券を狙おう</td></tr>
        </table>
      </div>

      <div style="background:#fffbeb;border-radius:12px;padding:16px;margin:0 0 20px;">
        <p style="font-size:13px;color:#92400e;margin:0;">
          📚 <strong>競馬道場</strong>では1,400問以上のクイズと500本以上の記事で競馬力UP！
        </p>
      </div>

      <div style="text-align:center;padding:8px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          さっそく予想する →
        </a>
      </div>
    `),
  };
}

// ============================================
// ② 週末レース案内
// ============================================
export function weekendRaceEmail(
  displayName: string,
  races: { name: string; grade: string | null; venue: string; id: string }[],
  contestName?: string
): { subject: string; html: string } {
  const gradeRaces = races.filter((r) => r.grade);
  const raceListHtml = gradeRaces.length > 0
    ? gradeRaces.map((r) => `
        <a href="${SITE_URL}/races/${r.id}" style="display:block;padding:12px 16px;background:#f9fafb;border-radius:10px;margin:0 0 8px;text-decoration:none;color:#1a1a1a;border:1px solid #e5e5e5;">
          <span style="font-size:11px;font-weight:700;color:#fff;background:${r.grade === 'G1' ? '#eab308' : r.grade === 'G2' ? '#ef4444' : '#22c55e'};padding:2px 8px;border-radius:4px;">${r.grade}</span>
          <span style="font-weight:700;margin-left:8px;">${r.name}</span>
          <span style="color:#999;font-size:12px;margin-left:8px;">${r.venue}</span>
        </a>`).join("")
    : '<p style="color:#999;font-size:13px;">今週は重賞レースの登録がありません</p>';

  const contestHtml = contestName ? `
    <div style="background:linear-gradient(135deg,#7c3aed,#4338ca);border-radius:12px;padding:20px;margin:20px 0;color:#fff;">
      <p style="font-size:13px;margin:0 0 4px;opacity:0.8;">🏆 今週の大会</p>
      <p style="font-size:16px;font-weight:900;margin:0 0 8px;">${contestName}</p>
      <p style="font-size:12px;margin:0;opacity:0.9;">🥇¥5,000 🥈¥3,000 🥉¥2,000</p>
    </div>` : "";

  return {
    subject: `🏇 今週の注目レース${gradeRaces.length > 0 ? `（${gradeRaces[0].name}ほか）` : ""}`,
    html: layout(`
      <h2 style="font-size:18px;font-weight:900;color:#1a1a1a;margin:0 0 16px;">
        ${displayName}さん、今週も予想しましょう！🔥
      </h2>
      <p style="color:#444;font-size:14px;margin:0 0 16px;">今週の注目レースをお届けします。</p>
      ${raceListHtml}
      ${contestHtml}
      <div style="text-align:center;padding:16px 0 8px;">
        <a href="${SITE_URL}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          予想する →
        </a>
      </div>
    `),
  };
}

// ============================================
// ③ 大会結果通知
// ============================================
export function contestResultEmail(
  displayName: string,
  contestName: string,
  ranking: number,
  totalPoints: number,
  totalParticipants: number,
  prizeAmount?: number
): { subject: string; html: string } {
  const isWinner = ranking <= 3;
  const rankEmoji = ranking === 1 ? "🥇" : ranking === 2 ? "🥈" : ranking === 3 ? "🥉" : "🎯";

  return {
    subject: isWinner
      ? `🏆 ${contestName} ${ranking}位入賞おめでとうございます！`
      : `📊 ${contestName} の結果: ${ranking}位`,
    html: layout(`
      <h2 style="font-size:18px;font-weight:900;color:#1a1a1a;margin:0 0 16px;">
        ${contestName} 結果発表 🏆
      </h2>

      <div style="text-align:center;padding:24px 0;${isWinner ? "background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;margin:0 0 20px;" : ""}">
        <div style="font-size:40px;">${rankEmoji}</div>
        <div style="font-size:28px;font-weight:900;color:#1a1a1a;margin:8px 0;">${ranking}位</div>
        <div style="font-size:14px;color:#666;">${totalPoints}pt（${totalParticipants}人中）</div>
      </div>

      ${isWinner && prizeAmount ? `
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
        <p style="font-size:13px;color:#166534;margin:0 0 4px;">🎁 入賞おめでとうございます！</p>
        <p style="font-size:20px;font-weight:900;color:#166534;margin:0;">Amazonギフト券 ¥${prizeAmount.toLocaleString()}</p>
        <p style="font-size:12px;color:#666;margin:8px 0 0;">後日メールにてギフトコードをお送りします</p>
      </div>` : `
      <p style="color:#444;font-size:14px;margin:0 0 20px;">
        来週も予想して上位入賞を目指しましょう！
      </p>`}

      <div style="text-align:center;padding:8px 0;">
        <a href="${SITE_URL}/contest" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          ランキングを見る →
        </a>
      </div>
    `),
  };
}

// ============================================
// ④ 月次レポート
// ============================================
export function monthlyReportEmail(
  displayName: string,
  month: string,
  stats: { votes: number; hits: number; hitRate: number; points: number; rank: string }
): { subject: string; html: string } {
  return {
    subject: `📊 ${month}の予想成績レポート`,
    html: layout(`
      <h2 style="font-size:18px;font-weight:900;color:#1a1a1a;margin:0 0 16px;">
        ${displayName}さんの${month}の成績 📊
      </h2>

      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:12px;text-align:center;background:#f9fafb;border-radius:8px 0 0 0;">
            <div style="font-size:24px;font-weight:900;color:#1a1a1a;">${stats.votes}</div>
            <div style="font-size:11px;color:#999;">予想数</div>
          </td>
          <td style="padding:12px;text-align:center;background:#f9fafb;">
            <div style="font-size:24px;font-weight:900;color:#16a34a;">${stats.hits}</div>
            <div style="font-size:11px;color:#999;">的中数</div>
          </td>
          <td style="padding:12px;text-align:center;background:#f9fafb;border-radius:0 8px 0 0;">
            <div style="font-size:24px;font-weight:900;color:#ea580c;">${stats.hitRate}%</div>
            <div style="font-size:11px;color:#999;">的中率</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:12px;text-align:center;background:#f0fdf4;border-radius:0 0 0 8px;">
            <div style="font-size:20px;font-weight:900;color:#166534;">${stats.points.toLocaleString()}pt</div>
            <div style="font-size:11px;color:#999;">獲得ポイント</div>
          </td>
          <td style="padding:12px;text-align:center;background:#fffbeb;border-radius:0 0 8px 0;">
            <div style="font-size:20px;font-weight:900;color:#92400e;">${stats.rank}</div>
            <div style="font-size:11px;color:#999;">現在のランク</div>
          </td>
        </tr>
      </table>

      <div style="text-align:center;padding:8px 0;">
        <a href="${SITE_URL}/mypage" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          マイページで詳しく見る →
        </a>
      </div>
    `),
  };
}

// ============================================
// ⑤ 復帰促進メール
// ============================================
export function reactivationEmail(displayName: string): { subject: string; html: string } {
  return {
    subject: "🏇 最近の競馬、盛り上がってます！",
    html: layout(`
      <h2 style="font-size:18px;font-weight:900;color:#1a1a1a;margin:0 0 16px;">
        ${displayName}さん、お久しぶりです！👋
      </h2>
      <p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px;">
        最近ゲートイン！を見かけませんが、競馬予想は続いていますか？
        みんな毎週熱い予想をしていますよ！
      </p>

      <div style="background:#fffbeb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 8px;">🆕 最近のアップデート</p>
        <ul style="font-size:13px;color:#444;margin:0;padding:0 0 0 20px;line-height:2;">
          <li>🏆 週間予想大会スタート！毎週Amazonギフト券が当たる</li>
          <li>📚 競馬道場にクイズ1,400問以上追加</li>
          <li>🔥 連続的中ボーナスでポイント大量獲得のチャンス</li>
        </ul>
      </div>

      <div style="text-align:center;padding:8px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          久しぶりに予想する →
        </a>
      </div>
    `),
  };
}

// ============================================
// ⑥ 週間大会告知メール（金曜夕方送信）
// ============================================
export function weeklyContestAnnouncementEmail(
  displayName: string,
  contestName: string,
  gradeRaces: { name: string; grade: string | null; venue: string; id: string }[]
): { subject: string; html: string } {
  const raceListHtml = gradeRaces.length > 0
    ? gradeRaces.slice(0, 5).map((r) => `
        <div style="display:flex;align-items:center;padding:10px 12px;background:#f9fafb;border-radius:8px;margin:0 0 6px;">
          <span style="font-size:10px;font-weight:700;color:#fff;background:${r.grade === 'G1' ? '#eab308' : r.grade === 'G2' ? '#ef4444' : '#22c55e'};padding:2px 6px;border-radius:4px;">${r.grade}</span>
          <span style="font-weight:600;margin-left:8px;font-size:13px;color:#1a1a1a;">${r.name}</span>
          <span style="color:#999;font-size:11px;margin-left:auto;">${r.venue}</span>
        </div>`).join("")
    : '';

  return {
    subject: `🏆 ${contestName}が明日スタート！参加費無料でAmazonギフト券GET`,
    html: layout(`
      <div style="text-align:center;margin:0 0 20px;">
        <div style="display:inline-block;background:#7c3aed;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;">🔥 毎週開催</div>
      </div>

      <h2 style="font-size:20px;font-weight:900;color:#1a1a1a;margin:0 0 8px;text-align:center;">
        🏆 ${contestName}
      </h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;text-align:center;">
        ${displayName}さん、今週も参加しませんか？
      </p>

      <!-- 賞金 -->
      <div style="background:linear-gradient(135deg,#7c3aed,#4338ca);border-radius:16px;padding:24px;margin:0 0 24px;color:#fff;">
        <p style="font-size:13px;margin:0 0 16px;text-align:center;opacity:0.9;">🎁 入賞賞金（Amazonギフト券）</p>
        <table style="width:100%;text-align:center;">
          <tr>
            <td style="padding:8px;">
              <div style="font-size:28px;">🥇</div>
              <div style="font-size:18px;font-weight:900;">¥5,000</div>
              <div style="font-size:11px;opacity:0.8;">1位</div>
            </td>
            <td style="padding:8px;">
              <div style="font-size:28px;">🥈</div>
              <div style="font-size:18px;font-weight:900;">¥3,000</div>
              <div style="font-size:11px;opacity:0.8;">2位</div>
            </td>
            <td style="padding:8px;">
              <div style="font-size:28px;">🥉</div>
              <div style="font-size:18px;font-weight:900;">¥2,000</div>
              <div style="font-size:11px;opacity:0.8;">3位</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- 参加方法 -->
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="font-weight:700;color:#166534;font-size:14px;margin:0 0 12px;">📝 参加方法（超カンタン）</p>
        <table style="width:100%;font-size:13px;color:#444;">
          <tr><td style="padding:6px 0;width:24px;">①</td><td style="padding:6px 8px;"><strong>土曜18時</strong>から予想受付スタート</td></tr>
          <tr><td style="padding:6px 0;">②</td><td style="padding:6px 8px;"><strong>3レース以上</strong>予想で自動エントリー</td></tr>
          <tr><td style="padding:6px 0;">③</td><td style="padding:6px 8px;">日曜レース終了後に結果発表！</td></tr>
        </table>
      </div>

      ${gradeRaces.length > 0 ? `
      <!-- 対象レース -->
      <div style="margin:0 0 24px;">
        <p style="font-weight:700;color:#1a1a1a;font-size:14px;margin:0 0 12px;">🏇 今週の対象レース（WIN5）</p>
        ${raceListHtml}
      </div>
      ` : ''}

      <div style="text-align:center;padding:8px 0;">
        <a href="${SITE_URL}/contest" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          大会ページを見る →
        </a>
      </div>
    `),
  };
}

// ============================================
// ⑦ 大会リマインダー（日曜朝送信）
// ============================================
export function contestReminderEmail(
  displayName: string,
  contestName: string,
  currentRank?: number,
  currentPoints?: number,
  votedCount?: number
): { subject: string; html: string } {
  const hasParticipated = votedCount && votedCount >= 3;
  const needMoreVotes = votedCount !== undefined && votedCount < 3;

  return {
    subject: hasParticipated 
      ? `⏰ ${contestName} 本日最終日！現在${currentRank}位`
      : `⏰ ${contestName} 本日最終日！まだ間に合います`,
    html: layout(`
      <div style="text-align:center;margin:0 0 16px;">
        <div style="display:inline-block;background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;">⏰ 本日最終日</div>
      </div>

      <h2 style="font-size:20px;font-weight:900;color:#1a1a1a;margin:0 0 8px;text-align:center;">
        ${contestName}
      </h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;text-align:center;">
        ${displayName}さん、ラストスパートです！🔥
      </p>

      ${hasParticipated ? `
      <!-- 参加済みの場合 -->
      <div style="background:linear-gradient(135deg,#7c3aed,#4338ca);border-radius:16px;padding:24px;margin:0 0 24px;color:#fff;text-align:center;">
        <p style="font-size:12px;margin:0 0 8px;opacity:0.9;">あなたの現在順位</p>
        <div style="font-size:48px;font-weight:900;">${currentRank}位</div>
        <div style="font-size:14px;opacity:0.9;">${currentPoints?.toLocaleString()}pt</div>
      </div>
      <p style="color:#444;font-size:14px;text-align:center;margin:0 0 24px;">
        まだ順位を上げるチャンス！<br>
        残りのレースで的中を狙いましょう 🎯
      </p>
      ` : needMoreVotes ? `
      <!-- 参加条件未達成の場合 -->
      <div style="background:#fffbeb;border-radius:16px;padding:24px;margin:0 0 24px;text-align:center;">
        <div style="font-size:40px;margin:0 0 8px;">🎫</div>
        <p style="font-size:16px;font-weight:700;color:#92400e;margin:0 0 8px;">
          あと${3 - (votedCount ?? 0)}レース予想で参加確定！
        </p>
        <p style="font-size:13px;color:#666;margin:0;">
          現在${votedCount}レース予想済み
        </p>
      </div>
      <p style="color:#444;font-size:14px;text-align:center;margin:0 0 24px;">
        午後のレースを予想して<br>
        Amazonギフト券を狙いましょう！
      </p>
      ` : `
      <!-- 未参加の場合 -->
      <div style="background:#f0fdf4;border-radius:16px;padding:24px;margin:0 0 24px;text-align:center;">
        <div style="font-size:40px;margin:0 0 8px;">🏆</div>
        <p style="font-size:16px;font-weight:700;color:#166534;margin:0 0 8px;">
          今からでも間に合います！
        </p>
        <p style="font-size:13px;color:#666;margin:0;">
          3レース予想するだけで自動エントリー
        </p>
      </div>
      `}

      <!-- 賞金 -->
      <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;text-align:center;font-size:13px;">
          <tr>
            <td>🥇 <strong>¥5,000</strong></td>
            <td>🥈 <strong>¥3,000</strong></td>
            <td>🥉 <strong>¥2,000</strong></td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;padding:8px 0;">
        <a href="${SITE_URL}/contest" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          今すぐ予想する →
        </a>
      </div>
    `),
  };
}
