import type { NextConfig } from "next";

/**
 * NEXT_PUBLIC_BASE_PATH configures this app to serve correctly once it is
 * mounted at https://servora.hemandu.com/provider by an upstream rewrite in
 * servora-web (a separate deployment, not touched by this repo). Left unset,
 * the app serves from "/" — the right default for local development, where
 * this app runs standalone on its own port with no upstream rewrite in front
 * of it.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,
};

export default nextConfig;
