import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

/**
 * S3 Configuration
 * Files are uploaded to S3 and served via CloudFront CDN
 * Local copies are kept in Replit for rollback capability
 */

// Log AWS configuration on startup
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET || "pingjob";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "cdn.pingjob.com";

console.log(`🔐 S3 Configuration on startup:`);
console.log(`   AWS_REGION: ${AWS_REGION}`);
console.log(`   AWS_S3_BUCKET: ${S3_BUCKET}`);
console.log(`   CLOUDFRONT_DOMAIN: ${CLOUDFRONT_DOMAIN}`);
console.log(`   AWS_ACCESS_KEY_ID exists: ${!!AWS_ACCESS_KEY}`);
console.log(`   AWS_SECRET_ACCESS_KEY exists: ${!!AWS_SECRET_KEY}`);
if (AWS_ACCESS_KEY && AWS_ACCESS_KEY.length > 5) {
  console.log(`   AWS_ACCESS_KEY_ID starts with: ${AWS_ACCESS_KEY.substring(0, 10)}...`);
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

export interface S3UploadResult {
  success: boolean;
  s3Url?: string;
  cdnUrl?: string;
  error?: string;
}

/**
 * Upload file to S3
 * @param fileBuffer - Buffer of the file to upload
 * @param s3Path - Path in S3 (e.g., /logos/company.png, /profiles/uuid.jpg, /resumes/uuid.pdf)
 * @param contentType - MIME type of the file
 * @returns S3UploadResult with CDN URL
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  s3Path: string,
  contentType: string
): Promise<S3UploadResult> {
  try {
    // Ensure path starts with /
    const normalizedPath = s3Path.startsWith("/") ? s3Path.slice(1) : s3Path;

    // Verify credentials exist before attempting upload
    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
      const errorMsg = `❌ AWS credentials missing: ACCESS_KEY=${!!AWS_ACCESS_KEY}, SECRET_KEY=${!!AWS_SECRET_KEY}`;
      console.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.log(`📤 Uploading to S3: ${s3Path} (${fileBuffer.length} bytes, ${contentType})`);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: normalizedPath,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: "public-read", // Make file publicly readable
    });

    await s3Client.send(command);

    // Generate CDN URL
    const cdnUrl = `https://${CLOUDFRONT_DOMAIN}/${normalizedPath}`;
    const s3Url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${normalizedPath}`;

    console.log(`✅ S3 Upload Success: ${s3Path} → ${cdnUrl}`);

    return {
      success: true,
      s3Url,
      cdnUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ S3 Upload Error for ${s3Path}:`, {
      message: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      bucket: S3_BUCKET,
      region: AWS_REGION,
      credentialsSet: !!(AWS_ACCESS_KEY && AWS_SECRET_KEY)
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Delete file from S3
 * @param s3Path - Path in S3 to delete
 */
export async function deleteFromS3(s3Path: string): Promise<boolean> {
  try {
    const normalizedPath = s3Path.startsWith("/") ? s3Path.slice(1) : s3Path;

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: normalizedPath,
    });

    await s3Client.send(command);
    console.log(`✅ S3 Delete Success: ${s3Path}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ S3 Delete Error for ${s3Path}:`, errorMessage);
    return false;
  }
}

/**
 * Convert file path to CDN URL
 * @param fileType - Type of file (logos, profiles, resumes)
 * @param filename - Filename (e.g., company.png, uuid.jpg, uuid.pdf)
 * @returns CDN URL
 */
export function getCdnUrl(fileType: "logos" | "profiles" | "resumes", filename: string): string {
  return `https://${CLOUDFRONT_DOMAIN}/${fileType}/${filename}`;
}

/**
 * Get S3 path from file type and filename
 */
export function getS3Path(fileType: "logos" | "profiles" | "resumes", filename: string): string {
  return `/${fileType}/${filename}`;
}
