#!/usr/bin/env node

/**
 * End-to-End Authentication Test
 * Tests company and job creation for Admin, Recruiter, and Enterprise users
 */

import http from 'http';
import { URL } from 'url';

const BASE_URL = 'http://localhost:5000';

// Test user data
const testUsers = {
  admin: {
    email: 'test-admin-' + Date.now() + '@pingjob.com',
    password: 'AdminTest123!',
    userType: 'admin',
    firstName: 'Test',
    lastName: 'Admin'
  },
  recruiter: {
    email: 'test-recruiter-' + Date.now() + '@pingjob.com',
    password: 'RecruiterTest123!',
    userType: 'recruiter',
    firstName: 'Test',
    lastName: 'Recruiter',
    subscriptionPlan: 'recruiter'
  },
  enterprise: {
    email: 'test-enterprise-' + Date.now() + '@pingjob.com',
    password: 'EnterpriseTest123!',
    userType: 'client',
    firstName: 'Test',
    lastName: 'Enterprise',
    subscriptionPlan: 'enterprise'
  }
};

// Test companies data
const testCompanies = {
  admin: {
    name: 'Admin Test Company ' + Date.now(),
    industry: 'Technology',
    website: 'https://admin-test.com',
    description: 'Test company created by admin'
  },
  recruiter: {
    name: 'Recruiter Test Company ' + Date.now(),
    industry: 'Finance',
    website: 'https://recruiter-test.com',
    description: 'Test company created by recruiter'
  },
  enterprise: {
    name: 'Enterprise Test Company ' + Date.now(),
    industry: 'Healthcare',
    website: 'https://enterprise-test.com',
    description: 'Test company created by enterprise'
  }
};

// Test jobs data
const testJobs = {
  admin: {
    title: 'Senior Developer - Admin',
    description: 'Job posted by admin user',
    requirements: 'React, Node.js, PostgreSQL',
    employmentType: 'full_time',
    experienceLevel: 'senior',
    country: 'United States',
    state: 'California',
    city: 'San Francisco'
  },
  recruiter: {
    title: 'Full Stack Engineer - Recruiter',
    description: 'Job posted by recruiter user',
    requirements: 'JavaScript, TypeScript, AWS',
    employmentType: 'full_time',
    experienceLevel: 'mid',
    country: 'United States',
    state: 'New York',
    city: 'New York'
  },
  enterprise: {
    title: 'Data Scientist - Enterprise',
    description: 'Job posted by enterprise user',
    requirements: 'Python, Machine Learning, SQL',
    employmentType: 'full_time',
    experienceLevel: 'senior',
    country: 'United States',
    state: 'Texas',
    city: 'Austin'
  }
};

// Utility function to make HTTP requests
function makeRequest(method, path, body = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: { raw: data }
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Extract cookies from response
function extractCookies(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  
  if (Array.isArray(setCookie)) {
    return setCookie.map(c => c.split(';')[0]).join('; ');
  }
  return setCookie.split(';')[0];
}

// Test flow for a user type
async function testUserFlow(userType) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${userType.toUpperCase()} User Flow`);
  console.log('='.repeat(60));

  const user = testUsers[userType];
  const company = testCompanies[userType];
  const job = testJobs[userType];

  try {
    // Step 1: Register user
    console.log(`\n1️⃣ Registering ${userType} user...`);
    const registerRes = await makeRequest('POST', '/api/register', {
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      subscriptionPlan: user.subscriptionPlan || 'free'
    });

    if (registerRes.status >= 400) {
      if (registerRes.status === 409 || registerRes.body?.message?.includes('already')) {
        console.log(`   ⚠️  User already exists (${registerRes.body?.message || 'duplicate'})`);
      } else {
        console.error(`   ❌ Registration failed (${registerRes.status}): ${registerRes.body?.message}`);
        return false;
      }
    } else {
      console.log(`   ✅ User registered successfully`);
    }

    // Step 2: Login
    console.log(`\n2️⃣ Logging in ${userType} user...`);
    const loginRes = await makeRequest('POST', '/api/login', {
      email: user.email,
      password: user.password
    });

    if (loginRes.status !== 200) {
      console.error(`   ❌ Login failed (${loginRes.status}): ${loginRes.body?.message}`);
      return false;
    }

    const cookies = extractCookies(loginRes.headers);
    console.log(`   ✅ Login successful`);

    // Step 3: Create company
    console.log(`\n3️⃣ Creating company for ${userType} user...`);
    const companyRes = await makeRequest('POST', '/api/companies', {
      ...company,
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      zipCode: '94105'
    }, cookies);

    if (companyRes.status !== 200) {
      console.error(`   ❌ Company creation failed (${companyRes.status}): ${companyRes.body?.message}`);
      return false;
    }

    const companyId = companyRes.body?.id;
    console.log(`   ✅ Company created successfully (ID: ${companyId})`);

    // Step 4: Create job
    console.log(`\n4️⃣ Creating job for ${userType} user...`);
    const jobRes = await makeRequest('POST', '/api/jobs', {
      ...job,
      companyId: companyId,
      categoryId: 29 // Software Development category
    }, cookies);

    if (jobRes.status !== 200) {
      console.error(`   ❌ Job creation failed (${jobRes.status}): ${jobRes.body?.message}`);
      return false;
    }

    const jobId = jobRes.body?.id;
    console.log(`   ✅ Job created successfully (ID: ${jobId})`);

    // Step 5: Verify job
    console.log(`\n5️⃣ Verifying job creation...`);
    const jobDetailsRes = await makeRequest('GET', `/api/jobs/${jobId}`, null, cookies);

    if (jobDetailsRes.status === 200) {
      const jobData = jobDetailsRes.body;
      console.log(`   ✅ Job verified`);
      console.log(`      Title: ${jobData?.title}`);
      console.log(`      Company ID: ${jobData?.companyId}`);
    }

    console.log(`\n✅ ${userType.toUpperCase()} user flow completed successfully!\n`);
    return true;

  } catch (error) {
    console.error(`\n❌ Error testing ${userType} user:`, error.message);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PINGJOB END-TO-END AUTHENTICATION TEST');
  console.log('='.repeat(60));
  console.log('\nTesting: Admin, Recruiter, and Enterprise user flows');
  console.log('Features: User Registration, Login, Company Creation, Job Creation\n');

  const results = {};
  
  for (const userType of ['admin', 'recruiter', 'enterprise']) {
    results[userType] = await testUserFlow(userType);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  let allPassed = true;
  for (const [userType, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${userType.toUpperCase()} User Flow`);
    if (!passed) allPassed = false;
  }

  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED\n');
    process.exit(1);
  }
}

// Run tests with error handling
runAllTests().catch((error) => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
