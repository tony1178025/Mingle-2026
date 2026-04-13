import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "밍글 Mingle",
    short_name: "밍글",
    description: "프리미엄 소셜 디스커버리 플랫폼",
    start_url: "/customer",
    display: "standalone",
    background_color: "#0D0618",
    theme_color: "#D48197",
    lang: "ko-KR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
