import { Pool } from 'pg';

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
}

export class SocialMediaPoster {
  private config: SocialMediaConfig;
  private pool: Pool;

  constructor(config: SocialMediaConfig, pool: Pool) {
    this.config = config;
    this.pool = pool;
  }

  async postJobToAllPlatforms(jobData: JobPostData): Promise<{ platform: string; success: boolean; postId?: string; error?: string }[]> {
    const results = [];

    // Post to Facebook
    try {
      const facebookResult = await this.postToFacebook(jobData);
      results.push({ platform: 'facebook', success: true, postId: facebookResult.id });
    } catch (error) {
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
    await this.logSocialMediaPost(jobData.id, results);

    return results;
  }

  private async postToFacebook(jobData: JobPostData): Promise<{ id: string }> {
    const message = this.generateFacebookPost(jobData);
    
    // Use personal feed if no valid page ID is configured
    const endpoint = this.config.facebook.pageId && this.config.facebook.pageId !== 'demo-page-id' 
      ? `https://graph.facebook.com/v18.0/${this.config.facebook.pageId}/feed`
      : `https://graph.facebook.com/v18.0/me/feed`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        access_token: this.config.facebook.accessToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
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
    return `🚀 New Job Opportunity Alert!

📋 Position: ${jobData.title}
🏢 Company: ${jobData.company}
📍 Location: ${jobData.location}
💼 Type: ${jobData.employmentType}
📊 Level: ${jobData.experienceLevel}
${jobData.salary ? `💰 Salary: ${jobData.salary}` : ''}

${jobData.description.substring(0, 200)}${jobData.description.length > 200 ? '...' : ''}

Apply now on PingJob! 👆

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

  private async generateJobImage(jobData: JobPostData): string {
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
      await this.pool.query(
        `INSERT INTO social_media_posts (job_id, platforms_posted, results, created_at) 
         VALUES ($1, $2, $3, NOW())`,
        [jobId, results.map(r => r.platform), JSON.stringify(results)]
      );
    } catch (error) {
      console.error('Failed to log social media post:', error);
    }
  }
}

export async function initializeSocialMediaPoster(pool: Pool): Promise<SocialMediaPoster | null> {
  try {
    // Set up Facebook with provided credentials
    const facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN || 'EAAIazBhDPQIBO1vH1bZBWREUisDl2adipiT7Ewt1fJIVKW5QFcaoboZCiwxkq3CgLSNdLRUnlXlsYIsdn2TYQHtMugSmFRCEybHkAorZCnsZCB7j1sxIplQpzbYRlvBNx0ufEns4su8lnyGVvPwShpyVUWse1oxpI2lO2ECkBQZCzIcL9U3t8fxZCmi48acccLuq2hV9cvSma5QGMdJxgCKoDWge2RtfHk';
    
    // For demo purposes, we'll initialize with Facebook only for now
    if (!facebookAccessToken) {
      console.log('Facebook access token not found - social media posting disabled');
      return null;
    }

    // Create simplified config with just Facebook for now
    const config: SocialMediaConfig = {
      facebook: {
        accessToken: facebookAccessToken,
        pageId: process.env.FACEBOOK_PAGE_ID || 'demo-page-id', // Will be updated when user provides real page ID
      },
      twitter: {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
      },
      instagram: {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
        userId: process.env.INSTAGRAM_USER_ID || '',
      },
    };

    console.log('✓ Social media poster initialized with Facebook integration');
    return new SocialMediaPoster(config, pool);
  } catch (error) {
    console.error('Failed to initialize social media poster:', error);
    return null;
  }
}