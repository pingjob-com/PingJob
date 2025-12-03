import fs from "fs";
import path from "path";
import { type Express, type Request, type Response, type NextFunction } from "express";

// Meta tags configuration for each route
export function getMetaTagsForRoute(pathname: string): {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
} {
  // Remove query strings and hash
  const cleanPath = pathname.split("?")[0].split("#")[0].toLowerCase();

  // Job details page (dynamic: /jobs/ID-slug)
  if (cleanPath.match(/^\/jobs\/[^/]+/)) {
    return {
      title: "Job Details - PingJob",
      description: "View detailed job information and apply now on PingJob. Find your next career opportunity.",
      keywords: "job details, job posting, career, employment, apply",
      ogTitle: "Job Opportunity - PingJob",
      ogDescription: "Explore this job opportunity and apply today on PingJob.",
      ogUrl: `https://www.pingjob.com${cleanPath}`,
    };
  }

  // Company details page (dynamic: /companies/ID-slug)
  if (cleanPath.match(/^\/companies\/[^/]+/) && !cleanPath.match(/^\/companies\/?$/)) {
    return {
      title: "Company Profile - PingJob",
      description: "View company information, jobs, and career opportunities on PingJob.",
      keywords: "company profile, employer, careers, jobs",
      ogTitle: "Company Profile - PingJob",
      ogDescription: "Discover company information and available job opportunities.",
      ogUrl: `https://www.pingjob.com${cleanPath}`,
    };
  }

  // Jobs listing page
  if (cleanPath === "/jobs") {
    return {
      title: "Job Listings - Find Your Next Job | PingJob",
      description: "Browse thousands of job listings across various industries. Find your next career opportunity on PingJob.",
      keywords: "job listings, jobs, careers, employment, hiring",
      ogTitle: "Find Jobs on PingJob",
      ogDescription: "Explore job opportunities and connect with top employers.",
      ogUrl: "https://www.pingjob.com/jobs",
    };
  }

  // Companies page
  if (cleanPath === "/companies") {
    return {
      title: "Companies - Explore Top Employers | PingJob",
      description: "Discover leading companies hiring on PingJob. View company profiles, job openings, and career opportunities.",
      keywords: "companies, employers, hiring, careers, jobs",
      ogTitle: "Top Companies Hiring - PingJob",
      ogDescription: "Explore companies and their job opportunities on PingJob.",
      ogUrl: "https://www.pingjob.com/companies",
    };
  }

  // Categories/jobs by category page
  if (cleanPath.match(/^\/categories\/[^/]+\/jobs/)) {
    return {
      title: "Jobs by Category - PingJob",
      description: "Browse job listings by category on PingJob. Find opportunities in your industry of choice.",
      keywords: "jobs, categories, industry, employment",
      ogTitle: "Jobs by Category - PingJob",
      ogDescription: "Explore jobs organized by category on PingJob.",
      ogUrl: `https://www.pingjob.com${cleanPath}`,
    };
  }

  // Profile page
  if (cleanPath === "/profile" || cleanPath.match(/^\/profile\/[^/]+/)) {
    return {
      title: "User Profile - PingJob",
      description: "View and manage your professional profile on PingJob. Showcase your experience, skills, and education.",
      keywords: "profile, user profile, resume, experience, skills",
      ogTitle: "Professional Profile - PingJob",
      ogDescription: "Check out this professional profile on PingJob.",
      ogUrl: `https://www.pingjob.com${cleanPath}`,
    };
  }

  // Dashboard
  if (cleanPath === "/dashboard") {
    return {
      title: "Dashboard - PingJob",
      description: "Your personal PingJob dashboard. Manage job applications, profile, and career opportunities.",
      keywords: "dashboard, applications, job applications, career",
      ogTitle: "Your Dashboard - PingJob",
      ogDescription: "Manage your job search and career on PingJob.",
      ogUrl: "https://www.pingjob.com/dashboard",
    };
  }

  // Recruiter Dashboard
  if (cleanPath === "/recruiter-dashboard") {
    return {
      title: "Recruiter Dashboard - PingJob",
      description: "Manage job postings, applications, and candidates on PingJob.",
      keywords: "recruiter, dashboard, job management, candidates",
      ogTitle: "Recruiter Dashboard - PingJob",
      ogDescription: "Manage your recruitment activities on PingJob.",
      ogUrl: "https://www.pingjob.com/recruiter-dashboard",
    };
  }

  // Enterprise Dashboard
  if (cleanPath === "/enterprise-dashboard") {
    return {
      title: "Enterprise Dashboard - PingJob",
      description: "Enterprise tools for managing large-scale recruitment on PingJob.",
      keywords: "enterprise, dashboard, recruitment, management",
      ogTitle: "Enterprise Dashboard - PingJob",
      ogDescription: "Advanced recruitment management tools on PingJob.",
      ogUrl: "https://www.pingjob.com/enterprise-dashboard",
    };
  }

  // Job Create page
  if (cleanPath === "/job-create") {
    return {
      title: "Post a Job - PingJob",
      description: "Create and post a new job listing on PingJob. Reach thousands of qualified candidates.",
      keywords: "post job, job listing, create job, hiring",
      ogTitle: "Post a Job - PingJob",
      ogDescription: "Create a job listing and start hiring on PingJob.",
      ogUrl: "https://www.pingjob.com/job-create",
    };
  }

  // Company Create page
  if (cleanPath === "/company-create" || cleanPath === "/company/create" || cleanPath === "/companies/create") {
    return {
      title: "Create Company Profile - PingJob",
      description: "Create your company profile on PingJob. Start posting jobs and attracting top talent.",
      keywords: "create company, company profile, business",
      ogTitle: "Create Company Profile - PingJob",
      ogDescription: "Set up your company on PingJob and start hiring.",
      ogUrl: "https://www.pingjob.com/company-create",
    };
  }

  // Applications page
  if (cleanPath === "/applications") {
    return {
      title: "Applications - PingJob",
      description: "View and manage your job applications on PingJob.",
      keywords: "applications, job applications, status",
      ogTitle: "Your Applications - PingJob",
      ogDescription: "Track your job applications on PingJob.",
      ogUrl: "https://www.pingjob.com/applications",
    };
  }

  // Network page
  if (cleanPath === "/network") {
    return {
      title: "Professional Network - PingJob",
      description: "Build and manage your professional network on PingJob. Connect with industry experts and professionals.",
      keywords: "network, connections, professionals, networking",
      ogTitle: "Professional Network - PingJob",
      ogDescription: "Expand your professional network on PingJob.",
      ogUrl: "https://www.pingjob.com/network",
    };
  }

  // Messaging page
  if (cleanPath === "/messaging") {
    return {
      title: "Messages - PingJob",
      description: "Send and receive messages with other professionals on PingJob.",
      keywords: "messaging, messages, communication",
      ogTitle: "Messages - PingJob",
      ogDescription: "Communicate with other professionals on PingJob.",
      ogUrl: "https://www.pingjob.com/messaging",
    };
  }

  // About page
  if (cleanPath === "/about") {
    return {
      title: "About PingJob - Job Board & Professional Networking",
      description: "Learn about PingJob, a comprehensive job board and professional networking platform connecting job seekers with opportunities.",
      keywords: "about PingJob, job board, professional networking, careers",
      ogTitle: "About PingJob",
      ogDescription: "Discover PingJob - the premier job board and professional networking platform.",
      ogUrl: "https://www.pingjob.com/about",
    };
  }

  // Pricing page
  if (cleanPath === "/pricing") {
    return {
      title: "Pricing - PingJob Plans & Features",
      description: "Explore PingJob pricing plans. Find the perfect plan for your recruiting needs.",
      keywords: "pricing, plans, features, subscription",
      ogTitle: "PingJob Pricing",
      ogDescription: "Choose the right plan for your needs on PingJob.",
      ogUrl: "https://www.pingjob.com/pricing",
    };
  }

  // Privacy page
  if (cleanPath === "/privacy") {
    return {
      title: "Privacy Policy - PingJob",
      description: "Read PingJob's privacy policy. Learn how we protect your data and personal information.",
      keywords: "privacy, policy, data protection",
      ogTitle: "Privacy Policy - PingJob",
      ogDescription: "PingJob Privacy Policy",
      ogUrl: "https://www.pingjob.com/privacy",
    };
  }

  // Terms page
  if (cleanPath === "/terms") {
    return {
      title: "Terms of Service - PingJob",
      description: "Read the terms of service for PingJob. Understand the rules and agreements for using our platform.",
      keywords: "terms, service, agreement, conditions",
      ogTitle: "Terms of Service - PingJob",
      ogDescription: "PingJob Terms of Service",
      ogUrl: "https://www.pingjob.com/terms",
    };
  }

  // Contact page
  if (cleanPath === "/contact") {
    return {
      title: "Contact Us - PingJob",
      description: "Get in touch with PingJob. Have questions? We'd love to hear from you.",
      keywords: "contact, support, help, inquiries",
      ogTitle: "Contact PingJob",
      ogDescription: "Reach out to PingJob support.",
      ogUrl: "https://www.pingjob.com/contact",
    };
  }

  // Contact Sales page
  if (cleanPath === "/contact-sales") {
    return {
      title: "Contact Sales - PingJob",
      description: "Contact our sales team at PingJob. Learn about enterprise solutions and custom plans.",
      keywords: "sales, contact, enterprise, solutions",
      ogTitle: "Contact Sales - PingJob",
      ogDescription: "Speak with our sales team at PingJob.",
      ogUrl: "https://www.pingjob.com/contact-sales",
    };
  }

  // Auth/Login page
  if (cleanPath === "/auth") {
    return {
      title: "Sign In - PingJob",
      description: "Log in to your PingJob account or create one. Access jobs, applications, and your professional network.",
      keywords: "sign in, login, account, access",
      ogTitle: "Sign In to PingJob",
      ogDescription: "Log in to your PingJob account.",
      ogUrl: "https://www.pingjob.com/auth",
    };
  }

  // Forgot Password page
  if (cleanPath === "/forgot-password") {
    return {
      title: "Forgot Password - PingJob",
      description: "Reset your PingJob password. Enter your email to recover your account.",
      keywords: "forgot password, reset, recovery",
      ogTitle: "Forgot Password - PingJob",
      ogDescription: "Reset your password on PingJob.",
      ogUrl: "https://www.pingjob.com/forgot-password",
    };
  }

  // Reset Password page
  if (cleanPath === "/reset-password" || cleanPath.startsWith("/reset-password?")) {
    return {
      title: "Reset Password - PingJob",
      description: "Reset your PingJob password. Create a new secure password for your account.",
      keywords: "reset password, new password, security",
      ogTitle: "Reset Password - PingJob",
      ogDescription: "Set a new password for your PingJob account.",
      ogUrl: "https://www.pingjob.com/reset-password",
    };
  }

  // Verify Email page
  if (cleanPath === "/verify-email" || cleanPath.startsWith("/verify-email?")) {
    return {
      title: "Verify Email - PingJob",
      description: "Verify your email address to complete your PingJob account setup.",
      keywords: "verify email, email verification, account setup",
      ogTitle: "Verify Email - PingJob",
      ogDescription: "Complete email verification on PingJob.",
      ogUrl: "https://www.pingjob.com/verify-email",
    };
  }

  // Checkout page
  if (cleanPath === "/checkout") {
    return {
      title: "Checkout - PingJob",
      description: "Complete your PingJob subscription purchase. Secure payment processing.",
      keywords: "checkout, payment, subscription, purchase",
      ogTitle: "Checkout - PingJob",
      ogDescription: "Complete your purchase on PingJob.",
      ogUrl: "https://www.pingjob.com/checkout",
    };
  }

  // Default home page
  return {
    title: "PingJob - Job Board & Professional Networking Platform",
    description: "PingJob is a comprehensive job board and professional networking platform. Find jobs, connect with professionals, and build your career.",
    keywords: "job board, jobs, careers, employment, professional networking, hiring",
    ogTitle: "PingJob - Find Your Next Opportunity",
    ogDescription: "Discover job opportunities and professional networking on PingJob.",
    ogUrl: "https://www.pingjob.com/",
  };
}

