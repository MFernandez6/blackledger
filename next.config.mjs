function resolveAuthUrl() {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }
  return "http://localhost:3003";
}

// NextAuth's client bundle calls `new URL(NEXTAUTH_URL)` at import time.
// An empty or protocol-less value throws during `next build` on Vercel
// (including /_not-found). Always leave a valid absolute URL.
process.env.NEXTAUTH_URL = resolveAuthUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
