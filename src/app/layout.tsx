import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AmbientBackdrop } from "@/components/ui/AmbientBackdrop";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CivicResolve | AI-Powered Grievance Management",
  description: "Next-generation civic issue reporting and automated department triage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="alabaster"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('civic-theme');var valid=['alabaster','blueprint','obsidian','pine'];if(t&&valid.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);document.documentElement.dataset.theme=t;}else{document.documentElement.setAttribute('data-theme','alabaster');document.documentElement.dataset.theme='alabaster';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:bg-[var(--accent)] focus:text-[var(--accent-fg)] focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AmbientBackdrop />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
