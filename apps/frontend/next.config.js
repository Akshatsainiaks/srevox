/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || "http://srevox-api:4000"}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
