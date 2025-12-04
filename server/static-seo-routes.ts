import { type Express } from "express";
import { getStaticPageSEOData, generateStaticSEOHTML, generateDefaultStaticSEOHTML } from "./static-seo-template";

/**
 * Helper function to detect if request is from a bot/crawler
 * This is critical for serving pre-rendered HTML to search engines
 */
function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'rogerbot',
    'linkedinbot', 'embedly', 'quora link preview', 'showyoubot',
    'outbrain', 'pinterest', 'slackbot', 'vkShare', 'W3C_Validator',
    'whatsapp', 'flipboard', 'tumblr', 'bitlybot', 'skypeuripreview',
    'nuzzel', 'discordbot', 'qwantify', 'pinterestbot', 'bitrix',
    'applebot', 'mj12bot', 'ahrefsbot', 'semrushbot', 'dotbot',
    'petalbot', 'bytespider', 'seznambot', 'crawler', 'spider', 'bot'
  ];
  const lowerUA = userAgent.toLowerCase();
  return botPatterns.some(bot => lowerUA.includes(bot));
}

/**
 * List of static pages that should serve pre-rendered HTML to bots
 */
const STATIC_SEO_PAGES = [
  '/',
  '/about',
  '/jobs',
  '/companies',
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/auth',
  '/network',
  '/contact-sales'
];

export function registerStaticSEORoutes(app: Express) {
  // Register routes for each static page
  STATIC_SEO_PAGES.forEach(pagePath => {
    app.get(pagePath, (req, res, next) => {
      const userAgent = req.get('user-agent');
      
      // If it's a real user (not a bot), skip SEO HTML and let React app handle it
      if (!isBot(userAgent)) {
        return next();
      }
      
      // Get base URL - use production domain for SEO consistency
      const host = req.get('host') || 'www.pingjob.com';
      const isProduction = host === 'www.pingjob.com' || host === 'pingjob.com';
      
      // Always use HTTPS and www subdomain for production SEO
      const baseUrl = isProduction 
        ? 'https://www.pingjob.com' 
        : `${req.get('x-forwarded-proto') || req.protocol || 'https'}://${host}`;
      
      console.log(`🤖 Bot detected for ${pagePath}, generating SEO HTML (UA: ${userAgent?.substring(0, 50)}...)`);
      
      // Get SEO data for this page
      const seoData = getStaticPageSEOData(pagePath, baseUrl);
      
      if (!seoData) {
        console.log(`⚠️ No SEO data found for ${pagePath}, using default`);
        return res.status(200)
          .set({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "X-Robots-Tag": "index, follow"
          })
          .end(generateDefaultStaticSEOHTML());
      }
      
      // Generate SEO-optimized HTML with real content
      const seoHTML = generateStaticSEOHTML(seoData);
      
      console.log(`✅ Generated SEO HTML for ${pagePath}: ${seoData.title}`);
      
      // Set proper headers for SEO
      res.set({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300", // Cache for 5 minutes
        "X-Robots-Tag": "index, follow"
      });
      
      res.status(200).end(seoHTML);
    });
  });

  console.log(`✅ Static SEO routes registered for ${STATIC_SEO_PAGES.length} pages`);
}
