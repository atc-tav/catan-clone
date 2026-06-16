/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // The portable core uses NodeNext-style ".js" extensions in its relative
    // imports (so it ports cleanly). Teach webpack to resolve those to the ".ts"
    // sources during the Next build.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
