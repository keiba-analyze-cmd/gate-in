import { Resend } from "resend";

// ビルド時にAPIキーがなくてもエラーにならないようにする
export const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

export const FROM_EMAIL = "ゲートイン！ <noreply@gate-in.jp>";
export const SITE_URL = "https://gate-in.jp";
