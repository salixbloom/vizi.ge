/** @type {import('next').NextConfig} */
const TILE_SERVER_URL = process.env.TILE_SERVER_URL || "http://127.0.0.1:8080";

const nextConfig = {
  // better-sqlite3 and sharp are native modules; keep them external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "sharp"],
  async rewrites() {
    return [
      // Proxy MapLibre tile/style/glyph/sprite requests to the separate light-maps service
      // so the browser only ever talks to one origin.
      {
        source: "/tiles/:path*",
        destination: `${TILE_SERVER_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
