import { db } from "./db";
import { socialMediaTokens } from "../shared/schema";
import { eq } from "drizzle-orm";

interface TokenRenewalResult {
  success: boolean;
  platform: string;
  newToken?: string;
  expiresAt?: Date;
  error?: string;
}

export class FacebookTokenRenewer {
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async refreshFacebookToken(oldToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      console.log('🔄 Attempting to refresh Facebook access token...');
      console.log('📧 Using grant_type=fb_exchange_token for 60-day long-lived token');
      
      const url = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
      url.searchParams.append('client_id', this.clientId);
      url.searchParams.append('client_secret', this.clientSecret);
      url.searchParams.append('grant_type', 'fb_exchange_token');
      url.searchParams.append('fb_exchange_token', oldToken);

      console.log(`🌐 Calling Facebook API: ${url.toString().split('?')[0]}`);
      
      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Facebook API Error Response:', JSON.stringify(data, null, 2));
        throw new Error(`Facebook API error: ${data.error?.message || 'Unknown error'}`);
      }

      const expiresIn = data.expires_in || 5184000; // Default: 60 days in seconds (5184000)
      const expiresInDays = Math.round(expiresIn / (24 * 60 * 60));
      
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      console.log(`✅ Facebook token refreshed successfully`);
      console.log(`⏰ New token expires in: ${expiresInDays} days (${expiresIn} seconds)`);
      console.log(`🔑 Token preview: ${data.access_token.substring(0, 20)}...`);
      
      return {
        accessToken: data.access_token,
        expiresIn: expiresIn,
      };
    } catch (error) {
      console.error('❌ Failed to refresh Facebook token:', error);
      throw error;
    }
  }

  async autoRenewExpiredTokens(): Promise<TokenRenewalResult[]> {
    try {
      console.log('⏰ Checking for Facebook tokens expiring in next 2 days...');
      
      // Get all Facebook tokens
      const tokens = await db
        .select()
        .from(socialMediaTokens)
        .where(eq(socialMediaTokens.platform, 'facebook'));

      console.log(`Found ${tokens.length} Facebook token(s) in database`);
      const results: TokenRenewalResult[] = [];

      for (const token of tokens) {
        if (!token.expiresAt) {
          console.log('⚠️ Token has no expiry date, skipping');
          continue;
        }

        const hoursUntilExpiry = (token.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
        const daysUntilExpiry = Math.round(hoursUntilExpiry / 24);
        console.log(`⏳ Token expires in ${daysUntilExpiry} days (${hoursUntilExpiry.toFixed(1)} hours)`);
        console.log(`📅 Expiry date: ${token.expiresAt.toISOString()}`);

    // Renew if expires in 15 days or less (360 hours)
    if (hoursUntilExpiry <= 360) {
      try {
        console.log(`🔴 NOTICE: Token expiring in ${daysUntilExpiry} days. Starting proactive renewal...`);
        const { accessToken, expiresIn } = await this.refreshFacebookToken(token.accessToken);
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
        const newExpiresInDays = Math.round(expiresIn / (24 * 60 * 60));

        // Update database with new token
        await db
          .update(socialMediaTokens)
          .set({
            accessToken: accessToken,
            expiresAt: newExpiresAt,
            lastRenewedAt: new Date(),
          })
          .where(eq(socialMediaTokens.id, token.id));

        console.log(`✅ Token renewed successfully!`);
        console.log(`📦 New token stored in database`);
        console.log(`⏰ New expiry: ${newExpiresAt.toISOString()}`);
        console.log(`📅 Valid for: ${newExpiresInDays} days`);
        
        results.push({
          success: true,
          platform: 'facebook',
          newToken: accessToken,
          expiresAt: newExpiresAt,
        });
      } catch (error) {
        console.error(`❌ Failed to renew token:`, error);
        
        // If renewal fails, we check if it's because the token is actually invalid
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('session is invalid') || errorMsg.includes('password') || errorMsg.includes('security')) {
          console.error('🔑 Proactive renewal failed due to session invalidation. Manual login will be required.');
        }

        results.push({
          success: false,
          platform: 'facebook',
          error: (error as Error).message,
        });
      }
    } else {
      console.log(`✅ Token still valid for ${daysUntilExpiry} days, no renewal needed yet`);
      results.push({
        success: true,
        platform: 'facebook',
        expiresAt: token.expiresAt,
      });
    }
      }

      return results;
    } catch (error) {
      console.error('❌ Token auto-renewal check failed:', error);
      return [{
        success: false,
        platform: 'facebook',
        error: (error as Error).message,
      }];
    }
  }

  // Initialize with first token
  async storeFacebookToken(accessToken: string, expiresIn: number = 5184000): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      // Check if token already exists
      const existing = await db
        .select()
        .from(socialMediaTokens)
        .where(eq(socialMediaTokens.platform, 'facebook'));

      if (existing.length > 0) {
        // Update existing
        await db
          .update(socialMediaTokens)
          .set({
            accessToken: accessToken,
            expiresAt: expiresAt,
            lastRenewedAt: new Date(),
          })
          .where(eq(socialMediaTokens.platform, 'facebook'));
        console.log('✅ Facebook token updated in database');
      } else {
        // Insert new
        await db.insert(socialMediaTokens).values({
          platform: 'facebook',
          accessToken: accessToken,
          expiresAt: expiresAt,
          lastRenewedAt: new Date(),
        });
        console.log('✅ Facebook token stored in database');
      }
    } catch (error) {
      console.error('❌ Failed to store Facebook token:', error);
      throw error;
    }
  }

  // Get current token from database
  async getFacebookToken(): Promise<string | null> {
    try {
      const tokens = await db
        .select()
        .from(socialMediaTokens)
        .where(eq(socialMediaTokens.platform, 'facebook'));

      if (tokens.length === 0) {
        console.warn('⚠️ No Facebook token found in database');
        return null;
      }

      return tokens[0].accessToken;
    } catch (error) {
      console.error('❌ Failed to retrieve Facebook token:', error);
      return null;
    }
  }
}

// Start auto-renewal job (runs every 24 hours)
export function startTokenRenewalJob(renewer: FacebookTokenRenewer): void {
  console.log('🔄 Starting Facebook token auto-renewal job (runs every 24 hours)');
  
  // Run immediately on startup
  renewer.autoRenewExpiredTokens().catch(error => {
    console.error('❌ Initial token renewal check failed:', error);
  });

  // Then run every 24 hours
  setInterval(() => {
    console.log('⏰ Running scheduled Facebook token renewal check...');
    renewer.autoRenewExpiredTokens().catch(error => {
      console.error('❌ Scheduled token renewal check failed:', error);
    });
  }, 24 * 60 * 60 * 1000); // 24 hours
}
