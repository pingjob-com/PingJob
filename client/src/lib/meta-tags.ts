/**
 * Utility to dynamically set meta tags for better SEO
 * Call this in useEffect on each page to update page metadata
 */

interface MetaTagsConfig {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
}

export function setMetaTags(config: MetaTagsConfig) {
  // Set page title
  document.title = config.title;

  // Update or create meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', config.description);

  // Set keywords if provided
  if (config.keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', config.keywords);
  }

  // Set Open Graph tags for social sharing
  const ogTags = [
    { property: 'og:title', content: config.ogTitle || config.title },
    { property: 'og:description', content: config.ogDescription || config.description },
    { property: 'og:type', content: 'website' }
  ];

  if (config.ogImage) {
    ogTags.push({ property: 'og:image', content: config.ogImage });
  }

  ogTags.forEach(tag => {
    let element = document.querySelector(`meta[property="${tag.property}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('property', tag.property);
      document.head.appendChild(element);
    }
    element.setAttribute('content', tag.content);
  });

  // Set Twitter Card tags
  const twitterTags = [
    { name: 'twitter:card', content: config.twitterCard || 'summary_large_image' },
    { name: 'twitter:title', content: config.ogTitle || config.title },
    { name: 'twitter:description', content: config.ogDescription || config.description }
  ];

  twitterTags.forEach(tag => {
    let element = document.querySelector(`meta[name="${tag.name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', tag.name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', tag.content);
  });

  // Set canonical URL if provided
  if (config.canonicalUrl) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', config.canonicalUrl);
  }
}

export function resetMetaTags() {
  document.title = 'PingJob - Job Board & Professional Networking';
  
  const defaultDescription = 'PingJob is a comprehensive job board and professional networking platform connecting job seekers with opportunities.';
  
  let metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', defaultDescription);
  }
}
