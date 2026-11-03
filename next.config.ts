import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/userinterface/home', destination: '/', permanent: false }];
  },
  experimental: {
    // The storefront and admin use separate root layouts, so unmatched URLs need a global 404.
    globalNotFound: true,
  },
};

export default nextConfig;
