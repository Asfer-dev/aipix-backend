// src/lib/s3.ts
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME as string;

if (!S3_BUCKET_NAME) {
  console.warn(
    "[S3] S3_BUCKET_NAME is not set. Uploads will fail until this is configured."
  );
}

export const s3Client = new S3Client({
  region: AWS_REGION,
  // if you use AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env,
  // the default credential provider chain will pick them up
});

export async function uploadBufferToS3(params: {
  key: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const { key, buffer, contentType } = params;

  if (!S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME_NOT_CONFIGURED");
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // for a demo / student project, this is fine.
    // In a stricter environment, use bucket policy instead of per-object ACL.
    // ACL: "public-read",
  });

  await s3Client.send(command);

  const url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  return url;
}
