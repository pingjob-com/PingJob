# PingJob - Complete End-to-End Testing Guide

## 1. AUTHENTICATION FLOWS

### 1.1 Email Signup (Job Seeker)
- [ ] Navigate to signup page
- [ ] Enter valid email, password, confirm password
- [ ] Select "Job Seeker" as user type
- [ ] Click submit
- [ ] Verify redirect to dashboard
- [ ] Verify session is persisted (refresh page, user still logged in)

### 1.2 Email Signup (Recruiter)
- [ ] Navigate to signup page
- [ ] Enter valid email, password, confirm password
- [ ] Select "Recruiter" as user type
- [ ] Click submit
- [ ] Verify redirect to recruiter dashboard
- [ ] Verify recruiter-specific features are visible

### 1.3 Email Signup (Admin)
- [ ] Contact admin to create account or verify admin setup
- [ ] Login as admin
- [ ] Verify admin dashboard with all management options

### 1.4 Email Login
- [ ] Logout from current session
- [ ] Go to login page
- [ ] Enter registered email and password
- [ ] Click login
- [ ] Verify redirect to appropriate dashboard (job seeker/recruiter/admin)

### 1.5 Google OAuth Login
- [ ] On signup/login page, click "Sign in with Google"
- [ ] Complete Google authentication flow
- [ ] Verify account is created/linked
- [ ] Verify redirect to dashboard with session persisted

### 1.6 Password Reset
- [ ] On login page, click "Forgot Password?"
- [ ] Enter registered email
- [ ] Verify email is sent (check email or logs)
- [ ] Click reset link in email
- [ ] Enter new password and confirm
- [ ] Verify can login with new password

---

## 2. JOB SEEKER FLOWS

### 2.1 Browse Jobs
- [ ] Navigate to /jobs
- [ ] Verify job list loads with company logos
- [ ] Verify pagination works (next/previous)
- [ ] Verify job count is accurate
- [ ] Click on a job to view details

### 2.2 View Job Details
- [ ] Click "View Details" on any job
- [ ] Verify job title, company name, location, salary displayed
- [ ] Verify job description, requirements, benefits visible
- [ ] Verify related jobs section shows relevant positions
- [ ] Verify "Apply Now" button is visible

### 2.3 Search Jobs by Category
- [ ] Navigate to /categories or browse category list
- [ ] Click on a category (e.g., Java, Python, etc.)
- [ ] Verify jobs are filtered to selected category
- [ ] Verify category name is displayed as page title
- [ ] Try different categories

### 2.4 Search Jobs by Keyword
- [ ] In header search bar, enter a keyword (e.g., "Developer")
- [ ] Press Enter or click search
- [ ] Verify results are filtered by keyword
- [ ] Verify search results show relevant jobs

### 2.5 Apply for Job (Logged In)
- [ ] Navigate to a job detail page
- [ ] Click "Apply Now"
- [ ] Modal appears with application form
- [ ] Upload resume (if required)
- [ ] Optionally add cover letter
- [ ] Click submit
- [ ] Verify success message
- [ ] Verify application is recorded in database

### 2.6 Apply for Job (Not Logged In)
- [ ] Logout first
- [ ] Navigate to a job detail page
- [ ] Click "Apply Now"
- [ ] Verify redirected to login page with job context preserved
- [ ] Complete login/signup
- [ ] Verify redirected back to job page
- [ ] Verify "Apply Now" modal auto-opens
- [ ] Complete application flow

### 2.7 View Profile
- [ ] Go to profile page (/profile or user menu)
- [ ] Verify personal information displayed: email, name, phone
- [ ] Verify resume upload section
- [ ] Verify skills section
- [ ] Verify education and experience sections
- [ ] Test editing profile information

### 2.8 Update Profile
- [ ] Edit profile fields (name, phone, etc.)
- [ ] Click save
- [ ] Verify changes are persisted
- [ ] Refresh page and verify changes are still there

