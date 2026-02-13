import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/mypage/", "/auth/"],
      },
    ],
    sitemap: "https://gate-in.jp/sitemap.xml",
  };
}
