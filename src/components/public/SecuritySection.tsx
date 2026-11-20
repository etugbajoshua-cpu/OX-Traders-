import React from 'react';
import { Shield, KeyRound, Database, FileCheck, Lock, Server, CheckCircle2 } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityFeatures = [
    {
      title: 'Double-Entry Financial Ledger',
      description: 'Every deposit, investment, payout, and balance adjustment is recorded in an immutable transactional accounting ledger preventing race conditions and discrepancies.',
      icon: Database,
      tag: 'ACID Transactions'
    },
    {
      title: 'Institutional Cold Custody',
      description: 'The vast majority of digital assets are segregated into air-gapped, multi-signature hardware security modules (HSMs) protected by quorum authorization.',
      icon: Shield,
      tag: 'Multi-Sig Quorum'
    },
    {
      title: 'Zero-Knowledge KYC Encryption',
      description: 'Government identification and proof of address files are stored with AES-256 encryption with private, non-public access controls strictly restricted to compliance officers.',
      icon: Lock,
      tag: 'AES-256 GCM'
    },
    {
      title: 'Cryptographic Address Verification',
      description: 'Deposit addresses for Bitcoin (native SegWit) and TRON TRC20 are verified through live blockchain indexing nodes and anti-replay cryptographic hash confirmation.',
      icon: KeyRound,
      tag: 'Anti-Replay Nodes'
    },
    {
      title: 'Multi-Factor Session Security',
      description: 'Protect investor accounts with time-based one-time password (TOTP) two-factor authentication, suspicious login detection, and automated session invalidation.',
      icon: FileCheck,
      tag: '2FA Auth'
    },
    {
      title: 'Auditable Administrative Governance',
      description: 'Every administrative interaction, balance adjustment, and compliance status change generates an immutable, non-repudiable audit log record.',
      icon: Server,
      tag: '100% Traceability'
    }
  ];

  return (
    <section id="security" className="py-12 sm:py-20 bg-[#0B0E11] border-b border-[#2B313A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] text-xs font-semibold uppercase tracking-wider mb-3">
            Institutional Defense-in-Depth
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 sm:mb-4">
            Built for Serious Financial Security
          </h2>
          <p className="text-[#848E9C] text-xs sm:text-base leading-relaxed">
            At OX TRADERS, security is engineered directly into our core architecture. We combine cryptographic asset protection with strict financial accounting standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {securityFeatures.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 transition-all group shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-center text-[#F0B90B]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#848E9C] px-2 py-0.5 rounded bg-[#1E2329] font-mono">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#848E9C] leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2B313A] flex items-center gap-1.5 text-[11px] text-[#0ECB81] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active Security Protocol</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
