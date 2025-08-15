import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const s3 = new S3Client({ region: "ap-southeast-2" });
const BUCKET_NAME = "lazy-vocabulary-app";

async function uploadFile(filePath, key) {
  const content = readFileSync(filePath);
  const contentType = getContentType(key);
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: contentType,
    ACL: "public-read"
  }));
  
  console.log(`Uploaded: ${key}`);
}

function getContentType(filename) {
  if (filename.endsWith('.html')) return 'text/html';
  if (filename.endsWith('.css')) return 'text/css';
  if (filename.endsWith('.js')) return 'application/javascript';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg')) return 'image/jpeg';
  return 'application/octet-stream';
}

async function uploadDirectory(dirPath, prefix = '') {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = join(dirPath, item);
    const key = prefix ? `${prefix}/${item}` : item;
    
    if (statSync(fullPath).isDirectory()) {
      await uploadDirectory(fullPath, key);
    } else {
      await uploadFile(fullPath, key);
    }
  }
}

// Deploy dist folder
uploadDirectory('./dist').catch(console.error);