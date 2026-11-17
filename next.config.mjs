/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // The tutorials page reads the Tips markdown on the server (lib/tutorials/tips-server.ts)
  outputFileTracingIncludes: {
    '/tutorials/\\[\\[\\.\\.\\.path\\]\\]': ['./public/tutorial-tips/**/*'],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
}

export default nextConfig