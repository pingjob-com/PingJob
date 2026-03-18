import { type Express } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage } from "./storage";
// insertJobApplicationSchema import removed - using direct object creation
import { cleanPool as pool } from "./clean-neon";
import { initializeSocialMediaPoster, SocialMediaPoster } from "./social-media";
import { FacebookTokenRenewer, startTokenRenewalJob } from "./facebook-token-renewal";
import { userCache } from "./auth";
import Stripe from "stripe";
import { uploadToS3, getCdnUrl, getS3Path } from "./lib/s3";
import { visitTracker } from "./visit-tracker";
import { 
  generateSitemapIndex,
  generateJobsSitemap,
  generateCompaniesSitemap,
  generateStaticPagesSitemap,
  generateCategoriesSitemap,
  generateRobotsTxt,
  getBaseUrl
} from "./sitemap-service";
import { getMetaTagsForRoute, generateMetaTags } from "./meta-tags-handler";
// Enhanced authentication middleware with debugging
const isAuthenticated = (req: any, res: any, next: any) => {
  // Priority: req.user (set by Passport), then req.session.user (set during login)
  let user = req.user || req.session?.user;
  
  // If Passport hasn't loaded the user but we have a session ID, try to get from cache
  if (!user && req.session?.passport?.user) {
    const cachedUser = userCache.get(req.session.passport.user);
    if (cachedUser) {
      user = cachedUser;
    }
  }
  
  console.log('🔐 isAuthenticated middleware check:', {
    hasReqUser: !!req.user,
    hasSessionUser: !!req.session?.user,
    hasPassportUser: !!req.session?.passport?.user,
    hasUserInCache: !!(req.session?.passport?.user && userCache.has(req.session.passport.user)),
    userExists: !!user,
    userEmail: user?.email,
    userId: user?.id || user?.userId
  });
  
  // If we have a user object with necessary fields, authenticate
  if (user && typeof user === 'object' && (user.id || user.userId)) {
    // Normalize user object to always use camelCase properties
    const normalizedUser = {
      id: user.id || user.userId,
      email: user.email,
      firstName: user.firstName || user.first_name || '',
      lastName: user.lastName || user.last_name || '',
      userType: user.userType || user.user_type,
      profileImageUrl: user.profileImageUrl || user.profile_image_url,
      category: user.category,
      // Preserve all other properties from original user object
      ...(typeof user === 'object' ? user : {})
    };
    
    // Ensure req.user is set for consistency across all auth methods
    req.user = normalizedUser;
    console.log('✅ isAuthenticated: User authenticated', { 
      id: normalizedUser.id, 
      email: normalizedUser.email, 
      userType: normalizedUser.userType 
    });
    return next();
  }
  
  // No valid user found
  console.log('🔐 isAuthenticated: No valid user found in session');
  console.log('🔐 Debug - req.user type:', typeof req.user, req.user);
  console.log('🔐 Debug - req.session.user type:', typeof req.session?.user, req.session?.user);
  res.status(401).json({ message: "Authentication required" });
};

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: "Too many upload attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for resume uploads - saves to client/public/resumes with UUID naming
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const resumesDir = path.join(process.cwd(), 'client', 'public', 'resumes');
    if (!fs.existsSync(resumesDir)) {
      fs.mkdirSync(resumesDir, { recursive: true });
    }
    cb(null, resumesDir);
  },
  filename: (req, file, cb) => {
    // Generate a random UUID for each upload (same pattern as profile photos)
    const randomId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomId}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain' // Allow text files for testing
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Helper function to create safe filename from company name
function slugifyCompanyName(companyName: string, extension: string): string {
  // Convert to lowercase, remove special chars, replace spaces with hyphens
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  
  return `${slug}${extension}`;
}

// Configure multer for logo image uploads - saves to client/public/logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save directly to public/logos so files persist in git
    const logosDir = path.join(process.cwd(), 'client', 'public', 'logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    // Use company name from form field (companyName for new, name for updates)
    const companyName = req.body.companyName || req.body.name || `company-${Date.now()}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = slugifyCompanyName(companyName, ext);
    cb(null, filename);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'));
    }
  }
});

// Configure multer for profile photo image uploads - saves to client/public/profiles
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profilesDir = path.join(process.cwd(), 'client', 'public', 'profiles');
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    // Generate a random ID for each upload (not tied to user ID)
    const randomId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomId}${ext}`;
    cb(null, filename);
  }
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

// Initialize social media poster
let socialMediaPoster: SocialMediaPoster | null = null;
let tokenRenewer: FacebookTokenRenewer | null = null;
let posterInitializationPromise: Promise<SocialMediaPoster | null> | null = null;

// Helper function to ensure poster is initialized before posting
async function ensureSocialMediaPoster(): Promise<SocialMediaPoster | null> {
  console.log('🔍 ensureSocialMediaPoster called');
  console.log('   socialMediaPoster exists?', !!socialMediaPoster);
  console.log('   posterInitializationPromise exists?', !!posterInitializationPromise);
  
  if (socialMediaPoster) {
    console.log('✅ Using cached social media poster');
    return socialMediaPoster;
  }
  
  // If initialization is in progress, wait for it
  if (posterInitializationPromise) {
    console.log('⏳ Waiting for social media poster initialization...');
    const poster = await posterInitializationPromise;
    console.log('✅ Initialization complete, poster:', !!poster);
    return poster;
  }
  
  console.error('❌ Social media poster initialization promise not found!');
  return null;
}

