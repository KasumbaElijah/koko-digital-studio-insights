import React from 'react';
import { Navbar } from '@/components/website/Navbar';
import { HeroSection } from '@/components/website/HeroSection';
import { PortfolioSection } from '@/components/website/PortfolioSection';
import { ServicesSection } from '@/components/website/ServicesSection';
import { MethodologySection } from '@/components/website/MethodologySection';
import { PackagesSection } from '@/components/website/PackagesSection';
import { AboutSection } from '@/components/website/AboutSection';
import { ContactSection } from '@/components/website/ContactSection';
import { SectionDivider } from '@/components/website/SectionDivider';
import { Footer } from '@/components/website/Footer';

export const metadata = {
  title: 'Koko Digital Studio | Short-Form Video & Social Growth Agency — Kampala & Nairobi',
  description:
    'East Africa’s premier short-form video production and social media management agency. We craft viral 9:16 reels, TikToks, and value-first creative strategies that scale brands across Uganda and Kenya.',
  openGraph: {
    title: 'Koko Digital Studio | We Make Brands Impossible to Ignore',
    description:
      'Short-form video production, social media management, brand storytelling, and creator masterclasses in Kampala and Nairobi.',
    url: 'https://kokodigital.studio',
    siteName: 'Koko Digital Studio',
    type: 'website',
  },
};

export default function AgencyHomePage() {
  return (
    <div className="min-h-screen bg-[#151216] text-white selection:bg-red-600 selection:text-white flex flex-col">
      {/* Top Fixed Agency Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section with Interactive 9:16 Video Simulator */}
        <HeroSection />

        <SectionDivider label="Proven Campaigns" />

        {/* 2. Client Portfolio Showcase (Névo, Signature Homes, Meat N Bunz, Safi Bay, Kampala Running Movement) */}
        <PortfolioSection />

        <SectionDivider label="Creative Capabilities" />

        {/* 3. Agency Services & Creative Capabilities */}
        <ServicesSection />

        <SectionDivider label="The Koko Framework" />

        {/* 4. The Koko Engine (4-Step Attention & Conversion Methodology) */}
        <MethodologySection />

        <SectionDivider label="Packages & Pricing" />

        {/* 5. Packages & Pricing Tiers with Add-On Customizer */}
        <PackagesSection />

        <SectionDivider label="The Studio Story" />

        {/* 6. About Koko Digital (Kampala Roots, Nairobi Expansion & Manifesto) */}
        <AboutSection />

        <SectionDivider label="Initiate Project" />

        {/* 7. Interactive Project Brief & Direct WhatsApp Booking */}
        <ContactSection />
      </main>

      {/* Agency Footer */}
      <Footer />
    </div>
  );
}
