# PingJob - Job Board and Professional Networking Platform

## Overview
PingJob is a full-stack web application serving as a job board and professional networking platform. Its primary goal is to connect job seekers with relevant opportunities and foster professional relationships. Key features include robust user authentication, comprehensive user and company profiles, efficient job listing and application management, and advanced networking capabilities. The platform aims to be a leader in online recruitment by providing a secure, intuitive, and feature-rich experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React with TypeScript, Vite, Radix UI, and Tailwind CSS to deliver a clean, intuitive, and consistently branded user experience, drawing inspiration from professional platforms like LinkedIn.

### Technical Implementations
- **Frontend**: React 18, Vite, React Query, React Hook Form with Zod.
- **Backend**: Node.js with Express.js and TypeScript.
- **Database ORM**: Drizzle ORM for PostgreSQL.
- **Authentication**: Custom session-based authentication with Scrypt hashing and Google OAuth, including email verification with OTP/link-based methods and smart redirect for user intent preservation.
- **File Storage**: AWS S3 with CloudFront CDN for production.
- **Session Management**: PostgreSQL-based session management (`connect-pg-simple`).
- **Mobile Development**: Cross-platform mobile app development using Capacitor (Android and iOS) with mobile-optimized CSS.

### Feature Specifications
- **User Management**: Multi-user type support (job seekers, recruiters, clients, administrators), comprehensive profiles with resume/image uploads, education, experience, and skills.
- **Company Management**: Company profiles with logo uploads and administrative approval workflows.
- **Job Management**: Job posting, application tracking, advanced search/filtering, automated email notifications, and SEO-friendly slug generation for job URLs.
- **Networking**: Professional connections, direct messaging, and groups.
- **Advanced Features**: Resume parsing & scoring for intelligent job-resume matching.
- **Admin & Recruiter Tools**: Dashboards for managing users, companies, jobs, analytics, and communication.
- **Monetization**: Multi-step payment flow for paid accounts with subscription-based access control for features like company creation.
- **Social Media Integration**: Automatic posting of job listings to Facebook, including an auto-renewal system for Facebook access tokens.

### System Design Choices
- **Design Principles**: Focus on clean UI/UX, performance optimization (efficient queries, caching), and robust security (Helmet middleware, rate limiting, input validation, strong password policies).
- **Scalability**: Designed for cloud deployment with flexible port configuration and health checks.
- **Access Control**: Subscription-based access restriction for certain functionalities.

## External Dependencies
- **Database**: PostgreSQL (Neon.tech)
- **ORM**: Drizzle ORM
- **UI Libraries**: Radix UI, Tailwind CSS
- **Validation**: Zod
- **Build Tools**: Vite
- **File Uploads**: Multer (for temporary local storage before S3 upload)
- **Password Hashing**: Scrypt
- **Session Management**: Express-session, connect-pg-simple
- **Cloud Storage**: AWS S3 (@aws-sdk/client-s3), CloudFront CDN
- **Email Service**: SendGrid
- **Analytics**: Google Analytics 4
- **Advertising**: Google AdSense (web), Google AdMob (mobile)
- **Authentication**: Google OAuth
- **Mobile Development**: Capacitor, @capacitor-community/admob
- **Social Media APIs**: Facebook
- **Payment Processing**: Stripe (credit card payments, subscription management)

## Recent Updates (December 2, 2025)

### Session & Authentication Cache Fix
- **Status**: ✅ Fixed and Deployed
- **Issues Resolved**:
  1. **Browser Cache/Cookie Persistence**: Fixed session cookie clearing on logout to prevent showing logged-in state after browser restart
  2. **Passport Data Clearing**: Added proper clearing of Passport user data during logout to prevent session hijacking
  3. **Cookie Options Matching**: Ensured logout cookie clearing options match exact session creation options (sameSite, secure, httpOnly)
  4. **React Query Cache**: Configured with `gcTime: 0` and `staleTime: 0` to prevent stale cached auth data
- **Implementation Files**: `server/auth.ts` (logoutHandler function), `client/src/hooks/use-auth.tsx` (useAuth hook)
- **How Fix Works**:
  - Logout now properly destroys session in database
  - Clears Passport serialized user data
  - Removes session cookie with matching options
  - Client-side clears all query caches and localStorage
  - On page refresh, server returns 401 (no session), client shows homepage

### Google AdSense Text-Only Ads Implementation
- **Status**: ✅ Fully Operational
- **Ad Slot**: 3731759815 (text-only ad format)
- **Placement Locations**:
  - Homepage: Text-only ads between featured sections
  - Companies Page: Desktop (between rows), Mobile (after every 2 companies)
  - Jobs Page (`jobs-original.tsx`): After every 2 jobs for non-logged-in users only
- **Dev Mode**: Shows gray placeholder boxes ("📢 Google AdSense (Dev Mode)") for visualization
- **Visibility**: Only displays for non-logged-in users in production
- **Configuration**:
  - Ad Format: fluid
  - Layout Key: "-gw-3+1f-3d+2z"
  - Publisher ID: ca-pub-9555763610767023
  - GoogleAdsense Component: `client/src/components/ads/GoogleAdsense.tsx` with dev mode error suppression
- **Responsive Design**: Ads properly sized for both mobile and desktop views

### Facebook Auto-Posting System
- **Status**: ✅ Active and Operational
- **Auto-Renewal**: Daily token renewal system operational
- **Current Token Validity**: 18 days remaining (expires 12/20/2025)
- **Implementation Files**: `server/facebook-token-renewal.ts`, `server/social-media.ts`

### Google OAuth Integration
- **Status**: ✅ Fully Functional
- **Account Type Selection**: Auto-login after selection with proper React Query cache updates
- **Callback URL**: Uses dynamic domain detection for development/production
- **Session Handling**: Uses Passport.js req.login() for seamless authentication

## Recent Updates (December 3, 2025)

### Native iOS App Created
- **Status**: ✅ Complete - Ready for App Store
- **Technology**: Swift/SwiftUI with WKWebView
- **Bundle ID**: com.pingjob
- **Deployment Target**: iOS 15.0+
- **Location**: `ios/PingJob/` directory
- **Key Files**:
  - `PingJobApp.swift` - App entry point with deep link handling
  - `ContentView.swift` - Main view with splash screen overlay
  - `WebViewContainer.swift` - WKWebView wrapper with OAuth support
  - `Info.plist` - Permissions and URL schemes
  - `project.pbxproj` - Xcode project configuration
- **Features**:
  - Loads https://www.pingjob.com in native WKWebView
  - OAuth deep link handling via `pingjob://` URL scheme
  - Native splash screen with auto-dismiss
  - Custom user agent for app identification
  - Camera and photo library permissions for uploads
  - Associated domains for universal links
- **OAuth Implementation**: Uses JavaScript injection to forward deep link callbacks to web content, matching Android Capacitor behavior
- **Build Instructions**: See `ios/README.md`
