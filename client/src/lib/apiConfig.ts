import { Capacitor } from '@capacitor/core';

/**
 * Get the correct API base URL based on environment
 */
export function getApiBaseUrl(): string {
  // Enhanced mobile detection for Android WebView
  const isAndroidWebView = /Android/.test(navigator.userAgent) && /wv/.test(navigator.userAgent);
  const isCapacitorApp = document.URL.startsWith('capacitor://') || 
                         document.URL.startsWith('ionic://') ||
                         (window as any).cordova !== undefined;
  const isLocalhost = document.URL.includes('localhost');
  const isFileProtocol = document.URL.startsWith('file://');
  
  // Try Capacitor detection
  let isCapacitorNative = false;
  try {
    isCapacitorNative = Capacitor.isNativePlatform();
  } catch (e) {
    console.log('Capacitor not available, using alternative detection');
  }
  
  const isNative = isCapacitorNative || isAndroidWebView || isCapacitorApp || isFileProtocol;
  
  console.log('🔍 Mobile detection debug:', {
    isAndroidWebView,
    isCapacitorApp,
    isLocalhost,
    isFileProtocol,
    isCapacitorNative,
    userAgent: navigator.userAgent,
    documentURL: document.URL,
    isNative
  });
  
  // In mobile environment, always use production server
  if (isNative) {
    console.log('🔧 Mobile environment detected - using https://www.pingjob.com');
    return 'https://www.pingjob.com';
  }
  
  // In web environment, use relative URLs (they work fine)
  console.log('🌐 Web environment detected - using relative URLs');
  return '';
}

/**
 * Convert relative API URL to absolute URL when needed
 */
export function resolveApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  
  // If path already includes protocol, return as-is
  if (path.startsWith('http')) {
    console.log(`🔗 URL already absolute: ${path}`);
    return path;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const resolvedUrl = `${baseUrl}${cleanPath}`;
  
  console.log(`🔗 Resolved API URL: ${path} -> ${resolvedUrl}`);
  return resolvedUrl;
}

/**
 * Check if we're in mobile environment
 */
export function isMobileEnvironment(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    // Fallback detection if Capacitor is not available
    const isAndroidWebView = /Android/.test(navigator.userAgent) && /wv/.test(navigator.userAgent);
    const isCapacitorApp = document.URL.startsWith('capacitor://') || 
                           document.URL.startsWith('ionic://') ||
                           (window as any).Capacitor !== undefined;
    return isAndroidWebView || isCapacitorApp;
  }
}

/**
 * CDN URL for PingJob logo - used in headers and footers
 */
export const CDN_LOGO_URL = 'https://cdn.pingjob.com/logo.png';

/**
 * Resolve logo URL to use CDN for all local URLs
 * New uploads use CDN URLs, legacy URLs also converted to CDN
 */
export function resolveLogoUrl(logoUrl: string | null | undefined): string | undefined {
  // Handle null, undefined, or invalid logo URLs
  if (!logoUrl || logoUrl === 'NULL' || logoUrl === 'logos/NULL' || !logoUrl.trim()) {
    return undefined;
  }
  
  // If logo URL is already absolute (includes protocol), return as-is
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    console.log(`🖼️ Logo URL already absolute (CDN): ${logoUrl}`);
    return logoUrl;
  }
  
  // For local URLs, convert to CDN URLs
  // /logos/... → https://cdn.pingjob.com/logos/...
  const cleanLogoUrl = logoUrl.replace(/^\/+/, '').trim().replace(/ /g, '%20');
  const cdnUrl = `https://cdn.pingjob.com/${cleanLogoUrl}`;
  
  console.log(`🖼️ Resolved logo URL to CDN: ${logoUrl} -> ${cdnUrl}`);
  return cdnUrl;
}

/**
 * Resolve profile image URL to use CDN for all local URLs
 * New uploads use CDN URLs, legacy URLs also converted to CDN
 */
export function resolveProfileImageUrl(profileImageUrl: string | null | undefined): string | undefined {
  // Handle null, undefined, or invalid profile image URLs
  if (!profileImageUrl || profileImageUrl === 'NULL' || !profileImageUrl.trim()) {
    return undefined;
  }
  
  // If profile image URL is already absolute (includes protocol), return as-is
  if (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://')) {
    console.log(`👤 Profile image URL already absolute (CDN): ${profileImageUrl}`);
    return profileImageUrl;
  }
  
  // For local URLs, convert to CDN URLs
  // /profiles/... → https://cdn.pingjob.com/profiles/...
  const cleanUrl = profileImageUrl.replace(/^\/+/, '').trim().replace(/ /g, '%20');
  const cdnUrl = `https://cdn.pingjob.com/${cleanUrl}`;
  
  console.log(`👤 Resolved profile image URL to CDN: ${profileImageUrl} -> ${cdnUrl}`);
  return cdnUrl;
}

/**
 * Resolve resume URL to use CDN for all local URLs
 * New uploads use CDN URLs, legacy URLs also converted to CDN
 */
export function resolveResumeUrl(resumeUrl: string | null | undefined): string | undefined {
  // Handle null, undefined, or invalid resume URLs
  if (!resumeUrl || resumeUrl === 'NULL' || !resumeUrl.trim()) {
    return undefined;
  }
  
  // If resume URL is already absolute (includes protocol), return as-is
  if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
    console.log(`📄 Resume URL already absolute (CDN): ${resumeUrl}`);
    return resumeUrl;
  }
  
  // For local URLs, convert to CDN URLs
  // /resumes/... → https://cdn.pingjob.com/resumes/...
  const cleanUrl = resumeUrl.replace(/^\/+/, '').trim().replace(/ /g, '%20');
  const cdnUrl = `https://cdn.pingjob.com/${cleanUrl}`;
  
  console.log(`📄 Resolved resume URL to CDN: ${resumeUrl} -> ${cdnUrl}`);
  return cdnUrl;
}