/**
 * Force re-upload Unity assets to S3
 * Deletes old files and uploads new ones
 */

import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Create S3 client with region from env
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';
const UNITY_S3_PREFIX = 'unity-assets/';

const UNITY_FILES = {
  'Build.data.gz': 'client/public/unity-avatar/Build/Build.data.gz',
  'Build.wasm.gz': 'client/public/unity-avatar/Build/Build.wasm.gz',
  'Build.framework.js.gz': 'client/public/unity-avatar/Build/Build.framework.js.gz',
};

async function forceReuploadUnityAssets() {
  console.log('[S3 Force Upload] 🚀 Starting force re-upload of Unity assets...');
  console.log('[S3 Force Upload] Bucket:', BUCKET_NAME);

  for (const [s3Key, localPath] of Object.entries(UNITY_FILES)) {
    const fullS3Key = UNITY_S3_PREFIX + s3Key;
    const fullLocalPath = path.resolve(localPath);

    try {
      // Step 1: Delete old file from S3
      console.log(`\n[S3 Force Upload] 🗑️  Deleting old ${s3Key} from S3...`);
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullS3Key,
      });

      await s3Client.send(deleteCommand);
      console.log(`[S3 Force Upload] ✅ Deleted ${fullS3Key}`);

      // Step 2: Upload new file
      console.log(`[S3 Force Upload] ⬆️  Uploading new ${s3Key} to S3...`);

      const fileBuffer = fs.readFileSync(fullLocalPath);
      const fileStats = fs.statSync(fullLocalPath);
      const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);

      console.log(`[S3 Force Upload] 📦 File size: ${fileSizeMB} MB`);

      const contentType = s3Key.endsWith('.gz')
        ? (s3Key.includes('.wasm') ? 'application/wasm' : 'application/javascript')
        : 'application/octet-stream';

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullS3Key,
        Body: fileBuffer,
        ContentType: contentType,
        ContentEncoding: s3Key.endsWith('.gz') ? 'gzip' : undefined,
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await s3Client.send(uploadCommand);
      console.log(`[S3 Force Upload] ✅ Uploaded ${fullS3Key} successfully (${fileSizeMB} MB)`);

    } catch (error: any) {
      console.error(`[S3 Force Upload] ❌ Error processing ${s3Key}:`, error.message);
      throw error;
    }
  }

  console.log('\n[S3 Force Upload] 🎉 All Unity assets re-uploaded successfully!');
  console.log('[S3 Force Upload] New avatar build is now live in S3!');
}

// Run the script
forceReuploadUnityAssets()
  .then(() => {
    console.log('\n[S3 Force Upload] ✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[S3 Force Upload] ❌ Script failed:', error);
    process.exit(1);
  });
