/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === "true" ? "standalone" : undefined,
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
