/**
 * Static SEO Template Generator
 * 
 * Generates fully-rendered HTML pages with visible content for search engine crawlers.
 * This solves the SPA indexing problem by providing real content in the initial HTML response.
 */

interface StaticPageSEOData {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  h1: string;
  content: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  structuredData?: object;
}

const sanitize = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export function getStaticPageSEOData(pathname: string, baseUrl: string = 'https://www.pingjob.com'): StaticPageSEOData | null {
  const cleanPath = pathname.split('?')[0].split('#')[0].toLowerCase();

  // Home page
  if (cleanPath === '/' || cleanPath === '') {
    return {
      title: 'PingJob - Job Board & Professional Networking Platform',
      description: 'PingJob is a comprehensive job board and professional networking platform. Find jobs, connect with professionals, and build your career. Browse thousands of job listings from top employers.',
      keywords: 'job board, jobs, careers, employment, professional networking, hiring, job search, career opportunities',
      ogTitle: 'PingJob - Find Your Next Career Opportunity',
      ogDescription: 'Discover job opportunities and professional networking on PingJob. Connect with top employers and find your dream job today.',
      ogUrl: baseUrl,
      h1: 'PingJob - Your Career Starts Here',
      content: `
        <section>
          <h2>Find Your Dream Job</h2>
          <p>PingJob connects talented professionals with leading employers worldwide. Whether you're looking for your first job or seeking new career opportunities, we have thousands of positions waiting for you.</p>
        </section>
        <section>
          <h2>Why Choose PingJob?</h2>
          <ul>
            <li><strong>Thousands of Job Listings</strong> - Browse jobs across all industries and experience levels</li>
            <li><strong>Professional Networking</strong> - Connect with industry professionals and expand your network</li>
            <li><strong>Easy Application Process</strong> - Apply to multiple jobs with just a few clicks</li>
            <li><strong>Career Resources</strong> - Access tools and tips to advance your career</li>
          </ul>
        </section>
        <section>
          <h2>Get Started Today</h2>
          <p>Create your free account and start your job search today. Join thousands of professionals who have found their next opportunity through PingJob.</p>
        </section>
      `,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'PingJob',
        url: baseUrl,
        description: 'Job board and professional networking platform',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/jobs?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    };
  }

  // About page
  if (cleanPath === '/about') {
    return {
      title: 'About PingJob - Job Board & Professional Networking',
      description: 'Learn about PingJob, a comprehensive job board and professional networking platform connecting job seekers with opportunities. Our mission is to make job hunting easier and more effective.',
      keywords: 'about PingJob, job board, professional networking, careers, company information',
      ogTitle: 'About PingJob',
      ogDescription: 'Discover PingJob - the premier job board and professional networking platform helping professionals find their dream careers.',
      ogUrl: `${baseUrl}/about`,
      h1: 'About PingJob',
      content: `
        <section>
          <h2>Our Mission</h2>
          <p>PingJob is dedicated to connecting talented professionals with exceptional career opportunities. We believe everyone deserves access to quality job listings and the tools needed to succeed in their career journey.</p>
        </section>
        <section>
          <h2>What We Offer</h2>
          <ul>
            <li><strong>Job Board</strong> - Comprehensive job listings from verified employers across all industries</li>
            <li><strong>Professional Networking</strong> - Build meaningful connections with industry professionals</li>
            <li><strong>Company Profiles</strong> - Learn about potential employers before you apply</li>
            <li><strong>Career Tools</strong> - Resume building, job alerts, and application tracking</li>
          </ul>
        </section>
        <section>
          <h2>For Employers</h2>
          <p>PingJob provides employers with powerful recruitment tools to find the best candidates. Post jobs, search resumes, and connect with qualified professionals looking for new opportunities.</p>
        </section>
        <section>
          <h2>Join Our Community</h2>
          <p>Whether you're a job seeker or employer, PingJob is here to help you succeed. Create your account today and become part of our growing professional community.</p>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'About', url: `${baseUrl}/about` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About PingJob',
        url: `${baseUrl}/about`,
        mainEntity: {
          '@type': 'Organization',
          name: 'PingJob',
          url: baseUrl,
          description: 'Job board and professional networking platform'
        }
      }
    };
  }

  // Jobs listing page
  if (cleanPath === '/jobs') {
    return {
      title: 'Job Listings - Find Your Next Job | PingJob',
      description: 'Browse thousands of job listings across various industries. Find full-time, part-time, remote, and contract positions. Start your job search today on PingJob.',
      keywords: 'job listings, jobs, careers, employment, hiring, job search, full-time jobs, remote jobs, part-time jobs',
      ogTitle: 'Find Jobs on PingJob',
      ogDescription: 'Explore job opportunities across all industries. Browse thousands of positions and find your perfect career match.',
      ogUrl: `${baseUrl}/jobs`,
      h1: 'Browse Job Listings',
      content: `
        <section>
          <h2>Find Your Perfect Job</h2>
          <p>Explore thousands of job opportunities from top employers. Whether you're looking for remote work, full-time positions, or part-time opportunities, we have something for everyone.</p>
        </section>
        <section>
          <h2>Job Categories</h2>
          <ul>
            <li>Technology & IT</li>
            <li>Marketing & Sales</li>
            <li>Finance & Accounting</li>
            <li>Healthcare</li>
            <li>Engineering</li>
            <li>Design & Creative</li>
            <li>Customer Service</li>
            <li>Human Resources</li>
            <li>Education</li>
            <li>And many more...</li>
          </ul>
        </section>
        <section>
          <h2>Employment Types</h2>
          <ul>
            <li>Full-time positions</li>
            <li>Part-time opportunities</li>
            <li>Remote and hybrid work</li>
            <li>Contract and freelance</li>
            <li>Internships</li>
          </ul>
        </section>
        <section>
          <h2>Start Your Search</h2>
          <p>Use our powerful search and filter tools to find jobs that match your skills, experience, and preferences. Apply to multiple positions with your PingJob profile.</p>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Jobs', url: `${baseUrl}/jobs` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Job Listings',
        url: `${baseUrl}/jobs`,
        description: 'Browse thousands of job listings across various industries',
        mainEntity: {
          '@type': 'ItemList',
          name: 'Available Jobs',
          description: 'Current job openings on PingJob'
        }
      }
    };
  }

  // Companies page
  if (cleanPath === '/companies') {
    return {
      title: 'Companies - Explore Top Employers | PingJob',
      description: 'Discover leading companies hiring on PingJob. View company profiles, job openings, and career opportunities. Research employers before you apply.',
      keywords: 'companies, employers, hiring, careers, jobs, company profiles, top employers',
      ogTitle: 'Top Companies Hiring - PingJob',
      ogDescription: 'Explore companies and their job opportunities on PingJob. Find your ideal employer.',
      ogUrl: `${baseUrl}/companies`,
      h1: 'Explore Companies',
      content: `
        <section>
          <h2>Find Your Ideal Employer</h2>
          <p>Browse company profiles to learn about potential employers before you apply. Discover company culture, benefits, open positions, and more.</p>
        </section>
        <section>
          <h2>Why Research Companies?</h2>
          <ul>
            <li>Understand company culture and values</li>
            <li>View all open positions at a company</li>
            <li>Learn about benefits and perks</li>
            <li>Read about company history and mission</li>
            <li>See company size and industry</li>
          </ul>
        </section>
        <section>
          <h2>Featured Industries</h2>
          <ul>
            <li>Technology</li>
            <li>Healthcare</li>
            <li>Finance</li>
            <li>Retail</li>
            <li>Manufacturing</li>
            <li>Education</li>
            <li>And many more...</li>
          </ul>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Companies', url: `${baseUrl}/companies` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Companies',
        url: `${baseUrl}/companies`,
        description: 'Browse companies hiring on PingJob'
      }
    };
  }

  // Pricing page
  if (cleanPath === '/pricing') {
    return {
      title: 'Pricing - PingJob Plans & Features',
      description: 'Explore PingJob pricing plans for job seekers and employers. Find the perfect plan for your recruiting needs. Free and premium options available.',
      keywords: 'pricing, plans, features, subscription, job posting, recruitment, employer plans',
      ogTitle: 'PingJob Pricing',
      ogDescription: 'Choose the right plan for your needs on PingJob. Explore our pricing options.',
      ogUrl: `${baseUrl}/pricing`,
      h1: 'Pricing Plans',
      content: `
        <section>
          <h2>Choose the Right Plan for You</h2>
          <p>PingJob offers flexible pricing options for job seekers and employers. Whether you're looking for a job or hiring talent, we have a plan that fits your needs.</p>
        </section>
        <section>
          <h2>For Job Seekers</h2>
          <ul>
            <li>Free account creation and job applications</li>
            <li>Profile visibility to employers</li>
            <li>Job alerts and notifications</li>
            <li>Premium features for enhanced visibility</li>
          </ul>
        </section>
        <section>
          <h2>For Employers</h2>
          <ul>
            <li>Job posting packages</li>
            <li>Resume search access</li>
            <li>Company profile pages</li>
            <li>Applicant tracking tools</li>
            <li>Enterprise solutions for large organizations</li>
          </ul>
        </section>
        <section>
          <h2>Contact Us</h2>
          <p>Have questions about our pricing? Contact our sales team for custom enterprise solutions and special offers.</p>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Pricing', url: `${baseUrl}/pricing` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Pricing',
        url: `${baseUrl}/pricing`,
        description: 'PingJob pricing plans and features'
      }
    };
  }

  // Contact page
  if (cleanPath === '/contact') {
    return {
      title: 'Contact Us - PingJob',
      description: 'Get in touch with PingJob. Have questions about our platform? We would love to hear from you. Contact our support team.',
      keywords: 'contact, support, help, inquiries, customer service',
      ogTitle: 'Contact PingJob',
      ogDescription: 'Reach out to PingJob support. We are here to help.',
      ogUrl: `${baseUrl}/contact`,
      h1: 'Contact Us',
      content: `
        <section>
          <h2>Get in Touch</h2>
          <p>Have questions or need assistance? Our team is here to help. Choose the best way to reach us below.</p>
        </section>
        <section>
          <h2>Contact Options</h2>
          <ul>
            <li><strong>General Inquiries</strong> - Questions about PingJob and our services</li>
            <li><strong>Technical Support</strong> - Help with your account or technical issues</li>
            <li><strong>Employer Support</strong> - Assistance with job postings and recruitment</li>
            <li><strong>Partnership Inquiries</strong> - Business development and partnerships</li>
          </ul>
        </section>
        <section>
          <h2>Response Time</h2>
          <p>We aim to respond to all inquiries within 24-48 business hours. For urgent matters, please indicate so in your message.</p>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Contact', url: `${baseUrl}/contact` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact Us',
        url: `${baseUrl}/contact`
      }
    };
  }

  // Privacy page
  if (cleanPath === '/privacy') {
    return {
      title: 'Privacy Policy - PingJob',
      description: 'Read PingJob privacy policy. Learn how we protect your data and personal information. Your privacy is important to us.',
      keywords: 'privacy, policy, data protection, personal information, GDPR',
      ogTitle: 'Privacy Policy - PingJob',
      ogDescription: 'PingJob Privacy Policy - How we protect your data',
      ogUrl: `${baseUrl}/privacy`,
      h1: 'Privacy Policy',
      content: `
        <section>
          <h2>Your Privacy Matters</h2>
          <p>At PingJob, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our platform.</p>
        </section>
        <section>
          <h2>Information We Collect</h2>
          <ul>
            <li>Account information (name, email, password)</li>
            <li>Profile information (resume, work history, skills)</li>
            <li>Usage data and preferences</li>
            <li>Communication preferences</li>
          </ul>
        </section>
        <section>
          <h2>How We Use Your Data</h2>
          <ul>
            <li>To provide and improve our services</li>
            <li>To match you with relevant job opportunities</li>
            <li>To communicate with you about your account</li>
            <li>To ensure platform security</li>
          </ul>
        </section>
        <section>
          <h2>Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. Contact us for any privacy-related requests.</p>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Privacy Policy', url: `${baseUrl}/privacy` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Privacy Policy',
        url: `${baseUrl}/privacy`
      }
    };
  }

  // Terms page
  if (cleanPath === '/terms') {
    return {
      title: 'Terms of Service - PingJob',
      description: 'Read the terms of service for PingJob. Understand the rules and agreements for using our job board and professional networking platform.',
      keywords: 'terms, service, agreement, conditions, legal',
      ogTitle: 'Terms of Service - PingJob',
      ogDescription: 'PingJob Terms of Service',
      ogUrl: `${baseUrl}/terms`,
      h1: 'Terms of Service',
      content: `
        <section>
          <h2>Agreement to Terms</h2>
          <p>By using PingJob, you agree to these terms of service. Please read them carefully before using our platform.</p>
        </section>
        <section>
          <h2>Use of Service</h2>
          <ul>
            <li>You must be at least 18 years old to use PingJob</li>
            <li>You agree to provide accurate information</li>
            <li>You will not misuse or abuse the platform</li>
            <li>You are responsible for your account security</li>
          </ul>
        </section>
        <section>
          <h2>User Responsibilities</h2>
          <ul>
            <li>Maintain accurate profile information</li>
            <li>Respect other users and employers</li>
            <li>Report suspicious activity</li>
            <li>Comply with all applicable laws</li>
          </ul>
        </section>
        <section>
          <h2>Contact Us</h2>
          <p>If you have questions about these terms, please contact our support team.</p>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Terms of Service', url: `${baseUrl}/terms` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Terms of Service',
        url: `${baseUrl}/terms`
      }
    };
  }

  // Auth/Login page
  if (cleanPath === '/auth') {
    return {
      title: 'Sign In - PingJob',
      description: 'Log in to your PingJob account or create one. Access jobs, applications, and your professional network.',
      keywords: 'sign in, login, account, access, register',
      ogTitle: 'Sign In to PingJob',
      ogDescription: 'Log in to your PingJob account.',
      ogUrl: `${baseUrl}/auth`,
      h1: 'Sign In to PingJob',
      content: `
        <section>
          <h2>Access Your Account</h2>
          <p>Sign in to your PingJob account to access your applications, saved jobs, and professional network.</p>
        </section>
        <section>
          <h2>New to PingJob?</h2>
          <p>Create a free account to start your job search, build your professional profile, and connect with employers.</p>
          <ul>
            <li>Apply to jobs with one click</li>
            <li>Get personalized job recommendations</li>
            <li>Track your applications</li>
            <li>Connect with professionals</li>
          </ul>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Sign In', url: `${baseUrl}/auth` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Sign In',
        url: `${baseUrl}/auth`
      }
    };
  }

  // Network page
  if (cleanPath === '/network') {
    return {
      title: 'Professional Network - PingJob',
      description: 'Build and manage your professional network on PingJob. Connect with industry experts and professionals to advance your career.',
      keywords: 'network, connections, professionals, networking, career connections',
      ogTitle: 'Professional Network - PingJob',
      ogDescription: 'Expand your professional network on PingJob.',
      ogUrl: `${baseUrl}/network`,
      h1: 'Professional Network',
      content: `
        <section>
          <h2>Build Your Network</h2>
          <p>Connect with professionals in your industry. Networking is key to career success, and PingJob makes it easy to build meaningful connections.</p>
        </section>
        <section>
          <h2>Networking Benefits</h2>
          <ul>
            <li>Connect with industry professionals</li>
            <li>Get referrals and recommendations</li>
            <li>Stay informed about opportunities</li>
            <li>Share knowledge and insights</li>
          </ul>
        </section>
      `,
      breadcrumbs: [
        { name: 'Home', url: baseUrl },
        { name: 'Network', url: `${baseUrl}/network` }
      ],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Professional Network',
        url: `${baseUrl}/network`
      }
    };
  }

  return null;
}