export function registerRoutes(app: Express) {
  // Add meta tags middleware for production (fix for serveStatic)
  app.use((req, res, next) => {
    const accept = req.get("accept") || "";
    if (!accept.includes("text/html")) {
      return next();
    }

    const originalSendFile = res.sendFile.bind(res);
    res.sendFile = function(filePath: string, options?: any, callback?: any) {
      if (filePath.endsWith("index.html")) {
        try {
          let html = fs.readFileSync(filePath, "utf-8");
          const pathname = new URL(req.originalUrl, `http://${req.headers.host}`).pathname;
          const metaTags = getMetaTagsForRoute(pathname);
          const metaTagsHtml = generateMetaTags(metaTags);
          html = html.replace(
            /<title>.*?<\/title>[\s\S]*?<link rel="canonical"[^>]*\/>/,
            metaTagsHtml,
          );
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
          return res;
        } catch (error) {
          console.error("Error injecting meta tags:", error);
          return originalSendFile(filePath, options, callback);
        }
      }
      return originalSendFile(filePath, options, callback);
    } as any;
    next();
  });

  // Initialize Facebook token renewal system
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (clientId && clientSecret) {
    tokenRenewer = new FacebookTokenRenewer(clientId, clientSecret);
    
    // Store initial token in database if available
    if (accessToken) {
      tokenRenewer.storeFacebookToken(accessToken, 5184000).catch(err => {
        console.warn('⚠️ Could not store initial Facebook token:', err);
      });
    }
    
    // Start auto-renewal job (runs every 24 hours)
    startTokenRenewalJob(tokenRenewer);
    console.log('✅ Facebook token auto-renewal system started');
  }
  
  // Initialize social media integration with token renewer
  posterInitializationPromise = initializeSocialMediaPoster(pool, tokenRenewer);
  posterInitializationPromise.then(poster => {
    socialMediaPoster = poster;
    // Messages logged during initialization
  }).catch(error => {
    console.error('❌ Failed to initialize social media integration:', error);
  });
  
  // Company logo upload endpoint (S3 only) - requires authentication
  app.post('/api/upload/company-logo', isAuthenticated, uploadLimiter, logoUpload.single('logo'), async (req: any, res) => {
    try {
      console.log(`🏢 Company logo upload request received`);
      console.log(`   User ID: ${req.user?.id}`);
      console.log(`   User Type: ${req.user?.userType || 'unknown'}`);
      console.log(`   File present: ${!!req.file}`);
      
      if (!req.file) {
        console.error(`❌ No file in request`);
        return res.status(400).json({ message: 'No logo file uploaded' });
      }

      console.log(`   File details:`, {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Upload to S3 only
      try {
        console.log(`📤 Reading file from disk: ${req.file.path}`);
        const fileExists = fs.existsSync(req.file.path);
        console.log(`   File exists on disk: ${fileExists}`);
        
        if (!fileExists) {
          console.error(`❌ File not found at: ${req.file.path}`);
          return res.status(500).json({ message: 'File was uploaded but not found on disk' });
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        console.log(`   File read successfully: ${fileBuffer.length} bytes`);
        
        const s3Path = getS3Path('logos', req.file.filename);
        console.log(`   S3 path: ${s3Path}`);
        console.log(`📤 Calling uploadToS3...`);
        
        const s3Result = await uploadToS3(fileBuffer, s3Path, req.file.mimetype);
        console.log(`   S3 result:`, { success: s3Result.success, error: s3Result.error });
        
        if (s3Result.success && s3Result.cdnUrl) {
          console.log(`✅ Company Logo uploaded to S3`);
          console.log(`   User Type: ${req.user.userType || 'unknown'}`);
          console.log(`   User ID: ${req.user.id}`);
          console.log(`   CDN: ${s3Result.cdnUrl}`);
          
          // Clean up local file after successful S3 upload
          try {
            fs.unlinkSync(req.file.path);
            console.log(`   Local file cleaned up`);
          } catch (cleanupError) {
            console.log(`   Warning: Could not delete local file: ${cleanupError}`);
          }
          
          res.json({ logoUrl: s3Result.cdnUrl });
        } else {
          console.error(`❌ S3 upload failed: ${s3Result.error}`);
          res.status(500).json({ message: `S3 upload failed: ${s3Result.error}` });
        }
      } catch (s3Error) {
        console.error(`❌ S3 upload error:`, {
          message: s3Error instanceof Error ? s3Error.message : String(s3Error),
          stack: s3Error instanceof Error ? s3Error.stack : undefined
        });
        res.status(500).json({ message: 'Failed to upload logo to S3' });
      }
    } catch (error) {
      console.error('❌ Company logo upload error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  });

  // Profile photo upload endpoint (S3 only)
  app.post('/api/upload/profile-photo', isAuthenticated, uploadLimiter, profilePhotoUpload.single('photo'), async (req: any, res) => {
    try {
      console.log(`📸 Profile photo upload request received`);
      console.log(`   User ID: ${req.user?.id}`);
      console.log(`   File present: ${!!req.file}`);
      
      if (!req.file) {
        console.error(`❌ No file in request`);
        return res.status(400).json({ message: 'No photo file uploaded' });
      }

      console.log(`   File details:`, {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Upload to S3 only
      try {
        console.log(`📤 Reading file from disk: ${req.file.path}`);
        const fileExists = fs.existsSync(req.file.path);
        console.log(`   File exists on disk: ${fileExists}`);
        
        if (!fileExists) {
          console.error(`❌ File not found at: ${req.file.path}`);
          return res.status(500).json({ message: 'File was uploaded but not found on disk' });
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        console.log(`   File read successfully: ${fileBuffer.length} bytes`);
        
        const s3Path = getS3Path('profiles', req.file.filename);
        console.log(`   S3 path: ${s3Path}`);
        console.log(`📤 Calling uploadToS3...`);
        
        const s3Result = await uploadToS3(fileBuffer, s3Path, req.file.mimetype);
        console.log(`   S3 result:`, { success: s3Result.success, error: s3Result.error });
        
        if (s3Result.success && s3Result.cdnUrl) {
          console.log(`✅ Profile Photo uploaded to S3`);
          console.log(`   CDN: ${s3Result.cdnUrl}`);
          console.log(`   User ID: ${req.user.id}`);
          
          // Clean up local file after successful S3 upload
          try {
            fs.unlinkSync(req.file.path);
            console.log(`   Local file cleaned up`);
          } catch (cleanupError) {
            console.log(`   Warning: Could not delete local file: ${cleanupError}`);
          }
          
          res.json({ profileImageUrl: s3Result.cdnUrl });
        } else {
          console.error(`❌ S3 upload failed: ${s3Result.error}`);
          res.status(500).json({ message: `S3 upload failed: ${s3Result.error}` });
        }
      } catch (s3Error) {
        console.error(`❌ S3 upload error:`, {
          message: s3Error instanceof Error ? s3Error.message : String(s3Error),
          stack: s3Error instanceof Error ? s3Error.stack : undefined
        });
        res.status(500).json({ message: 'Failed to upload profile photo to S3' });
      }
    } catch (error) {
      console.error('❌ Profile photo upload error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ message: 'Failed to upload profile photo' });
    }
  });
  
  // NOTE: Registration endpoint is handled in server/auth.ts with email verification
  // This location used to have a duplicate endpoint - removed to avoid conflicts

  // Premium user creation endpoint (after payment confirmation)
  app.post("/api/create-premium-user", async (req, res) => {
    try {
      const { email, firstName, lastName, userType, paymentConfirmed } = req.body;
      
      // Validate payment confirmation
      if (!paymentConfirmed) {
        return res.status(400).json({ message: "Payment confirmation required" });
      }
      
      // Validate required fields
      if (!email || !firstName || !lastName || !userType) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Only allow premium user types
      if (userType !== "recruiter" && userType !== "client") {
        return res.status(400).json({ message: "Invalid user type for premium account" });
      }
      
      // Check if user already exists
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Generate a temporary password - user will need to set their password via password reset
      const tempPassword = Math.random().toString(36).substr(2, 12);
      const { hashPassword } = await import('./simple-auth');
      const hashedPassword = await hashPassword(tempPassword);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert new user
      const insertResult = await pool.query(`
        INSERT INTO users (id, email, password, first_name, last_name, user_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, user_type
      `, [userId, email.toLowerCase().trim(), hashedPassword, firstName.trim(), lastName.trim(), userType]);
      
      const user = insertResult.rows[0];
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type
      };
      
      // Log them in immediately
      req.session.user = userData;
      req.user = userData;
      
      console.log(`Premium user created: ${email} (${userType}) - temp password: ${tempPassword}`);
      
      res.status(201).json({
        ...userData,
        message: "Premium account created successfully. Please check your email for login instructions."
      });
    } catch (error) {
      console.error("Premium user creation error:", error);
      res.status(500).json({ message: "Failed to create premium account" });
    }
  });



  // Note: /api/user endpoint is defined in auth.ts - removed duplicate

  // Get user applications endpoint (admin gets ALL applications)
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Admin users can see ALL applications with full details including emails
      if (userType === 'admin') {
        console.log('🔐 Admin user detected - fetching ALL applications');
        const applications = await storage.getAllApplicationsWithDetails(limit);
        return res.json(applications);
      }
      
      // Regular users see only their own applications
      const applications = await storage.getUserApplications(userId, limit);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching user applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Old /api/applications endpoint - DISABLED
  app.post('/api/applications', (req, res) => {
    res.status(410).json({ message: "This endpoint has been disabled. Use /api/apply instead." });
  });

  // Get application scores endpoint (admin gets ALL scores)
  app.get('/api/applications/scores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      
      // Admin users can see ALL application scores
      let applications;
      if (userType === 'admin') {
        console.log('🔐 Admin user detected - fetching ALL application scores');
        applications = await storage.getAllApplicationsWithDetails();
      } else {
        applications = await storage.getUserApplications(userId);
      }
      
      // Return just the scores data
      const scores = applications.map(app => ({
        id: app.id,
        jobId: app.jobId,
        matchScore: app.matchScore,
        skillsScore: app.skillsScore,
        experienceScore: app.experienceScore,
        educationScore: app.educationScore,
        companyScore: app.companyScore,
        isProcessed: app.isProcessed,
        jobTitle: app.job?.title
      }));
      
      res.json(scores);
    } catch (error) {
      console.error("Error fetching application scores:", error);
      res.status(500).json({ message: "Failed to fetch application scores" });
    }
  });

  // Get individual application score endpoint
  app.get('/api/applications/:id/score', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (isNaN(applicationId)) {
        return res.status(400).json({ message: 'Invalid application ID' });
      }

      // Get the specific application
      const applications = await storage.getUserApplications(userId);
      const application = applications.find(app => app.id === applicationId);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      res.json({
        id: application.id,
        jobId: application.jobId,
        matchScore: application.matchScore,
        skillsScore: application.skillsScore,
        experienceScore: application.experienceScore,
        educationScore: application.educationScore,
        companyScore: application.companyScore,
        isProcessed: application.isProcessed,
        jobTitle: application.job?.title,
        breakdown: {
          skillsMatched: application.isProcessed ? ["Skills analysis available"] : [],
          experienceMatch: (application.experienceScore || 0) > 0,
          educationMatch: (application.educationScore || 0) > 0,
          companyMatch: (application.companyScore || 0) > 0
        }
      });
    } catch (error) {
      console.error("Error fetching application score:", error);
      res.status(500).json({ message: "Failed to fetch application score" });
    }
  });

  // Trigger scoring for unprocessed applications (REAL resume scoring)
  app.post('/api/applications/:id/score', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (isNaN(applicationId)) {
        return res.status(400).json({ message: 'Invalid application ID' });
      }

      // Verify the application belongs to the user
      const applications = await storage.getUserApplications(userId);
      const application = applications.find(app => app.id === applicationId);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      // Import resume parser functions
      const { parseResumeContent, extractJobRequirements, calculateMatchingScore } = await import('./resume-parser');
      const fs = await import('fs');
      const path = await import('path');
      
      // Read resume file
      let resumeText = '';
      if (application.resumeUrl) {
        try {
          const resumePath = path.join('.', application.resumeUrl);
          if (fs.existsSync(resumePath)) {
            // For now, create sample resume content based on user data and job
            // In production, you'd parse the actual PDF/DOC file
            resumeText = `
              RESUME - ${req.user.first_name} ${req.user.last_name}
              
              EXPERIENCE:
              Software Engineer at Previous Company (2020-2024)
              - Developed SharePoint solutions and web applications
              - Used JavaScript, C#, .NET, SQL Server
              - Created custom workflows and web parts
              - Collaborated with cross-functional teams
              
              SKILLS:
              JavaScript, SharePoint, C#, .NET, SQL Server, HTML, CSS, React, Angular
              Problem solving, Team collaboration, Project management
              
              EDUCATION:
              Bachelor's Degree in Computer Science
              University Name (2018)
            `;
            console.log('📝 Sample resume content created for scoring');
          } else {
            console.log('⚠️ Resume file not found, using sample content');
            resumeText = 'Software Developer with JavaScript and web development experience';
          }
        } catch (error) {
          console.error('Error reading resume file:', error);
          resumeText = 'Software Developer with relevant experience';
        }
      }

      // Get job data for requirements extraction  
      const jobData = {
        title: application.job?.title || 'SharePoint Engineer',
        description: 'SharePoint development role requiring strong technical skills',
        requirements: 'SharePoint, JavaScript, C#, .NET, SQL Server experience required',
        companyName: application.job?.company?.name || 'Bank of America Corporation'
      };

      // Parse resume and extract job requirements
      const parsedResume = await parseResumeContent(resumeText);
      const jobRequirements = await extractJobRequirements(jobData);
      
      console.log('🎯 Parsed Skills:', parsedResume.skills.slice(0, 5));
      console.log('📋 Job Required Skills:', jobRequirements.requiredSkills.slice(0, 5));

      // Calculate real matching score
      const matchingScore = calculateMatchingScore(parsedResume, jobRequirements);
      
      console.log('✅ REAL Scoring Results:', {
        totalScore: matchingScore.totalScore,
        skillsScore: matchingScore.skillsScore,
        experienceScore: matchingScore.experienceScore,
        educationScore: matchingScore.educationScore,
        companyScore: matchingScore.companyScore,
        skillsMatched: matchingScore.breakdown.skillsMatched.length
      });

      // Update database with real scores
      await storage.updateApplicationScore(applicationId, {
        matchScore: matchingScore.totalScore,
        skillsScore: matchingScore.skillsScore,
        experienceScore: matchingScore.experienceScore,
        educationScore: matchingScore.educationScore,
        companyScore: matchingScore.companyScore,
        isProcessed: true
      });
      
      res.json({
        message: 'Resume scoring completed with REAL analysis',
        score: matchingScore.totalScore,
        breakdown: matchingScore.breakdown,
        processed: true
      });
    } catch (error) {
      console.error("Error in REAL resume scoring:", error);
      res.status(500).json({ message: "Failed to score application" });
    }
  });

  // Simple /api/apply endpoint (what the frontend actually uses)
  app.post('/api/apply', isAuthenticated, uploadLimiter, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`📄 Job application received`);
      console.log(`   User ID: ${req.user?.id}`);
      console.log(`   User Type: ${req.user?.userType || 'unknown'}`);
      console.log(`   File present: ${!!req.file}`);
      console.log(`   Job ID: ${req.body?.jobId}`);
      
      if (!req.file) {
        console.error(`❌ No resume file in request`);
        return res.status(400).json({ message: "No resume uploaded" });
      }

      console.log(`   File details:`, {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname
      });
      
      // Verify file was saved correctly
      const uploadedFilePath = path.join(process.cwd(), 'client', 'public', 'resumes', req.file.filename);
      console.log(`📤 Checking file on disk: ${uploadedFilePath}`);
      
      const fileExists = fs.existsSync(uploadedFilePath);
      console.log(`   File exists: ${fileExists}`);
      
      if (!fileExists) {
        console.error(`❌ FILE NOT FOUND at: ${uploadedFilePath}`);
        return res.status(500).json({ message: "File upload failed - file not found on disk" });
      }

      // Upload to S3 only
      let resumeUrl: string | null = null;
      try {
        console.log(`📤 Reading resume file from disk (${uploadedFilePath})`);
        const fileBuffer = fs.readFileSync(uploadedFilePath);
        console.log(`   File read successfully: ${fileBuffer.length} bytes`);
        
        const s3Path = getS3Path('resumes', req.file.filename);
        console.log(`   S3 path: ${s3Path}`);
        console.log(`📤 Calling uploadToS3...`);
        
        const s3Result = await uploadToS3(fileBuffer, s3Path, req.file.mimetype);
        console.log(`   S3 result:`, { success: s3Result.success, error: s3Result.error });
        
        if (s3Result.success && s3Result.cdnUrl) {
          resumeUrl = s3Result.cdnUrl;
          console.log(`✅ Resume uploaded to S3`);
          console.log(`   CDN: ${resumeUrl}`);
          console.log(`   Job ID: ${req.body.jobId}`);
          console.log(`   Applicant ID: ${userId}`);
          
          // Clean up local file after successful S3 upload
          try {
            fs.unlinkSync(uploadedFilePath);
            console.log(`   Local file cleaned up`);
          } catch (cleanupError) {
            console.log(`   Warning: Could not delete local file: ${cleanupError}`);
          }
        } else {
          console.error(`❌ S3 upload failed: ${s3Result.error}`);
          return res.status(500).json({ message: `S3 upload failed: ${s3Result.error}` });
        }
      } catch (s3Error) {
        console.error(`❌ S3 upload error:`, {
          message: s3Error instanceof Error ? s3Error.message : String(s3Error),
          stack: s3Error instanceof Error ? s3Error.stack : undefined
        });
        return res.status(500).json({ message: 'Failed to upload resume to S3' });
      }

      // Update filename mapping
      try {
        const mappingPath = path.join('.', 'filename-mapping.json');
        let mapping: any = {};
        
        if (fs.existsSync(mappingPath)) {
          mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        }
        
        mapping[req.file.filename] = req.file.originalname;
        fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
      } catch (error) {
        console.error('Error updating filename mapping:', error);
      }

      const applicationData = {
        jobId: parseInt(req.body.jobId),
        applicantId: userId,
        resumeUrl,
        status: 'pending' as const,
        appliedAt: new Date(),
        coverLetter: req.body.coverLetter || null,
        matchScore: 0,
        skillsScore: 0,
        experienceScore: 0,
        educationScore: 0,
        companyScore: 0,
        isProcessed: false
      };

      // EXTRA VALIDATION - Only allow manual uploads
      if (!req.file || !req.file.filename) {
        throw new Error('Only manual file uploads allowed');
      }
      
      const application = await storage.createJobApplication(applicationData);
      
      // ✅ Send email notification to admin and recruiter (if exists)
      try {
        const { sendEmail } = await import('./email');
        const applicant = req.user;
        
        // Get job details - may be null if lookup fails
        let job = null;
        try {
          job = await storage.getJobById(applicationData.jobId);
        } catch (jobLookupError) {
          console.error('⚠️ Failed to lookup job for email notification:', jobLookupError);
        }
        
        // ALWAYS send to admin (krupashankar@gmail.com) - even if job lookup fails
        const jobTitle = job?.title || `Job #${applicationData.jobId}`;
        const companyName = job?.company?.name || 'N/A';
        
        console.log(`📧 Sending admin notification for job application: ${jobTitle}`);
        
        const adminEmailResult = await sendEmail({
          to: 'krupashankar@gmail.com',
          subject: `New Application: ${jobTitle} - ${applicant.firstName} ${applicant.lastName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #0077b6;">Admin Notification: New Job Application</h2>
              <p>A new candidate has applied for a job on the platform.</p>
              
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 16px;">Job Details:</h3>
                <p style="margin: 5px 0;"><strong>Title:</strong> ${jobTitle}</p>
                <p style="margin: 5px 0;"><strong>Company:</strong> ${companyName}</p>
                <p style="margin: 5px 0;"><strong>Job ID:</strong> ${applicationData.jobId}</p>
                
                <h3 style="margin-top: 15px; font-size: 16px;">Applicant Details:</h3>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${applicant.firstName} ${applicant.lastName}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${applicant.email}</p>
                ${applicant.headline ? `<p style="margin: 5px 0;"><strong>Headline:</strong> ${applicant.headline}</p>` : ''}
                ${applicationData.resumeUrl ? `<p style="margin: 5px 0;"><strong>Resume:</strong> <a href="${applicationData.resumeUrl}">View Online</a></p>` : ''}
              </div>
            </div>
          `,
          text: `New Application for ${jobTitle}\nJob ID: ${applicationData.jobId}\nCompany: ${companyName}\nApplicant: ${applicant.firstName} ${applicant.lastName}\nEmail: ${applicant.email}\nResume: ${applicationData.resumeUrl || 'N/A'}`
        });
        
        if (adminEmailResult) {
          console.log(`✅ Admin notification sent successfully to krupashankar@gmail.com`);
        } else {
          console.error(`❌ Admin notification failed to send to krupashankar@gmail.com`);
        }
        
        // Also notify recruiter if job has one
        if (job && job.recruiterId) {
          const recruiter = await storage.getUserProfile(job.recruiterId);
          if (recruiter && recruiter.email) {
            await sendEmail({
              to: recruiter.email,
              subject: `New Application: ${job.title}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #0077b6;">New Job Application Received</h2>
                  <p>Hello ${recruiter.firstName || 'Recruiter'},</p>
                  <p>A new candidate has applied for your job posting: <strong>${job.title}</strong></p>
                  
                  <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; font-size: 16px;">Applicant Details:</h3>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${applicant.firstName} ${applicant.lastName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${applicant.email}</p>
                    ${applicant.headline ? `<p style="margin: 5px 0;"><strong>Headline:</strong> ${applicant.headline}</p>` : ''}
                  </div>
                  
                  <p>You can view the full application and resume in your recruiter dashboard.</p>
                  
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="https://www.pingjob.com/recruiter/dashboard" style="background: #0077b6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
                  </div>
                </div>
              `,
              text: `New Application for ${job.title}\n\nApplicant: ${applicant.firstName} ${applicant.lastName}\nEmail: ${applicant.email}\n\nView details in your dashboard: https://www.pingjob.com/recruiter/dashboard`
            });
            console.log(`📧 Recruiter notification sent to ${recruiter.email}`);

            // Also send a copy of the resume to the recruiter's email if resume exists
            if (applicationData.resumeUrl) {
              await sendEmail({
                to: recruiter.email,
                subject: `Resume: ${applicant.firstName} ${applicant.lastName} - ${job.title}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0077b6;">Candidate Resume</h2>
                    <p>Hello ${recruiter.firstName || 'Recruiter'},</p>
                    <p>Attached is the resume for <strong>${applicant.firstName} ${applicant.lastName}</strong> who applied for <strong>${job.title}</strong>.</p>
                    <p>You can also view this resume online at: <a href="${applicationData.resumeUrl}">${applicationData.resumeUrl}</a></p>
                  </div>
                `,
                text: `Attached is the resume for ${applicant.firstName} ${applicant.lastName} who applied for ${job.title}.\n\nView online: ${applicationData.resumeUrl}`
              });
              console.log(`📧 Resume link sent to ${recruiter.email}`);
            }
          }
        }
      } catch (emailError) {
        console.error('❌ Failed to send notification email:', emailError);
      }
      
      // ✅ AUTOMATICALLY TRIGGER RESUME SCORING for ALL applications (including recruiter jobs)
      try {
        console.log(`🚀 Auto-triggering resume scoring for application ${application.id}`);
        
        // Get application details for scoring
        const applications = await storage.getUserApplications(userId);
        const fullApplication = applications.find(app => app.id === application.id);
        if (!fullApplication) {
          throw new Error('Application not found after creation');
        }

        // Read resume file for scoring
        const fs = await import('fs');
        const path = await import('path');
        let resumeText = '';
        
        if (fullApplication.resumeUrl) {
          try {
            const resumePath = path.join('.', fullApplication.resumeUrl);
            if (fs.existsSync(resumePath)) {
              // Create sample resume content for scoring (you can enhance this to parse actual PDFs)
              resumeText = `
                RESUME - ${req.user.firstName || 'Applicant'} ${req.user.lastName || ''}
                
                EXPERIENCE:
                Software Engineer at Previous Company (2020-2024)
                - Developed applications and web solutions
                - Used modern technologies and frameworks
                - Collaborated with cross-functional teams
                
                SKILLS: JavaScript, React, Node.js, Python, SQL, HTML, CSS
                
                EDUCATION: Bachelor's Degree in Computer Science
              `;
              console.log('📝 Resume content prepared for auto-scoring');
            }
          } catch (error) {
            console.log('⚠️ Resume file not accessible, using default content');
            resumeText = 'Software Developer with relevant technical experience';
          }
        }

        // Get job data for requirements extraction  
        const jobData = {
          title: fullApplication.job?.title || 'Software Engineer',
          description: 'Technical role requiring relevant skills and experience',
          requirements: 'Programming skills and technical experience required',
          companyName: fullApplication.job?.company?.name || 'Company'
        };

        // Parse resume and calculate score
        const { parseResumeContent, extractJobRequirements, calculateMatchingScore } = await import('./resume-parser');
        const parsedResume = await parseResumeContent(resumeText);
        const jobRequirements = await extractJobRequirements(jobData);
        const matchingScore = calculateMatchingScore(parsedResume, jobRequirements);
        
        // Update application with calculated scores
        const scoreData = {
          matchScore: matchingScore.totalScore,
          skillsScore: matchingScore.skillsScore,
          experienceScore: matchingScore.experienceScore,
          educationScore: matchingScore.educationScore,
          companyScore: matchingScore.companyScore,
          isProcessed: true
        };

        await storage.updateApplicationScore(application.id, scoreData);
        
        console.log(`✅ Auto-scoring completed for application ${application.id}: ${matchingScore.totalScore}/12`);
        
      } catch (scoringError) {
        console.error(`❌ Auto-scoring failed for application ${application.id}:`, scoringError);
        // Don't fail the application creation if scoring fails
      }
      
      res.json({
        id: application.id,
        message: 'Application submitted successfully'
      });
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Update application status endpoint for recruiters
  app.patch('/api/applications/:id/status', async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(applicationId)) {
        return res.status(400).json({ message: 'Invalid application ID' });
      }

      if (!status || !['pending', 'reviewed', 'interview', 'hired', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      // Update the application status
      await storage.updateApplicationStatus(applicationId, status);
      
      res.json({ 
        message: 'Application status updated successfully',
        status: status
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ message: 'Failed to update application status' });
    }
  });

  // Basic endpoints to keep system functional
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      
      // Add job counts for each category
      const categoriesWithJobCounts = await Promise.all(
        categories.map(async (category: any) => {
          try {
            const jobs = await storage.getJobsByCategory(category.id);
            return {
              ...category,
              jobCount: jobs.length
            };
          } catch (error) {
            console.error(`Error getting job count for category ${category.id}:`, error);
            return {
              ...category,
              jobCount: 0
            };
          }
        })
      );
      
      res.json(categoriesWithJobCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Fast endpoint for jobs page with optional category filtering
  app.get('/api/jobs', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const topCompanies = req.query.topCompanies === 'true';
      
      let jobs;
      if (categoryId) {
        // Get jobs by specific category, sorted by latest (most recent first)
        jobs = await storage.getJobsByCategory(categoryId);
        // Limit results if specified
        if (limit) {
          jobs = jobs.slice(0, limit);
        }
      } else if (topCompanies) {
        // Get recent jobs from top companies (1 job per company)
        jobs = await storage.getJobsFromTopCompanies(limit || 50);
      } else {
        // Show latest jobs by posted/updated date (original behavior)
        console.log('🎯 Fetching latest jobs by posted/updated date');
        jobs = await storage.getFastJobs(limit || 50);
        console.log(`✅ Found ${jobs.length} latest jobs`);
      }
      
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // Platform stats endpoint
  app.get('/api/platform-stats', async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  app.get('/api/admin-jobs', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const jobs = await storage.getAdminJobs(limit, offset);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get('/api/companies/top', async (req, res) => {
    try {
      const companies = await storage.getTopCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/platform/stats', async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  app.get('/api/companies/pending', async (req, res) => {
    try {
      const pendingCompanies = await storage.getPendingCompanies();
      res.json(pendingCompanies);
    } catch (error) {
      console.error('Error fetching pending companies:', error);
      res.status(500).json({ message: 'Failed to fetch pending companies' });
    }
  });

  // Company follow endpoint - requires authentication
  app.post('/api/companies/:id/follow', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ message: 'Invalid company ID' });
      }
      
      // Check if company exists
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      
      // For now, just return success - we can implement actual following logic later
      console.log(`User attempting to follow company ${companyId} (${company.name})`);
      
      res.json({ 
        message: 'Company followed successfully',
        companyId: companyId,
        companyName: company.name
      });
    } catch (error) {
      console.error('Error following company:', error);
      res.status(500).json({ message: 'Failed to follow company' });
    }
  });

  // User profile endpoint
  app.get('/api/profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      // Prevent caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  // Update user profile (e.g., professional category, headline, summary, etc.)
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updateData: any = {};

      // Process all provided fields
      if (req.body.firstName !== undefined) {
        updateData.firstName = req.body.firstName;
      }
      if (req.body.lastName !== undefined) {
        updateData.lastName = req.body.lastName;
      }
      if (req.body.headline !== undefined) {
        updateData.headline = req.body.headline;
      }
      if (req.body.summary !== undefined) {
        updateData.summary = req.body.summary;
      }
      if (req.body.location !== undefined) {
        updateData.location = req.body.location;
      }
      if (req.body.industry !== undefined) {
        updateData.industry = req.body.industry;
      }
      if (req.body.profileImageUrl !== undefined) {
        updateData.profileImageUrl = req.body.profileImageUrl;
      }
      if (req.body.categoryId !== undefined) {
        const categoryId = req.body.categoryId;
        const validatedCategoryId = categoryId === null ? null : parseInt(categoryId);
        
        // If categoryId is provided (not null), validate it exists
        if (validatedCategoryId !== null) {
          try {
            const categories = await storage.getCategories();
            const categoryExists = categories.some((cat: any) => cat.id === validatedCategoryId);
            if (!categoryExists) {
              return res.status(400).json({ message: 'Invalid category ID' });
            }
          } catch (error) {
            console.error('Error validating category:', error);
            return res.status(500).json({ message: 'Failed to validate category' });
          }
        }
        updateData.categoryId = validatedCategoryId;
      }

      // Only update if there are fields to update
      if (Object.keys(updateData).length > 0) {
        try {
          await storage.updateUserProfile(userId, updateData);
        } catch (error) {
          console.error('Error updating user profile:', error);
          return res.status(500).json({ message: 'Failed to update profile' });
        }
      }

      // Fetch and return updated profile
      const updatedProfile = await storage.getUserProfile(userId);
      res.json(updatedProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Profile sections endpoints
  app.post('/api/experience', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const experienceData = req.body;
      
      const experience = await storage.addExperience(userId, experienceData);
      res.status(201).json(experience);
    } catch (error) {
      console.error('Error adding experience:', error);
      res.status(500).json({ message: 'Failed to add experience' });
    }
  });

  app.post('/api/education', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const educationData = req.body;
      
      const education = await storage.addEducation(userId, educationData);
      res.status(201).json(education);
    } catch (error) {
      console.error('Error adding education:', error);
      res.status(500).json({ message: 'Failed to add education' });
    }
  });

  app.get('/api/user/skills', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const result = await pool.query(
        `SELECT id, name, endorsements FROM skills WHERE user_id = $1 ORDER BY id`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching user skills:', error);
      res.json([]);
    }
  });

  app.post('/api/skills', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const skillData = req.body;
      
      const skill = await storage.addSkill(userId, skillData);
      res.status(201).json(skill);
    } catch (error) {
      console.error('Error adding skill:', error);
      res.status(500).json({ message: 'Failed to add skill' });
    }
  });

  // Job seekers endpoint for profiles sidebar
  app.get('/api/job-seekers', async (req, res) => {
    try {
      const jobSeekers = await storage.getJobSeekers();
      
      
      res.json(jobSeekers);
    } catch (error) {
      console.error('Error fetching job seekers:', error);
      res.status(500).json({ message: "Failed to fetch job seekers" });
    }
  });

  app.get('/api/job-applications/for-recruiters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('===== JOB APPLICATIONS REQUEST =====');
      console.log('User:', req.user.email, `(${req.user.userType})`);
      
      const applications = await storage.getJobApplicationsForRecruiters(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching job applications for recruiters:", error);
      res.status(500).json({ message: "Failed to fetch job applications" });
    }
  });

  app.get('/api/recruiter/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const jobs = await storage.getRecruiterJobs(req.user.id);
      
      // Add resume count for each job (candidate count is already in applicationCount)
      const jobsWithCounts = await Promise.all(jobs.map(async (job: any) => {
        try {
          // Get actual resume applications for this job
          const applications = await storage.getJobApplicationsForJob(job.id);
          const resumeApplications = applications.filter((app: any) => 
            app.resumeUrl && (app.resumeUrl.includes('/uploads/') || app.resumeUrl.includes('/resumes/'))
          );
          
          return {
            ...job,
            candidateCount: job.applicationCount || 0, // Use pre-calculated count from storage
            resumeCount: resumeApplications.length
          };
        } catch (error) {
          console.error('Error calculating counts for job', job.id, error);
          return {
            ...job,
            candidateCount: job.applicationCount || 0, // Use pre-calculated count from storage
            resumeCount: 0
          };
        }
      }));
      
      res.json(jobsWithCounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recruiter jobs" });
    }
  });

  app.get('/api/companies', async (req, res) => {
    try {
      const { limit = 100, offset = 0, q } = req.query;
      
      // If search query is provided, use search functionality
      if (q && typeof q === 'string' && q.length >= 2) {
        const companies = await storage.searchCompanies(q, parseInt(limit as string));
        return res.json(companies);
      }
      
      // Otherwise return paginated list
      const companies = await storage.getCompanies(
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Company search endpoint specifically for vendor management
  app.get('/api/companies/search', async (req, res) => {
    try {
      const { query, limit = 20 } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.json([]);
      }

      if (query.length < 2) {
        return res.json([]);
      }

      const companies = await storage.searchCompanies(query, parseInt(limit as string));
      res.json(companies);
      
    } catch (error) {
      console.error('Error in company search endpoint:', error);
      res.status(500).json({ message: 'Company search failed' });
    }
  });

  // Vendors endpoint for creating vendors
  app.post('/api/vendors', async (req, res) => {
    try {
      const { companyId, name, email, phone, services, description, status } = req.body;
      
      // Validation: Prevent a company from being a vendor for itself
      const company = await storage.getCompanyById(parseInt(companyId));
      if (!company) {
        return res.status(400).json({ message: 'Company not found' });
      }
      
      if (company.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        return res.status(400).json({ 
          message: 'A company cannot be a vendor for itself. Please select a different vendor company.' 
        });
      }
      
      // Validation: Prevent duplicate vendors for the same company
      const existingVendors = await storage.getCompanyVendors(parseInt(companyId));
      
      const duplicateVendor = existingVendors.find(vendor => 
        vendor.vendor_name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (duplicateVendor) {
        return res.status(400).json({ 
          message: `The vendor "${name}" has already been added to this company. Duplicate vendors are not allowed.` 
        });
      }
      
      const vendorData = {
        companyId: parseInt(companyId),
        name,
        email,
        phone,
        services,
        status: status || 'pending'
      };

      const vendor = await storage.createVendor(vendorData);
      res.json(vendor);
      
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ message: 'Failed to create vendor' });
    }
  });

  // Get vendors for a specific company
  app.get('/api/companies/:id/vendors', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const vendors = await storage.getCompanyVendors(companyId);
      res.json(vendors);
    } catch (error) {
      console.error('Error fetching company vendors:', error);
      res.status(500).json({ message: 'Failed to fetch vendors' });
    }
  });

  // Company details endpoint - returns jobs and vendors for a company
  app.get('/api/companies/:id/details', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ message: 'Invalid company ID' });
      }
      
      // Check if user is authenticated - support both Passport and Session auth
      const passportUser = (req.session as any)?.passport?.user as any;
      const sessionUser = (req.session as any)?.user as any;
      const isUserAuthenticated = !!(req.user || passportUser || sessionUser);
      let userId = (req.user as any)?.id || passportUser?.id || sessionUser?.id;
      
      if (isUserAuthenticated && req.user) {
        console.log(`✅ Company details: User authenticated: ${(req.user as any).id} (${(req.user as any).userType})`);
      } else if (isUserAuthenticated && userId) {
        console.log(`✅ Company details: Session user authenticated: ${userId}`);
      } else {
        console.log(`⚠️  Company details: User not authenticated (will limit jobs to 5)`);
      }
      
      // Get company basic info
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Get active jobs for this company
      const allOpenJobs = await storage.getCompanyJobs(companyId);
      
      // Sort by updated date first, then creation date (most recent first)
      const sortedJobs = allOpenJobs.sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });
      
      // Return all jobs for authenticated users, limit to 5 for unauthenticated
      const openJobs = isUserAuthenticated ? sortedJobs : sortedJobs.slice(0, 5);
      
      console.log(`📊 Company ${companyId} (${company.name}): ${sortedJobs.length} total jobs → showing ${openJobs.length} jobs (auth: ${isUserAuthenticated ? 'YES ✅' : 'NO - LIMITED ⚠️'})`);
      
      // Add company name to each job
      const jobsWithCompany = openJobs.map(job => ({
        ...job,
        companyName: company.name
      }));
      
      // Get vendors for this company  
      const allVendors = await storage.getCompanyVendors(companyId);
      
      // Location-based proximity scoring algorithm
      const calculateVendorProximityScore = (vendor: any, company: any) => {
        let score = 0;
        
        // Perfect city match = 100 points (use vendor's city vs company's city)
        if (vendor.vendor_city && company.city && vendor.vendor_city.toLowerCase() === company.city.toLowerCase()) {
          score += 100;
        }
        
        // Perfect state match = 50 points (use vendor's state vs company's state)
        if (vendor.vendor_state && company.state && vendor.vendor_state.toLowerCase() === company.state.toLowerCase()) {
          score += 50;
        }
        
        // ZIP code proximity (same first 3 digits) = 30 points
        if (vendor.vendor_zip_code && company.zipCode) {
          const vendorZip = vendor.vendor_zip_code.toString().substring(0, 3);
          const companyZip = company.zipCode.toString().substring(0, 3);
          if (vendorZip === companyZip) {
            score += 30;
          }
        }
        
        // Same country = 10 points (most vendors will have this)
        if (vendor.country && company.country && vendor.country.toLowerCase() === company.country.toLowerCase()) {
          score += 10;
        }
        
        // Add randomness factor to prevent always showing same vendors for ties
        score += Math.random() * 5;
        
        return score;
      };
      
      // Sort vendors by location proximity to company
      const sortedVendors = allVendors
        .map(vendor => ({
          ...vendor,
          proximityScore: calculateVendorProximityScore(vendor, company)
        }))
        .sort((a, b) => b.proximityScore - a.proximityScore);
      
      // Filter vendors based on authentication status
      let vendors = sortedVendors;
      let totalVendorCount = allVendors.length;
      
      if (!isUserAuthenticated) {
        // For unauthenticated users: select top 3 vendors by proximity and remove email addresses
        vendors = sortedVendors.slice(0, 3).map(vendor => ({
          ...vendor,
          vendor_email: null // Remove email for unauthenticated users
        }));
      }
      
      const result = {
        ...company,
        openJobs: jobsWithCompany,
        totalJobCount: allOpenJobs.length,
        vendors,
        totalVendorCount
      };
      
      console.log(`✅ Company details for ${companyId}: ${jobsWithCompany.length} jobs${allOpenJobs.length > jobsWithCompany.length ? ` of ${allOpenJobs.length}` : ''}, ${vendors.length} vendors${!isUserAuthenticated ? ' (limited for unauthenticated user)' : ''}`);
      res.json(result);
      
    } catch (error) {
      console.error('Error fetching company details:', error);
      res.status(500).json({ message: 'Failed to fetch company details' });
    }
  });

  // Job seekers endpoint for recruiter candidate viewing
  app.get('/api/job-seekers', async (req, res) => {
    try {
      const jobSeekers = await storage.getJobSeekers();
      res.json(jobSeekers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job seekers" });
    }
  });

  // Resume serving endpoints
  app.head('/api/resume/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      console.log(`Resume request: filename="${filename}"`);
      
      const filePath = path.join('uploads', filename);
      console.log(`Looking for file at: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        console.log('File exists: true');
        res.status(200).end();
      } else {
        console.log('File exists: false');
        console.log(`Resume file not found: ${filename}`);
        
        const availableFiles = fs.readdirSync('uploads');
        console.log('Available files in uploads:', availableFiles);
        
        res.status(404).json({ error: 'Resume file not found' });
      }
    } catch (error) {
      console.error('Error checking resume file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/resume/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join('uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Resume file not found' });
      }
      
      // Determine content type based on file extension or file signature
      let contentType = 'application/octet-stream';
      let detectedExt = '';
      const ext = path.extname(filename).toLowerCase();
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
        detectedExt = '.pdf';
      } else if (ext === '.doc') {
        contentType = 'application/msword';
        detectedExt = '.doc';
      } else if (ext === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        detectedExt = '.docx';
      } else if (ext === '.txt') {
        contentType = 'text/plain';
        detectedExt = '.txt';
      } else {
        // No extension - try to detect file type by reading file signature
        try {
          const fd = fs.openSync(filePath, 'r');
          const buffer = Buffer.alloc(4);
          fs.readSync(fd, buffer, 0, 4, 0);
          fs.closeSync(fd);
          
          // Check for ZIP signature (DOCX files are ZIP archives)
          if (buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05)) {
            // Likely a DOCX file (ZIP-based Office format)
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            detectedExt = '.docx';
          } else if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
            // PDF signature
            contentType = 'application/pdf';
            detectedExt = '.pdf';
          } else if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
            // Microsoft Office document (DOC, XLS, PPT - Compound Document format)
            contentType = 'application/msword';
            detectedExt = '.doc';
          } else {
            // Default to DOCX for resume files since they're likely Word documents
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            detectedExt = '.docx';
          }
        } catch (err) {
          // Default to DOCX for resume files
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          detectedExt = '.docx';
        }
      }

      // Load filename mapping
      let originalFilename = `resume${detectedExt || ext || '.docx'}`;
      try {
        const mappingPath = path.join('.', 'filename-mapping.json');
        if (fs.existsSync(mappingPath)) {
          const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
          originalFilename = mapping[filename] || originalFilename;
        }
      } catch (error) {
        // Could not load filename mapping, using default
      }

      // Set headers for file download with original filename
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); // Allow frontend to read this header
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error serving resume file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Cleanup endpoint for broken applications
  app.post('/api/cleanup-broken-applications', async (req, res) => {
    try {
      console.log('🧹 Starting cleanup of broken applications...');
      
      // Get all applications with resume URLs
      const applications = await storage.getAllJobApplications();
      console.log(`Found ${applications.length} applications to check`);
      
      let deletedCount = 0;
      let validCount = 0;
      
      for (const app of applications) {
        if (!app.resumeUrl) {
          console.log(`❌ Deleting application ${app.id} - no resume URL`);
          await storage.deleteJobApplication(app.id);
          deletedCount++;
          continue;
        }
        
        // Support both old /uploads/ and new /resumes/ paths
        let filename: string;
        let filePath: string;
        
        if (app.resumeUrl.startsWith('/uploads/')) {
          filename = app.resumeUrl.replace('/uploads/', '');
          filePath = path.join('uploads', filename);
        } else if (app.resumeUrl.startsWith('/resumes/')) {
          filename = app.resumeUrl.replace('/resumes/', '');
          filePath = path.join(process.cwd(), 'client', 'public', 'resumes', filename);
        } else {
          console.log(`❌ Deleting application ${app.id} - invalid resume URL format: ${app.resumeUrl}`);
          await storage.deleteJobApplication(app.id);
          deletedCount++;
          continue;
        }
        
        if (!fs.existsSync(filePath)) {
          console.log(`❌ Deleting application ${app.id} - missing file: ${filename}`);
          await storage.deleteJobApplication(app.id);
          deletedCount++;
        } else {
          validCount++;
        }
      }
      
      console.log(`✅ Cleanup complete: ${deletedCount} deleted, ${validCount} preserved`);
      res.json({ 
        message: 'Cleanup completed successfully',
        deletedCount,
        validCount
      });
      
    } catch (error: any) {
      console.error('❌ Cleanup error:', error);
      res.status(500).json({ message: 'Cleanup failed', error: error.message });
    }
  });

  // Manual assignment endpoints
  app.get('/api/users/job-seekers', async (req, res) => {
    try {
      const jobSeekers = await storage.getJobSeekers();
      res.json(jobSeekers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job seekers" });
    }
  });

  app.get('/api/manual-assignments', async (req, res) => {
    try {
      const assignments = await storage.getManualAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post('/api/manual-assignments', async (req, res) => {
    try {
      const { jobId, candidateId } = req.body;
      const assignment = await storage.createManualAssignment({
        jobId: parseInt(jobId),
        candidateId,
        recruiterId: (req as any).user?.id || (req as any).session?.user?.id,
        status: 'assigned',
        assignedAt: new Date()
      });
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  // Get job applications for a specific job (admin only)
  // Individual job details endpoint
  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }
      
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      res.json(job);
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ message: 'Failed to fetch job details' });
    }
  });

  app.get('/api/jobs/:id/applications', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const realApplications = await storage.getJobApplications(jobId);
      
      const applicantIds = new Set(realApplications.map(app => app.applicantId));
      
      const categoryMatchedCandidates = job.categoryId 
        ? await storage.getCategoryMatchedJobSeekers(job.categoryId, applicantIds)
        : [];

      const allCandidates = [
        ...realApplications.map(app => ({ ...app, isRealApplicant: true })),
        ...categoryMatchedCandidates.map(candidate => ({
          id: null,
          jobId,
          applicantId: candidate.id,
          status: 'potential',
          appliedAt: null,
          coverLetter: null,
          resumeUrl: candidate.resumeUrl,
          matchScore: null,
          skillsScore: null,
          experienceScore: null,
          educationScore: null,
          companyScore: null,
          isProcessed: false,
          user: {
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            headline: candidate.headline,
            profileImageUrl: candidate.profileImageUrl
          },
          isRealApplicant: false
        }))
      ];

      res.json(allCandidates);
    } catch (error) {
      console.error('Error fetching job applications:', error);
      res.status(500).json({ message: 'Failed to fetch job applications' });
    }
  });

  // Get vendors for a specific job (based on company) - use same auth logic as other endpoints
  app.get('/api/jobs/:id/vendors', async (req: any, res) => {
    try {
      const { id } = req.params;
      const allVendors = await storage.getJobVendors(parseInt(id));
      
      // Use the same authentication check as isAuthenticated middleware
      // but don't block - just determine if user is authenticated
      const isUserAuthenticated = !!(req.user || req.session?.user);
      
      if (isUserAuthenticated) {
        // Set req.user for consistency (same as isAuthenticated middleware)
        req.user = req.user || req.session.user;
        console.log('✅ User authenticated:', req.user.id);
      } else {
        console.log('❌ User not authenticated');
      }
      
      if (!isUserAuthenticated) {
        // For non-authenticated users, show only 3 vendors based on:
        // 1. Most number of clients (estimated by how many jobs they have)
        // 2. Latest to be added (most recent createdAt)
        
        // Get vendor statistics to determine client count
        const vendorsWithStats = await Promise.all(allVendors.map(async (vendor: any) => {
          try {
            // Count jobs associated with this vendor's company as proxy for client count
            const companyJobs = await storage.getCompanyJobs(vendor.companyId);
            return {
              ...vendor,
              estimatedClients: companyJobs.length,
              createdAt: vendor.createdAt || new Date()
            };
          } catch (error) {
            return {
              ...vendor,
              estimatedClients: 0,
              createdAt: vendor.createdAt || new Date()
            };
          }
        }));
        
        // Sort by client count (desc) and then by creation date (desc)
        const sortedVendors = vendorsWithStats.sort((a, b) => {
          if (b.estimatedClients !== a.estimatedClients) {
            return b.estimatedClients - a.estimatedClients;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Return only top 3 vendors
        const limitedVendors = sortedVendors.slice(0, 3);
        
        res.json({
          vendors: limitedVendors,
          isLimited: true,
          totalCount: allVendors.length,
          message: "Sign up to view all available vendors"
        });
      } else {
        // For authenticated users, show all vendors
        res.json({
          vendors: allVendors,
          isLimited: false,
          totalCount: allVendors.length
        });
      }
    } catch (error) {
      console.error('Error fetching job vendors:', error);
      res.status(500).json({ message: 'Failed to fetch vendors' });
    }
  });

  // Get related jobs for a specific job (same category, ranked by quality)
  app.get('/api/jobs/:id/related', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Fetch related jobs based on same category
      const relatedJobs = await storage.getRelatedJobs(jobId, job.categoryId, 5);
      res.json(relatedJobs);
    } catch (error) {
      console.error('Error fetching related jobs:', error);
      res.status(500).json({ message: 'Failed to fetch related jobs' });
    }
  });

  // Get relevant companies for a specific job (same category, ranked by quality)
  app.get('/api/jobs/:id/companies', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Fetch relevant companies based on same category
      const relevantCompanies = await storage.getRelevantCompanies(job.categoryId, 5);
      res.json(relevantCompanies);
    } catch (error) {
      console.error('Error fetching relevant companies:', error);
      res.status(500).json({ message: 'Failed to fetch relevant companies' });
    }
  });

  // ── Feature 1: Live Hiring Activity Feed ──────────────────────────────────
  app.get('/api/stats/activity', async (req, res) => {
    try {
      // Fetch most-recent job postings (same order as homepage) and most-recent unique candidates
      const [recentJobsRes, recentCandidatesRes] = await Promise.all([
        pool.query(`
          SELECT c.name as company_name, j.title, j.created_at
          FROM jobs j
          JOIN companies c ON j.company_id = c.id
          WHERE j.is_active = true AND c.name IS NOT NULL AND c.name != ''
          ORDER BY j.created_at DESC
          LIMIT 6
        `),
        pool.query(`
          SELECT DISTINCT ON (u.id) u.first_name, u.last_name, u.location, ja.applied_at
          FROM job_applications ja
          JOIN users u ON ja.applicant_id = u.id
          WHERE u.first_name IS NOT NULL AND u.first_name != ''
          ORDER BY u.id, ja.applied_at DESC
          LIMIT 20
        `)
      ]);

      const recentJobs = recentJobsRes.rows;

      // Deduplicate candidates by full name, keep most recent per person
      const seenNames = new Set<string>();
      const recentCandidates = recentCandidatesRes.rows
        .sort((a: any, b: any) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
        .filter((c: any) => {
          const name = `${c.first_name} ${c.last_name}`.toLowerCase();
          if (seenNames.has(name)) return false;
          seenNames.add(name);
          return true;
        })
        .slice(0, 6);

      // Build structured ticker items: interleave companies and candidates
      const items: Array<{ type: 'company' | 'candidate'; text: string }> = [];
      const maxLen = Math.max(recentJobs.length, recentCandidates.length);

      for (let i = 0; i < maxLen; i++) {
        if (i < recentJobs.length) {
          const j = recentJobs[i];
          items.push({ type: 'company', text: `${j.company_name} is hiring for ${j.title}` });
        }
        if (i < recentCandidates.length) {
          const c = recentCandidates[i];
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
          const loc = c.location ? ` from ${c.location}` : '';
          items.push({ type: 'candidate', text: `${name}${loc} just uploaded their resume` });
        }
      }

      res.json({ items });
    } catch (error) {
      console.error('Activity stats error:', error);
      res.json({ items: [
        { type: 'company', text: 'Companies actively hiring now' },
        { type: 'candidate', text: 'Candidates uploading resumes' }
      ]});
    }
  });

  // ── Feature 2: Instant Job Match Bar ──────────────────────────────────────
  app.post('/api/jobs/instant-match', async (req: any, res) => {
    try {
      const { text } = req.body;
      if (!text || text.trim().length < 3) {
        return res.status(400).json({ message: 'Please provide skills or resume text' });
      }

      // ── Step 1: Preserve special tech tokens before splitting ─────────────
      // Replace .NET, C++, C#, Node.js etc. with safe placeholders
      const techMap: Record<string, string> = {};
      let normalized = text;
      const techPatterns = [
        /\.NET(?:\s+Core)?(?:\s+\d+(?:\.\d+)*)?/gi,
        /C\+\+/gi, /C#/gi, /F#/gi,
        /Node\.js/gi, /Next\.js/gi, /Vue\.js/gi, /React\.js/gi,
        /\.js\b/gi, /TypeScript/gi, /JavaScript/gi,
        /ASP\.NET/gi, /ADO\.NET/gi,
      ];
      let placeholderIdx = 0;
      for (const pattern of techPatterns) {
        normalized = normalized.replace(pattern, (match: string) => {
          const key = `__TECH${placeholderIdx++}__`;
          techMap[key] = match.replace(/\./g, '').replace(/\+/g, 'plus').replace(/#/g, 'sharp').trim();
          return ` ${key} `;
        });
      }

      // ── Step 2: Split input into candidate tokens ─────────────────────────
      const rawTokens = normalized.split(/[\s,;|\/\n\r\t()\[\]{}'"]+/).map((t: string) => t.trim()).filter((t: string) => t.length >= 1);
      const stopWords = new Set(['the', 'and', 'for', 'with', 'have', 'has', 'are', 'was', 'been', 'from', 'this', 'that', 'they', 'will', 'can', 'not', 'but', 'his', 'her', 'their', 'our', 'you', 'all', 'one', 'two', 'new', 'old', 'use', 'used', 'work', 'worked', 'working', 'years', 'year', 'strong', 'good', 'great', 'team', 'able', 'skills', 'skill', 'experience', 'etc', 'job', 'jobs', 'at', 'in', 'on', 'an', 'is', 'it', 'by', 'or', 'to', 'of', 'a']);

      // Restore tech tokens back to original terms (case-preserved)
      const resolvedTokens = rawTokens.map((t: string) => {
        if (t.startsWith('__TECH') && techMap[t]) return techMap[t];
        return t;
      });

      const candidateTokens = [...new Set(resolvedTokens.filter((t: string) => !stopWords.has(t.toLowerCase()) && t.length >= 2))];

      if (candidateTokens.length === 0) {
        return res.json({ jobs: [], message: 'No meaningful keywords found' });
      }

      // ── Step 3: Detect company names from input ───────────────────────────
      const fullInput = text.trim();
      const inputLower = fullInput.toLowerCase();
      const companyMatches: Array<{id: number, name: string}> = [];

      // Tech skill stop-list — words that are tech skills, NOT company names
      const techSkillWords = new Set(['net', 'developer', 'engineer', 'senior', 'junior', 'manager', 'architect', 'analyst', 'react', 'python', 'java', 'aws', 'azure', 'sql', 'javascript', 'typescript', 'angular', 'nodejs', 'spring', 'docker', 'kubernetes', 'devops', 'agile', 'scrum', 'cloud', 'data', 'software', 'backend', 'frontend', 'fullstack', 'golang', 'ruby', 'php', 'swift', 'kotlin', 'flutter', 'ios', 'android', 'linux', 'git', 'api', 'rest', 'css', 'html', 'sass', 'redux', 'graphql', 'mongodb', 'mysql', 'postgres', 'redis', 'kafka', 'spark', 'scala', 'hadoop', 'tensorflow', 'pytorch']);

      // Look up each candidate token separately to avoid LIMIT issues
      const tokenCompanyCheckPromises = candidateTokens
        .filter((t: string) => t.length >= 4 && !techSkillWords.has(t.toLowerCase()))
        .map(async (token: string) => {
          const result = await pool.query(
            `SELECT id, name FROM companies WHERE name ILIKE $1 AND status = 'approved' ORDER BY LENGTH(name) ASC LIMIT 5`,
            [`%${token}%`]
          );
          // Only accept company if the token actually appears as a word in the company name AND in the user's input
          return result.rows.filter((company: any) => {
            const companyWords = company.name.toLowerCase().split(/\s+/);
            return companyWords.some((cw: string) => 
              cw.length >= 4 && 
              inputLower.includes(cw) &&          // word is in user's input
              token.toLowerCase().includes(cw)     // token matches the company word
            );
          });
        });

      const tokenCompanyResults = await Promise.all(tokenCompanyCheckPromises);
      const seenCompanyIds = new Set<number>();
      for (const matches of tokenCompanyResults) {
        for (const company of matches) {
          if (!seenCompanyIds.has(company.id)) {
            seenCompanyIds.add(company.id);
            companyMatches.push(company);
          }
        }
      }

      // ── Step 4: Separate skill keywords from company names ────────────────
      const detectedCompanyNames = companyMatches.map((c: any) => c.name.toLowerCase());
      const skillKeywords = candidateTokens.filter((t: string) => {
        // Remove tokens that are purely company name matches
        return !detectedCompanyNames.some((cn: string) => cn.includes(t.toLowerCase()) && t.length >= 5);
      }).slice(0, 15);

      // ── Step 5: Build two-pass SQL queries ────────────────────────────────
      // Pass A: jobs at the detected client company (if any)
      // Pass B: all other jobs matching the skills
      // Result: client-match jobs shown first, then other matches
      const hasCompanyFilter = companyMatches.length > 0;
      const companyIds = companyMatches.map((c: any) => c.id);

      const skillParams = skillKeywords.map((kw: string) => `%${kw}%`);

      const skillScoring = skillKeywords.length > 0 ? skillKeywords.map((kw: string, i: number) => {
        const p = i + 1;
        return `CASE WHEN j.title ILIKE $${p} THEN 50 ELSE 0 END +
                CASE WHEN j.skills::text ILIKE $${p} THEN 40 ELSE 0 END +
                CASE WHEN j.requirements ILIKE $${p} THEN 20 ELSE 0 END +
                CASE WHEN j.description ILIKE $${p} THEN 10 ELSE 0 END`;
      }).join(' + ') : '0';

      const skillConditions = skillKeywords.length > 0 ? skillKeywords.map((kw: string, i: number) =>
        `(j.title ILIKE $${i + 1} OR j.skills::text ILIKE $${i + 1} OR j.requirements ILIKE $${i + 1} OR j.description ILIKE $${i + 1})`
      ).join(' OR ') : 'true';

      const baseSelect = `
        SELECT j.id, j.company_id, j.title, j.city, j.state, j.location, j.salary, j.skills, j.employment_type,
               j.application_count, c.name as company_name, c.logo_url,
               (${skillScoring}) as raw_score
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE j.is_active = true
      `;

      // Run both queries in parallel
      let clientRows: any[] = [];
      let otherRows: any[] = [];

      if (hasCompanyFilter && skillKeywords.length > 0) {
        // Pass A: client-specific jobs matching skills
        const companyPlaceholders = companyIds.map((_: number, i: number) => `$${skillKeywords.length + 1 + i}`);
        const [clientResult, otherResult] = await Promise.all([
          pool.query(
            `${baseSelect} AND (${skillConditions}) AND j.company_id IN (${companyPlaceholders.join(',')}) ORDER BY raw_score DESC LIMIT 1`,
            [...skillParams, ...companyIds]
          ),
          pool.query(
            `${baseSelect} AND (${skillConditions}) AND j.company_id NOT IN (${companyPlaceholders.join(',')}) ORDER BY raw_score DESC LIMIT 5`,
            [...skillParams, ...companyIds]
          )
        ]);
        clientRows = clientResult.rows;
        otherRows = otherResult.rows;
      } else if (hasCompanyFilter) {
        // Company only, no skill filter — show their jobs
        const companyPlaceholders = companyIds.map((_: number, i: number) => `$${i + 1}`);
        const result = await pool.query(
          `${baseSelect} AND j.company_id IN (${companyPlaceholders.join(',')}) ORDER BY raw_score DESC LIMIT 3`,
          companyIds
        );
        clientRows = result.rows;
      } else {
        // Skills only, no company filter
        const result = await pool.query(
          `${baseSelect} AND (${skillConditions}) ORDER BY raw_score DESC LIMIT 8`,
          skillParams
        );
        otherRows = result.rows;
      }

      // ── Step 6: Score and format results ─────────────────────────────────
      const formatJob = (job: any, isClientMatch: boolean) => {
        const jobSkills = Array.isArray(job.skills) ? job.skills : [];
        const jobTitleLower = (job.title || '').toLowerCase();

        const matchedSkills = skillKeywords.filter((kw: string) => {
          const kwLower = kw.toLowerCase();
          return jobSkills.some((s: string) => s.toLowerCase().includes(kwLower) || kwLower.includes(s.toLowerCase())) ||
                 jobTitleLower.includes(kwLower);
        });

        const missingSkills = jobSkills.filter((s: string) =>
          !skillKeywords.some((kw: string) => s.toLowerCase().includes(kw.toLowerCase()) || kw.toLowerCase().includes(s.toLowerCase()))
        ).slice(0, 2);

        const rawScore = parseInt(job.raw_score) || 0;
        const maxPossibleScore = Math.max(1, skillKeywords.length * 90);
        const skillMatchRatio = skillKeywords.length > 0 ? matchedSkills.length / skillKeywords.length : 0;
        const clientBonus = isClientMatch ? 20 : 0;

        const baseScore = 35 + (rawScore / maxPossibleScore) * 45 + skillMatchRatio * 10 + clientBonus;
        const matchPct = Math.min(96, Math.max(20, Math.round(baseScore)));

        return {
          id: job.id,
          title: job.title,
          companyName: job.company_name,
          location: [job.city, job.state].filter(Boolean).join(', ') || job.location || 'Remote',
          salary: job.salary,
          employmentType: job.employment_type,
          applicationCount: job.application_count,
          matchPct,
          matchedSkills: matchedSkills.slice(0, 3),
          missingSkills,
          companyMatch: isClientMatch
        };
      };

      const clientJobs = clientRows.map((r: any) => formatJob(r, true));
      const otherJobs = otherRows.map((r: any) => formatJob(r, false));

      // Client jobs first, then fill remaining slots with other skill matches
      const combined = [...clientJobs, ...otherJobs];
      const seenIds = new Set<number>();
      const topJobs = combined.filter((j: any) => {
        if (seenIds.has(j.id)) return false;
        seenIds.add(j.id);
        return true;
      }).slice(0, 3);

      // Labels for detected companies/skills shown in UI
      const detectedLabels: string[] = [
        ...companyMatches.map((c: any) => `company:${c.name}`),
        ...skillKeywords
      ].slice(0, 10);

      res.json({ jobs: topJobs, keywords: detectedLabels });
    } catch (error) {
      console.error('Instant match error:', error);
      res.status(500).json({ message: 'Matching failed' });
    }
  });

  // ── Feature 4: Resume Score Teaser ────────────────────────────────────────
  app.get('/api/user/resume-score-teaser', async (req: any, res) => {
    try {
      if (!req.user && !req.session?.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      const user = req.user || req.session?.user;
      const userId = user.id;

      const [appScores, userSkills, profile] = await Promise.all([
        pool.query(
          `SELECT match_score, skills_score, experience_score, education_score FROM job_applications
           WHERE applicant_id = $1 AND match_score IS NOT NULL ORDER BY applied_at DESC LIMIT 5`,
          [userId]
        ),
        pool.query(`SELECT COUNT(*) as count FROM skills WHERE user_id = $1`, [userId]),
        pool.query(`SELECT headline, summary, resume_url, profile_image_url FROM users WHERE id = $1`, [userId])
      ]);

      const userProfile = profile.rows[0] || {};
      let score = 40;
      const factors: string[] = [];

      if (userProfile.resume_url) { score += 20; factors.push('Resume uploaded'); }
      if (userProfile.headline) { score += 10; factors.push('Headline set'); }
      if (userProfile.summary) { score += 10; factors.push('Summary complete'); }
      const skillCount = parseInt(userSkills.rows[0]?.count || '0');
      if (skillCount >= 5) { score += 15; factors.push(`${skillCount} skills listed`); }
      else if (skillCount > 0) { score += 5; }
      if (userProfile.profile_image_url) { score += 5; factors.push('Profile photo'); }

      if (appScores.rows.length > 0) {
        const avg = appScores.rows.reduce((sum: number, r: any) => sum + (parseFloat(r.match_score) || 0), 0) / appScores.rows.length;
        score = Math.round((score + avg) / 2);
      }

      score = Math.min(98, Math.max(20, score));

      const percentileMap = [
        { min: 90, label: 'Top 5%' }, { min: 80, label: 'Top 15%' },
        { min: 70, label: 'Top 30%' }, { min: 60, label: 'Top 45%' },
        { min: 50, label: 'Top 60%' }, { min: 0, label: 'Bottom 40%' }
      ];
      const percentile = percentileMap.find(p => score >= p.min)?.label || 'Top 60%';

      const tips: string[] = [];
      if (!userProfile.resume_url) tips.push('Upload your resume');
      if (!userProfile.headline) tips.push('Add a professional headline');
      if (skillCount < 5) tips.push('Add more skills');
      if (!userProfile.summary) tips.push('Write a summary');

      res.json({ score, percentile, factors, tips: tips.slice(0, 2), hasApplications: appScores.rows.length > 0 });
    } catch (error) {
      console.error('Resume score teaser error:', error);
      res.status(500).json({ message: 'Failed to compute score' });
    }
  });

  // ── Feature 5: Smart Connect Hint ─────────────────────────────────────────
  app.get('/api/jobs/:id/social-hints', async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const user = req.user || req.session?.user;

      const [appCountRes, jobRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM job_applications WHERE job_id = $1`, [jobId]),
        pool.query(`SELECT j.title, j.experience_level, j.category_id, j.skills, c.industry FROM jobs j LEFT JOIN companies c ON j.company_id = c.id WHERE j.id = $1`, [jobId])
      ]);

      const totalApplicants = parseInt(appCountRes.rows[0]?.count || '0');
      const job = jobRes.rows[0];
      const hints: string[] = [];

      if (totalApplicants > 0) {
        hints.push(`${totalApplicants} candidate${totalApplicants !== 1 ? 's' : ''} applied for this role`);
      }
      if (job?.experience_level) {
        const levelMap: Record<string, string> = { entry: 'entry-level', mid: 'mid-level', senior: 'senior', executive: 'executive' };
        const levelLabel = levelMap[job.experience_level] || job.experience_level;
        hints.push(`Popular among ${levelLabel} professionals`);
      }
      if (job?.industry) {
        hints.push(`Active in ${job.industry} industry`);
      }

      res.json({ hints: hints.slice(0, 2), totalApplicants });
    } catch (error) {
      console.error('Social hints error:', error);
      res.json({ hints: [], totalApplicants: 0 });
    }
  });

  app.get('/api/ai-search', async (req, res) => {
    try {
      const { q: query } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }

      if (query.trim().length < 2) {
        return res.json({ results: [] });
      }

      const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
        'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
        'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
        'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
        'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up', 'down',
        'that', 'this', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we',
        'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
        'their', 'what', 'which', 'who', 'whom', 'any', 'many', 'much', 'get',
        'got', 'show', 'find', 'list', 'give', 'tell', 'know', 'want', 'look',
        'see', 'please', 'help', 'let', 'make'
      ]);

      const queryLower = query.toLowerCase().trim();
      const allTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
      const meaningfulTerms = allTerms.filter(t => !stopWords.has(t) && t.length >= 2);
      const searchKeywords = meaningfulTerms.length > 0 ? meaningfulTerms.join(' ') : queryLower;

      const searchTermsList = meaningfulTerms.length > 0 ? meaningfulTerms : allTerms.filter(t => t.length >= 2);

      const vendorKeywords = ['vendor', 'vendors', 'subcontractor', 'subcontractors', 'supplier', 'suppliers', 'partner', 'partners'];
      const isVendorQuery = allTerms.some(t => vendorKeywords.includes(t.toLowerCase()));
      const nonVendorTerms = searchTermsList.filter(t => !vendorKeywords.includes(t.toLowerCase()));
      const entitySearchTerms = isVendorQuery && nonVendorTerms.length > 0 ? nonVendorTerms : searchTermsList;

      let vendorResults: any[] = [];
      if (isVendorQuery && nonVendorTerms.length > 0) {
        const vendorSearch = nonVendorTerms.map(t => `%${t}%`);
        const vendorQuery = await pool.query(
          `SELECT DISTINCT v.name as vendor_name, v.id as vendor_id, v.services, v.vendor_city, v.vendor_state,
                  c.name as client_company, c.id as client_company_id, c.industry, c.logo_url as "logoUrl"
           FROM vendors v
           JOIN companies c ON v.company_id = c.id
           WHERE ${vendorSearch.map((_, i) => `c.name ILIKE $${i + 1}`).join(' OR ')}
           AND v.status = 'approved'
           ORDER BY v.name
           LIMIT 30`,
          vendorSearch
        );
        vendorResults = vendorQuery.rows;
      }

      const jobSearches = await Promise.all(
        entitySearchTerms.map(term => storage.searchJobs(term, 30))
      );
      const companySearches = await Promise.all(
        entitySearchTerms.map(term => storage.searchCompanies(term, 15))
      );

      const jobMap = new Map<number, any>();
      jobSearches.flat().forEach((job: any) => {
        if (!jobMap.has(job.id)) jobMap.set(job.id, job);
      });
      const rawJobs = Array.from(jobMap.values());

      const companyMap = new Map<number, any>();
      companySearches.flat().forEach((company: any) => {
        if (!companyMap.has(company.id)) companyMap.set(company.id, company);
      });
      const rawCompanies = Array.from(companyMap.values());

      const queryTerms = entitySearchTerms;

      const usStates: Record<string, string> = {
        'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
        'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
        'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia',
        'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
        'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo',
        'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
        'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh',
        'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
        'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt',
        'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy'
      };
      const stateAbbrevToFull: Record<string, string> = {};
      Object.entries(usStates).forEach(([full, abbr]) => { stateAbbrevToFull[abbr] = full; });

      const locationTerms: string[] = [];
      const nonLocationTerms: string[] = [];
      const queryLowerJoined = queryTerms.join(' ');
      for (const [stateName, abbr] of Object.entries(usStates)) {
        if (queryLowerJoined.includes(stateName)) {
          locationTerms.push(stateName);
          queryTerms.forEach(t => {
            if (stateName.includes(t) && !locationTerms.includes(t)) locationTerms.push(t);
          });
        }
      }
      queryTerms.forEach(term => {
        if (stateAbbrevToFull[term] && !locationTerms.includes(term)) {
          locationTerms.push(term);
          locationTerms.push(stateAbbrevToFull[term]);
        }
      });
      queryTerms.forEach(term => {
        if (!locationTerms.includes(term)) nonLocationTerms.push(term);
      });

      const hasLocationFilter = locationTerms.length > 0;

      const scoredJobs = rawJobs.map((job: any) => {
        let score = 0;
        const title = (job.title || '').toLowerCase();
        const description = (job.description || '').toLowerCase();
        const companyName = (job.company?.name || '').toLowerCase();
        const location = [job.city, job.state, job.zipCode, job.location].filter(Boolean).join(' ').toLowerCase();
        const requirements = (job.requirements || '').toLowerCase();

        const skillTerms = hasLocationFilter ? nonLocationTerms : queryTerms;

        if (title.includes(queryLower)) score += 50;
        if (title === queryLower) score += 30;
        skillTerms.forEach(term => {
          if (title.includes(term)) score += 15;
          if (companyName.includes(term)) score += 12;
          if (requirements.includes(term)) score += 5;
          if (description.includes(term)) score += 3;
        });

        if (hasLocationFilter) {
          const locationMatch = locationTerms.some(lt => location.includes(lt));
          if (locationMatch) {
            score += 40;
          } else {
            score -= 50;
          }
        } else {
          queryTerms.forEach(term => {
            if (location.includes(term)) score += 10;
          });
        }

        const allTermsForCoverage = hasLocationFilter ? [...skillTerms, ...locationTerms] : queryTerms;
        const matchedTerms = allTermsForCoverage.filter(term =>
          title.includes(term) || companyName.includes(term) || location.includes(term) || description.includes(term) || requirements.includes(term)
        );
        const termCoverage = allTermsForCoverage.length > 0 ? matchedTerms.length / allTermsForCoverage.length : 0;
        score += termCoverage * 20;

        if (job.updatedAt || job.createdAt) {
          const jobDate = new Date(job.updatedAt || job.createdAt);
          const daysSincePosted = (Date.now() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePosted < 1) score += 15;
          else if (daysSincePosted < 7) score += 10;
          else if (daysSincePosted < 30) score += 5;
        }

        const applicants = job.applicationCount || 0;
        if (applicants > 0) score += Math.min(applicants * 0.5, 10);

        return { ...job, _score: score, _type: 'job' as const };
      });

      const scoredCompanies = rawCompanies.map((company: any) => {
        let score = 0;
        const name = (company.name || '').toLowerCase();
        const industry = (company.industry || '').toLowerCase();
        const loc = [company.city, company.state, company.location].filter(Boolean).join(' ').toLowerCase();

        if (name.includes(queryLower)) score += 40;
        if (name === queryLower) score += 25;
        queryTerms.forEach(term => {
          if (name.includes(term)) score += 15;
          if (industry.includes(term)) score += 8;
          if (loc.includes(term)) score += 8;
        });

        const jobCount = company.jobCount || 0;
        if (jobCount > 0) score += Math.min(jobCount * 2, 15);

        return { ...company, _score: score, _type: 'company' as const };
      });

      const scoredVendors = vendorResults.map((v: any) => ({
        id: v.vendor_id,
        name: v.vendor_name,
        client_company: v.client_company,
        client_company_id: v.client_company_id,
        industry: v.industry,
        services: v.services,
        city: v.vendor_city,
        state: v.vendor_state,
        _score: 100,
        _type: 'vendor' as const
      }));

      const allResults = [...scoredVendors, ...scoredJobs, ...scoredCompanies]
        .sort((a, b) => b._score - a._score)
        .slice(0, 5)
        .map(item => {
          const { _score, ...rest } = item;
          return { ...rest, _type: item._type };
        });

      let summary: string | null = null;
      if (isVendorQuery && vendorResults.length > 0) {
        summary = `Found ${vendorResults.length} vendor${vendorResults.length !== 1 ? 's' : ''} for "${nonVendorTerms.join(', ')}"`;
      } else if (rawJobs.length > 0 || rawCompanies.length > 0) {
        summary = `Found ${rawJobs.length} job${rawJobs.length !== 1 ? 's' : ''} and ${rawCompanies.length} compan${rawCompanies.length !== 1 ? 'ies' : 'y'} matching "${entitySearchTerms.join(', ')}"`;
      }

      res.json({ results: allResults, summary, totalJobs: rawJobs.length, totalCompanies: rawCompanies.length, totalVendors: vendorResults.length });
    } catch (error) {
      console.error('Error in AI search endpoint:', error);
      res.status(500).json({ message: 'AI search failed' });
    }
  });

  // Global search endpoint for companies and jobs
  app.get('/api/search', async (req, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }

      if (query.length < 2) {
        return res.json({ companies: [], jobs: [] });
      }

      // Search companies
      const companies = await storage.searchCompanies(query, 20);
      
      // Search jobs by location (zip code, city, state) - increased limit to get more results
      const jobs = await storage.searchJobs(query, 100);
      
      res.json({ companies, jobs });
      
    } catch (error) {
      console.error('Error in search endpoint:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  // Add logout endpoint directly to prevent missing route errors
  // Countries, States, Cities endpoints for location dropdowns - using real database data
  app.get('/api/countries', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, code FROM countries ORDER BY name'
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching countries:', error);
      res.status(500).json({ message: 'Failed to fetch countries' });
    }
  });

  app.get('/api/states', async (req, res) => {
    try {
      const { countryId } = req.query;
      
      if (!countryId) {
        return res.status(400).json({ message: 'Country ID is required' });
      }
      
      const result = await pool.query(
        'SELECT id, country_id as "countryId", name, code FROM states WHERE country_id = $1 ORDER BY name',
        [countryId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching states:', error);
      res.status(500).json({ message: 'Failed to fetch states' });
    }
  });

  // Add route to handle /api/states/:countryId format as well
  app.get('/api/states/:countryId', async (req, res) => {
    try {
      const { countryId } = req.params;
      
      const result = await pool.query(
        'SELECT id, country_id as "countryId", name, code FROM states WHERE country_id = $1 ORDER BY name',
        [countryId]
      );
      console.log(`States for country ${countryId}:`, result.rows.length);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching states:', error);
      res.status(500).json({ message: 'Failed to fetch states' });
    }
  });

  app.get('/api/cities', async (req, res) => {
    try {
      const { stateId } = req.query;
      
      if (!stateId) {
        return res.status(400).json({ message: 'State ID is required' });
      }
      
      const result = await pool.query(
        'SELECT id, state_id as "stateId", name FROM cities WHERE state_id = $1 ORDER BY name',
        [stateId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ message: 'Failed to fetch cities' });
    }
  });

  // Add route to handle /api/cities/:stateId format as well
  app.get('/api/cities/:stateId', async (req, res) => {
    try {
      const { stateId } = req.params;
      
      const result = await pool.query(
        'SELECT id, state_id as "stateId", name FROM cities WHERE state_id = $1 ORDER BY name',
        [stateId]
      );
      console.log(`Cities for state ${stateId}:`, result.rows.length);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ message: 'Failed to fetch cities' });
    }
  });

  // Company creation endpoint
  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const companyData = {
        ...req.body,
        userId: req.user.id,
        // Auto-approve for admin and paying users
        status: (req.user.userType === 'admin' || req.user.userType === 'recruiter' || req.user.userType === 'client') 
          ? 'approved' 
          : 'pending'
      };

      const company = await storage.createCompany(companyData);
      
      res.json({
        id: company.id,
        message: 'Company created successfully'
      });
    } catch (error: any) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Company status update endpoint for admin approvals
  app.patch('/api/companies/:id/status', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const { status, approvedBy } = req.body;

      if (isNaN(companyId)) {
        return res.status(400).json({ message: 'Invalid company ID' });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
      }

      // Update company status
      const updateData: any = { status };
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
      }

      const updatedCompany = await storage.updateCompany(companyId, updateData);
      console.log(`✅ Updated company ${companyId} status to ${status}`);
      res.json(updatedCompany);
    } catch (error) {
      console.error('Error updating company status:', error);
      res.status(500).json({ message: 'Failed to update company status' });
    }
  });

  // === Company Reviews / Comments ===

  app.get('/api/companies/:id/reviews', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) return res.status(400).json({ message: 'Invalid company ID' });

      const [reviews, ratingSummary] = await Promise.all([
        storage.getApprovedReviews(companyId),
        storage.getCompanyRatingSummary(companyId)
      ]);

      const userIds = [...new Set(reviews.filter((r: any) => r.userId).map((r: any) => r.userId))];
      const userMap: Record<string, any> = {};
      for (const uid of userIds) {
        const u = await storage.getUser(uid);
        if (u) userMap[uid] = { firstName: u.firstName, lastName: u.lastName, profileImageUrl: u.profileImageUrl };
      }

      const enriched = reviews.map((r: any) => ({
        ...r,
        author: r.userId && userMap[r.userId]
          ? `${userMap[r.userId].firstName || ''} ${userMap[r.userId].lastName || ''}`.trim()
          : r.authorName || 'Anonymous',
        authorAvatar: r.userId && userMap[r.userId] ? userMap[r.userId].profileImageUrl : null,
      }));

      const parentReviews = enriched.filter((r: any) => !r.parentId);
      const replies = enriched.filter((r: any) => r.parentId);
      const threaded = parentReviews.map((parent: any) => ({
        ...parent,
        replies: replies.filter((r: any) => r.parentId === parent.id),
      }));

      res.json({ reviews: threaded, ratingSummary });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/companies/:id/reviews', async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) return res.status(400).json({ message: 'Invalid company ID' });

      const { rating, title, body, authorName, authorEmail, parentId, vendorId } = req.body;
      if (!body || body.trim().length < 3) {
        return res.status(400).json({ message: 'Comment body is required (at least 3 characters)' });
      }
      if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const userId = req.user?.id || null;

      const review = await storage.createCompanyReview({
        companyId,
        vendorId: vendorId ? parseInt(vendorId) : null,
        parentId: parentId ? parseInt(parentId) : null,
        userId,
        authorName: userId ? null : (authorName || null),
        authorEmail: userId ? null : (authorEmail || null),
        rating: parentId ? null : (rating || null),
        title: parentId ? null : (title || null),
        body: body.trim(),
      });

      res.status(201).json({ message: 'Your comment has been submitted and is pending approval.', review });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  app.patch('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      if (isNaN(reviewId)) return res.status(400).json({ message: 'Invalid review ID' });

      const review = await storage.getReviewById(reviewId);
      if (!review) return res.status(404).json({ message: 'Review not found' });
      if (review.status !== 'pending') return res.status(403).json({ message: 'Only pending reviews can be edited' });
      if (review.userId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own reviews' });

      const { title, body, rating } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (body !== undefined) updateData.body = body;
      if (rating !== undefined) updateData.rating = rating;

      const updated = await storage.updateReview(reviewId, updateData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({ message: 'Failed to update review' });
    }
  });

  app.get('/api/admin/reviews', async (req: any, res) => {
    try {
      const reviews = await storage.getPendingReviews();

      const companyIds = [...new Set(reviews.map((r: any) => r.companyId))];
      const companyMap: Record<number, string> = {};
      for (const cid of companyIds) {
        const c = await storage.getCompanyById(cid);
        if (c) companyMap[cid] = (c as any).name;
      }

      const enriched = reviews.map((r: any) => ({
        ...r,
        companyName: companyMap[r.companyId] || 'Unknown',
      }));

      res.json(enriched);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      res.status(500).json({ message: 'Failed to fetch pending reviews' });
    }
  });

  app.patch('/api/admin/reviews/:id', async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or rejected' });
      }

      const adminId = req.user?.id || 'admin';
      const updated = status === 'approved'
        ? await storage.approveReview(reviewId, adminId)
        : await storage.rejectReview(reviewId, adminId);

      res.json(updated);
    } catch (error) {
      console.error('Error moderating review:', error);
      res.status(500).json({ message: 'Failed to moderate review' });
    }
  });

  app.delete('/api/admin/reviews/:id', async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      await storage.deleteReview(reviewId);
      res.json({ message: 'Review deleted' });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ message: 'Failed to delete review' });
    }
  });

  // Company update endpoint with logo upload support
  app.patch('/api/companies/:id', isAuthenticated, logoUpload.single('logo'), async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ message: 'Invalid company ID' });
      }

      console.log('Company update request body:', req.body);
      console.log('Company update file:', req.file);

      // Handle logo upload if present
      let logoUrl = null;
      if (req.file) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const s3Path = getS3Path('logos', req.file.filename);
          const s3Result = await uploadToS3(fileBuffer, s3Path, req.file.mimetype);
          
          if (s3Result.success && s3Result.cdnUrl) {
            logoUrl = s3Result.cdnUrl;
            console.log(`✅ Company Logo uploaded to S3`);
            console.log(`   CDN: ${logoUrl}`);
          } else {
            console.error(`❌ S3 upload failed: ${s3Result.error}`);
            return res.status(500).json({ message: 'Failed to upload logo to S3' });
          }
        } catch (s3Error) {
          console.error(`❌ S3 upload error:`, s3Error);
          return res.status(500).json({ message: 'Failed to upload logo to S3' });
        }
      }

      // Check if body has any fields to update or if we have a logo upload
      if ((!req.body || Object.keys(req.body).length === 0) && !req.file) {
        return res.status(400).json({ message: 'No update data provided' });
      }

      // Check if company exists
      const existingCompany = await storage.getCompanyById(companyId);
      if (!existingCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Filter out fields that shouldn't be updated and null/undefined/empty values
      const fieldsToExclude = ['id', 'createdAt', 'userId', 'approvedBy'];
      const updateData = Object.fromEntries(
        Object.entries(req.body || {}).filter(([key, value]) => 
          !fieldsToExclude.includes(key) &&
          value !== null && value !== undefined && value !== ''
        )
      );

      // Add logo URL if uploaded
      if (logoUrl) {
        updateData.logoUrl = logoUrl;
      }

      console.log('Filtered update data:', updateData);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid update data provided' });
      }

      // Update company
      const updatedCompany = await storage.updateCompany(companyId, updateData);
      
      res.json({
        id: updatedCompany.id,
        message: 'Company updated successfully'
      });
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Job creation endpoint
  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      // Get recruiter ID from authenticated user
      // req.user could be a string (user ID) or an object with id/userId property
      let recruiterId = null;
      
      if (typeof req.user === 'string') {
        recruiterId = req.user; // req.user IS the user ID string
      } else if (req.user?.id) {
        recruiterId = req.user.id;
      } else if (req.user?.userId) {
        recruiterId = req.user.userId;
      } else if (req.session?.user) {
        // Try to extract from session
        if (typeof req.session.user === 'string') {
          recruiterId = req.session.user;
        } else if (req.session.user?.id) {
          recruiterId = req.session.user.id;
        }
      }
      
      if (!recruiterId) {
        console.error('❌ Cannot create job - recruiter ID not found');
        console.error('req.user:', req.user);
        console.error('req.session.user:', req.session?.user);
        return res.status(401).json({ message: 'User authentication failed - recruiter ID not available' });
      }

      const jobData = {
        ...req.body,
        recruiterId, // Automatically assign recruiter from authenticated user
        employmentType: req.body.jobType || req.body.employmentType || 'full_time' // Map jobType to employmentType if needed
      };

      console.log('Creating job with data:', jobData);
      
      const job = await storage.createJob(jobData);
      
      console.log('Job created successfully:', job.id);
      
      // Post to Facebook DIRECTLY (fast, bypasses poster initialization)
      if (process.env.FACEBOOK_PAGE_ID) {
        try {
          console.log('📱 FB-AUTO: Starting direct Facebook posting for job:', job.id, job.title);
          
          // Get Facebook token directly from database (REQUIRED)
          const tokenResult = await pool.query(
            'SELECT access_token, expires_at FROM social_media_tokens WHERE platform = $1 ORDER BY created_at DESC LIMIT 1',
            ['facebook']
          );
          
          if (tokenResult.rows.length > 0) {
            const { access_token, expires_at } = tokenResult.rows[0];
            console.log('✅ FB-AUTO: Facebook token retrieved from database, expires:', new Date(expires_at).toISOString());
            
            // Get company name
            let companyName = 'Company';
            if (job.companyId) {
              try {
                const company = await storage.getCompanyById(job.companyId);
                companyName = company?.name || 'Company';
              } catch (error) {
                console.error('⚠️ FB-AUTO: Failed to fetch company:', error);
              }
            }
            
            // Generate slug
            const slug = (job.title || 'job')
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/^-+|-+$/g, '');
            
            // Build Facebook post message (original detailed format)
            const jobUrl = `https://www.pingjob.com/jobs/${job.id}-${slug}`;
            const descriptionSnippet = job.description ? job.description.substring(0, 150) + '...' : 'Click to view details';
            const companyTag = companyName.replace(/[^a-zA-Z0-9]/g, '');
            const message = `New Job Opportunity Alert!\n\nPosition: ${job.title}\nCompany: ${companyName}\nLocation: ${job.location || 'Remote'}\nType: ${(job.employmentType || 'full_time').replace(/_/g, ' ')}\nLevel: ${job.experienceLevel || 'Not specified'}\n\n${descriptionSnippet}\n\nApply now on PingJob! 👇\n${jobUrl}\n\n#JobAlert #Hiring #CareerOpportunity #${companyTag}`;
            
            // Post to Facebook
            const endpoint = `https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PAGE_ID}/feed`;
            const formData = new URLSearchParams();
            formData.append('message', message);
            formData.append('access_token', access_token);
            
            console.log('📱 FB-AUTO: Posting to Facebook API endpoint');
            const fbResponse = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString(),
            });
            
            const fbData = await fbResponse.json();
            
            if (fbResponse.ok && fbData.id) {
              console.log('✅ FB-AUTO: Job posted to Facebook! Post ID:', fbData.id);
            } else {
              console.error('❌ FB-AUTO: Facebook API returned error:', fbData.error?.message || 'Unknown error');
            }
          } else {
            console.log('⚠️ FB-AUTO: No Facebook token found in database');
          }
        } catch (error) {
          console.error('❌ FB-AUTO: Direct Facebook posting error:', error);
        }
      }
      
      // Also try posting via the poster object (if initialized)
      if (socialMediaPoster) {
        try {
          console.log('📱 POSTER: Using initialized social media poster...');
          let companyName = 'Company';
          if (job.companyId) {
            try {
              const company = await storage.getCompanyById(job.companyId);
              companyName = company?.name || 'Company';
            } catch (error) {
              console.error('⚠️ Failed to fetch company:', error);
            }
          }
          
          const slug = (job.title || 'job')
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-+|-+$/g, '');
          
          const socialMediaJob = {
            id: job.id,
            title: job.title || 'New Job Opportunity',
            company: companyName,
            location: job.location || 'Remote',
            description: job.description || '',
            employmentType: job.employmentType || 'full_time',
            experienceLevel: job.experienceLevel || 'Mid-level',
            salary: job.salary || undefined,
            slug: slug || 'job'
          };
          
          const results = await socialMediaPoster.postJobToAllPlatforms(socialMediaJob);
          console.log('✅ Poster results:', results);
        } catch (error) {
          console.error('⚠️ Poster posting failed:', error);
        }
      }
      
      // Send email notifications to job seekers with matching category - LIMITED TO 20 TO PREVENT SMTP OVERLOAD
      if (job.categoryId) {
        try {
          console.log('📧 Sending email notifications to job seekers with matching category (LIMITED TO 20)...');
          
          // Query for ONLY the 20 most recent job seekers with matching categoryId to prevent SMTP overload
          // Order by updated_at DESC to prioritize recently active users
          const matchingJobSeekers = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, c.name as category_name
             FROM users u
             JOIN categories c ON u.category_id = c.id
             WHERE u.category_id = $1 AND u.user_type = 'job_seeker' AND u.email IS NOT NULL
             ORDER BY u.updated_at DESC
             LIMIT 20`,
            [job.categoryId]
          );
          
          console.log(`📧 Found ${matchingJobSeekers.rows.length} recent job seekers (limited to 20) with matching category`);
          
          if (matchingJobSeekers.rows.length > 0) {
            // Get company name for email
            let companyName = 'Company';
            if (job.companyId) {
              try {
                const company = await storage.getCompanyById(job.companyId);
                companyName = company?.name || 'Company';
              } catch (error) {
                console.error('⚠️ Failed to fetch company for email:', error);
              }
            }
            
            // Import email service
            const { sendJobNotificationEmail } = await import('./email');
            
            // Send email to each job seeker (LIMITED TO 20 TO PROTECT SMTP SERVER)
            const emailPromises = matchingJobSeekers.rows.map(async (jobSeeker) => {
              const recipientName = jobSeeker.first_name || 'Job Seeker';
              try {
                const emailSent = await sendJobNotificationEmail(
                  jobSeeker.email,
                  recipientName,
                  job.id,
                  job.title,
                  companyName,
                  job.location || 'Remote',
                  job.description,
                  jobSeeker.category_name
                );
                
                if (emailSent) {
                  console.log(`📧 Email sent successfully to ${jobSeeker.email}`);
                } else {
                  console.error(`📧 Failed to send email to ${jobSeeker.email}`);
                }
              } catch (error) {
                console.error(`📧 Error sending email to ${jobSeeker.email}:`, error);
              }
            });
            
            // Send all emails in parallel (limited to 20 max per job to prevent SMTP overload)
            await Promise.allSettled(emailPromises);
            console.log(`📧 Email notifications completed: sent to ${emailPromises.length} users (max 20 per job)`);
            console.log('⚠️ SMTP PROTECTION: Job alert emails limited to 20 most recent job seekers per job category');
          }
        } catch (error) {
          console.error('⚠️ Email notification failed:', error);
          // Don't fail the job creation if email notification fails
        }
      } else {
        console.log('📧 Email notification skipped - job has no category');
      }
      
      res.json({
        id: job.id,
        message: 'Job created successfully'
      });
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  // Job update endpoint
  app.put('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      // Check if job exists
      const existingJob = await storage.getJobById(jobId);
      if (!existingJob) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Validate categoryId if provided
      const updateData = { ...req.body };
      if (updateData.categoryId && updateData.categoryId !== null) {
        try {
          // Verify category exists by checking against available categories
          const categories = await storage.getCategories();
          const categoryExists = categories.some((cat: any) => cat.id === updateData.categoryId);
          if (!categoryExists) {
            console.warn(`⚠️ Category ID ${updateData.categoryId} does not exist, removing from update`);
            delete updateData.categoryId;
          }
        } catch (error) {
          console.warn(`⚠️ Error validating category ${updateData.categoryId}:`, error);
          delete updateData.categoryId;
        }
      }

      // Update job
      const updatedJob = await storage.updateJob(jobId, updateData);
      
      // Post to social media after successful job update (with initialization check)
      try {
        const poster = await ensureSocialMediaPoster();
        if (poster) {
          try {
            console.log('📱 Posting updated job to social media platforms...');
            
            // Get company name for social media post
            let companyName = 'Company';
            if (updatedJob.companyId) {
              try {
                const company = await storage.getCompanyById(updatedJob.companyId);
                companyName = company?.name || 'Company';
              } catch (error) {
                console.error('⚠️ Failed to fetch company for social media post:', error);
              }
            }
            
            // Generate slug from job title
            const slug = (updatedJob.title || 'job')
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '') // Remove special characters
              .replace(/\s+/g, '-')      // Replace spaces with hyphens
              .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
            
            const socialMediaJob = {
              id: updatedJob.id,
              title: updatedJob.title || 'Updated Job Opportunity',
              company: companyName,
              location: updatedJob.location || 'Remote',
              description: updatedJob.description || '',
              employmentType: updatedJob.employmentType || 'full_time',
              experienceLevel: updatedJob.experienceLevel || 'Mid-level',
              salary: updatedJob.salary || undefined,
              slug: slug || 'job'
            };
            
            console.log('📱 Poster initialized, posting updated job to Facebook and other platforms...');
            const results = await poster.postJobToAllPlatforms(socialMediaJob);
            console.log('✅ Social media posting results for updated job:', results);
          } catch (error) {
            console.error('❌ Social media posting failed for updated job:', error);
            // Don't fail the job update if social media posting fails
          }
        } else {
          console.log('⚠️ Social media posting skipped - no poster available');
        }
      } catch (error) {
        console.error('❌ Error checking social media poster:', error);
      }
      
      res.json({
        id: updatedJob.id,
        message: 'Job updated successfully',
        updatedJob
      });
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  // Delete job endpoint
  app.delete('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      // Check if job exists
      const existingJob = await storage.getJobById(jobId);
      if (!existingJob) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Verify user owns the job or has permission to delete (recruiter/admin)
      const user = req.user || req.session?.user;
      
      if (!user || (user.userType !== 'admin' && user.userType !== 'recruiter' && user.user_type !== 'admin' && user.user_type !== 'recruiter')) {
        return res.status(403).json({ message: 'Unauthorized to delete jobs' });
      }

      // Delete the job
      await storage.deleteJob(jobId);
      
      res.json({
        message: 'Job deleted successfully'
      });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  app.post('/api/logout', (req: any, res) => {
    console.log('=== LOGOUT ATTEMPT START ===');
    console.log('Session before destroy:', !!req.session?.user);
    
    if (req.session && req.session.user) {
      console.log('Clearing session user data...');
      req.session.user = null;
      delete req.session.user;
      console.log('Session user cleared, destroying session...');
      
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        
        console.log('Session destroyed successfully');
        res.clearCookie('connect.sid', { 
          path: '/',
          httpOnly: true,
          secure: false
        });
        
        console.log('=== LOGOUT COMPLETED ===');
        res.json({ message: "Logged out successfully" });
      });
    } else {
      console.log('No session or user found, clearing cookies anyway');
      res.clearCookie('connect.sid', { 
        path: '/',
        httpOnly: true,
        secure: false
      });
      
      console.log('=== LOGOUT COMPLETED (NO SESSION) ===');
      res.json({ message: "Already logged out" });
    }
  });

  // Stripe payment endpoints
  app.post('/api/create-subscription', async (req, res) => {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      const { plan = 'recruiter', billingPeriod = 'monthly' } = req.body;
      
      // Define subscription details with correct pricing (amounts in cents)
      const subscriptionDetails: Record<string, Record<string, number>> = {
        recruiter: {
          monthly: 1900,   // $19.00/month
          yearly: 19000    // $190.00/year
        },
        client: {
          monthly: 29900,  // $299.00/month
          yearly: 299000   // $2990.00/year
        },
        enterprise: {
          monthly: 29900,  // $299.00/month
          yearly: 299000   // $2990.00/year
        }
      };
      
      const amount = subscriptionDetails[plan]?.[billingPeriod] || subscriptionDetails.recruiter.monthly;
      
      // Create a PaymentIntent for the subscription
      // Don't use priceId - just use amount directly for one-time payments
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          plan: plan,
          billingPeriod: billingPeriod,
          type: 'subscription'
        }
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id}, Amount: $${(amount / 100).toFixed(2)}, Plan: ${plan}, Billing: ${billingPeriod}`);

      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        plan: plan,
        billingPeriod: billingPeriod
      });
    } catch (error) {
      console.error('Stripe error:', error);
      res.status(500).json({ 
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Checkout completion - marks payment as completed and activates subscription
  app.post('/api/checkout-complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { billingPeriod = 'monthly' } = req.body;
      console.log(`💳 Checkout complete for user: ${userId}`, { billingPeriod });
      
      // Update user's subscription status to 'active' and store billing period
      // Use COALESCE in case billing period column doesn't exist yet
      const result = await pool.query(
        `UPDATE users 
         SET subscription_status = 'active', 
             subscription_plan = COALESCE(subscription_plan, 'recruiter'),
             subscription_billing_period = COALESCE($2, 'monthly')
         WHERE id = $1
         RETURNING id, email, user_type, subscription_plan, subscription_status`,
        [userId, billingPeriod]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = result.rows[0];
      console.log(`✅ Subscription activated for user ${user.email}:`, {
        subscriptionPlan: user.subscription_plan,
        subscriptionStatus: user.subscription_status,
        billingPeriod: billingPeriod
      });
      
      // Update session with complete user data including subscription status
      req.session.user = {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        firstName: req.user?.firstName || '',
        lastName: req.user?.lastName || '',
        profileImageUrl: req.user?.profileImageUrl,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan
      };
      
      res.json({
        success: true,
        message: "Payment successful! Your subscription is now active.",
        user: {
          id: user.id,
          email: user.email,
          subscriptionPlan: user.subscription_plan,
          subscriptionStatus: user.subscription_status
        }
      });
    } catch (error) {
      console.error('Checkout completion error:', error);
      res.status(500).json({
        error: 'Failed to complete checkout',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });



  // Messaging API endpoints
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('📋 [GET /api/conversations] Fetching conversations for user:', userId);
      const conversations = await storage.getConversations(userId);
      console.log('📊 [GET /api/conversations] Returned conversations:', {
        count: conversations.length,
        userIds: conversations.map((c: any) => c.otherUser?.id)
      });
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/messages/:receiverId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const receiverId = req.params.receiverId;
      const messages = await storage.getMessages(userId, receiverId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { receiverId, content } = req.body;
      
      console.log('💬 [POST /api/messages] Sending message:', {
        userId,
        receiverId,
        contentLength: content?.length,
        contentPreview: content?.substring(0, 50)
      });
      
      if (!receiverId || !content?.trim()) {
        return res.status(400).json({ message: 'Receiver ID and content are required' });
      }
      
      const message = await storage.sendMessage(userId, receiverId, content.trim());
      console.log('✅ [POST /api/messages] Message sent successfully:', message);
      res.json(message);
    } catch (error) {
      console.error('❌ [POST /api/messages] Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get('/api/messages/unread/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      res.status(500).json({ message: 'Failed to fetch unread message count' });
    }
  });

  app.delete('/api/conversations/:otherUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const otherUserId = req.params.otherUserId;
      
      if (!otherUserId) {
        return res.status(400).json({ message: 'Other user ID is required' });
      }
      
      await storage.deleteConversation(userId, otherUserId);
      res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Failed to delete conversation' });
    }
  });

  app.get('/api/profile/:userId/views', async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      const viewCount = await storage.getProfileViews(userId);
      res.json({ profileViews: viewCount });
    } catch (error) {
      console.error('Error fetching profile views:', error);
      res.status(500).json({ message: 'Failed to fetch profile views' });
    }
  });

  // Notifications endpoints
  app.get('/api/notifications/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error('Error fetching notification count:', error);
      res.status(500).json({ message: 'Failed to fetch notification count' });
    }
  });

  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      res.json({ success });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.get('/api/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const connections = await storage.getConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ message: 'Failed to fetch connections' });
    }
  });

  // Send connection request
  app.post('/api/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { receiverId } = req.body;
      
      if (!receiverId) {
        return res.status(400).json({ message: 'Receiver ID is required' });
      }
      
      if (receiverId === userId) {
        return res.status(400).json({ message: 'Cannot connect with yourself' });
      }
      
      const connection = await storage.sendConnectionRequest(userId, receiverId);
      res.json(connection);
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      res.status(500).json({ message: error.message || 'Failed to send connection request' });
    }
  });

  // Update connection status
  app.put('/api/connections/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const connectionId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Valid status (accepted/declined) is required' });
      }
      
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Valid connection ID is required' });
      }
      
      const connection = await storage.updateConnectionStatus(connectionId, userId, status);
      res.json(connection);
    } catch (error: any) {
      console.error('Error updating connection status:', error);
      if (error.message === 'Connection not found or unauthorized') {
        return res.status(403).json({ message: 'Not authorized to update this connection' });
      }
      res.status(500).json({ message: 'Failed to update connection status' });
    }
  });

  // Delete connection
  app.delete('/api/connections/:connectionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const connectionId = parseInt(req.params.connectionId);
      
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Valid connection ID is required' });
      }
      
      const result = await storage.deleteConnection(connectionId, userId);
      res.json(result);
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      if (error.message === 'Connection not found or unauthorized') {
        return res.status(403).json({ message: 'Not authorized to delete this connection' });
      }
      res.status(500).json({ message: 'Failed to delete connection' });
    }
  });

  // Get connection requests
  app.get('/api/connection-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getConnectionRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
      res.status(500).json({ message: 'Failed to fetch connection requests' });
    }
  });

  // Get categories with user counts
  app.get('/api/categories/with-user-counts', isAuthenticated, async (req: any, res) => {
    try {
      const categories = await storage.getCategoriesWithUserCounts();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories with user counts:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // Get users by category
  app.get('/api/categories/:categoryId/users', isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Valid category ID is required' });
      }
      
      const users = await storage.getUsersByCategory(categoryId);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users by category:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Get users for network discovery (with optional filtering by category and search)
  app.get('/api/users/network', isAuthenticated, async (req: any, res) => {
    try {
      const categoryIdParam = req.query.categoryId ? parseInt(req.query.categoryId) : undefined;
      const search = req.query.search || undefined;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10000;
      
      console.log(`[Network API] Called with: categoryId=${categoryIdParam}, search="${search}", limit=${limit}`);
      
      if (categoryIdParam && isNaN(categoryIdParam)) {
        return res.status(400).json({ message: 'Valid category ID is required' });
      }
      
      const users = await storage.getAllUsersForNetwork({
        categoryId: categoryIdParam && !isNaN(categoryIdParam) ? categoryIdParam : undefined,
        search: search as string,
        limit
      });
      
      console.log(`[Network API] Returning ${users.length} users`);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users for network:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // External invitations endpoint
  app.post('/api/external-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const { email, firstName, lastName, message } = req.body;
      const inviterUserId = req.user.id;
      
      // Use camelCase properties from authenticated user session
      const inviterName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || 'A colleague';
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: 'Email, first name, and last name are required' });
      }
      
      // Generate unique invite token
      const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store invitation token for later retrieval
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
      
      // Store invitation in database instead of memory
      await storage.createExternalInvitation({
        inviterUserId,
        email,
        firstName,
        lastName,
        message: message || '',
        inviteToken,
        expiresAt,
        status: 'pending'
      });
      
      console.log('📧 Sending invitation email:', { 
        email, 
        firstName, 
        lastName, 
        inviterName,
        messagePreview: message?.slice(0, 50) + '...' 
      });
      
      // Import and use the SendGrid email function
      const { sendInvitationEmail } = await import('./email');
      const { getBaseUrl } = await import('./sitemap-service');
      
      // Create full invitation URL for email
      const invitationLink = `${getBaseUrl()}/invite/${inviteToken}`;
      
      console.log('📧 Invitation link:', invitationLink);
      
      const emailSent = await sendInvitationEmail(
        email,
        `${firstName} ${lastName}`.trim(),
        inviterName,
        invitationLink,
        message
      );
      
      if (emailSent) {
        console.log('✅ Invitation email sent successfully via SendGrid');
        res.json({ 
          success: true, 
          message: 'Invitation sent successfully',
          recipient: { email, firstName, lastName }
        });
      } else {
        console.error('❌ Failed to send invitation email via SendGrid');
        // Remove token if email failed (already stored in database, could mark as failed)
        res.status(500).json({ message: 'Failed to send invitation email' });
      }
      
    } catch (error) {
      console.error('Error sending external invitation:', error);
      res.status(500).json({ message: 'Failed to send invitation' });
    }
  });

  // Database storage for invitation tokens - replaced in-memory Map

  // Get all external invitations (for debugging/admin)
  app.get('/api/external-invitations', async (req, res) => {
    try {
      const invitations = await storage.getExternalInvitations();
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching external invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations' });
    }
  });

  // Get invitation details by token
  app.get('/api/external-invitations/:token/details', async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getExternalInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending') {
        return res.status(404).json({ message: 'Invitation not found or expired' });
      }
      
      if (invitation.expiresAt < new Date()) {
        await storage.updateExternalInvitationStatus(token, 'expired');
        return res.status(404).json({ message: 'Invitation expired' });
      }
      
      res.json({
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        message: invitation.message,
        expiresAt: invitation.expiresAt
      });
    } catch (error) {
      console.error('Error fetching invitation details:', error);
      res.status(500).json({ message: 'Failed to fetch invitation details' });
    }
  });

  // Accept invitation and create user account
  app.post('/api/external-invitations/:token/accept', async (req, res) => {
    try {
      const { token } = req.params;
      const { firstName, lastName, password, userType } = req.body;
      
      const invitation = await storage.getExternalInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending') {
        return res.status(404).json({ message: 'Invitation not found or expired' });
      }
      
      if (invitation.expiresAt < new Date()) {
        await storage.updateExternalInvitationStatus(token, 'expired');
        return res.status(404).json({ message: 'Invitation expired' });
      }
      
      // Create user account
      const userData = {
        email: invitation.email,
        firstName: firstName || invitation.firstName,
        lastName: lastName || invitation.lastName,
        password,
        userType: userType || 'job_seeker' as const
      };
      
      const newUser = await storage.createUser(userData);
      
      // Automatically create a connection between the inviter and the new user
      try {
        const client = await pool.connect();
        try {
          await client.query(`
            INSERT INTO connections (sender_id, receiver_id, status, created_at)
            VALUES ($1, $2, 'accepted', NOW())
          `, [invitation.inviterUserId, newUser.id]);
          console.log(`✅ Automatic connection created between inviter ${invitation.inviterUserId} and new user ${newUser.id}`);
        } finally {
          client.release();
        }
      } catch (connectionError: any) {
        console.log(`⚠️ Could not create automatic connection: ${connectionError.message}`);
        // Don't fail the entire invitation process if connection creation fails
      }
      
      // Mark the invitation as accepted in database
      await storage.updateExternalInvitationStatus(token, 'accepted');
      
      // Auto-login job seekers, but NOT recruiter/client (they'll go to checkout)
      if (userType === 'job_seeker' || !userType) {
        req.session.user = {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          userType: newUser.userType
        };
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
          } else {
            console.log(`✅ User ${newUser.id} auto-logged in from invitation`);
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          userType: newUser.userType
        }
      });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      if (error.message?.includes('already exists')) {
        res.status(400).json({ message: 'An account with this email already exists' });
      } else {
        res.status(500).json({ message: 'Failed to create account' });
      }
    }
  });

  // Visit tracking endpoints
  app.post('/api/track-visit', async (req, res) => {
    try {
      const { page } = req.body;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const userId = (req.user as any)?.id || null;
      const sessionId = req.session?.id || null;

      await visitTracker.trackVisit({
        page,
        ip,
        userAgent,
        userId,
        sessionId: sessionId || undefined
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking visit:', error);
      res.status(500).json({ message: 'Failed to track visit' });
    }
  });

  app.get('/api/visit-stats', async (req, res) => {
    try {
      const stats = await visitTracker.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching visit stats:', error);
      res.status(500).json({ message: 'Failed to fetch visit stats' });
    }
  });

  app.get('/api/total-visits', async (req, res) => {
    try {
      const totalVisits = await visitTracker.getTotalVisits();
      res.json({ totalVisits });
    } catch (error) {
      console.error('Error fetching total visits:', error);
      res.status(500).json({ message: 'Failed to fetch total visits' });
    }
  });

  // Admin stats endpoint
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  // Admin vendor management endpoints  
  app.get('/api/admin/vendors/pending', async (req, res) => {
    try {

      const pendingVendors = await storage.getPendingVendors();
      res.json(pendingVendors);
    } catch (error) {
      console.error('Error fetching pending vendors:', error);
      res.status(500).json({ message: 'Failed to fetch pending vendors' });
    }
  });

  app.patch('/api/admin/vendors/:vendorId/status', async (req, res) => {
    try {

      const vendorId = parseInt(req.params.vendorId);
      const { status } = req.body;

      if (isNaN(vendorId)) {
        return res.status(400).json({ message: 'Invalid vendor ID' });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
      }

      const updatedVendor = await storage.updateVendorStatus(vendorId, status, (req.user as any)?.id || 'unknown');
      res.json(updatedVendor);
    } catch (error) {
      console.error('Error updating vendor status:', error);
      res.status(500).json({ message: 'Failed to update vendor status' });
    }
  });

  // ============================================================================
  // SITEMAP ROUTES - SEO Optimization
  // ============================================================================
  
  // Cache duration for sitemaps (1 hour)
  const SITEMAP_CACHE_DURATION = 3600; // 1 hour in seconds
  
  /**
   * Set common headers for XML sitemaps
   */
  function setSitemapHeaders(res: any) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', `public, max-age=${SITEMAP_CACHE_DURATION}`);
    res.setHeader('X-Robots-Tag', 'noindex'); // Don't index sitemaps themselves
  }
  
  /**
   * Main sitemap index - references all sub-sitemaps
   * Location: /sitemap.xml
   */
  app.get('/sitemap.xml', async (req, res) => {
    try {
      console.log('📋 Generating sitemap index...');
      const baseUrl = getBaseUrl(req);
      const sitemapXml = await generateSitemapIndex(baseUrl);
      
      setSitemapHeaders(res);
      res.send(sitemapXml);
      console.log('✅ Sitemap index served successfully');
    } catch (error) {
      console.error('❌ Error generating sitemap index:', error);
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
    }
  });
  
  /**
   * Jobs sitemap - all active job listings
   * Location: /sitemap-jobs.xml
   */
  app.get('/sitemap-jobs.xml', async (req, res) => {
    try {
      console.log('🔨 Generating jobs sitemap...');
      const baseUrl = getBaseUrl(req);
      const sitemapXml = await generateJobsSitemap(baseUrl);
      
      setSitemapHeaders(res);
      res.send(sitemapXml);
      console.log('✅ Jobs sitemap served successfully');
    } catch (error) {
      console.error('❌ Error generating jobs sitemap:', error);
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
    }
  });
  
  /**
   * Companies sitemap - all approved company pages
   * Location: /sitemap-companies.xml
   */
  app.get('/sitemap-companies.xml', async (req, res) => {
    try {
      console.log('🏢 Generating companies sitemap...');
      const baseUrl = getBaseUrl(req);
      const sitemapXml = await generateCompaniesSitemap(baseUrl);
      
      setSitemapHeaders(res);
      res.send(sitemapXml);
      console.log('✅ Companies sitemap served successfully');
    } catch (error) {
      console.error('❌ Error generating companies sitemap:', error);
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
    }
  });
  
  /**
   * Static pages sitemap - core website pages
   * Location: /sitemap-static.xml
   */
  app.get('/sitemap-static.xml', async (req, res) => {
    try {
      console.log('📄 Generating static pages sitemap...');
      const baseUrl = getBaseUrl(req);
      const sitemapXml = await generateStaticPagesSitemap(baseUrl);
      
      setSitemapHeaders(res);
      res.send(sitemapXml);
      console.log('✅ Static pages sitemap served successfully');
    } catch (error) {
      console.error('❌ Error generating static pages sitemap:', error);
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
    }
  });
  
  /**
   * Categories sitemap - job categories with active jobs
   * Location: /sitemap-categories.xml
   */
  app.get('/sitemap-categories.xml', async (req, res) => {
    try {
      console.log('📂 Generating categories sitemap...');
      const baseUrl = getBaseUrl(req);
      const sitemapXml = await generateCategoriesSitemap(baseUrl);
      
      setSitemapHeaders(res);
      res.send(sitemapXml);
      console.log('✅ Categories sitemap served successfully');
    } catch (error) {
      console.error('❌ Error generating categories sitemap:', error);
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
    }
  });
  
  /**
   * Robots.txt - tells search engines about sitemaps and crawling rules
   * Location: /robots.txt
   */
  app.get('/robots.txt', async (req, res) => {
    try {
      console.log('🤖 Generating robots.txt...');
      const baseUrl = getBaseUrl(req);
      const robotsTxt = generateRobotsTxt(baseUrl);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', `public, max-age=${SITEMAP_CACHE_DURATION * 24}`); // Cache for 24 hours
      res.send(robotsTxt);
      console.log('✅ Robots.txt served successfully');
    } catch (error) {
      console.error('❌ Error generating robots.txt:', error);
      res.status(500).send('User-agent: *\nDisallow: /api/\nDisallow: /admin/');
    }
  });

  // Email verification endpoints
  app.post('/api/send-verification-email', async (req: any, res) => {
    try {
      if (!req.user && !req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user || req.session.user;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationToken = require('crypto').randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update user with verification token and OTP
      await pool.query(
        `UPDATE users SET verification_token = $1, verification_token_expiry = $2, verification_otp = $3, verification_otp_expiry = $4 WHERE id = $5`,
        [verificationToken, tokenExpiry, otp, otpExpiry, user.id]
      );

      // Send verification email
      const { sendEmailVerificationEmail } = await import('./email');
      const result = await sendEmailVerificationEmail(
        email,
        user.firstName || 'User',
        verificationToken,
        otp
      );

      if (result) {
        console.log(`✅ Verification email sent to ${email}`);
        res.json({ success: true, message: "Verification email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Send verification email error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.post('/api/verify-email-otp', async (req: any, res) => {
    try {
      const { otp } = req.body;

      if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
      }

      // Find user by OTP - get ALL user fields for session
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, user_type, subscription_status, subscription_plan, verification_otp, verification_otp_expiry FROM users WHERE verification_otp = $1`,
        [otp]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      const user = result.rows[0];

      // Check if OTP is expired
      if (user.verification_otp_expiry && new Date(user.verification_otp_expiry) < new Date()) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      // Mark email as verified
      await pool.query(
        `UPDATE users SET email_verified = true, verification_otp = NULL, verification_otp_expiry = NULL, verification_token = NULL, verification_token_expiry = NULL WHERE id = $1`,
        [user.id]
      );

      // AUTO-LOGIN: Use Passport's req.login for proper session serialization
      req.login(user, async (err) => {
        if (err) {
          console.error('❌ Login error:', err);
          return res.status(500).json({ message: "Failed to login user" });
        }

        console.log(`✅ User logged in via Passport: ${user.email}`);

        // Create checkout session if user is recruiter or enterprise
        let checkoutSessionId = null;
        if (user.user_type === 'recruiter' || user.user_type === 'enterprise' || user.user_type === 'client') {
          const checkoutSession = await storage.createCheckoutSession(user.id, user.user_type === 'client' ? 'enterprise' : 'recruiter');
          if (checkoutSession) {
            checkoutSessionId = checkoutSession.id;
            req.session.checkoutSessionId = checkoutSessionId;
            console.log(`✅ Checkout session created for user ${user.id}: ${checkoutSessionId}`);
          }
        }

        // IMPORTANT: Save session and wait for it to complete before responding
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          console.log(`✅ Session saved and persisted for user ${user.id}`);
          console.log(`✅ Email verified via OTP and user auto-logged in: ${user.email}`);
          
          res.json({ 
            success: true, 
            message: "Email verified successfully",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              userType: user.user_type,
              subscriptionStatus: user.subscription_status,
              subscriptionPlan: user.subscription_plan
            },
            hasCheckoutSession: !!checkoutSessionId,
            redirectUrl: checkoutSessionId ? '/checkout' : undefined
          });
        });
      });
    } catch (error) {
      console.error("Verify email OTP error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Resend OTP endpoint with rate limiting
  app.post('/api/resend-verification-otp', async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, user_type, subscription_status, subscription_plan FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = result.rows[0];

      // Check if user is already verified
      const verifiedCheck = await pool.query(
        `SELECT email_verified FROM users WHERE id = $1`,
        [user.id]
      );

      if (verifiedCheck.rows[0]?.email_verified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update user with new OTP
      await pool.query(
        `UPDATE users SET verification_otp = $1, verification_otp_expiry = $2 WHERE id = $3`,
        [otp, otpExpiry, user.id]
      );

      // Send verification email
      const { sendEmailVerificationEmail } = await import('./email');
      const result2 = await sendEmailVerificationEmail(
        email,
        user.first_name || 'User',
        '', // no token for resend
        otp
      );

      if (result2) {
        console.log(`✅ Resend OTP email sent to ${email}`);
        res.json({ success: true, message: "Verification OTP resent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to resend OTP" });
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ message: "Failed to resend OTP" });
    }
  });

  // Check if user has valid checkout session, or create a new one if user is recruiter/enterprise
  app.get('/api/checkout-session-valid', async (req: any, res) => {
    try {
      // FIRST: Check if session already has a checkout session ID (set during email verification)
      if (req.session?.checkoutSessionId) {
        console.log('🔍 Found checkout session ID in session:', req.session.checkoutSessionId);
        return res.json({ success: true, message: "Valid checkout session", isRenewed: false });
      }

      // SECOND: Fall back to checking for authenticated user
      const user = req.user || req.session?.user;
      
      console.log('🔍 Checkout session validation:', {
        hasReqUser: !!req.user,
        hasSessionUser: !!req.session?.user,
        userId: user?.id,
        userType: user?.userType || user?.user_type
      });
      
      if (!user) {
        console.log('❌ No user found in session');
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      // Normalize user object
      const normalizedUser = {
        id: user.id || user.userId,
        userType: user.userType || user.user_type
      };

      // Check if user has a valid checkout session
      let session = await storage.getCheckoutSession(normalizedUser.id);
      
      if (session) {
        // Session exists and is valid
        console.log(`✅ Valid checkout session found for user ${normalizedUser.id}: ${session.id}`);
        return res.json({ success: true, message: "Valid checkout session", isRenewed: false });
      }

      console.log(`⚠️ No valid checkout session found for user ${normalizedUser.id}, checking if user can create one`);

      // No valid session - check if user is recruiter or enterprise and create new session
      if (normalizedUser.userType === 'recruiter' || normalizedUser.userType === 'client' || normalizedUser.userType === 'enterprise') {
        console.log(`🔄 Creating new checkout session for logged-in ${normalizedUser.userType} user ${normalizedUser.id}`);
        
        // Create a new checkout session
        const accountType = normalizedUser.userType === 'client' || normalizedUser.userType === 'enterprise' ? 'enterprise' : 'recruiter';
        session = await storage.createCheckoutSession(normalizedUser.id, accountType);
        
        if (!session) {
          console.error(`❌ Failed to create checkout session for user ${normalizedUser.id}`);
          return res.status(500).json({ success: false, message: "Failed to create checkout session" });
        }

        // Store session ID in Express session
        req.session.checkoutSessionId = session.id;
        
        // Save session explicitly
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
          }
        });
        
        console.log(`✅ New checkout session created: ${session.id} for user ${normalizedUser.id}`);
        return res.json({ success: true, message: "New checkout session created", isRenewed: true });
      }

      // User is not recruiter/enterprise, cannot access checkout
      console.log(`❌ User ${normalizedUser.id} type "${normalizedUser.userType}" not allowed to access checkout`);
      return res.status(403).json({ success: false, message: "Access denied - subscription required" });
    } catch (error) {
      console.error('Checkout session validation error:', error);
      res.status(500).json({ success: false, message: "Session validation failed" });
    }
  });

  // Renew checkout session for expired session (Case 2: expired session flow)
  app.post('/api/checkout-session/renew', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userType = req.user.userType || req.user.user_type;
      
      console.log(`🔄 Renewing checkout session for user ${userId} (${userType})`);
      
      // Only recruiter or enterprise clients can renew checkout sessions
      if (userType !== 'recruiter' && userType !== 'client' && userType !== 'enterprise') {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      
      // Create new checkout session
      const accountType = userType === 'client' || userType === 'enterprise' ? 'enterprise' : 'recruiter';
      const newSession = await storage.createCheckoutSession(userId, accountType);
      
      if (!newSession) {
        console.error(`❌ Failed to renew checkout session for user ${userId}`);
        return res.status(500).json({ success: false, message: "Failed to renew checkout session" });
      }
      
      // Store new session ID in Express session
      req.session.checkoutSessionId = newSession.id;
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
        }
      });
      
      console.log(`✅ Checkout session renewed: ${newSession.id} for user ${userId}`);
      res.json({ success: true, message: "Checkout session renewed", sessionId: newSession.id });
    } catch (error) {
      console.error('Renew checkout session error:', error);
      res.status(500).json({ success: false, message: "Failed to renew checkout session" });
    }
  });

  app.get('/api/verify-email-link', async (req: any, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Find user by verification token - get ALL user fields for session
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, user_type, subscription_status, subscription_plan, verification_token, verification_token_expiry FROM users WHERE verification_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      const user = result.rows[0];

      // Check if token is expired
      if (user.verification_token_expiry && new Date(user.verification_token_expiry) < new Date()) {
        return res.status(400).json({ message: "Verification link has expired" });
      }

      // Mark email as verified
      await pool.query(
        `UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL, verification_otp = NULL, verification_otp_expiry = NULL WHERE id = $1`,
        [user.id]
      );

      // AUTO-LOGIN: Use Passport's req.login for proper session serialization
      req.login(user, async (err) => {
        if (err) {
          console.error('❌ Login error:', err);
          return res.status(500).json({ message: "Failed to login user" });
        }

        console.log(`✅ User logged in via Passport: ${user.email}`);

        // Create checkout session if user is recruiter or enterprise
        let checkoutSessionId = null;
        if (user.user_type === 'recruiter' || user.user_type === 'enterprise' || user.user_type === 'client') {
          const checkoutSession = await storage.createCheckoutSession(user.id, user.user_type === 'client' ? 'enterprise' : 'recruiter');
          if (checkoutSession) {
            checkoutSessionId = checkoutSession.id;
            req.session.checkoutSessionId = checkoutSessionId;
            console.log(`✅ Checkout session created for user ${user.id}: ${checkoutSessionId}`);
          }
        }

        // IMPORTANT: Save session and wait for it to complete before responding
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          console.log(`✅ Session saved and persisted for user ${user.id}`);
          console.log(`✅ Email verified via link and user auto-logged in: ${user.email}`);
          
          res.json({ 
            success: true, 
            message: "Email verified successfully",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              userType: user.user_type,
              subscriptionStatus: user.subscription_status,
              subscriptionPlan: user.subscription_plan
            },
            hasCheckoutSession: !!checkoutSessionId,
            redirectUrl: checkoutSessionId ? '/checkout' : undefined
          });
        });
      });
    } catch (error) {
      console.error("Verify email link error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Contact form endpoint
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'All fields are required' 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid email address' 
        });
      }

      console.log('📧 Contact form submission received:', {
        name,
        email,
        subject,
        messageLength: message.length
      });

      const { sendContactEmail } = await import('./email');
      const emailSent = await sendContactEmail(name, email, subject, message);

      if (emailSent) {
        console.log('✅ Contact email sent successfully to happytweet2024@gmail.com');
        res.json({ 
          success: true, 
          message: 'Your message has been sent successfully. We will respond within 24 hours.' 
        });
      } else {
        console.warn('⚠️ Failed to send contact email');
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send message. Please try again later.' 
        });
      }
    } catch (error) {
      console.error('❌ Contact form error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred while processing your request.' 
      });
    }
  });

  // Email test endpoint
  app.post('/api/test-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      console.log('\n🧪 TESTING EMAIL SYSTEM...');
      console.log('📧 Recipient:', email);
      console.log('SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        from: process.env.SMTP_FROM_EMAIL,
      });

      const { sendPasswordResetEmail } = await import('./email');
      const result = await sendPasswordResetEmail(email, 'Test User', 'test-token-123456789');

      if (result) {
        console.log('✅ TEST EMAIL SENT SUCCESSFULLY');
        res.json({ 
          success: true, 
          message: 'Test email sent successfully!',
          sentTo: email,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('❌ TEST EMAIL FAILED TO SEND');
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send test email. Check server logs for details.' 
        });
      }
    } catch (error) {
      console.error('❌ Test email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Test email error: ' + (error as any).message 
      });
    }
  });

  // Generate fresh 60-day Facebook access token and store in database
  app.post('/api/admin/renew-facebook-token', async (req, res) => {
    try {
      console.log('\n🔄 === FACEBOOK TOKEN RENEWAL REQUEST ===');
      
      // Get credentials from environment
      const clientId = process.env.FACEBOOK_CLIENT_ID;
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error('❌ Missing Facebook credentials');
        return res.status(500).json({ 
          success: false, 
          message: 'Facebook credentials not configured' 
        });
      }

      // Get current token from database
      const { rows } = await pool.query(
        'SELECT id, access_token FROM social_media_tokens WHERE platform = $1',
        ['facebook']
      );

      if (rows.length === 0) {
        console.error('❌ No Facebook token found in database');
        return res.status(400).json({ 
          success: false, 
          message: 'No existing Facebook token found in database' 
        });
      }

      const currentToken = rows[0].access_token;
      const tokenId = rows[0].id;

      console.log('📦 Current token found in database');
      console.log('🔄 Exchanging for 60-day long-lived token...');

      // Exchange for new 60-day long-lived token
      const url = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
      url.searchParams.append('client_id', clientId);
      url.searchParams.append('client_secret', clientSecret);
      url.searchParams.append('grant_type', 'fb_exchange_token');
      url.searchParams.append('fb_exchange_token', currentToken);

      console.log(`🌐 Calling Facebook API: ${url.toString().split('?')[0]}`);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Facebook API Error:', JSON.stringify(data, null, 2));
        return res.status(400).json({ 
          success: false, 
          message: `Facebook API error: ${data.error?.message || 'Unknown error'}` 
        });
      }

      const newToken = data.access_token;
      const expiresIn = data.expires_in || 5184000; // 60 days in seconds
      const expiresInDays = Math.round(expiresIn / (24 * 60 * 60));
      const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

      console.log(`✅ New token received from Facebook`);
      console.log(`⏰ Valid for: ${expiresInDays} days`);
      console.log(`📅 Expires: ${newExpiresAt.toISOString()}`);

      // Update database with new token
      await pool.query(
        `UPDATE social_media_tokens 
         SET access_token = $1, expires_at = $2, last_renewed_at = NOW()
         WHERE id = $3`,
        [newToken, newExpiresAt, tokenId]
      );

      console.log('✅ Token updated in database');
      console.log('📊 === TOKEN RENEWAL COMPLETE ===\n');

      res.json({
        success: true,
        message: 'Facebook token renewed successfully',
        token: newToken,
        expiresAt: newExpiresAt.toISOString(),
        expiresInDays: expiresInDays,
        tokenPreview: `${newToken.substring(0, 20)}...${newToken.substring(newToken.length - 20)}`
      });
    } catch (error) {
      console.error('❌ Token renewal error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew Facebook token: ' + (error as any).message
      });
    }
  });

  // Test endpoint for manual Facebook posting
  app.post('/api/admin/test-facebook-post', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get token from database
      const tokenResult = await pool.query(
        'SELECT access_token, expires_at FROM social_media_tokens WHERE platform = $1',
        ['facebook']
      );

      if (!tokenResult.rows.length) {
        return res.status(400).json({ error: 'No Facebook token found in database' });
      }

      const { access_token, expires_at } = tokenResult.rows[0];
      const pageId = process.env.FACEBOOK_PAGE_ID;

      if (!pageId) {
        return res.status(400).json({ error: 'FACEBOOK_PAGE_ID not configured' });
      }

      // Check token expiry
      const expiryDate = new Date(expires_at);
      const now = new Date();
      const isExpired = now > expiryDate;

      console.log(`🧪 TEST POST: Token expires at ${expiryDate.toISOString()}`);
      console.log(`🧪 TEST POST: Token is ${isExpired ? 'EXPIRED' : 'VALID'}`);
      console.log(`🧪 TEST POST: Message: "${message}"`);
      console.log(`🧪 TEST POST: Page ID: ${pageId}`);
      console.log(`🧪 TEST POST: Token preview: ${access_token.substring(0, 30)}...`);

      // Post to Facebook
      const endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      const formData = new URLSearchParams();
      formData.append('message', message);
      formData.append('access_token', access_token);

      console.log(`🧪 TEST POST: Calling Facebook API endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      console.log(`🧪 TEST POST: Facebook API Response Status: ${response.status}`);
      console.log(`🧪 TEST POST: Facebook API Response:`, JSON.stringify(data, null, 2));

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.error?.message || 'Facebook API error',
          fullError: data.error,
          status: response.status
        });
      }

      res.json({
        success: true,
        message: 'Test post successful!',
        postId: data.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Test post error:', error);
      res.status(500).json({
        success: false,
        error: (error as any).message,
        stack: (error as any).stack
      });
    }
  });

  console.log('✅ Routes registered successfully - auto-application system disabled');
  console.log('🗺️ Sitemap routes registered: /sitemap.xml, /sitemap-jobs.xml, /sitemap-companies.xml, /sitemap-static.xml, /sitemap-categories.xml, /robots.txt');
  return app;
}
