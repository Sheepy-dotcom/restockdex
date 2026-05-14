# RestockDex Push Notification Setup

The app code and API are wired for real push notifications. These steps connect it to Firebase, Android, iPhone, and Railway.

## 1. Firebase Project

1. Go to https://console.firebase.google.com/
2. Create a Firebase project for RestockDex.
3. Add an Android app.
4. Android package name: `com.restockdex.app`
5. Download `google-services.json`.
6. Put it here:

```text
android/app/google-services.json
```

Do not commit this file to GitHub.

## 2. Firebase Server Key For Railway

1. In Firebase, open Project Settings.
2. Go to Service accounts.
3. Generate a new private key.
4. Open the downloaded JSON file.
5. Copy the whole JSON contents.
6. In Railway, add an environment variable:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

Paste the whole JSON as the value.

## 3. iPhone Push Setup

1. In Apple Developer, create an APNs Auth Key.
2. In Firebase Project Settings, add an iOS app.
3. Bundle ID: `com.restockdex.app`
4. Upload the APNs Auth Key to Firebase Cloud Messaging settings.
5. Download `GoogleService-Info.plist`.
6. Add it to the iOS app in Xcode.
7. In Xcode, enable Push Notifications under Signing & Capabilities.

## 4. Build And Upload

After adding the Firebase files:

```bash
npm run app:sync
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:bundleRelease
```

Upload:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 5. Test

1. Install the app from Google Play testing.
2. Open the app.
3. Tap Enable notifications.
4. Railway should store the device token.
5. `/push/status` will show whether Firebase is configured and how many devices are registered.

