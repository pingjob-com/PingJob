# PingJob iOS App

A native iOS app for PingJob - the job board and professional networking platform.

## Overview

This iOS app is built with Swift and SwiftUI, providing a native iOS experience that mirrors the Android app functionality. It uses a WKWebView to load the PingJob web application while providing native iOS features like:

- Native splash screen
- Deep link handling for OAuth authentication
- Proper navigation controls
- Native error handling
- iOS-specific UI adaptations

## Build Options

### Option 1: GitHub Actions (Recommended - No Mac Required)
Use GitHub Actions with macOS runners to build signed IPAs automatically.
See **BUILD_INSTRUCTIONS.md** for detailed setup.

### Option 2: Build Locally on Mac
Open the project in Xcode and build manually.

## Requirements

- **Apple Developer Account**: $99/year - Required for App Store distribution
- **Xcode**: 15.0 or later (for local builds only)
- **iOS Deployment Target**: iOS 15.0+
- **Swift**: 5.0+
- **macOS**: Ventura or later (for local development only)

## Project Structure

```
ios/
├── PingJob.xcodeproj/          # Xcode project configuration
│   ├── project.pbxproj         # Project settings
│   └── xcshareddata/
│       └── xcschemes/
│           └── PingJob.xcscheme
├── PingJob/
│   ├── PingJobApp.swift        # App entry point
│   ├── ContentView.swift       # Main content view
│   ├── WebViewContainer.swift  # WebView wrapper
│   ├── SceneDelegate.swift     # Scene lifecycle management
│   ├── LaunchScreen.storyboard # Launch screen UI
│   ├── Info.plist              # App configuration
│   └── Assets.xcassets/        # App icons and colors
│       ├── AppIcon.appiconset/
│       └── AccentColor.colorset/
└── README.md
```

## Features

### 1. WebView Integration
- Loads `https://www.pingjob.com` in a native WKWebView
- Supports JavaScript and cookies
- Handles external links properly (opens in Safari)
- Custom user agent for app identification

### 2. OAuth Deep Links
- URL Scheme: `pingjob://`
- Handles OAuth callbacks from Google authentication
- Seamless sign-in experience

### 3. Splash Screen
- Native SwiftUI splash screen
- Matches PingJob branding
- Auto-hides after web content loads

### 4. Error Handling
- Connection error display
- Retry functionality
- User-friendly error messages

## Building the App

### 1. Open in Xcode
```bash
open ios/PingJob.xcodeproj
```

### 2. Configure Signing
1. Select the PingJob target
2. Go to Signing & Capabilities
3. Select your Apple Developer Team
4. Xcode will auto-generate provisioning profiles

### 3. Add App Icons
1. Replace placeholder icons in `Assets.xcassets/AppIcon.appiconset/`
2. Required size: 1024x1024 pixels (PNG format)
3. Xcode will auto-generate all required sizes

### 4. Build and Run
- Select target device/simulator
- Press Cmd+R or click the Run button

## Configuration

### Bundle Identifier
- `com.pingjob` (matches Android app)

### URL Schemes
- `pingjob://auth-callback` - OAuth callback handler

### Permissions
- Camera access (for profile photos)
- Photo library access (for uploads)
- Background fetch (optional)

## Testing OAuth

1. Sign in with Google in the app
2. OAuth flow opens in Safari
3. After authentication, Safari redirects to `pingjob://auth-callback`
4. App handles the callback and completes sign-in

## App Store Submission

### Requirements
1. App icons (all required sizes)
2. Screenshots for iPhone and iPad
3. App description and keywords
4. Privacy policy URL
5. Apple Developer Program membership

### Build for Release
1. Select "Any iOS Device" as target
2. Product → Archive
3. Distribute through App Store Connect

## Comparison with Android App

| Feature | iOS | Android |
|---------|-----|---------|
| WebView | WKWebView | Capacitor WebView |
| OAuth | URL Scheme | Intent Filter |
| Splash | SwiftUI | Capacitor SplashScreen |
| Build | Xcode | Android Studio |
| Store | App Store | Play Store |

## Troubleshooting

### WebView not loading
- Check internet connection
- Verify URL in WebViewContainer.swift
- Check App Transport Security settings

### OAuth not working
- Verify URL scheme in Info.plist
- Check callback URL matches web backend
- Test deep link: `xcrun simctl openurl booted "pingjob://auth-callback?code=test"`

### Build errors
- Clean build folder (Cmd+Shift+K)
- Delete derived data
- Restart Xcode

## License

Proprietary - PingJob

## Contact

For support, contact the PingJob development team.
