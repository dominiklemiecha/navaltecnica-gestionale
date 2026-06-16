/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  devIndicators: false,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};
export default nextConfig;
