import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mydigitalbar.app',
  appName: 'My Bar',
  webDir: 'dist/public',

  // -------------------------------------------------------------------------
  // iOS-specific configuration
  // -------------------------------------------------------------------------
  ios: {
    // Allow the WKWebView to scroll; the app manages its own scroll areas
    scrollEnabled: true,
    // Prevents white flash on launch
    backgroundColor: '#F9F4EE',
    // Allow inline media playback (used for wardrobe image previews)
    allowsInlineMediaPlayback: true,
    // Privacy usage descriptions — all three are required for camera/photo access on iOS
    infoPlist: {
      NSCameraUsageDescription:
        'My Digital Bar uses your camera to add clothing items to your wardrobe.',
      NSPhotoLibraryUsageDescription:
        'My Digital Bar reads your photo library so you can choose clothing photos to add to your wardrobe.',
      NSPhotoLibraryAddUsageDescription:
        'My Digital Bar saves photos captured with the camera to your photo library.',
    },
  },

  plugins: {
    // Keep the splash screen visible until the React app signals it is ready
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#F9F4EE',
      iosSpinnerStyle: 'small',
      showSpinner: false,
    },

    // Overlay the status bar so the cream background shows through the notch
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F9F4EE',
      overlaysWebView: true,
    },
  },
};

export default config;
