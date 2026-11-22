import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../common/Logo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Menu, X, ArrowRight, ShieldCheck, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Home', route: 'home' },
    { label: 'Plans', route: 'plans' },
    { label: 'Trading', route: 'trading' },
    { label: 'Markets', route: 'markets' },
    { label: 'How It Works', route: 'how-it-works' },
    { label: 'Security', route: 'security' },
    { label: 'FAQ', route: 'faq' }
  ];

  const handleNav = (route: string) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${
        scrolled
          ? 'border-[#2B313A] bg-[#0B0E11]/95 backdrop-blur-lg shadow-lg'
          : 'border-[#2B313A]/70 bg-[#0B0E11]/90 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Crest */}
        <button
          onClick={() => handleNav('home')}
          className="text-left focus:outline-none hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          <Logo variant="default" size="md" />
        </button>

        {/* Single-Line Desktop Navigation with Smooth Gliding Active Indicator */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => handleNav(item.route)}
                className={`relative px-3.5 py-2 rounded-lg text-xs xl:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#F0B90B]'
                    : 'text-[#848E9C] hover:text-white hover:bg-[#181A20]/70'
                }`}
              >
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="oxNavActiveHighlight"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-[#181A20] border border-[#2B313A]"
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="oxNavActiveUnderline"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] rounded-full bg-[#F0B90B] z-10"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {user ? (
            <button
              onClick={() => handleNav('dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider whitespace-nowrap shrink-0 transition-transform duration-150 shadow-md active:scale-95 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-[#0B0E11]" />
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleNav('login')}
                className="px-4 py-2.5 rounded-xl text-white hover:text-[#F0B90B] text-xs font-semibold hover:bg-[#181A20] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => handleNav('register')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider whitespace-nowrap shrink-0 transition-transform duration-150 shadow-md active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Register</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-[#848E9C] hover:text-white hover:bg-[#181A20] transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#181A20] border-b border-[#2B313A] px-4 pt-3 pb-6 space-y-3 ox-page-enter">
          <div className="grid grid-cols-2 gap-2 pt-1 pb-3">
            {navLinks.map((item) => (
              <button
                key={item.route}
                onClick={() => handleNav(item.route)}
                className={`text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors min-h-[44px] flex items-center ${
                  currentRoute === item.route
                    ? 'text-[#F0B90B] bg-[#F0B90B]/10 border border-[#F0B90B]/30'
                    : 'text-[#EAECEF] hover:bg-[#1E2329]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-[#2B313A] flex flex-col gap-2.5">
            {user ? (
              <button
                onClick={() => handleNav('dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#F0B90B] text-[#0B0E11] font-bold text-xs uppercase tracking-wider min-h-[44px]"
              >
                <UserIcon className="w-4 h-4" />
                <span>Go to Investor Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNav('login')}
                  className="w-full py-3.5 rounded-xl text-center text-white bg-[#1E2329] border border-[#2B313A] text-xs font-semibold min-h-[44px]"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleNav('register')}
                  className="w-full py-3.5 rounded-xl text-center bg-[#F0B90B] text-[#0B0E11] font-bold text-xs uppercase tracking-wider min-h-[44px]"
                >
                  Register Now
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
