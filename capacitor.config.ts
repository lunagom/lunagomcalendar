import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lunagom.calendar",
  appName: "루나곰 캘린더",
  webDir: "out",
  server: {
    url: "https://lunabear-calendar.vercel.app",
    cleartext: false,
    allowNavigation: [
      "lunabear-calendar.vercel.app",
      "*.supabase.co",
      "accounts.google.com",
      "kauth.kakao.com",
      "kapi.kakao.com",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
};

export default config;
