import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5000';

async function createTestImage() {
  const imagePath = path.join('/tmp', 'test-random-photo.jpg');
  const jpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwwDAwwGBAMDAwwNDAxGBEMDAwsNDQwJDAxRDg0OEQ8MDgwPEA8OEA8SDwwP/2wBDAQICAgMDAwwDAwwPDAcIDwwODw8ODw8PDwwPDw8PDw8PDw8PDw8PDw8PDw8PDwwPDw8PDw8PDwwPDw8PDw8P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgADBBEhEhMxQVEikf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJxwocjkgZJwHGQDkgZGM';
  const buffer = Buffer.from(jpegBase64, 'base64');
  fs.writeFileSync(imagePath, buffer);
  return imagePath;
}

async function test() {
  console.log('\n🚀 Testing Random Photo ID System\n');

  try {
    // Create test image
    const testImagePath = await createTestImage();
    console.log('✅ Test image created');

    // Register new user
    const timestamp = Date.now();
    const email = `random-id-test-${timestamp}@pingjob.com`;
    
    console.log(`📝 Registering user: ${email}`);
    const registerRes = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123',
        firstName: 'Random',
        lastName: 'Test',
        userType: 'job_seeker'
      }),
      credentials: 'include'
    });

    if (!registerRes.ok) {
      throw new Error(`Registration failed: ${registerRes.status}`);
    }
    console.log('✅ User registered');

    // Upload first photo
    console.log('📷 Uploading first photo...');
    const formData1 = new FormData();
    const fileBuffer1 = fs.readFileSync(testImagePath);
    const blob1 = new File([fileBuffer1], 'test-photo-1.jpg', { type: 'image/jpeg' });
    formData1.append('photo', blob1);

    const uploadRes1 = await fetch(`${BASE_URL}/api/upload/profile-photo`, {
      method: 'POST',
      body: formData1,
      credentials: 'include'
    });

    if (!uploadRes1.ok) {
      throw new Error(`First upload failed: ${uploadRes1.status}`);
    }

    const uploadData1 = await uploadRes1.json();
    const photoUrl1 = uploadData1.photoUrl;
    console.log(`✅ First photo uploaded: ${photoUrl1}`);

    // Wait a bit to ensure different random ID
    await new Promise(resolve => setTimeout(resolve, 100));

    // Upload second photo (should have different random ID)
    console.log('📷 Uploading second photo...');
    const formData2 = new FormData();
    const fileBuffer2 = fs.readFileSync(testImagePath);
    const blob2 = new File([fileBuffer2], 'test-photo-2.jpg', { type: 'image/jpeg' });
    formData2.append('photo', blob2);

    const uploadRes2 = await fetch(`${BASE_URL}/api/upload/profile-photo`, {
      method: 'POST',
      body: formData2,
      credentials: 'include'
    });

    if (!uploadRes2.ok) {
      throw new Error(`Second upload failed: ${uploadRes2.status}`);
    }

    const uploadData2 = await uploadRes2.json();
    const photoUrl2 = uploadData2.photoUrl;
    console.log(`✅ Second photo uploaded: ${photoUrl2}`);

    // Check that the URLs are different
    if (photoUrl1 === photoUrl2) {
      throw new Error('❌ URLs are the same! Random ID system failed');
    }
    console.log('✅ URLs are different (random ID working!)');

    // Verify both files exist
    const fileName1 = photoUrl1.split('/').pop();
    const fileName2 = photoUrl2.split('/').pop();
    
    const filePath1 = path.join(process.cwd(), 'client', 'public', 'profiles', fileName1);
    const filePath2 = path.join(process.cwd(), 'client', 'public', 'profiles', fileName2);

    if (!fs.existsSync(filePath1)) throw new Error(`File 1 not found: ${filePath1}`);
    if (!fs.existsSync(filePath2)) throw new Error(`File 2 not found: ${filePath2}`);

    console.log(`✅ Both files exist on disk`);
    console.log(`   File 1: ${filePath1}`);
    console.log(`   File 2: ${filePath2}`);

    // Show file listings
    console.log('\n📁 All profile photos on disk:');
    const profilesDir = path.join(process.cwd(), 'client', 'public', 'profiles');
    const files = fs.readdirSync(profilesDir);
    files.forEach(f => {
      const stats = fs.statSync(path.join(profilesDir, f));
      console.log(`   - ${f} (${stats.size} bytes)`);
    });

    console.log('\n✅ Random photo ID system working perfectly!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
