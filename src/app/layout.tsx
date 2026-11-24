import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { HeaderNav } from '@/components/common/HeaderNav';

export const metadata: Metadata = {
  title: 'Koko Digital Studio Insights - Social Media Analytics & PDF Reporting',
  description: 'Automated social media analytics and PDF reporting platform for Koko Digital Studio clients',
  other: {
    'tiktok-developers-site-verification': 'Qwi4sImXFyAWZKps9lvCkndUkapawJiD',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="tiktok-developers-site-verification" content="Qwi4sImXFyAWZKps9lvCkndUkapawJiD" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f8f8f6] font-sans antialiased text-gray-900">
        {/* Navigation Header */}
        <header className="no-print bg-black text-white py-4 px-6 shadow-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-white text-black font-black text-xs flex items-center justify-center rounded-lg tracking-tighter group-hover:scale-105 transition-transform">
                KOKO
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight font-heading">
                  Koko Digital Studio Insights
                </h1>
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                  Social Analytics & PDF Reporting Engine
                </p>
              </div>
            </Link>

            {/* Role-Aware Navigation & Team Session Controls */}
            <HeaderNav />
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Navigation Footer */}
        <footer className="no-print border-t border-gray-200 py-6 px-6 text-center text-xs text-gray-500 bg-white">
          <p>© 2026 Koko Digital Studio Insights. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
