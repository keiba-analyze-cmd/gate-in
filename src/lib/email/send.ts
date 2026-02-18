import { resend, FROM_EMAIL } from "./client";

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("Email send exception:", err);
    return { success: false, error: err.message };
  }
}

export async function sendBulkEmails(
  recipients: { email: string; subject: string; html: string }[]
) {
  const results = [];
  for (const r of recipients) {
    const result = await sendEmail(r.email, r.subject, r.html);
    results.push({ email: r.email, ...result });
    // Rate limit: 2 emails per second
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return results;
}
