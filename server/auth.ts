import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cleanPool as pool } from "./clean-neon";
import session from 'express-session';
import createMemoryStore from 'memorystore';
import pgSession from 'connect-pg-simple';
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import rateLimit from 'express-rate-limit';
import validator from 'validator';

// Extend session data type for mobile OAuth and pending OAuth signup
declare module 'express-session' {
  interface SessionData {
    checkoutSessionId?: string;
    mobileOAuth?: {
      isMobile: boolean;
      redirectUri?: string;
      plan?: string;
    };
    mobileTokens?: {
      [token: string]: {
        userId: string;
        email: string;
        timestamp: number;
        used: boolean;
      };
    };
    postAuthRedirect?: string;
    pendingOAuthUserId?: string;
    pendingOAuthEmail?: string;
    pendingOAuthFirstName?: string;
    pendingOAuthLastName?: string;
  }
}

const scryptAsync = promisify(scrypt);

// Global token store for mobile OAuth session handoff
interface MobileToken {
  userId: string;
  email: string;
  timestamp: number;
  used: boolean;
}

const mobileTokenStore = new Map<string, MobileToken>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const [token, data] of Array.from(mobileTokenStore.entries())) {
    if (data.timestamp < fiveMinutesAgo || data.used) {
      mobileTokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Cache for deserialized users to ensure they're available across requests
export const userCache = new Map<string, any>();

export function setupAuth(app: Express) {
  // Rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 auth requests per windowMs (increased for testing)
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Ensure sessions table exists for PostgreSQL session store
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid varchar NOT NULL COLLATE "default",
          sess json NOT NULL,
          expire timestamp(6) NOT NULL,
          PRIMARY KEY (sid)
        );
        CREATE INDEX IF NOT EXISTS IDX_sessions_expire ON sessions (expire);
      `);
      console.log('✅ Sessions table ready');
    } catch (error) {
      console.error('⚠️ Error creating sessions table:', error);
    }
  })();

  // Session configuration - Use PostgreSQL for persistent session storage
  const PgSession = pgSession(session);

  // Set trust proxy for production
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session({
    secret: process.env.SESSION_SECRET || 'auth-secret-key-dev',
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: pool,
      tableName: 'sessions'
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // True for production, false for dev
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for production cross-origin
      domain: undefined // No domain restriction
    }
  }));

  // Initialize Passport FIRST
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization BEFORE strategy registration
  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      console.log('Deserializing user ID:', id);
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log('User found during deserialization:', user.email);
        // Cache the user so it's available for subsequent requests
        userCache.set(id, user);
        done(null, user);
      } else {
        console.log('User not found during deserialization');
        userCache.delete(id);
        done(null, false);
      }
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Configure Google OAuth Strategy AFTER passport initialization
  console.log('Checking Google OAuth credentials...');
  console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Setting up Google OAuth strategy...');
    console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
    
    // Determine the correct callback URL based on environment
    // If REPLIT_DOMAINS contains replit.dev, we're in dev mode - use dev callback
    // Otherwise use production callback (pingjob.com)
    const replitDomain = process.env.REPLIT_DOMAINS || '';
    const isDevEnvironment = replitDomain.includes('replit.dev') || replitDomain.includes('localhost');
    
    let callbackURL;
    if (isDevEnvironment && replitDomain) {
      callbackURL = `https://${replitDomain}/api/auth/google/callback`;
    } else {
      // Production - use www.pingjob.com
      callbackURL = 'https://www.pingjob.com/api/auth/google/callback';
    }
    
    console.log('Current environment:', process.env.NODE_ENV || 'development');
    console.log('Is dev environment?:', isDevEnvironment);
    console.log('Using callback URL:', callbackURL);
    
    try {
      passport.use('google', new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google OAuth callback received for:', profile.emails?.[0]?.value);
          
          // Check if user exists
          const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [profile.emails?.[0]?.value]
          );

          if (existingUser.rows.length > 0) {
            console.log('Existing user found, logging in');
            return done(null, existingUser.rows[0]);
          }

          // Create new user with Google ID with pending status (waiting for account type selection)
          console.log('Creating new user from Google profile with pending account type');
          const newUser = await pool.query(
            `INSERT INTO users (id, email, first_name, last_name, user_type, subscription_status, subscription_plan, email_verified, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
            [
              `google_${profile.id}`,
              profile.emails?.[0]?.value,
              profile.name?.givenName,
              profile.name?.familyName,
              'pending_account_type',
              'pending',
              'free',
              true
            ]
          );

          console.log('New Google OAuth user created with pending account type status');
          return done(null, newUser.rows[0]);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error);
        }
      }));
      console.log('✓ Google OAuth strategy registered successfully');
      
      // Test that the strategy is actually registered
      const strategies = Object.keys((passport as any)._strategies || {});
      console.log('Available strategies after registration:', strategies);
    } catch (error) {
      console.error('Error setting up Google OAuth strategy:', error);
    }
  } else {
    console.log('⚠️ Google OAuth credentials not found - OAuth will not be available');
  }


  // Get pending OAuth data (for account type selection)
  app.get('/api/pending-oauth-data', (req: any, res) => {
    if (req.session?.pendingOAuthUserId) {
      return res.status(200).json({
        email: req.session.pendingOAuthEmail,
        firstName: req.session.pendingOAuthFirstName,
        lastName: req.session.pendingOAuthLastName
      });
    }
    return res.status(404).json({ message: 'No pending OAuth signup' });
  });

  app.get('/api/user', (req: any, res) => {
    // Check both session.user and req.user (Passport)  
    const user = req.user || req.session?.user;
    
    console.log('🔐 /api/user endpoint - checking authentication:', {
      hasReqUser: !!req.user,
      hasSessionUser: !!req.session?.user,
      userExists: !!user,
      userEmail: user?.email,
      userId: user?.id || user?.userId
    });
    
    if (user) {
      // Transform database field names to camelCase for frontend
      const userResponse = {
        id: user.id || user.userId,
        email: user.email,
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        userType: user.user_type || user.userType,
        profileImageUrl: user.profile_image_url || user.profileImageUrl,
        subscriptionStatus: user.subscription_status || 'trial',
        subscriptionPlan: user.subscription_plan || 'free'
      };
      
      // Validate that we have required fields
      if (!userResponse.id || !userResponse.email) {
        console.error('🔐 /api/user - invalid user data:', { user, userResponse });
        return res.status(400).json({ message: "Invalid user data" });
      }
      
      console.log('🔐 /api/user - returning authenticated user:', { id: userResponse.id, email: userResponse.email });
      return res.status(200).json(userResponse);
    }
    
    console.log('🔐 /api/user - no authenticated user found');
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.post('/api/login', authLimiter, async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      // Input validation
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      if (password.length > 100) {
        return res.status(400).json({ message: "Password too long" });
      }
      
      const result = await pool.query(
        'SELECT id, email, password, first_name, last_name, user_type, email_verified, subscription_status, subscription_plan, created_at FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const user = result.rows[0];
      
      if (!user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Email verification is only required for NEW users (created after system implementation)
      // Existing users created before the system are automatically approved
      const emailVerificationSystemDate = new Date('2025-11-24T00:00:00Z'); // System implementation date
      const userCreatedDate = new Date(user.created_at);
      const isNewUser = userCreatedDate > emailVerificationSystemDate;
      
      // Check if email is verified - ONLY for new users
      if (!user.email_verified && isNewUser) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in",
          emailVerified: false,
          requiresEmailVerification: true,
          redirectTo: `/verify-email`
        });
      }
      
      // Allow login even with pending subscription status - users need to be able to log in to complete payment
      // Subscription status check should happen on feature access, not on login
      if (user.subscription_status === "pending") {
        console.log(`🔐 Recruiter/Enterprise user ${user.email} logging in with pending subscription. Will redirect to checkout.`);
      }
      
      const userSession = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan
      };
      
      // Store in both session and use Passport's login method
      req.session.user = userSession;
      
      // Use Passport's login method for proper session handling
      req.login(user, async (err: any) => {
        if (err) {
          console.error("Passport login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // If user has pending subscription status, create checkout session immediately
        let checkoutSessionId = undefined;
        if (user.subscription_status === "pending" && (user.user_type === "recruiter" || user.user_type === "client")) {
          try {
            const { storage } = await import('./storage');
            const accountType = user.user_type === "client" ? "enterprise" : "recruiter";
            const checkoutSession = await storage.createCheckoutSession(user.id, accountType);
            if (checkoutSession) {
              checkoutSessionId = checkoutSession.id;
              req.session.checkoutSessionId = checkoutSessionId;
              console.log(`✅ Created checkout session ${checkoutSessionId} for pending user during login: ${user.email}`);
            }
          } catch (checkoutErr) {
            console.warn(`⚠️ Could not create checkout session during login: ${checkoutErr}`);
          }
        }
        
        // Force session save to ensure persistence
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          
          console.log('Login successful - User stored in session via Passport:', user.email);
          console.log('Session saved successfully, user ID:', user.id);
          res.status(200).json(userSession);
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/register', authLimiter, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, userType } = req.body;
      
      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Enhanced input validation
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      
      // Enhanced password validation
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" });
      }
      
      // Sanitize input
      const sanitizedEmail = validator.normalizeEmail(email) || email;
      const sanitizedFirstName = validator.escape(firstName.trim());
      const sanitizedLastName = validator.escape(lastName.trim());
      
      // Validate name fields
      if (firstName.trim().length === 0 || lastName.trim().length === 0) {
        return res.status(400).json({ message: "First name and last name cannot be empty" });
      }
      
      // Determine actual user type (recruiter and client are both "recruiter" for now, enterprise is "client")
      const validUserType = (userType && (userType === "recruiter" || userType === "client" || userType === "enterprise")) 
        ? (userType === "enterprise" ? "client" : userType) 
        : "job_seeker";
      
      // Check if user exists
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const hashedPassword = await hashPassword(password);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // For paid plans (recruiter/client/enterprise), set subscription_status to 'pending' (awaiting payment)
      const subscriptionPlan = (validUserType === "recruiter" || validUserType === "client") ? validUserType : "free";
      const subscriptionStatus = (validUserType === "recruiter" || validUserType === "client") ? "pending" : "trial";
      
      // Insert new user with validated data
      const insertResult = await pool.query(`
        INSERT INTO users (id, email, password, first_name, last_name, user_type, subscription_plan, subscription_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, first_name, last_name, user_type, subscription_plan, subscription_status
      `, [userId, email.toLowerCase().trim(), hashedPassword, firstName.trim(), lastName.trim(), validUserType, subscriptionPlan, subscriptionStatus]);
      
      const user = insertResult.rows[0];
      
      // Generate OTP and verification token for email verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Update user with verification token and OTP
      await pool.query(
        `UPDATE users SET verification_token = $1, verification_token_expiry = $2, verification_otp = $3, verification_otp_expiry = $4 WHERE id = $5`,
        [verificationToken, tokenExpiry, otp, otpExpiry, user.id]
      );
      
      // Send verification email
      try {
        const { sendEmailVerificationEmail } = await import('./email');
        await sendEmailVerificationEmail(
          user.email,
          user.first_name || 'User',
          verificationToken,
          otp
        );
        console.log(`📧 Verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error('⚠️ Warning: Failed to send verification email:', emailError);
      }
      
      // Return user but do NOT auto-login - user must verify email first
      return res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        subscriptionPlan: user.subscription_plan,
        subscriptionStatus: user.subscription_status,
        emailVerified: false,
        requiresEmailVerification: true,
        verificationToken: verificationToken
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  // Complete OAuth signup by setting account type
  app.post('/api/complete-oauth-signup', async (req: any, res) => {
    try {
      // Check for pending OAuth signup
      if (!req.session?.pendingOAuthUserId) {
        return res.status(401).json({ message: 'No pending OAuth signup' });
      }

      const { accountType } = req.body;
      const validAccountTypes = ['job_seeker', 'recruiter', 'client'];
      
      if (!accountType || !validAccountTypes.includes(accountType)) {
        return res.status(400).json({ message: 'Invalid account type' });
      }

      const userId = req.session.pendingOAuthUserId;
      
      // Update user account type
      const updateResult = await pool.query(
        `UPDATE users SET user_type = $1, subscription_plan = $2, subscription_status = $3 
         WHERE id = $4 
         RETURNING id, email, first_name, last_name, user_type, subscription_plan, subscription_status`,
        [
          accountType,
          (accountType === 'recruiter' || accountType === 'client') ? accountType : 'free',
          (accountType === 'recruiter' || accountType === 'client') ? 'pending' : 'active',
          userId
        ]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedUser = updateResult.rows[0];
      
      // Clear pending OAuth data
      delete req.session.pendingOAuthUserId;
      delete req.session.pendingOAuthEmail;
      delete req.session.pendingOAuthFirstName;
      delete req.session.pendingOAuthLastName;

      // Create session user object
      const userSession = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        userType: updatedUser.user_type,
        subscriptionStatus: updatedUser.subscription_status,
        subscriptionPlan: updatedUser.subscription_plan
      };

      // Store in both session
      req.session.user = userSession;
      
      // Use Passport's login method for proper session handling
      req.login(updatedUser, async (err: any) => {
        if (err) {
          console.error('Passport login error:', err);
          return res.status(500).json({ message: 'Login failed' });
        }

        // Create checkout session if recruiter/client
        let checkoutSessionId = undefined;
        if ((accountType === 'recruiter' || accountType === 'client') && updatedUser.subscription_status === 'pending') {
          try {
            const { storage } = await import('./storage');
            const checkoutAccountType = accountType === 'client' ? 'enterprise' : 'recruiter';
            const checkoutSession = await storage.createCheckoutSession(userId, checkoutAccountType);
            if (checkoutSession) {
              checkoutSessionId = checkoutSession.id;
              req.session.checkoutSessionId = checkoutSessionId;
              console.log(`✅ Created checkout session for OAuth signup: ${checkoutSessionId}`);
            }
          } catch (checkoutErr) {
            console.warn(`⚠️ Could not create checkout session: ${checkoutErr}`);
          }
        }

        // Save session to ensure persistence
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ message: 'Session save failed' });
          }

          console.log(`✅ Account type set to ${accountType} for user ${userId} - User is now logged in`);
          res.status(200).json({
            ...userSession,
            checkoutSessionId
          });
        });
      });
    } catch (error) {
      console.error('Complete OAuth signup error:', error);
      res.status(500).json({ message: 'Failed to complete signup' });
    }
  });

  const logoutHandler = (req: any, res: any) => {
    console.log('=== LOGOUT ATTEMPT START ===');
    console.log('Session ID before logout:', req.sessionID);
    console.log('Has req.user:', !!req.user);
    console.log('Has session.user:', !!req.session?.user);
    
    // STEP 1: Logout from Passport FIRST
    req.logout((passportErr: any) => {
      if (passportErr) {
        console.error("Passport logout error:", passportErr);
      } else {
        console.log('✓ Passport logout successful - req.user cleared');
      }
      
      // STEP 2: Clear all session data
      if (req.session) {
        console.log('Clearing session data...');
        
        // Clear all session properties except cookie
        for (const key in req.session) {
          if (key !== 'cookie') {
            delete (req.session as any)[key];
          }
        }
        
        // STEP 3: Destroy session in database
        req.session.destroy((destroyErr: any) => {
          if (destroyErr) {
            console.error("Session destroy error:", destroyErr);
            // Continue anyway - still try to clear cookie
          } else {
            console.log('✓ Session destroyed from database');
          }
          
          // STEP 4: Clear session cookie with exact same options as creation
          const cookieOptions = {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            domain: undefined
          };
          
          res.clearCookie('connect.sid', cookieOptions);
          console.log('✓ Session cookie cleared');
          console.log('=== LOGOUT COMPLETED SUCCESSFULLY ===');
          res.json({ message: "Logged out successfully" });
        });
      } else {
        // No session exists, just clear cookie and return
        const cookieOptions = {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          domain: undefined
        };
        
        res.clearCookie('connect.sid', cookieOptions);
        console.log('✓ No session to destroy, cookie cleared');
        console.log('=== LOGOUT COMPLETED (NO PRIOR SESSION) ===');
        res.json({ message: "Logged out successfully" });
      }
    });
  };

  // Google OAuth routes
  app.get('/api/auth/google', (req, res, next) => {
    console.log('=== GOOGLE OAUTH REQUEST ===');
    console.log('Host:', req.get('host'));
    console.log('Request method:', req.method);
    console.log('User agent:', req.get('User-Agent'));
    console.log('Google Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('Google Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    
    // Debug: Check available strategies at request time
    const strategies = Object.keys((passport as any)._strategies || {});
    console.log('Available strategies:', strategies);
    console.log('Google strategy exists:', !!((passport as any)._strategies?.google));
    
    // Check if Google OAuth is properly configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('ERROR: Google OAuth credentials missing!');
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }
    
    // Check if Google strategy is registered
    if (!((passport as any)._strategies?.google)) {
      console.error('ERROR: Google OAuth strategy not registered!');
      return res.status(500).json({ error: 'Google OAuth strategy not available' });
    }
    
    // For HEAD requests, just return success if credentials exist
    if (req.method === 'HEAD') {
      console.log('HEAD request - returning success');
      return res.status(200).end();
    }
    
    // Store mobile parameters in session for callback
    if (req.query.mobile === 'true') {
      console.log('Mobile OAuth request detected, storing parameters');
      req.session.mobileOAuth = {
        isMobile: true,
        redirectUri: req.query.redirect_uri as string,
        plan: req.query.plan as string
      };
    }
    
    // Store redirect in OAuth state parameter (survives OAuth redirect)
    const redirectPath = req.query.redirect as string;
    const state = redirectPath ? JSON.stringify({ redirect: redirectPath }) : undefined;
    
    if (redirectPath) {
      console.log('🔐 Web redirect detected, encoding in OAuth state:', redirectPath);
    }
    
    console.log('Proceeding with Google OAuth authentication...');
    next();
  }, (req, res, next) => {
    // Get redirect from query and encode in state
    const redirectPath = req.query.redirect as string;
    const state = redirectPath ? Buffer.from(JSON.stringify({ redirect: redirectPath })).toString('base64') : undefined;
    
    console.log('Calling passport.authenticate with google strategy');
    console.log('OAuth state parameter:', state);
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      failureRedirect: '/auth?error=oauth_failed',
      state: state
    })(req, res, next);
  });

  app.get('/api/auth/google/callback', (req, res, next) => {
    console.log('🔐 Google callback route hit');
    console.log('🔐 OAuth state from Google:', req.query.state);
    
    // Extract redirect from OAuth state parameter
    let redirectFromState: string | undefined;
    if (req.query.state) {
      try {
        const stateData = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString());
        redirectFromState = stateData.redirect;
        console.log('🔐 Extracted redirect from OAuth state:', redirectFromState);
      } catch (e) {
        console.error('🔐 Error parsing OAuth state:', e);
      }
    }
    
    passport.authenticate('google', { session: true, failureRedirect: '/auth?error=oauth_failed' }, (err, user) => {
      if (err) {
        console.error('🔐 OAuth authentication error:', err);
        return res.redirect('/auth?error=oauth_error');
      }
      
      if (!user) {
        console.error('🔐 No user returned from Google OAuth');
        return res.redirect('/auth?error=oauth_no_user');
      }
      
      console.log('🔐 OAuth user authenticated:', user.email);
      
      // Check if this is a new user that needs account type selection
      if (user.user_type === 'pending_account_type') {
        console.log('🔐 New Google OAuth user, redirecting to account type selection without login');
        
        // Store temporary data in session for account type selection page
        req.session.pendingOAuthUserId = user.id;
        req.session.pendingOAuthEmail = user.email;
        req.session.pendingOAuthFirstName = user.first_name;
        req.session.pendingOAuthLastName = user.last_name;
        
        // Save session and redirect
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('🔐 Session save error:', saveErr);
            return next(saveErr);
          }
          console.log('🔐 Redirecting to account type selection');
          res.redirect('/account-type-selection');
        });
        return;
      }
      
      // Existing user or user who has already selected account type - log them in
      // Use req.logIn to properly establish the session
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('🔐 Login error:', loginErr);
          return next(loginErr);
        }
        
        console.log('🔐 User logged in successfully, setting session data');
        
        // Set session user data for consistency with regular login
        req.session.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          subscriptionStatus: user.subscription_status,
          subscriptionPlan: user.subscription_plan
        };
        
        console.log('🔐 Session data set, saving session before redirect');
        
        // Explicitly save session before redirecting
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('🔐 Session save error:', saveErr);
            return next(saveErr);
          }
          
          // Check if this is a mobile OAuth request (from session)
          const mobileOAuth = req.session.mobileOAuth;
          const isMobile = mobileOAuth?.isMobile || false;
          const customRedirect = mobileOAuth?.redirectUri;
          
          // Validate mobile redirect URI more strictly
          if (isMobile && customRedirect === 'pingjob://auth-callback') {
            console.log('🔐 Mobile OAuth success, generating one-time token for session handoff');
            
            // Generate secure one-time token for mobile session handoff
            const crypto = require('crypto');
            const oneTimeToken = crypto.randomBytes(32).toString('hex');
            
            // Store token in global store (not session - different contexts)
            const tokenData: MobileToken = {
              userId: user.id,
              email: user.email,
              timestamp: Date.now(),
              used: false
            };
            
            mobileTokenStore.set(oneTimeToken, tokenData);
            console.log('🔐 One-time token stored globally for mobile handoff');
            
            const redirectUrl = `${customRedirect}?token=${oneTimeToken}`;
            console.log('🔐 Redirecting to mobile app with one-time token');
            res.redirect(redirectUrl);
          } else {
            console.log('🔐 Web OAuth success, session saved, redirecting based on user state');
            
            // Use redirect from OAuth state (not session) or go to dashboard
            const redirectPath = redirectFromState;
            console.log('🔐 Checking for redirect from OAuth state:', redirectPath);
            
            if (redirectPath) {
              console.log('🔐 Found redirect from OAuth state, redirecting to:', redirectPath);
              res.redirect(redirectPath);
            } else {
              console.log('🔐 No redirect found, redirecting to dashboard');
              res.redirect('/dashboard');
            }
          }
        });
      });
    })(req, res, next);
  });

  // Mobile session handoff endpoint
  app.post('/api/auth/mobile-complete', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token required' });
      }
      
      // Get token data from global store (not session - different contexts)
      const tokenData = mobileTokenStore.get(token);
      
      if (!tokenData) {
        console.error('Mobile token not found or expired:', token);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      if (tokenData.used) {
        console.error('Mobile token already used:', token);
        mobileTokenStore.delete(token);
        return res.status(401).json({ error: 'Token already used' });
      }
      
      // Check token expiry (5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      if (tokenData.timestamp < fiveMinutesAgo) {
        console.error('Mobile token expired:', token);
        mobileTokenStore.delete(token);
        return res.status(401).json({ error: 'Token expired' });
      }
      
      // Mark token as used
      tokenData.used = true;
      mobileTokenStore.set(token, tokenData);
      
      // Get user data and establish session
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [tokenData.userId]);
      
      if (userResult.rows.length === 0) {
        console.error('User not found for mobile token:', tokenData.userId);
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // Set session data
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type
      };
      
      // Save session and respond
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Mobile session save error:', saveErr);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        
        console.log('🔐 Mobile session established for:', user.email);
        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type
          }
        });
        
        // Clean up used token from global store
        mobileTokenStore.delete(token);
      });
    } catch (error) {
      console.error('Mobile complete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Handle both GET and POST requests for logout
  app.post('/api/logout', logoutHandler);
  app.get('/api/logout', logoutHandler);
}