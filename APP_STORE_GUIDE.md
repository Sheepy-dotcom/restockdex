# RestockDex App Store Guide

RestockDex is set up with Capacitor so the same React app can be packaged for Android and iPhone.

## Useful Commands

```bash
npm run app:sync
```

Builds the web app and copies it into the Android and iOS projects.

```bash
npm run app:assets
```

Regenerates native app icons and splash screens from `resources/icon.png` and `resources/splash.png`.

```bash
npm run app:android
```

Opens the Android project in Android Studio.

```bash
npm run app:ios
```

Opens the iOS project in Xcode.

## Android / Google Play

You need:

- Android Studio
- Google Play Console developer account
- A signed release build / app bundle from Android Studio
- A public privacy policy URL, for example `https://your-vercel-domain/privacy.html`

In Android Studio, open the `android` folder, create a release signing key, then build a signed Android App Bundle for upload to Google Play.

The Android version is set in `android/app/build.gradle`:

- `versionName "1.0.0"` is the public version users see.
- `versionCode 1` is the Play Store build number. Increase this by 1 every time you upload a new Android build.

## iPhone / Apple App Store

You need:

- Xcode on macOS
- Apple Developer account
- App Store Connect app record
- Signing configured in Xcode

In Xcode, open the `ios/App` project, select your Apple team, archive the app, then upload it to App Store Connect.

## App Identity

- App name: `RestockDex`
- App ID / bundle ID: `com.restockdex.app`

Change the bundle ID in `capacitor.config.json` before submitting if you want a different official identifier.
