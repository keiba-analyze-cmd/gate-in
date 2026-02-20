import { resend, FROM_EMAIL, SITE_URL } from "./client";

type ContestWinnerEmailParams = {
  to: string;
  displayName: string;
  rank: number;
  prizeAmount: number;
  contestName: string;
};

export async function sendContestWinnerEmail({
  to,
  displayName,
  rank,
  prizeAmount,
  contestName,
}: ContestWinnerEmailParams) {
  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const subject = `【ゲートイン！】${contestName} ${rank}位入賞おめでとうございます！🎉`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .prize-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .prize-amount { font-size: 32px; font-weight: bold; color: #d97706; }
    .cta-button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .note { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 48px; margin-bottom: 10px;">${rankEmoji}</div>
      <h1 style="margin: 0; font-size: 24px;">${rank}位入賞おめでとうございます！</h1>
    </div>
    <div class="content">
      <p>${displayName} さん</p>
      <p><strong>${contestName}</strong>で見事<strong>${rank}位</strong>に入賞されました！</p>
      <p>素晴らしい予想力です。おめでとうございます！🎉</p>
      
      <div class="prize-box">
        <div style="font-size: 14px; color: #92400e; margin-bottom: 5px;">🎁 賞品</div>
        <div class="prize-amount">Amazonギフト券 ¥${prizeAmount.toLocaleString()}</div>
      </div>
      
      <div class="note">
        <strong>📧 ギフト券のお届けについて</strong><br>
        Amazonギフト券は、このメールアドレス宛に1週間以内にお送りいたします。<br>
        届かない場合は、迷惑メールフォルダをご確認ください。
      </div>
      
      <p style="text-align: center;">
        <a href="${SITE_URL}/contest" class="cta-button">大会ページを見る</a>
      </p>
      
      <p style="margin-top: 30px;">今週も開催中！引き続き予想をお楽しみください🏇</p>
    </div>
    <div class="footer">
      <p>ゲートイン！ - 競馬予想SNS</p>
      <p><a href="${SITE_URL}" style="color: #7c3aed;">${SITE_URL}</a></p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Contest winner email error:", error);
    return { success: false, error };
  }
}
