import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koko Digital Studio | Short-Form Video & Social Growth Agency — Kampala & Nairobi',
  description:
    'East Africa’s premier short-form video production and social media management agency. We craft viral 9:16 reels, TikToks, and value-first creative strategies that scale brands across Uganda and Kenya.',
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
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="tiktok-developers-site-verification" content="Qwi4sImXFyAWZKps9lvCkndUkapawJiD" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600;1,700;1,800;1,900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#151216] font-sans antialiased text-gray-100 selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
