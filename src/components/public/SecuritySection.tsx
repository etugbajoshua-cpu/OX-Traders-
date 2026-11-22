import React from 'react';
import { motion } from 'motion/react';
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
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
        >
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F0B90B] mb-2">
            Institutional Defense-in-Depth
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 sm:mb-4">
            Built for Serious Financial Security
          </h2>
          <p className="text-[#848E9C] text-xs sm:text-base leading-relaxed">
            At OX TRADERS, security is engineered directly into our core architecture. We combine cryptographic asset protection with strict financial accounting standards.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {securityFeatures.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: 0.36, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 hover:-translate-y-0.5 transition-[transform,border-color] duration-200 shadow-md flex flex-col justify-between"
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
