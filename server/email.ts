import nodemailer from 'nodemailer';

function getBaseUrl(): string {
  // CRITICAL: Email links MUST always use production domain so users can click them
  // Never use Replit preview URLs in emails - they're temporary and not accessible to users
  return 'https://www.pingjob.com';
}

let transporter: nodemailer.Transporter | null = null;

function initializeTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@pingjob.com';

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.warn('⚠️  SMTP credentials not configured. Email functionality will be disabled.');
    console.warn('Set these environment variables to enable email:');
    console.warn('  - SMTP_HOST (e.g., smtp.postmarkapp.com)');
    console.warn('  - SMTP_PORT (default: 587)');
    console.warn('  - SMTP_USER (your API key)');
    console.warn('  - SMTP_PASSWORD (your API key)');
    console.warn('  - SMTP_FROM_EMAIL (sender email)');
    return null as any;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  console.log(`✅ SMTP transporter initialized for ${smtpHost}:${smtpPort} with sender: ${smtpFromEmail}`);
  return transporter;
}

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const mailer = initializeTransporter();
    
    if (!mailer) {
      console.log('📧 Email sending disabled - SMTP not configured');
      return false;
    }

    const fromEmail = params.from || process.env.SMTP_FROM_EMAIL || 'noreply@pingjob.com';
    
    console.log('📧 Attempting to send email via SMTP...', {
      to: params.to,
      from: fromEmail,
      subject: params.subject,
      host: process.env.SMTP_HOST,
    });
    
    const result = await mailer.sendMail({
      from: `PingJob <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    
    console.log('✅ Email sent successfully via SMTP');
    console.log('📧 Response:', result.response);
    return true;
  } catch (error) {
    console.error('❌ SMTP email error:', error);
    console.error('Error details:', {
      code: (error as any).code,
      message: (error as any).message,
      command: (error as any).command,
      responseCode: (error as any).responseCode,
    });

    if ((error as any).code === 'EAUTH') {
      console.error('🔑 SMTP Authentication Error - Check credentials:');
      console.error('For Postmark: Username and password should both be your Server API token');
    } else if ((error as any).code === 'ECONNREFUSED') {
      console.error('🌐 SMTP Connection Error - Cannot connect to SMTP server');
    }
    
    return false;
  }
}

export async function sendPasswordResetEmail(
  recipientEmail: string,
  recipientName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${resetToken}`;
  
  const subject = 'Reset Your PingJob Password';
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f7fa; padding: 0; border-radius: 8px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">PingJob</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Password Reset</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <p style="margin-top: 0; font-size: 16px; color: #333;">Hi ${recipientName},</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          We received a request to reset your PingJob password. If you didn't make this request, you can safely ignore this email.
        </p>

        <!-- Reset Button -->
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>

        <!-- Fallback Link -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 30px 0;">
          <p style="margin-top: 0; font-size: 13px; color: #777;">
            <strong>Or copy and paste this link in your browser:</strong>
          </p>
          <p style="margin: 10px 0; font-size: 12px; color: #0077b6; word-break: break-all;">
            ${resetUrl}
          </p>
        </div>

        <!-- Expiry Warning -->
        <p style="font-size: 14px; color: #d32f2f; text-align: center; margin: 30px 0 0 0;">
          ⏰ <strong>This link expires in 1 hour</strong>
        </p>

        <!-- Security Notice -->
        <p style="font-size: 12px; color: #999; text-align: center; margin: 20px 0 0 0;">
          If you didn't request a password reset, please ignore this email and your account will remain unchanged.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f5f7fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          &copy; 2025 PingJob. All rights reserved.<br>
          <span style="color: #ccc;">|</span> 
          <a href="${getBaseUrl()}" style="color: #0077b6; text-decoration: none; font-size: 12px;">Visit PingJob</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `
Reset Your PingJob Password

Hi ${recipientName},

We received a request to reset your PingJob password.

Click here to reset your password:
${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, please ignore this email.

---
Copyright 2025 PingJob. All rights reserved.
  `;

  return await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlContent,
    text: textContent,
  });
}

