import { Pool } from 'pg';
import { FacebookTokenRenewer } from './facebook-token-renewal';
import { db } from './db';
import { socialMediaTokens } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface SocialMediaConfig {
  facebook: {
    accessToken: string;
    pageId: string;
  };
  twitter: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  };
  instagram: {
    accessToken: string;
    userId: string;
  };
}

interface JobPostData {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType: string;
  experienceLevel: string;
  salary?: string;
  slug?: string;
}

export class SocialMediaPoster {
  private config: SocialMediaConfig;
  private pool: Pool;
  private tokenRenewer?: FacebookTokenRenewer;

  constructor(config: SocialMediaConfig, pool: Pool, tokenRenewer?: FacebookTokenRenewer) {
    this.config = config;
    this.pool = pool;
    this.tokenRenewer = tokenRenewer;
  }

  async postJobToAllPlatforms(jobData: JobPostData): Promise<{ platform: string; success: boolean; postId?: string; error?: string }[]> {
    const results = [];

    // Post to Facebook
    try {
      const facebookResult = await this.postToFacebook(jobData);
      results.push({ platform: 'facebook', success: true, postId: facebookResult.id });
    } catch (error) {
      console.log(`⚠️ Facebook posting failed: ${(error as Error).message}`);
      
      // Check if it's a token expiry issue
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('session is invalid') || errorMessage.includes('logged out') || errorMessage.includes('access token')) {
        console.log(`🔑 Facebook token appears to be expired. Please refresh your FACEBOOK_ACCESS_TOKEN.`);
        console.log(`📋 Go to https://developers.facebook.com/tools/explorer/ to get a new token.`);
      } else {
        console.log(`💡 Facebook posting requires additional app permissions: pages_manage_posts and pages_read_engagement`);
      }
      
      results.push({ platform: 'facebook', success: false, error: (error as Error).message });
    }

    // Post to Twitter
    try {
      const twitterResult = await this.postToTwitter(jobData);
      results.push({ platform: 'twitter', success: true, postId: twitterResult.id });
    } catch (error) {
      results.push({ platform: 'twitter', success: false, error: (error as Error).message });
    }

    // Post to Instagram
    try {
      const instagramResult = await this.postToInstagram(jobData);
      results.push({ platform: 'instagram', success: true, postId: instagramResult.id });
    } catch (error) {
      results.push({ platform: 'instagram', success: false, error: (error as Error).message });
    }

    // Log posting results to database
    try {
      await this.logSocialMediaPost(jobData.id, results);
      
      // Update job record to mark it as posted if successful
      const facebookResult = results.find(r => r.platform === 'facebook');
      if (facebookResult?.success) {
        console.log(`✅ Successfully posted job ${jobData.id} to Facebook with ID: ${facebookResult.postId}. Updating job status.`);
        // Note: You might want to add a 'posted_to_facebook' column to jobs table later
      }
    } catch (logError) {
      console.error('⚠️ Failed to log social media posting results:', logError);
    }

