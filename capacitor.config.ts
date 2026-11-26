import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.mpstme.raiden",
  appName: "Raiden",
  webDir: "dist",
  android: { allowMixedContent: true },
  plugins: {
    // native HTTP: talks to the CTTGS server on the college network (http) or online (https) without CORS trouble
    CapacitorHttp: { enabled: true },
    SplashScreen: { launchShowDuration: 900, backgroundColor: "#0d0e12", showSpinner: false },
    LocalNotifications: { smallIcon: "ic_stat_raiden", iconColor: "#ff4d1a" },
  },
};

export default config;
