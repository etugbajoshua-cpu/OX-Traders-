import React from 'react';
import { Logo } from '../common/Logo.tsx';
import { Shield, Lock } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0B0E11] border-t border-[#2B313A] text-[#848E9C] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="default" size="md" />
            <p className="text-[#848E9C] text-xs leading-relaxed max-w-sm">
              OX TRADERS (<span className="text-[#EAECEF] font-mono">oxtraders.online</span>) is a cryptocurrency investment and quantitative trading platform providing institutional liquidity strategies, double-entry financial accounting, and direct on-chain Bitcoin and USDT custody.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181A20] border border-[#2B313A] text-[11px] text-[#0ECB81]">
                <Shield className="w-3.5 h-3.5" />
                <span>Cold Storage Segregation</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181A20] border border-[#2B313A] text-[11px] text-[#F0B90B]">
                <Lock className="w-3.5 h-3.5" />
                <span>Double-Entry Ledger</span>
              </span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => onNavigate('plans')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Investment Plans</button></li>
              <li><button onClick={() => onNavigate('trading')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Trading Terminal</button></li>
              <li><button onClick={() => onNavigate('markets')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Live Markets</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">How It Works</button></li>
              <li><button onClick={() => onNavigate('register')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Open Account</button></li>
            </ul>
          </div>

          {/* Security & Compliance */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Compliance</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => onNavigate('security')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Security Architecture</button></li>
              <li><button onClick={() => onNavigate('faq')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">AML / KYC Policy</button></li>
              <li><button onClick={() => onNavigate('faq')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Deposit Verification</button></li>
              <li><button onClick={() => onNavigate('faq')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Risk Disclosure</button></li>
              <li><button onClick={() => onNavigate('security')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Institutional Custody</button></li>
            </ul>
          </div>

          {/* Support & Account */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Account Access</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => onNavigate('faq')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Investor FAQs</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Platform Guide</button></li>
              <li><button onClick={() => onNavigate('login')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Investor Login</button></li>
              <li><button onClick={() => onNavigate('register')} className="hover:text-[#F0B90B] transition-colors cursor-pointer">Register Account</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-8 border-t border-[#2B313A] space-y-4">
          <div className="p-4 rounded-xl bg-[#181A20] border border-[#2B313A] text-[11px] text-[#848E9C] leading-relaxed">
            <span className="font-bold text-[#EAECEF] block mb-1">REGULATORY NOTICE &amp; RISK WARNING:</span>
            Cryptocurrency investments and algorithmic trading strategies are exposed to market price movements and potential capital risk. Past performance does not guarantee future investment returns. OX TRADERS does not guarantee fixed profits without underlying market risk exposure. Users must ensure that allocating digital assets complies with the relevant laws and regulations in their jurisdiction before depositing funds. Do not deposit funds you cannot afford to lose.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#848E9C] gap-3">
            <div>
              &copy; {new Date().getFullYear()} OX TRADERS (<span className="font-mono text-[#EAECEF]">oxtraders.online</span>). All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Terms of Service</span>
              <span>&bull;</span>
              <span>Privacy Policy</span>
              <span>&bull;</span>
              <span>AML / CTF Standards</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
