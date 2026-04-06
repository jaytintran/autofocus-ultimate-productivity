// @ts-nocheck

import type { Metadata } from "next";
import {
	Geist_Mono,
	Rubik,
	IBM_Plex_Mono,
	Literata,
	DM_Sans,
	Playfair_Display,
} from "next/font/google";

import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "@/app/globals.css";

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

const rubik = Rubik({
	subsets: ["latin"],
	variable: "--font-rubik-family",
});

const ibmPlexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-ibm-plex-mono",
});

const literata = Literata({
	subsets: ["latin"],
	variable: "--font-literata",
});

const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-dm-sans",
});

const playfairDisplay = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-playfair",
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
			className={`${geistMono.variable} ${rubik.variable} ${ibmPlexMono.variable} ${literata.variable} ${dmSans.variable} ${playfairDisplay.variable}`}
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
					{children}
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