    return results;
  }

  private async postToFacebook(jobData: JobPostData): Promise<{ id: string }> {
    console.log('🔍 DEBUG: postToFacebook called for job:', jobData.id, jobData.title);
    
    const message = this.generateFacebookPost(jobData);
    
    // Get token from database (REQUIRED - auto-renewed)
    let accessToken: string | null = null;
    
    if (this.tokenRenewer) {
      try {
        accessToken = await this.tokenRenewer.getFacebookToken();
        if (accessToken) {
          console.log('✅ Using Facebook token from database (auto-renewed)');
        } else {
          console.error('❌ No Facebook token found in database!');
          throw new Error('Facebook token not available in database. Please check token renewal system.');
        }
      } catch (tokenError) {
        console.error('❌ Error retrieving Facebook token from database:', tokenError);
        throw new Error(`Failed to retrieve Facebook token: ${(tokenError as Error).message}`);
      }
    } else {
      console.error('❌ Token renewer not initialized!');
      throw new Error('Token renewer not available for Facebook posting');
    }
    
    // Use page feed for posting
    const pageId = this.config.facebook.pageId || process.env.FACEBOOK_PAGE_ID;
    if (!pageId) {
      console.error('❌ Facebook Page ID missing!');
      throw new Error('Facebook Page ID not configured');
    }

    const endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    
    console.log(`📱 Attempting Facebook post to Page ID: ${pageId}`);
    console.log(`📝 Post message length: ${message.length} characters`);
    
    // Facebook API prefers form-encoded data
    const formData = new URLSearchParams();
    formData.append('message', message);
    formData.append('access_token', accessToken);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Facebook API Response Error:', JSON.stringify(responseData, null, 2));
        const errorMsg = responseData.error?.message || 'Unknown Facebook API error';
        
        // Specific error handling for token issues
        if (responseData.error?.code === 190 || errorMsg.includes('access token') || errorMsg.includes('session')) {
          console.error('🔑 Facebook Token Invalid/Expired. Manual intervention may be required if auto-renewal fails.');
        }
        
        throw new Error(`Facebook API error: ${errorMsg}`);
      }

      console.log('✅ Facebook post successful! Post ID:', responseData.id);
      return responseData;
    } catch (fetchError) {
      console.error('❌ Network or API error during Facebook posting:', fetchError);
      throw fetchError;
    }
  }

  private async postToTwitter(jobData: JobPostData): Promise<{ id: string }> {
    const tweet = this.generateTwitterPost(jobData);
    
    // Twitter API v2 requires OAuth 1.0a
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await this.generateTwitterAuthHeader('POST', 'https://api.twitter.com/2/tweets', { text: tweet }),
      },
      body: JSON.stringify({
        text: tweet,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter API error: ${error.detail || 'Unknown error'}`);
    }

    const result = await response.json();
    return { id: result.data.id };
  }

  private async postToInstagram(jobData: JobPostData): Promise<{ id: string }> {
    // Instagram requires image posts, so we'll create a text overlay image
    const imageUrl = await this.generateJobImage(jobData);
    const caption = this.generateInstagramPost(jobData);

    // First, create media object
    const mediaResponse = await fetch(`https://graph.facebook.com/v18.0/${this.config.instagram.userId}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: this.config.instagram.accessToken,
      }),
    });

    if (!mediaResponse.ok) {
      const error = await mediaResponse.json();
      throw new Error(`Instagram Media API error: ${error.error?.message || 'Unknown error'}`);
    }

    const mediaResult = await mediaResponse.json();

    // Then, publish the media
    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${this.config.instagram.userId}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: mediaResult.id,
        access_token: this.config.instagram.accessToken,
      }),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Instagram Publish API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await publishResponse.json();
  }

  private generateFacebookPost(jobData: JobPostData): string {
    const jobUrl = jobData.slug 
      ? `https://www.pingjob.com/jobs/${jobData.id}-${jobData.slug}`
      : `https://www.pingjob.com/jobs/${jobData.id}`;
    
    return `🚀 New Job Opportunity Alert!

📋 Position: ${jobData.title}
🏢 Company: ${jobData.company}
📍 Location: ${jobData.location}
💼 Type: ${jobData.employmentType}
📊 Level: ${jobData.experienceLevel}
${jobData.salary ? `💰 Salary: ${jobData.salary}` : ''}

${jobData.description.substring(0, 200)}${jobData.description.length > 200 ? '...' : ''}

Apply now on PingJob! 👇
${jobUrl}

#JobAlert #Hiring #CareerOpportunity #${jobData.company.replace(/\s+/g, '')}`;
  }

  private generateTwitterPost(jobData: JobPostData): string {
    const baseText = `🚀 ${jobData.title} at ${jobData.company}
📍 ${jobData.location}
💼 ${jobData.employmentType}
📊 ${jobData.experienceLevel}

Apply on PingJob! 

#JobAlert #Hiring #${jobData.company.replace(/\s+/g, '')}`;

    // Twitter has a 280 character limit
    return baseText.length > 280 ? baseText.substring(0, 277) + '...' : baseText;
  }

  private generateInstagramPost(jobData: JobPostData): string {
    return `🚀 New Job Alert! 

We're excited to share this amazing opportunity:

📋 ${jobData.title}
🏢 ${jobData.company}
📍 ${jobData.location}
💼 ${jobData.employmentType}
📊 ${jobData.experienceLevel}
${jobData.salary ? `💰 ${jobData.salary}` : ''}

Ready to take the next step in your career? This could be the perfect fit for you! 

Apply now through PingJob and connect with top employers! 💪

#JobAlert #Hiring #CareerGrowth #${jobData.company.replace(/\s+/g, '')} #PingJob #JobSearch #Career #Opportunity`;
  }

  private async generateJobImage(jobData: JobPostData): Promise<string> {
    // For now, return a placeholder image service URL
    // In production, you'd want to generate actual images with job details
    const encodedTitle = encodeURIComponent(jobData.title);
    const encodedCompany = encodeURIComponent(jobData.company);
    
    return `https://via.placeholder.com/1080x1080/4285F4/ffffff?text=${encodedTitle}%20at%20${encodedCompany}`;
  }

  private async generateTwitterAuthHeader(method: string, url: string, params: any): Promise<string> {
    // This is a simplified OAuth 1.0a implementation
    // In production, use a proper OAuth library like 'oauth-1.0a'
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const oauthParams = {
      oauth_consumer_key: this.config.twitter.apiKey,
      oauth_token: this.config.twitter.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
    };

    // Note: This is a simplified implementation
    // For production, use a proper OAuth 1.0a library
    return `OAuth oauth_consumer_key="${oauthParams.oauth_consumer_key}", oauth_token="${oauthParams.oauth_token}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0"`;
  }

  private async logSocialMediaPost(jobId: number, results: any[]): Promise<void> {
    try {
      // For now, just log the results to console until table structure is fixed
      console.log(`📊 Social media posting results for job ${jobId}:`, results);
      
      // TODO: Uncomment when social_media_posts table is available
      // await this.pool.query(
      //   `INSERT INTO social_media_posts (job_id, platforms_posted, results, created_at) 
      //    VALUES ($1, $2, $3, NOW())`,
      //   [jobId, results.map(r => r.platform), JSON.stringify(results)]
      // );
    } catch (error) {
      console.error('Failed to log social media post:', error);
    }
  }
}