### 2.9 Upload/Update Resume
- [ ] Go to profile page
- [ ] Click upload resume button
- [ ] Select a PDF or DOC file
- [ ] Verify file uploads successfully
- [ ] Verify resume URL is stored
- [ ] Test downloading/viewing resume

### 2.10 View Applications
- [ ] Navigate to applications section
- [ ] Verify list of jobs user has applied to
- [ ] Verify application status (pending, reviewed, rejected, etc.)
- [ ] Verify application date is displayed

---

## 3. RECRUITER FLOWS

### 3.1 Login as Recruiter
- [ ] Signup/login as recruiter
- [ ] Verify redirected to recruiter dashboard
- [ ] Verify recruiter-specific menu options

### 3.2 Create Job Posting
- [ ] Click "Post New Job" or similar button
- [ ] Fill job form: title, description, location, salary, category, requirements
- [ ] Select employment type
- [ ] Add benefits
- [ ] Click submit
- [ ] Verify job appears in active jobs list
- [ ] Verify job is live and searchable

### 3.3 Edit Job Posting
- [ ] Go to jobs list
- [ ] Click edit on a job
- [ ] Modify job details
- [ ] Click save
- [ ] Verify changes are persisted

### 3.4 View Job Applications
- [ ] Click on a job posting
- [ ] View all applications for that job
- [ ] Verify applicant name, resume, application date
- [ ] Verify match score if applicable

### 3.5 Manage Candidates
- [ ] View candidate list from dashboard
- [ ] Click on candidate profile
- [ ] Verify can view candidate resume
- [ ] Verify can view application history

### 3.6 Delete Job Posting
- [ ] Go to jobs list
- [ ] Click delete on a job
- [ ] Confirm deletion
- [ ] Verify job is no longer visible

---

## 4. ADMIN FLOWS

### 4.1 Admin Dashboard Access
- [ ] Login as admin
- [ ] Verify access to admin dashboard at /admin
- [ ] Verify admin-specific menu options

### 4.2 Manage Users
- [ ] Navigate to users management section
- [ ] Verify user list with filters
- [ ] Click on user to view details
- [ ] Verify can view user profile, role, registration date
- [ ] Test user search functionality

### 4.3 Approve Companies
- [ ] Navigate to companies pending approval
- [ ] Verify list of unapproved companies
- [ ] Click approve on a company
- [ ] Verify company status changes to approved
- [ ] Verify company now appears in public company list

### 4.4 Manage Jobs
- [ ] Navigate to job management section
- [ ] Verify list of all jobs (active/inactive)
- [ ] Test filtering and search
- [ ] Click on job to view/edit details
- [ ] Test activating/deactivating jobs

### 4.5 View Analytics
- [ ] Navigate to analytics dashboard
- [ ] Verify traffic stats displayed
- [ ] Verify user signup trends
- [ ] Verify job posting trends
- [ ] Verify application trends

### 4.6 Manual Candidate Assignment
- [ ] Navigate to manual assignment section
- [ ] Select a job
- [ ] Select candidates to assign
- [ ] Click assign
- [ ] Verify assignment is recorded

---

## 5. COMPANY MANAGEMENT

### 5.1 Create Company Profile
- [ ] Navigate to company creation page
- [ ] Enter company name, industry, location, description
- [ ] Upload company logo
- [ ] Click submit
- [ ] Verify company requires admin approval (if applicable)
- [ ] Verify company appears in pending list

### 5.2 Upload Company Logo
- [ ] Go to company profile
- [ ] Click upload logo
- [ ] Select image file (PNG, JPG, etc.)
- [ ] Verify logo uploads successfully
- [ ] Verify logo appears in job listings
- [ ] Verify logo appears in company profile

### 5.3 Edit Company Profile
- [ ] Go to company profile
- [ ] Edit company information
- [ ] Click save
- [ ] Verify changes are persisted
- [ ] Refresh page to confirm persistence

### 5.4 View Company Public Profile
- [ ] Navigate to /companies
- [ ] Search for company
- [ ] Click on company name
- [ ] Verify company details displayed: name, logo, industry, location, description
- [ ] Verify company jobs are listed

