import type { CapacitorConfig } from '@capacitor/cli';

// FailTrail Android app — remote prod URL load hoti hai (API routes server par hain,
// isliye static export nahi). Native alarm/vibration Capacitor plugins se.
const config: CapacitorConfig = {
  appId: 'com.failtrail.app',
  appName: 'FailTrail',
  webDir: 'public',
  backgroundColor: '#1e1b4b',
  android: {
    allowMixedContent: false,
  },
  server: {
    // PROD: hamesha live URL. Local dev me live-reload chahiye to neeche
    // url ko apne LAN IP se replace karo (phir `npx cap sync` + rebuild):
    // url: 'http://192.168.1.5:3000',
    // cleartext: true,
    url: 'https://failtrail-tau.vercel.app',
    androidScheme: 'https',
  },
};

export default config;
