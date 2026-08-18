import "server-only";
import { Client } from "minio";

const BUCKET = process.env.MINIO_BUCKET_EVIDENCES || "eccox-atlas-evidencias";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} nao definida. Copie .env.example para .env.`);
  }
  return value;
}

const globalForMinio = globalThis as unknown as { minioClient?: Client };

function createClient(): Client {
  return new Client({
    endPoint: requireEnv("MINIO_ENDPOINT"),
    port: Number(process.env.MINIO_PORT ?? "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: requireEnv("MINIO_ACCESS_KEY"),
    secretKey: requireEnv("MINIO_SECRET_KEY"),
  });
}

const client = globalForMinio.minioClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForMinio.minioClient = client;
}

/**
 * Bucket exclusivo do Atlas (`eccox-atlas-evidencias`) no MinIO compartilhado
 * da ECCOX — isolado de outros buckets do mesmo servidor (eccox-avatars,
 * eccox-news). Criado sob demanda no primeiro upload, não no boot da app.
 */
export async function ensureBucketExists(): Promise<void> {
  const exists = await client.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await client.makeBucket(BUCKET);
  }
}

export async function uploadFileToMinio(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  await client.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
}

export async function getFileStreamFromMinio(key: string) {
  return client.getObject(BUCKET, key);
}

export async function deleteMinioFile(key: string): Promise<void> {
  await client.removeObject(BUCKET, key);
}
