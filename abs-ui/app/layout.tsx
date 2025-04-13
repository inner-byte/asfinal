import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import Link from "next/link";
import { NavigationProvider } from "@/contexts/NavigationContext";
import "./globals.css";

// Load Inter as our primary font (specified in project goals)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Load Poppins as secondary font (specified in project goals)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Subtitle Generator",
  description: "Generate accurate subtitles for your videos with AI",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#111827", // Dark gray base color from our design system
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body 
        className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-[var(--background-primary)] text-[var(--foreground-primary)]`}
      >
        <NavigationProvider>
          <div className="min-h-dvh flex flex-col">
            <header className="border-b border-[var(--color-gray-800)] py-4">
              <div className="container-custom">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] flex items-center justify-center text-white font-medium text-sm">
                        ABS
                      </div>
                      <h1 className="font-medium text-lg tracking-tight">
                        AI Subtitle Generator
                      </h1>
                    </Link>
                  </div>
                  <nav>
                    <ul className="flex items-center gap-5">
                      <li>
                        <Link 
                          href="/video-upload" 
                          className="text-sm hover:text-[var(--color-primary-400)] transition-colors"
                        >
                          Upload
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/subtitle-preview" 
                          className="text-sm hover:text-[var(--color-primary-400)] transition-colors"
                        >
                          Preview
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/export" 
                          className="text-sm hover:text-[var(--color-primary-400)] transition-colors"
                        >
                          Export
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/video-upload" 
                          className="button button-gradient animate-gradient bg-gradient-size text-sm"
                        >
                          Get Started
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </header>
            
            <main className="flex-1">
              {children}
            </main>
            
            <footer className="border-t border-[var(--color-gray-800)] py-4">
              <div className="container-custom">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-[var(--foreground-secondary)] text-xs">
                      &copy; {new Date().getFullYear()} AI Subtitle Generator
                    </p>
                  </div>
                  <div className="flex gap-5">
                    <Link href="/" className="text-xs text-[var(--foreground-secondary)] hover:text-[var(--color-primary-400)] transition-colors">Home</Link>
                    <a href="#" className="text-xs text-[var(--foreground-secondary)] hover:text-[var(--color-primary-400)] transition-colors">Terms</a>
                    <a href="#" className="text-xs text-[var(--foreground-secondary)] hover:text-[var(--color-primary-400)] transition-colors">Privacy</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}
