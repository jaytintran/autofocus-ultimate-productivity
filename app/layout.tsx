import type { Metadata } from "next";
import { Geist_Mono, Rubik } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "@/app/globals.css";
import { SyncInitializer } from "@/components/sync-initializer";

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

const rubik = Rubik({
	subsets: ["latin"],
	variable: "--font-rubik-family",
});

export const metadata: Metadata = {
	title: "Autofocus | Bring Order to Chaos",
	description: "AF4 - One list. One task. Trust the process.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistMono.variable} ${rubik.variable}`}
		>
			<head>
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
			</head>
			<body className="font-sans antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="mossy"
					themes={["light", "dark", "golden-twilight", "mossy-woods"]}
					enableSystem={false}
					disableTransitionOnChange
				>
					<SyncInitializer />
					{children}
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
