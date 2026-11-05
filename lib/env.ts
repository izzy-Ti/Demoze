/**
 * Lazy env access: values are read when first used, so `next build`
 * works without secrets and missing values fail loudly at runtime.
 */
function required(name: string): () => string {
  return () => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
    return value;
  };
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  SERVER_SALT: required("SERVER_SALT"),
  ADMIN_PASSWORD: required("ADMIN_PASSWORD"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
  GEMINI_MODEL: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
  SITE_URL: () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