---

## 6. SEARCH & FILTERING

### 6.1 Category-Based Search
- [ ] Navigate to /categories
- [ ] Click on category
- [ ] Verify jobs are filtered to category
- [ ] Verify job count matches category
- [ ] Test multiple categories

### 6.2 Keyword Search
- [ ] Use header search bar
- [ ] Enter keyword (e.g., "Python Developer")
- [ ] Verify results are relevant
- [ ] Verify search works on both logged-in and logged-out states

### 6.3 Location-Based Filtering
- [ ] On jobs page, filter by location (if available)
- [ ] Verify jobs are filtered by location
- [ ] Test multiple locations

### 6.4 Salary Range Filtering
- [ ] On jobs page, filter by salary range (if available)
- [ ] Verify jobs match salary criteria
- [ ] Test different ranges

---

## 7. RESUME PARSING & SCORING

### 7.1 Upload Resume
- [ ] Upload resume in job application
- [ ] Verify resume is parsed
- [ ] Verify skills are extracted from resume
- [ ] Verify parsed data is stored

### 7.2 Job-Resume Matching
- [ ] Apply for job with resume
- [ ] Verify match score is calculated
- [ ] Verify score is based on skills match
- [ ] Verify recruiter can see score

### 7.3 Auto-Scoring
- [ ] As recruiter, view applications
- [ ] Verify all applications have match scores
- [ ] Verify scores are between 0-100

---

## 8. EMAIL NOTIFICATIONS

### 8.1 New Job Notification
- [ ] Create job posting
- [ ] Verify email is sent to matching job seekers
- [ ] Check email content includes: job title, company, location, salary
- [ ] Verify email has link to job

### 8.2 Application Confirmation
- [ ] Apply for job
- [ ] Verify confirmation email is sent
- [ ] Verify email includes application details

### 8.3 Password Reset Email
- [ ] Request password reset
- [ ] Verify reset email is sent
- [ ] Verify email has valid reset link

---

## 9. SOCIAL MEDIA INTEGRATION

### 9.1 Facebook Auto-Posting
- [ ] As recruiter, create new job
- [ ] Verify job is automatically posted to Facebook page
- [ ] Verify post contains: job title, company, location, description
- [ ] Verify post has link to job on platform

### 9.2 Manual Social Share
- [ ] On job detail page, click share button
- [ ] Verify social share options (Facebook, LinkedIn, etc.)
- [ ] Test sharing to social media

---

## 10. MOBILE RESPONSIVENESS

### 10.1 Mobile Layout (Job Seeker)
- [ ] Open app on mobile device or mobile browser view
- [ ] Verify layout is responsive
- [ ] Verify all buttons are clickable
- [ ] Verify text is readable (no overflow)
- [ ] Test navigation menu
- [ ] Verify job list scrolls smoothly
- [ ] Test job application flow on mobile

### 10.2 Mobile Layout (Recruiter)
- [ ] Open recruiter dashboard on mobile
- [ ] Verify dashboard is readable on small screen
- [ ] Verify can access job management on mobile
- [ ] Test creating job on mobile

### 10.3 Native Mobile App (if applicable)
- [ ] Install mobile app
- [ ] Verify app loads correctly
- [ ] Test Google AdMob ads display
- [ ] Verify all features work same as web

---

## 11. PAYMENT & MONETIZATION

### 11.1 Stripe Integration
- [ ] If payment feature exists, test payment flow
- [ ] Enter test card details
- [ ] Verify payment processes
- [ ] Verify order confirmation

### 11.2 Google AdSense (Web)
- [ ] Verify ads display on website
- [ ] Verify ad placement is appropriate
- [ ] Verify ads don't break layout

### 11.3 Google AdMob (Mobile)
- [ ] Open mobile app
- [ ] Verify banner ads display
- [ ] Verify interstitial ads display
- [ ] Verify rewarded ads work

---

## 12. SECURITY TESTING

