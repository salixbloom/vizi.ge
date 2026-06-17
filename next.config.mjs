/** @type {import('next').NextConfig} */
const TILE_SERVER_URL = process.env.TILE_SERVER_URL || "http://127.0.0.1:8080";

const nextConfig = {
  // better-sqlite3 and sharp are native modules; keep them external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "sharp"],
  async rewrites() {
    return [
      // Proxy MapLibre tile/style/glyph/sprite requests to the separate light-maps service
      // so the browser only ever talks to one origin.
      // lm-serve serves under /tiles/<set>/<z>/<x>/<y>.<ext> (here the WA land-cover
      // set is /tiles/wa-rasters/<z>/<x>/<y>.webp), so keep the /tiles prefix when
      // forwarding (do NOT strip it).
      {
        source: "/tiles/:path*",
        destination: `${TILE_SERVER_URL}/tiles/:path*`,
      },
    ];
  },
};

export default nextConfig;
