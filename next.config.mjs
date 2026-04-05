import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
	dest: "public",
	cacheOnFrontEndNav: true,
	aggressiveFrontEndNavCaching: true,
	reloadOnOnline: true,
	disable: false,
	workboxOptions: {
		disableDevLogs: true,
		runtimeCaching: [
			{
				urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
				handler: "NetworkOnly",
			},
		],
	},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	experimental: {
		workerThreads: false,
		cpus: 1,
	},
};

export default withPWAConfig(nextConfig);
