# PingJob iOS Build Instructions

This guide explains how to build and sign the PingJob iOS app for testing on your iPhone and publishing to the App Store.

## Prerequisites

1. **Apple Developer Account** ($99/year) - Required for App Store distribution
   - Sign up at: https://developer.apple.com/programs/

2. **GitHub Account** - For automated builds using GitHub Actions

## Step 1: Create Certificates & Provisioning Profiles

### On Apple Developer Portal (https://developer.apple.com/account)

#### A. Create App ID
1. Go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers** → **+** button
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Enter:
   - Description: `PingJob`
   - Bundle ID: `com.pingjob` (Explicit)
6. Enable capabilities:
   - Associated Domains (for universal links)
7. Click **Continue** → **Register**

#### B. Create Distribution Certificate
1. Go to **Certificates** → **+** button
2. Select **Apple Distribution** → Continue
3. Follow instructions to create a Certificate Signing Request (CSR) on your Mac:
   - Open **Keychain Access** → Certificate Assistant → Request a Certificate From a Certificate Authority
   - Enter your email, select "Saved to disk"
4. Upload the CSR file
5. Download the certificate (.cer)
6. Double-click to install in Keychain

#### C. Export Certificate as .p12
1. Open **Keychain Access** on your Mac
2. Find your certificate under "My Certificates"
3. Right-click → **Export**
4. Choose .p12 format
5. Set a strong password (you'll need this later)
6. Save as `certificate.p12`

#### D. Create Provisioning Profile

**For Development (testing on your device):**
1. Go to **Profiles** → **+**
2. Select **iOS App Development** → Continue
3. Select your App ID (`com.pingjob`) → Continue
4. Select your distribution certificate → Continue
5. Select devices to test on → Continue
6. Name: `PingJob Development`
7. Download the profile (.mobileprovision)

**For App Store:**
1. Go to **Profiles** → **+**
2. Select **App Store Connect** → Continue
3. Select your App ID (`com.pingjob`) → Continue
4. Select your distribution certificate → Continue
5. Name: `PingJob App Store`
6. Download the profile (.mobileprovision)

## Step 2: Set Up GitHub Secrets

### Convert files to Base64
On your Mac Terminal, run:

```bash
# Convert certificate to base64
base64 -i certificate.p12 | pbcopy
# Paste into GitHub as BUILD_CERTIFICATE_BASE64

# Convert provisioning profile to base64
base64 -i PingJob_Development.mobileprovision | pbcopy
# Paste into GitHub as BUILD_PROVISION_PROFILE_BASE64
```

### Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `BUILD_CERTIFICATE_BASE64` | Base64 encoded .p12 certificate |
| `P12_PASSWORD` | Password you set when exporting .p12 |
| `BUILD_PROVISION_PROFILE_BASE64` | Base64 encoded .mobileprovision |
| `KEYCHAIN_PASSWORD` | Any temporary password (e.g., `temp123`) |
| `APPLE_TEAM_ID` | Your 10-character Team ID (find in Apple Developer portal) |
| `PROVISIONING_PROFILE_NAME` | Name of your provisioning profile (e.g., `PingJob Development`) |

## Step 3: Build the App

### Option A: Automatic Build (Push to GitHub)
1. Push your code to the `main` branch
2. GitHub Actions will automatically build the app
3. Go to **Actions** tab to see the build progress
4. Download the IPA from the build artifacts

### Option B: Manual Build
1. Go to **Actions** tab in your GitHub repository
2. Click **Build iOS App** workflow
3. Click **Run workflow**
4. Select build type:
   - `development` - For testing on your device
   - `app-store` - For App Store submission
5. Click **Run workflow**
6. Wait for the build to complete (~10 minutes)
7. Download artifacts (IPA and xcarchive)

## Step 4: Install on Your iPhone (Development Build)

### Method 1: Apple Configurator 2 (Mac)
1. Download Apple Configurator 2 from Mac App Store
2. Connect your iPhone via USB
3. Drag the IPA file onto your device

### Method 2: Xcode
1. Open Xcode
2. Go to **Window** → **Devices and Simulators**
3. Select your iPhone
4. Click **+** under Installed Apps
5. Select the IPA file

### Method 3: TestFlight (Recommended)
1. Upload the IPA to App Store Connect
2. Invite yourself as a tester
3. Install via TestFlight app

## Step 5: Submit to App Store

### Prepare for Submission
1. Log in to **App Store Connect** (https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Enter app details:
   - Platform: iOS
   - Name: PingJob
   - Primary Language: English
   - Bundle ID: com.pingjob
   - SKU: pingjob-001

### Upload Build
**Using Transporter app (Mac):**
1. Download Transporter from Mac App Store
2. Sign in with your Apple ID
3. Drag the App Store IPA into Transporter
4. Click **Deliver**

**Using GitHub Actions (Automated):**
The App Store build will be automatically ready for upload.

### Complete App Store Listing
1. Add screenshots (required sizes):
   - iPhone 6.7" (1290 x 2796 px)
   - iPhone 6.5" (1284 x 2778 px)
   - iPhone 5.5" (1242 x 2208 px)
2. Write app description
3. Set age rating
4. Add privacy policy URL
5. Set price (Free)

### Submit for Review
1. Select your uploaded build
2. Complete all required fields
3. Click **Submit for Review**
4. Wait for Apple's review (usually 24-48 hours)

## Troubleshooting

### "No signing certificate" error
- Ensure your certificate is not expired
- Check that the certificate matches the provisioning profile

### "Provisioning profile doesn't match bundle ID"
- Verify bundle ID is exactly `com.pingjob`
- Recreate the provisioning profile if needed

### Build fails on GitHub Actions
- Check that all secrets are correctly set
- Verify base64 encoding is correct (no extra whitespace)
- Review the build logs for specific errors

## Quick Reference Commands

```bash
# Check installed certificates on Mac
security find-identity -v -p codesigning

# List provisioning profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Verify IPA contents
unzip -l PingJob.ipa

# Check provisioning profile details
security cms -D -i profile.mobileprovision
```

## Need Help?

If you encounter issues:
1. Check GitHub Actions logs for detailed error messages
2. Verify all certificates and profiles are valid and not expired
3. Ensure your Apple Developer membership is active