export function generateStaticSEOHTML(data: StaticPageSEOData): string {
  const breadcrumbsHtml = data.breadcrumbs ? `
    <nav aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        ${data.breadcrumbs.map((item, index) => `
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="${sanitize(item.url)}">
              <span itemprop="name">${sanitize(item.name)}</span>
            </a>
            <meta itemprop="position" content="${index + 1}" />
          </li>
        `).join('')}
      </ol>
    </nav>
  ` : '';

  const structuredDataScript = data.structuredData ? `
    <script type="application/ld+json">
      ${JSON.stringify(data.structuredData)}
    </script>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    
    <!-- Primary Meta Tags -->
    <title>${sanitize(data.title)}</title>
    <meta name="title" content="${sanitize(data.title)}" />
    <meta name="description" content="${sanitize(data.description)}" />
    <meta name="keywords" content="${sanitize(data.keywords)}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${sanitize(data.ogUrl)}" />
    <meta property="og:title" content="${sanitize(data.ogTitle)}" />
    <meta property="og:description" content="${sanitize(data.ogDescription)}" />
    <meta property="og:site_name" content="PingJob" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${sanitize(data.ogUrl)}" />
    <meta property="twitter:title" content="${sanitize(data.ogTitle)}" />
    <meta property="twitter:description" content="${sanitize(data.ogDescription)}" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${sanitize(data.ogUrl)}" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    
    <!-- Preload Logo from CDN -->
    <link rel="preload" as="image" href="https://cdn.pingjob.com/logo.webp" />
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-BQEKEPGNZN"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-BQEKEPGNZN');
    </script>
    
    <!-- Structured Data -->
    ${structuredDataScript}
    
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
      h1 { color: #1a1a1a; font-size: 2.5rem; margin-bottom: 1rem; }
      h2 { color: #2a2a2a; font-size: 1.5rem; margin-top: 2rem; }
      ul { padding-left: 1.5rem; }
      li { margin-bottom: 0.5rem; }
      a { color: #0066cc; }
      nav ol { list-style: none; padding: 0; display: flex; gap: 0.5rem; }
      nav li::after { content: ' / '; }
      nav li:last-child::after { content: ''; }
      section { margin-bottom: 2rem; }
    </style>
  </head>
  <body>
    <div id="root" style="display: block; visibility: visible; opacity: 1; width: 100%; min-height: 100vh;">
      ${breadcrumbsHtml}
      
      <main>
        <h1>${sanitize(data.h1)}</h1>
        ${data.content}
      </main>
      
      <footer>
        <p>&copy; ${new Date().getFullYear()} PingJob. All rights reserved.</p>
        <nav>
          <a href="/">Home</a> |
          <a href="/jobs">Jobs</a> |
          <a href="/companies">Companies</a> |
          <a href="/about">About</a> |
          <a href="/privacy">Privacy</a> |
          <a href="/terms">Terms</a> |
          <a href="/contact">Contact</a>
        </nav>
      </footer>
      
      <noscript>
        <p>JavaScript is required to use PingJob interactively. Enable JavaScript for the full experience.</p>
        ${data.content}
      </noscript>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

export function generateDefaultStaticSEOHTML(): string {
  return generateStaticSEOHTML({
    title: 'PingJob - Job Board & Professional Networking Platform',
    description: 'PingJob is a comprehensive job board and professional networking platform. Find jobs, connect with professionals, and build your career.',
    keywords: 'job board, jobs, careers, employment, professional networking, hiring',
    ogTitle: 'PingJob - Find Your Next Opportunity',
    ogDescription: 'Discover job opportunities and professional networking on PingJob.',
    ogUrl: 'https://www.pingjob.com/',
    h1: 'PingJob - Your Career Starts Here',
    content: '<p>Welcome to PingJob, your destination for job opportunities and professional networking.</p>'
  });
}