### 12.1 Password Security
- [ ] Test weak password rejection
- [ ] Verify password is hashed (never stored in plain text)
- [ ] Test password reset flow

### 12.2 Session Security
- [ ] Logout and verify session is cleared
- [ ] Test browser back button doesn't access protected pages
- [ ] Verify cookies are secure

### 12.3 Input Validation
- [ ] Try SQL injection in search box (e.g., "'; DROP TABLE--")
- [ ] Verify injection attempts are sanitized
- [ ] Try XSS attacks in form fields
- [ ] Verify malicious input is escaped

### 12.4 Authentication Required Pages
- [ ] Try accessing /admin without login
- [ ] Try accessing /profile without login
- [ ] Try accessing recruiter pages as job seeker
- [ ] Verify appropriate redirects/403 errors

---

## 13. DATA PERSISTENCE

### 13.1 Job Data
- [ ] Create/edit/delete job
- [ ] Refresh page and verify data persists
- [ ] Close browser and reopen
- [ ] Verify job data is still there

### 13.2 User Data
- [ ] Update profile information
- [ ] Verify data persists after refresh
- [ ] Verify data persists after logout/login

### 13.3 Application Data
- [ ] Submit job application
- [ ] Verify application appears in recruiter view
- [ ] Verify application persists after refresh
- [ ] Logout and verify application is still there when logged back in

---

## 14. PERFORMANCE

### 14.1 Page Load Speed
- [ ] Measure homepage load time (should be < 3 seconds)
- [ ] Measure /jobs page load time
- [ ] Measure job detail page load time
- [ ] Verify no broken images (404s)

### 14.2 Database Query Performance
- [ ] Load jobs page with 200+ jobs
- [ ] Verify page loads smoothly
- [ ] Verify pagination works correctly

### 14.3 File Upload Performance
- [ ] Upload 5MB file
- [ ] Verify upload completes within reasonable time (< 10 seconds)

---

## 15. EDGE CASES

### 15.1 Empty States
- [ ] Browse jobs when no jobs exist
- [ ] View applications when no applications exist
- [ ] View companies when no companies exist
- [ ] Verify appropriate "no results" message

### 15.2 Invalid Data
- [ ] Try applying to non-existent job ID (e.g., /jobs/99999)
- [ ] Verify 404 error handling
- [ ] Try accessing user with invalid ID
- [ ] Verify error message is user-friendly

### 15.3 Concurrent Operations
- [ ] Open two browser tabs with same user
- [ ] Make edits in both tabs
- [ ] Verify data consistency
- [ ] Verify no data corruption

### 15.4 Rate Limiting
- [ ] Try uploading file 11 times rapidly
- [ ] Verify rate limit is enforced (after 10 uploads)
- [ ] Verify appropriate error message

---

## 16. SEO & BOT DETECTION

### 16.1 Meta Tags
- [ ] Check homepage has proper title and meta description
- [ ] Check job detail pages have unique titles
- [ ] Verify Open Graph tags for social sharing
- [ ] Use browser DevTools to verify meta tags

### 16.2 Bot Detection
- [ ] Verify Google crawlers receive static HTML (SEO content)
- [ ] Verify regular users receive React app
- [ ] Check /robots.txt is accessible
- [ ] Check /sitemap.xml is accessible

### 16.3 Schema Markup
- [ ] Verify job schema markup is present
- [ ] Verify company schema markup is present
- [ ] Use Google's Structured Data Testing Tool

---

## 17. CRITICAL BUG CHECKS

- [ ] No console errors when navigating pages
- [ ] No network errors (404, 500) on critical requests
- [ ] No memory leaks (browser DevTools)
- [ ] Database connections remain stable
- [ ] No SQL errors in server logs

---

## 18. FINAL CHECKLIST

- [ ] All features work as documented
- [ ] No critical bugs found
- [ ] UI is responsive on all screen sizes
- [ ] Performance is acceptable
- [ ] Security practices are followed
- [ ] Data persistence is reliable
- [ ] Error handling is appropriate
- [ ] User flows are intuitive
- [ ] Application is ready for production
