/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // The tutorials page reads the static Tutorials and Tips markdown on the server (lib/tutorials/static-articles-server.ts)
  outputFileTracingIncludes: {
    '/tutorials/\\[\\[\\.\\.\\.path\\]\\]': ['./public/tutorial-tips/*.md', './public/tutorial-guides/*.md', './public/tutorial-lua/*.md'],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
}

export default nextConfig
