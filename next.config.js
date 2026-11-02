/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false
let repo = ''
if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  repo = `/${process.env.GITHUB_REPOSITORY.replace(/.*?\//, '')}`
}
const basePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : repo

const nextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

module.exports = nextConfig
