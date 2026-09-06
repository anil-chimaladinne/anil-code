/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate socket connections in dev mode
  typescript: {
    // Allows production builds to successfully complete even if there are type warnings
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disables ESLint during production builds
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });
    return config;
  },
};

export default nextConfig;