// Generate meta tags HTML
export function generateMetaTags(metaTags: ReturnType<typeof getMetaTagsForRoute>): string {
  return `<title>${metaTags.title}</title>
    <meta name="description" content="${metaTags.description}" />
    <meta name="keywords" content="${metaTags.keywords}" />
    <meta property="og:title" content="${metaTags.ogTitle}" />
    <meta property="og:description" content="${metaTags.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${metaTags.ogUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${metaTags.ogTitle}" />
    <meta name="twitter:description" content="${metaTags.ogDescription}" />
    <link rel="canonical" href="${metaTags.ogUrl}" />`;
}

// Middleware for production meta tag injection
export function createMetaTagsMiddleware(distPath: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only intercept HTML requests
    const accept = req.get("accept") || "";
    if (!accept.includes("text/html")) {
      return next();
    }

    const originalSendFile = res.sendFile.bind(res);
    
    res.sendFile = function(filePath: string, options?: any, callback?: any) {
      // Check if this is index.html
      if (filePath.endsWith("index.html")) {
        try {
          // Read the index.html file
          let html = fs.readFileSync(filePath, "utf-8");
          
          // Get the pathname from the request
          const pathname = new URL(req.originalUrl, `http://${req.headers.host}`).pathname;
          
          // Get meta tags for current route
          const metaTags = getMetaTagsForRoute(pathname);
          const metaTagsHtml = generateMetaTags(metaTags);
          
          // Replace the meta tags in the template
          html = html.replace(
            /<title>.*?<\/title>[\s\S]*?<link rel="canonical"[^>]*\/>/,
            metaTagsHtml,
          );
          
          // Send the modified HTML
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
          return res;
        } catch (error) {
          console.error("Error injecting meta tags:", error);
          // Fall back to original sendFile
          return originalSendFile(filePath, options, callback);
        }
      }
      
      // For non-index.html files, use original sendFile
      return originalSendFile(filePath, options, callback);
    } as any;
    
    next();
  };
}