export async function sendEmailVerificationEmail(
  recipientEmail: string,
  recipientName: string,
  verificationToken: string,
  otp: string
): Promise<boolean> {
  const verificationUrl = `${getBaseUrl()}/verify-email?token=${verificationToken}`;
  
  const subject = 'Verify Your Email Address - PingJob';
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f7fa; padding: 0; border-radius: 8px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">PingJob</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Verify Your Email</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <p style="margin-top: 0; font-size: 16px; color: #333;">Hi ${recipientName},</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          Welcome to PingJob! Please verify your email address to complete your account setup and unlock all features.
        </p>

        <!-- Verification Link Button -->
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Verify Email Address
          </a>
        </div>

        <!-- OTP Section -->
        <div style="background: #f0f8ff; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #0077b6;">
          <p style="margin-top: 0; font-size: 13px; color: #555; font-weight: 600;">
            Or enter this OTP code on the verification page:
          </p>
          <div style="margin: 15px 0; text-align: center;">
            <span style="font-size: 32px; letter-spacing: 4px; font-weight: 700; color: #0077b6; font-family: 'Courier New', monospace;">
              ${otp}
            </span>
          </div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #777;">
            This code expires in 15 minutes
          </p>
        </div>

        <!-- Fallback Link -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 30px 0;">
          <p style="margin-top: 0; font-size: 13px; color: #777;">
            <strong>Or copy and paste this link in your browser:</strong>
          </p>
          <p style="margin: 10px 0; font-size: 12px; color: #0077b6; word-break: break-all;">
            ${verificationUrl}
          </p>
        </div>

        <!-- Security Notice -->
        <p style="font-size: 12px; color: #999; text-align: center; margin: 30px 0 0 0;">
          If you didn't create this account, please ignore this email. Your account won't be activated until you verify your email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f5f7fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          &copy; 2025 PingJob. All rights reserved.<br>
          <span style="color: #ccc;">|</span> 
          <a href="${getBaseUrl()}" style="color: #0077b6; text-decoration: none; font-size: 12px;">Visit PingJob</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `
Verify Your Email Address

Hi ${recipientName},

Welcome to PingJob! Please verify your email address to complete your account setup.

OTP Code: ${otp}
(This code expires in 15 minutes)

Or click here to verify:
${verificationUrl}

If you didn't create this account, please ignore this email.

---
Copyright 2025 PingJob. All rights reserved.
  `;

  return await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlContent,
    text: textContent,
  });
}

export async function sendJobNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  jobId: number,
  jobTitle: string,
  companyName: string,
  jobLocation: string,
  jobDescription: string,
  categoryName: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  // Generate slug from job title for SEO-friendly URL
  const slug = jobTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  
  const jobUrl = `${baseUrl}/jobs/${jobId}-${slug}`;
  
  const subject = `New ${categoryName} Job: ${jobTitle} at ${companyName}`;
  
  const safeDescription = jobDescription?.trim() || 'Description not provided';
  const descriptionSnippet = safeDescription.length > 200 
    ? safeDescription.substring(0, 200) + '...' 
    : safeDescription;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f7fa; padding: 0; border-radius: 8px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Job Match!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">on PingJob</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <p style="margin-top: 0; font-size: 16px; color: #333;">Hi ${recipientName},</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          A job opportunity matching your profile has been posted on PingJob!
        </p>

        <!-- Job Details -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
          <h3 style="margin: 0 0 10px 0; color: #0077b6; font-size: 18px;">${jobTitle}</h3>
          <p style="margin: 8px 0; color: #666;">
            <strong>Company:</strong> ${companyName}
          </p>
          <p style="margin: 8px 0; color: #666;">
            <strong>Location:</strong> ${jobLocation}
          </p>
          <p style="margin: 8px 0; color: #666;">
            <strong>Category:</strong> ${categoryName}
          </p>
          <p style="margin: 15px 0 8px 0; color: #666;">
            <strong>Description:</strong>
          </p>
          <p style="margin: 8px 0; color: #666; font-size: 14px; line-height: 1.5;">
            ${descriptionSnippet}
          </p>
        </div>

        <!-- View Job Button -->
        <div style="margin: 30px 0; text-align: center;">
          <a href="${jobUrl}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            View Job Details
          </a>
        </div>

        <!-- Security Notice -->
        <p style="font-size: 12px; color: #999; text-align: center; margin: 30px 0 0 0;">
          You received this email because you opted in to job notifications for this category.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f5f7fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          &copy; 2025 PingJob. All rights reserved.<br>
          <span style="color: #ccc;">|</span> 
          <a href="${getBaseUrl()}" style="color: #0077b6; text-decoration: none; font-size: 12px;">Visit PingJob</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `
New Job Match on PingJob!

Hi ${recipientName},

A job opportunity matching your profile has been posted!

Job Title: ${jobTitle}
Company: ${companyName}
Location: ${jobLocation}
Category: ${categoryName}

${descriptionSnippet}

View full details here:
${jobUrl}

---
You received this email because you opted in to job notifications for this category.

Copyright 2025 PingJob. All rights reserved.
  `;

  return await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlContent,
    text: textContent,
  });
}

