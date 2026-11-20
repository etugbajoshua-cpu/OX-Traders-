import React from 'react';
import { Navbar } from '../components/public/Navbar.tsx';
import { Hero } from '../components/public/Hero.tsx';
import { LiveCryptoTicker } from '../components/public/LiveCryptoTicker.tsx';
import { InvestmentPlansSection } from '../components/public/InvestmentPlansSection.tsx';
import { HowItWorksSection } from '../components/public/HowItWorksSection.tsx';
import { TradingPreviewSection } from '../components/public/TradingPreviewSection.tsx';
import { SecuritySection } from '../components/public/SecuritySection.tsx';
import { FAQSection } from '../components/public/FAQSection.tsx';
import { ContactSection } from '../components/public/ContactSection.tsx';
import { Footer } from '../components/public/Footer.tsx';

interface PublicHomePageProps {
  onNavigate: (route: string) => void;
  currentSection?: string;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({ onNavigate, currentSection = 'home' }) => {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col">
      <Navbar onNavigate={onNavigate} currentRoute={currentSection} />
      <main className="flex-1">
        <Hero onNavigate={onNavigate} />
        <LiveCryptoTicker />
        <InvestmentPlansSection onNavigate={onNavigate} />
        <HowItWorksSection onNavigate={onNavigate} />
        <TradingPreviewSection onNavigate={onNavigate} />
        <SecuritySection />
        <FAQSection />
        <ContactSection onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
