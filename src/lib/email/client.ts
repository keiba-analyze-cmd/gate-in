import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "ゲートイン！ <noreply@gate-in.jp>";
export const SITE_URL = "https://gate-in.jp";