export async function sendContactEmail(
  senderName: string,
  senderEmail: string,
  subject: string,
  message: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">New Contact Inquiry</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 15px;">From PingJob Contact Page</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px 30px; background: #ffffff;">
        <!-- Sender Info Card -->
        <div style="background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 5px solid #0077b6;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #0077b6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">From Sender</p>
          <p style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a1a; font-weight: 600;">${senderName}</p>
          <p style="margin: 0; font-size: 14px; color: #0077b6;">
            <a href="mailto:${senderEmail}" style="color: #0077b6; text-decoration: none; font-weight: 500;">${senderEmail}</a>
          </p>
        </div>

        <!-- Subject Section -->
        <div style="margin-bottom: 30px;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #0077b6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Subject</p>
          <div style="background: #f5f7fa; padding: 16px 20px; border-radius: 6px; border-left: 4px solid #0077b6;">
            <h2 style="margin: 0; font-size: 18px; color: #1a1a1a; font-weight: 600;">
              ${subject}
            </h2>
          </div>
        </div>

        <!-- Message Section -->
        <div style="margin-bottom: 30px;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #0077b6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 6px; border-left: 4px solid #0077b6;">
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">
              ${message}
            </p>
          </div>
        </div>

        <!-- Metadata -->
        <div style="padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <table style="width: 100%; font-size: 13px; color: #666666;">
            <tr>
              <td style="padding: 8px 0;"><strong>Submitted:</strong></td>
              <td style="text-align: right;">${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Source:</strong></td>
              <td style="text-align: right;">PingJob Contact Form</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f5f7fa; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #666666;">
          <strong>Reply Instructions:</strong> You can reply directly to this email or use the contact form.
        </p>
        <p style="margin: 0; font-size: 12px; color: #999999;">
          &copy; 2025 PingJob. All rights reserved.<br>
          <a href="${baseUrl}" style="color: #0077b6; text-decoration: none; font-weight: 500;">Visit PingJob</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `
NEW CONTACT INQUIRY
==================

From: ${senderName}
Email: ${senderEmail}

Subject: ${subject}

Message:
--------
${message}

--------
Submitted: ${new Date().toLocaleString()}
Source: PingJob Contact Form

This email was sent from the PingJob contact page.
Visit: ${baseUrl}/contact

Copyright 2025 PingJob. All rights reserved.
  `;

  return await sendEmail({
    to: 'pingjobs@gmail.com',
    subject: `[PingJob Contact] ${subject}`,
    html: htmlContent,
    text: textContent,
  });
}

export async function sendInvitationEmail(
  recipientEmail: string,
  recipientName: string,
  inviterName: string,
  acceptLink: string,
  message?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const subject = `${inviterName} invited you to join PingJob`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f7fa; padding: 0; border-radius: 8px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Join PingJob Professional Network</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <p style="margin-top: 0; font-size: 16px; color: #333;">Hi ${recipientName},</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          ${inviterName} has invited you to join PingJob, a professional networking platform where you can connect with professionals and discover job opportunities.
        </p>

        ${message ? `
        <div style="background: #f0f8ff; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #0077b6;">
          <p style="margin-top: 0; font-size: 14px; color: #555;">
            <strong>${inviterName}'s message:</strong>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #666; font-style: italic;">
            "${message}"
          </p>
        </div>
        ` : ''}

        <!-- Accept Button -->
        <div style="margin: 30px 0; text-align: center;">
          <a href="${acceptLink}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #0096c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <!-- Why Join -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
          <p style="margin-top: 0; font-weight: 600; color: #333;">Why join PingJob?</p>
          <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
            <li style="margin: 8px 0;">Connect with professionals in your field</li>
            <li style="margin: 8px 0;">Discover exciting job opportunities</li>
            <li style="margin: 8px 0;">Build your professional network</li>
          </ul>
        </div>

        <!-- Fallback Link -->
        <div style="background: #f0f8ff; padding: 20px; border-radius: 6px; margin: 25px 0;">
          <p style="margin-top: 0; font-size: 13px; color: #777;">
            <strong>Or copy and paste this link in your browser:</strong>
          </p>
          <p style="margin: 10px 0; font-size: 12px; color: #0077b6; word-break: break-all;">
            ${acceptLink}
          </p>
        </div>

        <!-- Expiry Warning -->
        <p style="font-size: 13px; color: #d32f2f; text-align: center; margin: 25px 0 0 0;">
          ⏰ This invitation expires in 7 days
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f5f7fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          Questions? Contact us at support@pingjob.com<br>
          &copy; 2025 PingJob. All rights reserved.<br>
          <span style="color: #ccc;">|</span> 
          <a href="${baseUrl}" style="color: #0077b6; text-decoration: none; font-size: 12px;">Visit PingJob</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `
You're Invited to Join PingJob!

Hi ${recipientName},

${inviterName} has invited you to join PingJob, a professional networking platform where you can connect with professionals, discover job opportunities, and build your career.

${message ? `Message from ${inviterName}:\n"${message}"\n\n` : ''}

Why Join PingJob?
✓ Connect with professionals in your field
✓ Discover exciting job opportunities
✓ Build your professional network

Accept your invitation here:
${acceptLink}

This invitation link expires in 7 days.

Questions? Contact us at support@pingjob.com

---
© 2025 PingJob. All rights reserved.
Visit: ${baseUrl}
  `;

  return await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlContent,
    text: textContent,
  });
}