export async function initializeSocialMediaPoster(pool: Pool, tokenRenewer?: FacebookTokenRenewer): Promise<SocialMediaPoster | null> {
  try {
    console.log('🔧 Initializing social media integration...');
    
    // Check for environment variables
    // NOTE: FACEBOOK_ACCESS_TOKEN is NO LONGER USED - tokens come from database
    const facebookPageId = process.env.FACEBOOK_PAGE_ID;
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    const twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const instagramUserId = process.env.INSTAGRAM_USER_ID;

    // Check database for Facebook token using Drizzle ORM
    let facebookTokenFromDb = null;
    let facebookTokenExpiry = null;
    try {
      const tokens = await db
        .select()
        .from(socialMediaTokens)
        .where(eq(socialMediaTokens.platform, 'facebook'));
      
      if (tokens.length > 0) {
        facebookTokenFromDb = tokens[0].accessToken;
        facebookTokenExpiry = tokens[0].expiresAt;
        console.log(`   ✓ Found ${tokens.length} Facebook token(s) in database`);
      } else {
        console.log(`   ℹ️  No Facebook tokens found in database (yet)`);
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log(`   ℹ️  Could not check database for tokens (table may not exist yet)`);
    }

    // Log availability of credentials
    console.log('📋 Social media credentials status:');
    if (facebookTokenFromDb) {
      const expiryDate = facebookTokenExpiry ? new Date(facebookTokenExpiry) : null;
      const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      console.log(`   Facebook Access Token: ✓ In database (auto-renewed)`);
      if (daysUntilExpiry !== null) {
        console.log(`   Facebook Token Validity: ✓ Valid for ${daysUntilExpiry} more days (expires ${expiryDate?.toLocaleDateString()})`);
      }
    } else {
      console.log(`   Facebook Access Token: ✗ Not in database`);
    }
    console.log(`   Twitter API Key: ${twitterApiKey ? '✓ Available' : '✗ Missing'}`);
    console.log(`   Twitter API Secret: ${twitterApiSecret ? '✓ Available' : '✗ Missing'}`);
    console.log(`   Twitter Access Token: ${twitterAccessToken ? '✓ Available' : '✗ Missing'}`);
    console.log(`   Twitter Access Token Secret: ${twitterAccessTokenSecret ? '✓ Available' : '✗ Missing'}`);
    console.log(`   Instagram Access Token: ${instagramAccessToken ? '✓ Available' : '✗ Missing'}`);
    console.log(`   Instagram User ID: ${instagramUserId ? '✓ Available' : '✗ Missing'}`);

    // Create config with available credentials
    const config: SocialMediaConfig = {
      facebook: {
        accessToken: '', // No longer using env var - token comes from database via tokenRenewer
        pageId: facebookPageId || '',
      },
      twitter: {
        apiKey: twitterApiKey || '',
        apiSecret: twitterApiSecret || '',
        accessToken: twitterAccessToken || '',
        accessTokenSecret: twitterAccessTokenSecret || '',
      },
      instagram: {
        accessToken: instagramAccessToken || '',
        userId: instagramUserId || '',
      },
    };

    // Check if any platform has complete credentials
    // Facebook: check database for token OR tokenRenewer system
    const facebookReady = facebookTokenFromDb || !!tokenRenewer;
    const twitterReady = twitterApiKey && twitterApiSecret && twitterAccessToken && twitterAccessTokenSecret;
    const instagramReady = instagramAccessToken && instagramUserId;

    if (!facebookReady && !twitterReady && !instagramReady) {
      console.log('ℹ️  Social media auto-posting not configured - no platforms available');
      console.log('   (Optional) Configure API keys to enable automatic job posting');
      return null;
    }

    // At least one platform is ready
    console.log('✅ SOCIAL MEDIA AUTO-POSTING: ENABLED');
    if (facebookReady) console.log('   ✓ Facebook posting enabled (token auto-renewal system active)');
    if (twitterReady) console.log('   ✓ Twitter posting enabled');
    if (instagramReady) console.log('   ✓ Instagram posting enabled');
    
    return new SocialMediaPoster(config, pool, tokenRenewer);
  } catch (error) {
    console.error('❌ Failed to initialize social media poster:', error);
    return null;
  }
}