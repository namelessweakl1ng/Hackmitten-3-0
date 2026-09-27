export const backendConfig = {
  port: Number(process.env.BACKEND_PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  storageRoot: process.env.HACKMITTEN_STORAGE_ROOT ?? "/var/lib/hackmitten",
  privateUploadDir: process.env.HM3_PRIVATE_UPLOAD_DIR ?? "/var/lib/hackmitten/private",
  publicUploadDir: process.env.HM3_PUBLIC_UPLOAD_DIR ?? "/var/lib/hackmitten/public",
};

export function requireBackendEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required backend environment variable: ${name}`);
  }
  return value;
}
