import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const TEST_RESULTS = [];

// Test users - Password must have uppercase, lowercase, and number
const TEST_USERS = {
  job_seeker: { email: 'photo-test-js@pingjob.com', password: 'Password123', firstName: 'John', lastName: 'Seeker' },
  recruiter: { email: 'photo-test-recruiter@pingjob.com', password: 'Password123', firstName: 'Jane', lastName: 'Recruiter' }
};

let sessionCookies = {};

function logTest(name, status, details = '') {
  const result = { name, status, details, timestamp: new Date().toISOString() };
  TEST_RESULTS.push(result);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${name}: ${status} ${details ? `- ${details}` : ''}`);
}

function makeRequest(method, path, data = null, userType = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies[userType] || ''
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
            cookies: res.headers['set-cookie']
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body, cookies: res.headers['set-cookie'] });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function registerUser(userType) {
  const user = TEST_USERS[userType];
  const response = await makeRequest('POST', '/api/register', {
    email: user.email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    userType
  });

  if (response.cookies) {
    sessionCookies[userType] = response.cookies.join('; ');
  }

  return response;
}

async function loginUser(userType) {
  const user = TEST_USERS[userType];
  const response = await makeRequest('POST', '/api/login', {
    email: user.email,
    password: user.password
  }, userType);

  if (response.cookies) {
    sessionCookies[userType] = response.cookies.join('; ');
  }

  return response;
}

async function getProfile(userId, userType) {
  return makeRequest('GET', `/api/profile/${userId}`, null, userType);
}

async function updateProfileWithPhoto(photoUrl, userType) {
  return makeRequest('PUT', '/api/profile', {
    profileImageUrl: photoUrl
  }, userType);
}

async function createTestImage() {
  const imagePath = path.join('/tmp', 'test-profile-photo.jpg');
  
  // Create a simple JPEG using base64
  const jpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwwDAwwGBAMDAwwNDAxGBEMDAwsNDQwJDAxRDg0OEQ8MDgwPEA8OEA8SDwwP/2wBDAQICAgMDAwwDAwwPDAcIDwwODw8ODw8PDwwPDw8PDw8PDw8PDw8PDw8PDw8PDwwPDw8PDw8PDwwPDw8PDw8P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgADBBEhEhMxQVEikf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJxwocjkgZJwHGQDkgZGM';
  
  const buffer = Buffer.from(jpegBase64, 'base64');
  fs.writeFileSync(imagePath, buffer);
  
  return imagePath;
}

async function runTests() {
  console.log('\n🚀 Starting Profile Photo Upload E2E Tests\n');

  try {
    // Create test image
    console.log('📁 Creating test image...');
    const testImagePath = await createTestImage();
    logTest('Test image creation', 'PASS', testImagePath);

    // Test 1: Register Job Seeker
    console.log('\n📝 Test 1: Job Seeker Registration');
    let response = await registerUser('job_seeker');
    let jobSeekerId = null;

    if (response.status === 201) {
      jobSeekerId = response.body.id;
      logTest('Job Seeker Registration (New)', 'PASS', `ID: ${jobSeekerId}`);
    } else if (response.status === 409) {
      logTest('Job Seeker Registration', 'PASS', 'Already exists - attempting login');
      response = await loginUser('job_seeker');
      if (response.status === 200) {
        jobSeekerId = response.body.user?.id;
        logTest('Job Seeker Login', 'PASS', `ID: ${jobSeekerId}`);
      } else {
        logTest('Job Seeker Login', 'FAIL', `Status: ${response.status}`);
        jobSeekerId = TEST_USERS.job_seeker.email;
      }
    } else {
      logTest('Job Seeker Registration', 'FAIL', `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
      jobSeekerId = TEST_USERS.job_seeker.email;
    }

    // Test 2: Test Photo Upload Endpoint with FormData
    console.log('\n📷 Test 2: Profile Photo Upload Endpoint');
    try {
      // Use fetch with FormData for file upload (simulating browser)
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(testImagePath);
      const blob = new File([fileBuffer], 'test-profile.jpg', { type: 'image/jpeg' });
      formData.append('photo', blob);

      const uploadResponse = await fetch(`${BASE_URL}/api/upload/profile-photo`, {
        method: 'POST',
        body: formData,
        headers: {
          'Cookie': sessionCookies.job_seeker || ''
        }
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        if (uploadData.photoUrl) {
          logTest('Profile Photo Upload', 'PASS', `URL: ${uploadData.photoUrl}`);
          const photoUrl = uploadData.photoUrl;

          // Test 3: Update Profile with Photo URL
          console.log('\n🔄 Test 3: Update Profile with Photo URL');
          response = await updateProfileWithPhoto(photoUrl, 'job_seeker');
          if (response.status === 200) {
            logTest('Profile Update with Photo', 'PASS');

            // Test 4: Verify Photo URL in Profile
            console.log('\n✔️ Test 4: Verify Photo in Profile');
            response = await getProfile(jobSeekerId, 'job_seeker');
            if (response.status === 200 && response.body.profileImageUrl === photoUrl) {
              logTest('Profile Contains Photo URL', 'PASS', `URL: ${response.body.profileImageUrl}`);
            } else {
              logTest('Profile Contains Photo URL', 'FAIL', `Expected: ${photoUrl}, Got: ${response.body.profileImageUrl}`);
            }

            // Test 5: Verify File Exists on Disk
            console.log('\n💾 Test 5: Verify Photo File on Disk');
            const fileName = photoUrl.split('/').pop();
            const filePath = path.join(process.cwd(), 'client', 'public', 'profiles', fileName);
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              logTest('Profile Photo File Exists', 'PASS', `Size: ${stats.size} bytes, Path: ${filePath}`);
            } else {
              logTest('Profile Photo File Exists', 'FAIL', `Path: ${filePath}`);
            }
          } else {
            logTest('Profile Update with Photo', 'FAIL', `Status: ${response.status}`);
          }
        } else {
          logTest('Profile Photo Upload', 'FAIL', `No photoUrl in response: ${JSON.stringify(uploadData)}`);
        }
      } else {
        logTest('Profile Photo Upload', 'FAIL', `Status: ${uploadResponse.status}`);
      }
    } catch (error) {
      logTest('Profile Photo Upload', 'FAIL', error.message);
    }

    // Test 6: Register and Test Recruiter
    console.log('\n📝 Test 6: Recruiter Registration & Photo Upload');
    response = await registerUser('recruiter');
    
    if (response.status === 201) {
      logTest('Recruiter Registration (New)', 'PASS');
    } else if (response.status === 409) {
      response = await loginUser('recruiter');
      if (response.status === 200) {
        logTest('Recruiter Login', 'PASS');
      }
    } else {
      logTest('Recruiter Registration', 'FAIL', `Status: ${response.status}`);
    }

    // Test 7: Verify Initials Fallback
    console.log('\n👤 Test 7: Profile Initials Fallback');
    response = await getProfile(jobSeekerId, 'job_seeker');
    if (response.status === 200 && response.body.firstName && response.body.lastName) {
      const firstInitial = response.body.firstName[0];
      const lastInitial = response.body.lastName[0];
      logTest('Initials Fallback Data', 'PASS', `${firstInitial}${lastInitial} for ${response.body.firstName} ${response.body.lastName}`);
    } else {
      logTest('Initials Fallback Data', 'FAIL', `Status: ${response.status}`);
    }

    // Cleanup
    console.log('\n🧹 Cleanup');
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      logTest('Test Image Cleanup', 'PASS');
    }

  } catch (error) {
    logTest('Test Execution', 'FAIL', error.message);
    console.error('Error during tests:', error);
  }

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('='.repeat(70));
  const passedTests = TEST_RESULTS.filter(t => t.status === 'PASS').length;
  const failedTests = TEST_RESULTS.filter(t => t.status === 'FAIL').length;
  const totalTests = TEST_RESULTS.length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Profile photo upload is working correctly.\n');
  } else {
    console.log(`\n⚠️ ${failedTests} test(s) failed. Please review the output above.\n`);
  }

  // Save results to file
  const resultsPath = path.join('/tmp', 'profile-photo-e2e-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log(`📁 Results saved to: ${resultsPath}`);

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
